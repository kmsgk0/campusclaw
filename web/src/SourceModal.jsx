import React, { useEffect, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { api } from "./api.js";
import { Badge, Button, Loading, Modal } from "./ui.jsx";

export default function SourceModal({ source, onClose, onOpenMaterial }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!source) return;
    const abort = new AbortController();
    setDetail(null);
    setError("");
    api(`/api/materials/${source.material_id}`, { signal: abort.signal })
      .then(setDetail)
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => abort.abort();
  }, [source]);
  if (!source) return null;
  const chars = detail ? Array.from(detail.material.body_text) : [];
  return (
    <Modal
      open={!!source}
      onOpenChange={(open) => !open && onClose()}
      title={source?.title || "引用原文"}
      description="高亮区域为回答引用的原始片段。"
      className="source-modal"
    >
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : !detail ? (
        <Loading label="正在读取原文" />
      ) : (
        <>
          <div className="source-meta">
            <FileText size={15} />
            {detail.material.original_name}
            <Badge>切片 {source.chunk_index + 1}</Badge>
          </div>
          <pre className="source-original">
            {chars.slice(0, source.start_offset).join("")}
            <mark>
              {chars.slice(source.start_offset, source.end_offset).join("")}
            </mark>
            {chars.slice(source.end_offset).join("")}
          </pre>
          <div className="modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                onOpenMaterial(source.material_id);
                onClose();
              }}
            >
              在材料库打开
              <ArrowRight size={15} />
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
