"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataGrid } from "@/components/label-ai/data-grid"
import { ModelSelector } from "@/components/label-ai/model-selector"
import { ColumnSelector } from "@/components/label-ai/column-selector"
import { ReferenceUploader } from "@/components/label-ai/reference-uploader"
import { DocumentRAGManager } from "@/components/label-ai/document-rag-manager"
import { Loader2, ArrowLeft, Save, CheckCircle2, Settings2, Search, X, History } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchFilter } from "@/components/label-ai/search-filter"
// import { SemanticSearchFilter } from "@/components/label-ai/semantic-search-filter"
import { ColumnVisibility } from "@/components/label-ai/column-visibility"
import { DataManager } from "@/components/label-ai/data-manager"
import { ColumnManager } from "@/components/label-ai/column-manager"
import { DatasetSelector } from "@/components/label-ai/dataset-selector"
import { ErrorBoundary } from "@/components/error-boundary"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAnnotationHistory, AnnotationHistoryEntry } from "@/app/api/annotation"
import { getDatasetVersionData } from "@/app/api/labelai"
import { getVersionFiles, uploadFileToDataset } from "@/app/api/dataset"
import { getProjectFiles, generateDatasetFromProject } from "@/app/api/project"
import { completeBatch } from "@/app/api/batch"
import { getFilePreview } from "@/app/api/dataset"
import { slugToProjectId } from "@/types/project"
import axios from "axios"
import { detectContextColumn, detectResultColumn, parseCSVFromText } from "@/lib/label-ai-utils"

// Get API base at runtime, not build time
function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE.trim();
    if (apiBase) {
      return apiBase;
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback default for server-side rendering
  return "http://localhost:8000";
}

// Helper to get file content from annotation API
const getFileContentFromAnnotation = async (fileId: number) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  
  const response = await axios.get(`${getApiBase()}/annotations/files/${fileId}/content`, {
    headers,
    withCredentials: true,
  })
  return response.data
}

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _ai_reasoning?: string
  _confirmed?: boolean
  _isModified?: boolean  // Track if row has been modified
  [key: string]: any
}

// Helper to build a stable localStorage key for drafts
const getDraftStorageKey = (
  projectId: string | number,
  batchId?: string,
  fileId?: number | null,
) => {
  const base = `labelai_draft_${projectId}`
  if (batchId && fileId) return `${base}_batch_${batchId}_file_${fileId}`
  if (batchId) return `${base}_batch_${batchId}`
  if (fileId) return `${base}_file_${fileId}`
  return base
}

export default function JobLabelAIPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectSlug = params.projectId as string
  const projectId = slugToProjectId(projectSlug)
  
  // Get batch information from route params [jobId]
  const jobId = params.jobId as string | undefined
  const batchId = jobId
  const fileIdsParam = searchParams.get("fileIds")
  const jobName = searchParams.get("jobName")
  
  const [data, setData] = useState<RowData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [datasetName, setDatasetName] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(0)
  const [contextColumn, setContextColumn] = useState<string>("")
  const [resultColumn, setResultColumn] = useState<string>("")
  const [referenceContext, setReferenceContext] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [newDatasetName, setNewDatasetName] = useState("")
  const [newDatasetDescription, setNewDatasetDescription] = useState("")
  
  // Use custom debounce hook for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  const [semanticSearchResults, setSemanticSearchResults] = useState<any[]>([])
  const [currentFileId, setCurrentFileId] = useState<number | null>(null)
  const [batchFiles, setBatchFiles] = useState<any[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const { toast } = useToast()
  const rowsPerPage = 50
  const [embeddingConfig, setEmbeddingConfig] = useState<{
    provider: string
    apiKey?: string
    model?: string
  }>({ provider: "local" })
  const [hasProjectDocuments, setHasProjectDocuments] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [enableDocumentRAG, setEnableDocumentRAG] = useState(false)
  const [enableReferenceDocuments, setEnableReferenceDocuments] = useState(false)
  const [fileDelimiter, setFileDelimiter] = useState<string>(",")
  const [originalData, setOriginalData] = useState<RowData[]>([])
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [lastLocalDraftSavedAt, setLastLocalDraftSavedAt] = useState<Date | null>(null)
  const [hasAutoOpenedQuickActions, setHasAutoOpenedQuickActions] = useState(false)
  const loadingFileRef = useRef<number | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<AnnotationHistoryEntry[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const hasUnsavedChanges = useMemo(
    () => data.some((row) => row._isModified || (row as any)._is_new),
    [data],
  )

  // Sync originalData when data changes significantly
  useEffect(() => {
    if (data.length === 0 || originalData.length === 0 || data.length === originalData.length) {
      return
    }
    
    const lengthDiff = Math.abs(data.length - originalData.length)
    if (lengthDiff <= originalData.length * 0.1) {
      return
    }
    
    const originalIds = new Set(originalData.map(orig => orig._id))
    const hasNewRows = data.some(row => !originalIds.has(row._id))
    
    if (hasNewRows) {
      setOriginalData(data.map(({ _isModified, ...rest }) => rest))
    }
  }, [data.length, originalData.length, data, originalData])

  // Warn user when leaving page with unsaved changes and persist a final draft
  useEffect(() => {
    if (typeof window === "undefined") return

    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return

      // Best-effort: persist latest modified rows synchronously before unload
      try {
        if (currentFileId) {
          const storageKey = getDraftStorageKey(projectId, batchId, currentFileId)
          const modifiedRowsWithIndex = data
            .map((row, index) =>
              row._isModified || (row as any)._is_new
                ? {
                    rowIndex: index,
                    row,
                  }
                : null,
            )
            .filter((entry): entry is { rowIndex: number; row: RowData } => entry !== null)

          if (modifiedRowsWithIndex.length > 0) {
            const payload = {
              rows: modifiedRowsWithIndex,
              updatedAt: new Date().toISOString(),
            }
            window.localStorage.setItem(storageKey, JSON.stringify(payload))
          }
        }
      } catch (err) {
        console.warn("Failed to persist draft on beforeunload:", err)
      }

      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handler)

    return () => {
      window.removeEventListener("beforeunload", handler)
    }
  }, [hasUnsavedChanges, data, currentFileId, projectId, batchId])

  const loadBatchFiles = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!fileIdsParam) {
        throw new Error("Missing fileIds")
      }
      const fileIds: number[] = JSON.parse(fileIdsParam)
      
      const allFiles = await getProjectFiles(parseInt(projectId))
      const batchFileList = allFiles.filter(f => fileIds.includes(f.file_id))
      
      setBatchFiles(batchFileList)
      setDatasetName(jobName || `Batch ${batchId}`)
      
      if (batchFileList.length > 0) {
        await loadFileData(batchFileList[0], 0)
      } else {
        toast({
          title: "No files found",
          description: "No files available in this batch.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to load batch files:", error)
      toast({
        title: "Error",
        description: "Failed to load batch files",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [batchId, fileIdsParam, projectId, jobName])

  useEffect(() => {
    if (batchId && fileIdsParam && projectId) {
      loadBatchFiles()
    }
  }, [batchId, fileIdsParam, projectId, loadBatchFiles])

  const fetchHistory = useCallback(
    async (fileId?: number) => {
      const targetFileId = fileId ?? currentFileId
      if (!targetFileId) return

      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const entries = await getAnnotationHistory(targetFileId, { limit: 50 })
        setHistoryEntries(entries)
      } catch (error: any) {
        const message = error?.message || "Failed to load label history"
        setHistoryError(message)
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        })
      } finally {
        setHistoryLoading(false)
      }
    },
    [currentFileId, toast],
  )

  const loadFileData = async (file: any, fileIndex: number) => {
    // Prevent duplicate calls for the same file
    if (loadingFileRef.current === file.file_id) {
      return
    }
    
    try {
      loadingFileRef.current = file.file_id
      setLoading(true)
      setCurrentFileIndex(fileIndex)
      setCurrentFileId(file.file_id)
      
      let headers: string[] = []
      let rows: any[] = []
      
      try {
        try {
          const annotationContent = await getFileContentFromAnnotation(file.file_id)
          
          if (annotationContent.content) {
            const contentStr = typeof annotationContent.content === 'string' 
              ? annotationContent.content 
              : JSON.stringify(annotationContent.content)
            
            const parsed = parseCSVFromText(contentStr)
            setFileDelimiter(parsed.delimiter)
            
            const metadataMapping: Record<string, string> = {
              "ai_suggestion": "_ai_suggestion",
              "ai_reasoning": "_ai_reasoning",
              "ai_corrected_value": "_corrected_value",
              "ai_validation_status": "_validation_status",
              "ai_type": "_ai_type",
              "ai_confidence": "_ai_confidence",
            }
            
            const metadataColumns = Object.keys(metadataMapping)
            // First, map CSV metadata columns to internal fields in parsed.data
            parsed.data = parsed.data.map((row: any) => {
              const restoredRow: any = { ...row }
              metadataColumns.forEach(csvCol => {
                // Map even if empty string to ensure _corrected_value is always set (can be empty)
                if (row[csvCol] !== undefined && row[csvCol] !== null) {
                  const internalKey = metadataMapping[csvCol]
                  // Preserve empty string for _corrected_value to allow proper handling
                  restoredRow[internalKey] = row[csvCol] === "" ? "" : String(row[csvCol])
                } else {
                  // Initialize with empty string if not present to ensure field exists
                  const internalKey = metadataMapping[csvCol]
                  if (!(internalKey in restoredRow)) {
                    restoredRow[internalKey] = ""
                  }
                }
              })
              return restoredRow
            })
            
            // Build headers: regular columns + internal metadata fields
            const regularColumns = parsed.columns.filter((h: string) => !metadataColumns.includes(h))
            const internalMetadataFields = Object.values(metadataMapping)
            headers = [...regularColumns, ...internalMetadataFields]
            
            // Convert rows to array format with all headers (including metadata)
            rows = parsed.data.map((row: any) => {
              return headers.map((header: string) => {
                // For internal metadata fields, get from restoredRow directly
                if (header.startsWith("_")) {
                  return String(row[header] || "")
                }
                // For regular columns, get from row
                return String(row[header] || "")
              })
            })
          } else if (annotationContent.headers && annotationContent.rows) {
            headers = annotationContent.headers
            rows = annotationContent.rows
          }
        } catch (annotationError) {
          console.log("Annotation API failed, trying dataset API:", annotationError)
          
          const preview = await getFilePreview(file.file_id, 1000)
          headers = preview.headers || []
          rows = preview.rows || []
        }
      } catch (error) {
        console.error("Failed to get file content:", error)
        toast({
          title: "Error",
          description: `Failed to load file content: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        })
        return
      }

      if (headers.length === 0 && Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
        headers = Object.keys(rows[0] as Record<string, unknown>)
        rows = (rows as Record<string, unknown>[]).map((r) => headers.map((h) => (r[h] ?? "") as string))
      }

      if (headers.length === 0 || !Array.isArray(rows) || rows.length === 0) {
        toast({
          title: "Empty file",
          description: "This file has no content to label.",
          variant: "destructive",
        })
        return
      }
      
      const internalColumns = ["_id", "_ai_suggestion", "_ai_reasoning", "_confirmed", "_validation_status", "_corrected_value", "_ai_type", "_ai_confidence"]
      const displayHeaders = headers.filter(h => !internalColumns.includes(h) && !h.startsWith("_"))
      setColumns(displayHeaders)
      
      const detectedContextCol = detectContextColumn(displayHeaders)
      const detectedResultCol = detectResultColumn(displayHeaders)
      
      setContextColumn(detectedContextCol)
      setResultColumn(detectedResultCol)
      setVisibleColumns([detectedContextCol, detectedResultCol])
      
      // Transform rows to RowData format - ensure all metadata fields are preserved
      let transformedData: RowData[] = rows.map((row: any, index: number) => {
        // Initialize with default values (same as AI Labeling Mode)
        const rowObj: RowData = {
          _id: `row-${index}`,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
          _corrected_value: "",
          _validation_status: "",
          _ai_type: "",
          _ai_confidence: undefined,
        }
        
        if (Array.isArray(row)) {
          // Map from array using headers (which now includes all metadata fields)
          headers.forEach((header, i) => {
            const value = row[i]
            if (header.startsWith("_")) {
              // For internal metadata fields, preserve exactly as is (including empty strings)
              rowObj[header as keyof RowData] = value !== undefined && value !== null ? String(value) : ""
            } else {
              // For regular columns
              rowObj[header] = value !== undefined && value !== null ? String(value) : ""
            }
          })
        } else if (row && typeof row === "object") {
          // Map from object - ensure all fields are copied
          Object.keys(row).forEach((key) => {
            const value = row[key]
            if (key.startsWith("_")) {
              // For internal metadata fields, preserve exactly as is
              rowObj[key as keyof RowData] = value !== undefined && value !== null ? String(value) : ""
            } else {
              // For regular columns
              rowObj[key] = value !== undefined && value !== null ? String(value) : ""
            }
          })
        }
        
        // Set _confirmed based on _ai_suggestion (same logic as AI Labeling Mode)
        if (rowObj._ai_suggestion && rowObj._ai_suggestion.toString().trim() !== "") {
          rowObj._confirmed = false
        }
        
        return rowObj
      })

      // Try to restore local draft for this file (if any)
      if (typeof window !== "undefined") {
        try {
          const storageKey = getDraftStorageKey(projectId, batchId, file.file_id)
          const draftJson = localStorage.getItem(storageKey)
          if (draftJson) {
            const draft = JSON.parse(draftJson) as {
              // New format (forward compatible):
              // rows: Array<{ rowIndex?: number; row: RowData }>
              // Old format (backward compatible):
              // rows: RowData[]
              rows?: Array<RowData | { rowIndex?: number; row: RowData }>
              updatedAt?: string
            }
            if (draft.rows && Array.isArray(draft.rows) && draft.rows.length > 0) {
              // Automatically restore draft without relying on browser confirm dialogs,
              // which can be blocked in some cases.
              let appliedCount = 0
              const first = draft.rows[0] as any
              const hasRowIndex = first && typeof first.rowIndex === "number" && first.row

              if (hasRowIndex) {
                ;(draft.rows as any[]).forEach((entry) => {
                  const rowIndex = entry.rowIndex as number
                  const draftRow = entry.row as RowData
                  if (Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < transformedData.length) {
                    transformedData[rowIndex] = {
                      ...transformedData[rowIndex],
                      ...draftRow,
                      _isModified: true,
                    }
                    appliedCount++
                  }
                })
              } else {
                // Backward-compatible: match by _id
                const draftById = new Map((draft.rows as RowData[]).map((r) => [r._id, r]))
                for (let i = 0; i < transformedData.length; i++) {
                  const draftRow = draftById.get(transformedData[i]._id)
                  if (draftRow) {
                    transformedData[i] = {
                      ...transformedData[i],
                      ...draftRow,
                      _isModified: true,
                    }
                    appliedCount++
                  }
                }
              }

              // If for some reason nothing was applied (e.g. _id mismatch),
              // fall back to using draft.rows directly so user never loses work.
              if (appliedCount === 0) {
                transformedData = (draft.rows as Array<RowData | { row: RowData }>).map((item, index) => {
                  const row =
                    (item as any).row && typeof (item as any).row === "object"
                      ? ((item as any).row as RowData)
                      : (item as RowData)

                  const safeId = row._id || `row-${index}`

                  return {
                    ...row,
                    _id: safeId,
                    _isModified: true,
                  }
                })
              }

              if (draft.updatedAt) {
                setLastLocalDraftSavedAt(new Date(draft.updatedAt))
              }

              toast({
                title: "Local draft restored",
                description: `Restored ${appliedCount || draft.rows.length} unsaved row(s) from your last session.`,
              })
            }
          }
        } catch (e) {
          console.warn("Failed to restore draft from localStorage:", e)
        }
      }

      setData(transformedData)
      setOriginalData(transformedData)
      setCurrentPage(0)
      
      toast({
        title: "File loaded",
        description: `Loaded ${file.filename || file.file_name || 'file'} with ${transformedData.length} rows`,
      })
    } catch (error) {
      console.error("Failed to load file:", error)
      toast({
        title: "Error",
        description: "Failed to load file data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      loadingFileRef.current = null
    }
  }

  const handleNextFile = () => {
    if (currentFileIndex < batchFiles.length - 1) {
      loadFileData(batchFiles[currentFileIndex + 1], currentFileIndex + 1)
    }
  }

  const handlePreviousFile = () => {
    if (currentFileIndex > 0) {
      loadFileData(batchFiles[currentFileIndex - 1], currentFileIndex - 1)
    }
  }

  const handleVersionSelect = async (datasetId: string, versionId: string) => {
    try {
      setLoading(true)
      const result = await getDatasetVersionData(datasetId, versionId)

      if (result.success) {
        const datasetData = result.data

        try {
          const files = await getVersionFiles(parseInt(versionId))
          if (files && files.length > 0 && files[0].file_id) {
            setCurrentFileId(files[0].file_id)
          } else {
            setCurrentFileId(null)
          }
        } catch (error) {
          console.error("Error getting file_id:", error)
          setCurrentFileId(null)
        }

        const datasetColumns = Object.keys(datasetData[0] || {})
        setColumns(datasetColumns)

        const detectedContextCol = detectContextColumn(datasetColumns)
        const detectedResultCol = detectResultColumn(datasetColumns)

        setContextColumn(detectedContextCol)
        setResultColumn(detectedResultCol)
        setVisibleColumns([detectedContextCol, detectedResultCol])

        const transformedData: RowData[] = datasetData.map((row: any, index: number) => ({
          _id: `row-${index}`,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
          ...row,
        }))

        setData(transformedData)
        setDatasetName(`${datasetId} - v${versionId}`)
        setCurrentPage(0)
        setSemanticSearchResults([])

        toast({
          title: "Dataset loaded",
          description: `Successfully loaded ${transformedData.length} rows`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load dataset",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading dataset:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load dataset"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setData([])
    setColumns([])
    setDatasetName("")
    setCurrentPage(0)
    setContextColumn("")
    setResultColumn("")
    setCurrentFileId(null)
    setSemanticSearchResults([])
    setSearchQuery("")
  }

  const handleFileUpload = (uploadedData: any[], uploadedColumns: string[], fileName: string) => {
    setColumns(uploadedColumns)

    const detectedContextCol = detectContextColumn(uploadedColumns)
    const detectedResultCol = detectResultColumn(uploadedColumns)

    setContextColumn(detectedContextCol)
    setResultColumn(detectedResultCol)
    setVisibleColumns([detectedContextCol, detectedResultCol])

    const transformedData: RowData[] = uploadedData.map((row: any, index: number) => ({
      _id: `row-${index}`,
      _ai_suggestion: "",
      _ai_reasoning: "",
      _confirmed: false,
      ...row,
    }))

    setData(transformedData)
    setDatasetName(fileName.replace(".csv", ""))
    setCurrentPage(0)
  }

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (semanticSearchResults.length > 0) {
        const rowIndex = parseInt(row._id.replace("row-", ""))
        const isInSemanticResults = semanticSearchResults.some(
          (result) => result.row_index === rowIndex
        )
        if (!isInSemanticResults) return false
      }
      
      if (!debouncedSearchQuery.trim()) return true
      const query = debouncedSearchQuery.toLowerCase()
      return Object.values(row).some((value) => String(value).toLowerCase().includes(query))
    })
  }, [data, semanticSearchResults, debouncedSearchQuery])

  const paginatedData = useMemo(
    () => filteredData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage),
    [filteredData, currentPage, rowsPerPage]
  )
  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const handleAddRow = (row: RowData) => {
    setData([...data, row])
  }

  const handleAddColumn = (columnName: string) => {
    setColumns([...columns, columnName])
    setVisibleColumns([...visibleColumns, columnName])
    // Mark all rows as modified when column structure changes
    const updatedData = data.map((row) => ({
      ...row,
      [columnName]: "",
      _isModified: true, // Mark as modified since structure changed
    }))
    setData(updatedData)
  }

  const handleColumnsUpdate = (newColumns: string[]) => {
    setColumns(newColumns)
    const updatedVisibleColumns = visibleColumns.filter((col) => newColumns.includes(col))
    const newCols = newColumns.filter((col) => !visibleColumns.includes(col))
    setVisibleColumns([...updatedVisibleColumns, ...newCols])
  }

  const handleGenerateMore = (newRows: RowData[]) => {
    // Mark new rows as modified so they get saved
    const markedNewRows = newRows.map((row) => ({
      ...row,
      _isModified: true, // Mark as modified so they get saved
    }))
    setData([...data, ...markedNewRows])
  }

  const isRowModified = (original: RowData | undefined, current: RowData): boolean => {
    if (!original) return true
    
    // Only compare data fields (non-meta fields), ignore meta fields like _isModified, _ai_suggestion, etc.
    const origDataFields: Record<string, any> = {}
    const currDataFields: Record<string, any> = {}
    
    Object.keys(original).forEach((k) => {
      if (!k.startsWith("_")) {
        origDataFields[k] = original[k]
      }
    })
    
    Object.keys(current).forEach((k) => {
      if (!k.startsWith("_")) {
        currDataFields[k] = current[k]
      }
    })
    
    // Compare only data fields
    return JSON.stringify(origDataFields) !== JSON.stringify(currDataFields)
  }

  const convertDataToCSV = (dataRows: RowData[], columnsList: string[], delimiter: string = ","): string => {
    const allColumnsFromData = new Set<string>()
    dataRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!key.startsWith("_")) {
          allColumnsFromData.add(key)
        }
      })
    })
    
    const allColumns = new Set([...columnsList, ...Array.from(allColumnsFromData)])
    const exportColumns = Array.from(allColumns).filter(col => !col.startsWith("_"))
    const header = exportColumns.join(delimiter)
    
    const originalDataMap = new Map(originalData.map(r => [r._id, r]))
    
    const finalData = dataRows.map((row) => {
      const originalRow = originalDataMap.get(row._id)
      if (originalRow) {
        return { ...originalRow, ...row }
      }
      return row
    })
    
    const rows = finalData.map((row) => {
      return exportColumns
        .map((col) => {
          const value = row[col] || ""
          const stringValue = String(value)
          const needsQuotes = stringValue.includes(delimiter) || 
                             stringValue.includes("\n") || 
                             stringValue.includes("\r") || 
                             stringValue.includes('"')
          if (needsQuotes) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(delimiter)
    })
    
    return [header, ...rows].join("\n")
  }

  // Auto-open Quick Actions popover when data is loaded for the first time
  useEffect(() => {
    if (data.length > 0 && !hasAutoOpenedQuickActions && !isQuickActionsOpen) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setIsQuickActionsOpen(true)
        setHasAutoOpenedQuickActions(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data.length, hasAutoOpenedQuickActions, isQuickActionsOpen])

  // Auto-save modified rows to localStorage as draft
  useEffect(() => {
    if (typeof window === "undefined" || !currentFileId) return

    const storageKey = getDraftStorageKey(projectId, batchId, currentFileId)
    const modifiedRowsWithIndex = data
      .map((row, index) =>
        row._isModified || (row as any)._is_new
          ? {
              rowIndex: index,
              row,
            }
          : null,
      )
      .filter((entry): entry is { rowIndex: number; row: RowData } => entry !== null)

    // Nếu hiện tại không có row nào được sửa, **không** động vào draft cũ trong localStorage.
    // Việc xóa draft chỉ nên làm sau khi Save File thành công, để tránh mất draft khi reload.
    if (modifiedRowsWithIndex.length > 0) {
      const payload = {
        rows: modifiedRowsWithIndex,
        updatedAt: new Date().toISOString(),
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(payload))
        setLastLocalDraftSavedAt(new Date())
      } catch (e) {
        console.warn("Failed to save draft to localStorage:", e)
      }
    }
  }, [data, currentFileId, projectId, batchId])

  const handleSaveFile = async () => {
    if (saving) {
      toast({
        title: "Saving in progress",
        description: "Please wait for the current save operation to complete.",
        variant: "destructive",
      })
      return
    }

    if (!currentFileId) {
      toast({
        title: "Error",
        description: "No file selected to save",
        variant: "destructive",
      })
      return
    }

    if (data.length === 0) {
      toast({
        title: "Error",
        description: "No data to save",
        variant: "destructive",
      })
      return
    }

    // Check for modifications: rows with _isModified or new rows (_is_new)
    const modifiedRows = data.filter(row => row._isModified || row._is_new)
    if (modifiedRows.length === 0) {
      toast({
        title: "No changes",
        description: "No modifications to save",
      })
      return
    }

    try {
      setSaving(true)
      
      const delimiter = fileDelimiter || ","
      const csvContent = convertDataToCSV(data, columns, delimiter)
      
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await axios.put(
        `${getApiBase()}/annotations/files/${currentFileId}/content`,
        {
          content: csvContent,
          headers: columns.filter(col => !col.startsWith("_"))
        },
        {
          headers,
          withCredentials: true,
        }
      )
      
      if (response.data.success) {
        const savedData = data.map(row => {
          const { _isModified, _is_new, ...rest } = row
          return rest
        })
        setData(savedData)
        setOriginalData(savedData)

        // Clear local draft after successful save
        if (typeof window !== "undefined" && currentFileId) {
          const storageKey = getDraftStorageKey(projectId, batchId, currentFileId)
          localStorage.removeItem(storageKey)
        }
        
        // Refresh server components to reflect saved changes
        router.refresh()
        
        toast({
          title: "Success",
          description: `File saved successfully. ${modifiedRows.length} rows saved.`,
        })
      } else {
        throw new Error(response.data.error || "Failed to save file")
      }
    } catch (error) {
      console.error("Failed to save file:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenHistory = async () => {
    if (!currentFileId) {
      toast({
        title: "No file selected",
        description: "Select a file to view its label history.",
        variant: "destructive",
      })
      return
    }
    setIsHistoryOpen(true)
    await fetchHistory(currentFileId)
  }

  const handleMarkJobCompleted = async () => {
    if (!batchId) {
      toast({
        title: "Job context missing",
        description: "This action is only available when labeling an assigned job.",
        variant: "destructive",
      })
      return
    }

    // Auto-save file before completing if there are unsaved changes and currentFileId exists
    if (currentFileId) {
      const hasUnsavedChanges = data.some(row => row._isModified || row._is_new)
      if (hasUnsavedChanges) {
        // Wait for any ongoing save to complete
        while (saving) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        try {
          await handleSaveFile()
          // Wait a bit for save to complete and state to update
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          // If save fails, ask user if they want to continue
          const shouldContinue = window.confirm(
            "Failed to save file. Do you want to continue marking job as completed anyway? " +
            "Unsaved changes will not be included."
          )
          if (!shouldContinue) {
            return
          }
        }
      }
    }

    try {
      await completeBatch(parseInt(batchId))
      toast({
        title: "Job marked as completed",
        description: "This job has been moved to the Dataset column.",
      })
      router.push(`/${projectSlug}/annotate`)
    } catch (error: any) {
      console.error("Failed to complete batch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to mark job as completed.",
        variant: "destructive",
      })
    }
  }

  const handleComplete = async () => {
    const trimmedName = newDatasetName.trim()
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a dataset name",
        variant: "destructive",
      })
      return
    }

    if (data.length === 0) {
      toast({
        title: "Error",
        description: "No labeled data available to export",
        variant: "destructive",
      })
      return
    }

    const exportableColumns = columns.filter((col) => !col.startsWith("_"))
    if (exportableColumns.length === 0) {
      toast({
        title: "Error",
        description: "No exportable columns were found",
        variant: "destructive",
      })
      return
    }

    // Auto-save file before completing if there are unsaved changes and currentFileId exists
    if (currentFileId) {
      const hasUnsavedChanges = data.some(row => row._isModified || row._is_new)
      if (hasUnsavedChanges) {
        // Wait for any ongoing save to complete
        while (saving) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        try {
          await handleSaveFile()
          // Wait a bit for save to complete and state to update
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          // If save fails, ask user if they want to continue
          const shouldContinue = window.confirm(
            "Failed to save file. Do you want to continue creating dataset anyway? " +
            "Unsaved changes will not be included in the dataset."
          )
          if (!shouldContinue) {
            return
          }
        }
      }
    }

    try {
      setCompleting(true)

      const datasetResult = await generateDatasetFromProject(parseInt(projectId), {
        dataset_name: trimmedName,
        dataset_description: newDatasetDescription.trim() || undefined,
        export_type: "full",
        copy_permissions: true,
      })

      if (!datasetResult?.dataset_id) {
        throw new Error("Dataset was created but no dataset_id was returned")
      }

      const csvContent = convertDataToCSV(data, columns, fileDelimiter || ",")
      if (!csvContent) {
        throw new Error("Failed to build dataset CSV content")
      }

      const safeDatasetSlug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `dataset-${datasetResult.dataset_id}`

      const csvFile = new File(
        [csvContent],
        `${safeDatasetSlug}-labelai-export.csv`,
        { type: "text/csv" }
      )

      await uploadFileToDataset(
        datasetResult.dataset_id,
        csvFile,
        "text/csv",
        `LabelAI completion export - ${new Date().toISOString()}`
      )

      toast({
        title: "Success",
        description: `Dataset and first version created (Dataset ID: ${datasetResult.dataset_id}).`,
      })

      setShowCompleteDialog(false)
      setNewDatasetName("")
      setNewDatasetDescription("")
    } catch (error) {
      console.error("Failed to complete dataset workflow:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dataset version. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCompleting(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-foreground">Semi-AI Labeler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {batchId ? "Labeling assigned job" : "Select dataset, review AI suggestions, and export labeled data"}
          </p>
        </div>

        <main className="container mx-auto px-6 py-8">
          {loading ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground">Loading dataset...</p>
              </div>
            </Card>
          ) : data.length === 0 && !batchId ? (
            <div className="space-y-6">
              <DatasetSelector
                onVersionSelect={handleVersionSelect}
                onFileUpload={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-6 relative">
              {/* Quick Actions Button - Fixed at top right */}
              {data.length > 0 && (
                <Popover open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="fixed right-4 top-20 z-40 shadow-lg"
                    >
                      <Settings2 className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end" side="left">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Settings2 className="h-4 w-4" />
                        <h3 className="text-sm font-semibold">Quick Actions</h3>
                      </div>
                      
                      <div className="space-y-2 pb-3 border-b">
                        <Label htmlFor="sidebar-manual-mode" className="text-xs font-medium text-muted-foreground">
                          Labeling Mode
                        </Label>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id="sidebar-manual-mode" 
                            checked={manualMode} 
                            onCheckedChange={setManualMode} 
                          />
                          <Label htmlFor="sidebar-manual-mode" className="text-sm cursor-pointer">
                            Manual Mode
                          </Label>
                        </div>
                      </div>

                      {!manualMode && (
                        <>
                          <div className="space-y-2 pb-3 border-b">
                            <Label htmlFor="sidebar-document-rag" className="text-xs font-medium text-muted-foreground">
                              AI Features
                            </Label>
                            <div className="flex items-center gap-2">
                              <Switch 
                                id="sidebar-document-rag" 
                                checked={enableDocumentRAG} 
                                onCheckedChange={setEnableDocumentRAG} 
                              />
                              <Label htmlFor="sidebar-document-rag" className="text-sm cursor-pointer">
                                Document RAG (NotebookLM Style)
                              </Label>
                            </div>
                          </div>

                          <div className="space-y-2 pb-3 border-b">
                            <div className="flex items-center gap-2">
                              <Switch 
                                id="sidebar-reference-docs" 
                                checked={enableReferenceDocuments} 
                                onCheckedChange={setEnableReferenceDocuments} 
                              />
                              <Label htmlFor="sidebar-reference-docs" className="text-sm cursor-pointer">
                                Reference Documents
                              </Label>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-2 pb-3 border-b">
                        <Label className="text-xs font-medium text-muted-foreground">Search</Label>
                        <div className="space-y-2">
                          <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                              type="text"
                              placeholder="Text search..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 pr-10 h-9 text-sm"
                            />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {currentFileId && (
                        <div className="space-y-2 pb-3 border-b">
                          <Label className="text-xs font-medium text-muted-foreground">File Actions</Label>
                          <div className="space-y-2">
                            <Button
                              onClick={handleSaveFile}
                              disabled={saving || data.length === 0}
                              className="w-full gap-2"
                              variant={data.filter(row => row._isModified).length > 0 ? "default" : "outline"}
                              size="sm"
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Save File
                                  {data.filter(row => row._isModified).length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
                                      {data.filter(row => row._isModified).length}
                                    </span>
                                  )}
                                </>
                              )}
                            </Button>
                          <Button
                            onClick={handleOpenHistory}
                            disabled={historyLoading}
                            className="w-full gap-2"
                            variant="outline"
                            size="sm"
                          >
                            {historyLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading history...
                              </>
                            ) : (
                              <>
                                <History className="h-4 w-4" />
                                View History
                              </>
                            )}
                          </Button>
                            {batchId ? (
                              <Button
                                onClick={handleMarkJobCompleted}
                                className="w-full gap-2"
                                variant="default"
                                size="sm"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark Job Completed
                              </Button>
                            ) : (
                              <Button
                                onClick={() => {
                                  setShowCompleteDialog(true)
                                  setIsQuickActionsOpen(false)
                                }}
                                className="w-full gap-2"
                                variant="default"
                                size="sm"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Columns</Label>
                        <div className="space-y-2">
                          <ColumnManager
                            columns={columns}
                            data={data}
                            contextColumn={contextColumn}
                            resultColumn={resultColumn}
                            onColumnsUpdateAction={handleColumnsUpdate}
                            onDataUpdateAction={setData}
                            onContextColumnChange={setContextColumn}
                            onResultColumnChange={setResultColumn}
                          />
                          <ColumnVisibility
                            columns={columns}
                            visibleColumns={visibleColumns}
                            onVisibilityChange={setVisibleColumns}
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {batchId ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const params = new URLSearchParams()
                          params.set("jobId", batchId)
                          if (fileIdsParam) params.set("fileIds", fileIdsParam)
                          if (jobName) params.set("jobName", jobName)
                          router.push(`/${projectSlug}/annotate/job?${params.toString()}`)
                        }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Job
                      </Button>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">Batch</p>
                        <p className="font-mono text-sm font-medium">{datasetName}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">File</p>
                        <p className="font-mono text-sm font-medium">
                          {currentFileIndex + 1} / {batchFiles.length}
                        </p>
                      </div>
                      {batchFiles[currentFileIndex] && (
                        <>
                          <div className="h-8 w-px bg-border" />
                          <div>
                            <p className="text-sm text-muted-foreground">Current File</p>
                            <p className="font-mono text-sm font-medium">
                              {batchFiles[currentFileIndex].filename}
                            </p>
                          </div>
                        </>
                      )}
                      <div className="h-8 w-px bg-border" />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousFile}
                          disabled={currentFileIndex === 0}
                        >
                          Previous File
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextFile}
                          disabled={currentFileIndex === batchFiles.length - 1}
                        >
                          Next File
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Datasets
                      </Button>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dataset</p>
                        <p className="font-mono text-sm font-medium">{datasetName}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total rows</p>
                        <p className="font-mono text-sm font-medium">{data.length}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">Columns</p>
                        <p className="font-mono text-sm font-medium">{columns.length}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="manual-mode" checked={manualMode} onCheckedChange={setManualMode} />
                    <Label htmlFor="manual-mode" className="cursor-pointer">
                      Manual Labeling Mode
                    </Label>
                  </div>
                  {currentFileId && (
                    <>
                      <Button
                        onClick={handleSaveFile}
                        disabled={saving || data.length === 0}
                        className="gap-2"
                        variant={data.filter(row => row._isModified).length > 0 ? "default" : "outline"}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save File
                            {data.filter(row => row._isModified).length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
                                {data.filter(row => row._isModified).length}
                              </span>
                            )}
                          </>
                        )}
                      </Button>
                      {hasUnsavedChanges && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Unsaved changes{lastLocalDraftSavedAt && (
                            <span className="ml-1 text-[11px] text-muted-foreground">
                              (draft saved locally {lastLocalDraftSavedAt.toLocaleTimeString()})
                            </span>
                          )}
                        </p>
                      )}
                      {batchId ? (
                        <Button
                          onClick={handleMarkJobCompleted}
                          className="gap-2"
                          variant="default"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Job Completed
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowCompleteDialog(true)}
                          disabled={completing}
                          className="gap-2"
                          variant="default"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <SearchFilter onSearchChange={setSearchQuery} placeholder="Text search..." />
                {/* {currentFileId && (
                  <SemanticSearchFilter 
                    fileId={currentFileId}
                    onSearchResults={setSemanticSearchResults}
                    placeholder="Semantic search (e.g., thiên nhiên)..."
                  />
                )} */}
                <ColumnManager
                  columns={columns}
                  data={data}
                  contextColumn={contextColumn}
                  resultColumn={resultColumn}
                  onColumnsUpdateAction={handleColumnsUpdate}
                  onDataUpdateAction={setData}
                  onContextColumnChange={setContextColumn}
                  onResultColumnChange={setResultColumn}
                />
                <ColumnVisibility
                  columns={columns}
                  visibleColumns={visibleColumns}
                  onVisibilityChange={setVisibleColumns}
                />
              </div>

              <ColumnSelector
                columns={columns}
                contextColumn={contextColumn}
                resultColumn={resultColumn}
                onContextColumnChange={setContextColumn}
                onResultColumnChange={setResultColumn}
              />

              {!manualMode && (
                <>
                  {enableDocumentRAG && (
                    <DocumentRAGManager
                      projectId={parseInt(projectId)}
                      onEmbeddingConfigChange={setEmbeddingConfig}
                      onDocumentsChange={setHasProjectDocuments}
                      onSelectedDocumentsChange={setSelectedDocumentIds}
                    />
                  )}

                  {enableReferenceDocuments && !hasProjectDocuments && (
                    <ReferenceUploader
                      onReferenceUpdate={(content) => {
                        setReferenceContext(content)
                      }}
                    />
                  )}

                  <ModelSelector
                    data={paginatedData}
                    contextColumn={contextColumn}
                    resultColumn={resultColumn}
                    referenceContext={referenceContext}
                    columns={columns}
                    projectId={parseInt(projectId)}
                    embeddingConfig={embeddingConfig}
                    documentIds={selectedDocumentIds}
                    onDataUpdate={(updatedRows) => {
                      const preserveUserData = !manualMode
                      const newData = [...data]
                      updatedRows.forEach((updatedRow) => {
                        const index = newData.findIndex((row) => row._id === updatedRow._id)
                        if (index !== -1) {
                          const existingRow = newData[index]
                          const originalRow = originalData.find((d) => d._id === updatedRow._id)
                          
                          const isModified = isRowModified(originalRow, updatedRow)
                          
                          const userData: any = {}
                          Object.keys(existingRow).forEach((k) => {
                            if (!k.startsWith("_") && existingRow[k] !== originalRow?.[k]) {
                              userData[k] = existingRow[k]
                            }
                          })
                          
                          const metaFields: any = {}
                          Object.keys(updatedRow).forEach((k) => {
                            if (k.startsWith("_")) {
                              metaFields[k] = (updatedRow as any)[k]
                            }
                          })
                          
                          newData[index] = {
                            ...updatedRow,
                            ...(preserveUserData ? userData : {}),
                            ...metaFields,
                            _isModified: isModified || existingRow._isModified
                          }
                        }
                      })
                      setData(newData)
                    }}
                  />
                </>
              )}

              {manualMode && (
                <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <span className="font-medium">Manual Labeling Mode:</span> AI labeling is disabled. You can edit the
                    Final Result column directly to label your data manually.
                  </p>
                </Card>
              )}

              <DataManager
                data={data}
                columns={columns}
                onAddRowAction={handleAddRow}
                onAddColumnAction={handleAddColumn}
                onGenerateMoreAction={handleGenerateMore}
                contextColumn={contextColumn}
                apiKey={embeddingConfig.apiKey}
                model={embeddingConfig.model || "gemini-2.5-flash"}
                referenceFileContent={referenceContext}
                projectId={parseInt(projectId)}
                documentIds={selectedDocumentIds}
              />

              <DataGrid
                data={paginatedData}
                columns={columns}
                visibleColumns={visibleColumns}
                contextColumn={contextColumn}
                resultColumn={resultColumn}
                projectId={parseInt(projectId)}
                originalData={originalData}
                onDataUpdate={(updatedRows) => {
                  const preserveUserData = !manualMode

                  const newColumnsSet = new Set<string>(columns)
                  updatedRows.forEach((row) => {
                    Object.keys(row).forEach((k) => {
                      if (!k.startsWith("_") && !columns.includes(k)) {
                        newColumnsSet.add(k)
                      }
                    })
                  })

                  if (newColumnsSet.size > columns.length) {
                    const newColumns = Array.from(newColumnsSet)
                    setColumns(newColumns)
                    const updatedVisibleColumns = [...visibleColumns]
                    newColumns.forEach((col) => {
                      if (!updatedVisibleColumns.includes(col)) {
                        updatedVisibleColumns.push(col)
                      }
                    })
                    setVisibleColumns(updatedVisibleColumns)
                  }

                  const mergeRows = (newRow: RowData, oldRow: RowData) => {
                    const originalRow = originalData.find((d) => d._id === newRow._id)
                    
                    // Use _isModified from newRow if it exists (calculated in DataGrid)
                    // Otherwise, calculate it based on comparison with original
                    let isModified: boolean
                    if (newRow._isModified !== undefined) {
                      // DataGrid already calculated _isModified correctly
                      isModified = newRow._isModified
                    } else {
                      // Fallback: calculate based on row comparison
                      isModified = isRowModified(originalRow, newRow)
                    }

                    // Check if this row is confirmed (accepting AI suggestion)
                    // When confirmed, prioritize newRow value for resultColumn
                    const isConfirmed = newRow._confirmed

                    const dataColumns: Record<string, any> = {}
                    Object.keys(newRow).forEach((k) => {
                      if (!k.startsWith("_")) {
                        dataColumns[k] = (newRow as any)[k]
                      }
                    })

                    Object.keys(oldRow).forEach((k) => {
                      if (!k.startsWith("_")) {
                        // If row is confirmed and this is the result column, always prioritize newRow value
                        if (isConfirmed && k === resultColumn) {
                          // Keep the new value from newRow (already set above)
                          return
                        }
                        if (dataColumns[k] === undefined || dataColumns[k] === "" || dataColumns[k] === null) {
                          dataColumns[k] = oldRow[k]
                        }
                      }
                    })

                    if (preserveUserData) {
                      Object.keys(oldRow).forEach((k) => {
                        if (!k.startsWith("_")) {
                          // If row is confirmed and this is the result column, don't preserve old value
                          // This ensures that when accepting AI suggestion, the new value is not overwritten
                          if (isConfirmed && k === resultColumn) {
                            return
                          }
                          if (oldRow[k] !== originalRow?.[k]) {
                            dataColumns[k] = oldRow[k]
                          }
                        }
                      })
                    }

                    const metaFields: Record<string, any> = {}
                    Object.keys(newRow).forEach((k) => {
                      if (k.startsWith("_")) {
                        metaFields[k] = (newRow as any)[k]
                      }
                    })

                    return {
                      _id: newRow._id || oldRow._id,
                      ...dataColumns,
                      ...metaFields,
                      _isModified: isModified, // Use calculated value, don't preserve old _isModified
                    }
                  }

                  if (updatedRows.length === data.length && updatedRows.length > 0) {
                    const merged = updatedRows.map((newRow) => {
                      const oldRow = data.find((d) => d._id === newRow._id) || newRow
                      return mergeRows(newRow, oldRow)
                    })
                    setData(merged)
                  } else {
                    const newData = data.map((row) => {
                      const updated = updatedRows.find((r) => r._id === row._id)
                      if (!updated) return row
                      return mergeRows(updated, row)
                    })
                    setData(newData)
                  }
                }}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                allData={data}
                datasetName={datasetName}
                manualMode={manualMode}
              />
            </div>
          )}
        </main>

        <Drawer
          open={isHistoryOpen}
          onOpenChange={(open) => {
            setIsHistoryOpen(open)
            if (open && currentFileId) {
              fetchHistory(currentFileId)
            }
          }}
          direction="right"
        >
          <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-1/2 data-[vaul-drawer-direction=right]:sm:max-w-none">
            <DrawerHeader>
              <DrawerTitle>Label History</DrawerTitle>
              <DrawerDescription>
                Recent save and confirmation events for the current file.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                {/* <p className="text-sm text-muted-foreground">
                  File ID: {currentFileId ?? "-"}
                </p> */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchHistory()}
                  disabled={historyLoading || !currentFileId}
                  className="gap-2"
                >
                  {historyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-[70vh]">
                  <div className="p-4 space-y-3">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading history...
                      </div>
                    ) : historyError ? (
                      <p className="text-sm text-destructive">{historyError}</p>
                    ) : historyEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No history found for this file yet.</p>
                    ) : (
                      historyEntries.map((entry) => (
                        <Card key={entry.history_id || entry.event_id} className="shadow-none">
                          <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Time</p>
                                <p className="font-medium">
                                  {entry.occurred_at ? new Date(entry.occurred_at).toLocaleString() : "Unknown"}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{entry.username || "Unknown"}</Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {entry.action}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {entry.change_summary && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Summary</p>
                                  <p className="whitespace-pre-wrap">{entry.change_summary}</p>
                                </div>
                              )}
                              {entry.annotation_count !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Annotations</p>
                                  <p>{entry.annotation_count}</p>
                                </div>
                              )}
                              {entry.annotation_status && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <p className="capitalize">{entry.annotation_status}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {entry.csv_diff && (
                            <div className="border-t p-4 space-y-3">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {entry.csv_diff.rows_changed !== undefined && (
                                  <Badge variant="secondary">
                                    {entry.csv_diff.rows_changed} rows changed
                                  </Badge>
                                )}
                                {entry.csv_diff.rows_added !== undefined && entry.csv_diff.rows_added > 0 && (
                                  <Badge variant="outline">+{entry.csv_diff.rows_added} rows</Badge>
                                )}
                                {entry.csv_diff.rows_deleted !== undefined && entry.csv_diff.rows_deleted > 0 && (
                                  <Badge variant="outline">-{entry.csv_diff.rows_deleted} rows</Badge>
                                )}
                                {entry.csv_diff.summary?.columns_affected?.length ? (
                                  <span>
                                    Columns: {entry.csv_diff.summary.columns_affected.slice(0, 3).join(", ")}
                                    {entry.csv_diff.summary.columns_affected.length > 3 &&
                                      ` +${entry.csv_diff.summary.columns_affected.length - 3} more`}
                                  </span>
                                ) : null}
                              </div>

                              {entry.csv_diff.changes && entry.csv_diff.changes.length > 0 ? (
                                <div className="space-y-3">
                                  {entry.csv_diff.changes.map((change, idx) => (
                                    <div
                                      key={`${change.row_index}-${idx}`}
                                      className="rounded-md border bg-muted/40 p-3 space-y-3"
                                    >
                                      <div className="flex items-center gap-2 text-sm font-medium">
                                        <Badge variant="secondary">Row {change.row_index}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {Object.keys(change.columns || {}).length} column(s) changed
                                        </span>
                                      </div>
                                      <div className="space-y-3">
                                        {Object.entries(change.columns || {}).map(([col, values]) => (
                                          <div
                                            key={col}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-3"
                                          >
                                            <div className="space-y-1">
                                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                <Badge variant="destructive" className="h-5 px-2">Old</Badge>
                                                {col}
                                              </p>
                                              <div className="rounded border bg-background px-3 py-2 text-sm break-all">
                                                {String(values?.old ?? "") || <span className="text-muted-foreground">empty</span>}
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                <Badge className="h-5 px-2 bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                  New
                                                </Badge>
                                                {col}
                                              </p>
                                              <div className="rounded border bg-background px-3 py-2 text-sm break-all">
                                                {String(values?.new ?? "") || <span className="text-muted-foreground">empty</span>}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No detailed cell changes available.</p>
                              )}
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Project and Create Dataset</DialogTitle>
              <DialogDescription>
                Create a dataset from this project's labeled data. This will mark the project as completed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dataset-name">Dataset Name *</Label>
                <Input
                  id="dataset-name"
                  placeholder="Enter dataset name"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  disabled={completing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataset-description">Description (Optional)</Label>
                <Textarea
                  id="dataset-description"
                  placeholder="Enter dataset description"
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                  disabled={completing}
                  rows={3}
                />
              </div>
              
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Export Information:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Export type: Full (all files)</li>
                  <li>Project permissions will be copied to dataset</li>
                  <li>Project status will be set to "completed"</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteDialog(false)
                  setNewDatasetName("")
                  setNewDatasetDescription("")
                }}
                disabled={completing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completing || !newDatasetName.trim()}
                className="gap-2"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create Dataset
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  )
}

