def run(c):
    text = "名称：待删除技能\n适用条件：方程\n启用：是\n\n学习提示。"
    code, d = c.request("POST", "/api/skills", {"source_text": text})
    sid = d["skill"]["id"]
    assert c.request("DELETE", f"/api/skills/{sid}")[0] == 200
    assert c.scalar("SELECT COUNT(*) FROM skills WHERE id=?", (sid,)) == 0
