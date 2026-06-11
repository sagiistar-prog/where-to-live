import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

type ScoreCardProps = {
  label: string;
  score: number;
  summary: string;
};

export function ScoreCard({ label, score, summary }: ScoreCardProps) {
  return (
    <Card className="min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="min-w-0 break-words text-sm font-medium text-muted-foreground">{label}</h3>
        <span className="text-2xl font-semibold">{score}</span>
      </div>
      <Progress value={score} />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{summary}</p>
    </Card>
  );
}
