import { Plus, Minus, Edit3 } from "lucide-react";

interface DiffRowProps {
  type: "added" | "removed" | "modified";
  row: Record<string, string>;
  oldRow: Record<string, string> | null;
  headers: string[];
}

export function DiffRow({ type, row, oldRow, headers }: DiffRowProps) {
  const getStatusConfig = () => {
    switch (type) {
      case "added":
        return { icon: Plus, label: "Added", bg: "bg-success/10", text: "text-success", rowBg: "bg-success/5" };
      case "removed":
        return { icon: Minus, label: "Removed", bg: "bg-destructive/10", text: "text-destructive", rowBg: "bg-destructive/5" };
      case "modified":
        return { icon: Edit3, label: "Modified", bg: "bg-warning/10", text: "text-warning", rowBg: "bg-warning/5" };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const isFieldModified = (header: string) => {
    if (type !== "modified" || !oldRow) return false;
    return row[header] !== oldRow[header];
  };

  return (
    <tr className={config.rowBg}>
      <td className="px-4 py-3">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${config.text}`} />
          <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
        </div>
      </td>
      {headers.map((header) => {
        const modified = isFieldModified(header);
        return (
          <td key={header} className="px-4 py-3">
            {modified && oldRow ? (
              <div className="space-y-1">
                <div className="text-sm text-destructive line-through opacity-70">{oldRow[header]}</div>
                <div className="text-sm text-success font-medium">{row[header]}</div>
              </div>
            ) : (
              <div className="text-sm">{row[header]}</div>
            )}
          </td>
        );
      })}
    </tr>
  );
}


