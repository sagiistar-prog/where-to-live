import type { ReportStatus } from "@/lib/mock-data";

export type VisitCheckInput = {
  title?: string;
  city?: string;
  address?: string;
  floor?: string;
  buildingAge?: string;
  orientation?: string;
  rent?: string;
  commute?: string;
  description?: string;
  reportContext?: string;
  preferences?: string[];
};

export type VisitCheckItem = {
  id: string;
  category: string;
  title: string;
  priority: "高" | "中" | "低";
  timing: string;
  method: string;
  passCriteria: string;
  evidence: string;
};

export type VisitCheckSection = {
  title: string;
  summary: string;
  items: VisitCheckItem[];
};

export type VisitCheckResult = {
  mode: "local";
  generatedAt: string;
  title: string;
  summary: string;
  status: ReportStatus;
  estimatedMinutes: number;
  sections: VisitCheckSection[];
  questions: string[];
  evidencePack: string[];
  stopSignals: string[];
  nextSteps: string[];
};

function includesAny(value = "", patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function priorityScore(priority: VisitCheckItem["priority"]) {
  if (priority === "高") return 3;
  if (priority === "中") return 2;
  return 1;
}

function item(
  id: string,
  category: string,
  title: string,
  priority: VisitCheckItem["priority"],
  timing: string,
  method: string,
  passCriteria: string,
  evidence: string,
): VisitCheckItem {
  return { id, category, title, priority, timing, method, passCriteria, evidence };
}

export function buildVisitChecklist(input: VisitCheckInput): VisitCheckResult {
  const title = input.title?.trim() || "候选房源看房清单";
  const city = input.city?.trim() || "目标城市";
  const description = `${input.description ?? ""} ${input.floor ?? ""} ${
    input.buildingAge ?? ""
  } ${input.orientation ?? ""} ${input.reportContext ?? ""}`;
  const preferences = input.preferences ?? [];
  const isLowFloor = includesAny(description, ["1层", "一楼", "低楼层", "2层", "二楼"]);
  const isNorth = includesAny(description, ["北向", "朝北"]);
  const nearNoise = includesAny(description, ["临街", "高架", "主干道", "商铺", "夜市", "酒吧"]);
  const afraidMoist = preferences.includes("怕潮湿") || isLowFloor || isNorth;
  const mustMetro = preferences.includes("必须近地铁");
  const solo = preferences.includes("独居");
  const pet = preferences.includes("养宠");
  const cook = preferences.includes("经常做饭");
  const lifeRadiusConcern = includesAny(description, [
    "生活配套",
    "买菜",
    "菜场",
    "商超",
    "便利店",
    "餐饮",
    "药店",
    "医疗",
    "医院",
    "快递",
    "外卖",
    "夜路",
    "夜间",
    "照明",
    "噪音",
    "油烟",
    "垃圾清运",
    "烧烤",
  ]);
  const areaContext = includesAny(description, [
    "片区筛选",
    "看房安排",
    "先不约看的情况",
    "现场确认",
    "优先约看",
    "可以备选",
    "先不约看",
  ]);

  const houseQuality = [
    item(
      "water-pressure",
      "房屋质量",
      "水压与排水",
      "高",
      "进门 10 分钟内",
      "厨房、卫生间、洗手池同时放水 3 分钟，再观察地漏和马桶排水速度。",
      "水流稳定、无明显返味、排水不积水，马桶冲水后恢复正常。",
      "拍摄连续放水视频，记录地漏和马桶状态。",
    ),
    item(
      "electricity",
      "房屋质量",
      "电路与插座",
      "高",
      "看房中段",
      "检查配电箱、空调插座、厨房大功率电器插座，确认是否有烧黑、松动和私拉线。",
      "配电箱标识清晰，大功率插座独立可用，无裸露线和异常发热。",
      "拍配电箱、主要插座和电表读数。",
    ),
    item(
      "windows-doors",
      "房屋质量",
      "门窗密封与门锁",
      "中",
      "离开前",
      "开关所有窗户和入户门，检查门锁、猫眼、窗锁、纱窗和密封条。",
      "门锁顺畅，窗户能锁紧，雨天不易渗水，猫眼和防盗链可用。",
      "拍门锁、窗锁、窗边墙面和入户门内侧。",
    ),
  ];

  if (afraidMoist) {
    houseQuality.unshift(
      item(
        "moisture",
        "房屋质量",
        "潮湿与霉斑",
        "高",
        "白天看房时",
        "摸墙角、窗边、床头背后、衣柜背板和卫生间外墙，闻是否有霉味。",
        "墙面干燥、无黑点、无鼓包、柜背无霉味。",
        "拍墙角、柜背、窗台和卫生间外墙近景。",
      ),
    );
  }

  const comfort = [
    item(
      "daylight",
      "居住舒适度",
      "采光与通风",
      isNorth ? "高" : "中",
      "白天",
      "关闭室内灯，观察客厅、卧室自然光；打开两侧窗户测试空气流动。",
      "白天不用开灯也能正常阅读，通风 5 分钟后异味下降。",
      "拍同一房间关灯状态和窗外遮挡。",
    ),
    item(
      "noise",
      "居住舒适度",
      "临街与邻里噪音",
      nearNoise || preferences.includes("怕吵") ? "高" : "中",
      "晚上 20:00 后再看一次",
      "关窗静听 3 分钟，再开窗听 3 分钟，留意电梯、楼道、楼上脚步和街面声音。",
      "关窗后能接受，卧室不受持续低频噪音影响。",
      "录制 30 秒室内环境音，备注时间和窗户状态。",
    ),
    item(
      "temperature",
      "居住舒适度",
      "空调、热水与异味",
      "中",
      "看房中段",
      "打开空调、热水器和油烟机，确认启动速度、噪音、排风和热水稳定性。",
      "空调无异响，热水 1 分钟内稳定，厨房和卫生间无明显返味。",
      "拍设备品牌、使用年限标签和运行状态。",
    ),
  ];

  const safety = [
    item(
      "route-night",
      "安全与动线",
      "夜间最后一公里",
      solo ? "高" : "中",
      "晚上再看一次",
      "从地铁/公交站走到小区，观察照明、人流、盲区、门禁和快递点位置。",
      "路线照明连续，有稳定人流，进小区和上楼不需要穿过明显盲区。",
      "拍楼栋入口、门禁、楼道照明和站点到小区路线。",
    ),
    item(
      "building-safety",
      "安全与动线",
      "楼道、消防和门禁",
      "高",
      "进楼时",
      "检查楼道灯、消防通道、灭火器、电动车占道、门禁和电梯监控。",
      "消防通道不被堵，门禁正常，楼道灯可用，无大量杂物堆放。",
      "拍消防通道、门禁、电梯和楼道。",
    ),
  ];

  const contract = [
    item(
      "authority",
      "签约材料",
      "出租权与转租授权",
      "高",
      "谈价格前",
      "要求查看产权证明、房东身份证明；如为代理人，必须看书面授权或原租赁合同转租条款。",
      "出租人与产权或授权链条一致，签约主体清晰。",
      "拍授权材料关键页，遮挡身份证敏感号码后留存。",
    ),
    item(
      "fees",
      "签约材料",
      "费用边界",
      "高",
      "决定前",
      "逐项确认租金、押金、付款周期、水电燃气、物业、网络、维修、中介费和退租结算。",
      "所有费用和退还条件可写进合同，不依赖口头承诺。",
      "把费用清单写进聊天记录，让对方文字确认。",
    ),
    item(
      "handover",
      "签约材料",
      "家具家电交割",
      "中",
      "签约前",
      "逐件列出家具家电、现有损坏、钥匙门禁数量和水电燃气表读数。",
      "交割清单双方确认，旧损坏不计入退租扣款。",
      "拍全屋视频、家电铭牌、表读数和已有损坏。",
    ),
  ];

  if (mustMetro) {
    safety.unshift(
      item(
        "metro-real",
        "安全与动线",
        "地铁步行真实时间",
        "高",
        "到达和离开各测一次",
        "从地铁闸机口步行到楼栋门，记录实际分钟数和红绿灯、天桥、地下通道。",
        "实际步行时间不超过你能接受的上限，雨天路线可替代。",
        "截图运动记录或地图轨迹，拍关键路口。",
      ),
    );
  }

  if (cook) {
    houseQuality.push(
      item(
        "kitchen",
        "房屋质量",
        "厨房做饭可用性",
        "中",
        "看房中段",
        "检查燃气、灶台、油烟机、排烟方向、台面空间、冰箱位置和下水返味。",
        "油烟机排风有效，燃气可正常开户或过户，台面和插座够用。",
        "拍厨房全景、燃气表、油烟机和下水位置。",
      ),
    );
  }

  if (pet) {
    contract.push(
      item(
        "pet-clause",
        "签约材料",
        "宠物条款",
        "高",
        "签约前",
        "确认是否允许养宠、是否额外押金、损坏赔付边界、邻里投诉解决方式。",
        "宠物许可和押金边界写进合同或补充协议。",
        "保留房东文字确认，不接受只口头同意。",
      ),
    );
  }

  const lifeRadiusItems = lifeRadiusConcern
    ? [
        item(
          "life-grocery-dinner",
          "生活配套",
          "下班后买菜与晚饭路线",
          cook || includesAny(description, ["买菜", "菜场", "做饭", "商超"]) ? "高" : "中",
          "工作日 19:30 后",
          "从楼栋门口走到最近超市/菜场/便利店，再走回楼栋，记录实际时间、路灯、红绿灯和营业状态。",
          "15 分钟生活配套内至少有一种稳定晚饭方案，且下班后仍可用。",
          "拍路线关键位置、店铺营业时间、价格和回楼栋入口。",
        ),
        item(
          "life-pharmacy-medical",
          "生活配套",
          "药店与应急医疗",
          includesAny(description, ["药店", "医疗", "医院", "生病"]) ? "高" : "中",
          "看房前后均可确认",
          "搜索或步行确认最近药店、社区卫生服务或急诊路线，重点看夜间是否可用。",
          "药店可步行或短途骑行到达，生病时不需要临时重新找路线。",
          "保存地图截图，拍药店营业时间或门头。",
        ),
        item(
          "life-parcel-privacy",
          "生活配套",
          "快递外卖与隐私边界",
          solo ? "高" : "中",
          "晚上再看一次",
          "确认快递柜、外卖取餐点、垃圾点和楼栋入口的相对位置，观察是否容易泄露门牌和独居信息。",
          "取件、取餐、倒垃圾不需要穿过昏暗盲区，也不会长期泄露具体门牌。",
          "拍取件点、外卖放置点、垃圾点和楼栋入口。",
        ),
        item(
          "life-night-supply",
          "生活配套",
          "夜间补给与照明",
          includesAny(description, ["夜路", "夜间", "照明", "便利店", "晚归"]) || solo ? "高" : "中",
          "21:00 后",
          "从站点、便利店、快递点走回楼栋，观察连续照明、人流、盲区和打车落点。",
          "夜间路线明亮、可解释、可重复，不依赖临时运气或绕远。",
          "拍路线视频或照片，记录时间和人流状态。",
        ),
        item(
          "life-noise-smell",
          "生活配套",
          "夜间噪音、油烟和垃圾清运",
          includesAny(description, ["噪音", "油烟", "垃圾", "烧烤", "主干道", "临街"]) ? "高" : "中",
          "晚上和清晨各一次",
          "在卧室关窗静听 3 分钟，再开窗听 3 分钟；观察楼下餐饮、垃圾站、主干道和清运时间。",
          "关窗后卧室可接受，没有持续低频噪音、油烟倒灌或清晨垃圾清运强干扰。",
          "录制室内外 30 秒环境音，拍楼下噪音/气味源位置。",
        ),
      ]
    : [];

  const areaContextItems = areaContext
    ? [
        item(
          "area-commute-replay",
          "片区到房源验证",
          "复跑片区通勤承诺",
          "高",
          "工作日晚高峰",
          "按片区筛选里的通勤路线，从工作地点或主要站点实际走到楼栋门口，记录换乘、等车、出站和最后一公里。",
          "实际通勤没有超过你的上限，且不依赖小概率顺风车、临时绕路或过长步行。",
          "保存地图轨迹、出发到进楼的时间截图，以及关键换乘/出站照片。",
        ),
        item(
          "area-night-route",
          "片区到房源验证",
          "验证夜间最后一公里",
          solo ? "高" : "中",
          "21:00 后",
          "从地铁口、公交站、便利店或打车落点走回楼栋，观察照明、人流、盲区、门禁和快递外卖停留点。",
          "路线连续明亮，有稳定人流，进入小区和楼栋不需要穿过明显盲区。",
          "拍站点到楼栋的连续路线照片或短视频，标注时间。",
        ),
        item(
          "area-life-radius-proof",
          "片区到房源验证",
          "确认生活配套是否真的可用",
          cook || lifeRadiusConcern ? "高" : "中",
          "下班后或周末",
          "从楼栋出发步行到菜场、超市、药店、快递柜和常用餐饮，确认营业时间、价格、路线和雨天可替代方案。",
      "15 分钟内至少有一个稳定晚饭/买菜方案，生病、晚归和收快递都有可行安排。",
          "拍店铺营业时间、价格、路线位置和楼栋入口。",
        ),
        item(
          "area-stop-rule",
          "片区到房源验证",
          "确认是否还值得约看",
          "高",
          "看房结束前",
          "对照片区筛选给出的放弃条件，逐项判断通勤、租金、夜路、楼龄和生活配套是否有一项已经明显不达标。",
          "如果任一核心条件失败，就把该片区列为备选或暂不考虑，不继续被单套房源的装修干扰判断。",
          "把失败项截图、照片或文字记录保存到房源评估备注里。",
        ),
      ]
    : [];

  const sections = [
    ...(areaContextItems.length
      ? [
          {
            title: "片区到房源验证",
            summary: "先验证片区筛选承诺是否在这套具体房源上成立，再看房屋内部。",
            items: areaContextItems,
          },
        ]
      : []),
    {
      title: "房屋质量",
      summary: "先检查会直接影响居住和退租扣款的硬件问题。",
      items: houseQuality,
    },
    {
      title: "居住舒适度",
      summary: "把采光、噪音、通风和湿热问题在签约前看清。",
      items: comfort,
    },
    {
      title: "安全与动线",
      summary: "独居、夜归、通勤和最后一公里都要现场走一遍。",
      items: safety,
    },
    ...(lifeRadiusItems.length
      ? [
          {
            title: "生活配套",
            summary: "把报告里的买菜、医疗、快递、夜路和噪音短板转成现场实测。",
            items: lifeRadiusItems,
          },
        ]
      : []),
    {
      title: "签约材料",
      summary: "任何现金风险都要落到材料、合同和文字确认。",
      items: contract,
    },
  ];

  const allItems = sections.flatMap((section) => section.items);
  const highCount = allItems.filter((check) => check.priority === "高").length;
  const score = allItems.reduce((sum, check) => sum + priorityScore(check.priority), 0);
  const status: ReportStatus = highCount >= 8 ? "caution" : "recommend";

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    title,
    summary: `已为 ${city} 的候选房源整理 ${allItems.length} 项现场确认事项，其中 ${highCount} 项为高优先级。建议预留 ${Math.max(
      35,
      Math.min(75, score * 4),
    )} 分钟完成。`,
    status,
    estimatedMinutes: Math.max(35, Math.min(75, score * 4)),
    sections,
    questions: [
      "这套房是谁出租？签约主体和收款账户是否一致？",
      "押金什么时候退？哪些情况会扣？扣款是否需要双方确认？",
      "自然损耗、家电老化、管道堵塞分别由谁负责？",
      "提前退租是否允许转租？违约金上限是多少？",
      "水电燃气、物业、网络、中介费、保洁费是否还有额外项目？",
      input.commute ? `你说的通勤 ${input.commute} 是哪个时间段测的？` : "工作日早高峰和晚高峰通勤分别多久？",
      areaContext ? "这套房是否仍满足片区筛选里的继续约看条件？如果不满足，是通勤、夜路、生活配套还是租金出了问题？" : "",
      lifeRadiusConcern ? "报告提到的生活配套短板，房东或中介是否能给出稳定替代方案？" : "周边买菜、药店、快递、晚归路线是否能在晚上实际确认？",
    ].filter(Boolean),
    evidencePack: [
      "全屋从门口开始的连续视频。",
      "水电燃气表读数和费用单价截图。",
      "墙角、柜背、窗台、卫生间外墙近景。",
      "授权材料、费用清单、押金退还条件的文字确认。",
      "地铁或公交站到楼栋的夜间路线照片。",
      ...(areaContext ? ["片区筛选结果的现场确认记录，包含通勤、夜路、生活配套和租金是否仍达标。"] : []),
      ...(lifeRadiusConcern ? ["买菜、药店、快递、夜间照明和噪音源的现场照片或录音。"] : []),
    ],
    stopSignals: [
      "出租人无法证明出租权或转租授权。",
      "押金、维修、提前退租只能口头承诺，不愿写进合同。",
      "低楼层或北向房存在明显霉味、墙面鼓包、柜背霉斑。",
      "楼道消防堵塞、门禁失效、夜间路线有明显安全盲区。",
      "要求当天大额定金，且收款账户与签约主体不一致。",
      ...(areaContext ? ["片区筛选的核心条件在这套房上失败，但中介只强调装修、低价或名额紧张来催决定。"] : []),
      ...(lifeRadiusConcern ? ["报告中的买菜、医疗、夜路或噪音短板现场验证失败，且对方无法给出可写下来的解决方案。"] : []),
    ],
    nextSteps: [
      "先确认所有高优先级项目，再谈价格和定金。",
      "把未通过项目带回房源评估报告，更新最终建议。",
      ...(areaContext ? ["如果片区关键条件不达标，回到片区筛选把该片区列为先不约看，不继续在同一区域密集看房。"] : []),
      "签约前把授权、押金、维修、退租和交割清单写进合同或补充协议。",
    ],
  };
}
