# 内部运行配置

这份文档只用于本地开发和工程交接，不作为产品展示内容。页面和演示材料不展示 API Key、调用策略、成本控制、服务商额度或商业化实现细节。

## 配置位置

项目根目录：

```text
I:\Where to live
```

本地环境变量文件：

```text
I:\Where to live\.env.local
```

`.env.local` 已被 `.gitignore` 忽略，不应提交到仓库。

## 常用变量

```bash
OPENAI_API_KEY=
AMAP_WEB_SERVICE_KEY=
QWEATHER_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
AUTH_FORCE_LOCAL_EMAIL_CODE=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=http://127.0.0.1:3001
```

## Resend

注册和登录使用邮箱验证码。配置 `RESEND_API_KEY` 和 `RESEND_FROM_EMAIL` 后，验证码由服务端通过 Resend 发送。

未配置 Resend 时，系统走本地演示验证码，不阻塞本地体验。

演示或自动化验证需要强制走本地验证码时，可以临时设置：

```bash
AUTH_FORCE_LOCAL_EMAIL_CODE=1
```

该变量只用于本地演示和测试，不应作为正式线上登录策略。

## 本地启动

```bash
npm run dev
```

默认地址：

```text
http://127.0.0.1:3001
```

WSL 路径：

```bash
wsl.exe -d Ubuntu-24.04 --cd "/mnt/i/Where to live" -- bash -lc "npm run dev"
```

当前默认 WSL 发行版可能是 `docker-desktop`，不适合作为项目运行环境。`Ubuntu-24.04` 已确认可以进入 `/mnt/i/Where to live` 并识别 Node/npm；`Ubuntu-I` 当前未配置 Node.js。

`/mnt/i` 上的跨盘文件扫描可能较慢，长时间质量门建议使用 Windows 侧命令执行。

## 质量门

```bash
npm run lint
npm run smoke
npm run verify
npm run verify:prod
```

`smoke` 默认检查已经启动的 `http://127.0.0.1:3001`。

`verify` 会执行 lint 和生产构建。完整构建前建议先停止当前项目的 dev 进程并清理 `.next`，避免 dev server 和 build 同时读写构建目录。

`verify:prod` 会先执行 `verify`，再用 `next start` 在 `127.0.0.1:3100` 启动生产服务并运行同一套 smoke，适合交付前确认。

## 产品展示边界

公开演示只展示用户需要理解的内容：

- 生活成本
- 房源体检
- 付款咨询
- 当前行动
- 工作台
- 报告回看
- 方案与额度
- 邮箱注册 / 登录

不展示以下内容：

- API Key 配置
- 第三方服务调用策略
- 成本和额度控制
- 内部降级规则
- 服务端实现细节
- 商业化前提和运营策略

## 当前主要接口

| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/api/city/ledger` | `POST` | 生活成本和买房初判 |
| `/api/analyze/report` | `POST` | 房源体检报告 |
| `/api/payment/gate` | `POST` | 付款咨询 |
| `/api/plan/build` | `POST` | 当前行动 |
| `/api/area/screen` | `POST` | 片区初筛 |
| `/api/auth/captcha` | `GET` | 图形验证码 |
| `/api/auth/email-code` | `POST` | 邮箱验证码 |
| `/api/auth/verify-email` | `POST` | 邮箱验证码校验 |

## 安全原则

- 不把真实 Key 写进代码。
- 不把真实 Key 暴露给前端组件。
- 服务端变量默认不加 `NEXT_PUBLIC_`。
- `.env.local` 只用于本机。
- 演示时不要打开或展示环境变量文件。
