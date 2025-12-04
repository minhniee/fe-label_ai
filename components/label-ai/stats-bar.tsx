import { CheckCheck, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface StatsBarProps {
  confirmedCount: number
  totalFiltered: number
  manualMode?: boolean
  manualEditedCount: number
  pendingOnPage: number
  hasAISuggestions: boolean
  onClearAllSuggestions: () => void
  onConfirmAll: () => void
  onRejectAll: () => void
}

export function StatsBar({
  confirmedCount,
  totalFiltered,
  manualMode,
  manualEditedCount,
  pendingOnPage,
  hasAISuggestions,
  onClearAllSuggestions,
  onConfirmAll,
  onRejectAll,
}: StatsBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {manualMode ? "Labeled" : "Confirmed"}
          </p>
          <p className="font-mono text-sm font-medium text-success">
            {confirmedCount} / {totalFiltered}
          </p>
        </div>
        {manualMode && (
          <div>
            <p className="text-sm text-muted-foreground">Manual edited</p>
            <p className="font-mono text-sm font-medium text-blue-600 dark:text-blue-300">
              {manualEditedCount}
            </p>
          </div>
        )}
        {!manualMode && (
          <>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="font-mono text-sm font-medium text-warning">
                {pendingOnPage}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!manualMode && hasAISuggestions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onClearAllSuggestions}
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove all AI suggestions and start over</TooltipContent>
          </Tooltip>
        )}
        {!manualMode && pendingOnPage > 0 && (
          <>
            <Button
              onClick={onConfirmAll}
              variant="outline"
              className="gap-2 bg-transparent text-success hover:text-success hover:bg-success/10"
            >
              <CheckCheck className="h-4 w-4" />
              Accept All
            </Button>
            <Button
              onClick={onRejectAll}
              variant="outline"
              className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              Reject All
            </Button>
          </>
        )}
      </div>
    </div>
  )
}


