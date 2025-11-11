"use client"

import { Eye, MoreVertical, CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DatasetJob {
  id: string
  uploadedAt: string
  labeler: string
  imageCount: number
}

export default function DatasetSection() {
  // Mock data - replace with real data from your backend
  const jobs: DatasetJob[] = [
    {
      id: "1",
      uploadedAt: "10/30/25 at 9:12 pm",
      labeler: "Truong Vinh Hao",
      imageCount: 1,
    },
    {
      id: "2",
      uploadedAt: "10/29/25 at 8:37 pm: Job 3",
      labeler: "Truong Vinh Hao",
      imageCount: 2,
    },
    {
      id: "3",
      uploadedAt: "10/29/25 at 8:37 pm: Job 2",
      labeler: "Truong Vinh Hao",
      imageCount: 1,
    },
    {
      id: "4",
      uploadedAt: "10/29/25 at 8:37 pm",
      labeler: "Truong Vinh Hao",
      imageCount: 2,
    },
  ]

  return (
    <div className="border border-input rounded-lg p-6 bg-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h2 className="text-lg font-semibold mb-1">Dataset</h2>
          <p className="text-sm text-muted-foreground">{jobs.length} Jobs</p>
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
                <p className="font-bold">DATASET</p>
                <p>
                  Once the annotation work is completed, those files can be added to the Dataset, a group of annotated files ready for training. Removing files from the Dataset column will send them back to the Unassigned column as a batch.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Dataset Jobs List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">{job.uploadedAt}</p>
                <p className="text-xs text-muted-foreground mt-1">Labeler: {job.labeler}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{job.imageCount} Images</p>
          </div>
        ))}
      </div>
    </div>
  )
}
