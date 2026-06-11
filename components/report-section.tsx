import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type ReportSectionProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
};

export function ReportSection({ title, icon: Icon, children }: ReportSectionProps) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}
