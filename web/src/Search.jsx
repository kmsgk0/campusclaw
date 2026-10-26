import React, { useState } from "react";
import { ArrowRight, ArrowUp, FileText, Search, Sparkles } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { api } from "./api.js";
import { fileKind } from "./format.js";
import { Badge, Button } from "./ui.jsx";

export default function SearchView({ onSource, onOpenMaterial }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search(event, page = 1) {
    event?.preventDefault();
    const input = page === 1 ? { query: query.trim(), mode } : result.input;
    if (!input.query || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api(
        `/api/search?q=${encodeURIComponent(input.query)}&mode=${input.mode}&page=${page}`,
      );
      setResult({ ...data, input });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="search-page">
      <div className="section-heading">
        <span className="section-icon">
          <Search size={22} />
        </span>
        <div>
          <h1>知识检索</h1>
          <p>找到材料中的相关片段，直接回到原文。</p>
        </div>
      </div>
      <form className="knowledge-search-form" onSubmit={search}>
        <label className="sr-only" htmlFor="knowledge-query">
          检索本班材料
        </label>
        <Search size={19} />
        <input
          id="knowledge-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入关键词，或描述你想找的内容"
          required
        />
        <Button type="submit" busy={busy}>
          检索
          <ArrowRight size={15} />
        </Button>
      </form>
      <Tabs.Root value={mode} onValueChange={setMode}>
        <Tabs.List className="mode-tabs" aria-label="检索方式">
          <Tabs.Trigger value="hybrid">
            <Sparkles size={14} />
            混合检索
          </Tabs.Trigger>
          <Tabs.Trigger value="keyword">关键词</Tabs.Trigger>
          <Tabs.Trigger value="vector">语义检索</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      {error && (
        <p role="alert" className="inline-error search-error">
          {error}
        </p>
      )}
      {result ? (
        <div className="search-results">
          <div className="search-summary">
            <span>“{result.input.query}”</span>
            <span>找到 {result.total} 条相关片段</span>
          </div>
          {result.hits.length ? (
            result.hits.map((hit) => (
              <article className="search-result" key={hit.id}>
                <div className="result-top">
                  <span className="file-icon">
                    <FileText size={19} />
                  </span>
                  <button onClick={() => onOpenMaterial(hit.material_id)}>
                    {hit.title}
                  </button>
                  <Badge>{fileKind(hit.original_name)}</Badge>
                </div>
                <p>{hit.text}</p>
                <div className="result-bottom">
                  <span>
                    切片 {hit.chunk_index + 1} · 字符 {hit.start_offset} 至{" "}
                    {hit.end_offset}
                  </span>
                  <details className="retrieval-detail">
                    <summary>检索详情</summary>
                    <span>
                      关键词排名 {hit.keyword_rank ?? "无"} · 向量排名{" "}
                      {hit.vector_rank ?? "无"} · 融合分 {hit.score?.toFixed(5)}
                    </span>
                  </details>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onSource(hit)}
                  >
                    查看原文
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Search size={30} />
              <h2>没有找到相关片段</h2>
              <p>换一个关键词，或试试语义检索。</p>
            </div>
          )}
          {!!result.total && (
            <div className="pagination">
              <Button
                variant="outline"
                size="small"
                disabled={busy || result.page === 1}
                onClick={() => search(null, result.page - 1)}
              >
                上一页
              </Button>
              <span>第 {result.page} 页</span>
              <Button
                variant="outline"
                size="small"
                disabled={busy || !result.has_more}
                onClick={() => search(null, result.page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="search-welcome">
          <div className="search-illustration">
            <FileText size={38} />
            <span>
              <Search size={21} />
            </span>
          </div>
          <h2>每个答案，都有一段原文。</h2>
          <p>
            关键词查找具体词句，语义检索理解你的描述。
            <br />
            混合检索会综合两种结果。
          </p>
          <div className="search-example">
            <span>试试看</span>
            <button onClick={() => setQuery("磁铁")}>
              磁铁
              <ArrowUp size={12} />
            </button>
            <button onClick={() => setQuery("水的物态变化")}>
              水的物态变化
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
