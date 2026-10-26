import json
import pytest
from test_knowledge import env

SKILL = "名称：数学专项解题引导\n适用条件：方程,去括号\n资料：数学\n工具：knowledge_search\n启用：是\n\n只提示下一步，不给最终答案。"


def test_agents_skills_conversations_and_scope(env):
    app, gateway, vectors, (teacher, student, other) = env
    skill = teacher.post("/api/skills", json={"source_text": SKILL})
    assert skill.status_code == 201
    sid = skill.json["skill"]["id"]
    agent = teacher.post(
        "/api/agents",
        json={
            "name": "测试数学助手",
            "prompt": "耐心解释",
            "enabled": True,
            "skill_ids": [sid],
            "material_ids": [],
        },
    )
    assert agent.status_code == 201
    aid = agent.json["agent"]["id"]
    assert student.post("/api/agents", json={"name": "x"}).status_code == 403
    assert other.get(f"/api/agents/{aid}").status_code == 404
    conv = student.post("/api/conversations", json={"agent_id": aid})
    assert conv.status_code == 201
    cid = conv.json["conversation"]["id"]
    assert teacher.get(f"/api/conversations/{cid}").status_code == 404
    assert other.get(f"/api/conversations/{cid}").status_code == 404
    gateway.stream = lambda messages: iter(["先检查", "括号前的系数。"])
    response = student.post(
        f"/api/conversations/{cid}/messages",
        json={"question": "方程怎么去括号？", "agent_id": 999},
    )
    assert response.status_code == 200
    data = response.data.decode()
    assert (
        "event: meta" in data
        and data.count("event: delta") >= 2
        and "event: done" in data
    )
    saved = student.get(f"/api/conversations/{cid}").json
    assert saved["messages"][-1]["content"] == "先检查括号前的系数。"
    assert saved["messages"][-1]["skill_name"] == "数学专项解题引导"
    assert saved["messages"][-1]["citations"] == []
    teacher.put(
        f"/api/agents/{aid}",
        json={
            "name": "测试数学助手",
            "prompt": "",
            "enabled": False,
            "skill_ids": [],
            "material_ids": [],
        },
    )
    assert student.post("/api/conversations", json={"agent_id": aid}).status_code in (
        400,
        404,
    )
    assert (
        student.post(
            f"/api/conversations/{cid}/messages", json={"question": "继续解释"}
        ).status_code
        == 200
    )
    assert (
        student.get(f"/api/conversations/{cid}").json["messages"][-1]["skill_name"]
        is None
    )


def test_skill_file_validation_and_agent_bindings(env):
    _, _, _, (teacher, student, other) = env
    assert student.post("/api/skills", json={"source_text": SKILL}).status_code == 403
    for text in [
        SKILL.replace("启用：是\n", ""),
        SKILL.replace("knowledge_search", "unknown"),
        SKILL.replace("\n\n", "\n名称：重复\n\n"),
    ]:
        assert (
            teacher.post("/api/skills", json={"source_text": text}).status_code == 400
        )
    assert (
        teacher.post(
            "/api/agents", json={"name": "越界", "material_ids": [2]}
        ).status_code
        == 404
    )


def test_chunk_strategies_preserve_source_ranges():
    from backend.chunking import split_text

    text = "# 数学\n" + "方程的两边同时加一。" * 30 + "\n## 语文\n古诗默写。"
    parts = split_text(text, {"strategy": "hierarchy"})
    assert len(parts) >= 2 and "## 语文" in parts[-1]["text"]
    assert all(
        text[p["start_offset"] : p["end_offset"]] == p["source_text"] for p in parts
    )
    parts = split_text(
        "开头 https://example.com 结尾\n\n下一段。",
        {
            "strategy": "custom",
            "max_chars": 100,
            "overlap": 0,
            "remove_links": True,
            "collapse_whitespace": True,
        },
    )
    assert "https://" not in parts[0]["text"] and "https://" in parts[0]["source_text"]
    with pytest.raises(ValueError):
        split_text(text, {"strategy": "custom", "max_chars": 2})


def test_bound_materials_and_context_window(env):
    app, gateway, _, (teacher, student, _) = env
    import io

    body = "数学资料：方程两边加同一个数，等式仍成立。"
    mid = teacher.post(
        "/api/materials",
        data={
            "file": (io.BytesIO(body.encode()), "数学.md"),
            "strategy": "custom",
            "max_chars": "100",
            "overlap": "0",
        },
    ).json["material_id"]
    before = teacher.get(f"/api/materials/{mid}/chunks").json
    import sqlite3

    with sqlite3.connect(app.config["DATA_DIR"] / "campusclaw.sqlite3") as conn:
        conn.row_factory = sqlite3.Row
        app.extensions["knowledge"].index_material(conn, mid)
    assert teacher.get(f"/api/materials/{mid}/chunks").json == before
    aid = teacher.post(
        "/api/agents", json={"name": "上下文助手", "material_ids": [mid]}
    ).json["agent"]["id"]
    cid = student.post("/api/conversations", json={"agent_id": aid}).json[
        "conversation"
    ]["id"]
    seen = []

    def stream(messages):
        seen.append(messages)
        yield "两边同时加同一个数[1]。"

    gateway.stream = stream
    for i in range(4):
        response = student.post(
            f"/api/conversations/{cid}/messages", json={"question": f"方程问题第{i}轮"}
        )
        assert "event: done" in response.text
    assert len(seen[-1]) == 7
    assert "第0轮" not in str(seen[-1])
    saved = student.get(f"/api/conversations/{cid}").json
    assert {h["material_id"] for h in saved["messages"][-1]["citations"]} == {mid}
    assert len(saved["messages"]) == 8
    assert teacher.post("/api/agents", json=["bad"]).status_code == 400
