"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataGrid } from "@/components/label-ai/data-grid"
import { ModelSelector } from "@/components/label-ai/model-selector"
import { ColumnSelector } from "@/components/label-ai/column-selector"
import { ReferenceUploader } from "@/components/label-ai/reference-uploader"
import { DatasetSelector } from "@/components/label-ai/dataset-selector"
import { DocumentRAGManager } from "@/components/label-ai/document-rag-manager"
import { DataGenerator } from "@/components/label-ai/data-generator"
import { Loader2, ArrowLeft, Save, CheckCircle2, Settings2, Search, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchFilter } from "@/components/label-ai/search-filter"
import { SemanticSearchFilter } from "@/components/label-ai/semantic-search-filter"
import { ColumnVisibility } from "@/components/label-ai/column-visibility"
import { DataManager } from "@/components/label-ai/data-manager"
import { ColumnManager } from "@/components/label-ai/column-manager"
import { getDatasetVersionData } from "@/app/api/labelai"
import { getVersionFiles } from "@/app/api/dataset"
import { getProjectFiles, generateDatasetFromProject } from "@/app/api/project"
import { getFilePreview } from "@/app/api/dataset"
import { slugToProjectId } from "@/types/project"
import axios from "axios"
import { detectContextColumn, detectResultColumn, detectDelimiter } from "@/lib/label-ai-utils"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Helper to get file content from annotation API
const getFileContentFromAnnotation = async (fileId: number) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  
  const response = await axios.get(`${API_BASE}/annotations/files/${fileId}/content`, {
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

export default function Home() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectSlug = params.projectId as string
  const projectId = slugToProjectId(projectSlug)
  
  // Get batch information from URL params
  const batchId = searchParams.get("batchId")
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
  const [view, setView] = useState<"select" | "generate">("select")
  const [manualMode, setManualMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
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
  const [hasProjectDocuments, setHasProjectDocuments] = useState(false)  // NEW: track if project has documents
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])  // NEW: track selected document IDs
  const [saving, setSaving] = useState(false)  // Track save state
  const [fileDelimiter, setFileDelimiter] = useState<string>(",")  // Track delimiter used in current file
  const [originalData, setOriginalData] = useState<RowData[]>([])  // Store original data for comparison
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)  // Show complete dialog
  const [completing, setCompleting] = useState(false)  // Track complete state
  const [newDatasetName, setNewDatasetName] = useState("")  // Dataset name for complete
  const [newDatasetDescription, setNewDatasetDescription] = useState("")  // Dataset description
  const [isScrolled, setIsScrolled] = useState(false)  // Track scroll state for floating sidebar

  // Track scroll to show/hide floating sidebar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Sync originalData when data length changes significantly (likely a reload)
  useEffect(() => {
    // Only update originalData if length changed significantly and we have new rows
    // This helps when data is reloaded from external sources
    if (data.length > 0 && originalData.length > 0 && data.length !== originalData.length) {
      const hasNewRows = data.some(row => 
        !originalData.some(orig => orig._id === row._id)
      )
      // If we have completely new rows (not just modifications), update originalData
      // Only update if change is significant (>10% difference)
      if (hasNewRows && originalData.length > 0 && 
          Math.abs(data.length - originalData.length) > originalData.length * 0.1) {
        // This is likely a reload, update originalData but preserve modification flags
        setOriginalData(data.map(row => {
          const { _isModified, ...rest } = row
          return rest
        }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]) // Only watch length to avoid infinite loops

  const loadBatchFiles = useCallback(async () => {
    try {
      setLoading(true)
      
      // Parse file IDs from URL
      const fileIds: number[] = JSON.parse(fileIdsParam!)
      
      // Get all project files
      const allFiles = await getProjectFiles(parseInt(projectId))
      
      // Filter files by batch file IDs
      const batchFileList = allFiles.filter(f => fileIds.includes(f.file_id))
      
      setBatchFiles(batchFileList)
      setDatasetName(jobName || `Batch ${batchId}`)
      
      // Auto-load first file
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
  }, [batchId, fileIdsParam, projectId, toast])

  // Load batch files when in batch mode
  useEffect(() => {
    if (batchId && fileIdsParam && projectId) {
      loadBatchFiles()
    }
  }, [batchId, fileIdsParam, projectId, loadBatchFiles])

  const loadFileData = async (file: any, fileIndex: number) => {
    try {
      setLoading(true)
      setCurrentFileIndex(fileIndex)
      setCurrentFileId(file.file_id)  // Set current file ID for save functionality
      
      console.log("Loading file:", file)
      console.log("File ID:", file.file_id)
      console.log("File type:", file.file_type)
      
      // Get file preview using API - try annotation API first, then dataset API
      let headers: string[] = []
      let rows: any[] = []
      
      try {
        // Try annotation API first (for project files)
        console.log("Trying annotation API for file_id:", file.file_id)
        try {
          const annotationContent = await getFileContentFromAnnotation(file.file_id)
          console.log("Annotation API response:", annotationContent)
          
          // Parse annotation API response
          if (annotationContent.content) {
            // If content is a string, parse it
            const contentStr = typeof annotationContent.content === 'string' 
              ? annotationContent.content 
              : JSON.stringify(annotationContent.content)
            
            const lines = contentStr.split('\n').filter((line: string) => line.trim())
            if (lines.length > 0) {
              // Detect delimiter from first line
              const firstLine = lines[0]
              const delimiter = detectDelimiter(firstLine)
              setFileDelimiter(delimiter)  // Save delimiter for later use
              
              headers = firstLine.split(delimiter).map((h: string) => h.trim())
              rows = lines.slice(1).map((line: string) => {
                return line.split(delimiter).map((v: string) => v.trim())
              })
            }
          } else if (annotationContent.headers && annotationContent.rows) {
            headers = annotationContent.headers
            rows = annotationContent.rows
          }
          
          console.log("From annotation API - headers:", headers, "rows:", rows.length)
        } catch (annotationError) {
          console.log("Annotation API failed, trying dataset API:", annotationError)
          
          // Fallback to dataset API
          const preview = await getFilePreview(file.file_id, 1000)
          console.log("Dataset API response:", preview)
          headers = preview.headers || []
          rows = preview.rows || []
          console.log("From dataset API - headers:", headers, "rows:", rows.length)
        }
        
        console.log("Final extracted headers:", headers)
        console.log("Final extracted rows count:", rows.length)
        console.log("First row sample:", rows[0])
      } catch (error) {
        console.error("Failed to get file content from both APIs:", error)
        console.error("Error details:", error)
        toast({
          title: "Error",
          description: `Failed to load file content: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        })
        return
      }

      // Normalize rows if API returns array of objects instead of string[][]
      if (headers.length === 0 && Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
        console.log("Normalizing rows from object format")
        headers = Object.keys(rows[0] as Record<string, unknown>)
        rows = (rows as Record<string, unknown>[]).map((r) => headers.map((h) => (r[h] ?? "") as string))
        console.log("After normalization - headers:", headers, "rows:", rows.length)
      }

      console.log("Final check - headers.length:", headers.length, "rows.length:", rows.length)

      if (headers.length === 0 || !Array.isArray(rows) || rows.length === 0) {
        console.error("File is empty or invalid:", {
          headersLength: headers.length,
          rowsLength: rows.length,
          isArray: Array.isArray(rows),
          file
        })
        toast({
          title: "Empty file",
          description: "This file has no content to label.",
          variant: "destructive",
        })
        return
      }
      
      setColumns(headers)
      
      // Auto-detect context and result columns
      const detectedContextCol = detectContextColumn(headers)
      const detectedResultCol = detectResultColumn(headers)
      
      setContextColumn(detectedContextCol)
      setResultColumn(detectedResultCol)
      setVisibleColumns([detectedContextCol, detectedResultCol])
      
      // Transform rows to RowData format
      const transformedData: RowData[] = rows.map((row: any, index: number) => {
        const rowObj: RowData = {
          _id: `row-${index}`,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
        }
        
        // Handle both array and object formats
        if (Array.isArray(row)) {
          headers.forEach((header, i) => {
            rowObj[header] = row[i] ?? ""
          })
        } else if (row && typeof row === "object") {
          headers.forEach((header) => {
            rowObj[header] = (row as any)[header] ?? ""
          })
        }
        
        return rowObj
      })
      
      // Try to restore from cache first
      const cacheKey = `labelai_cache_${file.file_id}`
      try {
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData)
          
          // Check cache version/compatibility: fileId and row count must match
          if (parsedCache.fileId === file.file_id && 
              parsedCache.rows && 
              parsedCache.rows.length === transformedData.length) {
            
            // Create a map for faster lookup
            const cacheMap = new Map(parsedCache.rows.map((r: RowData) => [r._id, r]))
            
            // Merge cached meta fields with loaded data, preserving original data columns
            const mergedData = transformedData.map((row) => {
              const cachedRow = cacheMap.get(row._id)
              if (cachedRow) {
                // Only merge meta fields (starting with _), preserve original data columns
                const { _id, _ai_suggestion, _ai_reasoning, _confirmed, _isModified, ...userData } = cachedRow
                return {
                  ...row, // Start with fresh loaded data
                  _ai_suggestion: cachedRow._ai_suggestion,
                  _ai_reasoning: cachedRow._ai_reasoning,
                  _confirmed: cachedRow._confirmed,
                  _isModified: true
                }
              }
              return row
            })
            
            setData(mergedData)
            setOriginalData(transformedData)  // Keep original for comparison
            toast({
              title: "File loaded with cache",
              description: `Restored ${parsedCache.rows.filter((r: RowData) => r._isModified).length} modified rows from cache`,
            })
          } else {
            // Cache incompatible, clear it
            localStorage.removeItem(cacheKey)
            setData(transformedData)
            setOriginalData(transformedData)
          }
        } else {
          setData(transformedData)
          setOriginalData(transformedData)
        }
      } catch (error) {
        console.error("Failed to restore from cache:", error)
        // Clear invalid cache
        try {
          localStorage.removeItem(cacheKey)
        } catch (e) {
          // Ignore
        }
        setData(transformedData)
        setOriginalData(transformedData)
      }
      
      setCurrentPage(0)
      
      if (!localStorage.getItem(cacheKey)) {
        toast({
          title: "File loaded",
          description: `Loaded ${file.filename} with ${transformedData.length} rows`,
        })
      }
    } catch (error) {
      console.error("Failed to load file:", error)
      toast({
        title: "Error",
        description: "Failed to load file data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

        // Get file_id for semantic search
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
        setSemanticSearchResults([]) // Reset semantic search results

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

  const handleDataGenerated = (generatedData: any[], generatedColumns: string[], name: string) => {
    setColumns(generatedColumns)

    const detectedContextCol = detectContextColumn(generatedColumns)
    const detectedResultCol = detectResultColumn(generatedColumns)

    setContextColumn(detectedContextCol)
    setResultColumn(detectedResultCol)
    setVisibleColumns([detectedContextCol, detectedResultCol])

    const transformedData: RowData[] = generatedData.map((row: any, index: number) => ({
      _id: `row-${index}`,
      _ai_suggestion: "",
      _ai_reasoning: "",
      _confirmed: false,
      ...row,
    }))

    setData(transformedData)
    setDatasetName(name)
    setCurrentPage(0)
    setView("select")
  }

  const handleReset = () => {
    setData([])
    setColumns([])
    setDatasetName("")
    setCurrentPage(0)
    setContextColumn("")
    setResultColumn("")
    setView("select")
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

  const filteredData = data.filter((row) => {
    // First apply semantic search filter if there are results
    if (semanticSearchResults.length > 0) {
      const rowIndex = parseInt(row._id.replace("row-", ""))
      const isInSemanticResults = semanticSearchResults.some(
        (result) => result.row_index === rowIndex
      )
      if (!isInSemanticResults) return false
    }
    
    // Then apply text search filter
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return Object.values(row).some((value) => String(value).toLowerCase().includes(query))
  })

  const paginatedData = filteredData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const handleAddRow = (row: RowData) => {
    setData([...data, row])
  }

  const handleAddColumn = (columnName: string) => {
    setColumns([...columns, columnName])
    setVisibleColumns([...visibleColumns, columnName])
    const updatedData = data.map((row) => ({
      ...row,
      [columnName]: "",
    }))
    setData(updatedData)
  }

  const handleColumnsUpdate = (newColumns: string[]) => {
    setColumns(newColumns)
    // Update visibleColumns to include new columns and remove deleted ones
    const updatedVisibleColumns = visibleColumns.filter((col) => newColumns.includes(col))
    // Add new columns to visible columns by default
    const newCols = newColumns.filter((col) => !visibleColumns.includes(col))
    setVisibleColumns([...updatedVisibleColumns, ...newCols])
  }

  const handleGenerateMore = (newRows: RowData[]) => {
    setData([...data, ...newRows])
  }

  // Save to cache when data changes
  const saveToCache = (dataToCache: RowData[]) => {
    if (!currentFileId) return
    
    try {
      const cacheKey = `labelai_cache_${currentFileId}`
      const modifiedRows = dataToCache.filter(row => row._isModified)
      
      if (modifiedRows.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
          fileId: currentFileId,
          timestamp: new Date().toISOString(),
          rows: modifiedRows
        }))
      } else {
        // Remove cache if no modifications
        localStorage.removeItem(cacheKey)
      }
    } catch (error) {
      console.error("Failed to save to cache:", error)
    }
  }

  // Helper to compare rows (excluding _isModified flag)
  const isRowModified = (original: RowData | undefined, current: RowData): boolean => {
    if (!original) return true
    
    // Create copies without _isModified for comparison
    const origCopy = { ...original }
    const currCopy = { ...current }
    delete origCopy._isModified
    delete currCopy._isModified
    
    return JSON.stringify(origCopy) !== JSON.stringify(currCopy)
  }

  // Convert data to CSV format (only modified rows merged with original)
  const convertDataToCSV = (dataRows: RowData[], columnsList: string[], delimiter: string = ","): string => {
    // Filter out internal columns (starting with _)
    const exportColumns = columnsList.filter(col => !col.startsWith("_"))
    
    // Build CSV header
    const header = exportColumns.join(delimiter)
    
    // Merge modified rows with original data
    const finalData = dataRows.map((row) => {
      if (row._isModified) {
        // Use modified row
        return row
      } else {
        // Use original row
        const originalRow = originalData.find(r => r._id === row._id)
        return originalRow || row
      }
    })
    
    // Build CSV rows
    const rows = finalData.map((row) => {
      return exportColumns
        .map((col) => {
          const value = row[col] || ""
          const stringValue = String(value)
          // Escape quotes and wrap in quotes if value contains delimiter, newline, or quote
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

  // Save file content to backend
  const handleSaveFile = async () => {
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

    // Check if there are any modified rows
    const modifiedRows = data.filter(row => row._isModified)
    if (modifiedRows.length === 0) {
      toast({
        title: "No changes",
        description: "No modifications to save",
      })
      return
    }

    try {
      setSaving(true)
      
      // Use saved delimiter or default to comma
      const delimiter = fileDelimiter || ","
      
      // Convert data to CSV (merges modified rows with original)
      const csvContent = convertDataToCSV(data, columns, delimiter)
      
      // Call API to save file
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await axios.put(
        `${API_BASE}/annotations/files/${currentFileId}/content`,
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
        // Clear modification flags and update original data
        const savedData = data.map(row => {
          const { _isModified, ...rest } = row
          return rest
        })
        setData(savedData)
        setOriginalData(savedData)
        
        // Clear cache after successful save
        const cacheKey = `labelai_cache_${currentFileId}`
        localStorage.removeItem(cacheKey)
        
        toast({
          title: "Success",
          description: `File saved successfully. ${modifiedRows.length} modified rows saved.`,
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

  // Handle complete project and create dataset
  const handleComplete = async () => {
    if (!newDatasetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dataset name",
        variant: "destructive",
      })
      return
    }

    try {
      setCompleting(true)
      
      const result = await generateDatasetFromProject(parseInt(projectId), {
        dataset_name: newDatasetName.trim(),
        dataset_description: newDatasetDescription.trim() || undefined,
        export_type: "full",
        copy_permissions: true,
      })
      
      toast({
        title: "Success",
        description: `Dataset created successfully! Dataset ID: ${result.dataset_id}`,
      })
      
      setShowCompleteDialog(false)
      setNewDatasetName("")
      setNewDatasetDescription("")
      
      // Optionally redirect to dataset page
      // window.location.href = `/datasets/${result.dataset_id}`
    } catch (error) {
      console.error("Failed to create dataset:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dataset. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
          <h1 className="text-3xl font-bold text-foreground">Semi-AI Labeler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select dataset, review AI suggestions, and export labeled data
          </p>

      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading dataset...</p>
            </div>
          </Card>
        ) : data.length === 0 && !batchId ? (
          view === "select" ? (
            <div className="space-y-6">
              <DatasetSelector
                onVersionSelect={handleVersionSelect}
                onGenerateClick={() => setView("generate")}
                onFileUpload={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setView("select")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dataset Selection
              </Button>
              <DataGenerator onDataGenerated={handleDataGenerated} />
            </div>
          )
        ) : (
          <div className="space-y-6 relative">
            {/* Floating Sidebar for Column Management - appears when scrolled */}
            {isScrolled && data.length > 0 && (
              <div className="fixed right-4 top-20 z-40 w-80 space-y-3 hidden lg:block animate-in slide-in-from-right duration-200">
                <Card className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur-sm max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                      <Settings2 className="h-4 w-4" />
                      <h3 className="text-sm font-semibold">Quick Actions</h3>
                    </div>
                    
                    {/* Manual Mode Switch */}
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

                    {/* Search Filters */}
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
                        {currentFileId && (
                          <SemanticSearchFilter 
                            fileId={currentFileId}
                            onSearchResults={setSemanticSearchResults}
                            placeholder="Semantic search..."
                          />
                        )}
                      </div>
                    </div>

                    {/* Save File Button */}
                    {currentFileId && batchId && (
                      <div className="space-y-2 pb-3 border-b">
                        <Label className="text-xs font-medium text-muted-foreground">File Actions</Label>
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
                      </div>
                    )}

                    {/* Column Management */}
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
                </Card>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {batchId ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.history.back()}
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
                {currentFileId && batchId && (
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
                    <Button
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={completing}
                      className="gap-2"
                      variant="default"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Complete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <SearchFilter onSearchChange={setSearchQuery} placeholder="Text search..." />
              <SemanticSearchFilter 
                fileId={currentFileId}
                onSearchResults={setSemanticSearchResults}
                placeholder="Semantic search (e.g., thiên nhiên)..."
              />
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
                <DocumentRAGManager
                  projectId={parseInt(projectId)}
                  onEmbeddingConfigChange={setEmbeddingConfig}
                  onDocumentsChange={setHasProjectDocuments}
                  onSelectedDocumentsChange={setSelectedDocumentIds}
                />

                {/* Only show ReferenceUploader if no documents in project (fallback) */}
                {!hasProjectDocuments && (
                  <ReferenceUploader
                    onReferenceUpdate={(content, files) => {
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
                  // Pass empty array when no documents selected (user unselected all)
                  // This allows backend to distinguish between "no selection" vs "use all"
                  documentIds={selectedDocumentIds}
                  onDataUpdate={(updatedRows) => {
                  const newData = [...data]
                  updatedRows.forEach((updatedRow) => {
                    const index = newData.findIndex((row) => row._id === updatedRow._id)
                    if (index !== -1) {
                      const existingRow = newData[index]
                      const originalRow = originalData.find((d) => d._id === updatedRow._id)
                      
                      // Check if row has been modified compared to original
                      const isModified = isRowModified(originalRow, updatedRow)
                      
                      // Always preserve user-modified data columns (non-meta columns that differ from original)
                      const userData: any = {}
                      Object.keys(existingRow).forEach((k) => {
                        if (!k.startsWith("_") && existingRow[k] !== originalRow?.[k]) {
                          userData[k] = existingRow[k] // Preserve user changes
                        }
                      })
                      
                      // Extract meta fields from updated row
                      const metaFields: any = {}
                      Object.keys(updatedRow).forEach((k) => {
                        if (k.startsWith("_")) {
                          metaFields[k] = (updatedRow as any)[k]
                        }
                      })
                      
                      // Merge: AI meta fields + user data + modification flag
                      newData[index] = {
                        ...updatedRow, // Start with updated row (includes all columns from AI)
                        ...userData, // Override with user-modified data columns
                        ...metaFields, // Ensure meta fields are from updated row
                        _isModified: isModified || existingRow._isModified
                      }
                    }
                  })
                  setData(newData)
                  saveToCache(newData)
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
              onAddRow={handleAddRow}
              onAddColumn={handleAddColumn}
              onGenerateMore={handleGenerateMore}
              contextColumn={contextColumn}
              apiKey={embeddingConfig.apiKey}
              model={embeddingConfig.model || "gemini-2.5-flash"}
              referenceFileContent={referenceContext}
            />

            <DataGrid
              data={paginatedData}
              columns={columns}
              visibleColumns={visibleColumns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              projectId={parseInt(projectId)}
              onDataUpdate={(updatedRows) => {
                // If updatedRows length matches allData length, replace entire dataset
                if (updatedRows.length === data.length && updatedRows.length > 0) {
                  const merged = updatedRows.map((newRow) => {
                    const oldRow = data.find((d) => d._id === newRow._id) || newRow
                    const originalRow = originalData.find((d) => d._id === newRow._id)
                    
                    // Check if row has been modified compared to original
                    const isModified = isRowModified(originalRow, newRow)
                    
                    // Always preserve user-modified data columns (non-meta columns that differ from original)
                    const userData: any = {}
                    Object.keys(oldRow).forEach((k) => {
                      if (!k.startsWith("_") && oldRow[k] !== originalRow?.[k]) {
                        userData[k] = oldRow[k] // Preserve user changes
                      }
                    })
                    
                    // Extract meta fields from updated row
                    const metaFields: any = {}
                    Object.keys(newRow).forEach((k) => {
                      if (k.startsWith("_")) {
                        metaFields[k] = (newRow as any)[k]
                      }
                    })
                    
                    // Merge: AI meta fields + user data + modification flag
                    return {
                      ...newRow, // Start with updated row (includes all columns)
                      ...userData, // Override with user-modified data columns
                      ...metaFields, // Ensure meta fields are from updated row
                      _isModified: isModified || oldRow._isModified
                    }
                  })
                  setData(merged)
                  saveToCache(merged)
                } else {
                  // Update specific rows by matching IDs
                  const newData = data.map((row) => {
                    const updated = updatedRows.find((r) => r._id === row._id)
                    if (!updated) return row
                    
                    const originalRow = originalData.find((d) => d._id === row._id)
                    // Check if row has been modified compared to original
                    const isModified = isRowModified(originalRow, updated)
                    
                    // Always preserve user-modified data columns (non-meta columns that differ from original)
                    const userData: any = {}
                    Object.keys(row).forEach((k) => {
                      if (!k.startsWith("_") && row[k] !== originalRow?.[k]) {
                        userData[k] = row[k] // Preserve user changes
                      }
                    })
                    
                    // Extract meta fields from updated row
                    const metaFields: any = {}
                    Object.keys(updated).forEach((k) => {
                      if (k.startsWith("_")) {
                        metaFields[k] = (updated as any)[k]
                      }
                    })
                    
                    // Merge: AI meta fields + user data + modification flag
                    return {
                      ...updated, // Start with updated row (includes all columns)
                      ...userData, // Override with user-modified data columns
                      ...metaFields, // Ensure meta fields are from updated row
                      _isModified: isModified || row._isModified
                    }
                  })
                  setData(newData)
                  saveToCache(newData)
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

      {/* Complete Dialog */}
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
                <li>Project status will be set to &quot;completed&quot;</li>
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
  )
}