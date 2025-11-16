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

interface AnnotatingJob {
  batch_id: number;
  name: string;
  created_at: string;
  labeler: string;
  total_files: number;
  annotatedCount: number;
  unannotatedCount: number;
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
      // Get batches with in_progress status
      const response = await getProjectBatches(parseInt(project!.id), {
        status: 'in_progress',
        page: 1,
        page_size: 100
      });

      // Get project files to calculate annotated/unannotated counts
      const projectFiles = await getProjectFiles(parseInt(project!.id));
      
      // Map batches to jobs with file counts
      const jobsWithCounts = await Promise.all(response.batches.map(async (batch: any) => {
        const fileIds = batch.batch_metadata?.file_ids || [];
        const batchFiles = projectFiles.filter(f => fileIds.includes(f.file_id));
        
        const annotated = batchFiles.filter(f => 
          f.annotation_status === 'completed' || f.annotation_status === 'verified'
        ).length;
        const unannotated = batchFiles.filter(f => 
          f.annotation_status === 'unannotated' || f.annotation_status === 'annotating'
        ).length;

        return {
          batch_id: batch.batch_id,
          name: batch.name,
          created_at: batch.created_at,
          labeler: batch.creator_username || 'Unknown',
          total_files: batch.total_files,
          annotatedCount: annotated,
          unannotatedCount: unannotated,
          file_ids: fileIds
        };
      }));
      
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

              <div className="my-3 flex flex-col gap-1 text-xs text-muted-foreground">
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
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
              <span>Start Annotating</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          ))
        )}
      </div>
    </div>
  );
}
