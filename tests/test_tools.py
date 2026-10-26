import importlib.util
import json
import threading
from pathlib import Path
import pytest
from werkzeug.serving import make_server
from test_knowledge import env


@pytest.fixture
def tool_server():
    spec = importlib.util.spec_from_file_location(
        "tool_server", Path(__file__).parents[1] / "mcp-server/server.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    server = make_server(
        "127.0.0.1", 0, module.create_app("test-tool-token"), threaded=True
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}", module
    server.shutdown()
    thread.join()


def test_mcp_discovery_model_loop_disconnect_and_isolation(env, tool_server):
    app, gateway, _, (teacher, student, other) = env
    url, module = tool_server
    mcp = module.create_app("test-tool-token").test_client()
    assert (
        mcp.post(
            "/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
        ).status_code
        == 401
    )
    created = teacher.post(
        "/api/mcp/servers",
        json={"name": "test-tools", "base_url": url, "token": "test-tool-token"},
    )
    assert created.status_code == 201 and "test-tool-token" not in created.text
    sid = created.json["server"]["id"]
    assert student.get("/api/mcp/servers").status_code == 403
    b = app.test_client()
    b.environ_base["HTTP_AUTHORIZATION"] = (
        "Bearer "
        + b.post(
            "/api/login",
            json={"username": "teacher_b", "password": "test-password-1234"},
        ).json["token"]
    )
    assert b.get(f"/api/mcp/servers/{sid}/tools").status_code == 404
    for _ in range(2):
        connected = teacher.post(f"/api/mcp/servers/{sid}/connect")
        assert connected.status_code == 200 and len(connected.json["tools"]) == 2
    source = "名称：工具解题引导\n适用条件：方程\n工具：formula_hint@test-tools\n启用：是\n\n只给下一步提示。"
    skill = teacher.post("/api/skills", json={"source_text": source}).json["skill"][
        "id"
    ]
    aid = teacher.post(
        "/api/agents", json={"name": "工具助手", "skill_ids": [skill]}
    ).json["agent"]["id"]
    cid = student.post("/api/conversations", json={"agent_id": aid}).json[
        "conversation"
    ]["id"]
    requests = []

    def call(purpose, payload):
        requests.append(payload)
        return (
            {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "call1",
                                    "type": "function",
                                    "function": {
                                        "name": "tool_1",
                                        "arguments": '{"query":"方程去括号"}',
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
            if len(requests) == 1
            else {"choices": [{"message": {"role": "assistant", "content": "ready"}}]}
        )

    gateway.call = call
    gateway.stream = lambda messages: iter(["检查系数", "是否乘到每一项。"])
    response = student.post(
        f"/api/conversations/{cid}/messages", json={"question": "方程如何去括号？"}
    )
    text = response.text
    assert text.index("formula_hint@test-tools") < text.index("event: delta")
    assert any(m["role"] == "tool" for m in requests[-1]["messages"])
    calls = teacher.get("/api/mcp/tool-calls").json["calls"]
    assert len(calls) == 1 and calls[0]["status"] == "ok"
    assert b.get("/api/mcp/tool-calls").json["calls"] == []
    assert teacher.post(f"/api/mcp/servers/{sid}/disconnect").status_code == 200
    assert teacher.get(f"/api/mcp/servers/{sid}/tools").json["tools"] == []
    assert (
        teacher.put(f"/api/skills/{skill}", json={"source_text": source}).status_code
        == 400
    )
    text = student.post(
        f"/api/conversations/{cid}/messages", json={"question": "方程继续解释"}
    ).text
    assert "denied" in text and "event: done" in text
    assert teacher.get("/api/mcp/tool-calls").json["calls"][0]["status"] == "denied"


def test_tool_limits_and_partial_stream_are_visible(env, tool_server):
    app, gateway, _, (teacher, student, _) = env
    url, _ = tool_server
    sid = teacher.post(
        "/api/mcp/servers",
        json={"name": "loop", "base_url": url, "token": "test-tool-token"},
    ).json["server"]["id"]
    teacher.post(f"/api/mcp/servers/{sid}/connect")
    source = "名称：循环提示\n适用条件：方程\n工具：formula_hint@loop\n启用：是\n\n提示步骤。"
    skill = teacher.post("/api/skills", json={"source_text": source}).json["skill"][
        "id"
    ]
    aid = teacher.post(
        "/api/agents", json={"name": "循环助手", "skill_ids": [skill]}
    ).json["agent"]["id"]
    cid = student.post("/api/conversations", json={"agent_id": aid}).json[
        "conversation"
    ]["id"]
    app.config["MCP_MAX_ROUNDS"] = 2
    gateway.call = lambda *args: {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call",
                            "type": "function",
                            "function": {
                                "name": "tool_1",
                                "arguments": '{"query":"方程"}',
                            },
                        }
                    ],
                }
            }
        ]
    }
    from backend.knowledge import ServiceError

    def stream(messages):
        yield "检查左右两边。"
        raise ServiceError("连接中断")

    gateway.stream = stream
    response = student.post(
        f"/api/conversations/{cid}/messages", json={"question": "方程怎么检查？"}
    ).text
    assert "event: error" in response and "event: done" not in response
    assert len(teacher.get("/api/mcp/tool-calls").json["calls"]) == 2
    assert (
        student.get(f"/api/conversations/{cid}").json["messages"][-1]["status"]
        == "interrupted"
    )
