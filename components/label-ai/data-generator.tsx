"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2 } from "lucide-react"
import { ReferenceUploader } from "@/components/label-ai/reference-uploader"
import { useToast } from "@/hooks/use-toast"
import { generateData } from "@/app/api/labelai"
import { detectDelimiter } from "@/lib/label-ai-utils"

interface DataGeneratorProps {
  onDataGenerated: (data: any[], columns: string[], datasetName: string) => void
}

export function DataGenerator({ onDataGenerated }: DataGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [rowCount, setRowCount] = useState("20")
  const [columns, setColumns] = useState("context, category")
  const [instructions, setInstructions] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [referenceContext, setReferenceContext] = useState("")
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a topic or description",
        variant: "destructive",
      })
      return
    }

    if (!apiKey.trim()) {
      toast({
        title: "API Key required",
        description: "Please enter your Gemini API key",
        variant: "destructive",
      })
      return
    }

    try {
      setGenerating(true)

      const result = await generateData({
        topic: topic.trim(),
        rowCount: Number.parseInt(rowCount) || 20,
        columns: columns
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        instructions: instructions.trim(),
        referenceContext: referenceContext.trim(),
        apiKey: apiKey.trim(),
      })

      if (result.success) {
        // Parse the CSV data with auto-detected delimiter
        const lines = result.csv.trim().split("\n")
        const firstLine = lines[0] || ""
        const delimiter = detectDelimiter(firstLine)
        const headers = firstLine.split(delimiter).map((h: string) => h.trim())
        const rows = lines.slice(1).map((line: string) => {
          const values = line.split(delimiter).map((v: string) => v.trim())
          const row: any = {}
          headers.forEach((header: string, index: number) => {
            row[header] = values[index] || ""
          })
          return row
        })

        onDataGenerated(rows, headers, `Generated: ${topic.substring(0, 30)}`)

        toast({
          title: "Data generated",
          description: `Successfully generated ${rows.length} rows`,
        })
      } else {
        toast({
          title: "Generation failed",
          description: result.error || "Failed to generate data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating data:", error)
      toast({
        title: "Error",
        description: "Failed to generate data",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Generate New Data</h2>
            <p className="text-sm text-muted-foreground">Use AI to generate sample data based on your requirements</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic / Description *</Label>
            <Input
              id="topic"
              placeholder="e.g., Customer feedback for a restaurant"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Describe what kind of data you want to generate</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rowCount">Number of Rows</Label>
              <Input
                id="rowCount"
                type="number"
                min="1"
                max="100"
                value={rowCount}
                onChange={(e) => setRowCount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="columns">Column Names</Label>
              <Input
                id="columns"
                placeholder="context, category"
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>
            <ReferenceUploader
              onReferenceUpdate={(content) => {
                setReferenceContext(content)
              }}
            />
          <div className="space-y-2">
            <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Include both positive and negative feedback, vary the length..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Gemini API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Your API key is only used for this request and not stored</p>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Data
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
