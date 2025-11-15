"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, FileText } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { getBatch } from "@/app/api/batch";
import { getProjectFiles } from "@/app/api/project";
import { toast } from "sonner";

export default function ProjectJobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const batchId = searchParams.get("jobId"); // jobId is actually batchId
  const fileIdsParam = searchParams.get("fileIds");

  const [batchData, setBatchData] = useState<any>(null);
  const [batchName, setBatchName] = useState("");
  const [activeTab, setActiveTab] = useState("unannotated");
  const [unannotatedFiles, setUnannotatedFiles] = useState<any[]>([]);
  const [annotatedFiles, setAnnotatedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [assignedMembers, setAssignedMembers] = useState<any[]>([]);

  // Load job data on mount
  useEffect(() => {
    if (batchId && project) {
      loadJobData();
    }
  }, [batchId, project]);

  const loadJobData = async () => {
    try {
      setIsLoading(true);

      // Get batch details
      const batch = await getBatch(parseInt(batchId!));
      setBatchData(batch);
      setBatchName(batch.name);

      // Get file_ids from URL or batch metadata
      let targetFileIds: number[] = [];
      if (fileIdsParam) {
        targetFileIds = JSON.parse(fileIdsParam);
      } else if (batch.batch_metadata?.file_ids) {
        targetFileIds = batch.batch_metadata.file_ids;
      }

      // Get instructions from batch metadata
      if (batch.batch_metadata?.instructions) {
        setInstructions(batch.batch_metadata.instructions);
      }

      // Get assigned members from batch metadata
      if (batch.batch_metadata?.assigned_members) {
        setAssignedMembers(batch.batch_metadata.assigned_members);
      }

      // Fetch project files
      const projectFiles = await getProjectFiles(parseInt(project!.id));

      // Filter files by batch file IDs
      let batchFiles = projectFiles;
      if (targetFileIds.length > 0) {
        batchFiles = projectFiles.filter(f => targetFileIds.includes(f.file_id));
      }

      // Separate into unannotated and annotated
      const unannotated = batchFiles.filter(f => 
        f.annotation_status === 'unannotated' || f.annotation_status === 'annotating'
      );
      const annotated = batchFiles.filter(f => 
        f.annotation_status === 'completed' || f.annotation_status === 'verified'
      );

      setUnannotatedFiles(unannotated);
      setAnnotatedFiles(annotated);

    } catch (error: any) {
      console.error("Failed to load job data:", error);
      toast.error("Failed to load job data");
    } finally {
      setIsLoading(false);
    }
  };

  const totalFiles = unannotatedFiles.length + annotatedFiles.length;
  const progress = totalFiles > 0 ? (annotatedFiles.length / totalFiles) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading job data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${projectSlug}/annotate`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Uploaded on {batchData?.created_at ? new Date(batchData.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-4">
            <Button 
              className="flex-1" 
              onClick={() => {
                // Pass batch ID and file IDs to labelai page
                const fileIds = unannotatedFiles.map(f => f.file_id);
                const params = new URLSearchParams({
                  batchId: batchId!,
                  fileIds: JSON.stringify(fileIds),
                  jobName: batchName
                });
                router.push(`/${projectSlug}/labelai?${params.toString()}`);
              }}
              disabled={unannotatedFiles.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Annotating
            </Button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-4">Progress</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{annotatedFiles.length} Images</span>
                <span className="text-muted-foreground">
                  {totalFiles > 0 ? Math.round(progress) : 0}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">0 Annotated</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{unannotatedFiles.length} Unannotated</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">1 Labeler</p>
              </div>
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-4">File Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Files</span>
              <span className="font-medium">{totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Type</span>
              <span className="font-medium">Images</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium">-</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <p className="text-sm text-muted-foreground">{instructions}</p>
          </div>
        )}

        {/* Assignment */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Assignment</h3>
          </div>
          <div className="space-y-2">
            <div className="p-3 border rounded-lg">
              <p className="font-medium text-sm">Truong Vinh Hao</p>
              <p className="text-xs text-muted-foreground">Labeler</p>
            </div>
            {assignedMembers.map((member, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.role || "Labeler"} • {member.filesAssigned || 0} files
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">Job created via API and assigned to {project?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {batchData?.created_at ? new Date(batchData.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content - Files Grid with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-6 pt-4">
              <TabsList>
                <TabsTrigger value="unannotated">
                  Unannotated
                  <Badge variant="secondary" className="ml-2">
                    {unannotatedFiles.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="annotated">
                  Annotated
                  <Badge variant="secondary" className="ml-2">
                    {annotatedFiles.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="unannotated" className="mt-0 p-6">
              {unannotatedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>No unannotated files</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {unannotatedFiles.map((file) => (
                    <div key={file.file_id} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden hover:border-primary transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs truncate mt-2" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="annotated" className="mt-0 p-6">
              {annotatedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>No annotated files yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {annotatedFiles.map((file) => (
                    <div key={file.file_id} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden hover:border-primary transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <Badge 
                          variant="default" 
                          className="absolute top-2 right-2 text-xs"
                        >
                          ✓
                        </Badge>
                      </div>
                      <p className="text-xs truncate mt-2" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

