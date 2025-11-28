"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGenerator } from "@/components/label-ai/data-generator";
import { useToast } from "@/hooks/use-toast";
import { importGeneratedData } from "@/app/api/project";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { slugToProjectId } from "@/types/project";
import { ArrowLeft } from "lucide-react";
import { convertDataToCSV } from "@/lib/label-ai-utils";
import { toast as sonnerToast } from "sonner";

export type RowData = {
  _id: string;
  [key: string]: any;
};

export default function ProjectGeneratePage() {
  const router = useRouter();
  const params = useParams();
  const projectSlug = params.projectId as string | undefined;
  const numericProjectId = projectSlug
    ? Number(slugToProjectId(projectSlug))
    : null;
  const { project } = useProjectFromSlug();
  const { toast } = useToast();

  const [datasetName, setDatasetName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const buildGeneratedFileName = (baseName?: string) => {
    const base = (baseName ?? datasetName ?? "generated-data").trim() || "generated-data";
    const sanitized = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${sanitized || "generated-data"}-${Date.now()}.csv`;
  };

  const handleDataGenerated = async (data: any[], columns: string[], name: string) => {
    setDatasetName(name);
    const projectId = numericProjectId;
    if (projectId === null || Number.isNaN(projectId)) {
      toast({
        title: "Missing project",
        description: "Invalid project context. Please reopen this page from a project.",
        variant: "destructive",
      });
      return;
    }

    if (data.length === 0) {
      toast({
        title: "No data",
        description: "No generated data to import.",
        variant: "destructive",
      });
      return;
    }

    const toastId = sonnerToast.loading("Importing generated data...");

    try {
      setImporting(true);

      const csvContent = convertDataToCSV(data, columns);
      const chunkSize = Math.max(1, Math.floor(data.length / 5));
      const importResponse = await importGeneratedData(projectId, {
        csv_content: csvContent,
        file_name: buildGeneratedFileName(name),
        dataset_name: name,
        chunk_size: chunkSize,
        columns,
        row_count: data.length,
      });

      sonnerToast.success("Generated data imported!", { id: toastId });

      const splitInfo = importResponse.split;
      toast({
        title: "Rows detected",
        description: `Detected ${splitInfo?.total_rows ?? data.length} row(s) in generated file.`,
      });

      toast({
        title: "Success",
        description: `Imported ${splitInfo?.total_rows ?? data.length} row(s) to ${project?.name || "project"}.`,
      });

      const fileIdsParam =
        importResponse.batch.file_ids && importResponse.batch.file_ids.length > 0
          ? `&fileIds=${encodeURIComponent(JSON.stringify(importResponse.batch.file_ids))}`
          : "";
      const redirectUrl = `/${projectSlug}/annotate/batch?batchId=${importResponse.batch.batch_id}${fileIdsParam}`;
      router.push(redirectUrl);
    } catch (error: any) {
      console.error("Error importing to project:", error);
      sonnerToast.error(error.message || "Failed to import generated data", { id: toastId });
      toast({
        title: "Error",
        description: error.message || "Failed to import generated data",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    if (projectSlug) {
      router.push(`/${projectSlug}/upload-file`);
    } else {
      router.back();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="p-6 space-y-4">
        <DataGenerator onDataGenerated={handleDataGenerated} />
        {importing && (
          <p className="text-sm text-muted-foreground">
            Importing generated data into {project?.name || "project"} and creating chunk batches...
          </p>
        )}
      </Card>
    </div>
  );
}


