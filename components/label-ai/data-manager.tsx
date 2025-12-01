"use client"

import { useState, useEffect } from "react"
import { Plus, Sparkles, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"
import { generateMoreData } from "@/app/api/labelai"
import { getApiKeyFromStorage, saveApiKeyToStorage } from "@/lib/label-ai-utils"

interface DataManagerProps {
  data: RowData[]
  columns: string[]
  onAddRow: (row: RowData) => void
  onAddColumn: (columnName: string) => void
  onGenerateMore: (rows: RowData[]) => void
  contextColumn: string
  apiKey?: string
  model?: string
  // (NEW) Reference CSV file content, required for Generate More (enforced by UI)
  referenceFileContent?: string
  // (NEW) Project ID and document IDs for RAG integration
  projectId?: number
  documentIds?: number[]
}

export function DataManager({
  data,
  columns,
  onAddRow,
  onAddColumn,
  onGenerateMore,
  contextColumn,
  apiKey,
  model = "gemini-2.5-flash",
  referenceFileContent = "", // default empty
  projectId,
  documentIds
}: DataManagerProps) {
  const [showAddRow, setShowAddRow] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [generateCount, setGenerateCount] = useState("5")
  const [generatePrompt, setGeneratePrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const [effectiveApiKey, setEffectiveApiKey] = useState<string>("")
  const [effectiveModel, setEffectiveModel] = useState<string>("gemini-2.5-flash")
  const [referenceMode, setReferenceMode] = useState<"csv_rag" | "rag_only">("csv_rag")
  const { toast } = useToast()
  
  // Check if RAG documents are available
  const hasRAGDocuments = projectId && documentIds && documentIds.length > 0

  // Load API key from localStorage or props
  useEffect(() => {
    const savedApiKey = getApiKeyFromStorage()
    const finalApiKey = apiKey || savedApiKey || ""
    setEffectiveApiKey(finalApiKey)
    setEffectiveModel(model || "gemini-2.5-flash")
  }, [apiKey, model])
  const handleSaveApiKey = () => {
    const trimmed = effectiveApiKey.trim()
    if (!trimmed) {
      toast({
        title: "API key required",
        description: "Enter an API key before saving.",
        variant: "destructive",
      })
      return
    }
    saveApiKeyToStorage(trimmed)
    toast({
      title: "API key saved",
      description: "We'll use this key the next time you generate data.",
    })
  }


  // Convert current data to CSV format for reference
  const convertDataToCSV = (): string => {
    // Filter out internal columns (starting with _)
    const exportColumns = columns.filter(col => !col.startsWith("_"))
    
    // Build CSV header
    const header = exportColumns.join(",")
    
    // Build CSV rows
    const rows = data.map((row) => {
      return exportColumns
        .map((col) => {
          const value = row[col] || ""
          const stringValue = String(value)
          // Escape quotes and wrap in quotes if value contains comma, newline, or quote
          const needsQuotes = stringValue.includes(",") || 
                             stringValue.includes("\n") || 
                             stringValue.includes("\r") || 
                             stringValue.includes('"')
          if (needsQuotes) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(",")
    })
    
    return [header, ...rows].join("\n")
  }

  // Get reference content: prioritize data, then referenceFileContent, then prompt
  const getReferenceContent = (): string => {
    // If we have data, use it
    if (data.length > 0) {
      return convertDataToCSV()
    }
    // Otherwise use reference file content if available
    if (referenceFileContent) {
      return referenceFileContent
    }
    // If no data and no file, we'll need prompt (handled in validation)
    return ""
  }

  const handleAddRow = () => {
    const row: RowData = {
      _id: `row-${Date.now()}`,
      _is_new: true,
      _ai_suggestion: "",
      _ai_reasoning: "",
      _confirmed: false,
      ...newRowData,
    }
    onAddRow(row)
    setNewRowData({})
    setShowAddRow(false)
    toast({
      title: "Row added",
      description: "New row has been added to the dataset",
    })
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a column name",
        variant: "destructive",
      })
      return
    }

    if (columns.includes(newColumnName)) {
      toast({
        title: "Error",
        description: "Column already exists",
        variant: "destructive",
      })
      return
    }

    onAddColumn(newColumnName)
    setNewColumnName("")
    setShowAddColumn(false)
    toast({
      title: "Column added",
      description: `Column "${newColumnName}" has been added`,
    })
  }

  const handleGenerateMore = async () => {
    const finalApiKey = (effectiveApiKey || getApiKeyFromStorage()).trim()
    
    if (!finalApiKey) {
      toast({
        title: "API key required",
        description: "Please provide an API key to generate data. You can enter it in the Model Selector section above.",
        variant: "destructive",
      })
      return
    }

    // Get reference content (data, file, or require prompt)
    const referenceContent = getReferenceContent()
    
    // If no data and no reference file, require prompt to generate from scratch
    if (!referenceContent && !generatePrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of the data you want to generate, or upload a reference file, or load data first",
        variant: "destructive",
      })
      return
    }

    // Build reference content: use CSV data if available, otherwise use reference file
    // If neither exists, create a minimal CSV with headers only (backend requires CSV format)
    let finalReferenceContent: string
    if (referenceContent) {
      finalReferenceContent = referenceContent
    } else {
      // Create minimal CSV with headers only when no data/file
      // Backend requires CSV format, so we create a header row
      const exportColumns = columns.filter(col => !col.startsWith("_"))
      finalReferenceContent = exportColumns.join(",") + "\n"
      // Add a placeholder row to help AI understand structure
      finalReferenceContent += exportColumns.map(() => "example").join(",")
    }

    setIsGenerating(true)
    try {
      const result = await generateMoreData({
        referenceFileContent: finalReferenceContent,
        columns,
        count: Number.parseInt(generateCount) || 5,
        prompt: generatePrompt.trim() || (referenceContent ? "Generate similar data based on the provided reference" : ""),
        apiKey: finalApiKey,
        model: effectiveModel,
        contextColumn,
        projectId,
        documentIds,
        referenceMode: hasRAGDocuments ? referenceMode : "csv_only",
      })
      if (result.success) {
        // result.data now expected to be array of new row dicts
        const newRows = result.data.map((row: any, index: number) => ({
          _id: `row-generated-${Date.now()}-${index}`,
          _is_new: true,
          _ai_suggestion: "",
          _ai_reasoning: "",
          _confirmed: false,
          ...row,
        }))
        onGenerateMore(newRows)
        setGenerateCount("5")
        setGeneratePrompt("")
        setShowGenerateDialog(false)
        toast({
          title: "Data generated",
          description: `Successfully generated ${newRows.length} new rows`,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate data",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Add Row */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <h3 className="font-semibold">Add Row</h3>
            </div>
            {showAddRow ? (
              <div className="space-y-3">
                {columns.map((col) => (
                  <div key={col}>
                    <Label className="text-xs">{col}</Label>
                    <Input
                      placeholder={`Enter ${col}`}
                      value={newRowData[col] || ""}
                      onChange={(e) =>
                        setNewRowData({
                          ...newRowData,
                          [col]: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddRow} className="flex-1 h-8 text-xs">
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddRow(false)}
                    className="flex-1 h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAddRow(true)} className="w-full h-8 text-xs">
                Add New Row
              </Button>
            )}
          </div>
        </Card>

        {/* Add Column */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <h3 className="font-semibold">Add Column</h3>
            </div>
            {showAddColumn ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Column Name</Label>
                  <Input
                    placeholder="Enter column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn} className="flex-1 h-8 text-xs">
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddColumn(false)}
                    className="flex-1 h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAddColumn(true)} className="w-full h-8 text-xs">
                Add New Column
              </Button>
            )}
          </div>
        </Card>

        {/* Generate More Data */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-semibold">Generate More</h3>
            </div>
            
            {/* Show info about data source */}
            {data.length > 0 && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                ✓ Using current CSV data ({data.length} rows) as reference
              </div>
            )}
            {!data.length && referenceFileContent && (
              <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">
                ✓ Using uploaded reference file
              </div>
            )}
            {!data.length && !referenceFileContent && (
              <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                ⚠ No data or file. Enter a prompt to generate from scratch.
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGenerateDialog(true)}
              className="w-full h-8 text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Generate More Data
            </Button>
          </div>
        </Card>

        {/* Generate More Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate More Data</DialogTitle>
              <DialogDescription>
                Generate new rows based on your current data, uploaded file, or custom prompt. The generated data will match your CSV column structure.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Data source info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Source</Label>
                {data.length > 0 && (
                  <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    ✓ Using current CSV data ({data.length} rows) as reference
                  </div>
                )}
                {!data.length && referenceFileContent && (
                  <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                    ✓ Using uploaded reference file
                  </div>
                )}
                {!data.length && !referenceFileContent && (
                  <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                    ⚠ No data or file. You must enter a prompt to generate from scratch.
                  </div>
                )}
              </div>

              {/* Reference Mode Selection (only show if RAG documents available) */}
              {hasRAGDocuments && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Reference Mode</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2 text-sm">
                            <p><strong>CSV + RAG:</strong> Uses both CSV data and RAG documents as reference sources. AI can extract facts from both sources.</p>
                            <p><strong>RAG Only:</strong> Uses only RAG documents as the source of facts. CSV is only used to determine column structure (headers).</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <RadioGroup value={referenceMode} onValueChange={(value) => setReferenceMode(value as "csv_rag" | "rag_only")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv_rag" id="csv_rag" />
                      <Label htmlFor="csv_rag" className="text-sm font-normal cursor-pointer">
                        CSV + RAG (use both CSV data and RAG documents)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rag_only" id="rag_only" />
                      <Label htmlFor="rag_only" className="text-sm font-normal cursor-pointer">
                        RAG Only (use only RAG documents, CSV for structure only)
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Select how AI should use reference sources when generating data.
                  </p>
                </div>
              )}
              
              {!hasRAGDocuments && projectId && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Reference Mode</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            No RAG documents are selected. Only CSV data will be used as reference. 
                            Upload and select documents in the Document RAG Manager above to enable RAG mode.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-950/20 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                    CSV Only (no RAG documents selected)
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI will use only CSV data as reference. Select documents in Document RAG Manager to enable RAG mode.
                  </p>
                </div>
              )}

              {/* Number of rows */}
              <div className="space-y-2">
                <Label htmlFor="generate-count" className="text-sm font-medium">
                  Number of Rows *
                </Label>
                <Input
                  id="generate-count"
                  type="number"
                  min="1"
                  max="50"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  placeholder="Enter number of rows to generate"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Enter how many rows you want to generate (1-50)
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="generate-prompt" className="text-sm font-medium">
                  Description / Prompt {!data.length && !referenceFileContent ? "*" : ""}
                </Label>
                <Textarea
                  id="generate-prompt"
                  placeholder={
                    data.length > 0
                      ? "Optional: describe what kind of data to generate (e.g., 'similar customer reviews', 'variations with different ratings')"
                      : referenceFileContent
                      ? "Optional: describe variations or specific requirements (e.g., 'generate more diverse examples', 'include more negative feedback')"
                      : "Required: describe the data you want to generate (e.g., 'customer reviews for a restaurant with ratings from 1-5 stars')"
                  }
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                  rows={4}
                />
                {!data.length && !referenceFileContent && (
                  <p className="text-xs text-muted-foreground">
                    Describe the data structure and content you want AI to generate. Be specific about the columns and their expected values.
                  </p>
                )}
                {(data.length > 0 || referenceFileContent) && (
                  <p className="text-xs text-muted-foreground">
                    Optional: Provide additional instructions to customize the generated data (e.g., "generate more diverse examples", "focus on negative reviews")
                  </p>
                )}
              </div>

              {/* Columns preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Columns</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg">
                  {columns.filter(col => !col.startsWith("_")).map((col) => (
                    <span key={col} className="text-xs bg-background px-2 py-1 rounded font-mono border">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated data will match these columns
                </p>
              </div>

              {/* API Key capture */}
              {!apiKey && (
                <div className="space-y-2">
                  <Label htmlFor="generate-api-key" className="text-sm font-medium">
                    Provider API Key *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="generate-api-key"
                      type="password"
                      placeholder="Enter your API key"
                      value={effectiveApiKey}
                      onChange={(e) => setEffectiveApiKey(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleSaveApiKey} disabled={!effectiveApiKey.trim()}>
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We store this key securely in your browser only. It will be used for Generate More requests.
                  </p>
                </div>
              )}

              {/* API Key warning */}
              {!effectiveApiKey && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    ⚠ <strong>API Key required:</strong> Please enter and save your API key before generating data.
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateDialog(false)
                  setGeneratePrompt("")
                }}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateMore}
                disabled={
                  isGenerating || 
                  !generateCount || 
                  Number.parseInt(generateCount) < 1 ||
                  (!data.length && !referenceFileContent && !generatePrompt.trim())
                }
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Data
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
