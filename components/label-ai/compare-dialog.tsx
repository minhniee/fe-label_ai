import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"
import { getStatusBadge } from "./data-grid-utils"
import { getAIValue } from "./data-grid-utils"
import { handleConfirmRow, handleRejectRow } from "./data-grid-utils"

interface CompareDialogProps {
  row: RowData | null
  resultColumn: string
  onClose: () => void
  allData: RowData[]
  onDataUpdate: (rows: RowData[]) => void
}

export function CompareDialog({
  row,
  resultColumn,
  onClose,
  allData,
  onDataUpdate,
}: CompareDialogProps) {
  const handleReject = () => {
    if (!row) return
    const updated = handleRejectRow(allData, row._id)
    onDataUpdate(updated)
    onClose()
  }

  const handleConfirm = () => {
    if (!row) return
    const updated = handleConfirmRow(allData, row._id, resultColumn)
    onDataUpdate(updated)
    onClose()
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare Result</DialogTitle>
          <DialogDescription>
            Review the current value versus AI&apos;s proposed value before confirming.
          </DialogDescription>
        </DialogHeader>

        {row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Current</p>
                <div className="bg-secondary/50 rounded px-3 py-2 border border-border font-mono text-sm">
                  {String(row[resultColumn] ?? "-")}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">AI</p>
                <div className="bg-secondary/50 rounded px-3 py-2 border border-border font-mono text-sm">
                  {String(getAIValue(row) || "-")}
                </div>
              </div>
            </div>

            {row._ai_reasoning && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Reasoning</p>
                <p className="text-sm text-foreground">{row._ai_reasoning}</p>
              </div>
            )}

            {(row._validation_status || row._ai_type) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Type:</span>
                {getStatusBadge(String(row._ai_type || row._validation_status))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {row && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReject}>
                Reject
              </Button>
              <Button onClick={handleConfirm}>
                Accept
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


