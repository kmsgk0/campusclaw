def run(c):
    sid = c.ids["skill"]
    text = "名称：HTTP技能\n适用条件：方程\n工具：knowledge_search\n启用：否\n\n只给步骤提示。"
    assert c.request("PUT", f"/api/skills/{sid}", {"source_text": text})[0] == 200
    assert c.scalar("SELECT enabled FROM skills WHERE id=?", (sid,)) == 0
