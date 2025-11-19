"use client"

import { useState, useEffect } from "react"
import { Check, ChevronLeft, ChevronRight, Download, X, CheckCheck, Send, Trash2, Info, CheckCircle2, GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { RowData } from "@/app/(navigation)/[projectId]/labelai/page"
import { useToast } from "@/hooks/use-toast"
import { submitDataset } from "@/app/api/labelai"
import { generateDatasetFromProject } from "@/app/api/project"

interface DataGridProps {
  data: RowData[]
  columns: string[]
  visibleColumns?: string[]
  contextColumn: string
  resultColumn: string
  onDataUpdate: (data: RowData[]) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  allData: RowData[]
  datasetName: string
  manualMode?: boolean
  projectId?: number
}

export function DataGrid({
  data,
  columns,
  visibleColumns = [],
  contextColumn,
  resultColumn,
  onDataUpdate,
  currentPage,
  totalPages,
  onPageChange,
  allData,
  datasetName,
  manualMode = false,
  projectId,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    field: string
  } | null>(null)
  const [versionName, setVersionName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string; field: string } | null>(null)
  const [compareRow, setCompareRow] = useState<RowData | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportDelimiter, setExportDelimiter] = useState<string>(",")
  const { toast } = useToast()

  const confirmedCount = manualMode
    ? allData.filter((row) => row[resultColumn] && row[resultColumn].toString().trim() !== "").length
    : allData.filter((row) => row._confirmed).length
  const pendingOnPage = data.filter((row) => row._ai_suggestion && !row._confirmed).length
  const allConfirmed = confirmedCount === allData.length && allData.length > 0

  // Detect best delimiter based on data content
  const detectBestDelimiter = (): string => {
    if (allData.length === 0) return ","
    
    const candidates = [
      { char: ",", name: "Comma (,)" },
      { char: ";", name: "Semicolon (;)" },
      { char: "|", name: "Pipe (|)" },
      { char: "\t", name: "Tab" },
    ]
    
    // Sample first few rows to check for delimiter conflicts
    const sampleRows = allData.slice(0, Math.min(10, allData.length))
    const exportColumns = [...columns, "_validation_status", "_corrected_value"]
    
    // Count occurrences of each delimiter in data
    const delimiterScores = candidates.map((candidate) => {
      let conflictCount = 0
      let totalOccurrences = 0
      
      sampleRows.forEach((row) => {
        exportColumns.forEach((col) => {
          const value = String(col === "_corrected_value" ? row._corrected_value || "" : row[col] || "")

          // Count occurrences using simple string search instead of regex to avoid security issues
          let occurrences = 0
          if (candidate.char === "\t") {
            // Count tabs using split
            occurrences = value.split("\t").length - 1
          } else {
            // Count other delimiters using split
            occurrences = value.split(candidate.char).length - 1
          }

          totalOccurrences += occurrences
          if (occurrences > 0) conflictCount++
        })
      })
      
      return {
        char: candidate.char,
        name: candidate.name,
        conflicts: conflictCount,
        occurrences: totalOccurrences,
        score: conflictCount * 1000 + totalOccurrences, // Lower is better
      }
    })
    
    // Find delimiter with least conflicts
    const best = delimiterScores.reduce((prev, curr) => 
      curr.score < prev.score ? curr : prev
    )
    
    // If comma has no or minimal conflicts, use it (most common)
    const commaScore = delimiterScores.find((d) => d.char === ",")
    if (commaScore && commaScore.conflicts === 0) return ","
    
    // Otherwise use the best delimiter
    return best.char
  }

  const generateVersionName = () => {
    const baseTitle = datasetName.split(" - v")[0] || datasetName
    const currentVersion = datasetName.match(/_v(\d+)$/)
    const nextVersion = currentVersion ? Number.parseInt(currentVersion[1]) + 1 : 1
    return `${baseTitle}_v${nextVersion}`
  }

  // Use useEffect to set version name when allConfirmed changes
  useEffect(() => {
    if (allConfirmed && !versionName) {
      setVersionName(generateVersionName())
    }
  }, [allConfirmed, versionName])

  const handleCellEdit = (rowId: string, field: string, value: string) => {
    // Update allData first (full dataset)
    const updatedAllData = allData.map((row) =>
      row._id === rowId
        ? { ...row, [field]: value, _isModified: true }
        : row
    )

    // Always pass full updatedAllData to parent to keep everything in sync
    // No need to filter - parent handles pagination
    onDataUpdate(updatedAllData)
  }

  const handleConfirm = (rowId: string) => {
    const row = allData.find((r) => r._id === rowId) || data.find((r) => r._id === rowId)
    if (!row) return

    const status = (row._validation_status || "").toString().toLowerCase()
    const isAmbiguous = status === "ambiguous"
    const isIncorrect = status === "incorrect" || (row._ai_suggestion || "").toString().toLowerCase() === "false"
    const isCorrect = status === "correct" || (row._ai_suggestion || "").toString().toLowerCase() === "true"

    if (isAmbiguous) {
      toast({
        title: "Ambiguous result",
        description: "AI marked this row as ambiguous. Please review manually.",
        variant: "destructive",
      })
      return
    }

    // Priority: Use _corrected_value if available, otherwise use _ai_suggestion
    const valueToFill = row._corrected_value || row._ai_suggestion || ""

    if (!valueToFill && !isCorrect) {
      toast({
        title: "Warning",
        description: "No AI suggestion or corrected value found to apply.",
        variant: "destructive",
      })
      return
    }

    // Update the row with the correct value
    const updatedAllData = allData.map((r) => {
      if (r._id !== rowId) return r

      return {
        ...r,
        [resultColumn]: valueToFill,
        _confirmed: true,
      }
    })

    onDataUpdate(updatedAllData)

    toast({
      title: "Confirmed",
      description: `Applied "${valueToFill}" to ${resultColumn}`,
    })
  }

  const handleReject = (rowId: string) => {
    // Update allData to keep consistency across all pages
    const updatedAllData = allData.map((r) =>
      r._id === rowId
        ? {
            ...r,
            _ai_suggestion: "",
            _ai_reasoning: "",
            _confirmed: false,
          }
        : r,
    )
    
    // Update current page data
    const updatedData = data.map((r) =>
      r._id === rowId
        ? {
            ...r,
            _ai_suggestion: "",
            _ai_reasoning: "",
            _confirmed: false,
          }
        : r,
    )
    
    // Notify parent with all updated rows
    onDataUpdate(updatedAllData)
    toast({
      title: "Rejected",
      description: `AI suggestion has been rejected`,
    })
  }

  const handleClearAllSuggestions = () => {
    const updatedData = allData.map((row) => ({
      ...row,
      _ai_suggestion: "",
      _ai_reasoning: "",
      _confirmed: false,
    }))
    onDataUpdate(updatedData)
    toast({
      title: "Suggestions cleared",
      description: "All AI suggestions have been removed. You can generate new suggestions.",
    })
  }

  const handleConfirmAll = () => {
    const targets = data.filter((row) => row._ai_suggestion && !row._confirmed)

    let applied = 0
    let ambiguous = 0
    let skipped = 0

    const updatedAllData = allData.map((row) => {
      const onPage = targets.find((r) => r._id === row._id)
      if (!onPage) return row

      const status = (row._validation_status || "").toString().toLowerCase()
      const isAmbiguous = status === "ambiguous"

      if (isAmbiguous) {
        ambiguous += 1
        return row
      }

      // Priority: Use _corrected_value if available, otherwise use _ai_suggestion
      const valueToFill = row._corrected_value || row._ai_suggestion || ""

      if (!valueToFill) {
        skipped += 1
        return row
      }

      // Apply the value to resultColumn and mark as confirmed
      applied += 1
      return {
        ...row,
        [resultColumn]: valueToFill,
        _confirmed: true,
      }
    })

    onDataUpdate(updatedAllData)

    const parts = [] as string[]
    if (applied) parts.push(`${applied} confirmed`)
    if (ambiguous) parts.push(`${ambiguous} ambiguous skipped`)
    if (skipped) parts.push(`${skipped} no value skipped`)

    toast({
      title: "Confirm All",
      description: parts.length ? parts.join(", ") : "No rows to confirm",
    })
  }

  const handleRejectAll = () => {
    // Get all row IDs on current page that need rejection
    const rowIdsToReject = data
      .filter((row) => row._ai_suggestion && !row._confirmed)
      .map((row) => row._id)
    
    // Update allData for all rows
    const updatedAllData = allData.map((row) =>
      rowIdsToReject.includes(row._id)
        ? {
            ...row,
            _ai_suggestion: "",
            _ai_reasoning: "",
            _confirmed: false,
          }
        : row,
    )
    
    onDataUpdate(updatedAllData)
    toast({
      title: "Rejected all suggestions",
      description: `Rejected ${rowIdsToReject.length} AI suggestions on this page.`,
    })
  }

  const handleSubmit = async () => {
    if (!versionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a version name",
        variant: "destructive",
      })
      return
    }

    // Check if projectId is available
    if (!projectId) {
      toast({
        title: "Error",
        description: "Project ID is required to generate dataset",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Call generateDatasetFromProject API
      const result = await generateDatasetFromProject(projectId, {
        dataset_name: versionName.trim(),
        dataset_description: `Dataset generated from labeled data. Total rows: ${allData.length}, Confirmed rows: ${confirmedCount}`,
        export_type: 'full', // Export all labeled data
        copy_permissions: true, // Copy project permissions
      })

      toast({
        title: "Success",
        description: `Successfully generated dataset: ${result.dataset_id}. ${result.files_exported} files exported.`,
      })
      setVersionName("")
    } catch (error: any) {
      console.error("Error generating dataset:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate dataset",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportClick = () => {
    // Auto-detect best delimiter and set it as default
    const detectedDelimiter = detectBestDelimiter()
    setExportDelimiter(detectedDelimiter)
    setShowExportDialog(true)
  }

  const handleExport = (delimiter?: string) => {
    const selectedDelimiter = delimiter || exportDelimiter
    const exportColumns = [...columns, "_validation_status", "_corrected_value"]
    const csv = [
      exportColumns.join(selectedDelimiter),
      ...allData.map((row) =>
        exportColumns
          .map((col) => {
            const value = col === "_corrected_value" ? row._corrected_value || "" : row[col] || ""
            // Escape quotes and wrap in quotes if value contains delimiter, newline, or quote
            const stringValue = String(value)
            const needsQuotes = stringValue.includes(selectedDelimiter) || 
                               stringValue.includes("\n") || 
                               stringValue.includes("\r") || 
                               stringValue.includes('"')
            if (needsQuotes) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          })
          .join(selectedDelimiter),
      ),
    ].join("\n")

    const fileExtension = selectedDelimiter === "\t" ? "tsv" : "csv"
    const blob = new Blob([csv], { type: selectedDelimiter === "\t" ? "text/tab-separated-values" : "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `validated-data.${fileExtension}`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: `Exported ${allData.length} rows to validated-data.${fileExtension}`,
    })
    
    setShowExportDialog(false)
  }

  const getDelimiterName = (delimiter: string): string => {
    switch (delimiter) {
      case ",":
        return "Comma (,)"
      case ";":
        return "Semicolon (;)"
      case "|":
        return "Pipe (|)"
      case "\t":
        return "Tab"
      default:
        return `Custom (${delimiter})`
    }
  }

  // Show only context and result by default: exclude internal/meta and also remove context/result from generic list
  const internalColumns = ["_id", "_ai_suggestion", "_ai_reasoning", "_confirmed", "_validation_status", "_corrected_value", "__corrected_value", "_is_new"]
  const displayColumns = (visibleColumns.length > 0 ? visibleColumns : columns).filter(
    (col) => !internalColumns.includes(col) && !col.startsWith("_validation_status") && !col.startsWith("_corrected_value") && !col.startsWith("__corrected_value") && col !== contextColumn && col !== resultColumn
  )

  const getCellColor = (status: string) => {
    switch (status) {
      case "correct":
        return "bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500"
      case "incorrect":
        return "bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500"
      case "ambiguous":
        return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500"
      default:
        return "bg-background border-l-4 border-l-transparent"
    }
  }

  const getCellTextColor = (status: string) => {
    switch (status) {
      case "correct":
        return "text-green-900 dark:text-green-100"
      case "incorrect":
        return "text-red-900 dark:text-red-100"
      case "ambiguous":
        return "text-yellow-900 dark:text-yellow-100"
      default:
        return ""
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "correct":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
            <Check className="h-3 w-3" /> Correct
          </span>
        )
      case "incorrect":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
            <X className="h-3 w-3" /> Incorrect
          </span>
        )
      case "ambiguous":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
            <Info className="h-3 w-3" /> Ambiguous
          </span>
        )
      default:
        return null
    }
  }

  const getResultCellColor = (row: RowData) => {
    if (row._confirmed) {
      return "bg-green-50 dark:bg-green-950/30 border-green-500"
    }
    const validation = String(row._validation_status || "").toLowerCase()
    const ai = String(row._ai_suggestion || "").toLowerCase()
    const status =
      validation === "correct" || ai === "true"
        ? "correct"
        : validation === "incorrect" || ai === "false"
        ? "incorrect"
        : validation === "ambiguous"
        ? "ambiguous"
        : ""
    switch (status) {
      case "correct":
        return "bg-green-50 dark:bg-green-950/30 border-green-500"
      case "incorrect":
        return "bg-red-50 dark:bg-red-950/30 border-red-500"
      case "ambiguous":
        return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500"
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {allConfirmed && (
          <Card className="p-6 bg-success/5 border-success/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-success">All rows confirmed!</h3>
                </div>
                <p className="text-sm text-muted-foreground">Ready to submit your validated dataset as a new version</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version-name" className="text-sm">
                    Version Name
                  </Label>
                  <Input
                    id="version-name"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="Enter version name"
                    className="w-64 font-mono"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting || !versionName.trim()} className="gap-2 mt-7">
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Version
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{manualMode ? "Labeled" : "Confirmed"}</p>
              <p className="font-mono text-sm font-medium text-success">
                {confirmedCount} / {allData.length}
              </p>
            </div>
            {!manualMode && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="font-mono text-sm font-medium text-warning">
                    {allData.filter((row) => row._ai_suggestion && !row._confirmed).length}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!manualMode && allData.some((row) => row._ai_suggestion) && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleClearAllSuggestions}
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove all AI suggestions and start over</TooltipContent>
                </Tooltip>
              </>
            )}
            {!manualMode && pendingOnPage > 0 && (
              <>
                <Button
                  onClick={handleConfirmAll}
                  variant="outline"
                  className="gap-2 bg-transparent text-success hover:text-success hover:bg-success/10"
                >
                  <CheckCheck className="h-4 w-4" />
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                  Reject All
                </Button>
              </>
            )}
            <Button onClick={handleExportClick} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
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
                {data.map((row, index) => {
                  return (
                    <tr
                      key={row._id}
                      className={cn(
                        "hover:bg-secondary/50 transition-colors",
                        row._is_new && "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500",
                        !manualMode && row._confirmed && "bg-success/5",
                        manualMode && row[resultColumn] && row[resultColumn].toString().trim() !== "" && "bg-success/5",
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {currentPage * 50 + index + 1}
                      </td>
                      {contextColumn && (
                        <td className="px-4 py-3 text-sm">
                          <div
                            className={cn(
                              "max-w-md rounded px-3 py-2 font-mono text-sm border transition-all",
                              manualMode && "cursor-pointer hover:shadow-md hover:border-primary"
                            )}
                            onClick={() => {
                              if (manualMode) {
                                setEditingCell({ rowId: row._id, field: contextColumn })
                              }
                            }}
                            title={row[contextColumn]}
                          >
                            {editingCell?.rowId === row._id && editingCell?.field === contextColumn ? (
                              <Input
                                autoFocus
                                value={row[contextColumn] || ""}
                                onChange={(e) => handleCellEdit(row._id, contextColumn, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setEditingCell(null)
                                  }
                                  if (e.key === "Escape") {
                                    setEditingCell(null)
                                  }
                                }}
                                className="h-6 font-mono text-sm p-1 w-full"
                              />
                            ) : (
                              <span className="truncate block">{row[contextColumn] || "-"}</span>
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
                              manualMode && "cursor-pointer hover:shadow-md hover:border-primary",
                              !manualMode && "cursor-default",
                              getCellColor(row._validation_status),
                              getCellTextColor(row._validation_status),
                            )}
                            onClick={() => {
                              if (manualMode) {
                                setEditingCell({ rowId: row._id, field: col })
                              }
                            }}
                          >
                            {editingCell?.rowId === row._id && editingCell?.field === col ? (
                              <Input
                                autoFocus
                                value={row[col] || ""}
                                onChange={(e) => handleCellEdit(row._id, col, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setEditingCell(null)
                                  }
                                  if (e.key === "Escape") {
                                    setEditingCell(null)
                                  }
                                }}
                                className="h-6 font-mono text-sm p-1 w-full"
                              />
                            ) : (
                              <span>{row[col] || "-"}</span>
                            )}
                          </div>

                          {/* {hoveredCell?.rowId === row._id &&
                            hoveredCell?.field === col &&
                            row._validation_status &&
                            row._validation_status !== "correct" && (
                              <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-lg shadow-xl p-4 min-w-[350px]">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                      Corrected Value
                                    </p>
                                    <div className="bg-secondary/50 rounded px-3 py-2 border border-border font-mono text-sm">
                                      {row._corrected_value || row[col] || "-"}
                                    </div>
                                  </div>
                                  {row._ai_reasoning && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                        Reasoning
                                      </p>
                                      <p className="text-sm text-muted-foreground leading-relaxed">
                                        {row._ai_reasoning}
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex gap-2 pt-2 border-t border-border">
                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirm(row._id)}
                                      className="flex-1 h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Check className="h-3 w-3" />
                                      Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleReject(row._id)}
                                      className="flex-1 h-8 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      <X className="h-3 w-3" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )} */}
                        </td>
                      ))}
                      {resultColumn && (
                        <td
                          className="px-4 py-3 text-sm relative group"
                          onMouseEnter={() => setHoveredCell({ rowId: row._id, field: resultColumn })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex-1 rounded px-3 py-2 font-mono text-sm border transition-all",
                                manualMode && "cursor-pointer hover:shadow-md hover:border-primary",
                                !manualMode && "cursor-default",
                                getResultCellColor(row),
                              )}
                              onClick={() => {
                                if (manualMode) {
                                  setEditingCell({ rowId: row._id, field: resultColumn })
                                }
                              }}
                            >
                              {editingCell?.rowId === row._id && editingCell?.field === resultColumn ? (
                                <Input
                                  autoFocus
                                  value={row[resultColumn] || ""}
                                  onChange={(e) => handleCellEdit(row._id, resultColumn, e.target.value)}
                                  onBlur={() => setEditingCell(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setEditingCell(null)
                                    }
                                    if (e.key === "Escape") {
                                      setEditingCell(null)
                                    }
                                  }}
                                  className="h-6 font-mono text-sm p-1 w-full"
                                />
                              ) : (
                                <span>{row[resultColumn] || "-"}</span>
                              )}
                            </div>
                            {/* Only show Info icon if there's AI suggestion/reasoning and not yet confirmed */}
                            {(row._ai_suggestion || row._ai_reasoning) && !row._confirmed && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm bg-card border border-border shadow-md">
                                  <div className="space-y-2">
                                    {row._ai_suggestion && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">AI Suggestion:</p>
                                        <div className={cn(
                                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                          row._ai_suggestion === "true" && "bg-green-200 text-green-900 dark:bg-green-300 dark:text-green-950",
                                          row._ai_suggestion === "false" && "bg-red-200 text-red-900 dark:bg-red-300 dark:text-red-950",
                                          !["true", "false"].includes(row._ai_suggestion) && "bg-blue-200 text-blue-900 dark:bg-blue-300 dark:text-blue-950"
                                        )}>
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

                          {/* Single tooltip retained via Info icon above; removed duplicate hover panel for Result column */}
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

                          {/* Show buttons when there's AI suggestion and not confirmed (excluding ambiguous and correct) */}
                          {row._ai_suggestion &&
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
                                    onClick={() => handleConfirm(row._id)}
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
                                    onClick={() => handleReject(row._id)}
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
                        {/* Show confirmed icon if confirmed */}
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
                        {/* Empty state */}
                        {!row._ai_suggestion && !row._confirmed && (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * 50 + 1} to {Math.min((currentPage + 1) * 50, allData.length)} of {allData.length}{" "}
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
                const shouldShow = i < 3 || i >= totalPages - 3 || (i >= currentPage - 1 && i <= currentPage + 1)

                if (!shouldShow && i === 3) {
                  return (
                    <span key={i} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                }

                if (!shouldShow) return null

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
                )
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

      <Dialog open={!!compareRow} onOpenChange={(open) => !open && setCompareRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Result</DialogTitle>
            <DialogDescription>
              Review the current value versus AI's proposed value before confirming.
            </DialogDescription>
          </DialogHeader>

          {compareRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Current</p>
                  <div className="bg-secondary/50 rounded px-3 py-2 border border-border font-mono text-sm">
                    {String(compareRow[resultColumn] ?? "-")}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">AI</p>
                  <div className="bg-secondary/50 rounded px-3 py-2 border border-border font-mono text-sm">
                    {String((compareRow._corrected_value ?? (compareRow._ai_suggestion ?? "")) || "-")}
                  </div>
                </div>
              </div>

              {compareRow._ai_reasoning && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Reasoning</p>
                  <p className="text-sm text-foreground">{compareRow._ai_reasoning}</p>
                </div>
              )}

              {(compareRow._validation_status || compareRow._ai_type) && (
                <div className="text-xs">
                  <span className="text-muted-foreground mr-1">Type:</span>
                  <span className="font-medium">{String(compareRow._ai_type || compareRow._validation_status)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {compareRow && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleReject(compareRow._id)
                    setCompareRow(null)
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleConfirm(compareRow._id)
                    setCompareRow(null)
                  }}
                >
                  Accept
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export CSV</DialogTitle>
            <DialogDescription>
              Choose the delimiter for your CSV export. The best delimiter has been automatically detected based on your data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimiter</Label>
              <Select value={exportDelimiter} onValueChange={setExportDelimiter}>
                <SelectTrigger id="delimiter">
                  <SelectValue placeholder="Select delimiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selected: {getDelimiterName(exportDelimiter)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleExport(exportDelimiter)} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  )
}
