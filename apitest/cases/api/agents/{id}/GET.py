def run(c):
    aid = c.agent()
    assert c.request("GET", f"/api/agents/{aid}")[0] == 200
    assert c.request("GET", f"/api/agents/{aid}", user="teacher_b")[0] == 404
