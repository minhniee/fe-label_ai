"use client";

import { useProjectFromSlug } from "@/hooks/use-project-from-slug";

export default function ProjectSchemaPage() {
  const { project } = useProjectFromSlug();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schema</h1>
          <p className="text-muted-foreground">
            Manage schema for project: {project?.name || "Loading..."}
          </p>
        </div>
      </div>
      {/* Schema upload component will be added here */}
    </div>
  );
}

