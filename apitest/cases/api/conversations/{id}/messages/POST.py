def run(c):
    code, d = c.request(
        "POST",
        "/api/mcp/servers",
        {"name": "flow-tools", "base_url": c.tool_url, "token": "http-test-token"},
    )
    sid = d["server"]["id"]
    assert c.request("POST", f"/api/mcp/servers/{sid}/connect")[0] == 200
    source = "名称：接口引导\n适用条件：方程\n工具：formula_hint@flow-tools\n启用：是\n\n提示下一步。"
    code, d = c.request("POST", "/api/skills", {"source_text": source})
    skill = d["skill"]["id"]
    aid = c.agent()
    c.request(
        "PUT", f"/api/agents/{aid}", {"name": "HTTP 验收助手", "skill_ids": [skill]}
    )
    cid = c.conversation()
    code, text = c.request(
        "POST",
        f"/api/conversations/{cid}/messages",
        {"question": "方程如何去括号？"},
        user="student_a1",
    )
    assert code == 200 and text.count("event: delta") == 2 and "event: done" in text
    assert text.index("formula_hint@flow-tools") < text.index("event: delta")
    assert (
        c.scalar(
            "SELECT COUNT(*) FROM messages WHERE conversation_id=? AND role='assistant'",
            (cid,),
        )
        >= 1
    )
    assert (
        c.scalar(
            "SELECT COUNT(*) FROM tool_calls WHERE conversation_id=? AND status='ok'",
            (cid,),
        )
        == 1
    )
