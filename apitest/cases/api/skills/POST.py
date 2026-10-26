def run(c):
    text = "名称：HTTP技能\n适用条件：方程\n工具：knowledge_search\n启用：是\n\n只给步骤提示。"
    code, d = c.request("POST", "/api/skills", {"source_text": text})
    assert code == 201
    sid = d["skill"]["id"]
    c.ids["skill"] = sid
    assert c.scalar("SELECT source_text FROM skills WHERE id=?", (sid,)) == text
    assert c.request("POST", "/api/skills", {"source_text": "无效"})[0] == 400
