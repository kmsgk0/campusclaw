## Why

材料列表不能定位依据，也不能回答自然语言问题。增加按班级隔离的混合检索及带来源引用的简短问答，让师生能够核对回答依据。

## What Changes

- 以最多 800 个 Unicode 字符、80 字重叠自动切分正文，保留原文字符范围。
- SQLite 保存切片正文与中文二元词/英文词全文索引；Qdrant 保存向量及身份标识。
- 支持 keyword、vector、hybrid 检索；默认 hybrid，余弦阈值 0.35，RRF k=60。
- 仅将本班最多 4 条有效切片交给兼容 OpenAI 的对话接口，回答标注引用；无命中不调用回答模型。
- 上传后建立索引，原有材料通过显式命令补齐；相同内容的嵌入缓存持久化，避免重复消耗。

## Capabilities

### New Capabilities
- `knowledge-search`: 班级范围内的检索、引用问答及可恢复索引。

### Modified Capabilities
- `auth-materials`: 材料保存后同步建立知识索引，明确区分保存成功与索引失败。

## Impact

新增检索模块、SQLite 表与 FTS5 索引、Qdrant Compose 服务、模型配置、API 和界面。继续采用 Flask、SQLite、React 与 Bearer 鉴权。密钥只在后端配置。

## Non-goals

不增加文件格式、自定义切分、标题切分、重排序模型、流式输出、持久化聊天历史或智能体。
