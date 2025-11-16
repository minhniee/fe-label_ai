"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { getProjectFiles, generateDatasetFromProject } from "@/app/api/project";
import { getDatasets, getVersionCompleteInfo, getDatasetVersions, type Dataset } from "@/app/api/dataset";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function ProjectDatasetPage() {
  const params = useParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatasets, setSelectedDatasets] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

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
    } catch (error: any) {
      console.error("Failed to load datasets:", error);
      toast.error("Failed to load datasets");
    } finally {
      setIsLoading(false);
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

  const handleDatasetSelect = (datasetId: number, checked: boolean) => {
    setSelectedDatasets(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(datasetId);
      } else {
        newSet.delete(datasetId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedDatasets.map(d => d.dataset_id));
      setSelectedDatasets(allIds);
    } else {
      setSelectedDatasets(new Set());
    }
  };

  const handleExportClick = (dataset: Dataset) => {
    setSelectedDatasetId(dataset.dataset_id);
    setIsExportOpen(true);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
  };

  const exportToXLSX = async (data: any[], filename: string) => {
    try {
      // Dynamic import for xlsx library
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error("Failed to export to XLSX:", error);
      toast.error("XLSX export requires xlsx library. Please install it: npm install xlsx");
    }
  };

  const handleExport = async () => {
    if (!selectedDatasetId) {
      toast.error("Please select a dataset");
      return;
    }

    setIsExporting(true);
    try {
      // Get dataset versions first to find the latest version
      const { getDatasetVersions } = await import("@/app/api/dataset");
      const versions = await getDatasetVersions(selectedDatasetId);
      
      if (!versions || versions.length === 0) {
        toast.error("Dataset has no versions");
        return;
      }

      // Get the latest version (highest version_number)
      const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0];
      
      // Get dataset version data
      const datasetInfo = await getVersionCompleteInfo(selectedDatasetId, latestVersion.version_id);
      
      if (!datasetInfo.success || !datasetInfo.data || datasetInfo.data.length === 0) {
        toast.error("Dataset is empty or not found");
        return;
      }

      const data = Array.isArray(datasetInfo.data) ? datasetInfo.data : [];
      const dataset = datasets.find(d => d.dataset_id === selectedDatasetId);
      const filename = dataset?.name || `dataset_${selectedDatasetId}`;

      switch (exportFormat) {
        case 'csv':
          exportToCSV(data, filename);
          break;
        case 'json':
          exportToJSON(data, filename);
          break;
        case 'xlsx':
          await exportToXLSX(data, filename);
          break;
      }

      toast.success(`Dataset exported as ${exportFormat.toUpperCase()} successfully!`);
      setIsExportOpen(false);
      setSelectedDatasetId(null);
    } catch (error: any) {
      console.error("Failed to export dataset:", error);
      toast.error(error.message || "Failed to export dataset");
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);
  const allSelected = paginatedDatasets.length > 0 && paginatedDatasets.every(d => selectedDatasets.has(d.dataset_id));

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
            {/* <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              How to Search
            </Button> */}
          </div>
          {/* <Button
            variant="outline"
            onClick={() => {
              toast.info("Please select a dataset and click Export button");
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Dataset
          </Button> */}
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
                  }}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                <Button onClick={handleExport} disabled={isExporting || !selectedDatasetId}>
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
                className={`group cursor-pointer hover:border-primary transition-colors ${
                  viewMode === "list" ? "p-4" : ""
                }`}
              >
                {viewMode === "grid" ? (
                  <div className="p-4">
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
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-xs text-muted-foreground">
                        <p>Created: {new Date(dataset.created_at).toLocaleDateString()}</p>
                        <p>By: {dataset.created_by_username}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportClick(dataset);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{dataset.name}</h3>
                      {dataset.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {dataset.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(dataset.created_at).toLocaleDateString()} • By: {dataset.created_by_username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportClick(dataset);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

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
