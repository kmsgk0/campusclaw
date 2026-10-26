export const fileKind = (name) =>
  name.toLowerCase().endsWith(".md") ? "Markdown" : "TXT";
export const date = (value) =>
  new Date(value).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
export const fileSize = (size) =>
  size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
