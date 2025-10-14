"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RowData } from "@/app/page";
import { useToast } from "@/hooks/use-toast";

interface DataGridProps {
  data: RowData[];
  columns: string[];
  contextColumn: string;
  resultColumn: string;
  onDataUpdate: (data: RowData[]) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  allData: RowData[];
}

export function DataGrid({
  data,
  columns,
  contextColumn,
  resultColumn,
  onDataUpdate,
  currentPage,
  totalPages,
  onPageChange,
  allData,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: string;
  } | null>(null);
  const { toast } = useToast();

  const handleCellEdit = (rowId: string, field: string, value: string) => {
    const updatedData = data.map((row) =>
      row._id === rowId ? { ...row, [field]: value } : row
    );
    onDataUpdate(updatedData);
  };

  const handleConfirm = (rowId: string) => {
    const updatedData = data.map((row) =>
      row._id === rowId
        ? {
            ...row,
            [resultColumn]: row._ai_suggestion || row[resultColumn],
            _confirmed: true,
          }
        : row
    );
    onDataUpdate(updatedData);
  };

  const handleReject = (rowId: string) => {
    const row = data.find((r) => r._id === rowId);
    const updatedData = data.map((r) =>
      r._id === rowId
        ? {
            ...r,
            _ai_suggestion: "",
            _confirmed: true,
          }
        : r
    );
    onDataUpdate(updatedData);
  };

  const handleConfirmAll = () => {
    const updatedData = data.map((row) =>
      row._ai_suggestion && !row._confirmed
        ? {
            ...row,
            [resultColumn]: row._ai_suggestion,
            _confirmed: true,
          }
        : row
    );
    onDataUpdate(updatedData);
    toast({
      title: "Confirmed all suggestions",
      description: `Confirmed ${
        updatedData.filter((r) => r._confirmed).length -
        data.filter((r) => r._confirmed).length
      } AI suggestions on this page.`,
    });
  };

  const handleExport = () => {
    const exportColumns = [...columns, "_ai_suggestion", "_final_result"];
    const csv = [
      exportColumns.join(","),
      ...allData.map((row) =>
        exportColumns
          .map((col) => {
            const value =
              col === "_final_result"
                ? row[resultColumn] || ""
                : row[col] || "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labeled-data.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${allData.length} rows to labeled-data.csv`,
    });
  };

  const confirmedCount = allData.filter((row) => row._confirmed).length;
  const labeledCount = allData.filter((row) => row._ai_suggestion).length;
  const pendingOnPage = data.filter(
    (row) => row._ai_suggestion && !row._confirmed
  ).length;

  const displayColumns = columns.filter(
    (col) => col !== contextColumn && col !== resultColumn
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">AI Labeled</p>
            <p className="font-mono text-sm font-medium text-primary">
              {labeledCount} / {allData.length}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-sm text-muted-foreground">Confirmed</p>
            <p className="font-mono text-sm font-medium text-success">
              {confirmedCount} / {allData.length}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="font-mono text-sm font-medium text-warning">
              {labeledCount - confirmedCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingOnPage > 0 && (
            <Button
              onClick={handleConfirmAll}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <CheckCheck className="h-4 w-4" />
              Confirm All on Page
            </Button>
          )}
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Final CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[300px]">
                  {contextColumn || "Context"}
                </th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                  {resultColumn || "Original"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                  AI Suggestion
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                  Final Result
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row, index) => {
                const originalValue = row[resultColumn];
                const isDifferent =
                  row._ai_suggestion &&
                  originalValue &&
                  row._ai_suggestion !== originalValue;

                return (
                  <tr
                    key={row._id}
                    className={cn(
                      "hover:bg-secondary/50 transition-colors",
                      row._confirmed && "bg-success/5"
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {currentPage * 50 + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div
                        className="max-w-md truncate"
                        title={row[contextColumn]}
                      >
                        {row[contextColumn]}
                      </div>
                    </td>
                    {displayColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm">
                        <div
                          className="max-w-[150px] truncate font-mono text-muted-foreground"
                          title={row[col]}
                        >
                          {row[col] || "-"}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm">
                      <span className="font-mono text-muted-foreground">
                        {originalValue || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row._ai_suggestion ? (
                        <span
                          className={cn(
                            "font-mono px-2 py-1 rounded",
                            isDifferent
                              ? "bg-warning/20 text-warning-foreground"
                              : "bg-primary/20 text-primary"
                          )}
                        >
                          {row._ai_suggestion}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingCell?.rowId === row._id &&
                      editingCell?.field === resultColumn ? (
                        <Input
                          autoFocus
                          value={row[resultColumn]}
                          onChange={(e) =>
                            handleCellEdit(
                              row._id,
                              resultColumn,
                              e.target.value
                            )
                          }
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setEditingCell(null);
                            }
                          }}
                          className="h-8 font-mono"
                        />
                      ) : (
                        <div
                          onClick={() =>
                            setEditingCell({
                              rowId: row._id,
                              field: resultColumn,
                            })
                          }
                          className="cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded font-mono"
                        >
                          {row[resultColumn] || "-"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row._ai_suggestion &&
                      !row._confirmed &&
                      row._ai_suggestion.toString().trim().toLowerCase() !==
                        (row[resultColumn]?.toString().trim().toLowerCase() ||
                          "") ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleConfirm(row._id)}
                            className="h-8 gap-1 text-success hover:text-success hover:bg-success/10"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(row._id)}
                            className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      ) : row._confirmed ? (
                        <div className="flex items-center gap-1 text-success">
                          <Check className="h-4 w-4" />
                          <span className="text-xs">Confirmed</span>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {currentPage * 50 + 1} to{" "}
          {Math.min((currentPage + 1) * 50, allData.length)} of {allData.length}{" "}
          rows
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const shouldShow =
                i < 3 ||
                i >= totalPages - 3 ||
                (i >= currentPage - 1 && i <= currentPage + 1);

              if (!shouldShow && i === 3) {
                return (
                  <span key={i} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              if (!shouldShow) return null;

              return (
                <Button
                  key={i}
                  variant={currentPage === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(i)}
                  className="w-8 h-8 p-0"
                >
                  {i + 1}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
