/**
 * Utility functions for LabelAI components
 */

import Papa from "papaparse"

/**
 * Parse CSV from File object
 * Returns a promise that resolves with parsed data and columns
 */
export async function parseCSVFromFile(
  file: File
): Promise<{ data: any[]; columns: string[]; delimiter: string }> {
  return new Promise((resolve, reject) => {
    detectDelimiterFromFile(file)
      .then((detectedDelimiter) => {
        Papa.parse(file, {
          header: true,
          // Normalize headers: trim and strip BOM to prevent merged/misaligned columns
          transformHeader: (h) => (h || "").replace(/^\uFEFF/, "").trim(),
          delimiter: detectedDelimiter,
          // Make parsing more lenient
          transform: (value) => {
            // Trim whitespace from values
            return typeof value === "string" ? value.trim() : value
          },
          // Handle newlines in quoted fields
          newline: "\n",
          // Don't throw on field count mismatches - just log warnings
          skipEmptyLines: "greedy",
          complete: (results) => {
            try {
              // Filter out non-critical errors (like field count mismatches)
              // Only throw on critical errors that prevent parsing
              const criticalErrors = results.errors.filter(
                (error) =>
                  error.type !== "FieldMismatch" &&
                  error.type !== "Quotes" &&
                  error.code !== "TooManyFields" &&
                  error.code !== "TooFewFields"
              )

              if (criticalErrors.length > 0) {
                throw new Error(criticalErrors[0].message || "Failed to parse CSV")
              }

              // Log warnings for field mismatches but don't throw
              const warnings = results.errors.filter(
                (error) =>
                  error.type === "FieldMismatch" ||
                  error.code === "TooManyFields" ||
                  error.code === "TooFewFields"
              )
              if (warnings.length > 0) {
                console.warn("CSV parsing warnings:", warnings)
              }

              const data = results.data as any[]
              const columns = (results.meta.fields || [])
                .map((c) => (c || "").replace(/^\uFEFF/, "").trim())
                .filter((c) => c)

              if (data.length === 0) {
                throw new Error("CSV file is empty")
              }

              if (columns.length === 0) {
                throw new Error("No columns found in CSV file")
              }

              resolve({
                data,
                columns,
                delimiter: detectedDelimiter || ",",
              })
            } catch (error) {
              reject(error)
            }
          },
          error: (error) => {
            reject(new Error(error.message || "Failed to read CSV file"))
          },
        })
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Parse CSV from text string
 * Returns parsed data and columns
 */
export function parseCSVFromText(
  text: string,
  delimiter?: string
): { data: any[]; columns: string[]; delimiter: string } {
  // Detect delimiter if not provided
  const firstNonEmptyLine =
    (text || "").split(/\r?\n/).find((line) => line.trim().length > 0) || ""
  const detectedDelimiter = delimiter || detectDelimiter(firstNonEmptyLine)

  const result = Papa.parse(text, {
    header: true,
    // Normalize headers: trim and strip BOM to prevent merged/misaligned columns
    transformHeader: (h) => (h || "").replace(/^\uFEFF/, "").trim(),
    delimiter: detectedDelimiter,
    // Make parsing more lenient
    transform: (value) => {
      // Trim whitespace from values
      return typeof value === "string" ? value.trim() : value
    },
    // Handle newlines in quoted fields
    newline: "\n",
    // Don't throw on field count mismatches - just log warnings
    skipEmptyLines: "greedy",
  })

  // Filter out non-critical errors (like field count mismatches)
  // Only throw on critical errors that prevent parsing
  const criticalErrors = result.errors.filter(
    (error) =>
      error.type !== "FieldMismatch" &&
      error.type !== "Quotes" &&
      error.code !== "TooManyFields" &&
      error.code !== "TooFewFields"
  )

  if (criticalErrors.length > 0) {
    throw new Error(criticalErrors[0].message || "Failed to parse CSV")
  }

  // Log warnings for field mismatches but don't throw
  const warnings = result.errors.filter(
    (error) =>
      error.type === "FieldMismatch" ||
      error.code === "TooManyFields" ||
      error.code === "TooFewFields"
  )
  if (warnings.length > 0) {
    console.warn("CSV parsing warnings:", warnings)
  }

  const data = result.data as any[]
  const columns = (result.meta.fields || [])
    .map((c) => (c || "").replace(/^\uFEFF/, "").trim())
    .filter((c) => c)

  if (data.length === 0) {
    throw new Error("CSV text is empty")
  }

  if (columns.length === 0) {
    throw new Error("No columns found in CSV text")
  }

  return {
    data,
    columns,
    delimiter: detectedDelimiter,
  }
}

/**
 * Detect CSV delimiter from a string (first line or content)
 */
export function detectDelimiter(content: string): string {
  const header = content.replace(/^\uFEFF/, "") // Remove BOM if present
  const candidates = [",", ";", "|", "\t"]
  
  let best = { d: ",", count: -1 }
  for (const d of candidates) {
    const pattern = d === "|" ? /\|/g : d === "\t" ? /\t/g : new RegExp(`\\${d}`, "g")
    const count = (header.match(pattern) || []).length
    if (count > best.count) {
      best = { d, count }
    }
  }
  
  return best.count > 0 ? best.d : ","
}

/**
 * Detect CSV delimiter from a File (async)
 */
export async function detectDelimiterFromFile(file: File): Promise<string | undefined> {
  try {
    const blob = file.slice(0, 4096)
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })

    const firstNonEmptyLine = (text || "").split(/\r?\n/).find((l) => l.trim().length > 0) || ""
    return detectDelimiter(firstNonEmptyLine)
  } catch {
    return undefined
  }
}

/**
 * Detect best delimiter for export (checks for conflicts in data)
 */
export function detectBestDelimiterForExport(data: any[], columns: string[]): string {
  if (data.length === 0) return ","
  
  const candidates = [
    { char: ",", name: "Comma (,)" },
    { char: ";", name: "Semicolon (;)" },
    { char: "|", name: "Pipe (|)" },
    { char: "\t", name: "Tab" },
  ]
  
  // Sample first few rows to check for delimiter conflicts
  const sampleRows = data.slice(0, Math.min(10, data.length))
  const exportColumns = [...columns, "_validation_status", "_corrected_value"]
  
  // Count occurrences of each delimiter in data
  const delimiterScores = candidates.map((candidate) => {
    let conflictCount = 0
    let totalOccurrences = 0
    
    sampleRows.forEach((row) => {
      exportColumns.forEach((col) => {
        const value = String(col === "_corrected_value" ? row._corrected_value || "" : row[col] || "")
        // Handle tab character specially in regex
        let pattern: RegExp
        if (candidate.char === "\t") {
          pattern = /\t/g
        } else if (candidate.char === "|") {
          pattern = /\|/g
        } else {
          pattern = new RegExp(`\\${candidate.char}`, "g")
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

/**
 * Detect context column from a list of column names
 */
export function detectContextColumn(columns: string[]): string {
  return (
    columns.find((col) => col.toLowerCase().includes("context")) ||
    columns.find((col) => col.toLowerCase().includes("text")) ||
    columns.find((col) => col.toLowerCase().includes("description")) ||
    columns.find((col) => col.toLowerCase().includes("body")) ||
    columns.find((col) => col.toLowerCase().includes("feedback")) ||
    columns.find((col) => col.toLowerCase().includes("input")) ||
    columns[0] ||
    ""
  )
}

/**
 * Detect result column from a list of column names
 */
export function detectResultColumn(columns: string[]): string {
  return (
    columns.find((col) => col.toLowerCase().includes("result")) ||
    columns.find((col) => col.toLowerCase().includes("label")) ||
    columns.find((col) => col.toLowerCase().includes("category")) ||
    columns.find((col) => col.toLowerCase().includes("sentiment")) ||
    columns.find((col) => col.toLowerCase().includes("priority")) ||
    columns.find((col) => col.toLowerCase().includes("output")) ||
    columns[1] ||
    ""
  )
}

/**
 * Get API key from localStorage
 */
export function getApiKeyFromStorage(): string {
  try {
    return localStorage.getItem("llm_api_key") || 
           localStorage.getItem("gemini_api_key") || 
           ""
  } catch (error) {
    return ""
  }
}

/**
 * Save API key to localStorage
 */
export function saveApiKeyToStorage(apiKey: string): void {
  try {
    localStorage.setItem("llm_api_key", apiKey)
  } catch (error) {
    // Ignore localStorage errors
  }
}

/**
 * Convert data array to CSV format string
 * Handles proper escaping of commas, quotes, and newlines
 */
export function convertDataToCSV(data: any[], columns: string[]): string {
  const csvRows: string[] = []
  
  // Add header row
  csvRows.push(columns.join(","))
  
  // Add data rows
  data.forEach((row) => {
    const values = columns.map((col) => {
      const value = row[col] || ""
      // Escape commas, quotes, and newlines in CSV
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(values.join(","))
  })
  
  return csvRows.join("\n")
}

