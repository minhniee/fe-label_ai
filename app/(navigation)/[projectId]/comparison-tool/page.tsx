"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const loadDatasets = useCallback(async (projectId: number) => {
    setIsLoadingDatasets(true);
    try {
      const response = await getDatasets(projectId);
      setDatasets(response);
      // Auto-select the dataset if there's only one or if project has dataset_id
      if (response.length === 1) {
        setSelectedDatasetId(response[0].dataset_id);
      } else if (project?.dataset_id) {
        const projectDataset = response.find(d => d.dataset_id === project.dataset_id);
        if (projectDataset) {
          setSelectedDatasetId(projectDataset.dataset_id);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load datasets");
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [project?.dataset_id]);

  useEffect(() => {
    if (project?.id) {
      loadDatasets(parseInt(project.id));
    }
  }, [project?.id, loadDatasets]);

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

  // Auto-select dataset when project has dataset_id and datasets are loaded
  useEffect(() => {
    if (!project?.dataset_id || datasets.length === 0) return;
    const projectDataset = datasets.find(d => d.dataset_id === project.dataset_id);
    if (projectDataset && !selectedDatasetId) {
      setSelectedDatasetId(projectDataset.dataset_id);
    }
  }, [project?.dataset_id, datasets, selectedDatasetId]);

  const versionOptions = useMemo(() => {
    return [...versions].sort((a, b) => b.version_number - a.version_number);
  }, [versions]);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.dataset_id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId]
  );

  const handleReloadDatasets = () => {
    if (project?.id) {
      loadDatasets(parseInt(project.id));
    }
  };

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
    <Card className="border border-dashed bg-muted/30 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">
            {slot === "original" ? "Original" : "Modified"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Label className="text-xs uppercase text-muted-foreground">Version</Label>
        <Select
          disabled={!selectedDatasetId || isLoadingVersions}
          value={value ? String(value) : undefined}
          onValueChange={(newValue) => onChange(Number(newValue))}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={isLoadingVersions ? "Loading versions..." : "Select version"}
            />
          </SelectTrigger>
          <SelectContent align="end">
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
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          disabled={
            !selectedDatasetId || !value || isLoadingVersions || loadingSlot === slot
          }
          onClick={() => handleLoadVersion(slot)}
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
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border bg-card/40 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Comparison Tool</h1>
              <p className="text-muted-foreground">
                Compare dataset versions for {project?.name || "your project"} and inspect differences side-by-side.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReloadDatasets}
              disabled={isLoadingDatasets}
            >
              {isLoadingDatasets ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh datasets
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <Card className="h-fit shadow-sm">
          <CardHeader>
            <CardTitle>Dataset version loader</CardTitle>
            <CardDescription>
              Pull dataset versions directly into either slot before running the comparison.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Dataset</Label>
              {datasets.length === 0 && !isLoadingDatasets ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p>No dataset available for this project.</p>
                  {!project?.dataset_id && (
                    <p className="mt-1 text-xs">This project doesn't have a dataset linked yet.</p>
                  )}
                </div>
              ) : datasets.length === 1 ? (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedDataset?.name || datasets[0]?.name}</p>
                  <p className="text-muted-foreground">Project dataset</p>
                </div>
              ) : (
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
                    <SelectValue
                      placeholder={isLoadingDatasets ? "Loading datasets..." : "Select dataset"}
                    />
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
              )}
              {!selectedDatasetId && isLoadingDatasets && (
                <p className="text-sm text-muted-foreground">
                  Loading project dataset...
                </p>
              )}
            </div>

            {selectedDatasetId && (
              <>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedDataset?.name}</p>
                  <p>
                    Versions available:{" "}
                    <span className="font-semibold text-foreground">
                      {versionOptions.length || 0}
                    </span>
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderVersionSelect(
                    "original",
                    selectedOriginalVersion,
                    setSelectedOriginalVersion,
                    "Original version",
                    "Populate the Original file slot before comparing."
                  )}
                  {renderVersionSelect(
                    "modified",
                    selectedModifiedVersion,
                    setSelectedModifiedVersion,
                    "Modified version",
                    "Populate the Modified file slot before comparing."
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Comparison workspace</CardTitle>
            <CardDescription>
              Upload CSVs manually or use the loader to populate each side, then review the diff.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <CSVComparison
              file1Data={file1Data}
              file2Data={file2Data}
              onFile1DataChange={setFile1Data}
              onFile2DataChange={setFile2Data}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
