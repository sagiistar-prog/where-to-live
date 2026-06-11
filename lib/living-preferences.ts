export const livingPreferences = [
  "独居",
  "合租",
  "养宠",
  "经常做饭",
  "必须近地铁",
  "怕吵",
  "怕潮湿",
  "接受老小区",
];

export type LivingPreference = (typeof livingPreferences)[number];
