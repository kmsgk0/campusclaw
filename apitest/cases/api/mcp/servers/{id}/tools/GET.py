def run(c):
    sid = c.ids["server"]
    assert len(c.request("GET", f"/api/mcp/servers/{sid}/tools")[1]["tools"]) == 2
    assert c.request("GET", f"/api/mcp/servers/{sid}/tools", user="teacher_b")[0] == 404
