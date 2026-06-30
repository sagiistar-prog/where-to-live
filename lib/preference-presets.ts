import type { UserPreferences } from "@/lib/user-preferences";

export type PreferencePreset = {
  label: string;
  description: string;
  values: Partial<UserPreferences>;
};

export const preferencePresets: PreferencePreset[] = [
  {
    label: "一线城市通勤优先",
    description: "适合刚拿到 offer、准备在核心办公区附近租房的人。",
    values: {
      defaultCity: "深圳",
      defaultWorkplace: "南山科技园",
      monthlyIncome: "18000",
      fixedCost: "3500",
      budgetMin: "4500",
      budgetMax: "6800",
      commuteLimit: "45 分钟",
      livingPreferences: ["独居", "必须近地铁", "晚归"],
    },
  },
  {
    label: "预算优先租房",
    description: "适合收入稳定、希望控制租金和固定支出的人。",
    values: {
      defaultCity: "上海",
      defaultWorkplace: "静安寺",
      monthlyIncome: "16000",
      fixedCost: "3200",
      budgetMin: "3800",
      budgetMax: "5500",
      commuteLimit: "55 分钟",
      livingPreferences: ["预算敏感", "必须近地铁", "怕噪音"],
    },
  },
  {
    label: "买房前压力测试",
    description: "适合已经考虑首付、月供和长期现金流的人。",
    values: {
      defaultCity: "杭州",
      defaultWorkplace: "未来科技城",
      monthlyIncome: "22000",
      fixedCost: "4500",
      budgetMin: "4500",
      budgetMax: "6500",
      commuteLimit: "50 分钟",
      livingPreferences: ["通勤稳定", "生活配套", "长期居住"],
    },
  },
];

