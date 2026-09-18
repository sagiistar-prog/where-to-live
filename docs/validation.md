# 验收记录

最新住房资料验收见[42个来源与52题实际记录](housing-decision-knowledge.md)。下文保留2026-09-17的全站历史检查。

日期：2026-09-17。范围：本轮作品集迭代。

## 已运行

3 项排名回归测试；lint、内部链接、账本校验、生产构建；首页桌面/手机浏览器检查。

## 尚未证明

登录后的完整浏览器流程未验收；排名回归通过函数级测试。支付、短信、地图和生产认证需要独立环境验收。

没有进行真实用户访谈或客户效果实验。产品案例中的研究方案、指标目标和迭代假设不冒充已取得的结果。

## 复现入口

运行命令见 README、docs/plugin.md（插件仓库）及 knowledge/README.md（知识库仓库）。自动检查见 .github/workflows/quality.yml。依赖版本以锁文件为准。

## 界面记录

[桌面](screenshots/desktop.png) | [手机](screenshots/mobile.png)

Impeccable 检查后的设计事实记录在 DESIGN.md。HTML 检测器以降级模式运行，没有宣称完整无障碍认证；截图不等于全部交互自动验收。

## 依赖维护

2026-09-17 的 npm audit 为 0 个已知告警。锁文件已更新到 Next.js 15.5.25, next-auth 5.0.0-beta.32。这不是未来或全面安全保证。

Next 的 PostCSS 子依赖通过显式 override 固定为 8.5.28，修复旧锁定版本告警；构建、lint、账本和排名测试已验证兼容性。上游解除旧锁定后应评估移除此 override。
