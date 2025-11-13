"use client";

import ComparisonTool from "@/components/comparison-tool";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";

export default function ProjectComparisonToolPage() {
  const { project } = useProjectFromSlug();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparison Tool</h1>
          <p className="text-muted-foreground">
            Compare annotations for project: {project?.name || "Loading..."}
          </p>
        </div>
      </div>
      <ComparisonTool />
    </div>
  );
}

