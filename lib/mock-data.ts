import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  BadgeDollarSign,
  Banknote,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Bus,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Compass,
  FileCheck2,
  FileWarning,
  HandCoins,
  HeartHandshake,
  Home,
  KeyRound,
  Landmark,
  ListChecks,
  Map,
  MapPin,
  PackageCheck,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Route,
  Scale,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Truck,
  Umbrella,
  UsersRound,
  WalletCards,
  Workflow,
  Wrench,
} from "lucide-react";

export type ReportStatus = "recommend" | "caution" | "reject";

export type ListingSummary = {
  id: string;
  title: string;
  district: string;
  rent: number;
  area: string;
  commute: string;
  score: number;
  status: ReportStatus;
  tags: string[];
  analyzedAt: string;
};

export type ScoreItem = {
  label: string;
  score: number;
  summary: string;
};

export type ReportSectionItem = {
  title: string;
  points: string[];
};

export type ReportData = {
  title: string;
  address: string;
  status: ReportStatus;
  conclusion: string;
  score: number;
  scores: ScoreItem[];
  commute: ReportSectionItem;
  amenities: ReportSectionItem;
  lifeRadius?: ReportSectionItem;
  comfort: ReportSectionItem;
  livingCost: ReportSectionItem;
  contractRisk: ReportSectionItem;
  visitChecklist: string[];
  finalAdvice: string;
};

export type ComparisonListing = {
  id?: string;
  rank: number;
  name: string;
  rent: string;
  trueMonthlyCost: string;
  trueMonthlyCostValue?: number;
  area: string;
  commute: string;
  commuteMinutes?: number;
  amenities: string;
  risk: ReportStatus;
  score: number;
  reason: string;
  href?: string;
  source?: string;
  gateLevel?: "stop" | "review" | "ready";
  gateLabel?: string;
  gateProgress?: number;
  canPay?: boolean;
  canSign?: boolean;
  confidenceLevel?: "ready" | "review" | "limited" | "unknown";
  confidenceLabel?: string;
  confidenceScore?: number;
  confidenceSummary?: string;
  confidenceGaps?: string[];
  nextActionLabel?: string;
  nextActionHref?: string;
  tradeoff?: string;
  blockers?: string[];
  monthlyCostDelta?: string;
  commuteDelta?: string;
  decisionSummary?: string;
  whyThisRank?: string[];
  giveUp?: string[];
};

export type KnowledgeItem = {
  title: string;
  category: string;
  summary: string;
  bullets: string[];
  sourceNotes: string[];
  decisionMoment: string;
  actionLabel: string;
  actionHref: string;
};

export type KnowledgeSourceGroup = {
  title: string;
  provider: string;
  sourceType: "官方公开" | "公开查询" | "用户上传" | "用户输入";
  usage: string;
  boundary: string;
  href?: string;
};

export type ProductStage = {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
};

export type RentalLifecycleStage = {
  id: string;
  phase: string;
  title: string;
  href: string;
  icon: LucideIcon;
  moneyRisk: string;
  action: string;
  evidence: string;
  output: string;
  status: "risk" | "watch" | "ready";
};

export type MarketInsight = {
  metric: string;
  title: string;
  note: string;
  source: string;
};

export type PainPoint = {
  title: string;
  scenario: string;
  userPain: string;
  aiSolution: string;
  valueSignal: string;
  icon: LucideIcon;
};

export type CityOption = {
  city: string;
  offer: string;
  rent: string;
  commute: string;
  livingCost: string;
  savingRate: string;
  pressure: ReportStatus;
  verdict: string;
};

export type AreaOption = {
  name: string;
  city: string;
  rentRange: string;
  commute: string;
  lifeRadius: string;
  risk: string;
  fit: string;
  score: number;
  tags?: string[];
  evidence?: string[];
  commuteMinutes?: number;
  viewingPlan?: {
    level: "priority" | "backup" | "pause";
    label: string;
    reason: string;
    visitWindow: string;
    verify: string[];
    stopRule: string;
  };
};

export type ContractRiskItem = {
  title: string;
  severity: "高" | "中" | "低";
  risk: string;
  action: string;
};

export type BuyScenario = {
  label: string;
  totalPrice: string;
  downPayment: string;
  monthlyPayment: string;
  paymentRatio: string;
  cashBuffer: string;
  verdict: string;
  status: ReportStatus;
};

export const heroFeatures = [
  {
    title: "城市真实性价比",
    description: "把到手收入、房租、通勤、生活成本和储蓄率放在同一张账本里。",
    icon: Compass,
  },
  {
    title: "房源独立评估",
    description: "不卖房源，只判断候选房是否真的适合你，拆解成本、舒适度和签约风险。",
    icon: ShieldCheck,
  },
  {
    title: "签约前风险提示",
    description: "识别押金、提前退租、维修责任、转租授权等条款风险，整理确认清单。",
    icon: FileWarning,
  },
];

export const productStages: ProductStage[] = [
  {
    title: "下一步",
    subtitle: "先排序 / 再确认",
    description: "用户只需要说现在卡在哪一步，住哪儿会把今天要做的事排成清单，避免被催付款或催签约带着走。",
    icon: Workflow,
  },
  {
    title: "选房前判断",
    subtitle: "城市 / 片区 / 通勤",
    description: "把城市成本、片区筛选、通勤成本和生活配套合并判断，先排除长期住起来不合适的选择。",
    icon: Compass,
  },
  {
    title: "房源评估",
    subtitle: "截图 / 手输 / 对比",
    description: "用截图或手动输入保存房源评估，再和其他候选房一起比较真实月成本、通勤和风险。",
    icon: Sparkles,
  },
  {
    title: "签约前确认",
    subtitle: "看房 / 材料 / 付款 / 合同",
    description: "把看房清单、独居安全、合租规则、官方查询、凭据材料、付款前确认和合同确认放在同一阶段确认。",
    icon: ClipboardCheck,
  },
  {
    title: "入住与退租",
    subtitle: "预算 / 交割 / 维修 / 押金",
    description: "签完后仍要继续确认入住预算、交割确认、维修责任、续租涨价和押金退还，帮用户守住钱和凭据。",
    icon: Truck,
  },
  {
    title: "长期选择",
    subtitle: "租售取舍 / 知识库",
    description: "当用户开始考虑买房、换城市或复盘常见问题时，用买房压力和知识库继续承接。",
    icon: Landmark,
  },
];

export const marketInsights: MarketInsight[] = [
  {
    metric: "84.0%",
    title: "住房影响定居城市选择",
    note: "择城要同时比较工资、住房压力、公共资源、通勤和长期发展。",
    source: "中国青年报 2024 青年住房压力调查",
  },
  {
    metric: "64.7%",
    title: "最大租住痛点是难找合适房子",
    note: "用户需要一把能定义“适合我”的尺子。",
    source: "2024-2025 住房租赁行业发展报告相关报道",
  },
  {
    metric: "近九成",
    title: "职场人希望通勤 1 小时内",
    note: "通勤要折算成工作成本、疲劳成本和夜间安全风险。",
    source: "一线及新一线城市租房洞察报告相关报道",
  },
  {
    metric: "57.21%",
    title: "毕业生担心合同条款陷阱",
    note: "合同确认应该成为签约前的独立步骤，不能停留在知识库提醒。",
    source: "广州高校毕业生租房调研相关报道",
  },
];

export const painPoints: PainPoint[] = [
  {
    title: "风险太多，不知道先做哪一步",
    scenario: "从头到尾 / 时间紧 / 被催决定",
    userPain: "用户同时担心租金、通勤、合同、付款、押金和安全，容易陷入焦虑，最后按中介或房东节奏做决定。",
    aiSolution: "先判断当前处境和剩余时间，把先别做、必须补充材料、可以继续的事项排出确认顺序。",
    valueSignal: "把混乱选择变成按顺序确认，减少因为赶时间造成的付款和签约损失。",
    icon: Workflow,
  },
  {
    title: "薪资看着高，到手后存不下钱",
    scenario: "择城 / 换工作城市",
    userPain: "工资、房租、通勤、吃饭、社交、学习成本分散在不同地方，用户很难算清哪个城市真的更划算。",
    aiSolution: "输入城市和到手收入，自动整理真实月成本、储蓄率、通勤损耗和留城压力报告。",
    valueSignal: "避免为了名义高薪进入低储蓄、高疲劳城市。",
    icon: BriefcaseBusiness,
  },
  {
    title: "房租便宜，但每天被通勤偷走生活",
    scenario: "片区选择 / 租房",
    userPain: "用户经常只看月租，忽视最后一公里、换乘次数、雨天路线和夜间安全。",
    aiSolution: "把地图通勤、工作时段、步行距离和天气场景折算为时间成本和风险等级。",
    valueSignal: "减少长期疲劳和频繁换租。",
    icon: TrainFront,
  },
  {
    title: "白天看着方便，晚上住起来不顺手",
    scenario: "生活配套 / 周边服务",
    userPain: "用户白天看房时容易被“附近很热闹”说服，但住进去才发现买菜远、药店远、夜路暗、快递不方便或楼下夜宵噪音重。",
    aiSolution: "输入买菜、餐饮、药店、医疗、快递、洗衣、运动、夜间补给和噪音源，整理生活配套评分、短板和夜间实测清单。",
    valueSignal: "避免因为低租金或装修好看，换来每天都不顺手的长期消耗。",
    icon: MapPin,
  },
  {
    title: "截图很诱人，但真实风险看不出来",
    scenario: "候选房源评估",
    userPain: "平台截图和中介描述只展示亮点，用户难以识别潮湿、噪音、采光、维修和费用坑。",
    aiSolution: "从截图和手动信息里整理租金、面积、楼层和费用说明，再结合你的偏好列出看房前要确认的问题。",
    valueSignal: "看房前就能筛掉明显不适合的房源。",
    icon: Sparkles,
  },
  {
    title: "合同条款看不懂，押金容易被动",
    scenario: "签约前",
    userPain: "押金扣减、提前退租、维修责任、转租授权和付款周期经常说不清。",
    aiSolution: "上传合同/聊天截图，识别不合理条款并整理签约前修改建议和凭据材料。",
    valueSignal: "降低押金损失和合同纠纷概率。",
    icon: FileCheck2,
  },
  {
    title: "还没补充材料，就被催先交钱",
    scenario: "付款前 / 定金意向金",
    userPain: "用户容易在合同、授权、收款主体、退款规则没确认时先转定金、服务费或押金，付款后谈判位置立刻变弱。",
    aiSolution: "把拟付款金额、收款主体、合同状态、授权和退款条件放进付款前确认，整理待确认事项、付款备注和沟通话术。",
    valueSignal: "避免一笔转账把自己锁进高风险房源。",
    icon: BadgeDollarSign,
  },
  {
    title: "想买房，但怕月供锁死人生",
    scenario: "租售 / 买房",
    userPain: "用户很难评估买房后预算、安全垫、失业承压、生活质量和换城市流动性损失。",
    aiSolution: "做月供收入比、首付后现金缓冲、持有成本和生活质量压力测试。",
    valueSignal: "避免冲动上车和长期预算失控。",
    icon: Landmark,
  },
  {
    title: "看了很多攻略，现场还是不知道问什么",
    scenario: "实地看房",
    userPain: "通用攻略太泛，到了现场容易漏测水压、噪音、霉斑、门锁、消防和交割细节。",
    aiSolution: "根据具体房源整理个性化看房清单，支持拍照留存和问题记录。",
    valueSignal: "把经验差距转成可确认事项。",
    icon: ListChecks,
  },
  {
    title: "第一次独居，安全只能靠感觉",
    scenario: "独居 / 女生独居 / 晚归",
    userPain: "白天看房和平台照片无法判断夜间路线、门禁、楼道、电梯、快递外卖和维修上门边界。",
    aiSolution: "根据用户主动输入的房源安全条件整理独居安全评分、风险点和现场确认清单。",
    valueSignal: "避免住进去后才发现夜路、门禁和人际边界长期消耗安全感。",
    icon: ShieldCheck,
  },
  {
    title: "合租便宜，但室友边界不清",
    scenario: "合租 / 室友 / 公共空间",
    userPain: "用户只比较房间租金，入住后才发现作息、卫生、访客、费用分摊和押金责任长期扯皮。",
    aiSolution: "把合租规则拆成室友、公共空间、费用、押金和转租授权清单，整理必须问清和必须写下来的内容。",
    valueSignal: "避免低租金换来高摩擦、押金连带和频繁换租。",
    icon: UsersRound,
  },
  {
    title: "入住后漏水发霉，房东让你先垫钱",
    scenario: "入住后 / 维修责任",
    userPain: "维修责任、自然损耗、人为损坏和旧损坏边界不清，用户容易先自费维修，退租时还被重复扣押金。",
    aiSolution: "输入问题、合同条款、出租方响应和凭据情况，整理责任倾向、报修时间线、费用边界和沟通话术。",
    valueSignal: "减少维修垫付、押金扣款和长期居住干扰。",
    icon: Wrench,
  },
  {
    title: "拿钥匙太匆忙，退租时才发现没凭据",
    scenario: "交割确认 / 拿钥匙",
    userPain: "用户入住时只关注能不能住，漏掉钥匙数量、表读数、旧损坏、家具家电状态和历史欠费确认。",
    aiSolution: "把交割当天拆成钥匙门禁、表读数、旧损坏、家具家电和费用边界事项，整理确认话术和拍摄清单。",
    valueSignal: "把退租押金争议提前锁在入住第一天。",
    icon: PackageCheck,
  },
  {
    title: "租期快到，涨租和搬家都很烦",
    scenario: "续租 / 涨租 / 换房",
    userPain: "用户容易因为怕麻烦接受涨租，或因为情绪搬家却忽略中介费、搬家费、押金扣款和通勤变化。",
    aiSolution: "输入当前租金、续租报价、替代房价格、搬家成本和押金风险，整理续租上限、搬家回本月数和谈判话术。",
    valueSignal: "让用户知道什么时候该续、什么时候该谈、什么时候该搬。",
    icon: RefreshCw,
  },
];

export const cityOptions: CityOption[] = [
  {
    city: "上海",
    offer: "税后约 18,500 元/月",
    rent: "整租一居约 6,500 元",
    commute: "45 分钟内片区较贵",
    livingCost: "日常成本高，社交与餐饮支出弹性大",
    savingRate: "约 24%",
    pressure: "caution",
    verdict: "机会密度高，但住房和通勤会明显吃掉生活质量。",
  },
  {
    city: "杭州",
    offer: "税后约 16,500 元/月",
    rent: "整租一居约 4,800 元",
    commute: "35-50 分钟可选片区更多",
    livingCost: "互联网机会集中，生活成本中高",
    savingRate: "约 31%",
    pressure: "recommend",
    verdict: "收入略低但压力更均衡，适合追求发展和生活弹性的用户。",
  },
  {
    city: "成都",
    offer: "税后约 13,500 元/月",
    rent: "整租一居约 2,800 元",
    commute: "30-45 分钟片区充足",
    livingCost: "餐饮和休闲成本友好",
    savingRate: "约 38%",
    pressure: "recommend",
    verdict: "预算更轻松，但需确认行业机会和长期薪资上限。",
  },
];

export const areaOptions: AreaOption[] = [
  {
    name: "漕河泾 / 田林",
    city: "上海",
    rentRange: "4,800-6,800 元/月",
    commute: "到徐家汇 20-35 分钟",
    lifeRadius: "商超、菜场、地铁成熟",
    risk: "老小区多，需关注隔音、管道和楼道环境",
    fit: "适合预算中等、希望通勤稳定的上班族",
    score: 82,
  },
  {
    name: "南山科技园周边",
    city: "深圳",
    rentRange: "5,500-8,000 元/月",
    commute: "步行/地铁 20-45 分钟",
    lifeRadius: "工作机会密集，外卖餐饮便利",
    risk: "租金高，潮湿和采光要重点确认",
    fit: "适合高强度工作、愿意为独居和通勤付费的人",
    score: 76,
  },
  {
    name: "成都金融城南侧",
    city: "成都",
    rentRange: "2,600-4,200 元/月",
    commute: "地铁 25-40 分钟",
    lifeRadius: "生活便利，预算压力低",
    risk: "不同小区品质差异大，需看物业和夜间动线",
    fit: "适合重视生活质量和预算的人",
    score: 85,
  },
];

export const recentListings: ListingSummary[] = [
  {
    id: "L-202605-001",
    title: "南山科技园一居室",
    district: "深圳南山",
    rent: 6200,
    area: "42 平方米",
    commute: "地铁 38 分钟",
    score: 74,
    status: "caution",
    tags: ["近地铁", "真实成本偏高", "采光待确认"],
    analyzedAt: "今天 20:18",
  },
  {
    id: "L-202605-002",
    title: "徐汇万体馆合租主卧",
    district: "上海徐汇",
    rent: 4800,
    area: "18 平方米",
    commute: "骑行 + 地铁 31 分钟",
    score: 82,
    status: "recommend",
    tags: ["生活便利", "通勤稳定", "预算友好"],
    analyzedAt: "昨天 22:06",
  },
  {
    id: "L-202605-003",
    title: "望京西老小区一居",
    district: "北京朝阳",
    rent: 5100,
    area: "36 平方米",
    commute: "公交 52 分钟",
    score: 58,
    status: "reject",
    tags: ["楼龄较老", "临街噪音", "潮湿风险"],
    analyzedAt: "周三 09:42",
  },
];

export const demoReport: ReportData = {
  title: "南山科技园一居室评估报告",
  address: "深圳市南山区科兴科学园周边，步行至地铁约 11 分钟",
  status: "caution",
  conclusion:
    "这套房的位置和通勤可控，但真实月成本接近税后收入的 40%，且采光、隔音、转租授权需要重点确认。适合收入稳定、愿意为独居和通勤付费的租客；如果你希望保持 30% 以上储蓄率，建议继续比较同片区更低总成本房源。",
  score: 74,
  scores: [
    {
      label: "通勤评分",
      score: 82,
      summary: "单程预计 38 分钟，换乘压力中等，末班车风险低。",
    },
    {
      label: "预算评分",
      score: 62,
      summary: "租金加通勤和生活支出后，居住相关成本偏高。",
    },
    {
      label: "配套评分",
      score: 79,
      summary: "便利店、餐饮、健身和基础医疗可达性较好。",
    },
    {
      label: "生活配套评分",
      score: 66,
      summary: "日常餐饮便利，但大型商超、买菜和晚间步行路线需要再次确认。",
    },
    {
      label: "舒适度评分",
      score: 68,
      summary: "窗户面积偏小，需确认采光、潮湿和临街噪音。",
    },
    {
      label: "签约风险评分",
      score: 73,
      summary: "需确认二房东授权、押金退还和维修责任。",
    },
  ],
  commute: {
    title: "通勤时间",
    points: [
      "到工作地点约 8.6 公里，工作日单程通勤预计 35-45 分钟。",
      "步行至地铁口约 11 分钟，雨天和高温天体感成本会明显增加。",
      "若 19:30 后下班，末班车风险低，但出站后的夜间步行路线需要确认照明和人流。",
    ],
  },
  amenities: {
    title: "周边配套",
    points: [
      "1 公里内餐饮和便利店丰富，适合经常加班或不固定做饭的租客。",
      "大型商超距离略远，日常囤货需要骑行或外卖补足。",
      "周边写字楼密度高，工作日人流稳定，周末生活氛围相对偏安静。",
    ],
  },
  lifeRadius: {
    title: "生活配套与夜间可用性",
    points: [
      "工作日晚饭和便利店可用性较好，适合加班后快速解决基础补给。",
      "大型商超和稳定买菜点距离略远，如果经常做饭，需要实测下班后采购路线。",
      "夜间从地铁口到楼栋入口的照明、人流和外卖取餐点需要 21:00 后再走一次。",
      "楼下餐饮密集可能带来油烟、垃圾清运和夜间噪音，建议晚上关窗测试 10 分钟。",
    ],
  },
  comfort: {
    title: "天气与居住舒适度",
    points: [
      "深圳湿热季较长，低楼层或北向房间需重点确认墙角、窗边和衣柜背板。",
      "截图中窗户面积偏小，建议白天实地看房确认自然采光。",
      "如果临近主干道，夜间 22:00 后需要在室内关闭窗户测试噪音。",
    ],
  },
  livingCost: {
    title: "真实月成本",
    points: [
      "房租 6200 元接近预算上限，叠加水电燃气、网络、通勤和外卖后，月度居住相关成本预计 7200-7800 元。",
      "如果税后月收入低于 18000 元，居住成本占比可能超过 40%，会挤压储蓄、社交和职业学习预算。",
      "这套房节省的是通勤时间，牺牲的是预算弹性。适合收入稳定且把独居体验放在高优先级的租客。",
    ],
  },
  contractRisk: {
    title: "合同与签约风险提示",
    points: [
      "要求查看产权证明和房东身份证明；若为二房东，必须提供书面转租授权。",
      "押金、提前退租、维修责任、家电清单、物业水电结算方式需要逐条写入合同。",
      "不要通过私人转账支付大额定金，付款备注需写明房源地址与款项用途。",
    ],
  },
  visitChecklist: [
    "热水器、水压、排水速度是否稳定",
    "墙角、窗边、衣柜背板是否有霉斑或返潮",
    "白天采光和夜间噪音是否能接受",
    "门锁、楼道照明、消防通道是否正常",
    "宽带、燃气、物业费、水电费计价方式是否明确",
    "房东或中介是否能提供完整签约材料",
  ],
  finalAdvice:
    "建议进入候选清单，但不要当天冲动签约。若房东能补充授权材料、合同条款清晰，且实地确认无明显潮湿和噪音问题，可以作为备选；否则优先选择通勤相近但租金更低的房源。",
};

export const comparisonListings: ComparisonListing[] = [
  {
    rank: 1,
    name: "徐汇万体馆合租主卧",
    rent: "4800 元/月",
    trueMonthlyCost: "约 5600 元/月",
    trueMonthlyCostValue: 5600,
    area: "18 平方米",
    commute: "31 分钟",
    commuteMinutes: 31,
    amenities: "餐饮、菜场、地铁都近",
    risk: "recommend",
    score: 82,
    reason: "预算压力低，通勤稳定，生活便利度最高。代价是合租和私人空间较小。",
    monthlyCostDelta: "当前最低月成本",
    commuteDelta: "比最快通勤多 0 分钟/单程",
    decisionSummary: "省钱和通勤都比较稳，适合作为当前首选，但要接受合租边界。",
    whyThisRank: ["真实月成本最低", "通勤未超过常见上限", "生活配套最顺手"],
    giveUp: ["牺牲独居和储物空间", "需要把合租费用与押金边界写清"],
  },
  {
    rank: 2,
    name: "南山科技园一居室",
    rent: "6200 元/月",
    trueMonthlyCost: "约 7500 元/月",
    trueMonthlyCostValue: 7500,
    area: "42 平方米",
    commute: "38 分钟",
    commuteMinutes: 38,
    amenities: "写字楼配套强，商超稍远",
    risk: "caution",
    score: 74,
    reason: "独居体验更好，但预算压力和合同风险需要确认。",
    monthlyCostDelta: "比最低月成本多 1900 元/月",
    commuteDelta: "比最快通勤多 7 分钟/单程，每月约多 5 小时",
    decisionSummary: "用每月 1900 元换独居和面积，适合收入更稳、重视隐私的人。",
    whyThisRank: ["独居体验明显更好", "面积更大", "通勤仍可接受"],
    giveUp: ["预算压力更高", "合同和收款主体需要先确认"],
  },
  {
    rank: 3,
    name: "望京西老小区一居",
    rent: "5100 元/月",
    trueMonthlyCost: "约 6700 元/月",
    trueMonthlyCostValue: 6700,
    area: "36 平方米",
    commute: "52 分钟",
    commuteMinutes: 52,
    amenities: "社区成熟，夜间噪音偏高",
    risk: "reject",
    score: 58,
    reason: "通勤超上限且老小区潮湿、噪音风险明显，不建议作为首选。",
    monthlyCostDelta: "比最低月成本多 1100 元/月",
    commuteDelta: "比最快通勤多 21 分钟/单程，每月约多 15 小时",
    decisionSummary: "既没有明显省钱，也牺牲通勤和舒适度，除非价格大幅下降，否则应淘汰。",
    whyThisRank: ["老小区风险高", "通勤明显超上限", "噪音和潮湿需要现场确认"],
    giveUp: ["长期恢复时间", "晚归安全感", "退租时的维修和押金确定性"],
  },
];

export const contractRisks: ContractRiskItem[] = [
  {
    title: "押金扣减条件模糊",
    severity: "高",
    risk: "只写“损坏照价赔偿”，没有列明返还时间、扣减场景和验收标准。",
    action: "要求写明押金金额、返还时间、扣减情形、交割清单和双方确认方式。",
  },
  {
    title: "二房东授权缺失",
    severity: "高",
    risk: "出租人与产权人不一致，无法证明有权转租，可能导致合同效力和退租纠纷。",
    action: "查看产权证明、原租赁合同和书面转租授权，拍照留存关键页。",
  },
  {
    title: "维修责任未拆分",
    severity: "中",
    risk: "家电老化、管道堵塞、自然损耗和人为损坏没有区分，退租时容易扯皮。",
    action: "约定自然损耗由出租方负责，人为损坏由承租方负责，并列家具家电现状。",
  },
  {
    title: "提前退租代价过高",
    severity: "中",
    risk: "约定提前退租没收全部押金或必须继续支付剩余租期租金。",
    action: "争取加入提前通知期、转租配合、违约金上限等条款。",
  },
];

export const buyScenarios: BuyScenario[] = [
  {
    label: "继续租房 12 个月",
    totalPrice: "不锁定资产",
    downPayment: "保留 35 万现金",
    monthlyPayment: "约 6200 元租金",
    paymentRatio: "居住成本约 34%",
    cashBuffer: "安全垫 16 个月",
    verdict: "适合工作城市尚未稳定、未来一年可能换岗的人。",
    status: "recommend",
  },
  {
    label: "总价 280 万刚需小两居",
    totalPrice: "280 万元",
    downPayment: "首付 84 万元",
    monthlyPayment: "约 9800 元月供",
    paymentRatio: "月供收入比约 49%",
    cashBuffer: "安全垫 3-4 个月",
    verdict: "预算偏紧，任何失业或降薪都会明显冲击生活质量。",
    status: "caution",
  },
  {
    label: "总价 420 万改善房",
    totalPrice: "420 万元",
    downPayment: "首付 126 万元",
    monthlyPayment: "约 14700 元月供",
    paymentRatio: "月供收入比约 74%",
    cashBuffer: "安全垫不足 2 个月",
    verdict: "不建议当前阶段购买，会显著牺牲生活质量和职业流动性。",
    status: "reject",
  },
];

export const knowledgeItems: KnowledgeItem[] = [
  {
    title: "租房顺序清单",
    category: "下一步",
    summary: "把看房、付款、签约、入住、维修、续租和退租拆成先后顺序，避免被催着跳步骤。",
    bullets: ["先算预算", "再补充凭据", "付款前必须确认条件"],
    sourceNotes: ["基础判断规则", "用户当前阶段和凭据状态", "用户主动输入的付款压力"],
    decisionMoment: "被催决定，或不知道现在该先看房、付款还是补充材料时",
    actionLabel: "整理下一步",
    actionHref: "/plan",
  },
  {
    title: "看房清单",
    category: "现场确认",
    summary: "从门锁、采光、水压、排水、噪音到家电逐项确认。",
    bullets: ["白天和晚上各看一次", "打开所有水龙头测试 3 分钟", "拍照记录家具家电现状"],
    sourceNotes: ["用户现场观察", "用户主动拍摄的照片或视频", "房屋交割清单"],
    decisionMoment: "看房前 30 分钟，或准备再次看一套候选房时",
    actionLabel: "整理看房清单",
    actionHref: "/visit",
  },
  {
    title: "租房合同风险点",
    category: "签约",
    summary: "确认出租权、付款方式、维修责任、违约条款和退租条件。",
    bullets: ["确认房东或代理授权", "押金退还条件写清楚", "口头承诺必须进合同"],
    sourceNotes: ["市场监管总局合同示范文本", "用户粘贴的合同或补充协议", "出租方授权材料"],
    decisionMoment: "拿到合同、聊天承诺或补充协议截图后",
    actionLabel: "确认合同条款",
    actionHref: "/contract",
  },
  {
    title: "押金和提前退租注意事项",
    category: "资金安全",
    summary: "提前约定扣款边界，避免退租时被模糊条款卡住。",
    bullets: ["押一付几要和预算匹配", "违约金不宜过高", "保留转账和聊天记录"],
    sourceNotes: ["用户合同条款", "付款记录和收据", "退租交割凭据"],
    decisionMoment: "签约前确认押金、违约金和提前退租代价时",
    actionLabel: "整理押金方案",
    actionHref: "/deposit",
  },
  {
    title: "付款前确认清单",
    category: "资金安全",
    summary: "定金、意向金、押金和服务费付款前，先确认合同、授权、收款主体和退款条件。",
    bullets: ["合同授权先于付款", "收款主体必须一致", "备注写清房源地址和用途"],
    sourceNotes: ["用户合同和聊天确认", "收款主体截图", "付款备注和收据"],
    decisionMoment: "准备转定金、押金、服务费或首笔租金前",
    actionLabel: "进入付款前确认",
    actionHref: "/payment",
  },
  {
    title: "女生独居看房清单",
    category: "安全",
    summary: "关注楼道照明、门禁、快递点、夜间动线和邻里环境。",
    bullets: ["夜间实走地铁到家路线", "检查猫眼和门锁", "避免一楼临街或过暗楼栋"],
    sourceNotes: ["用户夜间现场确认", "小区门禁和物业响应", "用户主动输入的晚归场景"],
    decisionMoment: "独居、晚归、低楼层或周边不熟时",
    actionLabel: "确认独居安全",
    actionHref: "/safety",
  },
  {
    title: "独居安全确认清单",
    category: "安全",
    summary: "把夜间路线、门禁、楼道、电梯、维修上门和快递外卖边界逐项确认。",
    bullets: ["晚归时间再走一次", "确认钥匙数量和能否换锁", "外卖快递不要泄露门牌和独居信息"],
    sourceNotes: ["用户夜间路线实走", "出租方钥匙和维修上门承诺", "门禁楼道现场照片"],
    decisionMoment: "决定是否继续一套独居房前",
    actionLabel: "确认独居安全",
    actionHref: "/safety",
  },
  {
    title: "合租边界清单",
    category: "合租",
    summary: "入住前写清室友作息、清洁轮值、访客过夜、费用分摊和押金责任。",
    bullets: ["实际入住人数要确认", "访客过夜规则写进群里", "个人押金和公共区扣款分开算"],
    sourceNotes: ["用户主动输入的合租规则", "合租群文字确认", "转租授权和押金责任约定"],
    decisionMoment: "合租前谈室友规则、公共空间和押金边界时",
    actionLabel: "确认合租边界",
    actionHref: "/shared",
  },
  {
    title: "老小区风险清单",
    category: "房屋质量",
    summary: "重点看电路、管道、墙体、物业响应速度和停车占道。",
    bullets: ["查看配电箱和插座数量", "闻卫生间返味", "问清外墙和管道维修历史"],
    sourceNotes: ["用户现场确认", "物业或出租方维修记录", "交割确认照片"],
    decisionMoment: "再次看老小区、低楼层或房龄较老的房源前",
    actionLabel: "整理老小区确认清单",
    actionHref: "/visit",
  },
  {
    title: "低楼层潮湿确认清单",
    category: "舒适度",
    summary: "南方城市低楼层要特别检查返潮、霉味、采光和虫害。",
    bullets: ["摸墙角和柜背", "观察窗台凝水", "询问除湿设备和通风条件"],
    sourceNotes: ["用户现场气味和墙面检查", "天气湿度辅助判断", "旧损坏和霉斑照片"],
    decisionMoment: "南方城市、低楼层、北向或一楼临街房源看房时",
    actionLabel: "整理潮湿确认清单",
    actionHref: "/visit",
  },
  {
    title: "通勤判断方法",
    category: "效率",
    summary: "不要只看地图静态时间，要把高峰、步行、换乘、雨天、晚归和时间机会成本一起算。",
    bullets: ["分别查 8:30 与 19:00", "把步行和等车算进去", "估算每月晚归打车成本"],
    sourceNotes: ["实时路线查询", "用户手动输入的通勤时间", "晚归打车兜底成本"],
    decisionMoment: "觉得通勤还可以，但不确定长期是否扛得住时",
    actionLabel: "测算通勤真实成本",
    actionHref: "/commute",
  },
  {
    title: "生活配套确认清单",
    category: "配套",
    summary: "看周边配套要检查工作日晚上、周末和生病时是否仍然顺手。",
    bullets: ["20:30 后实走回家路线", "确认买菜、药店、快递和洗衣时间", "观察夜间噪音、油烟和垃圾清运"],
    sourceNotes: ["周边生活查询", "用户夜间实走结果", "用户主动输入的生活偏好"],
    decisionMoment: "下班后买菜、吃饭、看病、收快递是否顺手不确定时",
    actionLabel: "确认生活配套",
    actionHref: "/life",
  },
  {
    title: "官方查询入口说明",
    category: "免费信息源",
    summary: "用住建、市场监管、政务服务等公开入口确认网签备案、示范合同和租赁底线。",
    bullets: ["先查当地住房租赁备案入口", "用示范文本对照合同条款", "查不到或对方不配合时先别付款"],
    sourceNotes: ["住建或政务服务公开入口", "市场监管总局合同示范文本", "司法部公开租赁法规信息"],
    decisionMoment: "付款或签约前，需要确认出租权、备案和合同底线时",
    actionLabel: "整理官方查询步骤",
    actionHref: "/official",
  },
  {
    title: "租前凭据留存清单",
    category: "凭据材料",
    summary: "把签约前最容易缺失的照片、聊天确认、付款记录和交割记录提前列清楚。",
    bullets: ["补充出租权和转租授权", "付款备注写清房源地址和款项用途", "入住前后都保留交割视频"],
    sourceNotes: ["用户主动上传或记录的照片", "聊天确认节选", "付款记录和合同版本"],
    decisionMoment: "对方催签、催付，或口头承诺还没有文字化时",
    actionLabel: "整理凭据材料",
    actionHref: "/evidence",
  },
  {
    title: "入住首月预算清单",
    category: "预算",
    summary: "签约前把押金、首笔租金、中介费、搬家、添置和发薪前生活缓冲全部算进来。",
    bullets: ["押一付三优先谈付款周期", "服务费必须写清收费主体", "至少保留 1.5 个月安全垫"],
    sourceNotes: ["用户收入和现金余额", "合同押付结构", "搬家和添置预算"],
    decisionMoment: "签约当天付款前，担心首月现金被打穿时",
    actionLabel: "测算入住预算",
    actionHref: "/move",
  },
  {
    title: "交割确认清单",
    category: "交割",
    summary: "拿钥匙当天确认钥匙门禁、表读数、家具家电、旧损坏、历史欠费和清洁状态。",
    bullets: ["全屋连续视频不能缺", "表读数和欠费当天确认", "旧损坏要发给对方文字确认"],
    sourceNotes: ["用户现场连续视频", "表读数照片", "家具家电交割清单"],
    decisionMoment: "拿钥匙当天，或准备确认家具家电和旧损坏时",
    actionLabel: "做交割确认",
    actionHref: "/handover",
  },
  {
    title: "押金退还清单",
    category: "退租",
    summary: "退租前把通知期、交割视频、表读数、拟扣款和返还截止日全部写清楚。",
    bullets: ["扣款先要明细和依据", "退租当天拍全屋视频和表读数", "不要签放弃追偿或糊涂扣款确认"],
    sourceNotes: ["退租交割视频", "扣款明细和票据", "合同押金返还条款"],
    decisionMoment: "退租前 7 天，或对方开始提出模糊扣款时",
    actionLabel: "整理押金退还方案",
    actionHref: "/deposit",
  },
  {
    title: "维修责任确认事项",
    category: "入住后",
    summary: "漏水、发霉、家电故障和旧损坏要先报修、保存凭据、确认责任和费用。",
    bullets: ["维修前先书面报修", "区分自然损耗和人为损坏", "自费前确认报销和票据要求"],
    sourceNotes: ["用户报修记录", "维修照片和报价单", "合同维修责任条款"],
    decisionMoment: "发现漏水、发霉、门锁、家电或旧损坏问题时",
    actionLabel: "判断维修责任",
    actionHref: "/repair",
  },
  {
    title: "续租涨租谈判清单",
    category: "续租",
    summary: "租期到期前，把涨租幅度、市场替代、搬家成本、押金风险和续租条款一次算清。",
    bullets: ["先设续租上限", "同时准备替代房源", "续租必须写补充协议"],
    sourceNotes: ["当前合同和续租报价", "替代房源由用户主动输入", "搬家成本和押金风险估算"],
    decisionMoment: "房东提出涨租，或你在续租和搬家之间摇摆时",
    actionLabel: "计算续租上限",
    actionHref: "/renewal",
  },
];

export const knowledgeSourceGroups: KnowledgeSourceGroup[] = [
  {
    title: "合同示范文本与法规底线",
    provider: "市场监管总局、司法部等公开入口",
    sourceType: "官方公开",
    usage: "用于对照合同条款、租赁底线、备案和非居住空间出租风险。",
    boundary: "只作为确认入口和问题清单，不能替代官方查询结果或专业法律意见。",
    href: "/official",
  },
  {
    title: "路线、天气和周边生活",
    provider: "地图、天气等公开查询服务",
    sourceType: "公开查询",
    usage: "用于通勤路线、生活配套、天气舒适度和现场确认优先级。",
    boundary: "只在用户主动请求判断时查询；不用于抓取租房平台房源。",
    href: "/settings",
  },
  {
    title: "合同、截图、照片和聊天节选",
    provider: "用户主动上传或手动输入",
    sourceType: "用户上传",
    usage: "用于房源评估、合同确认、凭据材料、维修责任、交割和押金退还。",
    boundary: "不读取私人账号、微信、邮箱、支付账户或平台后台。",
    href: "/evidence",
  },
  {
    title: "已填写信息与常见风险",
    provider: "住哪儿 AI 居住风险清单",
    sourceType: "用户输入",
    usage: "用于地址不完整或实时查询不可用时，继续给出能照着核对的清单。",
    boundary: "会明确提示哪些内容来自用户输入，不能伪装成实时官方数据。",
    href: "/analyze",
  },
];

export const dashboardActions = [
  {
    title: "下一步",
    description: "把当前阶段、时间压力、付款风险和凭据状态整理成下一步。",
    href: "/plan",
    icon: Workflow,
  },
  {
    title: "房源记录",
    description: "聚合评估报告、待补充凭据、付款风险和签约前确认顺序。",
    href: "/case",
    icon: BriefcaseBusiness,
  },
  {
    title: "城市成本",
    description: "比较不同工作城市的收入、房租、生活成本和储蓄率。",
    href: "/city",
    icon: Compass,
  },
  {
    title: "片区筛选",
    description: "围绕工作地点，找出通勤和生活配套更合理的区域。",
    href: "/area",
    icon: Map,
  },
  {
    title: "通勤真实成本",
    description: "把通勤分钟、换乘、晚归、雨天和时间价值折算成租金取舍。",
    href: "/commute",
    icon: TrainFront,
  },
  {
    title: "生活配套",
    description: "检查买菜、吃饭、药店、快递、运动、夜间照明和噪音。",
    href: "/life",
    icon: MapPin,
  },
  {
    title: "房源评估",
    description: "上传截图或手动输入，保存独立租前风险评估。",
    href: "/analyze",
    icon: Sparkles,
  },
  {
    title: "看房清单",
    description: "按房源特征整理要测、要问、要拍和先别签约的情况。",
    href: "/visit",
    icon: ClipboardCheck,
  },
  {
    title: "独居安全",
    description: "确认夜间动线、门禁楼道、低楼层、人际边界和隐私风险。",
    href: "/safety",
    icon: ShieldCheck,
  },
  {
    title: "合租规则",
    description: "检查室友作息、清洁、访客、费用、押金和转租授权。",
    href: "/shared",
    icon: UsersRound,
  },
  {
    title: "凭据材料",
    description: "整理出租权、押金、维修、交割和聊天确认所需的凭据材料。",
    href: "/evidence",
    icon: Archive,
  },
  {
    title: "官方查询",
    description: "整理城市备案、示范合同和租赁底线的官方查询事项。",
    href: "/official",
    icon: SearchCheck,
  },
  {
    title: "付款前确认",
    description: "拦截定金、意向金、服务费、押金和收款主体不一致风险。",
    href: "/payment",
    icon: BadgeDollarSign,
  },
  {
    title: "入住预算",
    description: "测算押金、预付租金、中介费、搬家和首月安全垫。",
    href: "/move",
    icon: Truck,
  },
  {
    title: "交割确认",
    description: "确认钥匙门禁、表读数、家具家电、旧损坏和历史欠费。",
    href: "/handover",
    icon: PackageCheck,
  },
  {
    title: "维修责任判断",
    description: "判断漏水、发霉、家电故障和旧损坏该谁修、怎么保存凭据。",
    href: "/repair",
    icon: Wrench,
  },
  {
    title: "续租涨租方案",
    description: "计算涨租、搬家成本、押金风险和谈判底线。",
    href: "/renewal",
    icon: RefreshCw,
  },
  {
    title: "押金退还",
    description: "拆解退租扣款、返还期限、交割凭据和沟通话术。",
    href: "/deposit",
    icon: KeyRound,
  },
  {
    title: "多房源对比",
    description: "按真实月成本、通勤、风险和适配度放在一起比较。",
    href: "/compare",
    icon: ClipboardCheck,
  },
  {
    title: "合同确认",
    description: "确认合同、押金、授权、维修和提前退租条款。",
    href: "/contract",
    icon: Scale,
  },
  {
    title: "买房压力",
    description: "测算月供收入比、安全垫、持有成本和流动性风险。",
    href: "/buy",
    icon: Landmark,
  },
  {
    title: "知识库",
    description: "看房、押金、独居安全、老小区和官方查询清单。",
    href: "/knowledge",
    icon: BookOpenCheck,
  },
  {
    title: "个人偏好",
    description: "维护常用城市、工作地点、预算、通勤和隐私设置。",
    href: "/settings",
    icon: KeyRound,
  },
];

export const rentalLifecycleStages: RentalLifecycleStage[] = [
  {
    id: "payment",
    phase: "签约前 24 小时",
    title: "付款前确认",
    href: "/payment",
    icon: BadgeDollarSign,
    moneyRisk: "定金、意向金、服务费或押金先转，合同和授权还没确认。",
    action: "先确认收款主体、退款条件、付款备注和待补充材料。",
    evidence: "合同版本、授权证明、收据要素、聊天确认和转账备注。",
    output: "先别付款 / 小额保留 / 可继续付款",
    status: "risk",
  },
  {
    id: "move",
    phase: "签约当天",
    title: "入住预算",
    href: "/move",
    icon: Truck,
    moneyRisk: "押金、预付租金、中介费、搬家和添置支出集中发生。",
    action: "测算首笔支出、签约后剩余现金和发薪前安全垫。",
    evidence: "押付方式、月租、中介费、搬家费、添置预算和可用现金。",
    output: "现金安全垫 / 付款周期谈判 / 风险提醒",
    status: "risk",
  },
  {
    id: "handover",
    phase: "拿钥匙当天",
    title: "交割确认",
    href: "/handover",
    icon: PackageCheck,
    moneyRisk: "旧损坏、表读数、家具家电和历史欠费不确认，会变成退租扣款。",
    action: "按清单拍摄、核对、写明，并让对方确认。",
    evidence: "钥匙门禁、表读数、家具家电、墙面管道、历史欠费和清洁状态。",
    output: "交割验收结果 / 拍摄清单 / 确认话术",
    status: "watch",
  },
  {
    id: "repair",
    phase: "入住后",
    title: "维修责任",
    href: "/repair",
    icon: Wrench,
    moneyRisk: "漏水、发霉、家电故障和旧损坏容易演变成垫付或押金扣款。",
    action: "先报修、保存凭据、确认责任和费用边界，再决定是否垫付。",
    evidence: "问题照片、发现时间、合同条款、报修记录、报价和维修后复拍。",
    output: "责任倾向 / 费用边界 / 后续办法",
    status: "watch",
  },
  {
    id: "renewal",
    phase: "租期到期前",
    title: "续租涨租",
    href: "/renewal",
    icon: RefreshCw,
    moneyRisk: "怕麻烦直接接受涨租，或情绪搬家却忽略一次性成本。",
    action: "计算续租上限、搬家回本月数和谈判底线。",
    evidence: "当前租金、续租报价、替代房成本、搬家费、押金风险和通勤变化。",
    output: "续租 / 谈判 / 搬家准备",
    status: "ready",
  },
  {
    id: "deposit",
    phase: "退租前 7 天",
    title: "押金退还",
    href: "/deposit",
    icon: KeyRound,
    moneyRisk: "清洁费、维修费、违约金和水电费被混成一笔模糊扣款。",
    action: "拆分明确扣款和争议扣款，设置返还截止日。",
    evidence: "交割确认、维修记录、退租视频、表读数、合同返还条款和转账记录。",
    output: "目标退还 / 谈判底线 / 催告话术",
    status: "ready",
  },
];

export const reportSectionIcons = {
  commute: Bus,
  amenities: Building2,
  comfort: CloudSun,
  contractRisk: FileWarning,
  final: CheckCircle2,
  warning: AlertTriangle,
  money: WalletCards,
  weather: Umbrella,
  city: Compass,
  area: MapPin,
  budget: PiggyBank,
  rent: ReceiptText,
  buy: Landmark,
  contract: Scale,
  safety: ShieldAlert,
  soloSafety: ShieldCheck,
  shared: UsersRound,
  evidence: BadgeCheck,
  official: SearchCheck,
  payment: BadgeDollarSign,
  move: Truck,
  handover: PackageCheck,
  repair: Wrench,
  renewal: RefreshCw,
  deposit: KeyRound,
  calendar: CalendarClock,
  cash: HandCoins,
  calculator: Calculator,
  heart: HeartHandshake,
  banknote: Banknote,
  home: Home,
  route: Route,
  visit: ClipboardCheck,
  umbrella: Umbrella,
  plan: Workflow,
  commuteCost: TrainFront,
  lifeRadius: MapPin,
};
