"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CSVComparison } from "@/components/csv-compare/csv-comparison";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import {
  getDatasets,
  getDatasetVersions,
  downloadDatasetVersionFile,
  type Dataset,
  type DatasetVersion,
} from "@/app/api/dataset";
import type { CSVData } from "@/lib/csv-compare/csv-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ComparisonSlot = "original" | "modified";

export default function ProjectComparisonToolPage() {
  const { project } = useProjectFromSlug();
  const [file1Data, setFile1Data] = useState<CSVData | null>(null);
  const [file2Data, setFile2Data] = useState<CSVData | null>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedOriginalVersion, setSelectedOriginalVersion] = useState<number | null>(null);
  const [selectedModifiedVersion, setSelectedModifiedVersion] = useState<number | null>(null);

  const [loadingSlot, setLoadingSlot] = useState<ComparisonSlot | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoadingDatasets(true);
      try {
        const response = await getDatasets();
        setDatasets(response);
      } catch (error: any) {
        toast.error(error.message || "Failed to load datasets");
      } finally {
        setIsLoadingDatasets(false);
      }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (!selectedDatasetId) {
      setVersions([]);
      setSelectedOriginalVersion(null);
      setSelectedModifiedVersion(null);
      return;
    }

    const fetchVersions = async () => {
      setIsLoadingVersions(true);
      try {
        const response = await getDatasetVersions(selectedDatasetId);
        setVersions(response);
      } catch (error: any) {
        toast.error(error.message || "Failed to load dataset versions");
      } finally {
        setIsLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [selectedDatasetId]);

  useEffect(() => {
    if (!project?.dataset_id) return;
    setSelectedDatasetId((prev) => prev ?? project.dataset_id!);
  }, [project?.dataset_id]);

  const versionOptions = useMemo(() => {
    return [...versions].sort((a, b) => b.version_number - a.version_number);
  }, [versions]);

  const handleLoadVersion = async (slot: ComparisonSlot) => {
    const targetDatasetId = selectedDatasetId;
    const targetVersionId = slot === "original" ? selectedOriginalVersion : selectedModifiedVersion;

    if (!targetDatasetId) {
      toast.error("Please select a dataset first.");
      return;
    }

    if (!targetVersionId) {
      toast.error("Please select a dataset version to load.");
      return;
    }

    setLoadingSlot(slot);
    try {
      const exportResult = await downloadDatasetVersionFile(targetDatasetId, targetVersionId, "csv");
      const csvFile = new File([exportResult.blob], exportResult.fileName, { type: exportResult.contentType || "text/csv" });
      const { parseCSVFile } = await import("@/lib/csv-compare/csv-parser");
      const parsed = await parseCSVFile(csvFile);

      if (slot === "original") {
        setFile1Data(parsed);
        toast.success(`Loaded v${targetVersionId} into Original file slot.`);
      } else {
        setFile2Data(parsed);
        toast.success(`Loaded v${targetVersionId} into Modified file slot.`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load dataset version.");
    } finally {
      setLoadingSlot(null);
    }
  };

  const renderVersionSelect = (
    slot: ComparisonSlot,
    value: number | null,
    onChange: (value: number | null) => void,
    label: string,
    description: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        disabled={!selectedDatasetId || isLoadingVersions}
        value={value ? String(value) : undefined}
        onValueChange={(newValue) => onChange(Number(newValue))}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoadingVersions ? "Loading versions..." : "Select version"} />
        </SelectTrigger>
        <SelectContent>
          {versionOptions.length === 0 ? (
            <SelectItem value="__empty" disabled>
              {isLoadingVersions ? "Loading..." : "No versions available"}
            </SelectItem>
          ) : (
            versionOptions.map((version) => (
              <SelectItem key={version.version_id} value={String(version.version_id)}>
                v{version.version_number} · {new Date(version.created_at).toLocaleDateString()}{" "}
                {version.changelog ? `— ${version.changelog}` : ""}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button
        variant="outline"
        disabled={
          !selectedDatasetId || !value || isLoadingVersions || loadingSlot === slot
        }
        onClick={() => handleLoadVersion(slot)}
        className="w-full"
      >
        {loadingSlot === slot ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          `Load as ${label.split(" ")[0]}`
        )}
      </Button>
    </div>
  );

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

      <Card>
        <CardHeader>
          <CardTitle>Dataset version loader</CardTitle>
          <CardDescription>Pull dataset versions directly into the comparison tool.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select
              disabled={isLoadingDatasets}
              value={selectedDatasetId ? String(selectedDatasetId) : undefined}
              onValueChange={(value) => {
                const datasetId = Number(value);
                setSelectedDatasetId(datasetId);
                setSelectedOriginalVersion(null);
                setSelectedModifiedVersion(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDatasets ? "Loading datasets..." : "Select dataset"} />
              </SelectTrigger>
              <SelectContent>
                {datasets.length === 0 ? (
              <SelectItem value="__empty" disabled>
                    {isLoadingDatasets ? "Loading..." : "No datasets available"}
                  </SelectItem>
                ) : (
                  datasets.map((dataset) => (
                    <SelectItem key={dataset.dataset_id} value={String(dataset.dataset_id)}>
                      {dataset.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!selectedDatasetId && (
              <p className="text-sm text-muted-foreground">
                {project?.dataset_id
                  ? "Using the dataset linked to this project once it is loaded."
                  : "Select any dataset to fetch its versions."}
              </p>
            )}
          </div>

          {selectedDatasetId && (
            <div className="grid gap-4 md:grid-cols-2">
              {renderVersionSelect(
                "original",
                selectedOriginalVersion,
                setSelectedOriginalVersion,
                "Original version",
                "This version will populate the Original file slot."
              )}
              {renderVersionSelect(
                "modified",
                selectedModifiedVersion,
                setSelectedModifiedVersion,
                "Modified version",
                "This version will populate the Modified file slot."
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CSVComparison
        file1Data={file1Data}
        file2Data={file2Data}
        onFile1DataChange={setFile1Data}
        onFile2DataChange={setFile2Data}
      />
    </div>
  );
}
