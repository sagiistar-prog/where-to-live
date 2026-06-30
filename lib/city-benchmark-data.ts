import cityBenchmarkSnapshot from "@/lib/data/city-benchmarks.json";

export type CityBenchmark = (typeof cityBenchmarkSnapshot.cities)[number];

export const cityBenchmarkMetadata = {
  schemaVersion: cityBenchmarkSnapshot.schemaVersion,
  asOf: cityBenchmarkSnapshot.asOf,
  sourceSummary: cityBenchmarkSnapshot.sourceSummary,
  sources: cityBenchmarkSnapshot.sources,
};

export const cityBenchmarks = cityBenchmarkSnapshot.cities;

export const cityBenchmarkMap: Record<string, CityBenchmark> =
  Object.fromEntries(cityBenchmarks.map((city) => [city.city, city]));

export const cityBenchmarkNames = cityBenchmarks.map((city) => city.city);

export function getCityBenchmark(city: string) {
  return cityBenchmarkMap[city];
}

export function formatBenchmarkSource(city: CityBenchmark) {
  const estimate = city.estimated ? "；部分字段为估算" : "";
  return `数据截至 ${city.asOf}，来源 ${city.source.name}${estimate}`;
}

export function typicalRentFromBenchmark(city: CityBenchmark) {
  return Math.round(city.rentOneBedroomCenter * 0.38 + city.rentOneBedroomOutside * 0.62);
}

export function livingCostFromBenchmark(city: CityBenchmark) {
  return Math.round(city.mealInexpensive * 48 + city.basicUtilities + 1600);
}

export function rentRangeFromBenchmark(city: CityBenchmark, area: string) {
  const expensive = /科技园|珠江新城|金融城|车公庙|西二旗|文三|徐家汇|中山公园|望京|滨江|工业园区|软件园|高新|政务区|东部新城|松山湖|千灯湖|汉峪金谷/.test(
    area,
  );
  const remote = /莘庄|回龙观|民治|红山|西丽|萧山|番禺|宝安|未来科技城|大学城|黄岛|城阳|北仑|海沧|航空港|北客站|开发区|顺德/.test(area);
  const base = expensive
    ? city.rentOneBedroomCenter
    : remote
      ? city.rentOneBedroomOutside
      : typicalRentFromBenchmark(city);
  const low = Math.max(800, Math.round(base * 0.82 / 100) * 100);
  const high = Math.round(base * 1.25 / 100) * 100;
  return `每月${low}到${high}元`;
}
