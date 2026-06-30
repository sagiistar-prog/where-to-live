import type { ReportStatus } from "@/lib/mock-data";

export type OfficialVerificationInput = {
  title?: string;
  city?: string;
  stage?: string;
  address?: string;
  landlordType?: string;
  contractStatus?: string;
  concerns?: string;
  reportContext?: string;
};

export type OfficialSource = {
  title: string;
  provider: string;
  scope: string;
  url: string;
  note: string;
};

export type VerificationTask = {
  id: string;
  section: string;
  title: string;
  priority: "高" | "中" | "低";
  sourceName: string;
  sourceUrl?: string;
  action: string;
  userNeeds: string;
  passSignal: string;
  redFlag: string;
  proofToSave: string;
  askScript: string;
};

export type VerificationSection = {
  title: string;
  summary: string;
  tasks: VerificationTask[];
};

export type OfficialVerificationResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  status: ReportStatus;
  summary: string;
  limitation: string;
  sections: VerificationSection[];
  sources: OfficialSource[];
  warnings: string[];
  nextActions: string[];
};

const nationalSources: OfficialSource[] = [
  {
    title: "城镇房屋租赁合同（市场监管总局 2025 版）",
    provider: "国家市场监督管理总局",
    scope: "合同示范文本",
    url: "https://htsfwb.samr.gov.cn/View?id=2340996b-882d-47a4-b74d-c30784628737",
    note: "用于对照押金、维修、提前退租、费用边界、转租授权等条款。",
  },
  {
    title: "住房租赁条例公开信息",
    provider: "中华人民共和国司法部",
    scope: "租赁要求与监管规则",
    url: "https://www.moj.gov.cn/pub/sfbgwapp/bnywapp/202507/t20250721_522919.html",
    note: "用于核对实名签约、房屋安全、非居住空间不得单独出租用于居住等要求。",
  },
];

const citySources: Record<string, OfficialSource[]> = {
  上海: [
    {
      title: "住房租赁合同网签备案服务",
      provider: "上海一网通办",
      scope: "网签备案",
      url: "https://zwdt.sh.gov.cn/govPortals/bsfw/item/b1bace50-5022-408a-96c4-55b1c73cbd18",
      note: "用于办理或了解上海住房租赁合同网签备案服务。",
    },
    {
      title: "上海市住房租赁公共服务平台说明",
      provider: "上海市住房租赁公共服务平台",
    scope: "办理材料与办法",
      url: "https://zfzl.fgj.sh.gov.cn/ht_txt_show/showdoc2.html",
      note: "用于查看办理网签备案所需材料和入口说明。",
    },
  ],
  北京: [
    {
      title: "个人如何办理住房租赁合同备案",
      provider: "北京市住房和城乡建设委员会",
      scope: "合同备案",
      url: "https://www.bjsjs.gov.cn/gongkai/slh/wdzx/202604/t20260407_760727.shtml",
    note: "用于了解北京个人办理住房租赁合同备案的办法。",
    },
    {
      title: "北京市房屋租赁服务平台",
      provider: "北京市住房和城乡建设委员会",
      scope: "租赁服务入口",
      url: "https://www.bjsjs.gov.cn/gongkai/zwgkpd/ztzl/2024/fwzlfwpt/",
      note: "用于查询北京房屋租赁服务相关入口。",
    },
  ],
  深圳: [
    {
      title: "深圳市住房租赁监管服务平台操作指引",
      provider: "深圳市住房和建设局",
      scope: "登记备案",
      url: "https://zjj.sz.gov.cn/fwzlsb/LEAP/WQBA/hc_help.html",
      note: "用于了解深圳租赁合同登记备案办理方式。",
    },
    {
      title: "深圳市住房租赁监管服务平台",
      provider: "深圳市住房和建设局",
      scope: "租赁服务平台",
      url: "https://zjj.sz.gov.cn/fwzlsb/LEAP/portal/login.html",
      note: "用于进入深圳官方租赁监管服务平台。",
    },
  ],
  广州: [
    {
      title: "租户单方可办理房屋租赁备案",
      provider: "广州市人民政府门户网站",
      scope: "合同登记备案",
      url: "https://www.gz.gov.cn/zt/shb/content/post_7994422.html",
      note: "用于了解广州房屋租赁合同登记备案规则。",
    },
  ],
};

function includesAny(value = "", patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function normalizeCity(city?: string) {
  const value = city?.trim() || "目标城市";
  if (value.includes("北京")) return "北京";
  if (value.includes("深圳")) return "深圳";
  if (value.includes("广州")) return "广州";
  if (value.includes("上海")) return "上海";
  return value;
}

function task(
  id: string,
  section: string,
  title: string,
  priority: VerificationTask["priority"],
  sourceName: string,
  sourceUrl: string | undefined,
  action: string,
  userNeeds: string,
  passSignal: string,
  redFlag: string,
  proofToSave: string,
  askScript: string,
): VerificationTask {
  return {
    id,
    section,
    title,
    priority,
    sourceName,
    sourceUrl,
    action,
    userNeeds,
    passSignal,
    redFlag,
    proofToSave,
    askScript,
  };
}

function statusFromWarnings(warnings: string[]): ReportStatus {
  if (warnings.length >= 3) return "reject";
  if (warnings.length >= 1) return "caution";
  return "recommend";
}

function cityPortal(city: string) {
  return citySources[city]?.[0];
}

export function buildOfficialVerificationPlan(
  input: OfficialVerificationInput,
): OfficialVerificationResult {
  const city = normalizeCity(input.city);
  const stage = input.stage?.trim() || "签约前";
  const address = input.address?.trim() || "待确认地址";
  const context = [
    stage,
    address,
    input.landlordType ?? "",
    input.contractStatus ?? "",
    input.concerns ?? "",
    input.reportContext ?? "",
  ].join(" ");

  const hasSubleaseRisk = includesAny(context, ["二房东", "转租", "代签", "授权", "代理", "托管"]);
  const hasNoContractRisk = includesAny(context, ["没合同", "不签", "口头", "微信确认", "先付款"]);
  const hasUnsafeUseRisk = includesAny(context, [
    "隔断",
    "群租",
    "厨房",
    "卫生间",
    "阳台",
    "地下",
    "车库",
    "储藏室",
    "消防",
  ]);
  const needsPublicService = includesAny(context, ["居住证", "公积金", "学位", "积分", "备案", "发票"]);
  const hasPaymentRisk = includesAny(context, ["定金", "押金", "私人", "现金", "支付宝", "微信", "转账"]);
  const portal = cityPortal(city);
  const allSources = [...(citySources[city] ?? []), ...nationalSources];

  const identityTasks = [
    task(
      "identity-owner-chain",
      "主体与授权",
      "确认出租权和签约主体",
      "高",
      "出租人现场材料",
      undefined,
      "要求出租方提供房屋权属材料、身份证明、授权委托或转租授权，并确认合同签约主体、收款主体和房源地址一致。",
      "房源地址、出租人姓名、证件/授权材料、收款账户姓名。",
      "出租人愿意展示关键材料，且姓名、地址、收款主体能互相对应。",
      "拒绝展示权属或授权材料、只让你看模糊截图、收款人与合同主体不一致。",
      "保存权属材料或授权材料的遮敏照片、出租人证件遮敏照片、收款账户姓名截图和聊天确认记录。",
      "请把房屋权属证明、出租人身份证明和授权/委托材料给我核对一下，收款人需要和合同主体或授权收款方一致。",
    ),
  ];

  if (hasSubleaseRisk) {
    identityTasks.push(
      task(
        "sublease-permission",
        "主体与授权",
        "二房东或代理授权确认",
        "高",
        "出租人授权链",
        undefined,
        "要求查看原租赁合同中的可转租约定、业主授权书、代理委托书和授权期限，缺一项都不要急着付款。",
        "原合同关键页、授权书、委托期限、可转租或可代签文字。",
        "授权链条完整，且授权期限覆盖你的租期。",
        "授权书无法出示、授权期限短于租期、只承诺“都这样操作”。",
        "保存原租赁合同可转租条款、业主授权书或代理委托书、授权期限页和对方同意转租/代签的聊天记录。",
        "这套房如果是转租或代理，请提供原合同可转租条款、业主授权书/委托书和授权期限，我需要确认覆盖我的租期。",
      ),
    );
  }

  const filingTasks = [
    task(
      "city-filing",
      "网签备案",
      `${city}住房租赁合同备案入口`,
      "高",
      portal?.title ?? "当地政务服务网/住建部门",
      portal?.url,
      portal
        ? `进入${portal.provider}核对住房租赁合同网签备案入口、办理条件和材料。`
        : "在当地政务服务网、住建委或住房租赁服务平台搜索“住房租赁合同备案/网签备案”。",
      "房源地址、出租人身份、合同文本、双方身份信息；具体以当地入口要求为准。",
      "能找到官方备案办法，出租方愿意配合办理或解释不能办理的具体原因。",
      "出租方明确拒绝备案，或以“没必要”“办不了”为由催你先付款。",
      "保存官方入口、办理材料说明、搜索关键词或办理办法截图，以及出租方是否配合备案的书面确认。",
      `我需要确认${city}住房租赁备案办法，请配合提供办理备案所需的合同、身份和房源材料；如果不能备案，请说明具体原因。`,
    ),
    task(
      "public-service",
      "网签备案",
      "确认备案对居住证、公积金、学位等影响",
      needsPublicService ? "高" : "中",
      portal?.title ?? "当地政务服务网",
      portal?.url,
      "如果你要办居住证、提取公积金、积分落户或入学材料，先确认该房源和合同是否满足当地备案要求。",
      "你的公共服务需求、租期、房源类型、合同备案办法。",
      "备案办法和材料要求明确，出租方愿意配合。",
      "房源不能备案但你又必须用备案材料办理公共服务。",
      "保存居住证、公积金、学位等官方材料要求、房源是否满足备案条件的截图和出租方配合承诺。",
      "我后续可能需要用租赁备案办理居住证、公积金等公共服务，请确认这套房是否能配合备案并提供材料。",
    ),
  ];

  const contractTasks = [
    task(
      "model-contract",
      "合同与法规要求",
      "用示范文本对照合同条款",
      "高",
      nationalSources[0].title,
      nationalSources[0].url,
      "把合同里的押金、维修、提前退租、费用边界、家具家电交割、转租授权逐项对照示范文本。",
      "当前合同文本、押金约定、租期、付款周期、费用清单。",
      "核心条款写清金额、期限、责任边界和违约责任。",
      "只写“按实际损失扣除”“所有维修由承租人承担”等模糊或单边条款。",
      "保存正式合同全文、示范文本对照截图、押金/维修/退租/费用边界条款标注和修改确认记录。",
      "我想按官方示范文本逐项确认押金、维修、提前退租、费用边界和家具家电交割，请把合同电子版提前发我。",
    ),
    task(
      "rental-regulation",
      "合同与法规要求",
      "核对住房租赁要求",
      hasUnsafeUseRisk ? "高" : "中",
      nationalSources[1].title,
      nationalSources[1].url,
      "核对房屋是否符合居住用途、安全、消防和健康要求；非居住空间、明显隔断和群租风险要谨慎。",
      "房间用途、户型、隔断情况、消防通道、厨房卫生间和通风采光。",
      "出租空间为合法居住空间，安全和消防条件没有明显异常。",
      "地下室、车库、厨房、卫生间、阳台、过道等非居住空间被单独出租居住。",
      "保存户型和用途说明、现场照片/视频、消防通道和通风采光照片，以及对方关于非隔断/非群租的书面确认。",
      "请确认出租空间是合法居住空间，避开厨房、卫生间、阳台、地下室、车库、过道改造、违规隔断和群租风险。",
    ),
  ];

  const evidenceTasks = [
    task(
      "payment-proof",
      "付款与材料",
      "付款前确认收款主体和备注",
      hasPaymentRisk ? "高" : "中",
      "用户主动留存材料",
      undefined,
      "付款备注写清房源地址、款项用途、租期和合同主体；付款截图与合同、聊天确认一起保存。",
      "收款人姓名、账号、合同主体、房源地址、款项用途。",
      "收款人与合同主体或授权收款方一致，付款备注足够清楚。",
      "私人账户收款但无法提供授权，或要求备注成“辛苦费”“占房费”等模糊用途。",
      "保存付款前聊天确认、收款账户姓名、付款备注截图、转账记录、收据或发票，以及合同主体对应关系。",
      "付款前请确认收款账户与合同主体或授权收款方一致，并同意备注写明房源地址、款项用途、租期和合同主体。",
    ),
  ];

  const warnings = [
    hasSubleaseRisk ? "存在二房东、转租、代理或托管风险，必须补充授权链。" : "",
    hasNoContractRisk ? "出现不签合同或先付款倾向，不建议付款。" : "",
    hasUnsafeUseRisk ? "疑似非居住空间、隔断或群租风险，需要优先确认房屋用途和安全要求。" : "",
    needsPublicService ? "你可能需要备案材料办理公共服务，签约前必须确认当地办理办法。" : "",
    hasPaymentRisk ? "涉及押金、定金或私人转账，付款备注和收款主体必须确认。" : "",
  ].filter(Boolean);

  const status = statusFromWarnings(warnings);
  const highCount = [...identityTasks, ...filingTasks, ...contractTasks, ...evidenceTasks].filter(
    (entry) => entry.priority === "高",
  ).length;

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    status,
    summary: `已为${city}${stage}整理官方查询步骤，共 ${highCount} 项高优先级事项。先确认出租权、备案办理办法、合同要求和付款主体，再决定是否付款或签约。`,
    limitation:
      "本结果整理官方入口、确认事项和暂不签约的情况；所有材料仍需用户和出租方共同确认。",
    sections: [
      {
        title: "主体与授权",
        summary: "先确认谁有权出租、谁签合同、钱打给谁。",
        tasks: identityTasks,
      },
      {
        title: "网签备案",
        summary: "确认当地是否能办理备案，以及是否影响居住证、公积金和其他公共服务。",
        tasks: filingTasks,
      },
      {
        title: "合同与法规要求",
        summary: "用官方示范文本和租赁要求校准合同，避免只听口头承诺。",
        tasks: contractTasks,
      },
      {
        title: "付款与材料",
        summary: "把每笔钱和每个承诺都变成可追溯记录。",
        tasks: evidenceTasks,
      },
    ],
    sources: allSources,
    warnings: warnings.length
      ? warnings
      : ["当前未发现明显官方查询风险，但签约前仍应确认高优先级事项。"],
    nextActions: [
      "先确认主体与授权，再进入合同条款确认。",
        "打开对应城市官方入口，确认备案办理办法和材料要求。",
      "复制确认话术发给出租方，把回复、截图、链接、办理时间和对方确认同步到材料清单。",
      status === "reject" ? "关键风险点确认前不要付款或签约。" : "关键风险点确认后再进入付款和签约事项。",
    ],
  };
}
