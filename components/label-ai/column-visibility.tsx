"use client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface ColumnVisibilityProps {
  columns: string[]
  visibleColumns: string[]
  onVisibilityChange: (columns: string[]) => void
}

export function ColumnVisibility({ columns, visibleColumns, onVisibilityChange }: ColumnVisibilityProps) {
  // Filter out internal columns that should never be shown
  const internalColumns = ["_id", "_ai_suggestion", "_ai_reasoning", "_confirmed", "_validation_status", "_corrected_value", "__corrected_value", "_is_new"]
  const displayableColumns = columns.filter(
    (col) => !internalColumns.includes(col) && !col.startsWith("_validation_status") && !col.startsWith("_corrected_value") && !col.startsWith("__corrected_value")
  )
  const visibleDisplayableColumns = visibleColumns.filter(
    (col) => !internalColumns.includes(col) && !col.startsWith("_validation_status") && !col.startsWith("_corrected_value") && !col.startsWith("__corrected_value")
  )
  const hiddenCount = displayableColumns.length - visibleDisplayableColumns.length

  const handleToggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      onVisibilityChange(visibleColumns.filter((c) => c !== column))
    } else {
      onVisibilityChange([...visibleColumns, column])
    }
  }

  const handleShowAll = () => {
    onVisibilityChange(displayableColumns)
  }

  const handleHideAll = () => {
    onVisibilityChange([])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Eye className="h-4 w-4" />
          Columns
          {hiddenCount > 0 && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{hiddenCount} hidden</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Toggle column visibility</p>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto px-2 py-1">
          {displayableColumns.map((column) => (
            <div
              key={column}
              className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-secondary/50 px-2 rounded"
            >
              <Checkbox
                id={`col-${column}`}
                checked={visibleColumns.includes(column)}
                onCheckedChange={() => handleToggleColumn(column)}
              />
              <Label htmlFor={`col-${column}`} className="text-sm font-mono cursor-pointer flex-1">
                {column}
              </Label>
            </div>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleShowAll} className="text-xs h-7 flex-1">
            Show All
          </Button>
          <Button size="sm" variant="ghost" onClick={handleHideAll} className="text-xs h-7 flex-1">
            Hide All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
