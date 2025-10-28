"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RowData } from "@/app/(navigation)/labeling/page"
import { useToast } from "@/hooks/use-toast"
import { MultiColumnConfig } from "@/components/label-ai/multi-column-config"

interface ModelSelectorProps {
  data: RowData[]
  contextColumn: string
  resultColumn: string
  referenceContext: string
  columns: string[]
  onDataUpdate: (data: RowData[]) => void
}

export function ModelSelector({ data, contextColumn, resultColumn, referenceContext, columns, onDataUpdate }: ModelSelectorProps) {
  const [model, setModel] = useState("gemini-flash-2.5")
  const [isLabeling, setIsLabeling] = useState(false)
  const [multiColumnConfig, setMultiColumnConfig] = useState<any[]>([])
  const { toast } = useToast()

  const handleLabel = async () => {
    if (data.length === 0) {
      toast({
        title: "No data to label",
        description: "Please upload a CSV file first.",
        variant: "destructive",
      })
      return
    }

    if (!contextColumn) {
      toast({
        title: "No context column selected",
        description: "Please select a context column to send to the AI.",
        variant: "destructive",
      })
      return
    }

    setIsLabeling(true)

    try {
      const response = await fetch("/api/label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: data,
          model,
          contextColumn,
          resultColumn,
          referenceContext,
          multiColumnConfig,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onDataUpdate(result.data)
        toast({
          title: "Labeling complete",
          description: `Successfully labeled ${result.data.length} rows with ${model}`,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error labeling data:", error)
      toast({
        title: "Labeling failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while labeling the data. Please check your API key configuration and try again.",
        variant: "destructive", 
      })
    } finally {
      setIsLabeling(false)
    }
  }

  return (
    <>
      <MultiColumnConfig
        columns={columns}
        contextColumn={contextColumn}
        resultColumn={resultColumn}
        onConfigChange={setMultiColumnConfig}
      />

      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash-2.5">Gemini Flash 2.5</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleLabel} disabled={isLabeling} className="gap-2" size="lg">
            {isLabeling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Labeling...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Label This Page
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> This will send the current page ({data.length}{" "}
            rows) to the AI model for labeling. The AI will analyze the{" "}
            <span className="font-mono">{contextColumn}</span> column and generate predictions.
            {multiColumnConfig.filter((c) => c.selected).length > 0 && (
              <span className="block mt-2 text-blue-600">
                ✓ {multiColumnConfig.filter((c) => c.selected).length} additional column(s) included for context
              </span>
            )}
            {referenceContext && (
              <span className="block mt-2 text-green-600">
                ✓ Reference documents loaded ({referenceContext.length} characters)
              </span>
            )}
          </p>
        </div>
      </Card>
    </>
  )
}
