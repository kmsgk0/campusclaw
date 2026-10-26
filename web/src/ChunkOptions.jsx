import React from "react";
export const defaultChunks = {
  strategy: "auto",
  max_chars: 800,
  overlap: 10,
  separator: "paragraph",
  remove_links: false,
  collapse_whitespace: false,
};
export default function ChunkOptions({ value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <fieldset className="chunk-options">
      <legend>切分方式</legend>
      <label>
        策略
        <select
          value={value.strategy}
          onChange={(e) => set("strategy", e.target.value)}
        >
          <option value="auto">自动切分</option>
          <option value="custom">自定义</option>
          <option value="hierarchy">按 Markdown 标题分章</option>
        </select>
      </label>
      {value.strategy === "custom" && (
        <>
          <div className="form-grid">
            <label>
              最大字数
              <input
                type="number"
                min={100}
                max={2000}
                value={value.max_chars}
                onChange={(e) => set("max_chars", Number(e.target.value))}
              />
            </label>
            <label>
              重叠比例（%）
              <input
                type="number"
                min={0}
                max={50}
                value={value.overlap}
                onChange={(e) => set("overlap", Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            分隔符
            <select
              value={value.separator}
              onChange={(e) => set("separator", e.target.value)}
            >
              <option value="paragraph">空行</option>
              <option value="line">换行</option>
              <option value="sentence">句号</option>
            </select>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={value.remove_links}
              onChange={(e) => set("remove_links", e.target.checked)}
            />
            移除链接和邮箱
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={value.collapse_whitespace}
              onChange={(e) => set("collapse_whitespace", e.target.checked)}
            />
            合并连续空白
          </label>
        </>
      )}
    </fieldset>
  );
}
