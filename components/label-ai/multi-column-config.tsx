"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp } from "lucide-react"

interface MultiColumnConfigProps {
  columns: string[]
  contextColumn: string
  resultColumn: string
  onConfigChange: (config: Array<{ name: string; selected: boolean; description: string }>) => void
}

export function MultiColumnConfig({ columns, contextColumn, resultColumn, onConfigChange }: MultiColumnConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [config, setConfig] = useState<Array<{ name: string; selected: boolean; description: string }>>(
    columns
      .filter((col) => col !== contextColumn && col !== resultColumn)
      .map((col) => ({
        name: col,
        selected: false,
        description: "",
      })),
  )

  const handleToggleColumn = (index: number) => {
    const updated = [...config]
    updated[index].selected = !updated[index].selected
    setConfig(updated)
    onConfigChange(updated)
  }

  const handleDescriptionChange = (index: number, description: string) => {
    const updated = [...config]
    updated[index].description = description
    setConfig(updated)
    onConfigChange(updated)
  }

  const selectedCount = config.filter((c) => c.selected).length

  return (
    <Card className="p-4 bg-secondary/30 border-secondary">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-secondary/50 p-2 rounded transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">Multi-Column AI Labeling</h3>
          {selectedCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
              {selectedCount} column{selectedCount !== 1 ? "s" : ""} selected
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Select additional columns to include as context when sending data to the AI. You can optionally add
            descriptions to help the AI understand each column better.
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {config.map((item, index) => (
              <div key={item.name} className="space-y-2 p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`col-${item.name}`}
                    checked={item.selected}
                    onCheckedChange={() => handleToggleColumn(index)}
                  />
                  <Label htmlFor={`col-${item.name}`} className="font-mono text-sm cursor-pointer flex-1">
                    {item.name}
                  </Label>
                </div>

                {item.selected && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor={`desc-${item.name}`} className="text-xs text-muted-foreground">
                      Description (optional)
                    </Label>
                    <Input
                      id={`desc-${item.name}`}
                      placeholder={`e.g., "User feedback about the product"`}
                      value={item.description}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {config.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No additional columns available. The context and result columns are automatically used.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
