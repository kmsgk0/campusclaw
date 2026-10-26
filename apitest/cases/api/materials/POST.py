def run(c):
    raw = b'--BOUNDARY\r\nContent-Disposition: form-data; name="file"; filename="sample.md"\r\nContent-Type: text/plain\r\n\r\n# Sample\ncontent\r\n--BOUNDARY--\r\n'
    code, d = c.request(
        "POST",
        "/api/materials",
        raw=raw,
        content_type="multipart/form-data; boundary=BOUNDARY",
    )
    assert code == 201
    mid = d["material_id"]
    assert (
        c.scalar("SELECT body_text FROM knowledge_entries WHERE material_id=?", (mid,))
        == "# Sample\ncontent"
    )
    assert (
        c.request(
            "POST",
            "/api/materials",
            user="student_a1",
            raw=raw,
            content_type="multipart/form-data; boundary=BOUNDARY",
        )[0]
        == 403
    )
