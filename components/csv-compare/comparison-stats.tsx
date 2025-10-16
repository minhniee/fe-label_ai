import { Card } from "@/components/ui/card";
import { Plus, Minus, Edit3, Equal } from "lucide-react";
import type { ComparisonResult } from "../../lib/csv-compare/csv-types";

interface ComparisonStatsProps {
  comparison: ComparisonResult;
}

export function ComparisonStats({ comparison }: ComparisonStatsProps) {
  const stats = [
    { label: "Added Rows", value: comparison.added.length, icon: Plus, color: "text-success", bg: "bg-success/10" },
    { label: "Removed Rows", value: comparison.removed.length, icon: Minus, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Modified Rows", value: comparison.modified.length, icon: Edit3, color: "text-warning", bg: "bg-warning/10" },
    { label: "Unchanged Rows", value: comparison.unchanged.length, icon: Equal, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}


