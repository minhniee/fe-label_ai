"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Calendar, Columns, Loader2, Sparkles } from "lucide-react"
import { getDatasets } from "@/app/api/datasets"

interface Dataset {
  id: string
  name: string
  description: string
  rowCount: number
  columns: string[]
  createdAt: string
}

interface DatasetSelectorProps {
  onDatasetSelect: (datasetId: string) => void
  onGenerateClick: () => void
}

export function DatasetSelector({ onDatasetSelect, onGenerateClick }: DatasetSelectorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const response = await getDatasets()
      const result = await response.json()

      if (result.success) {
        setDatasets(result.datasets)
      } else {
        console.error("Failed to fetch datasets:", result.error)
      }
    } catch (error) {
      console.error("Error fetching datasets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (datasetId: string) => {
    setSelectedId(datasetId)
    onDatasetSelect(datasetId)
  }

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading datasets...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Select a Dataset</h2>
            <p className="text-sm text-muted-foreground">Choose a dataset from your database to start labeling</p>
          </div>
        </div>
        <Button onClick={onGenerateClick} variant="outline">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate New Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((dataset) => (
          <Card
            key={dataset.id}
            className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
              selectedId === dataset.id ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => handleSelect(dataset.id)}
          >
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{dataset.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{dataset.description}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{dataset.rowCount} rows</span>
                </div>
                <div className="flex items-center gap-1">
                  <Columns className="h-3 w-3" />
                  <span>{dataset.columns.length} columns</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{dataset.createdAt}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {dataset.columns.slice(0, 4).map((col) => (
                  <span key={col} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {col}
                  </span>
                ))}
                {dataset.columns.length > 4 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5">+{dataset.columns.length - 4} more</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
