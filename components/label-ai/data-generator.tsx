"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2, ArrowLeft, Info, TrendingUp } from "lucide-react"
import { ReferenceUploader } from "@/components/label-ai/reference-uploader"
import { useToast } from "@/hooks/use-toast"
import { generateData, estimateMaxRows } from "@/app/api/labelai"
import { parseCSVFromText } from "@/lib/label-ai-utils"

export interface DataGeneratorProps {
  onDataGenerated: (data: any[], columns: string[], datasetName: string) => void
  onBack?: () => void
}

export function DataGenerator({ onDataGenerated, onBack }: DataGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [rowCount, setRowCount] = useState("20")
  const [columns, setColumns] = useState("context, category")
  const [instructions, setInstructions] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [referenceContext, setReferenceContext] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateStartTime, setGenerateStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [estimating, setEstimating] = useState(false)
  const [estimate, setEstimate] = useState<{
    max_rows: number
    confidence: string
    reasoning: string
    factors?: any
  } | null>(null)
  const { toast } = useToast()

  // Timer effect: update elapsed time while generating
  useEffect(() => {
    if (!generating || generateStartTime === null) {
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - generateStartTime
      setElapsedTime(elapsed)
    }, 100) // Update every 100ms for smooth display

    return () => clearInterval(interval)
  }, [generating, generateStartTime])

  const handleEstimateClick = async () => {
    if (!referenceContext.trim()) {
      toast({
        title: "Reference required",
        description: "Please upload reference content before estimating.",
        variant: "destructive",
      })
      return
    }
    if (!columns.trim()) {
      toast({
        title: "Columns required",
        description: "Please enter column names before estimating.",
        variant: "destructive",
      })
      return
    }
    if (!apiKey.trim()) {
      toast({
        title: "API Key required",
        description: "Enter your Gemini API key to run estimation.",
        variant: "destructive",
      })
      return
    }

    try {
      setEstimating(true)
      const result = await estimateMaxRows({
        reference_context: referenceContext.trim(),
        columns: columns.trim(),
        api_key: apiKey.trim(),
        topic: topic.trim(),
      })

      if (result.success) {
        setEstimate(result)
        toast({
          title: "Estimate completed",
          description: `Estimated max rows: ${result.max_rows} (${result.confidence} confidence)`,
        })
      }
    } catch (error) {
      console.error("Error estimating max rows:", error)
      setEstimate(null)
      toast({
        title: "Estimation failed",
        description: "Could not estimate max rows. Please try again.",
        variant: "destructive",
      })
    } finally {
      setEstimating(false)
    }
  }

  const clearEstimate = () => {
    setEstimate(null)
  }

  const applyEstimate = () => {
    if (estimate) {
      setRowCount(estimate.max_rows.toString())
      toast({
        title: "Row count updated",
        description: `Set to ${estimate.max_rows} rows based on estimate`,
      })
    }
  }

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
      const startTime = Date.now()
      setGenerateStartTime(startTime)
      setElapsedTime(0)

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

      const endTime = Date.now()
      const duration = endTime - startTime
      setElapsedTime(duration)

      if (result.success) {
        // Parse the CSV data using centralized function
        const { data, columns } = parseCSVFromText(result.csv)

        onDataGenerated(data, columns, `Generated: ${topic.substring(0, 30)}`)

        toast({
          title: "Data generated",
          description: `Successfully generated ${data.length} rows in ${(duration / 1000).toFixed(2)}s`,
        })
      } else {
        toast({
          title: "Generation failed",
          description: result.error || "Failed to generate data",
          variant: "destructive",
        })
      }
    } catch (error) {
      const endTime = Date.now()
      const duration = generateStartTime ? endTime - generateStartTime : 0
      setElapsedTime(duration)
      console.error("Error generating data:", error)
      toast({
        title: "Error",
        description: "Failed to generate data",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
      setGenerateStartTime(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 px-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Generate New Data</h2>
            <p className="text-sm text-muted-foreground">
              Use AI to generate sample data based on your requirements
            </p>
          </div>
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
                disabled={!!estimate}
            />
            <p className="text-xs text-muted-foreground">Describe what kind of data you want to generate</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rowCount">Number of Rows</Label>
              <div className="flex gap-2">
                <Input
                  id="rowCount"
                  type="number"
                  min="1"
                  max="10000"
                  value={rowCount}
                  onChange={(e) => setRowCount(e.target.value)}
                  className="flex-1"
                    disabled={!!estimate}
                />
                {estimate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyEstimate}
                    className="whitespace-nowrap"
                    title={`Apply estimated max: ${estimate.max_rows} rows`}
                  >
                    Use {estimate.max_rows}
                  </Button>
                )}
              </div>
              {estimate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>
                    Estimated max: <strong>{estimate.max_rows}</strong> rows ({estimate.confidence} confidence)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="columns">Column Names</Label>
              <Input
                id="columns"
                placeholder="context, category"
                value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  disabled={!!estimate}
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>
            <ReferenceUploader
              onReferenceUpdate={(content, files) => {
                setReferenceContext(content)
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Manually estimate maximum rows based on uploaded reference.</span>
              </div>
              <div className="flex gap-2">
                {estimate && (
                  <Button variant="ghost" size="sm" onClick={clearEstimate}>
                    Clear estimate
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEstimateClick}
                  disabled={estimating || !!estimate}
                >
                  {estimating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Estimating...
                    </>
                  ) : (
                    "Estimate max rows"
                  )}
                </Button>
              </div>
            </div>
            
            {/* Estimate Display Card */}
            {estimate && (
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Row Estimate Analysis
                      </h4>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      estimate.confidence === "high" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : estimate.confidence === "medium"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {estimate.confidence.toUpperCase()} CONFIDENCE
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {estimate.max_rows}
                      </span>
                      <span className="text-sm text-muted-foreground">max rows</span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {estimate.reasoning}
                    </p>
                    
                    {estimate.factors && (
                      <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Analysis Factors:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {estimate.factors.document_length_chars && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                              {estimate.factors.document_length_chars.toLocaleString()} chars
                            </span>
                          )}
                          {estimate.factors.columns_count && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                              {estimate.factors.columns_count} columns
                            </span>
                          )}
                          {estimate.factors.information_density && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                              {estimate.factors.information_density} density
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {Number.parseInt(rowCount) > estimate.max_rows && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        Your requested row count ({rowCount}) exceeds the estimated maximum ({estimate.max_rows}). 
                        This may result in more duplicate data.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {estimating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing document to estimate max rows...</span>
              </div>
            )}
          <div className="space-y-2">
            <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Include both positive and negative feedback, vary the length..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={!!estimate}
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
              disabled={!!estimate}
            />
            <p className="text-xs text-muted-foreground">Your API key is only used for this request and not stored</p>
          </div>

          <div className="space-y-2">
            <Button onClick={handleGenerate} disabled={generating || !!estimate} className="w-full">
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
            {generating && (
              <p className="text-xs text-center text-muted-foreground font-mono">
                Elapsed time: {elapsedTime > 0 ? `${(elapsedTime / 1000).toFixed(1)}s` : "0.0s"}
              </p>
            )}
            {!generating && elapsedTime > 0 && (
              <p className="text-xs text-center text-muted-foreground font-mono">
                Completed in {(elapsedTime / 1000).toFixed(1)}s
              </p>
            )}
          </div>
      </div>
    </div>
  )
}
