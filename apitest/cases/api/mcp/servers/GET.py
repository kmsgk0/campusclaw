def run(c):
    code, d = c.request("GET", "/api/mcp/servers")
    assert code == 200 and "http-test-token" not in str(d)
    assert c.request("GET", "/api/mcp/servers", user="student_a1")[0] == 403
