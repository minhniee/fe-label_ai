"use client"

import type React from "react"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Papa from "papaparse"
import { DataGrid } from "@/components/data-grid"
import { ModelSelector } from "@/components/model-selector"
import { ColumnSelector } from "@/components/column-selector"

export type RowData = {
  _id: string
  _ai_suggestion?: string
  _confirmed?: boolean
  [key: string]: any // Support any column names from CSV
}

export default function Home() {
  const [data, setData] = useState<RowData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(0)
  const [contextColumn, setContextColumn] = useState<string>("")
  const [resultColumn, setResultColumn] = useState<string>("")
  const rowsPerPage = 50

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const csvColumns = results.meta.fields || []
        setColumns(csvColumns)

        const detectedContextCol =
          csvColumns.find((col) => col.toLowerCase().includes("context")) ||
          csvColumns.find((col) => col.toLowerCase().includes("text")) ||
          csvColumns.find((col) => col.toLowerCase().includes("input")) ||
          csvColumns[0] ||
          ""

        const detectedResultCol =
          csvColumns.find((col) => col.toLowerCase().includes("result")) ||
          csvColumns.find((col) => col.toLowerCase().includes("label")) ||
          csvColumns.find((col) => col.toLowerCase().includes("output")) ||
          csvColumns[1] ||
          ""

        setContextColumn(detectedContextCol)
        setResultColumn(detectedResultCol)

        const parsedData: RowData[] = results.data
          .filter((row: any) => {
            // Filter out completely empty rows
            return Object.values(row).some((val) => val !== null && val !== undefined && val !== "")
          })
          .map((row: any, index: number) => ({
            _id: `row-${index}`,
            _ai_suggestion: "",
            _confirmed: false,
            ...row, // Preserve all original columns
          }))
        setData(parsedData)
        setCurrentPage(0)
      },
      error: (error) => {
        console.error("Error parsing CSV:", error)
      },
    })
  }

  const paginatedData = data.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)

  const totalPages = Math.ceil(data.length / rowsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Semi-AI Labeler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload CSV, review AI suggestions, and export labeled data
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {data.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Upload your CSV file</h2>
                <p className="text-muted-foreground mb-6">
                  Upload any CSV file - column names will be automatically detected
                </p>
              </div>
              <label htmlFor="file-upload">
                <Button asChild>
                  <span className="cursor-pointer">Choose File</span>
                </Button>
              </label>
              <input id="file-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">File loaded</p>
                  <p className="font-mono text-sm font-medium">{fileName}</p>
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
              <label htmlFor="file-upload-new">
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">Upload New File</span>
                </Button>
              </label>
              <input id="file-upload-new" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </div>

            <ColumnSelector
              columns={columns}
              contextColumn={contextColumn}
              resultColumn={resultColumn}
              onContextColumnChange={setContextColumn}
              onResultColumnChange={setResultColumn}
            />

            <ModelSelector
              data={paginatedData}
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
            />

            <DataGrid
              data={paginatedData}
              columns={columns}
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
            />
          </div>
        )}
      </main>
    </div>
  )
}
