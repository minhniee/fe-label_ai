"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataGrid } from "@/components/label-ai/data-grid"
import { ModelSelector } from "@/components/label-ai/model-selector"
import { ColumnSelector } from "@/components/label-ai/column-selector"
import { ReferenceUploader } from "@/components/label-ai/reference-uploader"
import { DatasetSelector } from "@/components/label-ai/dataset-selector"
import { DataGenerator } from "@/components/label-ai/data-generator"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SearchFilter } from "@/components/label-ai/search-filter"
import { ColumnVisibility } from "@/components/label-ai/column-visibility"
import { getVersionData, getFileData, getVersionFiles } from "@/app/api/dataset"

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _ai_reasoning?: string
  _confirmed?: boolean
  [key: string]: any
}

export default function Home() {
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
  const { toast } = useToast()
  const rowsPerPage = 50

  const handleVersionSelect = async (datasetId: string, versionId: string) => {
    try {
      setLoading(true)
      
      // First, try to get version data directly
      try {
        const datasetData = await getVersionData(parseInt(datasetId), parseInt(versionId))
        
        if (datasetData && Array.isArray(datasetData)) {
          const datasetColumns = Object.keys(datasetData[0] || {})
          setColumns(datasetColumns)
          setVisibleColumns(datasetColumns)

          const detectedContextCol =
            datasetColumns.find((col) => col.toLowerCase().includes("context")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("text")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("description")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("body")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("feedback")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("input")) ||
            datasetColumns[0] ||
            ""

          const detectedResultCol =
            datasetColumns.find((col) => col.toLowerCase().includes("result")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("label")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("category")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("sentiment")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("priority")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("output")) ||
            datasetColumns[1] ||
            ""

          setContextColumn(detectedContextCol)
          setResultColumn(detectedResultCol)

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

          toast({
            title: "Dataset loaded",
            description: `Successfully loaded ${transformedData.length} rows with ${datasetColumns.length} columns`,
          })
          return
        }
      } catch (versionError) {
        console.log("Version data not available, trying file data approach:", versionError)
      }

      // If version data fails, try to get files and use file data
      const files = await getVersionFiles(parseInt(versionId))
      
      if (files && files.length > 0) {
        // Use the first file's data
        const firstFile = files[0]
        const datasetData = await getFileData(firstFile.file_id)
        
        if (datasetData && Array.isArray(datasetData)) {
          const datasetColumns = Object.keys(datasetData[0] || {})
          setColumns(datasetColumns)
          setVisibleColumns(datasetColumns)

          const detectedContextCol =
            datasetColumns.find((col) => col.toLowerCase().includes("context")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("text")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("description")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("body")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("feedback")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("input")) ||
            datasetColumns[0] ||
            ""

          const detectedResultCol =
            datasetColumns.find((col) => col.toLowerCase().includes("result")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("label")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("category")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("sentiment")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("priority")) ||
            datasetColumns.find((col) => col.toLowerCase().includes("output")) ||
            datasetColumns[1] ||
            ""

          setContextColumn(detectedContextCol)
          setResultColumn(detectedResultCol)

          const transformedData: RowData[] = datasetData.map((row: any, index: number) => ({
            _id: `row-${index}`,
            _ai_suggestion: "",
            _ai_reasoning: "",
            _confirmed: false,
            ...row,
          }))

          setData(transformedData)
          setDatasetName(`${datasetId} - v${versionId} (${firstFile.file_name})`)
          setCurrentPage(0)

          toast({
            title: "Dataset loaded",
            description: `Successfully loaded ${transformedData.length} rows with ${datasetColumns.length} columns from ${firstFile.file_name}`,
          })
          return
        }
      }

      toast({
        title: "Error",
        description: "Failed to load dataset - no data available",
        variant: "destructive",
      })
    } catch (error: any) {
      console.error("Error loading dataset:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load dataset",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDataGenerated = (generatedData: any[], generatedColumns: string[], name: string) => {
    setColumns(generatedColumns)
    setVisibleColumns(generatedColumns)

    const detectedContextCol =
      generatedColumns.find((col) => col.toLowerCase().includes("context")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("text")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("description")) ||
      generatedColumns[0] ||
      ""

    const detectedResultCol =
      generatedColumns.find((col) => col.toLowerCase().includes("result")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("label")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("category")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("sentiment")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("priority")) ||
      generatedColumns.find((col) => col.toLowerCase().includes("output")) ||
      generatedColumns[1] ||
      ""

    setContextColumn(detectedContextCol)
    setResultColumn(detectedResultCol)

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
  }

  const handleFileUpload = (uploadedData: any[], uploadedColumns: string[], fileName: string) => {
    setColumns(uploadedColumns)
    setVisibleColumns(uploadedColumns)

    const detectedContextCol =
      uploadedColumns.find((col) => col.toLowerCase().includes("context")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("text")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("description")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("body")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("feedback")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("input")) ||
      uploadedColumns[0] ||
      ""

    const detectedResultCol =
      uploadedColumns.find((col) => col.toLowerCase().includes("result")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("label")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("category")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("sentiment")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("priority")) ||
      uploadedColumns.find((col) => col.toLowerCase().includes("output")) ||
      uploadedColumns[1] ||
      ""

    setContextColumn(detectedContextCol)
    setResultColumn(detectedResultCol)

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
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return Object.values(row).some((value) => String(value).toLowerCase().includes(query))
  })

  const paginatedData = filteredData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Semi-AI Labeler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select dataset, review AI suggestions, and export labeled data
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading dataset...</p>
            </div>
          </Card>
        ) : data.length === 0 ? (
          view === "select" ? (
            <DatasetSelector
              onVersionSelect={handleVersionSelect}
              onGenerateClick={() => setView("generate")}
              onFileUpload={handleFileUpload}
            />
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
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm text-muted-foreground">Context Column</p>
                  <p className="font-mono text-sm font-medium">{contextColumn || "Not detected"}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm text-muted-foreground">Result Column</p>
                  <p className="font-mono text-sm font-medium">{resultColumn || "Not detected"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="manual-mode" checked={manualMode} onCheckedChange={setManualMode} />
                <Label htmlFor="manual-mode" className="cursor-pointer">
                  Manual Labeling Mode
                </Label>
              </div>
            </div>

            {/* Column Information Section */}
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Dataset Information</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{data.length} rows</span>
                    <span>•</span>
                    <span>{columns.length} columns</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Detected Columns</h4>
                    <div className="flex flex-wrap gap-2">
                      {columns.map((col, index) => (
                        <span 
                          key={col} 
                          className={`text-xs px-2 py-1 rounded font-mono ${
                            col === contextColumn 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' 
                              : col === resultColumn 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Column Mapping</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded font-mono">
                          Context
                        </span>
                        <span className="text-sm">→</span>
                        <span className="text-sm font-medium">{contextColumn || "Not detected"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded font-mono">
                          Result
                        </span>
                        <span className="text-sm">→</span>
                        <span className="text-sm font-medium">{resultColumn || "Not detected"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <ColumnSelector
              columns={columns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onContextColumnChange={setContextColumn}
              onResultColumnChange={setResultColumn}
            />

            {!manualMode && (
              <>
                <ReferenceUploader
                  onReferenceUpdate={(content) => {
                    setReferenceContext(content)
                  }}
                />

                <ModelSelector
                  data={paginatedData}
                  contextColumn={contextColumn}
                  resultColumn={resultColumn}
                  referenceContext={referenceContext}
                  onDataUpdate={(updatedRows) => {
                    const newData = [...data]
                    updatedRows.forEach((updatedRow) => {
                      const index = newData.findIndex((row) => row._id === updatedRow._id)
                      if (index !== -1) {
                        newData[index] = updatedRow
                      }
                    })
                    setData(newData)
                  }}
                />
              </>
            )}
            <div className="flex items-center gap-4">
              <SearchFilter onSearchChange={setSearchQuery} />
              <ColumnVisibility
                columns={columns}
                visibleColumns={visibleColumns}
                onVisibilityChange={setVisibleColumns}
              />
            </div>
            {manualMode && (
              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Manual Labeling Mode:</span> AI labeling is disabled. You can edit the
                  Final Result column directly to label your data manually.
                </p>
              </Card>
            )}

            <DataGrid
              data={paginatedData}
              columns={columns}
              visibleColumns={visibleColumns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onDataUpdate={(updatedRows) => {
                const newData = [...data]
                updatedRows.forEach((updatedRow) => {
                  const index = newData.findIndex((row) => row._id === updatedRow._id)
                  if (index !== -1) {
                    newData[index] = updatedRow
                  }
                })
                setData(newData)
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
