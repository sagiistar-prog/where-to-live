import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "住哪儿 AI | 城市与居住成本判断助手",
  description: "帮年轻人快速看清一座城市的收入、物价、生活成本、通勤和居住压力，再决定住哪儿。",
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
