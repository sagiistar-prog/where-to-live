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
rounded:
  lg: "0.5rem"
  md: "calc(0.5rem - 2px)"
  sm: "calc(0.5rem - 4px)"
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
---

# Design System: 住哪儿 AI

## Overview

**Creative North Star: "清醒的居住决策台"**

界面把用户的输入、当前判断和下一步放在前面。共享工作面是蓝、淡紫与冷灰；首页保留现有城市航拍影像和浅色遮罩，形成生活语境。克制装饰与简短文案支持连续判断。

规范提取自 app/globals.css、tailwind.config.ts、首页组件和共享 UI。它记录当前实现，不把尚未实现的全站统一要求写成事实。

## Colors

Primary 用于开始判断、关键链接及小图标。Secondary 与 muted 承载次级选择，accent 提供淡紫层次，card 与 background 区分工作面。错误和风险保留语义色与文字，不能只靠蓝灰表达严重程度。

首页影像遮罩和部分输入面仍含低饱和绿灰；品牌字样及少量原有阴影保留自身表达。不要把这些局部值扩展为另一套全局主色。

## Typography

正文采用 frontmatter 中的本机字体栈；列出字体不等于浏览器一定安装或下载了该字体。首页标题窄屏为 display 尺度，640px 起 48px，1024px 起 64px，使用平衡换行与正常字距。副文案为 16px/28px，640px 起 18px。

品牌字样使用独立圆体回退栈与 900 字重，保留已有字形姿态。不要把品牌字样样式用于报告正文。已移除首页标题上方的装饰性眉题。

## Layout

首页最大宽度 1280px，左右留白随断点为 16px、24px、32px；首屏最小高度为 92svh。标题居中，任务输入容器大屏最大宽度 896px；窄屏输入容器限制在视口减 32px。

任务类型以横向可滚动胶囊排列，移动端不强行挤成多行小字。输入下方先展示将进入的工具，再展示主动作；640px 以下按钮占满可用宽度。工作区和比较内容沿用各自表格、表单与卡片结构，不强制复制首页居中构图。

## Elevation & Depth

玻璃工作面使用细边框、半透明背景和 12px 模糊，阴影为 0 18px 54px oklch(var(--foreground) / 0.08)。首页输入卡单独使用更宽的 0 30px 96px oklch(var(--foreground) / 0.11) 和背景模糊。

城市视频是现有首页背景，自动播放、静音、循环；当前组件没有按 reduced-motion 停止视频的实现，因此本规范不宣称全站已满足该偏好。共享按钮已有颜色、轮廓等状态过渡。

## Shapes

共享容器采用 lg 圆角，默认按钮采用 md；首页开始按钮和任务选择采用胶囊形覆盖。边框分隔可编辑字段和报告分区，不以大圆角堆叠大量同权重卡片。

## Components

- 共享按钮有 primary、secondary、ghost、outline、destructive。默认高 40px，小号 36px，大号 48px；不能声称所有控件均达到 44px。禁用降低透明度并阻止指针交互，键盘焦点使用双像素 ring。
- 首页任务胶囊最小高 36px，选中态用淡蓝背景和主色边框。实际意图与所选类型不一致时，文字说明“已按输入调整”。
- 问题输入采用 16px 正文、28px 行高及最小 84px 输入高度，避免把关键输入变成营销口号。
- 比较界面保留候选信息与缺失项，不能以默认零成本制造推荐；状态文案说明需要补齐或核实什么。
- 导航、品牌与主动作各有层级，首屏不增加无用眉题或间隔点。

## Do's and Don'ts

- **Do** 让输入、判断依据与核验动作可以连续阅读。
- **Do** 用主色突出当前动作，风险同时采用文字和语义色。
- **Don't** 填写无来源的收益或排名，或用默认值掩盖缺失资料。
- **Don't** 把此文档理解为全站触控尺寸、对比度或减少动效认证。
