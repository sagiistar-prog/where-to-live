# 住房资料检索

用户在签约、退租、支付押金和办理公积金前，需要找到适用于房屋所在地的依据。入口是 `/knowledge`，无需登录。界面提供来源、地区和采集日期；不推断实时租金、房源真伪或个案法律结论。

## 下载即用

在仓库根目录运行 `npm ci`、`npm run dev`，打开 `/knowledge`。默认检索 `reference-notes.json` 中 18 条带官方出处的原创简要整理，不需要模型或数据库，也不冒充全文语义检索。

## 全文知识库

要求 Python 3.10 或 3.11。以下命令在仓库根目录执行：

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r knowledge/requirements.txt
.venv\Scripts\python knowledge/collect.py --output output/public-kb
.venv\Scripts\python knowledge/pipeline.py build --documents output/public-kb/documents.jsonl --index output/public-kb/index.json --cache-dir .cache/models
.venv\Scripts\python knowledge/server.py --index output/public-kb/index.json --cache-dir .cache/models --port 8782
```

首次运行需要下载 BAAI/bge-small-zh-v1.5。模型内部处理 token embedding、position embedding 和上下文编码，应用采用 512 维归一化句向量；不能把单个 token 的向量当作最终检索向量。JSON 模式以 BM25 和余弦相似度分别召回，再用 RRF 合并。地区条件先于召回执行。

当前住房融合的关键词与向量权重为 2:1，向量和混合结果中同一来源最多占两条；能力边界规则会提示无法查询实时价格、预测涨跌或判断未提供的合同。询问涨租约定、付款前材料等规则仍可以检索。规则是有限模式，并非完整语义识别。推理前使用真实 tokenizer 校验长度，含查询前缀及特殊 token，超过 512 token 明确拒绝，不静默截断。

`collect.py` 只采集 `sources.json` 中明确列出的政府和法院公开页面。保留正文、表格、来源 URL、采集时间、原始响应哈希和地区。民法典仅收录租赁合同章。失败来源写入 `collection-report.json`；采集成功不代表政策始终有效。每次更新检查失败数、重定向、正文完整性和政策有效期。

清洗后按 320 字符切分，步长 280，保留 40 字符重叠和出处位置。每个片段由 `chunk.schema.json` 校验。默认不会覆盖已有索引：更新时使用新的索引文件名，验收后再切换服务。原始采集、模型缓存和向量索引均不提交 Git。

## PostgreSQL / pgvector

设置本地 `KB_DB_PASSWORD` 后运行 `docker compose -f compose.knowledge.yaml up -d`。设置 `KB_DATABASE_URL` 为自己的 PostgreSQL 连接地址，再启动上述知识服务。服务会幂等写入独立 `evidence_kb` schema，以语料哈希和模型标识隔离索引。

数据库模式使用 pgvector 余弦检索、PostgreSQL 全文 `ts_rank_cd` 和 RRF；全文排名并非 BM25。每次请求新建数据库连接，允许数据库重启后重新连接。当前小型语料使用精确向量扫描；大规模上线前需要按模型维度分表、建立 HNSW 索引并测量召回和延迟。

网页进程设置 `HOUSING_KB_URL=http://127.0.0.1:8782` 后会请求全文服务。服务不可用时明确报错，不会悄悄退回摘要检索。未设置时使用下载自带的资料整理。

## 验收和边界

运行 `python -m unittest discover -s knowledge -v`。实际数据库测试需要 `KB_TEST_DATABASE_URL` 指向隔离测试数据库；测试只清理随机测试语料 ID。网页回归使用 `npm test` 和 `npm run build`。

本次采集 18 个来源、283 个片段并完成真实 BGE 推理和 pgvector 写入。资料覆盖全国及北上广深部分政策，不是完整法规库；`reviewed` 仅表示核对了官方来源，不代表律师审定。网页到独立向量服务的完整联调仍待验收，详见本轮技术报告。

## 开源实现依据

- [FastEmbed](https://github.com/qdrant/fastembed)：Apache-2.0，成熟 ONNX 向量推理。
- [pgvector](https://github.com/pgvector/pgvector)：PostgreSQL 向量存储和距离计算。
- [Trafilatura](https://github.com/adbar/trafilatura)：Apache-2.0，正文与表格提取。

保留依赖自身许可证。政府来源只作为公开依据；仓库附带原创摘要和来源链接，完整抓取结果留在本地。

[修复前后评测、运行命令及局限](../docs/retrieval-evaluation.md)记录关键词、向量、混合三路比较；[开源架构取舍](../docs/rag-design-comparison.md)说明实际复用与仅作参考的部分。CI 使用原创虚构资料下载真实 BGE 模型并执行回归门槛，政府全文语料单独评测。
