## Context

依据第二课 CampusClaw 规约和第三课登录、隔离、入库要求，建立个人课程实现。第二课提供 Flask/SQLite 示例，第三课允许沿用已声明的技术栈。本项目采用 Flask + SQLite，API 与页面同源。

## Goals / Non-Goals

目标是本班教学材料的真实上传、存储、阅读和下载；所有权限在服务端执行。非目标见 proposal。

## Decisions

1. SQLite 保存用户、班级、材料和知识库，以及作业、助手、技能的预留表。当前单实例和课程规模不需要独立数据库服务；不用内存数组代替持久化。
2. 随机会话标识保存在 HttpOnly、SameSite=Lax Cookie；数据库只存其 SHA-256 摘要和用户引用，身份查询从服务端读取角色与班级。会话八小时过期，登出删除会话，旧 Cookie 立即失效。相较于仅签名 Cookie 和无状态 JWT，可直接撤销。
3. 密码用 Werkzeug scrypt 哈希。初始密码通过环境变量提供，源码不含真实口令。登录失败统一文案；单实例中按来源地址限制连续失败，十次失败后五分钟再试。
4. 班级来自会话关联用户。列表、详情、下载用 SQL 同时约束 id 和 class_id；跨班与不存在都返回同形 404，避免泄露资源存在性。学生上传返回 403，无有效会话返回 401。
5. 上传仅接受 .txt/.md，文件至多 2 MiB，UTF-8 解码，空正文和 NUL 字符拒绝。服务端 UUID 作为磁盘文件名，客户端文件名只作展示。先验证再写文件，双表同事务入库；数据库失败回滚并删除已写文件。无静态 uploads 路由。
6. 页面采用 frontend-craft Workbench 布局，以 React、Radix Themes 的 sage/jade 配色和 Geist 字体实现独立设计。窄导航、材料目录、文档阅读区分层排列；上传使用 Radix Dialog。教师显示上传表单，学生只读；页面初始化和刷新以 /api/me 为准。本班搜索由 SQL 在班级范围内执行。Markdown 用 markdown-it-py 且禁用 HTML 渲染；不执行上传内容中的脚本。支持深浅色与列表/网格。
7. 同源 JSON 登录；写请求核对浏览器 Origin（若存在）防跨站提交。Cookie 在本地 HTTP 不设 Secure，在 HTTPS 部署时可通过环境变量启用。响应禁止缓存业务数据并设置 nosniff。
8. Compose 中用 gunicorn 单 worker、多线程运行；命名 volume 保存数据库和上传文件。/health 只表示进程存活，不查库，避免把存活和依赖就绪混为一谈。敏感配置缺失时启动失败。

## Risks / Trade-offs

SQLite 与本地文件属于两个存储系统，本次对可捕获失败做补偿删除，不承诺进程被强杀时的跨存储原子性。限流只在单进程有效；不支持多副本。Markdown 正文以安全的 HTML 展示，文本文件以预格式文本展示。

## Migration Plan

首次启动幂等建表并插入样本，不覆盖已有数据。依次实现配置与数据、认证、隔离、上传、页面、运行验收与证据。

## Open Questions

无。按 README 的 Docker Compose 步骤启动并验收。
