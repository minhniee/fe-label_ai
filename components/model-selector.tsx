"use client"

import { useState } from "react"
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RowData } from "@/app/AISuggest/page"
import { useToast } from "@/hooks/use-toast"

interface ModelSelectorProps {
  data: RowData[]
  contextColumn: string
  resultColumn: string
  onDataUpdate: (data: RowData[]) => void
}

export function ModelSelector({ data, contextColumn, resultColumn, onDataUpdate }: ModelSelectorProps) {
  const [model, setModel] = useState("gemini-flash-2.5")
  const [apiKey, setApiKey] = useState("")
  const [isLabeling, setIsLabeling] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const { toast } = useToast()

  const handleTestKey = async () => {
    if (!apiKey) {
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
      const response = await fetch("/api/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, model }),
      })

      const result = await response.json()

      if (result.success) {
        setKeyStatus("valid")
        toast({
          title: "API key is valid",
          description: "Your API key is working correctly.",
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
          apiKey,
          contextColumn,
          resultColumn,
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
        description: error instanceof Error ? error.message : "An error occurred while labeling the data.",
        variant: "destructive",
      })
    } finally {
      setIsLabeling(false)
    }
  }

  return (
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

        <div className="flex-1 space-y-2">
          <Label htmlFor="api-key">
            API Key <span className="text-muted-foreground">(optional)</span>
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
          rows) to the AI model for labeling. The AI will analyze the <span className="font-mono">{contextColumn}</span>{" "}
          column and generate predictions.
        </p>
      </div>
    </Card>
  )
}
