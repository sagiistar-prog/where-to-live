import { RiskBadge } from "@/components/risk-badge";
import type { CityOption } from "@/lib/mock-data";

export function CityCostTable({ cities }: { cities: CityOption[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-4">城市</th>
              <th className="px-5 py-4">到手收入</th>
              <th className="px-5 py-4">典型租金</th>
              <th className="px-5 py-4">通勤压力</th>
              <th className="px-5 py-4">生活成本</th>
              <th className="px-5 py-4">储蓄率</th>
              <th className="px-5 py-4">压力</th>
              <th className="px-5 py-4">结论</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.city} className="border-b border-border last:border-0">
                <td className="px-5 py-5 text-base font-semibold">{city.city}</td>
                <td className="px-5 py-5 text-muted-foreground">{city.offer}</td>
                <td className="px-5 py-5 text-muted-foreground">{city.rent}</td>
                <td className="px-5 py-5 text-muted-foreground">{city.commute}</td>
                <td className="px-5 py-5 text-muted-foreground">{city.livingCost}</td>
                <td className="px-5 py-5 text-2xl font-semibold">{city.savingRate}</td>
                <td className="px-5 py-5">
                  <RiskBadge status={city.pressure} tone="generic" />
                </td>
                <td className="max-w-[280px] px-5 py-5 leading-6 text-muted-foreground">
                  {city.verdict}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
