"use client"

import { useState } from "react"
import { Plus, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { RowData } from "@/app/(navigation)/labeling/page"
import { generateMoreData } from "@/app/api/labelai"

interface DataManagerProps {
  data: RowData[]
  columns: string[]
  onAddRow: (row: RowData) => void
  onAddColumn: (columnName: string) => void
  onGenerateMore: (rows: RowData[]) => void
  contextColumn: string
  apiKey?: string
  model?: string
}

export function DataManager({
  data,
  columns,
  onAddRow,
  onAddColumn,
  onGenerateMore,
  contextColumn,
  apiKey,
  model = "gemini-flash-2.5",
}: DataManagerProps) {
  const [showAddRow, setShowAddRow] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [showGenerateMore, setShowGenerateMore] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [generateCount, setGenerateCount] = useState("5")
  const [generatePrompt, setGeneratePrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const { toast } = useToast()

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
    if (!apiKey) {
      toast({
        title: "API key required",
        description: "Please provide an API key to generate data",
        variant: "destructive",
      })
      return
    }

    if (data.length === 0) {
      toast({
        title: "No data to reference",
        description: "Please load or create some data first",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const result = await generateMoreData({
        existingData: data.slice(0, 10),
        columns,
        count: Number.parseInt(generateCount),
        prompt: generatePrompt,
        apiKey,
        model,
        contextColumn,
      })

      if (result.success) {
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
        setShowGenerateMore(false)

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
            {showGenerateMore ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Number of Rows</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Additional Instructions</Label>
                  <Textarea
                    placeholder="Optional: describe what kind of data to generate"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    className="h-16 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleGenerateMore}
                    disabled={isGenerating}
                    className="flex-1 h-8 text-xs gap-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowGenerateMore(false)}
                    className="flex-1 h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowGenerateMore(true)}
                className="w-full h-8 text-xs"
                disabled={!apiKey}
              >
                Generate More Data
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
