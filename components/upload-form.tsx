"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { FileUp, FolderOpen, File as FileIcon, X, Upload, Image as ImageIcon, FileText, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"
import { uploadFilesToProject, getProjectFiles } from "@/app/api/project"
import { createProjectBatch, distributeFileToUsers } from "@/app/api/batch"
import { getMe } from "@/app/api/auth"
import { useProjectFromSlug } from "@/hooks/use-project-from-slug"
import { projectToSlug } from "@/types/project"
import { useUserPermissions } from "@/hooks/use-user-permissions"

// Define supported file formats
const IMAGE_EXTENSIONS = [".jpg", ".png", ".bmp", ".webp", ".avif"];
const PDF_EXTENSIONS = [".pdf"];
const DATA_EXTENSIONS = [".xlsx", ".json", ".csv"];
const ALL_SUPPORTED_EXTENSIONS = [...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS, ...DATA_EXTENSIONS];

type Tab = "all" | "annotated" | "not-annotated"

export function UploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { project } = useProjectFromSlug();
  const { canCreate } = useUserPermissions();
  const [batchName, setBatchName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [filePreviewUrls, setFilePreviewUrls] = useState<{ [key: string]: string }>({});
  const [annotatedFiles, setAnnotatedFiles] = useState<Set<string>>(new Set());
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [csvRowCounts, setCsvRowCounts] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Set default batch name on mount
  useEffect(() => {
    const now = new Date();
    const formattedDate = `Uploaded on ${now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    setBatchName(formattedDate);
  }, []);

  // Load project files to check annotation status
  useEffect(() => {
    if (project) {
      loadProjectFiles();
    }
  }, [project]);

  // Update annotated files when project files or selected files change
  useEffect(() => {
    if (projectFiles.length > 0 && selectedFiles.length > 0) {
      updateAnnotatedFiles();
    } else {
      // If no project files or selected files, reset annotated files
      setAnnotatedFiles(new Set());
    }
  }, [projectFiles, selectedFiles]);

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

  const updateAnnotatedFiles = () => {
    // Create a map of filename -> annotation_status from project files
    const fileStatusMap = new Map<string, string>();
    projectFiles.forEach(file => {
      // Check if filename exists and is valid
      if (file && file.filename && typeof file.filename === 'string') {
        fileStatusMap.set(file.filename.toLowerCase(), file.annotation_status || 'unannotated');
      }
    });

    // Check which selected files are annotated
    const annotatedSet = new Set<string>();
    selectedFiles.forEach(file => {
      if (file && file.name) {
        const fileName = file.name.toLowerCase();
        const status = fileStatusMap.get(fileName);
        
        // File is annotated if it exists in project and has status 'completed' or 'verified'
        if (status === 'completed' || status === 'verified') {
          annotatedSet.add(file.name); // Use original file.name for Set key
        }
      }
    });

    setAnnotatedFiles(annotatedSet);
  };

  // Generate or revoke preview URLs for images
  useEffect(() => {
    const newUrls: { [key: string]: string } = {};
    selectedFiles.forEach((file) => {
      if (IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        const url = URL.createObjectURL(file);
        newUrls[file.name] = url;
      }
    });
    setFilePreviewUrls(newUrls);

    return () => {
      Object.values(newUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const validateFiles = (files: File[]): File[] => {
    return files.filter((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return ALL_SUPPORTED_EXTENSIONS.includes(extension);
    });
  };

  // Function to read CSV file and count rows
  const readCsvRowCount = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            resolve(0);
            return;
          }
          
          // Split by newlines and filter out empty lines
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          
          if (lines.length === 0) {
            resolve(0);
            return;
          }
          
          // Check if first line looks like a header (contains common CSV header keywords)
          const firstLine = lines[0].toLowerCase();
          const headerKeywords = ['id', 'name', 'text', 'label', 'content', 'data', 'value', 'title', 'description'];
          const hasHeader = headerKeywords.some(keyword => firstLine.includes(keyword));
          
          // Count data rows (exclude header if detected)
          const rowCount = hasHeader ? lines.length - 1 : lines.length;
          
          resolve(rowCount);
        } catch (error) {
          console.error("Error reading CSV file:", error);
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsText(file, 'UTF-8');
    });
  };

  const addFiles = async (newFiles: File[]) => {
    const validFiles = validateFiles(newFiles);
    const uniqueNewFiles = validFiles.filter(
      (file) => !selectedFiles.some((existingFile) => existingFile.name === file.name && existingFile.size === file.size)
    );
    
    // Read CSV files to count rows
    const newRowCounts: { [key: string]: number } = {};
    for (const file of uniqueNewFiles) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        try {
          const rowCount = await readCsvRowCount(file);
          newRowCounts[file.name] = rowCount;
        } catch (error) {
          console.error(`Failed to read CSV file ${file.name}:`, error);
          // Continue even if reading fails
        }
      }
    }
    
    setCsvRowCounts((prev) => ({ ...prev, ...newRowCounts }));
    setSelectedFiles((prev) => [...prev, ...uniqueNewFiles]);
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
    if (e.target) e.target.value = '';
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
    setCsvRowCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[fileName];
      return newCounts;
    });
  };

  const getFilteredFiles = () => {
    if (activeTab === "all") return selectedFiles;
    
    // For annotated/not-annotated tabs, only show image files
    const imageFiles = selectedFiles.filter(file => 
      IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    if (activeTab === "annotated") {
      // Show files that are annotated (completed or verified)
      return imageFiles.filter((file) => {
        if (!file || !file.name) return false;
        const fileName = file.name.toLowerCase();
        const projectFile = projectFiles.find(pf => 
          pf && pf.filename && typeof pf.filename === 'string' && 
          pf.filename.toLowerCase() === fileName
        );
        return projectFile && (projectFile.annotation_status === 'completed' || projectFile.annotation_status === 'verified');
      });
    }
    
    if (activeTab === "not-annotated") {
      // Show files that are NOT annotated (unannotated, annotating, or new files not in project)
      return imageFiles.filter((file) => {
        if (!file || !file.name) return false;
        const fileName = file.name.toLowerCase();
        const projectFile = projectFiles.find(pf => 
          pf && pf.filename && typeof pf.filename === 'string' && 
          pf.filename.toLowerCase() === fileName
        );
        
        // If file doesn't exist in project, it's not annotated (new file)
        if (!projectFile) return true;
        
        // If file exists but status is unannotated or annotating, it's not annotated
        return projectFile.annotation_status === 'unannotated' || projectFile.annotation_status === 'annotating';
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
        variant: "destructive" 
      });
      return;
    }

    if (!project) {
      toast({ 
        title: "No project selected", 
        description: "Please select a project first.", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    const toastId = sonnerToast.loading(`Uploading ${selectedFiles.length} files...`);

    try {
      // Step 1: Upload files to project
      const uploadResponse = await uploadFilesToProject(
        parseInt(project.id),
        selectedFiles
      );

      console.log("Upload response:", uploadResponse);

      // Step 2: Extract file_ids from the files array
      const fileIds = uploadResponse?.files?.map(file => file.file_id) || [];
      
      console.log("Upload response:", uploadResponse);
      console.log("Extracted file IDs:", fileIds);
      
      // Step 3: Distribute Unannotated data files (CSV/Excel/JSON) to split into chunks
      // Only process Unannotated files (not Annotated files)
      // Reload project files to get annotation_status
      let projectFilesAfterUpload: any[] = [];
      try {
        projectFilesAfterUpload = await getProjectFiles(parseInt(project.id));
      } catch (error) {
        console.error("Failed to reload project files:", error);
      }

      // Filter: Only data files (CSV/Excel/JSON) that are Unannotated
      const unannotatedDataFiles = uploadResponse?.files?.filter(file => {
        // Check if file and filename exist
        if (!file || !file.filename || typeof file.filename !== 'string') {
          return false;
        }
        
        const fileName = file.filename.toLowerCase();
        const isDataFile = DATA_EXTENSIONS.some(ext => fileName.endsWith(ext));
        
        if (!isDataFile) return false;
        
        // Check annotation_status from project files
        const projectFile = projectFilesAfterUpload.find(pf => 
          pf && pf.file_id && file.file_id && pf.file_id === file.file_id
        );
        // Newly uploaded files are always unannotated, but check to be safe
        const isUnannotated = !projectFile || 
          projectFile.annotation_status === 'unannotated' || 
          projectFile.annotation_status === 'annotating';
        
        return isUnannotated;
      }) || [];

      if (unannotatedDataFiles.length > 0) {
        try {
          // Get current user ID for distribution
          const currentUser = await getMe();
          const currentUserId = currentUser.user_id;

          // Distribute each unannotated data file
          for (const file of unannotatedDataFiles) {
            try {
              await distributeFileToUsers({
                project_id: parseInt(project.id),
                file_id: file.file_id,
                user_ids: [currentUserId], // Assign to Owner for "Label myself" case
                // chunk_size is optional - API will auto-calculate if not provided
                distribution_method: 'round_robin'
              });
              console.log(`File ${file.filename} distributed successfully`);
            } catch (distributeError: any) {
              console.error(`Failed to distribute file ${file.filename}:`, distributeError);
              // Don't throw - continue with other files
              // The file is still uploaded, just not distributed
            }
          }
        } catch (userError: any) {
          console.error("Failed to get current user for distribution:", userError);
          // Continue with batch creation even if distribution fails
        }
      }
      
      // Step 4: Prepare batch metadata with file_ids and CSV row counts
      const batchMetadata: any = {
        file_ids: fileIds
      };
      
      // Add CSV row counts to metadata
      const csvRowCountsMetadata: { [fileId: number]: number } = {};
      for (const file of uploadResponse.files || []) {
        if (file.filename && file.filename.toLowerCase().endsWith('.csv')) {
          const fileName = file.filename;
          if (csvRowCounts[fileName]) {
            csvRowCountsMetadata[file.file_id] = csvRowCounts[fileName];
          }
        }
      }
      
      if (Object.keys(csvRowCountsMetadata).length > 0) {
        batchMetadata.csv_row_counts = csvRowCountsMetadata;
        const totalRows = Object.values(csvRowCountsMetadata).reduce((sum, count) => sum + count, 0);
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
          batch_metadata: batchMetadata
        });

        console.log("Batch created response:", batchResponse);
        console.log("Redirecting with file IDs:", fileIds);

        sonnerToast.success("Batch created successfully!");

        // Step 5: Redirect to batch page with file_ids in URL
        const projectSlug = projectToSlug(project);
        const fileIdsParam = encodeURIComponent(JSON.stringify(fileIds));
        console.log("URL parameter fileIds:", fileIdsParam);
        router.push(`/${projectSlug}/annotate/batch?batchId=${batchResponse.batch_id}&fileIds=${fileIdsParam}`);
      } else {
        console.error("No files in response:", uploadResponse);
        sonnerToast.error("No files were uploaded successfully.", { id: toastId });
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
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFiles = getFilteredFiles();
  const imageFiles = selectedFiles.filter(file => IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)));
  
  // Calculate counts based on actual project files annotation status
  const annotatedCount = imageFiles.filter(file => {
    if (!file || !file.name) return false;
    const fileName = file.name.toLowerCase();
    const projectFile = projectFiles.find(pf => 
      pf && pf.filename && typeof pf.filename === 'string' && 
      pf.filename.toLowerCase() === fileName
    );
    return projectFile && (projectFile.annotation_status === 'completed' || projectFile.annotation_status === 'verified');
  }).length;
  
  const notAnnotatedCount = imageFiles.length - annotatedCount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Top Header Inputs */}
      <div>
          <label htmlFor="batch-name" className="text-sm font-medium">Batch Name:</label>
          <Input id="batch-name" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Enter batch name" />
      </div>

      {/* Tabs - only show when files are selected */}
      {selectedFiles.length > 0 && (
          <div className="flex gap-6 border-b">
              <button type="button" onClick={() => setActiveTab("all")} className={`pb-2 font-medium text-sm relative ${activeTab === 'all' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>
                  All Files <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{selectedFiles.length}</span>
              </button>
              <button type="button" onClick={() => setActiveTab("annotated")} className={`pb-2 font-medium text-sm relative ${activeTab === 'annotated' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>
                  Annotated <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{annotatedCount}</span>
              </button>
              <button type="button" onClick={() => setActiveTab("not-annotated")} className={`pb-2 font-medium text-sm relative ${activeTab === 'not-annotated' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>
                  Not Annotated <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{notAnnotatedCount}</span>
              </button>
          </div>
      )}

      {/* Main Upload Area */}
      <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        {selectedFiles.length === 0 ? (
          // EMPTY STATE VIEW
          <div className={`text-center space-y-4 border-2 border-dashed rounded-lg p-12 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
            </div>
            <h2 className="text-xl font-semibold">Drag and drop file(s) to upload, or:</h2>
            <div className="flex gap-3 justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()} 
                className="gap-2"
                disabled={!canCreate}
              >
                <FileUp className="w-4 h-4" />Select File(s)
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => folderInputRef.current?.click()} 
                className="gap-2"
                disabled={!canCreate}
              >
                <FolderOpen className="w-4 h-4" />Select Folder
              </Button>
            </div>
            {!canCreate && (
              <p className="text-sm text-muted-foreground">Viewer role cannot upload files</p>
            )}
            <div className="pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Supported Formats</h3>
                <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <div className="space-y-1">
                            <h4 className="font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Images</h4>
                            <p className="text-sm text-muted-foreground">{IMAGE_EXTENSIONS.join(", ")}</p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-medium flex items-center gap-2"><FileText className="w-4 h-4" /> Files</h4>
                            <p className="text-sm text-muted-foreground">{DATA_EXTENSIONS.join(", ")}</p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-medium flex items-center gap-2"><FileIcon className="w-4 h-4" /> PDFs</h4>
                            <p className="text-sm text-muted-foreground">{PDF_EXTENSIONS.join(", ")}</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-left">*Max size of 20MB and 16,400 × 10,900 pixels.</p>
                </Card>
            </div>
          </div>
        ) : (
          // POPULATED STATE VIEW
          <Card className={`transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold">Drag and drop images and files.</h3>
                  <div className="text-sm text-muted-foreground mt-1 space-x-2 flex items-center">
                    <span>{IMAGE_EXTENSIONS.slice(0, 3).join(", ")}...</span>
                    <span>{DATA_EXTENSIONS.join(", ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">*Max size of 20MB and 16,400 × 10,900 pixels.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="gap-2"
                    disabled={isUploading || !canCreate}
                  >
                    <FileUp className="w-4 h-4" />Select Files
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => folderInputRef.current?.click()} 
                    className="gap-2"
                    disabled={isUploading || !canCreate}
                  >
                    <FolderOpen className="w-4 h-4" />Select Folder
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
                  {filteredFiles.map((file) => (
                    <div key={file.name} className="relative group rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center text-center">
                      {canCreate && (
                        <button type="button" onClick={() => removeFile(file.name)} className="absolute top-1 right-1 z-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)) ? (
                        <img src={filePreviewUrls[file.name]} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-2">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground break-all">{file.name}</p>
                          {file.name.toLowerCase().endsWith('.csv') && csvRowCounts[file.name] && (
                            <p className="text-xs font-medium text-primary">
                              {csvRowCounts[file.name]} {csvRowCounts[file.name] === 1 ? 'câu' : 'câu'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
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

      <input ref={fileInputRef} type="file" multiple accept={ALL_SUPPORTED_EXTENSIONS.join(",")} onChange={handleFileChange} className="hidden" />
      <input ref={folderInputRef} type="file" multiple onChange={handleFileChange} className="hidden" {...{ webkitdirectory: "true" }} />
    </form>
  )
}
