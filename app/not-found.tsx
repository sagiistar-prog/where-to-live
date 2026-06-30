import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <BrandMark href="/" size="sm" />
        <section className="flex flex-1 flex-col justify-center py-16">
          <p className="text-sm font-medium text-primary">404</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            页面不存在
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            当前链接没有对应页面。可以回到工作台，继续处理城市、片区、房源、付款或买房大致判断。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                回到工作台
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
