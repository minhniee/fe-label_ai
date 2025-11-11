"use client";

import { MoreVertical, ArrowRight, CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnnotatingJob {
  id: string;
  uploadedAt: string;
  labeler: string;
  totalFiles: number;
  annotatedCount: number;
  unannotatedCount: number;
}

export default function AnnotatingSection() {
  // Mock data - replace with real data from your backend
  const jobs: AnnotatingJob[] = [
    {
      id: "1",
      uploadedAt: "11/06/25 at 4:50 pm: Job 2",
      labeler: "Truong Hao",
      totalFiles: 3,
      annotatedCount: 0,
      unannotatedCount: 3,
    },
    {
      id: "2",
      uploadedAt: "11/06/25 at 4:50 pm: Job 1",
      labeler: "Truong Vinh Hao",
      totalFiles: 3,
      annotatedCount: 0,
      unannotatedCount: 3,
    },
    {
      id: "3",
      uploadedAt: "10/30/25 at 7:22 pm: Job 3",
      labeler: "Truong Hao",
      totalFiles: 1,
      annotatedCount: 0,
      unannotatedCount: 1,
    },
    {
      id: "4",
      uploadedAt: "10/30/25 at 7:22 pm: Job 2",
      labeler: "minhlqhet7255s@fpt.edu.vn",
      totalFiles: 2,
      annotatedCount: 0,
      unannotatedCount: 2,
    },
  ];

  return (
    <div className="border border-input rounded-lg p-6 bg-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h2 className="text-lg font-semibold mb-1">Annotating</h2>
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
                <p className="font-bold">ANNOTATING</p>
                <p>
                  Once a batch is assigned to a user for annotation, it will
                  appear as an annotation job in the Annotating column. Deleting
                  images from the Annotating column will send them back to the
                  Unassigned column as a batch.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Jobs List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {job.uploadedAt}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Labeler: {job.labeler}
                </p>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {job.totalFiles} files
              </span>

              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>{job.annotatedCount} Annotated</span>
              </div>

              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted"></div>
                <span>{job.unannotatedCount} Unannotated</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
