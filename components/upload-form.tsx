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
import { createProjectBatch } from "@/app/api/batch"
import { useProjectFromSlug } from "@/hooks/use-project-from-slug"
import { projectToSlug } from "@/types/project"

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
  const [batchName, setBatchName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [filePreviewUrls, setFilePreviewUrls] = useState<{ [key: string]: string }>({});
  const [annotatedFiles, setAnnotatedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Set default batch name on mount
  useEffect(() => {
    const now = new Date();
    const formattedDate = `Uploaded on ${now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    setBatchName(formattedDate);
  }, []);

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

  const addFiles = (newFiles: File[]) => {
    const validFiles = validateFiles(newFiles);
    const uniqueNewFiles = validFiles.filter(
      (file) => !selectedFiles.some((existingFile) => existingFile.name === file.name && existingFile.size === file.size)
    );
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (e.target) e.target.value = '';
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const getFilteredFiles = () => {
    if (activeTab === "all") return selectedFiles;
    const imageFiles = selectedFiles.filter(file => IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)));
    if (activeTab === "annotated") return imageFiles.filter((file) => annotatedFiles.has(file.name));
    if (activeTab === "not-annotated") return imageFiles.filter((file) => !annotatedFiles.has(file.name));
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
      
      // Step 3: Create a batch with ONLY the newly uploaded files
      if (uploadResponse?.success && fileIds.length > 0) {
        sonnerToast.success("Files uploaded successfully!", { id: toastId });
        
        const batchResponse = await createProjectBatch({
          project_id: parseInt(project.id),
          name: batchName,
          description: `Batch created with ${fileIds.length} files`,
          file_ids: fileIds, // Use file_ids extracted from files array
          batch_metadata: {
            file_ids: fileIds // Explicitly store file_ids in metadata
          }
        });

        console.log("Batch created response:", batchResponse);
        console.log("Redirecting with file IDs:", fileIds);

        sonnerToast.success("Batch created successfully!");

        // Step 4: Redirect to batch page with file_ids in URL
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
  const annotatedCount = annotatedFiles.size;
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
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><FileUp className="w-4 h-4" />Select File(s)</Button>
              <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()} className="gap-2"><FolderOpen className="w-4 h-4" />Select Folder</Button>
            </div>
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
                    disabled={isUploading}
                  >
                    <FileUp className="w-4 h-4" />Select Files
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => folderInputRef.current?.click()} 
                    className="gap-2"
                    disabled={isUploading}
                  >
                    <FolderOpen className="w-4 h-4" />Select Folder
                  </Button>
                  <Button 
                    type="submit" 
                    className="gap-2"
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Save and Continue"}
                  </Button>
                </div>
              </div>

              {filteredFiles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-6">
                  {filteredFiles.map((file) => (
                    <div key={file.name} className="relative group rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center text-center">
                      <button type="button" onClick={() => removeFile(file.name)} className="absolute top-1 right-1 z-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                      {IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)) ? (
                        <img src={filePreviewUrls[file.name]} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-2">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground break-all">{file.name}</p>
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
