## Context

已有 users、sessions、materials、knowledge_entries 和服务端班级隔离。当前 GET /api/materials?q= 在本班范围内筛选整份材料，尚无段落级检索结果和来源定位。此变更规划第四课的能力，当前只交规约。

## Goals / Non-Goals

目标：用关键词查找本班正文段落，每条结果可追溯到原材料和位置；未登录与跨班访问按现有权限拒绝。非目标见 proposal。

## Decisions

### 1. 先采用 SQLite 关键词匹配

本次查询语义为去掉首尾空白后的一个关键词或连续短语，正文按 Unicode 小写做不区分英文大小写的字面包含匹配。中文按原字符匹配。SQL 必须参数化，不能拼接用户输入。

沿用现有数据库可满足课程小规模材料检索，避免增加模型密钥和服务。备选为向量数据库与嵌入模型，适合语义检索，但会引入模型选择、向量更新和额外部署，本次不采用。返回结果不宣称经过语义理解或相关性模型排序。

### 2. 段落与来源

新增 `knowledge_chunks`：`id`、`material_id`（外键）、`paragraph_index`（从 1 开始）、`start_line`、`end_line`、`body_text`，以及唯一约束 `(material_id, paragraph_index)`。班级从关联的 materials 表取得，不另外复制班级状态。

将正文中的 CRLF/CR 统一为 LF；空白行分隔段落，空白段忽略，正文内顺序保留。段落全文保存，不为长度方便而截断。原文件名、标题和作者从材料表关联取得。

### 3. 权限先于返回结果

`GET /api/search?q=关键词&page=1` 先执行现有登录中间件，再在 SQL 查询中强制 `materials.class_id = 当前用户班级`。不接受客户端指定班级。源材料详情与下载继续走现有鉴权 API。

每页最多 20 条，以材料 ID 降序、段落序号升序排列。响应包含 `query`、`page`、`page_size`、`total`、`has_more`、`results`；分页提供完整结果，不把首屏当作全部命中。每项包括 `material_id`、`title`、`original_name`、`paragraph_index`、`start_line`、`end_line`、`text`、`source_url`。`source_url` 指向本站受保护材料详情，前端展示同一份原文并定位相应段落。

### 4. 入库与回填

新增上传的段落与材料、知识库正文写入同一事务。老材料通过幂等回填脚本生成段落，不覆盖材料原文件、身份和班级。回填失败报错并回滚本次事务，重复运行不得产生重复段落。

### 5. 页面反馈

提供带标签的关键词输入框和搜索按钮。结果显示材料名、匹配段落、段落号和“查看来源”；内容作为文本或安全 Markdown 展示。空查询提示填写关键词；无命中时显示“本班知识库中没有找到相关内容”。

## Risks / Trade-offs

字面包含匹配无法识别同义词，返回完整段落可能较长；本次接受这两个限制，用分页控制响应规模。后续若引入语义检索，应作为新的变更，不在本次维护两套检索路径。

## Migration Plan

备份现有数据库；建表并回填；实现与测试检索 API；完成界面和来源定位；验证班级隔离、空结果、分页及 Compose 重启后的数据；验收通过后归档。

## Open Questions

无。本次提交停在 Propose 与 Review，tasks 全部保持未完成。
