def run(c):
    code, d = c.request(
        "POST",
        "/api/mcp/servers",
        {
            "name": "disconnect-tools",
            "base_url": c.tool_url,
            "token": "http-test-token",
        },
    )
    sid = d["server"]["id"]
    c.request("POST", f"/api/mcp/servers/{sid}/connect")
    assert c.request("POST", f"/api/mcp/servers/{sid}/disconnect")[0] == 200
    assert c.scalar("SELECT COUNT(*) FROM mcp_tools WHERE server_id=?", (sid,)) == 0
