# 看房前，知道该核对什么

2026-09-19。本轮在既有54个来源上补充3个公开官方来源，形成57个来源的住房知识库。全国通用规则22个，北京13个、上海7个、广州10个、深圳5个。完整目录见[来源覆盖记录](knowledge-source-coverage.json)。这不是全国所有城市的完整政策库。

## 从用户的决定出发

原有资料覆盖合同、押金、公积金、备案、税费、贷款、纠纷、消防、居住证和水电账单。本轮补齐看房到签约之间的资料缺口：租客面对装修痕迹、空气检测广告或电梯标志时，需要知道向谁索要什么资料，而不能仅凭页面给出的“安全分”做决定。

| 用户问题 | 新增的一手来源 | 可以采取的下一步 |
| --- | --- | --- |
| 检测机构同时推销除醛服务，可信吗？ | [市场监管总局与住建部2026年专项方案](https://www.samr.gov.cn/rkjcs/tzgg/art/2026/art_2a0164bc81da4c889262fa935bed98aa.html) | 核对检测与治理机构的关系、采样条件、服务合同和报告，不把营销承诺当现场测量 |
| 看房发现疑似拆改承重墙怎么办？ | [住建部城市房屋装修安全管理通知](https://app.www.gov.cn/govdata/gov/202306/12/504071/article.html) | 向房东或物业核对装修登记及设计方案，必要时向属地部门反映 |
| 电梯换了维保单位，标志需要更新吗？ | [市场监管总局电梯检验检测实施通知](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/tzsbs/art/2024/art_4ba7edb1370d42a3b07f051e7f0049f6.html) | 向物业核对使用标志、检验月份及维保单位 |

这些是资料核验路径，不是检测、工程鉴定或个案法律结论。新增边界覆盖“这套房甲醛超标吗”“这个电梯安全吗”等未提供测量的问题，显示下一步提示；“需要核对什么材料”仍然可以查询。边界由有限模式识别，并非覆盖所有说法的语义安全系统。

## 来源质量比数量重要

公开搜索还发现地方消费提示、标准转载、新闻转述和商品排名页面。未将这些候选全部入库：地方指南不能随意标为全国规则，标准摘要不能冒充标准全文，带商品导购及不明统计的页面即使位于gov.cn域名也不能仅靠域名通过审核。本轮选择发布机关的文件，逐项核对正文和日期，没有收录商业排名。

甲醛来源明确标为2026年专项方案，只抽取第3至7项服务要求；不把阶段性整治当永久法律，也不宣称规划中的报告溯源系统已上线。电梯文件仅抽取第三部分第一项，避免混入截至2025年底的机构准入过渡条款；附件样式未被HTML抽取，不宣称已经读取附件。

## 清洗、切分与向量化

57/57页面采集成功，共201,905个清洗后字符。使用Trafilatura抽取正文及受支持的表格，记录JSONL、出处、地区、采集日期、正文与响应哈希。新增章节有明确起止标记，缺失或重复时采集失败。

清洗后的文本按320字符、40字符重叠切分，实际得到749个片段。FastEmbed调用BAAI/bge-small-zh-v1.5进行真实ONNX推理，生成749条512维归一化向量；模型内部处理token与位置信息，检索采用句向量。逐片段验证出处偏移、文本哈希、向量维度及范数，实际最大321 token，没有超过512 token上限。[模型与语料记录](evaluation/housing-inspection-corpus.json)保留可复核哈希。

与前54来源快照比较，新增3个、正文或元数据变化0个、仅原始响应变化2个、其余52个未变，见[快照差异](evaluation/housing-inspection-source-diff.json)。只对新增摘要完成本轮语义核对，旧摘要保留原审核时间。正文未变不能证明不存在未发现的新修订。

## 75道技术回归

保留原67题，在检索运行前新增6个资料问题和2个能力边界问题。题目由开发者编写并标注来源，属于来源级回归，不是独立盲测、律师审定或真实租客成功率。

| 检索方式 | 有来源题命中 | 无依据题错误输出 | 地区混入 |
| --- | --- | --- | --- |
| 默认网页摘要，最多5条 | 65/65 | 0/10 | 0 |
| 全文关键词，Top3 | 64/65 | 0/10 | 0 |
| 全文向量，Top3 | 62/65 | 0/10 | 0 |
| 全文混合，Top3 | 64/65 | 0/10 | 0 |

混合采用BM25与余弦召回后RRF融合，地区和已知有效期在排名前过滤。没有为本轮结果调整标签或排名参数。混合模式仍漏掉原题pos-15标注的广州租赁企业核验来源，不能宣称每个问题都准确。详见[三路结果](evaluation/housing-inspection-component.json)与[摘要结果](evaluation/housing-inspection-summary.json)。

本地38项Python测试中35项通过，3项数据库测试因未设置隔离数据库而跳过；16项TypeScript测试、lint及生产构建通过。[浏览器验收](evaluation/housing-inspection-ui.json)在1440和390像素下分别完成三个新增任务、展开适用条件、核对原文链接及两个无法测量的问题，无页面异常、横向溢出或axe自动违规。保留原有视觉样式，未增加界面说明层或装饰动画。

## 下载后怎么用

`npm ci`、`npm run dev`后进入`/knowledge`，即可搜索57条原创整理及其官方出处，无需账号、Docker或模型。默认模式是摘要关键词检索。需要全文混合检索时，按[运行说明](../knowledge/README.md)重新采集并构建本地索引；第三方全文、向量文件和模型缓存不提交Git。

```sh
python knowledge/collect.py --output output/inspection-rebuild
python knowledge/pipeline.py build --documents output/inspection-rebuild/documents.jsonl --index output/inspection-rebuild/index.json --cache-dir .cache/models
python knowledge/evaluate.py --index output/inspection-rebuild/index.json --cases knowledge/evaluation/inspection-cases.json --cache-dir .cache/models --output output/inspection-rebuild/evaluation.json --min-hit-rate 0.95 --max-false-evidence-rate 0
node --import tsx scripts/evaluate-knowledge-summary.ts knowledge/evaluation/inspection-cases.json output/inspection-rebuild/summary.json 2026-09-19
```

本轮完成新语料本地检索和默认网页验收，未将57来源索引写入生产数据库。完整网页到独立向量服务联调仍未验收：此前服务启动动作被自动审批返回`blocked by policy`，未给具体原因，本轮未重试等价动作。未招募真实租客，也没有客户效果数据。后续应验证用户能否更快找到适用依据、提出正确核验问题和减少签约前遗漏，而不以资料数量或向量维度替代用户价值。
