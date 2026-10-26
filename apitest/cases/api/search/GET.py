def run(c):
    code, d = c.request("GET", "/api/search?q=A&mode=keyword")
    assert code == 200 and d["total"] >= 1
    assert (
        c.request("GET", "/api/search?q=A&mode=keyword", user="student_b1")[1]["hits"]
        == []
    )
    assert c.request("GET", "/api/search?q=&mode=keyword")[0] == 400
