"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAutoLabelStatus, getBatch } from "@/app/api/batch"
import type { AutoLabelStatusResponse } from "@/app/api/batch"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface AutoLabelingStatusProps {
  batchId: number
  projectSlug?: string
  autoRefresh?: boolean
  refreshInterval?: number
  onStatusChange?: (status: AutoLabelStatusResponse) => void
}

export function AutoLabelingStatus({
  batchId,
  projectSlug,
  autoRefresh = true,
  refreshInterval = 3000,
  onStatusChange,
}: AutoLabelingStatusProps) {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [status, setStatus] = useState<AutoLabelStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [batchData, setBatchData] = useState<any>(null)
  const [navigating, setNavigating] = useState(false)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep the ref updated
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const data = await getAutoLabelStatus(batchId)
      setStatus(data)
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(data)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch auto-labeling status")
    } finally {
      setLoading(false)
    }
  }, [batchId])

  // Fetch batch data when status becomes auto_labeled
  useEffect(() => {
    if (status?.status === "auto_labeled" && !batchData) {
      getBatch(batchId)
        .then((batch) => {
          setBatchData(batch)
        })
        .catch(() => {
          // Ignore error, just don't show review button
        })
    }
  }, [status?.status, batchId, batchData])

  const handleReview = async () => {
    try {
      setNavigating(true)
      
      // Get batch data to extract file IDs
      if (!batchData) {
        const batch = await getBatch(batchId)
        setBatchData(batch)
      }
      
      const batch = batchData || await getBatch(batchId)
      const fileIds = batch.batch_metadata?.file_ids || []
      
      if (fileIds.length === 0) {
        toast({
          title: "No files found",
          description: "This batch has no files to review",
          variant: "destructive",
        })
        return
      }
      
      // Navigate to annotating page for review
      const projectSlugValue = projectSlug || params.projectId as string
      const params_obj = new URLSearchParams({
        batchId: batchId.toString(),
        fileIds: JSON.stringify(fileIds),
        jobName: batch.name || `Batch ${batchId}`
      })

      router.push(`/${projectSlugValue}/annotate/job/${batchId}/annotating?${params_obj.toString()}`)
    } catch (error: any) {
      toast({
        title: "Failed to navigate",
        description: error.message || "Could not open review page",
        variant: "destructive",
      })
    } finally {
      setNavigating(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [batchId, autoRefresh, refreshInterval, fetchStatus])

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const getStatusBadge = () => {
    switch (status.status) {
      case "auto_labeling":
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-Labeling
          </Badge>
        )
      case "auto_labeled":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Auto-Labeled
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "blocked":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Blocked
          </Badge>
        )
      default:
        return <Badge variant="outline">{status.status}</Badge>
    }
  }

  const isInProgress = status.status === "auto_labeling"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Auto-Labeling Status</CardTitle>
            {getStatusBadge()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Real-time progress of automatic labeling process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {status.files_processed} / {status.total_files} files
            </span>
          </div>
          <Progress value={status.progress_percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(status.progress_percentage)}%</span>
            {isInProgress && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </span>
            )}
          </div>
        </div>

        {/* Current File (if available) */}
        {status.current_file && (
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground mb-1">Current File</div>
            <div className="text-sm font-medium">{status.current_file}</div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {status.started_at && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Started At</div>
              <div className="font-medium">
                {new Date(status.started_at).toLocaleString()}
              </div>
            </div>
          )}
          {status.completed_at && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Completed At</div>
              <div className="font-medium">
                {new Date(status.completed_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {status.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Error occurred:</div>
              <div className="text-sm">{status.error}</div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {status.status === "auto_labeled" && !status.error && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Auto-labeling completed successfully! All files have been labeled.
                You can now review the results.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleReview}
              disabled={navigating}
              className="w-full"
              size="lg"
            >
              {navigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Review Labeled Files
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

