"use client"

import { useState, useEffect } from "react"
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RowData } from "@/app/(navigation)/labelai/page"
import { useToast } from "@/hooks/use-toast"
import { MultiColumnConfig } from "@/components/label-ai/multi-column-config"
import { testApiKey, labelData } from "@/app/api/labelai"

interface ModelSelectorProps {
  data: RowData[]
  contextColumn: string
  resultColumn: string
  referenceContext: string
  columns: string[]
  onDataUpdate: (data: RowData[]) => void
}

export function ModelSelector({
  data,
  contextColumn,
  resultColumn,
  referenceContext,
  columns,
  onDataUpdate,
}: ModelSelectorProps) {
  const [model, setModel] = useState("gemini-flash-2.5")
  const [apiKey, setApiKey] = useState("")
  const [isLabeling, setIsLabeling] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const [multiColumnConfig, setMultiColumnConfig] = useState<any[]>([])
  const { toast } = useToast()

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const savedApiKey = localStorage.getItem("llm_api_key") || localStorage.getItem("gemini_api_key")
      if (savedApiKey) {
        setApiKey(savedApiKey)
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [])

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "No API key provided",
        description: "Please enter an API key to test.",
        variant: "destructive",
      })
      return
    }

    setIsTestingKey(true)
    setKeyStatus("idle")

    try {
      const result = await testApiKey(apiKey.trim(), model)

      if (result.success) {
        setKeyStatus("valid")
        // Save API key to localStorage
        try {
          localStorage.setItem("llm_api_key", apiKey.trim())
        } catch (error) {
          // Ignore localStorage errors
        }
        toast({
          title: "API Key Valid",
          description: result.message || "Your API key is valid and ready to use.",
        })
      } else {
        setKeyStatus("invalid")
        throw new Error(result.error)
      }
    } catch (error) {
      setKeyStatus("invalid")
      toast({
        title: "Invalid API key",
        description: error instanceof Error ? error.message : "The API key could not be verified.",
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

    if (!apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Please enter your Gemini API key to use AI labeling.",
        variant: "destructive",
      })
      return
    }

    setIsLabeling(true)

    try {
      const result = await labelData({
        rows: data,
        model,
        apiKey: apiKey.trim(),
        contextColumn,
        resultColumn,
        referenceContext,
        multiColumnConfig,
      })

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
            : "An error occurred while labeling the data. Please check your API key and try again.",
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
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="qwen-turbo">Qwen Turbo</SelectItem>
                <SelectItem value="qwen-plus">Qwen Plus</SelectItem>
                <SelectItem value="qwen-max">Qwen Max</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label htmlFor="api-key">
              API Key <span className="text-muted-foreground">(provider key)</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyStatus("idle")
                  }}
                />
                {keyStatus === "valid" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {keyStatus === "invalid" && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleTestKey}
                disabled={isTestingKey || !apiKey}
                className="gap-2 bg-transparent"
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
            </div>
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
