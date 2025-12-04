import type { ReactNode } from "react"
import React from "react"
import { Info, GitCompare, Check, X, CheckCircle2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"

interface HoveredCell {
  rowId: string
  field: string
}

interface EditingCell {
  rowId: string
  field: string
}

export interface DataGridTableProps {
  rows: RowData[]
  displayColumns: string[]
  contextColumn: string
  resultColumn: string
  manualMode: boolean
  filteredCurrentPage: number
  pageSize: number
  hoveredCell: HoveredCell | null
  setHoveredCell: (cell: HoveredCell | null) => void
  editingCell: EditingCell | null
  editingValue: string
  onCellEditStart: (rowId: string, field: string) => void
  onCellEditChange: (value: string) => void
  onCellEditEnd: (rowId: string, field: string) => void
  onConfirm: (rowId: string) => void
  onReject: (rowId: string) => void
  setCompareRow: (row: RowData | null) => void
  getStatusBadge: (status: string) => ReactNode
  getRowStatus: (row: RowData) => string
  getResultCellColor: (row: RowData) => string
  getResultHighlightLabel: (row: RowData) => string | null
}

interface DataGridRowProps extends Omit<DataGridTableProps, "rows"> {
  row: RowData
  index: number
}

const DataGridRow = React.memo(function DataGridRow({
  row,
  index,
  displayColumns,
  contextColumn,
  resultColumn,
  manualMode,
  filteredCurrentPage,
  pageSize,
  hoveredCell,
  setHoveredCell,
  editingCell,
  editingValue,
  onCellEditStart,
  onCellEditChange,
  onCellEditEnd,
  onConfirm,
  onReject,
  setCompareRow,
  getStatusBadge,
  getRowStatus,
  getResultCellColor,
  getResultHighlightLabel,
}: DataGridRowProps) {
  const isEditingThisRow = editingCell?.rowId === row._id

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: string) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault()
      onCellEditEnd(row._id, field)
    } else if (e.key === "Escape") {
      onCellEditEnd(row._id, field)
    }
  }

  return (
    <tr
      className={cn(
        "hover:bg-secondary/50 transition-colors",
        row._is_new && "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500",
        !manualMode && row._confirmed && "bg-success/5",
        manualMode &&
          row[resultColumn] !== null &&
          row[resultColumn] !== undefined &&
          String(row[resultColumn]).trim() !== "" &&
          "bg-success/5",
      )}
    >
      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
        {filteredCurrentPage * pageSize + index + 1}
      </td>
      {contextColumn && (
        <td
          className="px-4 py-3 text-sm relative"
          onMouseEnter={() => setHoveredCell({ rowId: row._id, field: contextColumn })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <div
            className={cn(
              "rounded px-3 py-2 text-sm border transition-all max-w-md",
              manualMode && "cursor-pointer hover:shadow-md",
            )}
            onClick={() => {
              if (manualMode) {
                onCellEditStart(row._id, contextColumn)
              }
            }}
          >
            {isEditingThisRow && editingCell?.field === contextColumn ? (
              <Textarea
                autoFocus
                value={editingValue}
                onChange={(e) => onCellEditChange(e.target.value)}
                onBlur={() => onCellEditEnd(row._id, contextColumn)}
                onKeyDown={(e) => handleTextareaKeyDown(e, contextColumn)}
                className="min-h-20 text-sm p-2 w-full resize-y"
                rows={Math.min(Math.max(editingValue.split("\n").length, 3), 10)}
              />
            ) : (
              <span className="break-words whitespace-pre-wrap block" title={String(row[contextColumn] ?? "")}>
                {row[contextColumn] || "-"}
              </span>
            )}
          </div>
        </td>
      )}
      {displayColumns.map((col) => (
        <td
          key={col}
          className="px-4 py-3 text-sm relative"
          onMouseEnter={() => setHoveredCell({ rowId: row._id, field: col })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <div
            className={cn(
              "rounded px-3 py-2 font-mono text-sm border transition-all",
              manualMode && "cursor-pointer hover:shadow-md",
            )}
            onClick={() => {
              if (manualMode) {
                onCellEditStart(row._id, col)
              }
            }}
          >
            {isEditingThisRow && editingCell?.field === col ? (
              <Textarea
                autoFocus
                value={editingValue}
                onChange={(e) => onCellEditChange(e.target.value)}
                onBlur={() => onCellEditEnd(row._id, col)}
                onKeyDown={(e) => handleTextareaKeyDown(e, col)}
                className="min-h-20 font-mono text-sm p-2 w-full resize-y"
                rows={Math.min(Math.max(editingValue.split("\n").length, 3), 10)}
              />
            ) : (
              <span className="break-words whitespace-pre-wrap block">{row[col] || "-"}</span>
            )}
          </div>
        </td>
      ))}
      <td className="px-4 py-3 text-sm">
        {getStatusBadge(getRowStatus(row)) || <span className="text-xs text-muted-foreground">-</span>}
      </td>
      {resultColumn && (
        <td
          className="px-4 py-3 text-sm relative group"
          onMouseEnter={() => setHoveredCell({ rowId: row._id, field: resultColumn })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex-1 rounded px-3 py-2 font-mono text-sm border transition-all",
                    manualMode && "cursor-pointer hover:shadow-md",
                    getResultCellColor(row),
                  )}
                  onClick={() => {
                    if (manualMode) {
                      onCellEditStart(row._id, resultColumn)
                    }
                  }}
                >
                  {isEditingThisRow && editingCell?.field === resultColumn ? (
                    <Textarea
                      autoFocus
                      value={editingValue}
                      onChange={(e) => onCellEditChange(e.target.value)}
                      onBlur={() => onCellEditEnd(row._id, resultColumn)}
                      onKeyDown={(e) => handleTextareaKeyDown(e, resultColumn)}
                      className="min-h-20 font-mono text-sm p-2 w-full resize-y"
                      rows={Math.min(Math.max(editingValue.split("\n").length, 3), 10)}
                    />
                  ) : (
                    <span className="break-words whitespace-pre-wrap block">
                      {row[resultColumn] || "-"}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              {getResultHighlightLabel(row) && (
                <TooltipContent>
                  <p className="text-xs">{getResultHighlightLabel(row)}</p>
                </TooltipContent>
              )}
            </Tooltip>
            {(row._ai_suggestion || row._ai_reasoning) && !row._confirmed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-card border border-border shadow-md">
                  <div className="space-y-2">
                    {row._ai_suggestion && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">AI Suggestion:</p>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            row._ai_suggestion === "true" &&
                              "bg-green-200 text-green-900 dark:bg-green-300 dark:text-green-950",
                            row._ai_suggestion === "false" &&
                              "bg-red-200 text-red-900 dark:bg-red-300 dark:text-red-950",
                            !["true", "false"].includes(row._ai_suggestion) &&
                              "bg-blue-200 text-blue-900 dark:bg-blue-300 dark:text-blue-950",
                          )}
                        >
                          {row._ai_suggestion}
                        </div>
                      </div>
                    )}
                    {row._ai_reasoning && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">AI Reasoning:</p>
                        <p className="text-sm text-foreground">{row._ai_reasoning}</p>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </td>
      )}
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          {(row._corrected_value || row._ai_suggestion) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompareRow(row)}
                  className="h-7 w-7 p-0 bg-transparent"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compare current vs AI</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!manualMode &&
            row._ai_suggestion &&
            !row._confirmed &&
            ((row._validation_status || "").toString().toLowerCase() !== "ambiguous") &&
            ((row._validation_status || "").toString().toLowerCase() !== "correct") &&
            ((row._ai_type || "").toString().toLowerCase() !== "correct") &&
            ((row._ai_suggestion || "").toString().toLowerCase() !== "true") && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConfirm(row._id)}
                      className="h-7 w-7 p-0 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 border-green-500 text-green-700 dark:text-green-300"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Confirm AI suggestion</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(row._id)}
                      className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 border-red-500 text-red-700 dark:text-red-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reject AI suggestion</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
        </div>
        {row._confirmed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center text-green-600 dark:text-green-400 cursor-help">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Confirmed</p>
            </TooltipContent>
          </Tooltip>
        )}
        {!row._ai_suggestion &&
          !row._confirmed &&
          !(manualMode && row[resultColumn] && String(row[resultColumn]).trim() !== "") && (
            <span className="text-muted-foreground text-xs">-</span>
          )}
      </td>
    </tr>
  )
})

export function DataGridTable({
  rows,
  displayColumns,
  contextColumn,
  resultColumn,
  manualMode,
  filteredCurrentPage,
  pageSize,
  hoveredCell,
  setHoveredCell,
  editingCell,
  editingValue,
  onCellEditStart,
  onCellEditChange,
  onCellEditEnd,
  onConfirm,
  onReject,
  setCompareRow,
  getStatusBadge,
  getRowStatus,
  getResultCellColor,
  getResultHighlightLabel,
}: DataGridTableProps) {
  return (
    <table className="w-full">
      <thead className="bg-secondary sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
            #
          </th>
          {contextColumn && (
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[300px]">
              {contextColumn}
            </th>
          )}
          {displayColumns.map((col) => (
            <th
              key={col}
              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]"
            >
              {col}
            </th>
          ))}
          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
            Status
          </th>
          {resultColumn && (
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
              {resultColumn}
            </th>
          )}
          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row, index) => (
          <DataGridRow
            key={row._id}
            row={row}
            index={index}
            displayColumns={displayColumns}
            contextColumn={contextColumn}
            resultColumn={resultColumn}
            manualMode={manualMode}
            filteredCurrentPage={filteredCurrentPage}
            pageSize={pageSize}
            hoveredCell={hoveredCell}
            setHoveredCell={setHoveredCell}
            editingCell={editingCell}
            editingValue={editingValue}
            onCellEditStart={onCellEditStart}
            onCellEditChange={onCellEditChange}
            onCellEditEnd={onCellEditEnd}
            onConfirm={onConfirm}
            onReject={onReject}
            setCompareRow={setCompareRow}
            getStatusBadge={getStatusBadge}
            getRowStatus={getRowStatus}
            getResultCellColor={getResultCellColor}
            getResultHighlightLabel={getResultHighlightLabel}
          />
        ))}
      </tbody>
      {rows.length === 0 && (
        <tfoot>
          <tr>
            <td
              colSpan={
                1 + // #
                (contextColumn ? 1 : 0) +
                displayColumns.length +
                1 + // Status
                (resultColumn ? 1 : 0) +
                1 // Actions
              }
              className="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              No rows to display. Try adjusting your filters or search keywords.
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}


