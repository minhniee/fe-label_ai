"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";

export default function ProjectJobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const jobId = searchParams.get("jobId");

  const [jobName] = useState("Batch 001 - Labeling Job");
  const [activeTab, setActiveTab] = useState("unannotated");

  // Mock data
  const totalFiles = 100;
  const annotatedFiles = 45;
  const progress = (annotatedFiles / totalFiles) * 100;

  const mockUnannotatedFiles = [
    { id: "1", name: "image1.jpg" },
    { id: "2", name: "image2.jpg" },
    { id: "3", name: "image3.jpg" },
  ];

  const mockAnnotatedFiles = [
    { id: "4", name: "image4.jpg" },
    { id: "5", name: "image5.jpg" },
  ];

  const mockAssignedMembers = [
    { name: "Truong Vinh Hao", filesAssigned: 50 },
    { name: "Truong Hao", filesAssigned: 50 },
  ];

  const mockInstructions = "Please label all objects in the images according to the provided schema.";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${projectSlug}/annotate`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{jobName}</h1>
            <p className="text-muted-foreground">Project: {project?.name || "Loading..."}</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/${projectSlug}/labelai`)}>
          <Play className="mr-2 h-4 w-4" />
          Start Annotating
        </Button>
      </div>

      {/* Progress Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Progress</h3>
            <Badge variant="secondary">
              {annotatedFiles} / {totalFiles} files
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {progress.toFixed(1)}% complete
          </p>
        </div>
      </Card>

      {/* File Info */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">File Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold">{totalFiles}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Annotated</p>
            <p className="text-2xl font-bold text-green-600">{annotatedFiles}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-2xl font-bold text-orange-600">{totalFiles - annotatedFiles}</p>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      {mockInstructions && (
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <p className="text-sm text-muted-foreground">{mockInstructions}</p>
        </Card>
      )}

      {/* Assigned Members */}
      {mockAssignedMembers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assigned Members</h3>
          <div className="space-y-2">
            {mockAssignedMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <p className="font-medium">{member.name}</p>
                <Badge variant="outline">{member.filesAssigned} files</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline Placeholder */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Timeline</h3>
        <p className="text-sm text-muted-foreground">Timeline integration coming soon...</p>
      </Card>

      {/* Files Tabs */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unannotated">
              Unannotated ({mockUnannotatedFiles.length})
            </TabsTrigger>
            <TabsTrigger value="annotated">
              Annotated ({mockAnnotatedFiles.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unannotated" className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mt-4">
              {mockUnannotatedFiles.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="aspect-square rounded-lg border bg-muted" />
                  <p className="text-sm truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="annotated" className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mt-4">
              {mockAnnotatedFiles.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="aspect-square rounded-lg border bg-muted" />
                  <p className="text-sm truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

