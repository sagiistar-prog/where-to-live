# 技术验收 2026-09-18

本页保留此前版本记录。当前42个来源、662个片段及52题验收见[住房决策知识库](housing-decision-knowledge.md)。

新增18个官方来源的住房知识库：本地全文采集、JSONL、283个BGE向量、真实pgvector及全文混合检索。产品默认附带18条有出处的简短整理，下载后无需模型即可查阅。/knowledge 按地区筛选；设置 HOUSING_KB_URL 后使用完整混合检索。修复未签名身份Cookie、邮箱参数查询账号、共享guest数据认领、生产固定验证码和前端自助开通付费方案。

## 验收边界

真实数据库指本机独立 PostgreSQL 16 / pgvector 容器，不是线上客户数据库。没有真实试用参与者；未宣称用户效果、转化率或临床/法律正确率。模型评测记录与集成测试分别呈现。

## 可复现数据库测试

设置 KB_DB_PASSWORD 后运行 `docker compose -f compose.knowledge.yaml up -d`。设置 KB_TEST_DATABASE_URL 指向该一次性测试数据库，运行 `python -m unittest discover -s knowledge -v`。测试语料使用独立随机 ID 并在结束时清理自身记录。服务使用 KB_DATABASE_URL；未配置时采用本地 JSON 向量索引。PostgreSQL 使用 ts_rank_cd 全文排名，不能称作 BM25；本地 JSON 模式使用 BM25。

## 本轮实际结果

住房单元测试 7 项通过；知识库测试 10 项通过（其中 2 项连接实际 PostgreSQL）。npm build、lint 通过。桌面与手机初始、结果、空结果、模拟 503 状态检查完成，未发现横向溢出；axe 自动检查无 WCAG A/AA 命中，不能等同全面无障碍认证。

真实服务在数据库重启后继续检索；五个地区全部通过隔离检查，详见 knowledge-acceptance.json。网页默认摘要检索已实际操作通过。带 HOUSING_KB_URL 的网页启动命令被工具自动审批拒绝，只有 blocked by policy，未提供更具体原因；完整网页到 pgvector 联调待验收，不能以分别通过替代端到端证据。
