import {
  ArrowRight,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock3,
  Compass,
  FileCheck2,
  Gauge,
  Home,
  KeyRound,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { StartMode } from "@/lib/start-mode-inference";

export type StartModeMeta = {
  label: string;
  shortLabel: string;
  destination: string;
  carry: string;
  next: string;
  heroPlaceholder: string;
  dashboardPlaceholder: string;
  icon: LucideIcon;
};

export const startModeMeta: Record<StartMode, StartModeMeta> = {
  city: {
    label: "选城市/比城市/换城市",
    shortLabel: "择城",
    destination: "选城市/生活成本",
    carry: "选城市、比城市、换城市时，把生活成本和offer放在同一张账里。",
    next: "输出各城offer税后月、真实结余、储蓄率、可承受租金和谈薪差额。",
    heroPlaceholder: "输入要选城市、比城市或换城市的候选项、offer、行业岗位、租金预算和通勤要求",
    dashboardPlaceholder: "输入要选/比/换的城市、税后收入或税前年包、行业岗位、租金预算和通勤要求",
    icon: CircleDollarSign,
  },
  buy: {
    label: "买房大致判断",
    shortLabel: "买房",
    destination: "买房城市与片区大致判断",
    carry: "把税后收入、首付、月供、通勤、片区和长期现金流放在一起看。",
    next: "输出可承受总价、月供压力、片区优先级和需要核验的风险点。",
    heroPlaceholder: "输入你想买房的城市、首付、月供上限和通勤需求",
    dashboardPlaceholder: "输入候选城市、首付、月供上限、工作地和目标片区",
    icon: Building2,
  },
  analyze: {
    label: "房源体检",
    shortLabel: "房源",
    destination: "房源体检报告",
    carry: "综合月租、通勤、房屋问题、信息完整度和催签压力进行评估。",
    next: "输出继续推进、补充信息或暂停决策的依据。",
    heroPlaceholder: "输入你想评估的房源情况",
    dashboardPlaceholder: "输入房源位置、月租、工作地和你担心的问题",
    icon: Home,
  },
  payment: {
    label: "付款咨询",
    shortLabel: "付款咨询",
    destination: "付款咨询",
    carry: "核对付款金额、收款主体、合同状态和退款条件。",
    next: "输出付款建议、补充材料清单和对外沟通文本。",
    heroPlaceholder: "输入你担心的合同及其他法律风险",
    dashboardPlaceholder: "输入你担心的合同及其他法律风险",
    icon: Banknote,
  },
  area: {
    label: "片区初筛",
    shortLabel: "片区",
    destination: "片区与通勤初筛",
    carry: "根据工作地、预算、通勤上限和候选片区生成优先级。",
    next: "输出优先约看片区、备选片区和暂缓片区。",
    heroPlaceholder: "输入你想比较的片区或通勤需求",
    dashboardPlaceholder: "输入工作地、预算、通勤上限和候选片区",
    icon: MapPin,
  },
  plan: {
    label: "当前行动",
    shortLabel: "计划",
    destination: "当前行动",
    carry: "根据时间压力、付款压力、合同与收款情况整理当前任务。",
    next: "输出当前行动、暂停条件和完成标准。",
    heroPlaceholder: "输入你当前需要处理的居住问题",
    dashboardPlaceholder: "输入当前最卡住的居住问题",
    icon: Gauge,
  },
  deposit: {
    label: "押金回收",
    shortLabel: "押金",
    destination: "押金回收计划",
    carry: "拆解扣款理由、争议金额、交割记录和返还期限。",
    next: "输出可争议扣款、目标退还金额和催退文本。",
    heroPlaceholder: "请输入押金退还、扣款或退租争议",
    dashboardPlaceholder: "输入押金金额、扣款理由和退租材料情况",
    icon: KeyRound,
  },
  renewal: {
    label: "续租涨租",
    shortLabel: "续租",
    destination: "续租涨租方案",
    carry: "综合当前租金、新租金、搬家成本和押金风险。",
    next: "输出续租上限、搬家回本周期和谈判方案。",
    heroPlaceholder: "请输入当前租金、新租金和续租顾虑",
    dashboardPlaceholder: "输入当前租金、新租金、搬家成本和答复期限",
    icon: ArrowRight,
  },
  repair: {
    label: "维修责任",
    shortLabel: "维修",
    destination: "维修责任判断",
    carry: "区分维修问题、责任边界、已有记录和垫付金额。",
    next: "输出责任判断、垫付条件和限时处理文本。",
    heroPlaceholder: "请输入维修问题和对方处理情况",
    dashboardPlaceholder: "输入维修问题、影响程度、沟通记录和预估费用",
    icon: Wrench,
  },
  handover: {
    label: "入住交割",
    shortLabel: "交割",
    destination: "入住交割清单",
    carry: "核对钥匙门禁、表读数、旧损坏、家具家电和历史欠费。",
    next: "输出交割确认清单和未确认事项。",
    heroPlaceholder: "请输入入住交割前需要确认的事项",
    dashboardPlaceholder: "输入钥匙、表读数、旧损坏、家具家电和费用情况",
    icon: FileCheck2,
  },
  move: {
    label: "入住现金流",
    shortLabel: "现金流",
    destination: "入住现金流测算",
    carry: "计算押付结构、首笔支出、中介费、搬家费和现金安全垫。",
    next: "输出首笔支出压力和付款周期建议。",
    heroPlaceholder: "请输入首笔支出、押付方式和现金压力",
    dashboardPlaceholder: "输入押付结构、首笔支出、中介费、搬家费和发薪时间",
    icon: Compass,
  },
  commute: {
    label: "通勤成本",
    shortLabel: "通勤",
    destination: "通勤真实成本",
    carry: "折算通勤时间、换乘、晚归打车和坏天气成本。",
    next: "输出通勤成本与租金节省之间的取舍。",
    heroPlaceholder: "请输入住址、工作地和通勤顾虑",
    dashboardPlaceholder: "输入住址、工作地、通勤时间、换乘和晚归情况",
    icon: Clock3,
  },
  life: {
    label: "生活半径",
    shortLabel: "生活",
    destination: "生活半径审查",
    carry: "评估买菜、医疗、快递、运动、夜间路线和噪音影响。",
    next: "输出日常便利度、晚归风险和生活半径结论。",
    heroPlaceholder: "请输入生活配套、晚归或长期居住需求",
    dashboardPlaceholder: "输入买菜、医疗、快递、运动、夜间路线和噪音顾虑",
    icon: Building2,
  },
  official: {
    label: "官方核验",
    shortLabel: "核验",
    destination: "官方核验清单",
    carry: "将备案、出租权、合同示范文本和收款主体引导到官方入口核验。",
    next: "输出核验事项、材料保存要求和补材料问法。",
    heroPlaceholder: "请输入需要核验的出租权、备案或合同主体问题",
    dashboardPlaceholder: "输入房源地址、出租主体、备案和收款主体疑问",
    icon: ShieldCheck,
  },
  evidence: {
    label: "材料清单",
    shortLabel: "材料",
    destination: "材料清单",
    carry: "整理截图、收据、授权材料、口头承诺和未确认事项。",
    next: "输出付款、签约和退租前需要留存的材料清单。",
    heroPlaceholder: "请输入需要整理的材料和未确认事项",
    dashboardPlaceholder: "输入已有材料、缺少材料和当前准备付款或签约的节点",
    icon: FileCheck2,
  },
  contract: {
    label: "签约风控",
    shortLabel: "合同",
    destination: "签约风控",
    carry: "基于真实合同文本和费用说明进行条款风险识别。",
    next: "输出风险条款、缺失条款和修改建议。",
    heroPlaceholder: "请输入合同条款、补充协议或签约顾虑",
    dashboardPlaceholder: "粘贴合同条款、费用说明和你担心的签约问题",
    icon: ShieldAlert,
  },
  safety: {
    label: "独居安全",
    shortLabel: "安全",
    destination: "独居安全审查",
    carry: "核验晚归路线、门禁楼道、低楼层、维修上门和隐私边界。",
    next: "输出必须先确认的安全风险。",
    heroPlaceholder: "请输入独居、晚归、门禁或维修上门顾虑",
    dashboardPlaceholder: "输入晚归路线、门禁楼道、楼层、维修上门和隐私顾虑",
    icon: ShieldCheck,
  },
  shared: {
    label: "合租边界",
    shortLabel: "合租",
    destination: "合租边界审查",
    carry: "明确室友、访客、清洁、水电、押金和转租授权边界。",
    next: "输出合租确认事项和付款前暂停条件。",
    heroPlaceholder: "请输入合租费用、室友、访客或押金边界",
    dashboardPlaceholder: "输入室友人数、费用分摊、访客规则、押金和转租授权情况",
    icon: Building2,
  },
  visit: {
    label: "看房核验",
    shortLabel: "看房",
    destination: "看房核验清单",
    carry: "将潮湿、噪音、采光、楼道、门禁和周边环境转成现场核验任务。",
    next: "输出看房问题、拍摄清单和停签信号。",
    heroPlaceholder: "请输入看房前需要现场确认的问题",
    dashboardPlaceholder: "输入房源位置、现场疑问和看房时必须确认的问题",
    icon: Search,
  },
};

export const primaryStartModes: StartMode[] = ["city", "area", "analyze", "payment", "buy"];

export const startScenarioChips: Array<{
  mode: StartMode;
  label: string;
  prompt: string;
}> = [
  {
    mode: "city",
    label: "找工作选城市",
    prompt: "我正在找工作，要选城市、比城市或换城市，想把各城offer、税后月收入、房租、通勤和储蓄空间放在一起算清楚。",
  },
  {
    mode: "buy",
    label: "买房大致判断",
    prompt: "我想判断一个城市或片区是否适合买房，重点看首付、月供、通勤、生活成本和长期压力。",
  },
  {
    mode: "analyze",
    label: "房源体检",
    prompt: "我看中了一套房，想判断租金、通勤、居住风险和签约前事项是否合理。",
  },
  {
    mode: "payment",
    label: "付款咨询",
    prompt: "对方催我付款，但合同、收款主体、退款规则和授权材料还没有确认。",
  },
  {
    mode: "area",
    label: "片区选择",
    prompt: "我想比较几个片区，重点看通勤、租金、生活配套和长期居住是否稳定。",
  },
  {
    mode: "plan",
    label: "不知道从哪开始",
    prompt: "我现在有居住选择压力，想整理当前最该确认的事项和暂停条件。",
  },
];

export function getStartModeMeta(mode: StartMode) {
  return startModeMeta[mode];
}
