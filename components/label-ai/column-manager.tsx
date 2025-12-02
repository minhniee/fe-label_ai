"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, X, Check, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"

interface ColumnManagerProps {
  columns: string[]
  data: RowData[]
  contextColumn: string
  resultColumn: string
  onColumnsUpdateAction: (newColumns: string[]) => void
  onDataUpdateAction: (newData: RowData[]) => void
  onContextColumnChange?: (column: string) => void
  onResultColumnChange?: (column: string) => void
}

export function ColumnManager({
  columns,
  data,
  contextColumn,
  resultColumn,
  onColumnsUpdateAction,
  onDataUpdateAction,
  onContextColumnChange,
  onResultColumnChange,
}: ColumnManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editColumnName, setEditColumnName] = useState("")
  const [deletingColumn, setDeletingColumn] = useState<string | null>(null)
  const { toast } = useToast()

  // Filter out internal columns
  const displayColumns = columns.filter(
    (col) => !col.startsWith("_") && col !== contextColumn && col !== resultColumn,
  )
  // Ensure uniqueness by using Set to deduplicate
  const allManagedColumns = Array.from(
    new Set([
      ...displayColumns,
      ...(contextColumn ? [contextColumn] : []),
      ...(resultColumn ? [resultColumn] : []),
    ])
  )

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Column name cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Check for duplicate names
    if (columns.includes(newColumnName.trim())) {
      toast({
        title: "Error",
        description: "Column with this name already exists",
        variant: "destructive",
      })
      return
    }

    // Check if name starts with underscore (reserved for internal columns)
    if (newColumnName.trim().startsWith("_")) {
      toast({
        title: "Error",
        description: "Column name cannot start with underscore (_)",
        variant: "destructive",
      })
      return
    }

    // Add new column to columns list
    const updatedColumns = [...columns, newColumnName.trim()]
    onColumnsUpdateAction(updatedColumns)

    // Add new column to all rows with empty value
    const updatedData = data.map((row) => ({
      ...row,
      [newColumnName.trim()]: "",
    }))
    onDataUpdateAction(updatedData)

    toast({
      title: "Column added",
      description: `Column "${newColumnName.trim()}" has been added`,
    })

    setNewColumnName("")
    setIsAdding(false)
  }

  const handleStartEdit = (column: string) => {
    setEditingColumn(column)
    setEditColumnName(column)
  }

  const handleSaveEdit = () => {
    if (!editColumnName.trim()) {
      toast({
        title: "Error",
        description: "Column name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!editingColumn) return

    // Check for duplicate names (excluding the current column being edited)
    if (editColumnName.trim() !== editingColumn && columns.includes(editColumnName.trim())) {
      toast({
        title: "Error",
        description: "Column with this name already exists",
        variant: "destructive",
      })
      return
    }

    // Check if name starts with underscore (reserved for internal columns)
    if (editColumnName.trim().startsWith("_")) {
      toast({
        title: "Error",
        description: "Column name cannot start with underscore (_)",
        variant: "destructive",
      })
      return
    }

    // Update column name in columns list
    const updatedColumns = columns.map((col) => (col === editingColumn ? editColumnName.trim() : col))
    onColumnsUpdateAction(updatedColumns)

    // Update column name in all rows
    const updatedData = data.map((row) => {
      const newRow = { ...row }
      if (newRow[editingColumn] !== undefined) {
        newRow[editColumnName.trim()] = newRow[editingColumn]
        delete newRow[editingColumn]
      }
      return newRow
    })
    onDataUpdateAction(updatedData)

    // Update contextColumn or resultColumn if they were renamed
    if (contextColumn === editingColumn && onContextColumnChange) {
      onContextColumnChange(editColumnName.trim())
    }
    if (resultColumn === editingColumn && onResultColumnChange) {
      onResultColumnChange(editColumnName.trim())
    }

    toast({
      title: "Column renamed",
      description: `Column "${editingColumn}" has been renamed to "${editColumnName.trim()}"`,
    })

    setEditingColumn(null)
    setEditColumnName("")
  }

  const handleCancelEdit = () => {
    setEditingColumn(null)
    setEditColumnName("")
  }

  const handleDeleteColumn = (column: string) => {
    // Prevent deleting contextColumn or resultColumn
    if (column === contextColumn || column === resultColumn) {
      toast({
        title: "Cannot delete",
        description: `Cannot delete ${column === contextColumn ? "Context" : "Result"} column. Please change the column assignment first.`,
        variant: "destructive",
      })
      setDeletingColumn(null)
      return
    }

    // Remove column from columns list
    const updatedColumns = columns.filter((col) => col !== column)
    onColumnsUpdateAction(updatedColumns)

    // Remove column from all rows
    const updatedData = data.map((row) => {
      const newRow = { ...row }
      delete newRow[column]
      return newRow
    })
    onDataUpdateAction(updatedData)

    toast({
      title: "Column deleted",
      description: `Column "${column}" has been deleted`,
    })

    setDeletingColumn(null)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Manage Columns
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>Add, rename, or delete columns in your dataset</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new column */}
            <div className="flex items-end gap-2 pb-4 border-b">
              {!isAdding ? (
                <Button onClick={() => setIsAdding(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Column
                </Button>
              ) : (
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-column">New Column Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-column"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Enter column name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddColumn()
                        } else if (e.key === "Escape") {
                          setIsAdding(false)
                          setNewColumnName("")
                        }
                      }}
                      autoFocus
                    />
                    <Button onClick={handleAddColumn} size="sm">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setIsAdding(false)} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Column list */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Columns ({allManagedColumns.length})</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {allManagedColumns.map((column) => (
                  <div
                    key={column}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    {editingColumn === column ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editColumnName}
                          onChange={(e) => setEditColumnName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit()
                            } else if (e.key === "Escape") {
                              handleCancelEdit()
                            }
                          }}
                          autoFocus
                          className="flex-1"
                        />
                        <Button onClick={handleSaveEdit} size="sm" variant="outline">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{column}</span>
                            {column === contextColumn && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Context
                              </span>
                            )}
                            {column === resultColumn && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Result
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {data.filter((row) => row[column] !== undefined && row[column] !== null && row[column] !== "").length} / {data.length}{" "}
                            rows filled
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleStartEdit(column)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {(column !== contextColumn && column !== resultColumn) && (
                            <Button
                              onClick={() => setDeletingColumn(column)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {allManagedColumns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No columns found</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingColumn} onOpenChange={(open) => !open && setDeletingColumn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the column "{deletingColumn}"? This action cannot be undone and will remove
              all data in this column.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingColumn && handleDeleteColumn(deletingColumn)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

