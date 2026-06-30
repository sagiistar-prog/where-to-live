import { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { LockKeyhole } from "lucide-react";
import { auth } from "@/auth";
import { AccountPreferenceSync } from "@/components/account-preference-sync";
import { AppNoticeCenter } from "@/components/app-notice-center";
import { BrandMark } from "@/components/brand-mark";
import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";

async function hasSignedInAccount() {
  const session = await auth().catch(() => null);
  if (session?.user) return true;

  const cookieStore = await cookies().catch(() => null);
  return Boolean(cookieStore?.get("zhunaar_owner_id")?.value?.trim());
}

function SignInRequired() {
  return (
    <div className="min-h-screen overflow-hidden bg-[oklch(0.986_0.004_155)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandMark href="/" size="sm" />
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/">返回首页</Link>
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section className="w-full max-w-xl rounded-lg border border-border bg-card/92 p-6 text-center shadow-[0_24px_80px_oklch(var(--foreground)/0.10)] backdrop-blur-xl sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <p className="mt-5 text-sm font-medium text-primary">账号验证</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
              登录后继续使用
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              工作台、生活成本、片区筛选、房源体检、付款咨询和买房大致判断需要登录后查看。登录后可继续使用已保存的信息。
            </p>
            <Button asChild size="lg" className="mt-6 rounded-full px-6">
              <Link href="/auth?callbackUrl=%2Fdashboard">登录 / 注册</Link>
            </Button>
          </section>
        </main>
      </div>
    </div>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const signedIn = await hasSignedInAccount();

  if (!signedIn) {
    return <SignInRequired />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[oklch(0.982_0.006_155)]">
      <AccountPreferenceSync />
      <AppNoticeCenter />
      <div className="min-h-screen overflow-x-hidden">
        <TopNav />
        <div className="flex min-w-0">
          <SideNav />
          <main className="min-h-[calc(100vh-4rem)] min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
