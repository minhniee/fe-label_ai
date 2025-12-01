"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileUp,
  FolderOpen,
  File as FileIcon,
  X,
  Upload,
  FileText,
  ExternalLink,
  Columns,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { uploadFilesToProject, getProjectFiles } from "@/app/api/project";
import { createProjectBatch, splitProjectFile } from "@/app/api/batch";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { projectToSlug } from "@/types/project";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define supported file formats
const PDF_EXTENSIONS = [".pdf"];
const DATA_EXTENSIONS = [".csv", ".xlsx", ".xlsv", ".json"];
const ALL_SUPPORTED_EXTENSIONS = [...PDF_EXTENSIONS, ...DATA_EXTENSIONS];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

type Tab = "all" | "annotated" | "not-annotated";

export function UploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { project } = useProjectFromSlug();
  const { canCreate } = useUserPermissions();
  const [batchName, setBatchName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const isDataFile = (file: File) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    return DATA_EXTENSIONS.includes(extension);
  };

  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileColumns, setFileColumns] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Set default batch name on mount
  useEffect(() => {
    const now = new Date();
    const formattedDate = `Uploaded on ${now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    })} at ${now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
    setBatchName(formattedDate);
  }, []);

  // Load project files to check annotation status
  useEffect(() => {
    if (project) {
      loadProjectFiles();
    }
  }, [project]);

  const loadProjectFiles = async () => {
    if (!project) return;

    try {
      setIsLoadingFiles(true);
      const files = await getProjectFiles(parseInt(project.id));
      setProjectFiles(files);
    } catch (error: any) {
      console.error("Failed to load project files:", error);
      // Don't show error toast, just log it
    } finally {
      setIsLoadingFiles(false);
    }
  };


  const validateFiles = (files: File[]): File[] => {
    const valid: File[] = [];
    let rejectedCount = 0;

    for (const file of files) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const isSupported = ALL_SUPPORTED_EXTENSIONS.includes(extension);
      const isTooLarge = file.size > MAX_FILE_SIZE_BYTES;

      if (!isSupported || isTooLarge) {
        rejectedCount++;
        continue;
      }
      valid.push(file);
    }

    if (rejectedCount > 0) {
      toast({
        title: "Some files were skipped",
        description: `Only CSV/Excel/JSON/PDF files under 20MB are allowed. Skipped ${rejectedCount} file(s).`,
        variant: "destructive",
      });
    }

    return valid;
  };

  // Parse CSV file to extract column names
  const parseCSVColumns = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || text.trim().length === 0) {
            resolve([]);
            return;
          }
          
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          if (lines.length === 0) {
            resolve([]);
            return;
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
          
          resolve(cleanedColumns);
        } catch (error) {
          console.error('Error parsing CSV:', error);
          resolve([]);
        }
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        resolve([]);
      };
      reader.readAsText(file);
    });
  };

  const addFiles = async (newFiles: File[]) => {
    const validFiles = validateFiles(newFiles);
    const uniqueNewFiles = validFiles.filter(
      (file) =>
        !selectedFiles.some(
          (existingFile) =>
            existingFile.name === file.name && existingFile.size === file.size
        )
    );
    
    // Parse CSV columns for CSV files
    const columnsMap: Record<string, string[]> = {};
    for (const file of uniqueNewFiles) {
      if (isDataFile(file) && file.name.toLowerCase().endsWith('.csv')) {
        try {
          const columns = await parseCSVColumns(file);
          columnsMap[file.name] = columns;
        } catch (error) {
          console.error(`Failed to parse columns for ${file.name}:`, error);
        }
      }
    }
    
    setFileColumns((prev) => ({ ...prev, ...columnsMap }));
    setSelectedFiles((prev) => [...prev, ...uniqueNewFiles]);
  };

  const fetchCsvRowCountsFromApi = async (uploadedFiles: any[]) => {
    if (!project) return {};
    const counts: Record<number, number> = {};

    for (const file of uploadedFiles || []) {
      const name: string | undefined = file?.file_name || file?.filename;
      if (name && name.toLowerCase().endsWith(".csv")) {
        try {
          const splitResponse = await splitProjectFile({
            project_id: parseInt(project.id),
            file_id: file.file_id,
            auto_create_batches: false,
          });
          counts[file.file_id] = splitResponse.total_rows;
        } catch (error) {
          console.error(`Failed to fetch row count for ${name}:`, error);
        }
      }
    }

    return counts;
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await addFiles(Array.from(e.target.files || []));
    if (e.target) e.target.value = "";
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFileColumns((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const getFilteredFiles = () => {
    if (activeTab === "all") return selectedFiles;

    // For annotated/not-annotated tabs, only show supported data files
    const dataFiles = selectedFiles.filter(isDataFile);

    if (activeTab === "annotated") {
      // Show files that are annotated (completed or verified)
      return dataFiles.filter((file) => {
        if (!file || !file.name) return false;
        const fileName = file.name.toLowerCase();
        const projectFile = projectFiles.find(
          (pf) =>
            pf &&
            pf.filename &&
            typeof pf.filename === "string" &&
            pf.filename.toLowerCase() === fileName
        );
        return (
          projectFile &&
          (projectFile.annotation_status === "completed" ||
            projectFile.annotation_status === "verified")
        );
      });
    }

    if (activeTab === "not-annotated") {
      // Show files that are NOT annotated (unannotated, annotating, or new files not in project)
      return dataFiles.filter((file) => {
        if (!file || !file.name) return false;
        const fileName = file.name.toLowerCase();
        const projectFile = projectFiles.find(
          (pf) =>
            pf &&
            pf.filename &&
            typeof pf.filename === "string" &&
            pf.filename.toLowerCase() === fileName
        );

        // If file doesn't exist in project, it's not annotated (new file)
        if (!projectFile) return true;

        // If file exists but status is unannotated or annotating, it's not annotated
        return (
          projectFile.annotation_status === "unannotated" ||
          projectFile.annotation_status === "annotating"
        );
      });
    }

    return selectedFiles;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!project) {
      toast({
        title: "No project selected",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const toastId = sonnerToast.loading(
      `Uploading ${selectedFiles.length} files...`
    );

    try {
      // Step 1: Upload files to project
      const uploadResponse = await uploadFilesToProject(
        parseInt(project.id),
        selectedFiles
      );

      console.log("Upload response:", uploadResponse);

      // Step 2: Extract file_ids from the files array
      const fileIds = uploadResponse?.files?.map((file) => file.file_id) || [];

      console.log("Upload response:", uploadResponse);
      console.log("Extracted file IDs:", fileIds);

      // Step 3: Prepare batch metadata with file_ids and CSV row counts from API
      const csvRowCountsFromApi = await fetchCsvRowCountsFromApi(
        uploadResponse?.files || []
      );
      const batchMetadata: any = {
        file_ids: fileIds,
      };

      if (Object.keys(csvRowCountsFromApi).length > 0) {
        batchMetadata.csv_row_counts = csvRowCountsFromApi;
        const totalRows = Object.values(csvRowCountsFromApi).reduce(
          (sum, count) => sum + count,
          0
        );
        batchMetadata.total_csv_rows = totalRows;
      }

      // Step 5: Create a batch with ONLY the newly uploaded files
      if (uploadResponse?.success && fileIds.length > 0) {
        sonnerToast.success("Files uploaded successfully!", { id: toastId });

        const batchResponse = await createProjectBatch({
          project_id: parseInt(project.id),
          name: batchName,
          description: `Batch created with ${fileIds.length} files`,
          file_ids: fileIds, // Use file_ids extracted from files array
          batch_metadata: batchMetadata,
        });

        console.log("Batch created response:", batchResponse);
        console.log("Redirecting with file IDs:", fileIds);

        sonnerToast.success("Batch created successfully!");

        // Step 5: Redirect to batch page with file_ids in URL
        const projectSlug = projectToSlug(project);
        const fileIdsParam = encodeURIComponent(JSON.stringify(fileIds));
        console.log("URL parameter fileIds:", fileIdsParam);
        router.push(
          `/${projectSlug}/annotate/batch?batchId=${batchResponse.batch_id}&fileIds=${fileIdsParam}`
        );
      } else {
        console.error("No files in response:", uploadResponse);
        sonnerToast.error("No files were uploaded successfully.", {
          id: toastId,
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      sonnerToast.error(
        error.message || "Failed to upload files. Please try again.",
        { id: toastId }
      );
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFiles = getFilteredFiles();

  // Calculate counts based on actual project files annotation status (data files only)
  const annotationEligibleFiles = selectedFiles.filter(isDataFile);
  const annotatedCount = annotationEligibleFiles.filter((file) => {
    if (!file || !file.name) return false;
    const fileName = file.name.toLowerCase();
    const projectFile = projectFiles.find(
      (pf) =>
        pf &&
        pf.filename &&
        typeof pf.filename === "string" &&
        pf.filename.toLowerCase() === fileName
    );
    return (
      projectFile &&
      (projectFile.annotation_status === "completed" ||
        projectFile.annotation_status === "verified")
    );
  }).length;

  const notAnnotatedCount = annotationEligibleFiles.length - annotatedCount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header Inputs */}
      <div>
        <label htmlFor="batch-name" className="text-sm font-medium">
          Batch Name:
        </label>
        <Input
          id="batch-name"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="Enter batch name"
        />
      </div>

      {/* Tabs - only show when files are selected */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-6 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-2 font-medium text-sm relative ${
              activeTab === "all"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Files{" "}
            <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {selectedFiles.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("annotated")}
            className={`pb-2 font-medium text-sm relative ${
              activeTab === "annotated"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annotated{" "}
            <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {annotatedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("not-annotated")}
            className={`pb-2 font-medium text-sm relative ${
              activeTab === "not-annotated"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Not Annotated{" "}
            <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {notAnnotatedCount}
            </span>
          </button>
        </div>
      )}

      {/* Main Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFiles.length === 0 ? (
          // EMPTY STATE VIEW
          <div
            className={`text-center space-y-4 border-2 border-dashed rounded-lg p-12 transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">
              Drag and drop file(s) to upload, or:
            </h2>
            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                disabled={!canCreate}
              >
                <FileUp className="w-4 h-4" />
                Select File(s)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                className="gap-2"
                disabled={!canCreate}
              >
                <FolderOpen className="w-4 h-4" />
                Select Folder
              </Button>
            </div>
            {!canCreate && (
              <p className="text-sm text-muted-foreground">
                Viewer role cannot upload files
              </p>
            )}
            <div className="pt-6 flex justify-center">
              <div className="w-full max-w-md">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                  Supported Formats
                </h3>

                <Card className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <div className="space-y-1 text-left">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Files
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {DATA_EXTENSIONS.join(", ")}
                      </p>
                    </div>

                    <div className="space-y-1 text-left md:text-right">
                      <h4 className="font-medium flex items-center gap-2 md:justify-end">
                        <FileIcon className="w-4 h-4" /> PDFs
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {PDF_EXTENSIONS.join(", ")}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4 text-left">
                    *Max size of 20MB
                  </p>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          // POPULATED STATE VIEW
          <Card
            className={`transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold">
                    Drag and drop files to upload.
                  </h3>
                  <div className="text-sm text-muted-foreground mt-1 space-x-2 flex items-center">
                    <span>{ALL_SUPPORTED_EXTENSIONS.join(", ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    *Max size of 20MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                    disabled={isUploading || !canCreate}
                  >
                    <FileUp className="w-4 h-4" />
                    Select Files
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => folderInputRef.current?.click()}
                    className="gap-2"
                    disabled={isUploading || !canCreate}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Select Folder
                  </Button>
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={isUploading || !canCreate}
                  >
                    {isUploading ? "Uploading..." : "Save and Continue"}
                  </Button>
                </div>
              </div>

              {filteredFiles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-6">
                  {filteredFiles.map((file) => {
                    const columns = fileColumns[file.name] || [];
                    const hasColumns = columns.length > 0;
                    
                    return (
                      <div
                        key={file.name}
                        className="relative group rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center text-center"
                      >
                        {canCreate && (
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="absolute top-1 right-1 z-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {hasColumns && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="absolute top-1 left-1 z-10 p-1.5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90"
                                title="View columns"
                              >
                                <Columns className="w-3 h-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start" side="right">
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 font-semibold text-sm">
                                    <FileText className="w-4 h-4" />
                                    File Columns
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]" title={file.name}>
                                    {file.name}
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
                        )}
                        <div className="flex flex-col items-center gap-2 p-2">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground break-all">
                            {file.name}
                          </p>
                          {hasColumns && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Columns className="w-3 h-3" />
                              <span>{columns.length} cols</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No files match the current filter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED_EXTENSIONS.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        {...{ webkitdirectory: "true" }}
      />

      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete
            <span className="font-medium text-foreground block break-all mt-1">
              {fileToDelete?.name} ?
            </span>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fileToDelete) {
                  removeFile(fileToDelete.name);
                }
                setFileToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
