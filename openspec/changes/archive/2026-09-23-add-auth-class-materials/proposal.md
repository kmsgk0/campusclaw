## Why

教师需要上传教学材料供本班学生阅读，且其他班级不能读取。先建立登录、权限和可复现的材料入库流程，为后续检索提供正文数据。

## What Changes

- 预置 A/B 两班、教师 A 和学生 A/B，以及各班材料。
- 账号密码登录、服务端会话、身份查询与登出。
- 教师上传 UTF-8 的 txt/md 文件；同班用户查看列表、详情和下载。
- 材料与知识库正文在同一事务入库；失败清理文件。
- Docker Compose、持久化、健康检查、运行文档和本周五项作业证据。

## Capabilities

### New Capabilities
- `auth-materials`: 登录、角色和班级授权、上传入库、下载、页面和运行验收。

### Modified Capabilities
无。

## Impact

新增 Python 应用、SQLite 数据库、HTML/CSS/JS 页面、容器配置和验收测试。无现存业务代码需要迁移。

## Non-goals

不做注册、找回密码、管理员、跨班访问、PDF/Word 解析、向量检索、问答、作业批改、多副本。腾讯云公网演示仅用于本次课程作业。
