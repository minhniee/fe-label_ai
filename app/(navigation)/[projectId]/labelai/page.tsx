"use client";

import { useParams } from "next/navigation";
import DataLabelingInterface from "@/components/data-labeling-interface";

export default function ProjectLabelAIPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <DataLabelingInterface />;
}

