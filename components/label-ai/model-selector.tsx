"use client"

import { useState, useEffect } from "react"
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
  apiKey?: string
  selectedModel?: string
  onDataUpdate: (data: RowData[]) => void
  onLabel?: (
    rows: RowData[],
    model: string,
    apiKey: string,
    contextColumn: string,
    referenceContext: string
  ) => Promise<RowData[]>
  onTestKey?: (apiKey: string, model: string) => Promise<boolean>
}

export function ModelSelector({
  data,
  contextColumn,
  resultColumn,
  referenceContext,
  columns,
  apiKey = "",
  selectedModel = "gemini-flash-2.5",
  onDataUpdate,
  onLabel,
  onTestKey,
}: ModelSelectorProps) {
  const [model, setModel] = useState(selectedModel)
  const [isLabeling, setIsLabeling] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [multiColumnConfig, setMultiColumnConfig] = useState<any[]>([])
  const { toast } = useToast()

  // Update local model state when selectedModel prop changes
  useEffect(() => {
    if (selectedModel) {
      setModel(selectedModel)
    }
  }, [selectedModel])

  const handleTestKey = async () => {
    if (!onTestKey || !apiKey) {
      toast({
        title: "Error",
        description: "API key is required to test",
        variant: "destructive",
      })
      return
    }

    setIsTestingKey(true)
    try {
      const isValid = await onTestKey(apiKey, model)
      if (isValid) {
        toast({
          title: "API Key Valid",
          description: `Successfully connected to ${model}`,
        })
      } else {
        toast({
          title: "API Key Invalid",
          description: "Please check your API key and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test API key",
        variant: "destructive",
      })
    } finally {
      setIsTestingKey(false)
    }
  }

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

    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key in the AI Configuration section above.",
        variant: "destructive",
      })
      return
    }

    setIsLabeling(true)

    try {
      if (onLabel) {
        // Use the onLabel prop if provided (new way)
        const labeledData = await onLabel(data, model, apiKey, contextColumn, referenceContext)
        onDataUpdate(labeledData)
        toast({
          title: "Labeling complete",
          description: `Successfully labeled ${labeledData.length} rows with ${model}`,
        })
      } else {
        // Fallback to old way (direct API call)
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
            <Select value={selectedModel || model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash-2.5">Gemini Flash 2.5</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                <SelectItem value="qwen-turbo">Qwen Turbo</SelectItem>
                <SelectItem value="qwen-plus">Qwen Plus</SelectItem>
                <SelectItem value="qwen-max">Qwen Max</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-3-5-haiku">Claude 3.5 Haiku</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {onTestKey && (
            <Button
              onClick={handleTestKey}
              disabled={isTestingKey || !apiKey}
              variant="outline"
              className="gap-2"
            >
              {isTestingKey ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Key"
              )}
            </Button>
          )}

          <Button onClick={handleLabel} disabled={isLabeling || !apiKey} className="gap-2" size="lg">
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
