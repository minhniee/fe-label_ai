"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Calendar,
  Eye,
  Download,
  CheckCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDatasets,
  createDatasetVersion,
  getDatasetVersions,
  uploadFileToVersion,
  getVersionFiles,
  createDataset,
  type Dataset,
  type DatasetVersion,
  type DataFile,
} from "@/app/api/datasets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/file-upload";

export function DataUpload() {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [versionId, setVersionId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dataset creation state
  const [isCreateDatasetOpen, setIsCreateDatasetOpen] = useState(false);
  const [newDataset, setNewDataset] = useState({
    name: "",
    description: "",
  });
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [datasetError, setDatasetError] = useState("");
  const [datasetSuccess, setDatasetSuccess] = useState("");

  // Data state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DatasetVersion | null>(
    null
  );

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  // Load versions when dataset changes
  useEffect(() => {
    if (selectedDatasetId) {
      loadVersions(parseInt(selectedDatasetId));
    }
  }, [selectedDatasetId]);

  // Load files when version changes
  useEffect(() => {
    if (versionId) {
      loadFiles(parseInt(versionId));
      // Find and set the selected version
      const version = versions.find(
        (v) => v.version_id.toString() === versionId
      );
      setSelectedVersion(version || null);
    } else {
      setSelectedVersion(null);
    }
  }, [versionId, versions]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const data = await getDatasets();
      setDatasets(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (datasetId: number) => {
    try {
      const data = await getDatasetVersions(datasetId);
      setVersions(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load versions");
    }
  };

  const loadFiles = async (versionId: number) => {
    try {
      const data = await getVersionFiles(versionId);
      setFiles(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load files");
    }
  };

  const handleCreateDataset = async () => {
    if (!newDataset.name.trim()) {
      setDatasetError("Dataset name is required");
      return;
    }

    try {
      setIsCreatingDataset(true);
      setDatasetError("");
      setDatasetSuccess("");

      const dataset = await createDataset(
        newDataset.name,
        newDataset.description
      );

      // Reset form
      setNewDataset({ name: "", description: "" });

      // Reload datasets to show the new one
      loadDatasets();

      // Close dialog
      setIsCreateDatasetOpen(false);

      // Show success toast
      toast({ title: "Dataset created successfully!" });
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to create dataset";
      setDatasetError(errorMsg);
      toast({ title: "Failed to create dataset", variant: "destructive" });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Please select a file" });
      return;
    }
    if (!selectedDatasetId) {
      toast({ title: "Please select a dataset" });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError("");
      setSuccess("");

      let currentVersionId = parseInt(versionId);

      // If no version selected, create a new one
      if (!currentVersionId) {
        const newVersion = await createDatasetVersion(
          parseInt(selectedDatasetId),
          description || "Initial version"
        );
        currentVersionId = newVersion.version_id;
        setVersionId(currentVersionId.toString());
        // Reload versions to show the new one
        loadVersions(parseInt(selectedDatasetId));
      }

      // Upload file
      const uploadedFile = await uploadFileToVersion(
        currentVersionId,
        selectedFile
      );

      setUploadProgress(100);

      // Show success toast
      toast({ title: "Uploaded file successfully!" });

      // Reload files to show the new upload
      loadFiles(currentVersionId);

      // Reset form
      setSelectedFile(null);
      setDescription("");
    } catch (err: any) {
      const errorMsg = err?.message || "Upload failed";
      setError(errorMsg);
      toast({ title: "Failed to upload failed!" });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (file: DataFile) => {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (file: DataFile) => {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Completed
      </Badge>
    );
  };


  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className=" ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload new data
          </CardTitle>
          <CardDescription>
            Upload files containing admission data for labeling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dataset">Select Dataset</Label>
              <Dialog
                open={isCreateDatasetOpen}
                onOpenChange={setIsCreateDatasetOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create new Dataset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create new Dataset</DialogTitle>
                    <DialogDescription>
                      Create a new dataset to manage labeled data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataset-name">Dataset Name *</Label>
                      <Input
                        id="dataset-name"
                        placeholder="Enter dataset name"
                        value={newDataset.name}
                        onChange={(e) =>
                          setNewDataset({ ...newDataset, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataset-description">Description</Label>
                      <Input
                        id="dataset-description"
                        placeholder="Enter dataset description (optional)"
                        value={newDataset.description}
                        onChange={(e) =>
                          setNewDataset({
                            ...newDataset,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    {datasetError && (
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded break-words whitespace-pre-wrap overflow-hidden max-w-full">
                        {datasetError}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDatasetOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateDataset}
                      disabled={isCreatingDataset}
                    >
                      {isCreatingDataset ? "Creating..." : "Create Dataset"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Select
              value={selectedDatasetId}
              onValueChange={setSelectedDatasetId}
            >
              <SelectTrigger className="bg-gray-200 hover:bg-gray-300">
                <SelectValue placeholder="Select dataset to upload file" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800">
                {datasets.map((dataset) => (
                  <SelectItem
                    key={dataset.dataset_id}
                    value={dataset.dataset_id.toString()}
                    className="bg-white hover:bg-gray-100 focus:bg-gray-200"
                  >
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version Selection */}
          {selectedDatasetId && (
            <div className="space-y-2">
              <Label htmlFor="version">
                Select Version (or leave empty to create new)
              </Label>
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version or leave empty to create new" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem
                      key={version.version_id}
                      value={version.version_id.toString()}
                    >
                      v{version.version_number} -{" "}
                      {version.changelog || "No description"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File Upload Area */}
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            accept=".csv,.xlsx,.xls"
            maxSize={10}
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Version description </Label>
            <Textarea
              id="description"
              placeholder="Enter changelog for this data version..."
              className="resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded break-words whitespace-pre-wrap overflow-hidden max-w-full">
              {error}
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedDatasetId || isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className=" ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded files
          </CardTitle>
          <CardDescription>
            {selectedVersion
              ? `Files trong version v${selectedVersion.version_number} - ${
                  selectedVersion.changelog || "No description"
                }`
              : "Select dataset and version to view files"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {versionId
                  ? "No files in this version"
                  : "Select dataset and version to view files"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.file_id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{file.file_name}</h4>
                        {getStatusIcon(file)}
                        {getStatusBadge(file)}
                        {selectedVersion && (
                          <Badge variant="outline" className="text-xs">
                            v{selectedVersion.version_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(file.uploaded_at)}
                        </span>
                        <span>{formatFileSize(file.file_size)}</span>
                        {file.line_count && (
                          <span>{file.line_count.toLocaleString()} lines</span>
                        )}
                        {selectedVersion && (
                          <span className="text-blue-600">
                            Version:{" "}
                            {selectedVersion.changelog || "No description"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View data
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
