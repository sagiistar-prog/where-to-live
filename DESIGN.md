---
name: 住哪儿 AI
description: 用克制的蓝灰工作面呈现居住判断与下一步核验
colors:
  background: "oklch(0.974 0.009 265)"
  foreground: "oklch(0.20 0.014 210)"
  card: "oklch(0.994 0.003 265)"
  primary: "oklch(0.48 0.16 266)"
  primary-foreground: "oklch(0.99 0.003 265)"
  secondary: "oklch(0.947 0.015 265)"
  secondary-foreground: "oklch(0.28 0.014 205)"
  muted: "oklch(0.927 0.016 265)"
  muted-foreground: "oklch(0.48 0.014 205)"
  accent: "oklch(0.89 0.035 275)"
  border: "oklch(0.86 0.015 265)"
  input: "oklch(0.87 0.015 265)"
  destructive: "oklch(0.58 0.090 28)"
  knowledge-background: "#f4f5f8"
  knowledge-foreground: "#222a40"
  knowledge-muted: "#525d75"
  knowledge-surface: "#ffffff"
  knowledge-primary: "#294a9d"
  knowledge-primary-hover: "#1d397d"
  knowledge-focus: "#315dc6"
  knowledge-input-border: "#b8c1d1"
  knowledge-placeholder: "#626d82"
  knowledge-divider: "#ccd2dd"
  knowledge-error: "#963239"
typography:
  body:
    fontFamily: '"Alibaba PuHuiTi 3.0", "Alibaba PuHuiTi", "AlibabaPuHuiTi", "Alibaba PuHuiTi 2.0", "Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  display:
    fontSize: "2.35rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "0em"
  label:
    fontSize: "14px"
    fontWeight: 500
  knowledge-headline:
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  knowledge-excerpt:
    lineHeight: "32px"
rounded:
  lg: "0.5rem"
  md: "calc(0.5rem - 2px)"
  sm: "calc(0.5rem - 4px)"
  knowledge-panel: "16px"
  knowledge-button: "12px"
spacing:
  page: "16px"
  page-sm: "24px"
  page-lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
  knowledge-button-primary:
    backgroundColor: "{colors.knowledge-primary}"
    textColor: "{colors.knowledge-surface}"
    rounded: "{rounded.knowledge-button}"
    padding: "12px 20px"
  knowledge-button-primary-hover:
    backgroundColor: "{colors.knowledge-primary-hover}"
  knowledge-query-panel:
    backgroundColor: "{colors.knowledge-surface}"
    rounded: "{rounded.knowledge-panel}"
    padding: "24px"
---

# Design System: 住哪儿 AI

## Overview

**Creative North Star: "清醒的居住决策台"**

界面把用户的输入、当前判断和下一步放在前面。共享工作面是蓝、淡紫与冷灰；首页保留现有城市航拍影像和浅色遮罩，形成生活语境。克制装饰与简短文案支持连续判断。

规范提取自 app/globals.css、tailwind.config.ts、首页组件、app/knowledge/page.tsx 和共享 UI。它记录当前实现，不把尚未实现的全站统一要求写成事实。

资料检索页 `/knowledge` 延续 Operate 方向：先选地区、再输入问题，白色表单后接可直接阅读的来源列表。它使用独立的冷灰与深蓝局部色值，保留官方原文入口，不复制首页影像或增加装饰点阵。

## Colors

Primary 用于开始判断、关键链接及小图标。Secondary 与 muted 承载次级选择，accent 提供淡紫层次，card 与 background 区分工作面。错误和风险保留语义色与文字，不能只靠蓝灰表达严重程度。

首页影像遮罩和部分输入面仍含低饱和绿灰；品牌字样及少量原有阴影保留自身表达。不要把这些局部值扩展为另一套全局主色。

knowledge-* 是资料检索页实际使用的局部 token，不替换共享主题。knowledge-primary 同时用于查找按钮和官方原文链接；knowledge-error 只配合失败文字出现。输入边框与结果分隔线分别使用各自 token，避免将结果列表处理成密集卡片。

## Typography

正文采用 frontmatter 中的本机字体栈；列出字体不等于浏览器一定安装或下载了该字体。首页标题窄屏为 display 尺度，640px 起 48px，1024px 起 64px，使用平衡换行与正常字距。副文案为 16px/28px，640px 起 18px。

品牌字样使用独立圆体回退栈与 900 字重，保留已有字形姿态。不要把品牌字样样式用于报告正文。已移除首页标题上方的装饰性眉题。

资料检索页继承正文字体栈，标题使用 knowledge-headline，640px 起增至 60px，保持显式两行与紧字距。说明和字段行高为 28px；来源摘录使用 knowledge-excerpt，最长 70ch，保留原始换行。区域标题为 24px，来源标题为 18px，元数据为 14px。

## Layout

首页最大宽度 1280px，左右留白随断点为 16px、24px、32px；首屏最小高度为 92svh。标题居中，任务输入容器大屏最大宽度 896px；窄屏输入容器限制在视口减 32px。

任务类型以横向可滚动胶囊排列，移动端不强行挤成多行小字。输入下方先展示将进入的工具，再展示主动作；640px 以下按钮占满可用宽度。工作区和比较内容沿用各自表格、表单与卡片结构，不强制复制首页居中构图。

资料检索页桌面与移动端均为单列：页头最大宽度 1024px，主内容最大宽度 896px，横向留白均为 24px。主内容上下留白从 48px 增至 640px 起的 80px。表单内部留白 24px，文本域最小高 112px，允许垂直调整；主动作保持右对齐、内容宽度，不在移动端自动铺满。结果区与表单按正常文档流向下展开，无独立固定高度滚动容器。

## Elevation & Depth

玻璃工作面使用细边框、半透明背景和 12px 模糊，阴影为 0 18px 54px oklch(var(--foreground) / 0.08)。首页输入卡单独使用更宽的 0 30px 96px oklch(var(--foreground) / 0.11) 和背景模糊。

城市视频是现有首页背景，自动播放、静音、循环；当前组件没有按 reduced-motion 停止视频的实现，因此本规范不宣称全站已满足该偏好。共享按钮已有颜色、轮廓等状态过渡。

资料检索页仅给白色查询面板加柔影（0 12px 40px #222a4010），结果列表以留白和细分隔线区分。按钮使用颜色过渡，处理中仅更新文字与可用性，没有点阵、骨架屏或虚构百分比。该页未单独声明 reduced-motion 覆盖。

## Shapes

共享容器采用 lg 圆角，默认按钮采用 md；首页开始按钮和任务选择采用胶囊形覆盖。边框分隔可编辑字段和报告分区，不以大圆角堆叠大量同权重卡片。

资料检索面板与按钮分别采用 knowledge-panel 和 knowledge-button，地区选择与问题文本域使用 lg 圆角。来源是无外框文章条目，底部分隔线维持连续阅读。

## Components

- 共享按钮有 primary、secondary、ghost、outline、destructive。默认高 40px，小号 36px，大号 48px；不能声称所有控件均达到 44px。禁用降低透明度并阻止指针交互，键盘焦点使用双像素 ring。
- 首页任务胶囊最小高 36px，选中态用淡蓝背景和主色边框。实际意图与所选类型不一致时，文字说明“已按输入调整”。
- 问题输入采用 16px 正文、28px 行高及最小 84px 输入高度，避免把关键输入变成营销口号。
- 比较界面保留候选信息与缺失项，不能以默认零成本制造推荐；状态文案说明需要补齐或核实什么。
- 导航、品牌与主动作各有层级，首屏不增加无用眉题或间隔点。

### 资料检索页

- 地区为带可见标签的原生 select，提供全国、北京、上海、广州、深圳；问题字段必填且最多 1000 字。地区或问题变更会清除既有命中结果，提交时再清除先前错误。
- 请求期间地区禁用、问题只读、按钮禁用并显示“正在查找”；同步请求锁阻止重复提交。失败保留所选地区和问题，并显示可重试说明。
- 初始状态没有虚构结果；空结果单独说明可补充的事项，以及租金、真伪、通勤需另行核验。命中条目显示地区、采集日期、标题、摘录和带下划线的官方原文外链；stale 标记触发“超过 90 天未更新”的文字提示。
- 常驻状态节点同时使用 role="status" 与 aria-live="polite"。处理中消息可见，完成条数消息转为仅屏幕阅读器可读；失败另用 role="alert"。这记录实际标记，不等于已经完成读屏器实测。
- 按钮 focus-visible 使用 2px 轮廓与 4px 偏移；选择框和文本域设置局部 focus 色。搜索与外链图标均为装饰性图标，不重复朗读。

查询状态补充：能力边界命中时，结果区保留空结果标题，并显示实时市场数据、价格预测、未提供具体合同却请求效力判断或非住房事项的对应提示；正常询问涨租如何在合同中约定，以及未提供合同但询问押金核验步骤，仍允许检索，不等同于保证命中。上游返回 QUERY_TOO_LONG 时，错误区提示“问题较长，请保留一个具体事项后重试。”，原输入保持不变。网页默认查询本地资料摘要（reference-search）；配置 HOUSING_KB_URL 后才转接混合检索服务。完整网页至 PostgreSQL 的端到端链路尚未验收，本段仅记录当前交互与接口分支，不改变视觉 token。

2026-09-18 的 test-results/knowledge-review 捕获覆盖桌面和移动端初始、结果、空结果与失败画面；checks.json 记录两端各 5 条命中、无横向溢出及失败后输入保留。失败截图来自路由注入的 HTTP 503，不是实际服务故障证据。完整在线混合检索端到端链路尚未验证；该视觉评审不证明检索覆盖、法律适用或生产可靠性。

## Do's and Don'ts

- **Do** 让输入、判断依据与核验动作可以连续阅读。
- **Do** 用主色突出当前动作，风险同时采用文字和语义色。
- **Do** 在资料列表中保留地区、采集日期、时效提示与官方原文入口，并让加载、空结果和失败分别可理解。
- **Don't** 填写无来源的收益或排名，或用默认值掩盖缺失资料。
- **Don't** 把此文档理解为全站触控尺寸、对比度或减少动效认证。

## 住房资料的适用条件

2026-09-18扩展至买房税费、贷款及纠纷资料。`/knowledge`保留现有蓝灰工作面，在每条结果的“适用条件与日期”中按需展开适用主体、已知发布/施行/截止日期；采集时间不充当政策生效时间。使用原生details/summary，可键盘操作，未知日期不显示伪造值。本次1440和390实际浏览器检查无溢出及axe A/AA命中；检测器无新增命中，不代表全面无障碍认证。
