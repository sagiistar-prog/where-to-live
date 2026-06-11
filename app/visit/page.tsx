import { Archive, BadgeDollarSign, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { VisitCheckPanel } from "@/components/visit-check-panel";
import { buildFlowHref } from "@/lib/flow-links";
import type { VisitCheckInput } from "@/lib/visit-check";

type SearchParams = Record<string, string | string[] | undefined>;
type VisitPageSeed = Partial<VisitCheckInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePreferences(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw
    ?.split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function VisitPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const title = firstParam(params.title);
  const city = firstParam(params.city);
  const address = firstParam(params.address);
  const floor = firstParam(params.floor);
  const preferences = firstParam(params.preferences);
  const reportContext = firstParam(params.reportContext);
  const safetyHref = buildFlowHref("/safety", {
    from: "visit",
    reportId,
    city,
    title,
    listingTitle: title,
    address,
    floor,
    preferences,
    reportContext,
    concerns: "看房后继续确认夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界。",
  });
  const sharedHref = buildFlowHref("/shared", {
    from: "visit",
    reportId,
    city,
    title,
    listingTitle: title,
    address,
    preferences,
    reportContext,
    concerns: "看房后继续确认室友作息、公共空间、访客、费用分摊、押金连带和转租授权边界。",
  });
  const evidenceHref = buildFlowHref("/evidence", {
    from: "visit",
    reportId,
    city,
    title,
    address,
    stage: "看房后，付款前",
    risks: "看房现场发现的问题、口头承诺、维修责任和房屋现状，需要在付款或签约前保存凭据。",
    reportContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "visit",
    reportId,
    city,
    listingTitle: title,
    stage: "看房后，未签合同",
    contractStatus: "看房后仍需确认合同、出租权和付款条件",
    receiptStatus: "现场承诺和房屋现状需要先保存凭据",
    notes: "来自看房清单：高优先级项目没有确认前，不建议先交定金。",
    reportContext,
  });
  const canPrefill =
    source === "report" ||
    source === "case" ||
    source === "area" ||
    source === "plan" ||
    source === "home" ||
    source === "dashboard" ||
    source === "life" ||
    source === "safety" ||
    source === "shared";
  const sourceLabel =
    source === "case"
      ? "已从房源记录带入"
      : source === "area"
        ? "已从片区筛选带入"
        : source === "plan"
          ? "已从下一步带入"
          : source === "home"
            ? "已从首页输入带入"
            : source === "dashboard"
              ? "已从工作台输入带入"
              : source === "life"
                ? "已从生活配套带入"
                : source === "safety"
                  ? "已从独居安全带入"
                  : source === "shared"
                    ? "已从合租边界带入"
                    : "已从报告带入";
  const initialInput: VisitPageSeed | undefined = canPrefill
    ? {
        reportId,
        title,
        city,
        address,
        floor,
        buildingAge: firstParam(params.buildingAge),
        orientation: firstParam(params.orientation),
        rent: firstParam(params.rent),
        commute: firstParam(params.commute),
        description: firstParam(params.description),
        reportContext,
        preferences: parsePreferences(params.preferences),
        autoGenerate: true,
        sourceLabel,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="看房现场先确认这些事"
          description="看房前先列好要测、要问、要拍的内容。也可以从评估报告带入风险点，形成现场确认清单和凭据提醒。"
          icon={ClipboardCheck}
          sideTitle="现场原则"
          sideDescription="高优先级项目没有确认前，不交定金；不能写进合同或聊天记录的承诺，先不算数。"
          facts={[
            { label: "先测", value: "水压、排水、采光、噪音、门锁和楼道" },
            { label: "再问", value: "维修责任、旧损坏、费用边界和交割方式" },
            { label: "最后", value: "把现场问题带到凭据、付款和合同页" },
          ]}
          actions={[
            { label: "独居安全", href: safetyHref, icon: ShieldCheck },
            { label: "合租边界", href: sharedHref, icon: UsersRound, variant: "secondary" },
            { label: "保存凭据", href: evidenceHref, icon: Archive, variant: "secondary" },
            { label: "付款前确认", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
          ]}
        />

        <VisitCheckPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
