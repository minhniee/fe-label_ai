"use client"

import { useRouter } from "next/navigation"
import { Upload, Eye, ArrowRight, MoreVertical, CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Batch {
  id: string
  name: string
  uploadedAt: string
  unassignedCount: number
}

export default function UnassignedSection() {
  const router = useRouter()

  // Mock data - replace with real data from your backend
  const batches: Batch[] = [
    {
      id: "1",
      name: "Folder: tets",
      uploadedAt: "",
      unassignedCount: 2,
    },
    {
      id: "2",
      name: "Uploaded on 11/06/25 at 3:47 pm",
      uploadedAt: "11/06/25 at 3:47 pm",
      unassignedCount: 3,
    },
    {
      id: "3",
      name: "Uploaded on 11/02/25 at 6:01 pm",
      uploadedAt: "11/02/25 at 6:01 pm",
      unassignedCount: 1,
    },
    {
      id: "4",
      name: "Uploaded on 10/30/25 at 7:20 pm",
      uploadedAt: "10/30/25 at 7:20 pm",
      unassignedCount: 1,
    },
  ]

  const handleBatchSelect = (batch: Batch) => {
    const query = new URLSearchParams({ batchId: batch.id }).toString()
    router.push(`/annotate/batch?${query}`)
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
        onClick={() => router.push("/upload-file")}
        className="w-full flex items-center justify-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors py-2"
      >
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">Upload More Files</span>
      </button>

      {/* Batches List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {batches.map((batch) => (
          <div
            key={batch.id}
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
              <div>
                <p className="text-sm font-medium text-foreground">{batch.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{batch.unassignedCount} unassigned images</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
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
              <span>Annotate Images</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
