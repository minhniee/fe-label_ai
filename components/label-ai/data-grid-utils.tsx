import { Check, Info, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"

export const internalColumns = [
  "_id",
  "_ai_suggestion",
  "_ai_reasoning",
  "_confirmed",
  "_validation_status",
  "_corrected_value",
  "__corrected_value",
  "_is_new",
]

// Status helpers
export const getRowStatus = (row: RowData): string => {
  const aiType = (row._ai_type || "").toString().toLowerCase()
  const validationStatus = (row._validation_status || "").toString().toLowerCase()
  const status = aiType || validationStatus

  if (status === "correct") return "correct"
  if (status === "incorrect" || status === "wrong") return "incorrect"
  if (status === "ambiguous") return "ambiguous"
  if (status === "needs_label") return "needs_label"
  if (row._confirmed) return "confirmed"
  if (row._ai_suggestion && !row._confirmed) return "pending"
  return "none"
}

export const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "correct":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
          <Check className="h-3 w-3" /> Correct
        </span>
      )
    case "incorrect":
    case "wrong":
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
    case "needs_label":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
          <Sparkles className="h-3 w-3" /> Needs Label
        </span>
      )
    default:
      return null
  }
}

// AI value helper shared across grid & dialogs
export const getAIValue = (row: RowData): string | null => {
  const statusValues = ["true", "false", "correct", "wrong", "ambiguous", "needs_label"]
  const aiSuggestion = row._ai_suggestion
  const isStatusValue = aiSuggestion && statusValues.includes(String(aiSuggestion).toLowerCase())

  if (row._corrected_value) {
    const correctedVal = String(row._corrected_value).trim()
    const correctedValLower = correctedVal.toLowerCase()
    if (correctedVal && !statusValues.includes(correctedValLower)) {
      return correctedVal
    }
  }

  if (aiSuggestion && !isStatusValue) {
    return String(aiSuggestion).trim()
  }

  if (row._correct_info) {
    const correctInfoVal = String(row._correct_info).trim()
    const correctInfoLower = correctInfoVal.toLowerCase()
    if (correctInfoVal && !statusValues.includes(correctInfoLower)) {
      return correctInfoVal
    }
  }

  return null
}

// Result cell highlighting
export const getResultCellColor = (row: RowData, manualMode?: boolean) => {
  if (manualMode && row._isModified) {
    return "bg-blue-200 dark:bg-blue-900/40 border-blue-500"
  }

  if (row._confirmed) {
    return "bg-green-50 dark:bg-green-950/30 border-green-500"
  }

  const hasAISuggestion = !!(row._ai_suggestion || row._ai_reasoning)
  if (!hasAISuggestion) {
    return ""
  }

  const aiType = String(row._ai_type || "").toLowerCase()
  const validation = String(row._validation_status || "").toLowerCase()
  const ai = String(row._ai_suggestion || "").toLowerCase()

  let status = ""
  if (aiType) {
    status = aiType === "wrong" ? "incorrect" : aiType
  } else if (validation) {
    status = validation
  } else {
    status =
      ai === "true"
        ? "correct"
        : ai === "false"
        ? "incorrect"
        : ai === "ambiguous"
        ? "ambiguous"
        : ""
  }

  switch (status) {
    case "correct":
      return "bg-green-50 dark:bg-green-950/30 border-green-500"
    case "incorrect":
    case "wrong":
      return "bg-red-50 dark:bg-red-950/30 border-red-500"
    case "ambiguous":
      return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500"
    case "needs_label":
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-500"
    default:
      return ""
  }
}

export const getResultHighlightLabel = (row: RowData, manualMode?: boolean): string | null => {
  if (manualMode && row._isModified) return "Manual edited"
  if (row._confirmed) return "Confirmed"

  const hasAISuggestion = !!(row._ai_suggestion || row._ai_reasoning)
  if (!hasAISuggestion) return null

  const aiType = String(row._ai_type || "").toLowerCase()
  const validation = String(row._validation_status || "").toLowerCase()
  const ai = String(row._ai_suggestion || "").toLowerCase()

  let status = ""
  if (aiType) {
    status = aiType === "wrong" ? "incorrect" : aiType
  } else if (validation) {
    status = validation
  } else {
    status =
      ai === "true"
        ? "correct"
        : ai === "false"
        ? "incorrect"
        : ai === "ambiguous"
        ? "ambiguous"
        : ""
  }

  switch (status) {
    case "correct":
      return "AI marked this as correct"
    case "incorrect":
    case "wrong":
      return "AI marked this as incorrect"
    case "ambiguous":
      return "AI marked this as ambiguous"
    case "needs_label":
      return "AI suggests this needs a new label"
    default:
      return null
  }
}

// Export helpers
export const getDelimiterName = (delimiter: string): string => {
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

export const handleExportCsv = (allData: RowData[], columns: string[], selectedDelimiter: string) => {
  const exportColumns = [...columns, "_validation_status", "_corrected_value"]
  const csv = [
    exportColumns.join(selectedDelimiter),
    ...allData.map((row) =>
      exportColumns
        .map((col) => {
          const value = col === "_corrected_value" ? row._corrected_value || "" : row[col] || ""
          const stringValue = String(value)
          const needsQuotes =
            stringValue.includes(selectedDelimiter) ||
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
  const blob = new Blob([csv], {
    type: selectedDelimiter === "\t" ? "text/tab-separated-values" : "text/csv",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `validated-data.${fileExtension}`
  a.click()
  URL.revokeObjectURL(url)
}

// Row update helpers to keep logic reusable (e.g. for dialog)
export const handleRejectRow = (allData: RowData[], rowId: string): RowData[] => {
  return allData.map((r) =>
    r._id === rowId
      ? {
          ...r,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
        }
      : r,
  )
}

export const handleConfirmRow = (allData: RowData[], rowId: string, resultColumn: string): RowData[] => {
  return allData.map((row) => {
    if (row._id !== rowId) return row

    const aiType = (row._ai_type || "").toString().toLowerCase()
    const validationStatus = (row._validation_status || "").toString().toLowerCase()
    const status = aiType || validationStatus
    const isAmbiguous = status === "ambiguous"
    const isIncorrect =
      status === "incorrect" ||
      status === "wrong" ||
      (row._ai_suggestion || "").toString().toLowerCase() === "false"
    const isCorrect =
      status === "correct" ||
      status === "needs_label" ||
      (row._ai_suggestion || "").toString().toLowerCase() === "true"

    if (isAmbiguous) {
      return row
    }

    const aiSuggestion = row._ai_suggestion
    const isStatusValue =
      aiSuggestion &&
      ["true", "false", "correct", "wrong", "ambiguous", "needs_label"].includes(
        String(aiSuggestion).toLowerCase(),
      )

    let valueToFill: string | null | undefined = row._corrected_value

    const correctedValueStr = String(valueToFill || "").trim().toLowerCase()
    const isCorrectedValueStatus = ["true", "false", "correct", "wrong", "ambiguous", "needs_label"].includes(
      correctedValueStr,
    )
    const hasValidCorrectedValue = valueToFill && valueToFill !== "" && !isCorrectedValueStatus

    if (hasValidCorrectedValue) {
      valueToFill = String(valueToFill).trim()
    } else if (aiType === "needs_label") {
      const aiValue = getAIValue(row)
      valueToFill = aiValue || ""
    } else if (aiType === "correct") {
      const aiValue = getAIValue(row)
      if (aiValue) {
        valueToFill = aiValue
      } else if (row[resultColumn]) {
        valueToFill = row[resultColumn]
      } else {
        valueToFill = ""
      }
    } else if (aiSuggestion && !isStatusValue) {
      valueToFill = String(aiSuggestion).trim()
    } else if (aiType === "wrong") {
      const aiValue = getAIValue(row)
      valueToFill = aiValue || (row[resultColumn] || "")
    } else {
      valueToFill = row[resultColumn] || ""
    }

    const extraCorrectedValues = row._extra_corrected_values
    const updatedRow: any = {
      ...row,
      [resultColumn]: valueToFill,
      _confirmed: true,
    }

    if (extraCorrectedValues && typeof extraCorrectedValues === "object") {
      Object.keys(extraCorrectedValues).forEach((colName) => {
        const correctedValue = extraCorrectedValues[colName]
        if (correctedValue !== null && correctedValue !== undefined) {
          updatedRow[colName] = String(correctedValue).trim()
        }
      })
    }

    if (isIncorrect || isCorrect || isAmbiguous) {
      return updatedRow
    }

    return row
  })
}

// Basic className passthrough for future virtualization-aware table
export const tableCellClass = (...classes: (string | false | null | undefined)[]) =>
  cn("px-4 py-3 text-sm", classes.filter(Boolean).join(" "))


