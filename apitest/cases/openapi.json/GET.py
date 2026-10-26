def run(c):
    code, d = c.request("GET", "/openapi.json", user=None)
    assert (
        code == 200 and "/api/agents" in d["paths"] and "/api/mcp/servers" in d["paths"]
    )
    assert d["components"]["securitySchemes"]["bearerAuth"]["scheme"] == "bearer"
