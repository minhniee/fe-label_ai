"use client"

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, MoreVertical, CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getProjectBatches } from "@/app/api/batch";
import { getProjectFiles } from "@/app/api/project";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { toast } from "sonner";

interface DatasetJob {
  batch_id: number;
  name: string;
  created_at: string;
  labeler: string;
  annotatedCount: number;
  file_ids?: number[];
}

export default function DatasetSection() {
  const router = useRouter();
  const params = useParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  
  const [jobs, setJobs] = useState<DatasetJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (project) {
      loadDatasetJobs();
    }
  }, [project]);

  const loadDatasetJobs = async () => {
    try {
      setIsLoading(true);
      // Get batches with completed status
      const response = await getProjectBatches(parseInt(project!.id), {
        status: 'completed',
        page: 1,
        page_size: 100
      });

      // Get project files to calculate annotated count
      const projectFiles = await getProjectFiles(parseInt(project!.id));
      
      // Map batches to dataset jobs
      const jobsWithCounts = await Promise.all(response.batches.map(async (batch: any) => {
        const fileIds = batch.batch_metadata?.file_ids || [];
        const batchFiles = projectFiles.filter(f => fileIds.includes(f.file_id));
        
        const annotated = batchFiles.filter(f => 
          f.annotation_status === 'completed' || f.annotation_status === 'verified'
        ).length;

        return {
          batch_id: batch.batch_id,
          name: batch.name,
          created_at: batch.created_at,
          labeler: batch.creator_username || 'Unknown',
          annotatedCount: annotated,
          file_ids: fileIds
        };
      }));
      
      setJobs(jobsWithCounts);
    } catch (error: any) {
      console.error('Failed to load dataset jobs:', error);
      toast.error('Failed to load dataset jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewJob = (job: DatasetJob) => {
    // Redirect to job page showing only annotated files
    const fileIdsParam = encodeURIComponent(JSON.stringify(job.file_ids || []));
    router.push(`/${projectSlug}/annotate/job?jobId=${job.batch_id}&fileIds=${fileIdsParam}`);
  };

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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading dataset...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No completed jobs</p>
            <p className="text-xs text-muted-foreground mt-1">Complete annotation jobs to add to dataset</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.batch_id}
              className="border border-input rounded-md p-4 bg-background hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{job.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Labeler: {job.labeler}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-input/50">
                <span className="text-xs text-muted-foreground">
                  {job.annotatedCount} Annotated Files
                </span>
                <button
                  onClick={() => handleViewJob(job)}
                  className="text-primary hover:text-primary/80 p-1"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
