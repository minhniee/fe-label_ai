"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { OptimizedDataGrid } from "@/components/optimized-data-grid"
import { ModelSelector } from "@/components/model-selector"
import { ColumnSelector } from "@/components/column-selector"
import { ReferenceUploader } from "@/components/reference-uploader"
import { DatasetSelector } from "@/components/dataset-selector"
import { DataGenerator } from "@/components/data-generator"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PerformanceMonitor } from "@/lib/performance"

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _ai_reasoning?: string
  _confirmed?: boolean
  [key: string]: any
}

export default function OptimizedHome() {
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
  const { toast } = useToast()
  const rowsPerPage = 50

  // Initialize performance monitoring
  useEffect(() => {
    PerformanceMonitor.initWebVitals()
    return () => PerformanceMonitor.cleanup()
  }, [])

  // Memoized paginated data to prevent unnecessary recalculations
  const paginatedData = useMemo(() => 
    data.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage),
    [data, currentPage, rowsPerPage]
  )

  const totalPages = useMemo(() => 
    Math.ceil(data.length / rowsPerPage),
    [data.length, rowsPerPage]
  )

  // Optimized version select handler with performance monitoring
  const handleVersionSelect = useCallback(async (datasetId: string, versionId: string) => {
    PerformanceMonitor.startTiming('dataset-load')
    
    try {
      setLoading(true)
      datasetId = "1"
      versionId = "2"
      
      const response = await fetch(`/api/datasets/${datasetId}/versions/${versionId}`)
      const result = await response.json()

      if (result.success) {
        const datasetData = result.data

        const datasetColumns = Object.keys(datasetData[0] || {})
        setColumns(datasetColumns)

        // Optimized column detection
        const contextColumnCandidates = [
          'context', 'text', 'description', 'body', 'feedback', 'input'
        ]
        const resultColumnCandidates = [
          'result', 'label', 'category', 'sentiment', 'priority', 'output'
        ]

        const detectedContextCol = datasetColumns.find((col) => 
          contextColumnCandidates.some(candidate => 
            col.toLowerCase().includes(candidate)
          )
        ) || datasetColumns[0] || ""

        const detectedResultCol = datasetColumns.find((col) => 
          resultColumnCandidates.some(candidate => 
            col.toLowerCase().includes(candidate)
          )
        ) || datasetColumns[1] || ""

        setContextColumn(detectedContextCol)
        setResultColumn(detectedResultCol)

        // Optimized data transformation
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
      toast({
        title: "Error",
        description: "Failed to load dataset",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      PerformanceMonitor.endTiming('dataset-load')
    }
  }, [toast])

  // Optimized data update handler
  const handleDataUpdate = useCallback((updatedRows: RowData[]) => {
    setData(prevData => {
      const newData = [...prevData]
      updatedRows.forEach((updatedRow) => {
        const index = newData.findIndex((row) => row._id === updatedRow._id)
        if (index !== -1) {
          newData[index] = updatedRow
        }
      })
      return newData
    })
  }, [])

  // Memoized handlers to prevent unnecessary re-renders
  const handleDataGenerated = useCallback((generatedData: any[], generatedColumns: string[], name: string) => {
    setColumns(generatedColumns)

    const contextColumnCandidates = ['context', 'text', 'description']
    const resultColumnCandidates = ['result', 'label', 'category', 'sentiment', 'priority', 'output']

    const detectedContextCol = generatedColumns.find((col) => 
      contextColumnCandidates.some(candidate => col.toLowerCase().includes(candidate))
    ) || generatedColumns[0] || ""

    const detectedResultCol = generatedColumns.find((col) => 
      resultColumnCandidates.some(candidate => col.toLowerCase().includes(candidate))
    ) || generatedColumns[1] || ""

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
  }, [])

  const handleReset = useCallback(() => {
    setData([])
    setColumns([])
    setDatasetName("")
    setCurrentPage(0)
    setContextColumn("")
    setResultColumn("")
    setView("select")
  }, [])

  const handleFileUpload = useCallback((uploadedData: any[], uploadedColumns: string[], fileName: string) => {
    setColumns(uploadedColumns)

    const contextColumnCandidates = ['context', 'text', 'description', 'body', 'feedback', 'input']
    const resultColumnCandidates = ['result', 'label', 'category', 'sentiment', 'priority', 'output']

    const detectedContextCol = uploadedColumns.find((col) => 
      contextColumnCandidates.some(candidate => col.toLowerCase().includes(candidate))
    ) || uploadedColumns[0] || ""

    const detectedResultCol = uploadedColumns.find((col) => 
      resultColumnCandidates.some(candidate => col.toLowerCase().includes(candidate))
    ) || uploadedColumns[1] || ""

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
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Semi-AI Labeler (Optimized)</h1>
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
              </div>
              <div className="flex items-center gap-2">
                <Switch id="manual-mode" checked={manualMode} onCheckedChange={setManualMode} />
                <Label htmlFor="manual-mode" className="cursor-pointer">
                  Manual Labeling Mode
                </Label>
              </div>
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
                  onDataUpdate={handleDataUpdate}
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

            <OptimizedDataGrid
              data={paginatedData}
              columns={columns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onDataUpdate={handleDataUpdate}
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

