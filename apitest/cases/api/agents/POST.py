def run(c):
    aid = c.agent()
    assert (
        c.scalar("SELECT name FROM tutor_agents WHERE id=?", (aid,)) == "HTTP 验收助手"
    )
    assert (
        c.request("POST", "/api/agents", {"name": "禁止"}, user="student_a1")[0] == 403
    )
    assert (
        c.request("POST", "/api/agents", {"name": "跨班", "material_ids": [2]})[0]
        == 404
    )
