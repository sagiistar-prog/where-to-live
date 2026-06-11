export type ApiProviderConfig = {
  id: "openai" | "amap" | "qweather" | "resend";
  name: string;
  platform: string;
  purpose: string;
  env: string;
  keyType: string;
  quotaNote: string;
  degradation: string;
  setupHint: string;
  quotaTrigger: string;
};

export const apiProviders: ApiProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    platform: "OpenAI Platform",
    purpose: "截图读取、信息整理、合同确认、房源评估",
    env: "OPENAI_API_KEY",
    keyType: "服务端 Project API Key",
    quotaNote: "按 OpenAI 项目额度和账单控制，不会出现在浏览器端。",
    degradation: "未配置时仍可形成快速判断和合同风险提示。",
    setupHint: "在 OpenAI Platform 创建 Project API Key，粘贴到根目录 .env.local 的 OPENAI_API_KEY。",
    quotaTrigger: "只有用户点击截图读取、合同确认或房源评估时才会调用。",
  },
  {
    id: "amap",
    name: "高德地图",
    platform: "高德开放平台 · Web服务",
    purpose: "地址解析、通勤路线、周边生活信息、行政区划",
    env: "AMAP_WEB_SERVICE_KEY",
    keyType: "Web 服务 Key，服务端调用",
    quotaNote: "个人免费额度内使用；页面只展示产品侧累计，不等同于高德后台账单。",
    degradation: "用量接近提醒线或未配置时，改用用户手动输入通勤和基础片区判断。",
    setupHint: "在高德开放平台创建应用时选择“Web服务”，不是“Web端(JS API)”，填入 AMAP_WEB_SERVICE_KEY。",
    quotaTrigger: "只有房源评估或片区筛选需要地址解析、路线、周边生活信息时才会调用。",
  },
  {
    id: "qweather",
    name: "和风天气",
    platform: "和风天气开发服务",
    purpose: "湿度、降雨、高温、空气质量、居住舒适度",
    env: "QWEATHER_API_KEY",
    keyType: "服务端天气 API Key",
    quotaNote: "个人免费额度内使用；页面只展示产品侧累计和用量状态。",
    degradation: "用量接近提醒线或未配置时，改用城市气候常识并明确提示未实时查询。",
    setupHint: "在和风天气开发服务创建服务端 Key，填入 QWEATHER_API_KEY；如需自定义域名再配置 QWEATHER_API_HOST。",
    quotaTrigger: "只有报告需要实时湿度、降雨、高温或空气质量判断时才会调用。",
  },
  {
    id: "resend",
    name: "Resend",
    platform: "Resend Email API",
    purpose: "邮箱验证码、注册验证和后续重要提醒",
    env: "RESEND_API_KEY",
    keyType: "服务端 Email API Key",
    quotaNote: "按 Resend 账户额度和发件域名限制控制，不会出现在浏览器端。",
    degradation: "未配置时使用当前设备验证码，不发送真实邮件。",
    setupHint: "在 Resend 创建 API Key，填入 RESEND_API_KEY；发件地址可用 RESEND_FROM_EMAIL 配置。",
    quotaTrigger: "只有用户请求邮箱验证码或后续主动触发邮件提醒时才会调用。",
  },
];
