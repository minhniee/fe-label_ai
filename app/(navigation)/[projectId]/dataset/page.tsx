"use client";

import { Fragment, useState, useEffect, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Download,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Layers,
} from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import {
  getDatasets,
  getDatasetVersions,
  exportDatasetVersion,
  downloadDatasetVersionFile,
  uploadFileToDataset,
  type Dataset,
  type DatasetVersion,
} from "@/app/api/dataset";
import { toast } from "sonner";
import { uploadFilesToProject } from "@/app/api/project";
import { createProjectBatch } from "@/app/api/batch";

export default function ProjectDatasetPage() {
  const { project } = useProjectFromSlug();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    null
  );
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">(
    "csv"
  );
  const [isExporting, setIsExporting] = useState(false);
  const [datasetVersions, setDatasetVersions] = useState<
    Record<number, DatasetVersion[]>
  >({});
  const [versionsLoading, setVersionsLoading] = useState<
    Record<number, boolean>
  >({});
  const [uploadingDatasetId, setUploadingDatasetId] = useState<number | null>(
    null
  );
  const fileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});
  const [selectedVersionMap, setSelectedVersionMap] = useState<
    Record<number, number | null>
  >({});
  const [labelingContext, setLabelingContext] = useState<{
    dataset: Dataset;
    version: DatasetVersion;
  } | null>(null);
  const [batchNameInput, setBatchNameInput] = useState("");
  const [batchDescriptionInput, setBatchDescriptionInput] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [expandedDatasetId, setExpandedDatasetId] = useState<number | null>(
    null
  );

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    filterAndSortDatasets();
  }, [datasets, searchQuery, sortBy]);

  const loadDatasets = async () => {
    try {
      setIsLoading(true);
      const datasetsList = await getDatasets();
      setDatasets(datasetsList);
      const versionsMap: Record<number, DatasetVersion[]> = {};
      for (const dataset of datasetsList) {
        versionsMap[dataset.dataset_id] = await fetchDatasetVersions(
          dataset.dataset_id
        );
      }
      setDatasetVersions(versionsMap);
    } catch (error: any) {
      console.error("Failed to load datasets:", error);
      toast.error("Failed to load datasets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatasetVersions = async (datasetId: number) => {
    try {
      setVersionsLoading((prev) => ({ ...prev, [datasetId]: true }));
      const versions = await getDatasetVersions(datasetId);
      const sorted = [...versions].sort(
        (a, b) => b.version_number - a.version_number
      );
      setDatasetVersions((prev) => ({ ...prev, [datasetId]: sorted }));
      setSelectedVersionMap((prev) => ({
        ...prev,
        [datasetId]: prev[datasetId] ?? sorted[0]?.version_id ?? null,
      }));
      return sorted;
    } catch (error: any) {
      console.error(`Failed to load versions for dataset ${datasetId}:`, error);
      toast.error(`Failed to load versions for dataset ${datasetId}`);
      return [];
    } finally {
      setVersionsLoading((prev) => ({ ...prev, [datasetId]: false }));
    }
  };

  const filterAndSortDatasets = () => {
    let filtered = [...datasets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.description && d.description.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredDatasets(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleExportClick = (datasetId: number, versionId: number) => {
    setSelectedDatasetId(datasetId);
    setSelectedVersionId(versionId);
    setIsExportOpen(true);
  };

  const triggerFileInput = (datasetId: number) => {
    const input = fileInputsRef.current[datasetId];
    input?.click();
  };

  const handleFileChange = async (
    datasetId: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are supported for upload");
      event.target.value = "";
      return;
    }

    setUploadingDatasetId(datasetId);
    try {
      await uploadFileToDataset(datasetId, file, "text/csv");
      toast.success("File uploaded and new version created!");
      await fetchDatasetVersions(datasetId);
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadingDatasetId(null);
      event.target.value = "";
    }
  };

  const handleExport = async () => {
    if (!selectedDatasetId || !selectedVersionId) {
      toast.error("Please select a dataset version");
      return;
    }

    setIsExporting(true);
    try {
      const dataset = datasets.find((d) => d.dataset_id === selectedDatasetId);
      const exportResponse = await exportDatasetVersion(
        selectedDatasetId,
        selectedVersionId,
        exportFormat,
        dataset?.name
      );

      if (!exportResponse?.download_url) {
        toast.error("Failed to generate download link");
        return;
      }

      const link = document.createElement("a");
      link.href = exportResponse.download_url;
      link.target = "_blank";
      if (exportResponse.file_name) {
        link.download = exportResponse.file_name;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `Dataset export ready! Downloading ${exportFormat.toUpperCase()} file from storage.`
      );
      setIsExportOpen(false);
      setSelectedDatasetId(null);
      setSelectedVersionId(null);
    } catch (error: any) {
      console.error("Failed to export dataset:", error);
      toast.error(error.message || "Failed to export dataset");
    } finally {
      setIsExporting(false);
    }
  };

  const openLabelingDialog = (dataset: Dataset, version: DatasetVersion) => {
    setLabelingContext({ dataset, version });
    setBatchNameInput(`${dataset.name} - v${version.version_number}`);
    setBatchDescriptionInput(version.changelog || "");
  };

  const closeLabelingDialog = () => {
    if (creatingBatch) return;
    setLabelingContext(null);
    setBatchNameInput("");
    setBatchDescriptionInput("");
  };

  const handleCreateBatchFromVersion = async () => {
    if (!labelingContext || !project?.id) {
      toast.error("Project context missing");
      return;
    }

    const { dataset, version } = labelingContext;
    const batchName =
      batchNameInput.trim() || `${dataset.name} - v${version.version_number}`;
    setCreatingBatch(true);

    try {
      // Step 1: export dataset version as CSV (proxied through backend to avoid CORS)
      const exportResult = await downloadDatasetVersionFile(
        dataset.dataset_id,
        version.version_id,
        "csv",
        `${dataset.name}-v${version.version_number}.csv`
      );

      const file = new File(
        [exportResult.blob],
        exportResult.fileName ||
          `${dataset.name}-v${version.version_number}.csv`,
        {
          type:
            exportResult.contentType || exportResult.blob.type || "text/csv",
        }
      );

      // Step 2: upload to current project
      const uploadResponse = await uploadFilesToProject(
        parseInt(project.id),
        [file],
        "text"
      );
      const fileIds =
        uploadResponse?.files?.map((fileInfo) => fileInfo.file_id) || [];
      if (fileIds.length === 0) {
        throw new Error("Uploaded file but did not receive file details");
      }

      // Step 3: create batch linked to these files
      const batchResponse = await createProjectBatch({
        project_id: parseInt(project.id),
        name: batchName,
        description: batchDescriptionInput.trim() || undefined,
        file_ids: fileIds,
        batch_metadata: {
          source: "dataset_version",
          dataset_id: dataset.dataset_id,
          version_id: version.version_id,
          version_number: version.version_number,
          file_ids: fileIds,
        },
      });

      toast.success(
        "Batch created from dataset version. Check the Unassigned section to continue labeling."
      );
      closeLabelingDialog();
    } catch (error: any) {
      console.error("Failed to prepare batch from dataset version:", error);
      toast.error(error.message || "Failed to prepare batch from this version");
    } finally {
      setCreatingBatch(false);
    }
  };

  const getSelectedVersion = (dataset: Dataset) => {
    const versions = datasetVersions[dataset.dataset_id] || [];
    const selectedId = selectedVersionMap[dataset.dataset_id];
    if (selectedId) {
      const matched = versions.find(
        (version) => version.version_id === selectedId
      );
      if (matched) return matched;
    }
    return versions[0] || null;
  };

  const handleExportSelectedVersion = (dataset: Dataset) => {
    const version = getSelectedVersion(dataset);
    if (!version) {
      toast.error("Please upload a version before exporting");
      return;
    }
    handleExportClick(dataset.dataset_id, version.version_id);
  };

  const handlePrepareBatchSelectedVersion = (dataset: Dataset) => {
    const version = getSelectedVersion(dataset);
    if (!version) {
      toast.error("Please upload a version before creating a batch");
      return;
    }
    openLabelingDialog(dataset, version);
  };

  const toggleDatasetDetails = (datasetId: number) => {
    setExpandedDatasetId((prev) => (prev === datasetId ? null : datasetId));
  };

  // Pagination
  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading dataset files...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-background p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dataset</h1>
          </div>
          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Export Dataset</DialogTitle>
                <DialogDescription>
                  Choose export format for the selected dataset
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedDatasetId && (
                  <div className="space-y-2">
                    <Label>Selected Dataset</Label>
                    <p className="text-sm font-medium">
                      {datasets.find((d) => d.dataset_id === selectedDatasetId)
                        ?.name || "Unknown"}
                    </p>
                  </div>
                )}
                {selectedVersionId && (
                  <div className="space-y-2">
                    <Label>Selected Version</Label>
                    <p className="text-sm font-medium">
                      {datasetVersions[selectedDatasetId || 0]?.find(
                        (v) => v.version_id === selectedVersionId
                      )?.version_number
                        ? `v${
                            datasetVersions[selectedDatasetId || 0]?.find(
                              (v) => v.version_id === selectedVersionId
                            )?.version_number
                          }`
                        : selectedVersionId}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format *</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value: any) => setExportFormat(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    The dataset will be exported in {exportFormat.toUpperCase()}{" "}
                    format.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsExportOpen(false);
                    setSelectedDatasetId(null);
                    setSelectedVersionId(null);
                  }}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={
                    isExporting || !selectedDatasetId || !selectedVersionId
                  }
                >
                  {isExporting ? "Exporting..." : "Export Dataset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex w-full justify-end sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="newest">Sort By Newest</SelectItem>
                <SelectItem value="oldest">Sort By Oldest</SelectItem>
                <SelectItem value="name">Sort By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredDatasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p>No datasets found</p>
          </div>
        ) : (
          <Card className="shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Dataset</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Versions</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDatasets.map((dataset) => {
                    const versions = datasetVersions[dataset.dataset_id] || [];
                    const selectedVersionId =
                      selectedVersionMap[dataset.dataset_id] ??
                      versions[0]?.version_id ??
                      null;
                    const selectedVersion = versions.find(
                      (version) => version.version_id === selectedVersionId
                    );
                    const isLoadingVersions =
                      versionsLoading[dataset.dataset_id];
                    const isActiveLabelingContext = Boolean(
                      labelingContext &&
                        labelingContext.dataset.dataset_id ===
                          dataset.dataset_id &&
                        labelingContext.version.version_id === selectedVersionId
                    );
                    const isExpanded = expandedDatasetId === dataset.dataset_id;
                    return (
                        <Fragment key={dataset.dataset_id}>
                         <TableRow className="align-middle">
                          <TableCell className="align-middle">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              aria-label={
                                isExpanded
                                  ? "Hide dataset details"
                                  : "Show dataset details"
                              }
                              onClick={() =>
                                toggleDatasetDetails(dataset.dataset_id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="font-semibold">{dataset.name}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {versions.length} version
                              {versions.length === 1 ? "" : "s"}
                            </p>
                          </TableCell>
                          <TableCell className="align-middle">
                            {dataset.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {dataset.description}
                              </p>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No description
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            {versions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No versions yet. Upload a CSV to create one.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  Select version
                                </Label>
                                <Select
                                  value={selectedVersionId?.toString()}
                                  onValueChange={(value) =>
                                    setSelectedVersionMap((prev) => ({
                                      ...prev,
                                      [dataset.dataset_id]: Number(value),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose version" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {versions.map((version) => (
                                      <SelectItem
                                        key={version.version_id}
                                        value={version.version_id.toString()}
                                      >
                                        v{version.version_number} ·{" "}
                                        {new Date(
                                          version.created_at
                                        ).toLocaleString()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {selectedVersion?.changelog && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {selectedVersion.changelog}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="text-sm font-medium">
                              {dataset.created_by_username || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="text-sm">
                              {new Date(dataset.created_at).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Open dataset actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-48 space-y-2"
                              >
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() =>
                                    fetchDatasetVersions(dataset.dataset_id)
                                  }
                                  disabled={isLoadingVersions}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {isLoadingVersions
                                    ? "Refreshing..."
                                    : "Refresh versions"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() =>
                                    triggerFileInput(dataset.dataset_id)
                                  }
                                  disabled={
                                    uploadingDatasetId === dataset.dataset_id
                                  }
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {uploadingDatasetId === dataset.dataset_id
                                    ? "Uploading..."
                                    : "Upload CSV"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() =>
                                    handleExportSelectedVersion(dataset)
                                  }
                                  disabled={!versions.length}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export dataset
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() =>
                                    handlePrepareBatchSelectedVersion(dataset)
                                  }
                                  disabled={
                                    creatingBatch ||
                                    !versions.length ||
                                    isActiveLabelingContext
                                  }
                                >
                                  <Layers className="h-4 w-4 mr-2" />
                                  {creatingBatch && isActiveLabelingContext
                                    ? "Preparing..."
                                    : "Create batch"}
                                </Button>
                              </PopoverContent>
                            </Popover>
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              ref={(el) => {
                                fileInputsRef.current[dataset.dataset_id] = el;
                              }}
                              onChange={(event) =>
                                handleFileChange(dataset.dataset_id, event)
                              }
                            />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/40">
                            <TableCell colSpan={7}>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Dataset ID
                                    </p>
                                    <p className="font-medium">
                                      {dataset.dataset_id}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Total Versions
                                    </p>
                                    <p className="font-medium">
                                      {versions.length}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Last Updated
                                    </p>
                                    <p className="font-medium">
                                      {versions[0]
                                        ? new Date(
                                            versions[0].created_at
                                          ).toLocaleString()
                                        : new Date(
                                            dataset.created_at
                                          ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {versions.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Version history
                                    </p>
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                      {versions.map((version) => (
                                        <div
                                          key={version.version_id}
                                          className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                                        >
                                          <div>
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                              <Badge variant="secondary">
                                                v{version.version_number}
                                              </Badge>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                  version.created_at
                                                ).toLocaleString()}
                                              </span>
                                            </div>
                                            {version.changelog && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {version.changelog}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Labeling Dialog */}
      <Dialog
        open={!!labelingContext}
        onOpenChange={(open) => (open ? null : closeLabelingDialog())}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Labeling from Dataset Version</DialogTitle>
            <DialogDescription>
              We&apos;ll export this version, upload it to the project, create a
              new batch, and redirect you to the labeling flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Dataset</Label>
              <p className="text-sm font-medium">
                {labelingContext?.dataset.name} (v
                {labelingContext?.version.version_number})
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-name">Batch name</Label>
              <Input
                id="batch-name"
                value={batchNameInput}
                onChange={(e) => setBatchNameInput(e.target.value)}
                placeholder="Enter batch name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-description">Description (optional)</Label>
              <Input
                id="batch-description"
                value={batchDescriptionInput}
                onChange={(e) => setBatchDescriptionInput(e.target.value)}
                placeholder="Add notes about this version"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This will create a new batch in this project so you can choose
              Label Myself, Label with Team, or Auto-Label with AI.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeLabelingDialog}
              disabled={creatingBatch}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBatchFromVersion}
              disabled={creatingBatch}
            >
              {creatingBatch ? "Preparing..." : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
