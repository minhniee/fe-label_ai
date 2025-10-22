"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings2 } from "lucide-react"

interface ColumnSelectorProps {
  columns: string[]
  contextColumn: string
  resultColumn: string
  onContextColumnChange: (column: string) => void
  onResultColumnChange: (column: string) => void
}

export function ColumnSelector({
  columns,
  contextColumn,
  resultColumn,
  onContextColumnChange,
  onResultColumnChange,
}: ColumnSelectorProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Settings2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="context-column" className="text-sm font-medium">
              Context Column
            </Label>
            <Select value={contextColumn} onValueChange={onContextColumnChange}>
              <SelectTrigger id="context-column">
                <SelectValue placeholder="Select context column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Column to send to AI for labeling</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="result-column" className="text-sm font-medium">
              Result Column
            </Label>
            <Select value={resultColumn} onValueChange={onResultColumnChange}>
              <SelectTrigger id="result-column">
                <SelectValue placeholder="Select result column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Column containing original labels (if any)</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
