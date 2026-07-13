import { Badge } from "@/components/ui/badge";

export function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 75 ? "success" : score >= 50 ? "accent" : score >= 25 ? "warning" : "destructive";
  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {score}
    </Badge>
  );
}
