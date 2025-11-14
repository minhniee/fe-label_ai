"use client"

import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Upload, Eye, ArrowRight, MoreVertical, CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getProjectBatches } from "@/app/api/batch"
import { getProjectFiles } from "@/app/api/project"
import { useProjectFromSlug } from "@/hooks/use-project-from-slug"
import { projectToSlug } from "@/types/project"
import { toast } from "sonner"

interface Batch {
  batch_id: number
  name: string
  created_at: string
  total_files: number
  file_ids?: number[]
}

export default function UnassignedSection() {
  const router = useRouter()
  const params = useParams()
  const { project } = useProjectFromSlug()
  const projectSlug = params.projectId as string
  
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("UnassignedSection mounted/updated, project:", project?.name);
    if (project) {
      loadUnassignedBatches()
    }
  }, [project])

  const loadUnassignedBatches = async () => {
    try {
      setIsLoading(true)
      
      // Get batches with pending status (unassigned)
      const response = await getProjectBatches(parseInt(project!.id), {
        status: 'pending',
        page: 1,
        page_size: 100
      })
      
      console.log("Unassigned batches response:", response);
      console.log("Total batches found:", response.batches?.length || 0);
      console.log("Total count from API:", response.total);
      
      // Get file IDs from batch metadata
      const batchesWithFiles = response.batches.map((batch: any) => {
        const fileIds = batch.batch_metadata?.file_ids || [];
        console.log(`Batch ${batch.batch_id} (${batch.name}):`, {
          status: batch.status,
          metadata: batch.batch_metadata,
          file_ids: fileIds,
          file_count: fileIds.length
        });
        return {
          ...batch,
          file_ids: fileIds
        };
      })
      
      console.log("Setting batches state with:", batchesWithFiles.length, "batches");
      setBatches(batchesWithFiles)
    } catch (error: any) {
      console.error('Failed to load unassigned batches:', error)
      toast.error('Failed to load batches')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchSelect = (batch: Batch) => {
    const fileIdsParam = encodeURIComponent(JSON.stringify(batch.file_ids || []))
    router.push(`/${projectSlug}/annotate/batch?batchId=${batch.batch_id}&fileIds=${fileIdsParam}`)
  }

  return (
    <div className="border border-input rounded-lg p-6 bg-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h2 className="text-lg font-semibold mb-1">Unassigned</h2>
          <p className="text-sm text-muted-foreground">{batches.length} Batches</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <CircleHelp className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div>
                <p className="font-bold">UNASSIGNED FILES</p>
                <p>
                  These are files that are uploaded for easy user assignment. These are files that have no annotations and no assigned labels.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Upload More Files Button */}
      <button
        onClick={() => router.push(`/${projectSlug}/upload-file`)}
        className="w-full flex items-center justify-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors py-2"
      >
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">Upload More Files</span>
      </button>

      {/* Batches List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No unassigned batches</p>
            <p className="text-xs text-muted-foreground mt-1">Upload files to create a new batch</p>
          </div>
        ) : (
          batches.map((batch) => (
            <div
              key={batch.batch_id}
              className="border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleBatchSelect(batch)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  handleBatchSelect(batch)
                }
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{batch.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{batch.total_files} unassigned files</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handleBatchSelect(batch)
                }}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium mt-3"
              >
                <span>Annotate Files</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
