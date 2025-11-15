"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function ProjectDatasetPage() {
  const params = useParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;

  const [annotatedFiles, setAnnotatedFiles] = useState<any[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filenameFilter, setFilenameFilter] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(50);
  
  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportName, setExportName] = useState("");
  const [exportDescription, setExportDescription] = useState("");
  const [exportType, setExportType] = useState<"full" | "partial" | "verified_only">("full");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (project) {
      loadAnnotatedFiles();
    }
  }, [project]);

  useEffect(() => {
    filterAndSortFiles();
  }, [annotatedFiles, searchQuery, filenameFilter, sortBy]);

  const loadAnnotatedFiles = async () => {
    try {
      setIsLoading(true);
      const files = await getProjectFiles(parseInt(project!.id));
      
      // Filter only annotated files (completed or verified)
      const annotated = files.filter(
        f => f.annotation_status === 'completed' || f.annotation_status === 'verified'
      );
      
      setAnnotatedFiles(annotated);
    } catch (error: any) {
      console.error("Failed to load annotated files:", error);
      toast.error("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortFiles = () => {
    let filtered = [...annotatedFiles];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.filename.toLowerCase().includes(query)
      );
    }

    // Filename filter
    if (filenameFilter.trim()) {
      const filter = filenameFilter.toLowerCase();
      filtered = filtered.filter(f =>
        f.filename.toLowerCase().includes(filter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case "oldest":
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case "name":
          return a.filename.localeCompare(b.filename);
        default:
          return 0;
      }
    });

    setFilteredFiles(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleFileSelect = (fileId: number, checked: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedFiles.map(f => f.file_id));
      setSelectedFiles(allIds);
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleExport = async () => {
    if (!exportName.trim()) {
      toast.error("Please enter a dataset name");
      return;
    }

    if (!project) {
      toast.error("Project not found");
      return;
    }

    setIsExporting(true);
    try {
      const response = await generateDatasetFromProject(parseInt(project.id), {
        dataset_name: exportName,
        dataset_description: exportDescription || undefined,
        export_type: exportType,
        copy_permissions: true,
      });

      toast.success(`Dataset "${exportName}" created successfully! ${response.files_exported} files exported.`);
      setIsExportOpen(false);
      setExportName("");
      setExportDescription("");
      setExportType("full");
    } catch (error: any) {
      console.error("Failed to export dataset:", error);
      toast.error(error.message || "Failed to export dataset");
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredFiles.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);
  const allSelected = paginatedFiles.length > 0 && paginatedFiles.every(f => selectedFiles.has(f.file_id));

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
          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export file
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Export Dataset</DialogTitle>
                <DialogDescription>
                  Generate a dataset from completed project annotations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-name">Dataset Name *</Label>
                  <Input
                    id="export-name"
                    placeholder="e.g., My Dataset v1"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-description">Description</Label>
                  <Input
                    id="export-description"
                    placeholder="Optional description"
                    value={exportDescription}
                    onChange={(e) => setExportDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-type">Export Type</Label>
                  <Select
                    value={exportType}
                    onValueChange={(value: any) => setExportType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full - All annotated files</SelectItem>
                      <SelectItem value="partial">Partial - Only completed files</SelectItem>
                      <SelectItem value="verified_only">Verified Only - Only verified files</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Total annotated files: {annotatedFiles.length}</p>
                  <p className="mt-1">
                    {exportType === "full" && "Will export all annotated files"}
                    {exportType === "partial" && "Will export only completed files"}
                    {exportType === "verified_only" && "Will export only verified files"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsExportOpen(false)}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                <Button onClick={handleExport} disabled={isExporting || !exportName.trim()}>
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
              placeholder="Search images"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="filename-filter" className="text-sm whitespace-nowrap">
              Filter by filename
            </Label>
            <Input
              id="filename-filter"
              placeholder="Enter filename"
              value={filenameFilter}
              onChange={(e) => setFilenameFilter(e.target.value)}
              className="w-48"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Split" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="train">Train</SelectItem>
              <SelectItem value="val">Validation</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
            </SelectContent>
          </Select>
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
          {/* <Button variant="outline" size="sm">
            <Camera className="h-4 w-4 mr-2" />
            Search by Image
          </Button> */}
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
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4" />
            <p>No annotated files found</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "space-y-2"
            }
          >
            {paginatedFiles.map((file) => (
              <div
                key={file.file_id}
                className={`group cursor-pointer ${
                  viewMode === "grid" ? "" : "flex items-center gap-4 p-2 border rounded-lg hover:bg-muted"
                }`}
              >
                {viewMode === "grid" ? (
                  <>
                    <div className="relative aspect-square rounded-lg border bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                      <Checkbox
                        checked={selectedFiles.has(file.file_id)}
                        onCheckedChange={(checked) =>
                          handleFileSelect(file.file_id, checked as boolean)
                        }
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {file.file_type?.startsWith("image/") ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/files/${file.file_path}`}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                      {showAnnotations && (
                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 right-2 text-xs"
                        >
                          {file.annotation_status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs truncate mt-2" title={file.filename}>
                      {file.filename}
                    </p>
                  </>
                ) : (
                  <>
                    <Checkbox
                      checked={selectedFiles.has(file.file_id)}
                      onCheckedChange={(checked) =>
                        handleFileSelect(file.file_id, checked as boolean)
                      }
                    />
                    <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                      {file.file_type?.startsWith("image/") ? (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.annotation_status} • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    {showAnnotations && (
                      <Badge variant="secondary">{file.annotation_status}</Badge>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="images-per-page" className="text-sm">
              Images per page:
            </Label>
            <Select
              value={imagesPerPage.toString()}
              onValueChange={(value) => {
                setImagesPerPage(parseInt(value));
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
              {startIndex + 1} - {Math.min(endIndex, filteredFiles.length)} of {filteredFiles.length}
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
