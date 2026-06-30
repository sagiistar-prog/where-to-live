import {
  AlertTriangle,
  BadgeCheck,
  BadgeDollarSign,
  Banknote,
  Building2,
  Bus,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Compass,
  FileWarning,
  HandCoins,
  HeartHandshake,
  Home,
  KeyRound,
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
  TrainFront,
  Truck,
  Umbrella,
  UsersRound,
  WalletCards,
  Workflow,
  Wrench,
} from "lucide-react";

export type ReportStatus = "recommend" | "caution" | "reject";

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
