"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataGrid } from "@/components/data-grid"
import { ModelSelector } from "@/components/model-selector"
import { ColumnSelector } from "@/components/column-selector"
import { ReferenceUploader } from "@/components/reference-uploader"
import { DatasetSelector } from "@/components/dataset-selector"
import { DataGenerator } from "@/components/data-generator"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _ai_reasoning?: string
  _confirmed?: boolean
  [key: string]: any
}

type GridRow = {
  id: string
  [key: string]: any
}

type ColDef<T> = {
  field: string
  headerName: string
  editable: boolean
  resizable: boolean
  hide?: boolean
}

type DataFile = {
  file_id: string
  content?: string
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
  const { toast } = useToast()
  const rowsPerPage = 50

  // Helper functions
  const getFilePreview = async (fileId: string) => {
    const response = await fetch(`/api/files/${fileId}/preview`)
    if (!response.ok) throw new Error("Failed to fetch preview")
    return response.json()
  }

  const parseCsv = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter(Boolean)

    if (lines.length === 0) return { headers: [], rows: [] }

    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === "," && !inQuotes) {
          result.push(current)
          current = ""
        } else {
          current += ch
        }
      }
      result.push(current)
      return result
    }

    const headers = parseLine(lines[0]).map((h) => h.trim() || "column")
    const rows = lines.slice(1).map(parseLine)
    return { headers, rows }
  }

  const detectContextColumn = (cols: string[]): string => {
    return (
      cols.find((col) => col.toLowerCase().includes("context")) ||
      cols.find((col) => col.toLowerCase().includes("text")) ||
      cols.find((col) => col.toLowerCase().includes("description")) ||
      cols.find((col) => col.toLowerCase().includes("body")) ||
      cols.find((col) => col.toLowerCase().includes("feedback")) ||
      cols.find((col) => col.toLowerCase().includes("input")) ||
      cols[0] ||
      ""
    )
  }

  const detectResultColumn = (cols: string[]): string => {
    return (
      cols.find((col) => col.toLowerCase().includes("result")) ||
      cols.find((col) => col.toLowerCase().includes("label")) ||
      cols.find((col) => col.toLowerCase().includes("category")) ||
      cols.find((col) => col.toLowerCase().includes("sentiment")) ||
      cols.find((col) => col.toLowerCase().includes("priority")) ||
      cols.find((col) => col.toLowerCase().includes("output")) ||
      cols[1] ||
      ""
    )
  }

  // Handlers
  const handleVersionSelect = async (file: DataFile) => {
    setLoading(true)
    try {
      let headers: string[] = []
      let rows: any[] = []

      try {
        const preview = await getFilePreview(file.file_id)
        headers = preview.headers || []
        rows = preview.rows || []
      } catch {
        if (file.content) {
          const parsed = parseCsv(file.content)
          headers = parsed.headers
          rows = parsed.rows
        }
      }

      if (headers.length === 0 || !Array.isArray(rows) || rows.length === 0) {
        toast({
          title: "Error",
          description: "No valid data found in file",
          variant: "destructive",
        })
        return
      }

      // Normalize headers
      const uniqueHeaders: string[] = []
      const seen = new Set<string>()
      headers.forEach((h, idx) => {
        let key = h || `column_${idx + 1}`
        while (seen.has(key)) key = `${key}_dup`
        seen.add(key)
        uniqueHeaders.push(key)
      })

      // Detect hidden columns
      const hiddenColumns = new Set<string>()
      uniqueHeaders.forEach((header, index) => {
        if (!header || header.trim() === "" || header.includes("_HIDDEN_")) {
          hiddenColumns.add(header)
        }

        const allEmpty = rows.every((row) => {
          if (Array.isArray(row)) {
            return !row[index] || String(row[index]).trim() === ""
          } else if (row && typeof row === "object") {
            return !row[header] || String(row[header]).trim() === ""
          }
          return true
        })

        if (allEmpty && rows.length > 0) {
          hiddenColumns.add(header)
        }
      })

      // Transform data
      const transformedData: RowData[] = rows.map((r: any, idx: number) => {
        const rowObj: RowData = {
          _id: `row-${idx}`,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
        }

        if (Array.isArray(r)) {
          uniqueHeaders.forEach((h, i) => {
            rowObj[h] = r[i] ?? ""
          })
        } else if (r && typeof r === "object") {
          uniqueHeaders.forEach((h) => {
            rowObj[h] = r[h] ?? ""
          })
        }

        return rowObj
      })

      setColumns(uniqueHeaders)
      setData(transformedData)
      setContextColumn(detectContextColumn(uniqueHeaders))
      setResultColumn(detectResultColumn(uniqueHeaders))
      setDatasetName(file.file_id.split("/").pop() || "Untitled")
      setCurrentPage(0)

      toast({
        title: "Success",
        description: `Loaded ${transformedData.length} rows with ${uniqueHeaders.length} columns`,
      })
    } catch (error) {
      console.error("Error loading file:", error)
      toast({
        title: "Error",
        description: "Failed to load dataset",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDataGenerated = (
    generatedData: any[],
    generatedColumns: string[],
    name: string
  ) => {
    setColumns(generatedColumns)
    setContextColumn(detectContextColumn(generatedColumns))
    setResultColumn(detectResultColumn(generatedColumns))

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

  const handleFileUpload = (
    uploadedData: any[],
    uploadedColumns: string[],
    fileName: string
  ) => {
    setColumns(uploadedColumns)
    setContextColumn(detectContextColumn(uploadedColumns))
    setResultColumn(detectResultColumn(uploadedColumns))

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

  const handleReset = () => {
    setData([])
    setColumns([])
    setDatasetName("")
    setCurrentPage(0)
    setContextColumn("")
    setResultColumn("")
    setReferenceContext("")
    setView("select")
    setManualMode(false)
  }

  const paginatedData = data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  )
  const totalPages = Math.ceil(data.length / rowsPerPage)

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
              <div className="flex items-center gap-4 flex-wrap">
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
                <Switch
                  id="manual-mode"
                  checked={manualMode}
                  onCheckedChange={setManualMode}
                />
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
                  onDataUpdate={(updatedRows) => {
                    const newData = [...data]
                    updatedRows.forEach((updatedRow) => {
                      const index = newData.findIndex(
                        (row) => row._id === updatedRow._id
                      )
                      if (index !== -1) {
                        newData[index] = updatedRow
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
                  <span className="font-medium">Manual Labeling Mode:</span> AI
                  labeling is disabled. You can edit the Final Result column directly
                  to label your data manually.
                </p>
              </Card>
            )}

            <DataGrid
              data={paginatedData}
              columns={columns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onDataUpdate={(updatedRows) => {
                const newData = [...data]
                updatedRows.forEach((updatedRow) => {
                  const index = newData.findIndex(
                    (row) => row._id === updatedRow._id
                  )
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