"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ApiKeyRow {
  id: string
  apiKey: string
  delimiter: string
}

interface ApiKeyManagerProps {
  onSave?: (rows: ApiKeyRow[]) => void
  initialRows?: ApiKeyRow[]
}

export function ApiKeyManager({ onSave, initialRows = [] }: ApiKeyManagerProps) {
  const [rows, setRows] = useState<ApiKeyRow[]>(
    initialRows.length > 0 ? initialRows : [{ id: "1", apiKey: "", delimiter: "," }],
  )
  const { toast } = useToast()

  const addRow = () => {
    const newId = Math.max(...rows.map((r) => Number.parseInt(r.id)), 0) + 1
    setRows([...rows, { id: newId.toString(), apiKey: "", delimiter: "," }])
  }

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast({
        title: "Cannot remove",
        description: "You must have at least one API key row",
        variant: "destructive",
      })
      return
    }
    setRows(rows.filter((row) => row.id !== id))
  }

  const updateRow = (id: string, field: "apiKey" | "delimiter", value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const handleSave = () => {
    const emptyRows = rows.filter((row) => !row.apiKey.trim())
    if (emptyRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all API key fields",
        variant: "destructive",
      })
      return
    }

    onSave?.(rows)
    toast({
      title: "Success",
      description: `${rows.length} API key(s) saved successfully`,
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-background rounded-lg border border-border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">API Key Manager</h2>
        <p className="text-sm text-muted-foreground">
          Add multiple API keys with your preferred delimiters for batch processing
        </p>
      </div>

      <div className="space-y-4">
        {/* Header Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <div className="md:col-span-7">
            <label className="text-sm font-semibold text-foreground">API Key</label>
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-semibold text-foreground">Delimiter</label>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-foreground">Action</label>
          </div>
        </div>

        {/* API Key Rows */}
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* API Key Input */}
            <div className="md:col-span-7">
              <Input
                type="password"
                placeholder={`Enter API key ${index + 1}`}
                value={row.apiKey}
                onChange={(e) => updateRow(row.id, "apiKey", e.target.value)}
                className="w-full"
              />
            </div>

            {/* Delimiter Select */}
            <div className="md:col-span-3">
              <Select value={row.delimiter} onValueChange={(value) => updateRow(row.id, "delimiter", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select delimiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                  <SelectItem value=" ">Space</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remove Button */}
            <div className="md:col-span-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeRow(row.id)}
                className="w-full md:w-auto"
                title="Remove this API key row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Row Button */}
      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={addRow} className="flex items-center gap-2 bg-transparent">
          <Plus className="h-4 w-4" />
          Add API Key
        </Button>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{rows.length}</span> API key(s) configured
        </p>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} className="px-8">
          Save API Keys
        </Button>
      </div>
    </div>
  )
}
