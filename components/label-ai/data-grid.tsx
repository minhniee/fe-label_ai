"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"
import { useToast } from "@/hooks/use-toast"
import { generateDatasetFromProject } from "@/app/api/project"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FilterBar } from "./filter-bar"
import { StatsBar } from "./stats-bar"
import { CompareDialog } from "./compare-dialog"
import { ExportDialog } from "./export-dialog"
import { DataGridTable } from "./data-grid-table"
import { useDebounce } from "@/hooks/use-debounce"
import {
  getRowStatus,
  internalColumns,
  getStatusBadge,
  getResultCellColor,
  getResultHighlightLabel,
  getAIValue,
} from "./data-grid-utils"

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
  originalData?: RowData[] // Add originalData for comparison
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
  originalData = [],
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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const { toast } = useToast()

  // Debounce search to avoid filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Calculate display columns (needed for search)
  const displayColumns = useMemo(() => {
    return (visibleColumns.length > 0 ? visibleColumns : columns).filter(
      (col) => !internalColumns.includes(col) && !col.startsWith("_validation_status") && !col.startsWith("_corrected_value") && !col.startsWith("__corrected_value") && col !== contextColumn && col !== resultColumn
    )
  }, [visibleColumns, columns, contextColumn, resultColumn])

  // Filter and search logic
  const filteredAllData = useMemo(() => {
    let filtered = [...allData]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((row) => {
        const status = getRowStatus(row)
        return status === statusFilter
      })
    }

    // Apply search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter((row) => {
        // Search in all visible columns
        const searchableColumns = [contextColumn, resultColumn, ...displayColumns].filter(Boolean)
        return searchableColumns.some((col) => {
          const value = String(row[col] || "").toLowerCase()
          return value.includes(query)
        })
      })
    }

    // Apply sorting
    if (sortConfig) {
      const { key, direction } = sortConfig
      filtered.sort((a, b) => {
        // Special handling for "status" sort
        if (key === "_status") {
          const statusA = getRowStatus(a)
          const statusB = getRowStatus(b)
          return direction === "asc"
            ? statusA.localeCompare(statusB)
            : statusB.localeCompare(statusA)
        }

        const valA = a[key]
        const valB = b[key]

        const aStr = valA === null || valA === undefined ? "" : String(valA)
        const bStr = valB === null || valB === undefined ? "" : String(valB)

        if (aStr < bStr) return direction === "asc" ? -1 : 1
        if (aStr > bStr) return direction === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [allData, statusFilter, debouncedSearchQuery, contextColumn, resultColumn, displayColumns, sortConfig])

  // Calculate pagination based on filtered data
  const filteredTotalPages = Math.ceil(filteredAllData.length / 50)
  const filteredCurrentPage = Math.min(currentPage, Math.max(0, filteredTotalPages - 1))
  const filteredData = filteredAllData.slice(
    filteredCurrentPage * 50,
    (filteredCurrentPage + 1) * 50
  )

  // Update page when filter changes if current page is out of bounds
  useEffect(() => {
    if (filteredCurrentPage !== currentPage && filteredTotalPages > 0) {
      onPageChange(Math.min(currentPage, filteredTotalPages - 1))
    }
  }, [filteredTotalPages, filteredCurrentPage, currentPage, onPageChange])

  const confirmedCount = manualMode
    ? filteredAllData.filter((row) => {
        const value = row[resultColumn]
        // Check if value exists and is not empty string (but allow 0, false, etc.)
        return value !== null && value !== undefined && String(value).trim() !== ""
      }).length
    : filteredAllData.filter((row) => row._confirmed).length
  const pendingOnPage = filteredData.filter((row) => row._ai_suggestion && !row._confirmed).length
  const allConfirmed = confirmedCount === filteredAllData.length && filteredAllData.length > 0
  const manualEditedCount = filteredAllData.filter((row) => row._isModified).length

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        // Toggle direction
        const nextDirection = current.direction === "asc" ? "desc" : "asc"
        return { key, direction: nextDirection }
      }
      return { key, direction: "asc" }
    })
  }

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
          // Fix: Escape special regex characters properly to prevent ReDoS
          // Handle tab character specially in regex
          let pattern: RegExp
          if (candidate.char === "\t") {
            pattern = /\t/g
          } else if (candidate.char === "|") {
            pattern = /\|/g
          } else {
            // Escape special regex characters: [\^$.*+?(){}[]|
            const escapedChar = candidate.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            pattern = new RegExp(escapedChar, "g")
          }
          const occurrences = (value.match(pattern) || []).length
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

  // Fix: Move setState out of render - use useEffect instead
  useEffect(() => {
    if (allConfirmed && !versionName) {
      setVersionName(generateVersionName())
    }
  }, [allConfirmed, versionName, datasetName])

  // Handle cell edit start
  const handleCellEditStart = useCallback(
    (rowId: string, field: string) => {
      const row = allData.find((r) => r._id === rowId) || filteredData.find((r) => r._id === rowId)
      if (row) {
        setEditingCell({ rowId, field })
      }
    },
    [allData, filteredData],
  )

  // Handle cell edit end - update parent with final value
  const handleCellEditEnd = useCallback(
    (rowId: string, field: string, newValue: string) => {
      // Compare with originalData to correctly set _isModified flag
      const originalRow = originalData.find((r) => r._id === rowId)
      const currentRow = allData.find((r) => r._id === rowId)

      // Only set _isModified if originalData exists and value actually changed
      let isActuallyModified = false
      if (originalRow && currentRow) {
        const originalValue = String(originalRow[field] ?? "").trim()
        const trimmedNewValue = String(newValue).trim()
        isActuallyModified = originalValue !== trimmedNewValue
      } else if (originalRow) {
        const originalValue = String(originalRow[field] ?? "").trim()
        const trimmedNewValue = String(newValue).trim()
        isActuallyModified = originalValue !== trimmedNewValue
      } else if (currentRow) {
        const currentValue = String(currentRow[field] ?? "").trim()
        const trimmedNewValue = String(newValue).trim()
        isActuallyModified = currentValue !== trimmedNewValue
      }

      const updatedAllData = allData.map((row) =>
        row._id === rowId
          ? {
              ...row,
              [field]: newValue,
              _isModified: isActuallyModified,
            }
          : row,
      )

      onDataUpdate(updatedAllData)

      setEditingCell(null)
    },
    [allData, originalData, onDataUpdate],
  )

  // Helper function to get AI value from various fields
  // Used by both handleConfirm and Compare Result dialog to ensure consistency
  const getAIValue = (row: RowData): string | null => {
    // Status values used for badges; allow boolean strings ("true"/"false") as valid data
    const statusValues = ["correct", "wrong", "ambiguous", "needs_label"]
    const aiSuggestion = row._ai_suggestion
    const isStatusValue = aiSuggestion && statusValues.includes(String(aiSuggestion).toLowerCase())
    
    // Try _corrected_value first (from correct_answer field)
    if (row._corrected_value) {
      const correctedVal = String(row._corrected_value).trim()
      const correctedValLower = correctedVal.toLowerCase()
      if (correctedVal && !statusValues.includes(correctedValLower)) {
        return correctedVal
      }
    }
    
    // Try _ai_suggestion if it's not a status value
    if (aiSuggestion && !isStatusValue) {
      return String(aiSuggestion).trim()
    }
    
    // Try _correct_info as fallback
    if (row._correct_info) {
      const correctInfoVal = String(row._correct_info).trim()
      const correctInfoLower = correctInfoVal.toLowerCase()
      if (correctInfoVal && !statusValues.includes(correctInfoLower)) {
        return correctInfoVal
      }
    }
    
    return null
  }

  const handleConfirm = (rowId: string) => {
    const row = allData.find((r) => r._id === rowId) || filteredData.find((r) => r._id === rowId)
    if (!row) return

    // Check _ai_type first (from auto-labeling prompt), then _validation_status
    const aiType = (row._ai_type || "").toString().toLowerCase()
    const validationStatus = (row._validation_status || "").toString().toLowerCase()
    const status = aiType || validationStatus
    const isAmbiguous = status === "ambiguous"
    const isIncorrect = status === "incorrect" || status === "wrong" || (row._ai_suggestion || "").toString().toLowerCase() === "false"
    const isCorrect = status === "correct" || status === "needs_label" || (row._ai_suggestion || "").toString().toLowerCase() === "true"

    if (isAmbiguous) {
      toast({
        title: "Ambiguous result",
        description: "AI marked this row as ambiguous. Please review manually.",
        variant: "destructive",
      })
      return
    }

    // Determine new values based on status
    const applyRowUpdate = (r: any) => {
      if (r._id !== rowId) return r
      // When confirming, prioritize correct_answer (_corrected_value) from auto-labeling prompt
      // This ensures we use the correct_answer field when user accepts
      const aiSuggestion = row._ai_suggestion
      const aiType = (row._ai_type || "").toString().toLowerCase()
      const isStatusValue = aiSuggestion && ["correct", "wrong", "ambiguous", "needs_label"].includes(String(aiSuggestion).toLowerCase())
      
      let valueToFill: string | null | undefined = row._corrected_value
      
      // Check if _corrected_value is a valid value (not empty, not null, not a status string)
      const correctedValueStr = String(valueToFill || "").trim().toLowerCase()
      const isCorrectedValueStatus = ["correct", "wrong", "ambiguous", "needs_label"].includes(correctedValueStr)
      const hasValidCorrectedValue = valueToFill && valueToFill !== "" && !isCorrectedValueStatus
      
      // Priority 1: Use _corrected_value if it's valid (this contains correct_answer from AI)
      if (hasValidCorrectedValue) {
        valueToFill = String(valueToFill).trim()
      } 
      // Priority 2: For "needs_label" type, always use AI's value (generate new label)
      // This handles case when Current is empty and AI has a value
      else if (aiType === "needs_label") {
        const aiValue = getAIValue(row)
        valueToFill = aiValue || "" // Use AI value, or empty if not found (don't fallback to current)
      }
      // Priority 3: For "correct" type, prefer AI value if available (AI verified/normalized value)
      // Otherwise keep existing value if it exists
      else if (aiType === "correct") {
        const aiValue = getAIValue(row)
        if (aiValue) {
          // Use AI value if available (even for correct type, AI might have normalized/verified value)
          valueToFill = aiValue
        } else if (r[resultColumn]) {
          // Keep existing value if no AI value available
          valueToFill = r[resultColumn]
        } else {
          // If no existing value and no AI value, leave empty
          valueToFill = ""
        }
      } 
      // Priority 4: Use _ai_suggestion if it's not a status value (i.e., it's an actual label)
      else if (aiSuggestion && !isStatusValue) {
        valueToFill = String(aiSuggestion).trim()
      } 
      // Priority 5: For "wrong" type, if no corrected_value, try to use _correct_info as fallback
      else if (aiType === "wrong") {
        const aiValue = getAIValue(row)
        valueToFill = aiValue || (r[resultColumn] || "")
      }
      // Priority 6: Keep existing value if no valid corrected value
      else {
        valueToFill = r[resultColumn] || ""
      }
      
      // Handle extra columns corrections (e.g., reference_page from documents)
      const extraCorrectedValues = row._extra_corrected_values
      const updatedRow: any = {
        ...r,
        [resultColumn]: valueToFill,
        _confirmed: true,
      }
      
      // Apply extra column corrections if present
      if (extraCorrectedValues && typeof extraCorrectedValues === 'object') {
        Object.keys(extraCorrectedValues).forEach((colName) => {
          const correctedValue = extraCorrectedValues[colName]
          if (correctedValue !== null && correctedValue !== undefined) {
            updatedRow[colName] = String(correctedValue).trim()
            console.log(`[handleConfirm] Row ${rowId}: Updating extra column '${colName}' with value '${correctedValue}'`)
          }
        })
      }
      
      // Debug logging
      console.log(`[handleConfirm] Row ${rowId}: aiType=${aiType}, _corrected_value='${row._corrected_value}', valueToFill='${valueToFill}', extra_corrected_values=`, extraCorrectedValues)
      
      if (isIncorrect || isCorrect || isAmbiguous) {
        return updatedRow
      }
      return r
    }

    const updatedAllData = allData.map(applyRowUpdate)

    onDataUpdate(updatedAllData)
    toast({
      title: "Confirmed",
      description: `Applied AI correct_answer to ${resultColumn}`,
    })
  }

  const handleConfirmManual = (rowId: string) => {
    // For manual mode: mark as confirmed when user confirms their manual edit
    const row = allData.find((r) => r._id === rowId)
    if (!row) return
    
    const updatedAllData = allData.map((r) =>
      r._id === rowId
        ? {
            ...r,
            _confirmed: true,
            // Keep row marked as modified so "Save File" detects this change.
            // The _isModified flag will be cleared after a successful save
            // in JobLabelAIPage.handleSaveFile, when data & originalData sync.
            _isModified: true,
          }
        : r,
    )
    
    onDataUpdate(updatedAllData)
    toast({
      title: "Confirmed",
      description: `Manual label has been confirmed`,
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
    const targets = filteredData.filter((row) => row._ai_suggestion && !row._confirmed)

    let applied = 0
    let ambiguous = 0

    const updatedAllData = allData.map((row) => {
      const onPage = targets.find((r) => r._id === row._id)
      if (!onPage) return row
      // Check _ai_type first (from auto-labeling prompt), then _validation_status
      const rowAiType = (row._ai_type || "").toString().toLowerCase()
      const validationStatus = (row._validation_status || "").toString().toLowerCase()
      const status = rowAiType || validationStatus
      const isAmbiguous = status === "ambiguous"
      const isIncorrect = status === "incorrect" || status === "wrong" || (row._ai_suggestion || "").toString().toLowerCase() === "false"
      const isCorrect = status === "correct" || status === "needs_label" || (row._ai_suggestion || "").toString().toLowerCase() === "true"

      if (isAmbiguous) {
        ambiguous += 1
        return row
      }
      // Use same logic as handleConfirm for consistency
      const aiSuggestion = row._ai_suggestion
      const isStatusValue = aiSuggestion && ["correct", "wrong", "ambiguous", "needs_label"].includes(String(aiSuggestion).toLowerCase())
      
      let valueToFill: string | null | undefined = row._corrected_value
      
      // Check if _corrected_value is a valid value (not empty, not null, not a status string)
      const correctedValueStr = String(valueToFill || "").trim().toLowerCase()
      const isCorrectedValueStatus = ["correct", "wrong", "ambiguous", "needs_label"].includes(correctedValueStr)
      const hasValidCorrectedValue = valueToFill && valueToFill !== "" && !isCorrectedValueStatus
      
      // Priority 1: Use _corrected_value if it's valid (this contains correct_answer from AI)
      if (hasValidCorrectedValue) {
        valueToFill = String(valueToFill).trim()
      } 
      // Priority 2: For "needs_label" type, always use AI's value (generate new label)
      else if (rowAiType === "needs_label") {
        const aiValue = getAIValue(row)
        valueToFill = aiValue || "" // Use AI value, or empty if not found (don't fallback to current)
      }
      // Priority 3: For "correct" type, prefer AI value if available (AI verified/normalized value)
      else if (rowAiType === "correct") {
        const aiValue = getAIValue(row)
        if (aiValue) {
          valueToFill = aiValue
        } else if (row[resultColumn]) {
          valueToFill = row[resultColumn]
        } else {
          valueToFill = ""
        }
      } 
      // Priority 4: Use _ai_suggestion if it's not a status value (i.e., it's an actual label)
      else if (aiSuggestion && !isStatusValue) {
        valueToFill = String(aiSuggestion).trim()
      } 
      // Priority 5: For "wrong" type, if no corrected_value, try to use _correct_info as fallback
      else if (rowAiType === "wrong") {
        const aiValue = getAIValue(row)
        valueToFill = aiValue || (row[resultColumn] || "")
      }
      // Priority 6: Keep existing value if no valid corrected value
      else {
        valueToFill = row[resultColumn] || ""
      }
      
      if (isIncorrect || isCorrect || isAmbiguous) {
        applied += 1
        
        // Handle extra columns corrections (e.g., reference_page from documents)
        const extraCorrectedValues = row._extra_corrected_values
        const updatedRow: any = {
          ...row,
          [resultColumn]: valueToFill,
          _confirmed: true,
        }
        
        // Apply extra column corrections if present
        if (extraCorrectedValues && typeof extraCorrectedValues === 'object') {
          Object.keys(extraCorrectedValues).forEach((colName) => {
            const correctedValue = extraCorrectedValues[colName]
            if (correctedValue !== null && correctedValue !== undefined) {
              updatedRow[colName] = String(correctedValue).trim()
            }
          })
        }
        
        return updatedRow
      }
      return row
    })

    onDataUpdate(updatedAllData)
    const parts = [] as string[]
    if (applied) parts.push(`${applied} applied`)
    if (ambiguous) parts.push(`${ambiguous} ambiguous skipped`)
    toast({
      title: "Confirm all",
      description: parts.length ? parts.join(", ") : "No rows to confirm",
    })
  }

  const handleRejectAll = () => {
    // Get all row IDs on current page that need rejection
    const rowIdsToReject = filteredData
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

  // Get filter counts for each status
  const getStatusCount = (status: string): number => {
    return allData.filter((row) => getRowStatus(row) === status).length
  }

  const getCellColor = (status: string | undefined, hasAISuggestion: boolean) => {
    // Fix: Only show highlight if there's actual AI validation status AND AI suggestion exists
    if (!hasAISuggestion || !status) {
      return "bg-background border-l-4 border-l-transparent"
    }
    switch (status.toLowerCase()) {
      case "correct":
        return "bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500"
      case "incorrect":
      case "wrong":
        return "bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500"
      case "ambiguous":
        return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500"
      case "needs_label":
        return "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500"
      default:
        return "bg-background border-l-4 border-l-transparent"
    }
  }

  const getCellTextColor = (status: string | undefined, hasAISuggestion: boolean) => {
    // Fix: Only show text color if there's actual AI validation status AND AI suggestion exists
    if (!hasAISuggestion || !status) {
      return ""
    }
    switch (status.toLowerCase()) {
      case "correct":
        return "text-green-900 dark:text-green-100"
      case "incorrect":
      case "wrong":
        return "text-red-900 dark:text-red-100"
      case "ambiguous":
        return "text-yellow-900 dark:text-yellow-100"
      case "needs_label":
        return "text-blue-900 dark:text-blue-100"
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {
        // allConfirmed && (
        //   <Card className="p-6 bg-success/5 border-success/20">
        //     <div className="flex items-center justify-between">
        //       <div className="space-y-1">
        //         <div className="flex items-center gap-2">
        //           <CheckCheck className="h-5 w-5 text-success" />
        //           <h3 className="font-semibold text-success">All rows confirmed!</h3>
        //         </div>
        //         <p className="text-sm text-muted-foreground">Ready to submit your validated dataset as a new version</p>
        //       </div>
        //       <div className="flex items-center gap-4">
        //         <div className="space-y-2">
        //           <Label htmlFor="version-name" className="text-sm">
        //             Version Name
        //           </Label>
        //           <Input
        //             id="version-name"
        //             value={versionName}
        //             onChange={(e) => setVersionName(e.target.value)}
        //             placeholder="Enter version name"
        //             className="w-64 font-mono"
        //           />
        //         </div>
        //         {/* <Button onClick={handleSubmit} disabled={isSubmitting || !versionName.trim()} className="gap-2 mt-7">
        //           {isSubmitting ? (
        //             <>
        //               <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        //               Submitting...
        //             </>
        //           ) : (
        //             <>
        //               <Send className="h-4 w-4" />
        //               Submit Version
        //             </>
        //           )}
        //         </Button> */}
        //       </div>
        //     </div>
        //   </Card>
        // )
        }

        <FilterBar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          totalRows={allData.length}
          filteredRows={filteredAllData.length}
          onSearchChange={(value) => {
            setSearchQuery(value)
            onPageChange(0)
          }}
          onStatusFilterChange={(value) => {
            setStatusFilter(value)
            onPageChange(0)
          }}
          onClearFilters={() => {
            setStatusFilter("all")
            setSearchQuery("")
            onPageChange(0)
          }}
          getStatusCount={getStatusCount}
        />

        <StatsBar
          confirmedCount={confirmedCount}
          totalFiltered={filteredAllData.length}
          manualMode={manualMode}
          manualEditedCount={manualEditedCount}
          pendingOnPage={pendingOnPage}
          hasAISuggestions={allData.some((row) => row._ai_suggestion)}
          onClearAllSuggestions={handleClearAllSuggestions}
          onConfirmAll={handleConfirmAll}
          onRejectAll={handleRejectAll}
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <DataGridTable
              rows={filteredData}
              displayColumns={displayColumns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              manualMode={manualMode}
              filteredCurrentPage={filteredCurrentPage}
              pageSize={50}
              hoveredCell={hoveredCell}
              setHoveredCell={setHoveredCell}
              editingCell={editingCell}
              onCellEditStart={handleCellEditStart}
              onCellEditEnd={handleCellEditEnd}
              onConfirm={handleConfirm}
              onReject={handleReject}
              setCompareRow={setCompareRow}
              getStatusBadge={getStatusBadge}
              getRowStatus={getRowStatus}
              getResultCellColor={(row) => getResultCellColor(row, manualMode)}
              getResultHighlightLabel={(row) => getResultHighlightLabel(row, manualMode)}
            />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCurrentPage * 50 + 1} to {Math.min((filteredCurrentPage + 1) * 50, filteredAllData.length)} of {filteredAllData.length}{" "}
            rows
            {(statusFilter !== "all" || searchQuery) && (
              <span className="ml-2">(filtered from {allData.length} total)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(filteredCurrentPage - 1)}
              disabled={filteredCurrentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(filteredTotalPages, 10) }, (_, i) => {
                const shouldShow = i < 3 || i >= filteredTotalPages - 3 || (i >= filteredCurrentPage - 1 && i <= filteredCurrentPage + 1)

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
                    variant={filteredCurrentPage === i ? "default" : "outline"}
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
              onClick={() => onPageChange(filteredCurrentPage + 1)}
              disabled={filteredCurrentPage === filteredTotalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CompareDialog
        row={compareRow}
        resultColumn={resultColumn}
        onClose={() => setCompareRow(null)}
        allData={allData}
        onDataUpdate={onDataUpdate}
      />

      <ExportDialog
        open={showExportDialog}
        delimiter={exportDelimiter}
        onDelimiterChange={setExportDelimiter}
        onClose={() => setShowExportDialog(false)}
        columns={columns}
        allData={allData}
      />

    </TooltipProvider>
  )
}
