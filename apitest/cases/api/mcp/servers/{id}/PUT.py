def run(c):
    code, d = c.request(
        "POST",
        "/api/mcp/servers",
        {"name": "edit-tools", "base_url": c.tool_url, "token": "http-test-token"},
    )
    sid = d["server"]["id"]
    assert (
        c.request(
            "PUT",
            f"/api/mcp/servers/{sid}",
            {"name": "edited-tools", "base_url": c.tool_url, "token": ""},
        )[0]
        == 200
    )
    assert c.scalar("SELECT name FROM mcp_servers WHERE id=?", (sid,)) == "edited-tools"
