export type ApiUsageItem = {
  provider: string;
  service: string;
  keyType: string;
  used: number;
  quota: number;
  period: string;
  resetAt: string;
  status: "healthy" | "watch" | "limit";
  note: string;
};
