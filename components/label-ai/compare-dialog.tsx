import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { RowData } from "@/app/(navigation)/[projectId]/annotate/job/[jobId]/annotating/page"
import { getStatusBadge } from "./data-grid-utils"
import { getAIValue } from "./data-grid-utils"
import { handleConfirmRow, handleRejectRow } from "./data-grid-utils"
import { useState, useEffect } from "react"
import { searchDocuments, type DocumentCitation } from "@/app/api/document"
import { Loader2, FileText, ChevronDown, ChevronUp, Sparkles, Check, X, AlertCircle, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface CompareDialogProps {
  row: RowData | null
  resultColumn: string
  onClose: () => void
  allData: RowData[]
  onDataUpdate: (rows: RowData[]) => void
  projectId?: number
  contextColumn?: string
  embeddingConfig?: {
    provider: string
    apiKey?: string
    model?: string
  }
}

export function CompareDialog({
  row,
  resultColumn,
  onClose,
  allData,
  onDataUpdate,
  projectId,
  contextColumn,
  embeddingConfig,
}: CompareDialogProps) {
  const [citations, setCitations] = useState<DocumentCitation[]>([])
  const [loadingCitations, setLoadingCitations] = useState(false)
  const [citationsError, setCitationsError] = useState<string | null>(null)
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null)
  const [queryText, setQueryText] = useState<string>("")

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query || query.trim().length === 0) return <span>{text}</span>

    const queryWords = query.trim().split(/\s+/).filter((word) => word.length > 2)
    if (queryWords.length === 0) return <span>{text}</span>

    const pattern = new RegExp(`(${queryWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    const parts = text.split(pattern)

    return (
      <>
        {parts.map((part, index) => {
          const isMatch = queryWords.some((word) => part.toLowerCase() === word.toLowerCase())
          if (isMatch) {
            return (
              <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/60 text-foreground px-0.5 rounded">
                {part}
              </mark>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </>
    )
  }

  // Fetch citations on row change
  useEffect(() => {
    if (!row || !projectId || !contextColumn) {
      setCitations([])
      return
    }

    const contextValue = String(row[contextColumn] || "").trim()
    if (!contextValue) {
      setCitations([])
      setQueryText("")
      return
    }

    setQueryText(contextValue)
    setLoadingCitations(true)
    setCitationsError(null)

    searchDocuments(
      projectId,
      contextValue,
      5,
      0.15,
      embeddingConfig?.provider || "local",
      embeddingConfig?.apiKey,
      embeddingConfig?.model
    )
      .then((response) => {
        if (response.success && response.results) {
          setCitations(response.results)
        } else {
          setCitations([])
        }
      })
      .catch((error) => {
        console.error("Failed to fetch document citations:", error)
        setCitationsError(error.message || "Failed to load citations")
        setCitations([])
      })
      .finally(() => {
        setLoadingCitations(false)
      })
  }, [row, projectId, contextColumn, embeddingConfig])

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

  // Calculate values only when row exists
  const currentValue = row ? String(row[resultColumn] ?? "") : ""
  const aiValue = row ? String(getAIValue(row) || "") : ""
  const hasChanges = currentValue !== aiValue

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Review Suggestion
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Compare values and decide to accept or reject the AI suggestion
              </DialogDescription>
            </div>
            {row && (row._validation_status || row._ai_type) && (
              <div>{getStatusBadge(String(row._ai_type || row._validation_status))}</div>
            )}
          </div>
        </DialogHeader>

        {row && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Value Comparison */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Value Comparison
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Current Value */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Current</span>
                      {!hasChanges && (
                        <Badge variant="secondary" className="text-xs">Same</Badge>
                      )}
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/40 min-h-[80px]">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {currentValue || <span className="text-muted-foreground italic">Empty</span>}
                      </p>
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Suggestion</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border min-h-[80px]",
                      hasChanges 
                        ? "border-primary/40 bg-primary/5" 
                        : "bg-muted/40"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {aiValue || <span className="text-muted-foreground italic">No suggestion</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              {row._ai_reasoning && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    AI Reasoning
                  </h3>
                  <div className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {row._ai_reasoning}
                    </p>
                  </div>
                </div>
              )}

              {/* Sources */}
              {projectId && contextColumn && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Sources
                    </h3>
                    {!loadingCitations && citations.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {citations.length} found
                      </Badge>
                    )}
                  </div>

                  {loadingCitations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : citationsError ? (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <p className="text-sm text-destructive">{citationsError}</p>
                    </div>
                  ) : citations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No matching sources found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {citations.map((citation, index) => {
                        const isExpanded = expandedCitation === index
                        const score = Math.round(citation.similarity_score * 100)
                        const scoreColor = score >= 70 
                          ? "text-green-600 dark:text-green-400" 
                          : score >= 50 
                          ? "text-yellow-600 dark:text-yellow-400" 
                          : "text-muted-foreground"

                        return (
                          <Collapsible
                            key={`${citation.document_id}-${citation.chunk_id}-${index}`}
                            open={isExpanded}
                            onOpenChange={(open) => setExpandedCitation(open ? index : null)}
                          >
                            <div className="border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
                                  {/* Number */}
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </span>
                                  
                                  <div className="flex-1 min-w-0">
                                    {/* Document name */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium truncate">
                                        {citation.document_name}
                                      </span>
                                      {citation.metadata?.page_number && (
                                        <span className="text-xs text-muted-foreground">
                                          p.{citation.metadata.page_number}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Preview */}
                                    {!isExpanded && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {highlightText(citation.content.substring(0, 150), queryText)}
                                        {citation.content.length > 150 && "..."}
                                      </p>
                                    )}
                                  </div>

                                  {/* Score & Toggle */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={cn("text-xs font-medium", scoreColor)}>
                                      {score}%
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-3 pb-3 pt-0">
                                  <div className="p-3 rounded-md bg-muted/50 text-sm leading-relaxed whitespace-pre-wrap">
                                    {highlightText(citation.content, queryText)}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {row && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20">
            <Button 
              variant="outline" 
              onClick={handleReject}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button 
              onClick={handleConfirm}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
