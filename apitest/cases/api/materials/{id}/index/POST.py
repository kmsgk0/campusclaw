def run(c):
    assert (
        c.request("POST", "/api/materials/1/index", {"strategy": "hierarchy"})[0] == 200
    )
    assert "hierarchy" in c.scalar(
        "SELECT options_json FROM material_indexes WHERE material_id=1"
    )
    assert c.request("POST", "/api/materials/1/index", {}, user="student_a1")[0] == 403
