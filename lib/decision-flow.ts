export type DecisionFlowLink = {
  label: string;
  href: string;
  reason: string;
};

export type DecisionFlowStage = {
  id: string;
  label: string;
  title: string;
  situation: string;
  decision: string;
  priority: "尽快确认" | "补充材料" | "可以继续";
  primaryCta: string;
  primaryHref: string;
  pauseWhen: string[];
  evidence: string[];
  nextLinks: DecisionFlowLink[];
};

export const decisionFlowStages: DecisionFlowStage[] = [
  {
    id: "before-viewing",
    label: "看房前",
    title: "先判断这套房值不值得去看",
    situation: "你已经拿到截图或文字信息，但还没去现场，最怕白跑、被亮点描述带偏。",
    decision: "先做房源评估，再把通勤、生活配套、潮湿噪音和安全疑点变成现场确认清单。",
    priority: "可以继续",
    primaryCta: "评估房源",
    primaryHref: "/analyze",
    pauseWhen: [
      "地址、租金、面积、楼层或付款周期缺失太多。",
      "通勤明显超过上限，但房租优势不足以抵消时间成本。",
      "平台截图只展示室内局部，没有楼栋、楼道、窗外和卫生间信息。",
    ],
    evidence: [
      "房源截图或手动填写信息",
      "工作地点和通勤上限",
      "预算区间和不可接受条件",
    ],
    nextLinks: [
      { label: "片区筛选", href: "/area", reason: "还没确定该看哪个片区" },
      { label: "通勤成本", href: "/commute", reason: "房租便宜但通勤不确定" },
      { label: "生活配套", href: "/life", reason: "担心买菜、医疗、快递和夜路不方便" },
    ],
  },
  {
    id: "after-viewing",
    label: "看房后",
    title: "把现场感觉变成签约前凭据",
    situation: "你看过房，可能觉得还行，但还没把口头承诺、旧损坏和付款条件写清楚。",
    decision: "补充看房确认和凭据材料，再决定是否进入付款前确认。",
    priority: "补充材料",
    primaryCta: "整理看房清单",
    primaryHref: "/visit",
    pauseWhen: [
      "水压、排水、电路、门窗、噪音或潮湿没有现场测试。",
      "对方只口头解释维修、押金、家具家电或转租授权。",
      "你还没确认收款主体、退款条件和合同版本。",
    ],
    evidence: [
      "全屋视频和问题近景",
      "出租权或转租授权材料",
      "押金、付款周期和口头承诺聊天确认",
    ],
    nextLinks: [
      { label: "凭据材料", href: "/evidence", reason: "把现场照片和聊天确认整理成凭据材料" },
      { label: "官方查询", href: "/official", reason: "确认备案、示范合同和出租权底线" },
      { label: "付款前确认", href: "/payment", reason: "对方催定金或押金时先确认付款条件" },
    ],
  },
  {
    id: "paying",
    label: "被催付款",
    title: "先保住谈判位置，再考虑转账",
    situation: "对方催定金、意向金、服务费或押金，但合同、授权、退款条件可能还没完成。",
    decision: "材料不齐时先别付款；可小额留位也必须写清用途、退款条件和收款主体。",
    priority: "尽快确认",
    primaryCta: "进入付款前确认",
    primaryHref: "/payment",
    pauseWhen: [
      "未看到合同版本、产权或转租授权。",
      "收款人与合同主体不一致，或只让转私人账户。",
      "定金、意向金、订金、服务费和押金的退款条件说不清。",
    ],
    evidence: [
      "合同版本和出租授权",
      "收款主体身份和账户",
      "付款备注、收据要素和退款约定",
    ],
    nextLinks: [
      { label: "官方查询", href: "/official", reason: "先确认公开入口和出租权底线" },
      { label: "凭据材料", href: "/evidence", reason: "补充付款前必须保存的凭据" },
      { label: "合同确认", href: "/contract", reason: "粘贴真实合同条款再确认" },
    ],
  },
  {
    id: "handover",
    label: "拿钥匙",
    title: "把入住第一天变成退租凭据起点",
    situation: "你准备拿钥匙入住，最容易漏掉钥匙门禁、表读数、旧损坏和历史欠费。",
    decision: "交割还没确认前不要只靠口头说定；先拍、再写、再确认。",
    priority: "补充材料",
    primaryCta: "做交割确认",
    primaryHref: "/handover",
    pauseWhen: [
      "钥匙、门禁、电梯卡、备用钥匙数量不清。",
      "水电燃气表读数和历史欠费没有拍照确认。",
      "旧损坏、家具家电状态和清洁状态没有文字确认。",
    ],
    evidence: [
      "全屋连续视频",
      "表读数和缴费账户截图",
      "钥匙门禁清单与旧损坏确认",
    ],
    nextLinks: [
      { label: "凭据材料", href: "/evidence", reason: "同步交割照片和确认记录" },
      { label: "维修责任", href: "/repair", reason: "发现漏水、发霉或家电故障时确认责任" },
      { label: "押金退还", href: "/deposit", reason: "退租前反向引用交割记录" },
    ],
  },
  {
    id: "living",
    label: "入住后",
    title: "维修责任要在问题出现当天固定",
    situation: "漏水、发霉、家电故障或旧损坏出现后，拖到退租时通常会变成押金扣款。",
    decision: "先报修、保存凭据、确认责任和费用边界，再决定是否垫付维修。",
    priority: "尽快确认",
    primaryCta: "判断维修责任",
    primaryHref: "/repair",
    pauseWhen: [
      "合同把所有维修概括性压给承租人。",
      "出租方让你先垫钱，但没有确认报销金额和票据要求。",
      "问题影响安全、漏水扩大或可能造成楼下损失。",
    ],
    evidence: [
      "问题连续视频和近景照片",
      "首次发现和首次报修时间线",
      "维修报价、票据和维修后复拍",
    ],
    nextLinks: [
      { label: "凭据材料", href: "/evidence", reason: "保存报修和维修过程" },
      { label: "押金退还", href: "/deposit", reason: "维修争议可能演变成扣款" },
      { label: "合同确认", href: "/contract", reason: "维修条款不清时补充协议" },
    ],
  },
  {
    id: "move-out",
    label: "续租退租",
    title: "涨租、搬家和押金要一起算",
    situation: "租期快到，被涨租或准备搬家，怕麻烦和怕损失押金同时压上来。",
    decision: "先算续租上限和搬家回本月数，再决定谈、续、搬还是退。",
    priority: "补充材料",
    primaryCta: "整理续租方案",
    primaryHref: "/renewal",
    pauseWhen: [
      "涨租幅度超过预算上限，但你还没有替代房锚点。",
      "退租通知期快过了，继续犹豫会触发违约金。",
      "押金扣款、维修责任或旧损坏凭据还没整理。",
    ],
    evidence: [
      "当前租金和拟续租报价",
      "同片区替代房截图和通勤差异",
      "交割确认、维修记录和退租通知记录",
    ],
    nextLinks: [
      { label: "押金退还", href: "/deposit", reason: "准备搬家或退租时先测扣款" },
      { label: "多房源对比", href: "/compare", reason: "把当前房和替代房放到同一张表" },
      { label: "合同确认", href: "/contract", reason: "决定续租时确认补充协议" },
    ],
  },
  {
    id: "buying",
    label: "租售选择",
    title: "买房前先做预算压力测试",
    situation: "你开始考虑买房，但不知道月供、安全垫、通勤和流动性会不会压垮生活。",
    decision: "不预测房价，先判断买后预算、储蓄率、失业缓冲和换城市弹性。",
    priority: "可以继续",
    primaryCta: "测试买房压力",
    primaryHref: "/buy",
    pauseWhen: [
      "首付后现金安全垫不足 6 个月支出。",
      "月供收入比明显高于可承受线。",
      "工作城市、收入或家庭计划仍不稳定。",
    ],
    evidence: [
      "家庭税后收入和固定支出",
      "可用现金、首付和贷款方案",
      "通勤变化、物业维修和降薪情景",
    ],
    nextLinks: [
      { label: "城市账本", href: "/city", reason: "先比较城市真实生活成本" },
      { label: "通勤成本", href: "/commute", reason: "买房后通勤可能长期锁定" },
      { label: "知识库", href: "/knowledge", reason: "补充租售选择常识" },
    ],
  },
];
