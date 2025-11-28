"use client";

import { UploadForm } from "@/components/upload-form";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function ProjectUploadPage() {
  const { project } = useProjectFromSlug();
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.projectId as string;

  const handleGenerateNewData = () => {
    if (!projectSlug) {
      return;
    }
    router.push(`/${projectSlug}/generate`);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Data</h1>
          <p className="text-muted-foreground">
            Upload your files for project: {project?.name || "Loading..."}
          </p>
        </div>
        <Button
          onClick={handleGenerateNewData}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Generate new Data
        </Button>
      </div>
      <UploadForm />
    </div>
  );
}

