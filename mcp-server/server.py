import os
import secrets
from flask import Flask, request, jsonify
from jsonschema import Draft202012Validator, ValidationError

TOOLS = [
    {
        "name": "formula_hint",
        "description": "根据数学问题提供公式选择或下一步检查提示，不计算最终答案。适合方程、面积和行程问题。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1, "maxLength": 500}
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "unit_convert",
        "description": "给出长度、质量或时间单位之间的换算关系和方法，不代算学生题目的最终数值。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "from_unit": {"type": "string"},
                "to_unit": {"type": "string"},
            },
            "required": ["from_unit", "to_unit"],
            "additionalProperties": False,
        },
    },
]
UNITS = {
    "米": ("length", 1),
    "厘米": ("length", 0.01),
    "毫米": ("length", 0.001),
    "千米": ("length", 1000),
    "m": ("length", 1),
    "cm": ("length", 0.01),
    "mm": ("length", 0.001),
    "km": ("length", 1000),
    "千克": ("mass", 1),
    "克": ("mass", 0.001),
    "kg": ("mass", 1),
    "g": ("mass", 0.001),
    "小时": ("time", 3600),
    "分钟": ("time", 60),
    "秒": ("time", 1),
}


def create_app(token=None):
    app = Flask(__name__)
    token = token or os.getenv("MCP_AUTH_TOKEN")
    if not token:
        raise RuntimeError("MCP_AUTH_TOKEN is required")

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.post("/mcp")
    def mcp():
        supplied = request.headers.get("Authorization", "")
        if not secrets.compare_digest(supplied, "Bearer " + token):
            return jsonify(error="需要有效的 Bearer 令牌"), 401
        data = request.get_json(silent=True)
        rid = data.get("id") if isinstance(data, dict) else None

        def fail(code, message):
            return jsonify(
                jsonrpc="2.0", id=rid, error={"code": code, "message": message}
            )

        if (
            not isinstance(data, dict)
            or data.get("jsonrpc") != "2.0"
            or not isinstance(data.get("method"), str)
        ):
            return fail(-32600, "无效的 JSON-RPC 请求")
        method = data["method"]
        params = data.get("params", {})
        if method == "notifications/initialized":
            return "", 202
        if method == "initialize":
            result = {
                "protocolVersion": "2025-03-26",
                "serverInfo": {"name": "campus-tools", "version": "1.0"},
                "capabilities": {"tools": {}},
            }
        elif method == "tools/list":
            result = {"tools": TOOLS}
        elif method == "tools/call":
            if not isinstance(params, dict):
                return fail(-32602, "参数须为对象")
            tool = next((t for t in TOOLS if t["name"] == params.get("name")), None)
            if tool is None:
                return fail(-32602, "工具不存在")
            args = params.get("arguments", {})
            try:
                Draft202012Validator(tool["inputSchema"]).validate(args)
            except ValidationError:
                return fail(-32602, "工具参数不符合输入结构")
            error = False
            if tool["name"] == "formula_hint":
                q = args["query"]
                text = "先列出已知条件和未知量，再检查所用公式是否满足题目的条件。"
                if "括号" in q or "方程" in q:
                    text = "去括号时，括号前的系数必须乘到括号内每一项；移项时检查符号，两边保持相等。"
                elif "面积" in q:
                    text = "先确认图形：长方形用长乘宽，三角形用底乘高再除以二。代入前统一长度单位。"
                elif "行程" in q:
                    text = "路程等于速度乘时间，先统一速度与时间的单位，再检查题目要求哪个未知量。"
            else:
                a, b = UNITS.get(args["from_unit"]), UNITS.get(args["to_unit"])
                if not a or not b or a[0] != b[0]:
                    text = "这两个单位不在同一支持的量纲内。"
                    error = True
                else:
                    text = f"从{args['from_unit']}换成{args['to_unit']}，将原数值乘以 {a[1] / b[1]:g}。请自行代入题目给出的数量，并保留正确单位。"
            result = {"content": [{"type": "text", "text": text}], "isError": error}
        else:
            return fail(-32601, "方法不存在")
        return jsonify(jsonrpc="2.0", id=rid, result=result)

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8090)
