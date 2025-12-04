"use client"

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { MoreVertical, ArrowRight, CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProjectBatches, getBatchAssignments } from "@/app/api/batch";
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

  const loadAnnotatingJobs = useCallback(async (showLoading = true) => {
    if (!project) return;
    
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const projectId = parseInt(project!.id);
      const [response, projectFiles] = await Promise.all([
        getProjectBatches(projectId, {
          page: 1,
          page_size: 100,
        }),
        getProjectFiles(projectId),
      ]);
      
      const jobPromises = response.batches
        .map(async (batch: any) => {
          const fileIds: number[] = batch.batch_metadata?.file_ids || [];
          if (!fileIds.length) {
            return null;
          }

          // Only show jobs that are actively being labeled
          const batchFiles = projectFiles.filter((f) => fileIds.includes(f.file_id));
          if (!batchFiles.length) {
            return null;
          }

          const annotated = batchFiles.filter((f) =>
            f.annotation_status === "completed" || f.annotation_status === "verified"
          ).length;
          const annotating = batchFiles.filter((f) => f.annotation_status === "annotating").length;
          const unannotated = batchFiles.filter((f) => f.annotation_status === "unannotated").length;

          const totalFiles = batchFiles.length;
          const hasActiveWork = annotating > 0;

          const status = typeof batch.status === "string" ? batch.status.toLowerCase() : batch.status;
          if ((!status || status === "completed") || (status === "pending" && !hasActiveWork)) {
            return null;
          }

          let labelerName = batch.creator_username || "Unknown";
          try {
            const assignmentsResponse = await getBatchAssignments({
              batch_id: batch.batch_id,
              page: 1,
              page_size: 1,
            });
            const firstAssignment = assignmentsResponse.assignments?.[0];
            if (firstAssignment) {
              labelerName =
                firstAssignment.user_username ||
                `User ${firstAssignment.user_id}`;
            }
          } catch (error) {
            // silently ignore assignment fetch errors; fallback labeler remains
          }

          return {
            batch_id: batch.batch_id,
            name: batch.name,
            created_at: batch.created_at,
            labeler: labelerName,
            total_files: batchFiles.length,
            annotatedCount: annotated,
            // Unannotated = unannotated + annotating (files that are not yet completed)
            unannotatedCount: unannotated + annotating,
            annotatingCount: annotating,
            file_ids: fileIds,
          };
        });
      const jobsWithCounts = (await Promise.all(jobPromises)).filter(
        Boolean,
      ) as AnnotatingJob[];
      
      setJobs(jobsWithCounts);
    } catch (error: any) {
      console.error('Failed to load annotating jobs:', error);
      if (showLoading) {
        toast.error('Failed to load jobs');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      // Initial load with loading indicator
      loadAnnotatingJobs(true);
      
      // Auto-refresh every 5 seconds to update progress (without loading indicator)
      const interval = setInterval(() => {
        loadAnnotatingJobs(false);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [project, loadAnnotatingJobs]);

  const handleJobSelect = (job: AnnotatingJob) => {
    const fileIdsParam = encodeURIComponent(JSON.stringify(job.file_ids || []));
    router.push(`/${projectSlug}/annotate/job?jobId=${job.batch_id}&fileIds=${fileIdsParam}`);
  };

  return (
    <div className="border border-input rounded-lg p-6 bg-card h-full flex flex-col min-h-0">
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
                  files from the Annotating column will send them back to the
                  Unassigned column as a batch.
              </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Jobs List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 pr-4">
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
                className="w-full border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors cursor-pointer"
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
              <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-foreground break-words line-clamp-2">
                      {job.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Labeler: {job.labeler}
                    </p>
                </div>
                  <button className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
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
              <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground min-w-0 flex-1">
                  <span className="font-medium text-foreground truncate">
                    {job.total_files} Files
                  </span>
                  <span className="truncate">Annotated: {job.annotatedCount}</span>
                  <span className="truncate">Unannotated: {job.unannotatedCount}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobSelect(job);
                  }}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium flex-shrink-0 whitespace-nowrap"
                >
                  <span>Start Annotating</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
