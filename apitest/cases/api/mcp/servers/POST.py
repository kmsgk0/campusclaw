def run(c):
    code, d = c.request(
        "POST",
        "/api/mcp/servers",
        {"name": "http-tools", "base_url": c.tool_url, "token": "http-test-token"},
    )
    assert code == 201 and "http-test-token" not in str(d)
    c.ids["server"] = d["server"]["id"]
    assert (
        c.scalar("SELECT token FROM mcp_servers WHERE id=?", (c.ids["server"],))
        == "http-test-token"
    )
