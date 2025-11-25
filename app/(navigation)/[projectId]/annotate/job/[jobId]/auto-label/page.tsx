"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getBatch } from "@/app/api/batch"
import { AutoLabelingManager } from "@/components/auto-labeling/auto-labeling-manager"
import { slugToProjectId } from "@/types/project"

export default function AutoLabelJobPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const projectSlug = params.projectId as string
  const jobIdParam = params.jobId as string
  const jobId = Number(jobIdParam)
  const jobNameFromQuery = searchParams.get("jobName")

  const [batchData, setBatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jobId || Number.isNaN(jobId)) {
      toast({
        title: "Invalid job",
        description: "The job ID in the URL is invalid.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }
    loadBatch(jobId)
  }, [jobId, toast])

  const loadBatch = async (id: number) => {
    try {
      setLoading(true)
      const batch = await getBatch(id)
      setBatchData(batch)
    } catch (error: any) {
      console.error("Failed to load batch:", error)
      toast({
        title: "Failed to load batch",
        description: error.message || "Unable to load batch details for auto-labeling.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const backParams = new URLSearchParams()
    backParams.set("jobId", jobIdParam)

    if (batchData?.batch_metadata?.file_ids?.length) {
      backParams.set("fileIds", JSON.stringify(batchData.batch_metadata.file_ids))
    }

    const jobName = batchData?.name || jobNameFromQuery
    if (jobName) {
      backParams.set("jobName", jobName)
    }

    const query = backParams.toString()
    router.push(`/${projectSlug}/annotate/job${query ? `?${query}` : ""}`)
  }

  const projectIdFromSlug = Number(slugToProjectId(projectSlug))
  const projectId = Number.isNaN(projectIdFromSlug) ? undefined : projectIdFromSlug
  const displayName = batchData?.name || jobNameFromQuery || `Auto-Label Job ${jobIdParam}`

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Job
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">
            Auto-label batch #{jobIdParam}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading batch details...</p>
        </div>
      ) : (
        <>
          {batchData && (
            <Card className="mb-6 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{batchData.status || "unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Files</p>
                  <p className="font-semibold">{batchData.total_files ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-semibold">{batchData.progress_percentage ?? 0}%</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <AutoLabelingManager
              batchId={jobId}
              projectId={projectId}
              projectSlug={projectSlug}
            />
          </Card>
        </>
      )}
    </div>
  )
}

