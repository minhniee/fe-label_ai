import { Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"
import { getDelimiterName } from "./data-grid-utils"
import { handleExportCsv } from "./data-grid-utils"

interface ExportDialogProps {
  open: boolean
  delimiter: string
  onDelimiterChange: (value: string) => void
  onClose: () => void
  columns: string[]
  allData: RowData[]
}

export function ExportDialog({
  open,
  delimiter,
  onDelimiterChange,
  onClose,
  columns,
  allData,
}: ExportDialogProps) {
  const onExport = () => {
    handleExportCsv(allData, columns, delimiter)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
          <DialogDescription>
            Choose the delimiter for your CSV export. The best delimiter can be auto-detected based on your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delimiter">Delimiter</Label>
            <Select value={delimiter} onValueChange={onDelimiterChange}>
              <SelectTrigger id="delimiter">
                <SelectValue placeholder="Select delimiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Comma (,)</SelectItem>
                <SelectItem value=";">Semicolon (;)</SelectItem>
                <SelectItem value="|">Pipe (|)</SelectItem>
                <SelectItem value="\t">Tab</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selected: {getDelimiterName(delimiter)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


