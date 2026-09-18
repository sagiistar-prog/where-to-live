# RAG 开源参考与产品取舍

核查日期：2026-09-18。选择看任务匹配、接口稳定性、许可证、可测试性和部署成本；项目热度只帮助筛选候选，不是质量证明。

| 参考 | 借鉴点 | 本仓库的选择与差距 |
|---|---|---|
| [Haystack](https://github.com/deepset-ai/haystack) / [评测文档](https://docs.haystack.deepset.ai/docs/evaluation) | 将组件评测和端到端评测分开；显式检索与合并阶段 | 实现清洗、JSONL、编码、召回、融合、证据门槛。组件报告和真实数据库测试分开，网页完整联调仍有缺口。未整体接入框架 |
| [Ragas](https://github.com/vibrantlabsai/ragas) / [context precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/) | 为证据相关性建立明确评测定义 | 原创的小型来源 ID 评测器，无 LLM 裁判和费用；不是 Ragas 集成，没有宣称其 context precision 成绩 |
| [Dify](https://github.com/langgenius/dify) | 资料管理、工作流、运行观察形成闭环 | 当前优先解决单一住房依据查询，保留源码可读性和轻量本地运行。尚无多租户知识运营平台；仅参考产品组织，不复制代码，其许可需独立核查 |
| [GPT Researcher](https://github.com/assafelovic/gpt-researcher) | 研究过程追溯到来源 | 明确政府来源清单和地域边界，避免自动扩散搜索引入中介营销；暂不自动生成长研究报告 |

实际复用的依赖为 [FastEmbed](https://github.com/qdrant/fastembed)、[BGE 中文模型](https://huggingface.co/BAAI/bge-small-zh-v1.5)、[pgvector](https://github.com/pgvector/pgvector) 和 [Trafilatura](https://github.com/adbar/trafilatura)。前端保留原有 Radix/Motion，减少重复组件体系。来源采集和评测胶水代码由本项目实现。

这份对比不是“已达到这些框架水平”的结论。当前可展示的是问题定义、明确技术取舍、真实推理、失败案例和可复现改进；成熟平台的规模、多用户运维和真实客户效果尚无对应证据。
