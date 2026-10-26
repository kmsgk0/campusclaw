def run(c):
    assert c.request("GET", "/api/mcp/tool-calls")[0] == 200
    assert c.request("GET", "/api/mcp/tool-calls", user="student_a1")[0] == 403
