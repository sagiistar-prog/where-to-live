export const startModes = [
  "city",
  "buy",
  "analyze",
  "payment",
  "area",
  "plan",
  "deposit",
  "renewal",
  "repair",
  "handover",
  "move",
  "commute",
  "life",
  "contract",
  "evidence",
  "official",
  "safety",
  "shared",
  "visit",
] as const;

export type StartMode = (typeof startModes)[number];

function hasMoveBudgetNeed(text: string) {
  return /押一付|押二付|押三付|首笔支出|中介费|服务费|现金安全垫|搬家费|添置|入住预算/.test(text);
}

export function inferredModeFromPrompt(text: string): StartMode | undefined {
  const hasLifeNeed = /买菜|药店|医院|诊所|超市|便利店|外卖|夜宵|快递|洗衣|健身|公园|生活配套|周边/.test(text);
  const hasSafetyNeed = /独居|女生|女孩子|晚归|夜路|门禁|楼道|电梯|低楼层|维修上门|隐私/.test(text);
  const cityPattern = "北京|上海|深圳|广州|杭州|成都|南京|苏州|武汉|重庆|西安|厦门|长沙|天津|青岛|宁波|合肥|东莞|无锡|郑州|泉州|福州|佛山|珠海|大连|济南|沈阳";
  const hasCityChoiceNeed =
    /选城市|比城市|换城|换城市|择城|去哪个城市|去哪座城市|去哪里工作|去哪工作|哪里工作|找工作.*城市|毕业.*城市/.test(text);
  const hasCityCostNeed = new RegExp(`换城市|新工作|去.*(?:${cityPattern})|offer|税后|月收入|收入|工资|薪资|年包|总包|年薪|行业|岗位|物价|生活成本|储蓄率`).test(text) || hasCityChoiceNeed;
  const hasMultiCityNeed = new RegExp(`(?:${cityPattern}).*(?:${cityPattern})`).test(text);

  if (/买房|购房|首付|月供|房贷|按揭|总价|上车|置业|学区|公积金|商业贷款/.test(text)) return "buy";
  if (/入住后|报修|维修|漏水|发霉|坏了|故障|垫付.*维修|维修.*垫付/.test(text)) return "repair";
  if (/看房|再次看房|再看|现场|潮湿|噪音|采光|楼下|周边环境/.test(text)) return "visit";
  if (/付款|定金|服务费|意向金|催.*付|先交|先付|收款.*个人|个人微信/.test(text)) return "payment";
  if (/合同|条款|补充协议|出租人|承租人|转租授权|提前退租|维修责任.*(?:写|约定)|押金.*条款/.test(text)) {
    return "contract";
  }
  if (/退租|退押金|扣押金|要回押金|押金.*(?:不退|扣|退|返|要回)|扣款确认|放弃追偿/.test(text)) return "deposit";
  if (/备案|出租权|产权|房产证|官方|住建|居住证|网签|合同主体|收款主体/.test(text)) return "official";
  if (hasMoveBudgetNeed(text)) return "move";
  if (hasCityCostNeed && (hasMultiCityNeed || /税后|月收入|收入|工资|薪资|年包|总包|年薪|岗位|行业|物价|生活成本|储蓄率|房租/.test(text))) {
    return "city";
  }
  if (
    /(片区|区域|候选|纠结|对比|选址|住哪里|住哪儿|住哪边|住哪个)/.test(text) &&
    /(预算|通勤|工作|公司|上班|地铁|附近|西丽|南山|宝安|龙华|福田|前海|浦东|徐汇|朝阳|海淀|滨江|萧山|天府|番禺)/.test(text)
  ) {
    return "area";
  }
  if (/通勤|地铁|公交|换乘|步行|晚归打车|到公司|上班路|最后一公里/.test(text)) return "commute";
  if (hasLifeNeed) return "life";
  if (hasSafetyNeed) return "safety";
  if (/合租|室友|公共空间|访客|过夜|水电分摊|押金连带|二房东/.test(text)) return "shared";
  if (/材料|留证|截图|聊天记录|收据|发票|授权材料|身份证|房产证|退款承诺|口头承诺/.test(text)) return "evidence";
  if (hasCityCostNeed || hasCityChoiceNeed) return "city";
  if (/涨租|续租|新租金|搬家回本|替代房/.test(text)) return "renewal";
  if (/交割|拿钥匙|收房|入住当天|钥匙|水电表|旧损坏|家具家电/.test(text)) return "handover";
  if (hasMoveBudgetNeed(text)) return "move";
  if (/片区|区域|候选.*区|纠结.*(?:南山|西丽|宝安|龙华|浦东|徐汇|朝阳|海淀)/.test(text)) {
    return "area";
  }
  return undefined;
}
