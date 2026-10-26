def run(c):
    d = c.request("GET", "/api/materials")[1]
    assert d["materials"] and all("B 班" not in m["title"] for m in d["materials"])
