def run(c):
    code, d = c.request(
        "POST",
        "/api/mcp/servers",
        {"name": "delete-tools", "base_url": c.tool_url, "token": "http-test-token"},
    )
    sid = d["server"]["id"]
    assert c.request("DELETE", f"/api/mcp/servers/{sid}")[0] == 200
    assert c.scalar("SELECT COUNT(*) FROM mcp_servers WHERE id=?", (sid,)) == 0
