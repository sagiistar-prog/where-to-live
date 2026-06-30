function extractNumbers(text) {
  return Array.from(text.matchAll(/\d{2,6}/g)).map((match) => Number(match[0]));
}

function inferRent(report) {
  const text = [report.conclusion, ...report.livingCost.points].join(" ");
  const direct = text.match(/(?:房租|月租)\s*(\d{3,5})\s*元/);
  if (direct) return Number(direct[1]);

  const numbers = extractNumbers(text).filter((value) => value >= 1000 && value <= 50000);
  return numbers[0] ?? 0;
}

function inferTrueMonthlyCost(report, rent) {
  if (rent <= 0) return 0;

  const text = report.livingCost.points.join(" ");
  const numbers = extractNumbers(text).filter((value) => value >= rent && value <= 50000);
  if (!numbers.length) return Math.round(rent * 1.18);
  return Math.max(...numbers);
}

function formatMoney(value) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatMaybeMoney(value) {
  return value > 0 ? formatMoney(value) : "待确认";
}

function statusMultiplier(status) {
  if (status === "reject") return 1.2;
  if (status === "caution") return 1;
  return 0.65;
}

function ledgerValues(report) {
  const rent = inferRent(report);
  const trueMonthlyCost = inferTrueMonthlyCost(report, rent);
  const hiddenMonthlyCost = Math.max(trueMonthlyCost - rent, Math.round(rent * 0.08));
  const depositExposure = Math.round(rent * statusMultiplier(report.status));
  const prepayExposure = Math.round(depositExposure + Math.min(rent * 0.2, 1000));

  return {
    hiddenMonthlyCost: formatMaybeMoney(rent > 0 ? hiddenMonthlyCost : 0),
    prepayExposure: formatMaybeMoney(prepayExposure),
    depositExposure: formatMaybeMoney(depositExposure),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const missingRent = ledgerValues({
  status: "caution",
  conclusion: "信息还不完整，建议补充月租后再判断。",
  livingCost: {
    points: ["暂未识别到明确月租金。"],
  },
});

assert(missingRent.hiddenMonthlyCost === "待确认", "missing rent hidden cost should be pending");
assert(missingRent.prepayExposure === "待确认", "missing rent payment exposure should be pending");
assert(missingRent.depositExposure === "待确认", "missing rent deposit exposure should be pending");

const withRent = ledgerValues({
  status: "caution",
  conclusion: "月租 6800 元，真实月成本约 7600 元。",
  livingCost: {
    points: ["月租 6800 元。真实月成本约 7600 元。"],
  },
});

assert(withRent.hiddenMonthlyCost === "800 元", `unexpected hidden cost: ${withRent.hiddenMonthlyCost}`);
assert(withRent.prepayExposure !== "待确认", "known rent payment exposure should be estimated");
assert(withRent.depositExposure !== "待确认", "known rent deposit exposure should be estimated");

console.log("report ledger ok");
