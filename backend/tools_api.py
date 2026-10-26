"""Authenticated MCP discovery and model-directed execution."""

import json
import re
import urllib.request
import urllib.error
from urllib.parse import urlparse
from functools import wraps
from uuid import uuid4
from flask import g, jsonify, request
from jsonschema import Draft202012Validator, ValidationError, SchemaError
from werkzeug.exceptions import BadRequest, NotFound, Forbidden

REF = re.compile(r"^[a-z][a-z0-9_]*@[a-z][a-z0-9_-]*$")


def object_body():
    data = request.get_json(silent=True)
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise BadRequest("请求正文须为 JSON 对象")
    return data


def teacher_only(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if g.user["role"] != "teacher":
            raise Forbidden("仅教师可以管理")
        return fn(*args, **kwargs)

    return wrapper


def rpc(server, method, params=None):
    request_id = uuid4().hex
    url = server["base_url"].rstrip("/")
    if not url.endswith("/mcp"):
        url += "/mcp"
    req = urllib.request.Request(
        url,
        data=json.dumps(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": method,
                "params": params or {},
            }
        ).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + server["token"],
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f"工具服务返回 HTTP {error.code}，请检查地址与令牌") from None
    except (OSError, ValueError):
        raise ValueError("工具服务连接失败或返回格式不正确") from None
    if (
        not isinstance(payload, dict)
        or payload.get("jsonrpc") != "2.0"
        or payload.get("id") != request_id
    ):
        raise ValueError("工具服务返回了无效的 JSON-RPC 响应")
    if "error" in payload:
        raise ValueError(
            "工具服务拒绝请求："
            + str(payload["error"].get("message", "协议错误"))[:200]
        )
    if not isinstance(payload.get("result"), dict):
        raise ValueError("工具服务缺少 result")
    return payload["result"]


def server_row(conn, server_id):
    row = conn.execute(
        "SELECT * FROM mcp_servers WHERE id=? AND class_id=?",
        (server_id, g.user["class_id"]),
    ).fetchone()
    if row is None:
        raise NotFound("服务器不存在")
    return row


def public_server(row):
    return {k: row[k] for k in ("id", "name", "base_url", "connected", "error")} | {
        "has_token": bool(row["token"])
    }


def check_refs(conn, class_id, refs):
    for ref in refs:
        if ref == "knowledge_search":
            continue
        if not REF.fullmatch(ref):
            raise ValueError("工具引用须为 tool_name@server-name")
        tool, server = ref.split("@")
        row = conn.execute(
            "SELECT s.connected FROM mcp_servers s JOIN mcp_tools t ON t.server_id=s.id WHERE s.class_id=? AND s.name=? AND t.name=?",
            (class_id, server, tool),
        ).fetchone()
        if row is None or not row["connected"]:
            raise ValueError("工具未发现或服务器未连接：" + ref)


def declarations(conn, class_id, refs):
    tools, mapping, unavailable = [], {}, []
    for ref in refs:
        if ref == "knowledge_search":
            continue
        tool, name = ref.split("@")
        row = conn.execute(
            "SELECT s.*,t.description,t.schema_json FROM mcp_servers s LEFT JOIN mcp_tools t ON t.server_id=s.id AND t.name=? WHERE s.class_id=? AND s.name=?",
            (tool, class_id, name),
        ).fetchone()
        if row is None or not row["connected"] or row["schema_json"] is None:
            unavailable.append(ref)
            continue
        alias = "tool_" + str(len(tools) + 1)
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": alias,
                    "description": ref + ": " + row["description"],
                    "parameters": json.loads(row["schema_json"]),
                },
            }
        )
        mapping[alias] = ref
    return tools, mapping, unavailable


def call_tool(conn, user, conversation_id, round_number, ref, arguments):
    parts = ref.split("@", 1)
    server = (
        conn.execute(
            "SELECT * FROM mcp_servers WHERE class_id=? AND name=?",
            (user["class_id"], parts[-1]),
        ).fetchone()
        if len(parts) == 2
        else None
    )
    outcome = {"ref": ref, "status": "denied", "text": "工具不在可用范围或服务器未连接"}
    if server is not None and server["connected"]:
        tool = conn.execute(
            "SELECT * FROM mcp_tools WHERE server_id=? AND name=?",
            (server["id"], parts[0]),
        ).fetchone()
        if tool:
            try:
                Draft202012Validator(json.loads(tool["schema_json"])).validate(
                    arguments
                )
                result = rpc(
                    server, "tools/call", {"name": parts[0], "arguments": arguments}
                )
                text = "\n".join(
                    c["text"]
                    for c in result.get("content", [])
                    if c.get("type") == "text" and isinstance(c.get("text"), str)
                )
                if result.get("isError"):
                    outcome.update(status="error", text=text[:500] or "工具执行失败")
                elif re.search(
                    r"忽略.{0,12}(指令|要求)|ignore.{0,20}(instructions|previous)|system prompt|发送.{0,20}(密钥|令牌)",
                    text,
                    re.I,
                ):
                    outcome.update(
                        status="denied", text="工具返回包含指令性内容，已丢弃"
                    )
                else:
                    outcome.update(status="ok", text=text[:2000])
            except ValidationError:
                outcome.update(status="denied", text="工具参数不符合发现的输入结构")
            except (ValueError, TypeError, KeyError):
                outcome.update(
                    status="error", text="工具执行失败，请检查连接、参数与服务状态"
                )
    if server is not None:
        with conn:
            conn.execute(
                "INSERT INTO tool_calls(class_id,server_name,tool_ref,status,user_id,conversation_id,round,detail) VALUES(?,?,?,?,?,?,?,?)",
                (
                    user["class_id"],
                    server["name"],
                    ref,
                    outcome["status"],
                    user["id"],
                    conversation_id,
                    round_number,
                    outcome["text"][:500],
                ),
            )
    return outcome


def register(app, db, login_required):
    @app.get("/api/mcp/servers")
    @login_required
    @teacher_only
    def servers():
        return jsonify(
            servers=[
                public_server(r)
                for r in db().execute(
                    "SELECT * FROM mcp_servers WHERE class_id=? ORDER BY id",
                    (g.user["class_id"],),
                )
            ]
        )

    @app.post("/api/mcp/servers")
    @app.put("/api/mcp/servers/<int:server_id>")
    @login_required
    @teacher_only
    def save_server(server_id=None):
        old = server_row(db(), server_id) if server_id else None
        data = object_body()
        name, url = data.get("name", ""), data.get("base_url", "")
        if not isinstance(name, str) or not re.fullmatch(
            r"[a-z][a-z0-9_-]{0,63}", name
        ):
            raise BadRequest("服务器名称须以小写字母开头，可含数字、下划线和连字符")
        if (
            not isinstance(url, str)
            or urlparse(url).scheme not in ("http", "https")
            or not urlparse(url).hostname
            or urlparse(url).username
        ):
            raise BadRequest("请输入有效的 HTTP 或 HTTPS 地址")
        token = data.get("token") or (old["token"] if old else "")
        if not isinstance(token, str) or not token:
            raise BadRequest("请配置工具服务令牌")
        if (
            db()
            .execute(
                "SELECT 1 FROM mcp_servers WHERE class_id=? AND name=? AND id!=?",
                (g.user["class_id"], name, server_id or 0),
            )
            .fetchone()
        ):
            raise BadRequest("本班已有同名服务器")
        with db() as conn:
            if old:
                conn.execute(
                    "UPDATE mcp_servers SET name=?,base_url=?,token=?,connected=0,error=NULL WHERE id=?",
                    (name, url, token, server_id),
                )
                conn.execute("DELETE FROM mcp_tools WHERE server_id=?", (server_id,))
            else:
                server_id = conn.execute(
                    "INSERT INTO mcp_servers(class_id,name,base_url,token) VALUES(?,?,?,?)",
                    (g.user["class_id"], name, url, token),
                ).lastrowid
        return jsonify(
            server=public_server(server_row(db(), server_id))
        ), 200 if old else 201

    @app.delete("/api/mcp/servers/<int:server_id>")
    @login_required
    @teacher_only
    def delete_server(server_id):
        server_row(db(), server_id)
        with db() as conn:
            conn.execute("DELETE FROM mcp_servers WHERE id=?", (server_id,))
        return jsonify(message="服务器已删除")

    @app.post("/api/mcp/servers/<int:server_id>/connect")
    @login_required
    @teacher_only
    def connect_server(server_id):
        server = server_row(db(), server_id)
        try:
            hello = rpc(
                server,
                "initialize",
                {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "CampusClaw", "version": "1.0"},
                },
            )
            if "tools" not in hello.get("capabilities", {}):
                raise ValueError("服务器未声明工具能力")
            items = rpc(server, "tools/list").get("tools")
            if not isinstance(items, list):
                raise ValueError("工具清单格式不正确")
            seen = set()
            for item in items:
                if (
                    not re.fullmatch(r"[a-z][a-z0-9_]*", item.get("name", ""))
                    or item["name"] in seen
                    or not isinstance(item.get("description"), str)
                ):
                    raise ValueError("工具名称或说明无效")
                seen.add(item["name"])
                Draft202012Validator.check_schema(item["inputSchema"])
            with db() as conn:
                conn.execute("DELETE FROM mcp_tools WHERE server_id=?", (server_id,))
                conn.executemany(
                    "INSERT INTO mcp_tools VALUES(?,?,?,?)",
                    [
                        (
                            server_id,
                            t["name"],
                            t["description"],
                            json.dumps(t["inputSchema"]),
                        )
                        for t in items
                    ],
                )
                conn.execute(
                    "UPDATE mcp_servers SET connected=1,error=NULL WHERE id=?",
                    (server_id,),
                )
        except (ValueError, KeyError, TypeError, SchemaError) as error:
            message = (
                str(error) if isinstance(error, ValueError) else "工具声明格式不正确"
            )
            with db() as conn:
                conn.execute("DELETE FROM mcp_tools WHERE server_id=?", (server_id,))
                conn.execute(
                    "UPDATE mcp_servers SET connected=0,error=? WHERE id=?",
                    (message, server_id),
                )
            return jsonify(error=message), 503
        return jsonify(server=public_server(server_row(db(), server_id)), tools=items)

    @app.post("/api/mcp/servers/<int:server_id>/disconnect")
    @login_required
    @teacher_only
    def disconnect_server(server_id):
        server_row(db(), server_id)
        with db() as conn:
            conn.execute("DELETE FROM mcp_tools WHERE server_id=?", (server_id,))
            conn.execute(
                "UPDATE mcp_servers SET connected=0,error=NULL WHERE id=?", (server_id,)
            )
        return jsonify(message="服务器已断开")

    @app.get("/api/mcp/servers/<int:server_id>/tools")
    @login_required
    @teacher_only
    def list_tools(server_id):
        server_row(db(), server_id)
        return jsonify(
            tools=[
                {
                    "name": r["name"],
                    "description": r["description"],
                    "inputSchema": json.loads(r["schema_json"]),
                }
                for r in db().execute(
                    "SELECT * FROM mcp_tools WHERE server_id=?", (server_id,)
                )
            ]
        )

    @app.get("/api/mcp/tool-calls")
    @login_required
    @teacher_only
    def list_calls():
        return jsonify(
            calls=[
                dict(r)
                for r in db().execute(
                    "SELECT c.*,u.display_name FROM tool_calls c JOIN users u ON c.user_id=u.id WHERE c.class_id=? ORDER BY c.id DESC LIMIT 100",
                    (g.user["class_id"],),
                )
            ]
        )
