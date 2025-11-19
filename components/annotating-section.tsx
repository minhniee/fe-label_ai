"use client"

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { MoreVertical, ArrowRight, CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProjectBatches } from "@/app/api/batch";
import { getProjectFiles } from "@/app/api/project";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface AnnotatingJob {
  batch_id: number;
  name: string;
  created_at: string;
  labeler: string;
  total_files: number;
  annotatedCount: number;
  unannotatedCount: number;
  annotatingCount: number;
  file_ids?: number[];
}

export default function AnnotatingSection() {
  const router = useRouter();
  const params = useParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  
  const [jobs, setJobs] = useState<AnnotatingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (project) {
      loadAnnotatingJobs();
    }
  }, [project]);

  const loadAnnotatingJobs = async () => {
    try {
      setIsLoading(true);
      const projectId = parseInt(project!.id);
      const [response, projectFiles] = await Promise.all([
        getProjectBatches(projectId, {
          page: 1,
          page_size: 100,
        }),
        getProjectFiles(projectId),
      ]);
      
      const jobsWithCounts = response.batches
        .map((batch: any) => {
          const fileIds: number[] = batch.batch_metadata?.file_ids || [];
          if (!fileIds.length) {
            return null;
          }

          const batchFiles = projectFiles.filter((f) => fileIds.includes(f.file_id));
          if (!batchFiles.length) {
            return null;
          }

          const annotated = batchFiles.filter((f) =>
            f.annotation_status === "completed" || f.annotation_status === "verified"
          ).length;
          const annotating = batchFiles.filter((f) => f.annotation_status === "annotating").length;
          const unannotated = batchFiles.filter((f) => f.annotation_status === "unannotated").length;

          // Show ALL jobs in Annotating section (even if all files are annotated)
          // Only filter out jobs that have no files
          const totalFiles = batchFiles.length;

          return {
            batch_id: batch.batch_id,
            name: batch.name,
            created_at: batch.created_at,
            labeler: batch.creator_username || "Unknown",
            total_files: batchFiles.length,
            annotatedCount: annotated,
            // Unannotated = unannotated + annotating (files that are not yet completed)
            unannotatedCount: unannotated + annotating,
            annotatingCount: annotating,
            file_ids: fileIds,
          };
        })
        .filter(Boolean) as AnnotatingJob[];
      
      setJobs(jobsWithCounts);
    } catch (error: any) {
      console.error('Failed to load annotating jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobSelect = (job: AnnotatingJob) => {
    const fileIdsParam = encodeURIComponent(JSON.stringify(job.file_ids || []));
    router.push(`/${projectSlug}/annotate/job?jobId=${job.batch_id}&fileIds=${fileIdsParam}`);
  };

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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No jobs in progress</p>
            <p className="text-xs text-muted-foreground mt-1">Assign a batch to start annotating</p>
          </div>
        ) : (
          jobs.map((job) => (
          <div
              key={job.batch_id}
              className="border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleJobSelect(job)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleJobSelect(job);
                }
              }}
          >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {job.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Labeler: {job.labeler}
                  </p>
              </div>
                <button className="text-muted-foreground hover:text-foreground flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="my-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs text-muted-foreground">
                  {job.total_files > 0 
                    ? Math.round((job.annotatedCount / job.total_files) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={job.total_files > 0 ? (job.annotatedCount / job.total_files) * 100 : 0} 
                className="h-2" 
              />
            </div>

            {/* Files info and Start button - side by side */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {job.total_files} Files
                </span>
                <span>Annotated: {job.annotatedCount}</span>
                <span>Unannotated: {job.unannotatedCount}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJobSelect(job);
                }}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium flex-shrink-0"
              >
                <span>Start Annotating</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}
