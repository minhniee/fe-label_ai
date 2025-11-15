"use client"

import { useState, useEffect } from "react"
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
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SearchFilter } from "@/components/label-ai/search-filter"
import { SemanticSearchFilter } from "@/components/label-ai/semantic-search-filter"
import { ColumnVisibility } from "@/components/label-ai/column-visibility"
import { DataManager } from "@/components/label-ai/data-manager"
// import { AISearch } from "@/components/label-ai/ai-search"
import { ColumnManager } from "@/components/label-ai/column-manager"
import { getDatasetVersionData } from "@/app/api/labelai"
import { getVersionFiles } from "@/app/api/dataset"
import { getProjectFiles } from "@/app/api/project"
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
  const [searchResults, setSearchResults] = useState<any[]>([])
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

  // Load batch files when in batch mode
  useEffect(() => {
    if (batchId && fileIdsParam && projectId) {
      loadBatchFiles()
    }
  }, [batchId, fileIdsParam, projectId])

  const loadBatchFiles = async () => {
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
  }

  const loadFileData = async (file: any, fileIndex: number) => {
    try {
      setLoading(true)
      setCurrentFileIndex(fileIndex)
      
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
      
      setData(transformedData)
      setCurrentPage(0)
      
      toast({
        title: "File loaded",
        description: `Loaded ${file.filename} with ${transformedData.length} rows`,
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
              {/* <AISearch onSearchResults={setSearchResults} /> */}
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
          <div className="space-y-6">
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
              <div className="flex items-center gap-2">
                <Switch id="manual-mode" checked={manualMode} onCheckedChange={setManualMode} />
                <Label htmlFor="manual-mode" className="cursor-pointer">
                  Manual Labeling Mode
                </Label>
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
                  // Pass empty array when no documents selected (user unselected all)
                  // This allows backend to distinguish between "no selection" vs "use all"
                  documentIds={selectedDocumentIds}
                  onDataUpdate={(updatedRows) => {
                  const newData = [...data]
                  updatedRows.forEach((updatedRow) => {
                    const index = newData.findIndex((row) => row._id === updatedRow._id)
                    if (index !== -1) {
                      const existingRow = newData[index]
                      const updatedIsTrue = String(updatedRow._ai_suggestion || "").toLowerCase() === "true"
                      const existingIsTrue = String(existingRow._ai_suggestion || "").toLowerCase() === "true"
                      if (updatedIsTrue || existingIsTrue) {
                        // Merge only meta fields (keys starting with "_") to preserve user data
                        const metaOnly: any = {}
                        Object.keys(updatedRow).forEach((k) => {
                          if (k.startsWith("_") && k !== "_id") {
                            ;(metaOnly as any)[k] = (updatedRow as any)[k]
                          }
                        })
                        newData[index] = { ...existingRow, ...metaOnly }
                      } else {
                        newData[index] = updatedRow
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
              onAddRow={handleAddRow}
              onAddColumn={handleAddColumn}
              onGenerateMore={handleGenerateMore}
              contextColumn={contextColumn}
            />

            <DataGrid
              data={paginatedData}
              columns={columns}
              visibleColumns={visibleColumns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onDataUpdate={(updatedRows) => {
                // If updatedRows length matches allData length, replace entire dataset
                if (updatedRows.length === data.length && updatedRows.length > 0) {
                  const merged = updatedRows.map((newRow) => {
                    const oldRow = data.find((d) => d._id === newRow._id) || newRow
                    const oldIsTrue = String(oldRow._ai_suggestion || "").toLowerCase() === "true"
                    const newIsTrue = String(newRow._ai_suggestion || "").toLowerCase() === "true"
                    if (oldIsTrue || newIsTrue) {
                      const metaOnly: any = {}
                      Object.keys(newRow).forEach((k) => {
                        if (k.startsWith("_") && k !== "_id") {
                          ;(metaOnly as any)[k] = (newRow as any)[k]
                        }
                      })
                      return { ...oldRow, ...metaOnly }
                    }
                    return newRow
                  })
                  setData(merged)
                } else {
                  // Update specific rows by matching IDs
                  const newData = data.map((row) => {
                    const updated = updatedRows.find((r) => r._id === row._id)
                    if (!updated) return row
                    const rowIsTrue = String(row._ai_suggestion || "").toLowerCase() === "true"
                    const updatedIsTrue = String(updated._ai_suggestion || "").toLowerCase() === "true"
                    if (rowIsTrue || updatedIsTrue) {
                      const metaOnly: any = {}
                      Object.keys(updated).forEach((k) => {
                        if (k.startsWith("_") && k !== "_id") {
                          ;(metaOnly as any)[k] = (updated as any)[k]
                        }
                      })
                      return { ...row, ...metaOnly }
                    }
                    return updated
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
    </div>
  )
}