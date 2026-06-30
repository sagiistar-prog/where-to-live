import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zhunaar.ai"),
  title: {
    default: "住哪儿 AI | 城市、租房和买房判断助手",
    template: "%s | 住哪儿 AI",
  },
  description: "面向年轻人的居住决策工具，把城市、收入、租金、通勤、房源、付款和买房大致判断放在同一次判断里。",
  applicationName: "住哪儿 AI",
  keywords: ["住哪儿", "城市选择", "租房判断", "买房大致判断", "生活成本", "通勤"],
  icons: {
    icon: "/brand/zhunaar-icon.svg",
    shortcut: "/brand/zhunaar-icon.svg",
    apple: "/brand/zhunaar-icon.svg",
  },
  openGraph: {
    title: "住哪儿 AI",
    description: "城市、租房、付款和买房大致判断的居住决策工具。",
    type: "website",
    locale: "zh_CN",
    siteName: "住哪儿 AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
