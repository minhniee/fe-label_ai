"use client"

import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database, Search, FileSpreadsheet, RefreshCw, Sparkles } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"

type GridRow = { id: string } & Record<string, any>

interface Dataset {
  id: string
  name: string
  status: string
  recordCount: number
}

export function DataLabelingInterface() {
  const [selectedDataset, setSelectedDataset] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [columnDefs, setColumnDefs] = useState<ColDef<GridRow>[]>([])
  const [rowData, setRowData] = useState<GridRow[]>([])
  const gridRef = useRef<AgGridReact<GridRow>>(null)

  const hasGridData = columnDefs.length > 0 && rowData.length > 0

  // Column rename state
  const [selectedCol, setSelectedCol] = useState<string>("")
  const [newHeader, setNewHeader] = useState<string>("")

  function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    // Simple CSV parser (comma-separated, respects quotes)
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }
    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'; i++
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
    const headers = parseLine(lines[0]).map(h => h.trim() || "column")
    const rows = lines.slice(1).map(parseLine)
    return { headers, rows }
  }

  async function handleFileImport(file: File) {
    setIsLoading(true)
    try {
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        setColumnDefs([])
        setRowData([])
        return
      }
      const uniqueHeaders: string[] = []
      const seen = new Set<string>()
      headers.forEach((h, idx) => {
        let key = h || `column_${idx+1}`
        while (seen.has(key)) key = `${key}_dup`
        seen.add(key)
        uniqueHeaders.push(key)
      })
      const columns: ColDef<GridRow>[] = uniqueHeaders.map((field) => ({ field, headerName: field, editable: true, resizable: true }))
      const data: GridRow[] = rows.map((r, idx) => {
        const obj: GridRow = { id: String(idx) }
        uniqueHeaders.forEach((h, i) => { obj[h] = r[i] ?? "" })
        return obj
      })
      setColumnDefs(columns)
      setRowData(data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddRow() {
    const nextId = rowData.length
    const newRow: GridRow = { id: String(nextId) }
    columnDefs.forEach(c => { const key = c.field as string; if (key && key !== "id") newRow[key] = "" })
    setRowData(prev => [...prev, newRow])
  }

  function handleAddColumn() {
    const base = "column"
    let idx = columnDefs.length + 1
    let key = `${base}_${idx}`
    const exists = (k: string) => columnDefs.some(c => c.field === k)
    while (exists(key)) { idx++; key = `${base}_${idx}` }
    const newCol: ColDef<GridRow> = { field: key, headerName: key, editable: true, resizable: true }
    setColumnDefs(prev => [...prev, newCol])
    setRowData(prev => prev.map(r => ({ ...r, [key]: "" })))
  }

  const mockDatasets: Dataset[] = [
    {
      id: "ds001",
      name: "Tuyển sinh Kỳ 1 - 2024",
      status: "ready",
      recordCount: 2000,
    },
    {
      id: "ds002",
      name: "Tuyển sinh Kỳ 2 - 2024",
      status: "processing",
      recordCount: 1500,
    },
  ]

  const recordsPerPage = 50
  const totalRecords = 100
  const totalPages = Math.ceil(totalRecords / recordsPerPage)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chọn Dataset
          </CardTitle>
          <CardDescription>Chọn bộ dữ liệu để bắt đầu gán nhãn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dataset</Label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Select dataset..." />
              </SelectTrigger>
              <SelectContent>
                {mockDatasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2">
            <Label htmlFor="file-import">Import CSV</Label>
            <Input id="file-import" type="file" accept=".csv,text/csv" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFileImport(f)
            }} />
          </div>
        </CardContent>
      </Card>

      {selectedDataset && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Data
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Suggestions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading data...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddRow} disabled={!hasGridData}>Add Row</Button>
                  <Button variant="outline" size="sm" onClick={handleAddColumn} disabled={!hasGridData}>Add Column</Button>
                </div>
                {hasGridData && (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="col-select">Rename column</Label>
                      <Select value={selectedCol} onValueChange={setSelectedCol}>
                        <SelectTrigger id="col-select">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columnDefs.map((c) => (
                            <SelectItem key={String(c.field)} value={String(c.field)}>
                              {c.headerName ?? String(c.field)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="new-header">New header</Label>
                      <Input id="new-header" placeholder="Enter new column header" value={newHeader} onChange={(e) => setNewHeader(e.target.value)} />
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!selectedCol || !newHeader) return
                          setColumnDefs((prev) => prev.map((c) => c.field === selectedCol ? { ...c, headerName: newHeader } : c))
                          setNewHeader("")
                        }}
                        disabled={!selectedCol || !newHeader}
                      >
                        Rename
                      </Button>
                    </div>
                  </div>
                )}
                <div className="border rounded-lg overflow-hidden">
                  {hasGridData ? (
                    <div className="ag-theme-quartz" style={{ height: 420 }}>
                      <AgGridReact<GridRow>
                        ref={gridRef}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={{ editable: true, resizable: true }}
                        animateRows
                        pagination
                        getRowId={(params: { data: GridRow }) => params.data.id}
                        onCellValueChanged={(e: { data: GridRow; colDef: { field?: string }; newValue: any }) => {
                          const id = e.data.id
                          setRowData(prev => prev.map(r => r.id === id ? { ...r, [e.colDef.field as string]: e.newValue } : r))
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Import a CSV file to view and edit in the grid.</div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * recordsPerPage + 1} - {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} records
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
