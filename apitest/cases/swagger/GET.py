def run(c):
    assert "swagger-ui" in c.request("GET", "/swagger", user=None)[1]
