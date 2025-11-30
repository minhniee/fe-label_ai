"use client";

import { useParams } from "next/navigation";
import AnnotatingSection from "@/components/annotating-section";
import UnassignedSection from "@/components/unassigned-section";
import DatasetSection from "@/components/dataset-section";

export default function ProjectAnnotatePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="flex h-[calc(100vh-4rem-1rem)] overflow-hidden bg-background -m-4 gap-4 p-4">
        {/* Unassigned Files Column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <UnassignedSection />
        </div>
        {/* Annotating Column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <AnnotatingSection />
        </div>
        {/* Dataset Column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <DatasetSection />
        </div>
    </div>
  );
}
