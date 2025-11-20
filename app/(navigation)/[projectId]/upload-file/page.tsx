"use client";

import { UploadForm } from "@/components/upload-form";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";

export default function ProjectUploadPage() {
  const { project } = useProjectFromSlug();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Data</h1>
          <p className="text-muted-foreground">
            Upload your files for project: {project?.name || "Loading..."}
          </p>
        </div>
      </div>
      <UploadForm />
    </div>
  );
}

