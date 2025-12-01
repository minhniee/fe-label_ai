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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Columns,
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
import { createProjectBatch, splitProjectFile, updateBatch } from "@/app/api/batch";

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
  const [datasetColumns, setDatasetColumns] = useState<
    Record<string, string[]>
  >({}); // key: `${datasetId}_${versionId}`
  const [columnsLoading, setColumnsLoading] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (project?.id) {
      loadDatasets();
    }
  }, [project?.id]);

  useEffect(() => {
    filterAndSortDatasets();
  }, [datasets, searchQuery, sortBy]);

  const loadDatasets = async () => {
    try {
      setIsLoading(true);
      const projectId = project?.id ? parseInt(project.id) : undefined;
      console.log("[Dataset Page] Loading datasets for project:", projectId, "Project:", project);
      const datasetsList = await getDatasets(projectId);
      console.log("[Dataset Page] Received datasets:", datasetsList.length, datasetsList);
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
      // Create batch directly from dataset version without uploading files again
      // Backend will copy files from the dataset version to the source dataset's draft version
      const batchResponse = await createProjectBatch({
        project_id: parseInt(project.id),
        name: batchName,
        description: batchDescriptionInput.trim() || undefined,
        file_ids: [], // Empty - backend will get files from version
        batch_metadata: {
          source: "dataset_version",
          dataset_id: dataset.dataset_id,
          version_id: version.version_id,
          version_number: version.version_number,
        },
      });

      // After creating batch, split the files (similar to upload more flow)
      if (batchResponse.file_ids && batchResponse.file_ids.length > 0) {
        console.log(`[Create Batch from Version] Splitting ${batchResponse.file_ids.length} files...`);
        
        // Collect all chunk file IDs to update batch metadata
        const allChunkFileIds: number[] = [];
        
        // Split each file
        for (const fileId of batchResponse.file_ids) {
          try {
            const splitResponse = await splitProjectFile({
              project_id: parseInt(project.id),
              file_id: fileId,
              auto_create_batches: false,
            });
            
            // Collect chunk file IDs from split response
            if (splitResponse.chunks_created && splitResponse.chunks_created.length > 0) {
              const chunkFileIds = splitResponse.chunks_created
                .map((chunk) => chunk.file_id)
                .filter((id): id is number => id !== undefined);
              allChunkFileIds.push(...chunkFileIds);
              console.log(`[Create Batch from Version] Successfully split file ${fileId} into ${chunkFileIds.length} chunks`);
            }
          } catch (splitError: any) {
            console.error(`[Create Batch from Version] Failed to split file ${fileId}:`, splitError);
            // Continue with other files even if one fails
          }
        }
        
        // Update batch metadata with chunk file IDs
        if (allChunkFileIds.length > 0) {
          try {
            await updateBatch(batchResponse.batch_id, {
              batch_metadata: {
                file_ids: allChunkFileIds,
                original_file_ids: batchResponse.file_ids, // Keep track of original files
              },
            });
            console.log(`[Create Batch from Version] Updated batch ${batchResponse.batch_id} with ${allChunkFileIds.length} chunk files`);
          } catch (updateError: any) {
            console.error(`[Create Batch from Version] Failed to update batch metadata:`, updateError);
            // Don't fail the whole operation if update fails
          }
        }
      }

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

  // Parse CSV content to extract column names
  const parseCSVColumns = (content: string): string[] => {
    try {
      if (!content || content.trim().length === 0) {
        return [];
      }
      
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) {
        return [];
      }
      
      // Parse first line as headers
      const firstLine = lines[0].trim();
      
      // Improved CSV parsing to handle quoted values and commas inside quotes
      const columns: string[] = [];
      let currentColumn = '';
      let insideQuotes = false;
      
      for (let i = 0; i < firstLine.length; i++) {
        const char = firstLine[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      
      // Add the last column
      if (currentColumn.trim() || columns.length > 0) {
        columns.push(currentColumn.trim());
      }
      
      // Clean up columns (remove surrounding quotes)
      const cleanedColumns = columns
        .map(col => col.replace(/^"|"$/g, '').trim())
        .filter(col => col.length > 0);
      
      return cleanedColumns;
    } catch (error) {
      console.error('Error parsing CSV columns:', error);
      return [];
    }
  };

  // Fetch dataset version content and parse columns
  const fetchDatasetColumns = async (datasetId: number, versionId: number) => {
    const key = `${datasetId}_${versionId}`;
    
    // Skip if already loaded or loading
    if (datasetColumns[key] || columnsLoading[key]) {
      return;
    }

    try {
      setColumnsLoading((prev) => ({ ...prev, [key]: true }));
      
      // Download dataset version file as CSV
      const exportResult = await downloadDatasetVersionFile(
        datasetId,
        versionId,
        "csv",
        "temp.csv"
      );

      if (!exportResult?.blob) {
        return;
      }

      // Read blob as text
      const text = await exportResult.blob.text();
      const columns = parseCSVColumns(text);
      
      if (columns.length > 0) {
        setDatasetColumns((prev) => ({ ...prev, [key]: columns }));
      }
    } catch (error) {
      console.error(`Failed to fetch columns for dataset ${datasetId} version ${versionId}:`, error);
    } finally {
      setColumnsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleDatasetDetails = (datasetId: number) => {
    const isExpanding = expandedDatasetId !== datasetId;
    setExpandedDatasetId((prev) => (prev === datasetId ? null : datasetId));
    
    // Fetch columns when expanding
    if (isExpanding) {
      const versions = datasetVersions[datasetId] || [];
      const selectedVersionId = selectedVersionMap[datasetId] ?? versions[0]?.version_id;
      if (selectedVersionId) {
        fetchDatasetColumns(datasetId, selectedVersionId);
      }
    }
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
                    
                    // Calculate columns for expanded view
                    const selectedVersionIdForColumns = selectedVersionId ?? versions[0]?.version_id;
                    const columnsKey = selectedVersionIdForColumns ? `${dataset.dataset_id}_${selectedVersionIdForColumns}` : null;
                    const columns = columnsKey ? datasetColumns[columnsKey] || [] : [];
                    const isLoadingColumns = columnsKey ? columnsLoading[columnsKey] : false;
                    
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
                                  onValueChange={(value) => {
                                    const newVersionId = Number(value);
                                    setSelectedVersionMap((prev) => ({
                                      ...prev,
                                      [dataset.dataset_id]: newVersionId,
                                    }));
                                    // Fetch columns for the newly selected version
                                    if (expandedDatasetId === dataset.dataset_id) {
                                      fetchDatasetColumns(dataset.dataset_id, newVersionId);
                                    }
                                  }}
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
                          <TableRow key={`expanded-${dataset.dataset_id}`} className="bg-muted/40">
                              <TableCell colSpan={7}>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        Columns
                                      </p>
                                      {isLoadingColumns ? (
                                        <p className="text-sm text-muted-foreground">Loading columns...</p>
                                      ) : columns.length > 0 ? (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full justify-start">
                                              <Columns className="h-4 w-4 mr-2" />
                                              {columns.length} column{columns.length !== 1 ? 's' : ''}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-4" align="start">
                                            <div className="space-y-3">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2 font-semibold text-sm">
                                                  <FileText className="w-4 h-4" />
                                                  Dataset Columns
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                  {selectedVersion ? `v${selectedVersion.version_number}` : 'Current version'}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{columns.length} column{columns.length !== 1 ? 's' : ''} found</span>
                                              </div>
                                              <ScrollArea className="max-h-[200px] w-full rounded-md border p-3">
                                                <div className="flex flex-wrap gap-2">
                                                  {columns.map((column, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                      {column}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </ScrollArea>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No columns available</p>
                                      )}
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
