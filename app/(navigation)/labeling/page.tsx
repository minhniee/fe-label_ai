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
import { getAuthHeaders } from "@/app/api/auth"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchFilter } from "@/components/label-ai/search-filter"
import { ColumnVisibility } from "@/components/label-ai/column-visibility"
import { DataManager } from "@/components/label-ai/data-manager"
import { AISearch } from "@/components/label-ai/ai-search"

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _ai_reasoning?: string
  _confirmed?: boolean
  [key: string]: any
}

export default function Home() {
  // Labeling API integration
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

  const handleAILabeling = async (
    rows: RowData[],
    model: string,
    apiKey: string,
    contextColumn: string,
    referenceContext: string
  ): Promise<RowData[]> => {
    const response = await fetch(`${API_BASE}/ai-labeling/label`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        rows,
        model,
        apiKey,
        contextColumn,
        referenceContext,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Failed to label data")
    }

    return result.data || []
  }

  const handleTestAPIKey = async (apiKey: string, model: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/ai-labeling/test-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ apiKey, model }),
      })

      const result = await response.json()
      return result.success === true
    } catch (error) {
      console.error("Error testing API key:", error)
      return false
    }
  }
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
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("gemini-flash-2.5")
  const { toast } = useToast()
  const rowsPerPage = 50

  const handleVersionSelect = async (datasetId: string, versionId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/datasets/${datasetId}/versions/${versionId}?page=0&limit=50`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })
      const result = await response.json()

      if (result.success) {
        const datasetData = result.data
        const totalCount = result.totalCount || datasetData.length

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
          description: `Successfully loaded ${transformedData.length} of ${totalCount} rows`,
        })
      } else {
        if (result.error === "Not authenticated" || result.error?.includes("authentication")) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access datasets. Redirecting to login page...",
            variant: "destructive",
          })
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = "/"
          }, 2000)
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load dataset",
            variant: "destructive",
          })
        }
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

  const handleGenerateMore = (newRows: RowData[]) => {
    setData([...data, ...newRows])
  }

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
            <div className="space-y-6">
              <AISearch onSearchResults={setSearchResults} />
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

            <div className="flex items-center gap-4">
              <SearchFilter onSearchChange={setSearchQuery} />
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
                <ReferenceUploader
                  onReferenceUpdate={(content) => {
                    setReferenceContext(content)
                  }}
                />

                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">AI Configuration</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure your AI model and API key for automated labeling
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder="Enter your API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from your chosen provider (OpenAI, Google, DeepSeek, etc.)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="model-select">AI Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger id="model-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Google Gemini Models */}
                            <SelectItem value="gemini-flash-2.5">Gemini Flash 2.5</SelectItem>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                            
                            {/* OpenAI GPT Models */}
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            
                            {/* DeepSeek Models */}
                            <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                            <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                            
                            {/* Qwen Models */}
                            <SelectItem value="qwen-turbo">Qwen Turbo</SelectItem>
                            <SelectItem value="qwen-plus">Qwen Plus</SelectItem>
                            <SelectItem value="qwen-max">Qwen Max</SelectItem>
                            
                            {/* Claude Models */}
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-5-haiku">Claude 3.5 Haiku</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose the AI model that best fits your needs and budget
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <ModelSelector
                  data={paginatedData}
                  contextColumn={contextColumn}
                  resultColumn={resultColumn}
                  referenceContext={referenceContext}
                  columns={columns}
                  apiKey={apiKey}
                  selectedModel={selectedModel}
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
                  onLabel={handleAILabeling}
                  onTestKey={handleTestAPIKey}
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
