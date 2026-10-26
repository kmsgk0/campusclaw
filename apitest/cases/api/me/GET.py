def run(c):
    assert c.request("GET", "/api/me")[1]["user"]["role"] == "teacher"
    assert c.request("GET", "/api/me", user=None)[0] == 401
