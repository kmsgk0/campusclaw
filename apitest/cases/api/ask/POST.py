def run(c):
    code, d = c.request("POST", "/api/ask", {"question": "明天天气怎么样？"})
    assert code == 200 and d["citations"] == []
