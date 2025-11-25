"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  Image as ImageIcon,
  Search,
  Download,
  Grid3x3,
  List,
  Eye,
  EyeOff,
  HelpCircle,
  Filter,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
} from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { getDatasets, getDatasetVersions, exportDatasetVersion, downloadDatasetVersionFile, uploadFileToDataset, type Dataset, type DatasetVersion } from "@/app/api/dataset";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { uploadFilesToProject } from "@/app/api/project";
import { createProjectBatch } from "@/app/api/batch";

export default function ProjectDatasetPage() {
  const params = useParams();
  const router = useRouter();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [datasetVersions, setDatasetVersions] = useState<Record<number, DatasetVersion[]>>({});
  const [versionsLoading, setVersionsLoading] = useState<Record<number, boolean>>({});
  const [uploadingDatasetId, setUploadingDatasetId] = useState<number | null>(null);
  const fileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});
  const [labelingContext, setLabelingContext] = useState<{ dataset: Dataset; version: DatasetVersion } | null>(null);
  const [batchNameInput, setBatchNameInput] = useState("");
  const [batchDescriptionInput, setBatchDescriptionInput] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);

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
        versionsMap[dataset.dataset_id] = await fetchDatasetVersions(dataset.dataset_id);
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
      setVersionsLoading(prev => ({ ...prev, [datasetId]: true }));
      const versions = await getDatasetVersions(datasetId);
      setDatasetVersions(prev => ({ ...prev, [datasetId]: versions }));
      return versions;
    } catch (error: any) {
      console.error(`Failed to load versions for dataset ${datasetId}:`, error);
      toast.error(`Failed to load versions for dataset ${datasetId}`);
      return [];
    } finally {
      setVersionsLoading(prev => ({ ...prev, [datasetId]: false }));
    }
  };

  const filterAndSortDatasets = () => {
    let filtered = [...datasets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

  const handleFileChange = async (datasetId: number, event: ChangeEvent<HTMLInputElement>) => {
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

  const renderVersionList = (dataset: Dataset) => {
    const versions = datasetVersions[dataset.dataset_id] || [];
    const isLoadingVersions = versionsLoading[dataset.dataset_id];
    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold">Versions</p>
            <p className="text-xs text-muted-foreground">Latest uploads appear first</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fetchDatasetVersions(dataset.dataset_id);
              }}
              disabled={isLoadingVersions}
            >
              {isLoadingVersions ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput(dataset.dataset_id);
              }}
              disabled={uploadingDatasetId === dataset.dataset_id}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadingDatasetId === dataset.dataset_id ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
        </div>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={(el) => {
            fileInputsRef.current[dataset.dataset_id] = el;
          }}
          onChange={(event) => handleFileChange(dataset.dataset_id, event)}
        />
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {isLoadingVersions ? (
            <p className="text-xs text-muted-foreground">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No versions yet. Upload a CSV to create one.</p>
          ) : (
            versions
              .sort((a, b) => b.version_number - a.version_number)
              .map((version) => (
                <div
                  key={version.version_id}
                  className="flex items-center justify-between rounded-md border p-2 bg-muted/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">v{version.version_number}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    {version.changelog && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{version.changelog}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportClick(dataset.dataset_id, version.version_id);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLabelingDialog(dataset, version);
                    }}
                    disabled={creatingBatch && labelingContext?.version.version_id === version.version_id}
                  >
                    {creatingBatch && labelingContext?.version.version_id === version.version_id ? "Preparing..." : "Create Batch"}
                  </Button>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };

  const handleExport = async () => {
    if (!selectedDatasetId || !selectedVersionId) {
      toast.error("Please select a dataset version");
      return;
    }

    setIsExporting(true);
    try {
      const dataset = datasets.find(d => d.dataset_id === selectedDatasetId);
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

      toast.success(`Dataset export ready! Downloading ${exportFormat.toUpperCase()} file from storage.`);
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
    const batchName = batchNameInput.trim() || `${dataset.name} - v${version.version_number}`;
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
        exportResult.fileName || `${dataset.name}-v${version.version_number}.csv`,
        { type: exportResult.contentType || exportResult.blob.type || "text/csv" }
      );

      // Step 2: upload to current project
      const uploadResponse = await uploadFilesToProject(parseInt(project.id), [file], "text");
      const fileIds = uploadResponse?.files?.map((fileInfo) => fileInfo.file_id) || [];
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

      toast.success("Batch created from dataset version. Check the Unassigned section to continue labeling.");
      closeLabelingDialog();
    } catch (error: any) {
      console.error("Failed to prepare batch from dataset version:", error);
      toast.error(error.message || "Failed to prepare batch from this version");
    } finally {
      setCreatingBatch(false);
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
      <div className="border-b bg-background p-6">
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
                      {datasets.find(d => d.dataset_id === selectedDatasetId)?.name || 'Unknown'}
                    </p>
                  </div>
                )}
                {selectedVersionId && (
                  <div className="space-y-2">
                    <Label>Selected Version</Label>
                    <p className="text-sm font-medium">
                      {datasetVersions[selectedDatasetId || 0]?.find(v => v.version_id === selectedVersionId)?.version_number
                        ? `v${datasetVersions[selectedDatasetId || 0]?.find(v => v.version_id === selectedVersionId)?.version_number}`
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
                  <p>The dataset will be exported in {exportFormat.toUpperCase()} format.</p>
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
                <Button onClick={handleExport} disabled={isExporting || !selectedDatasetId || !selectedVersionId}>
                  {isExporting ? "Exporting..." : "Export Dataset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Sort By Newest</SelectItem>
              <SelectItem value="oldest">Sort By Oldest</SelectItem>
              <SelectItem value="name">Sort By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selection and View Options */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">

          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* <Switch
                id="show-annotations"
                checked={showAnnotations}
                onCheckedChange={setShowAnnotations}
              />
              <Label htmlFor="show-annotations" className="text-sm cursor-pointer">
                Show annotations
              </Label> */}
            </div>
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
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
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-2"
            }
          >
            {paginatedDatasets.map((dataset) => (
              <Card
                key={dataset.dataset_id}
                className={`group hover:border-primary transition-colors ${
                  viewMode === "list" ? "p-4" : "p-4"
                }`}
              >
                <div className={viewMode === "list" ? "flex gap-4" : ""}>
                  {viewMode === "list" && (
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" title={dataset.name}>
                          {dataset.name}
                        </h3>
                        {dataset.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {dataset.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <p>Created: {new Date(dataset.created_at).toLocaleDateString()}</p>
                      <p>By: {dataset.created_by_username}</p>
                    </div>
                    {renderVersionList(dataset)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Labeling Dialog */}
      <Dialog open={!!labelingContext} onOpenChange={(open) => (open ? null : closeLabelingDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Labeling from Dataset Version</DialogTitle>
            <DialogDescription>
              We&apos;ll export this version, upload it to the project, create a new batch, and redirect you to the labeling flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Dataset</Label>
              <p className="text-sm font-medium">
                {labelingContext?.dataset.name} (v{labelingContext?.version.version_number})
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
              This will create a new batch in this project so you can choose Label Myself, Label with Team, or Auto-Label with AI.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeLabelingDialog} disabled={creatingBatch}>
              Cancel
            </Button>
            <Button onClick={handleCreateBatchFromVersion} disabled={creatingBatch}>
              {creatingBatch ? "Preparing..." : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination Footer */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page" className="text-sm">
              Items per page:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1} - {Math.min(endIndex, filteredDatasets.length)} of {filteredDatasets.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
