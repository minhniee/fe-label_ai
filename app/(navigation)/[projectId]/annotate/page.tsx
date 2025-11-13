"use client";

import { useParams } from "next/navigation";
import AnnotatingSection from "@/components/annotating-section";
import UnassignedSection from "@/components/unassigned-section";
import DatasetSection from "@/components/dataset-section";

export default function ProjectAnnotatePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-4rem)]">
        {/* Unassigned Files Column */}
        <div className="flex flex-col h-full">
          <UnassignedSection />
        </div>
        {/* Annotating Column */}
        <div className="flex flex-col h-full">
          <AnnotatingSection />
        </div>

        {/* Dataset Column */}
        <div className="flex flex-col h-full">
          <DatasetSection />
        </div>
        
    </div>
  );
}
