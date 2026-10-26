"""OpenAPI generated from registered route annotations and Flask's URL map."""

import re
from flask import jsonify

STRING = {"type": "string"}
INTEGER = {"type": "integer"}
IDS = {"type": "array", "items": INTEGER}
AGENT = {
    "name": STRING,
    "prompt": STRING,
    "enabled": {"type": "boolean"},
    "skill_ids": IDS,
    "material_ids": IDS,
}
CHUNKS = {
    "strategy": {"type": "string", "enum": ["auto", "custom", "hierarchy"]},
    "max_chars": {"type": "integer", "minimum": 100, "maximum": 2000},
    "overlap": {"type": "integer", "minimum": 0, "maximum": 50},
    "separator": {"type": "string", "enum": ["paragraph", "line", "sentence"]},
    "remove_links": {"type": "boolean"},
    "collapse_whitespace": {"type": "boolean"},
}
# Operation annotations live alongside the endpoint names; paths come from the router.
OPERATIONS = {
    "health": ("存活检查", None, "status"),
    "login": (
        "账号密码登录",
        {"username": STRING, "password": STRING},
        "token,user,expires_in",
    ),
    "me": ("当前身份", None, "user"),
    "logout": ("退出并撤销令牌", None, "message"),
    "materials": ("本班材料列表", None, "materials"),
    "detail": ("材料原文", None, "material,rendered_html"),
    "download": ("下载原文件", None, None),
    "upload": ("教师上传并建立索引", CHUNKS, "material_id,index_status,index_error"),
    "search": ("本班关键词、向量与混合检索", None, "hits,total,page,has_more,mode"),
    "ask": ("有依据的单次问答", {"question": STRING}, "answer,citations"),
    "reindex": ("按策略重建材料索引", CHUNKS, "index_status,index_error"),
    "material_chunks": ("查看切片和原文位置", None, "chunks,index_status,options"),
    "list_agents": ("本班智能体", None, "agents"),
    "get_agent": ("智能体配置", None, "agent"),
    "save_agent": ("教师保存智能体和绑定", AGENT, "agent"),
    "list_skills": ("本班技能", None, "skills"),
    "save_skill": ("教师保存技能文件", {"source_text": STRING}, "skill"),
    "delete_skill": ("删除本班技能", None, "message"),
    "conversations": ("我的会话", None, "conversations"),
    "create_conversation": (
        "选择智能体并新建会话",
        {"agent_id": INTEGER},
        "conversation",
    ),
    "get_conversation": ("会话与消息", None, "conversation,messages"),
    "send_message": (
        "提问并接收 SSE 回答",
        {"question": {"type": "string", "minLength": 2, "maxLength": 500}},
        None,
    ),
    "servers": ("教师查看本班工具服务", None, "servers"),
    "save_server": (
        "教师登记或修改工具服务",
        {
            "name": STRING,
            "base_url": STRING,
            "token": {"type": "string", "writeOnly": True},
        },
        "server",
    ),
    "delete_server": ("删除工具服务", None, "message"),
    "connect_server": ("握手并发现工具", None, "server,tools"),
    "disconnect_server": ("断开并清空发现列表", None, "message"),
    "list_tools": ("工具说明与输入结构", None, "tools"),
    "list_calls": ("最近 100 条本班工具调用", None, "calls"),
}


def register(app):
    for endpoint, annotation in OPERATIONS.items():
        if endpoint in app.view_functions:
            app.view_functions[endpoint].openapi = annotation

    @app.get("/openapi.json")
    def openapi():
        paths = {}
        for rule in app.url_map.iter_rules():
            annotation = getattr(app.view_functions[rule.endpoint], "openapi", None)
            if not annotation:
                continue
            summary, body, response_fields = annotation
            path = re.sub(r"<(?:int:)?(\w+)>", r"{\1}", rule.rule)
            parameters = [
                {"name": key, "in": "path", "required": True, "schema": INTEGER}
                for key in rule.arguments
            ]
            if rule.endpoint == "search":
                parameters += [
                    {"name": "q", "in": "query", "required": True, "schema": STRING},
                    {
                        "name": "mode",
                        "in": "query",
                        "schema": {
                            "type": "string",
                            "enum": ["keyword", "vector", "hybrid"],
                        },
                    },
                    {"name": "page", "in": "query", "schema": INTEGER},
                ]
            if rule.endpoint == "materials":
                parameters += [{"name": "q", "in": "query", "schema": STRING}]
            for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
                response = {"description": "成功"}
                if response_fields:
                    response["content"] = {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    field: {} for field in response_fields.split(",")
                                },
                            }
                        }
                    }
                if rule.endpoint == "download":
                    response["content"] = {
                        "application/octet-stream": {
                            "schema": {"type": "string", "format": "binary"}
                        }
                    }
                if rule.endpoint == "send_message":
                    response["content"] = {
                        "text/event-stream": {
                            "schema": {"type": "string"},
                            "example": 'event: meta\ndata: {"citations":[]}\n\nevent: delta\ndata: {"text":"回答片段"}\n\nevent: done\ndata: {"message_id":1}\n\n',
                        }
                    }
                op = {
                    "summary": summary,
                    "operationId": rule.endpoint + "_" + method + "_" + str(len(paths)),
                    "parameters": parameters,
                    "responses": {
                        str(code): response
                        for code in (
                            [201]
                            if method == "POST"
                            and rule.endpoint
                            in (
                                "upload",
                                "create_conversation",
                                "save_agent",
                                "save_skill",
                                "save_server",
                            )
                            else [200]
                        )
                    },
                }
                for code, desc in [
                    (400, "输入无效"),
                    (401, "未登录或凭据失效"),
                    (403, "角色不允许"),
                    (404, "对象不存在或不属于当前范围"),
                    (503, "依赖服务不可用"),
                ]:
                    op["responses"][str(code)] = {
                        "description": desc,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"error": STRING},
                                }
                            }
                        },
                    }
                op["security"] = (
                    [] if rule.endpoint in ("health", "login") else [{"bearerAuth": []}]
                )
                if body is not None:
                    mime = (
                        "multipart/form-data"
                        if rule.endpoint == "upload"
                        else "application/json"
                    )
                    props = dict(body)
                    if rule.endpoint == "upload":
                        props["file"] = {"type": "string", "format": "binary"}
                    op["requestBody"] = {
                        "required": True,
                        "content": {
                            mime: {"schema": {"type": "object", "properties": props}}
                        },
                    }
                paths.setdefault(path, {})[method.lower()] = op
        return jsonify(
            openapi="3.0.3",
            info={"title": "CampusClaw API", "version": "1.0"},
            components={
                "securitySchemes": {
                    "bearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT",
                    }
                }
            },
            paths=paths,
        )

    @app.get("/swagger")
    @app.get("/swagger/")
    def swagger():
        return """<!doctype html><html lang="zh"><meta charset="utf-8"><title>CampusClaw API</title><link rel="stylesheet" href="/static/dist/swagger/swagger-ui.css"><div id="swagger-ui"></div><script src="/static/dist/swagger/swagger-ui-bundle.js"></script><script src="/static/dist/swagger/init.js"></script></html>"""
