def run(c):
    sid = c.ids["server"]
    for _ in range(2):
        assert c.request("POST", f"/api/mcp/servers/{sid}/connect")[0] == 200
    assert c.scalar("SELECT COUNT(*) FROM mcp_tools WHERE server_id=?", (sid,)) == 2
