"""Chunk processed text while retaining original source coordinates."""

import re
from collections.abc import Mapping


def options(value=None):
    value = value or {}
    if not isinstance(value, Mapping):
        raise ValueError("切分参数须为对象")
    strategy = value.get("strategy", "auto")
    if strategy not in ("auto", "custom", "hierarchy"):
        raise ValueError("请选择有效的切分方式")
    result = {
        "strategy": strategy,
        "max_chars": 800,
        "overlap": 10,
        "separator": "paragraph",
        "remove_links": False,
        "collapse_whitespace": False,
    }
    if strategy == "custom":
        try:
            result.update(
                max_chars=int(value.get("max_chars", 800)),
                overlap=int(value.get("overlap", 10)),
            )
        except (TypeError, ValueError):
            raise ValueError("切片长度和重叠比例必须是整数") from None
        if not 100 <= result["max_chars"] <= 2000 or not 0 <= result["overlap"] <= 50:
            raise ValueError("长度须为 100 至 2000 字，重叠比例须为 0 至 50%")
        result["separator"] = value.get("separator", "paragraph")
        if result["separator"] not in ("paragraph", "line", "sentence"):
            raise ValueError("请选择有效的分隔符")
        for key in ("remove_links", "collapse_whitespace"):
            raw = value.get(key, False)
            result[key] = raw is True or str(raw).lower() == "true"
    return result


def split_text(original, config=None):
    config = options(config)
    text, offsets = original, list(range(len(original)))
    if config["remove_links"]:
        keep = [True] * len(text)
        for match in re.finditer(r"https?://\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text):
            keep[match.start() : match.end()] = [False] * len(match.group())
        offsets = [i for i, yes in enumerate(keep) if yes]
        text = "".join(original[i] for i in offsets)
    if config["collapse_whitespace"]:
        chars, mapped = [], []
        for match in re.finditer(r"\s+|\S", text):
            chars.append(" " if match.group().isspace() else match.group())
            mapped.append(offsets[match.start()])
        text, offsets = "".join(chars), mapped
    boundaries = [0]
    if config["strategy"] == "hierarchy":
        boundaries += [
            m.start() for m in re.finditer(r"^#{1,3}\s+", text, re.M) if m.start()
        ]
    boundaries.append(len(text))
    limit = config["max_chars"]
    overlap = limit * config["overlap"] // 100
    separators = {
        "paragraph": ("\n\n",),
        "line": ("\n",),
        "sentence": ("。", "！", "？", ". "),
    }
    breaks = (
        separators[config["separator"]]
        if config["strategy"] == "custom"
        else ("\n\n", "\n", "。", "！", "？")
    )
    result = []
    for lower, upper in zip(boundaries, boundaries[1:]):
        start = lower
        while start < upper:
            end = min(start + limit, upper)
            if end < upper:
                candidates = [
                    text.rfind(mark, start + limit // 2, end) + len(mark)
                    for mark in breaks
                ]
                end = max(
                    [p for p in candidates if p > start + limit // 2], default=end
                )
            if text[start:end].strip():
                a, b = offsets[start], offsets[end - 1] + 1
                result.append(
                    {
                        "chunk_index": len(result),
                        "start_offset": a,
                        "end_offset": b,
                        "text": text[start:end],
                        "source_text": original[a:b],
                    }
                )
            if end == upper:
                break
            start = end - overlap
    return result
