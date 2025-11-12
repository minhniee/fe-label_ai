"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Download,
  FileText,
  Database,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Code,
  Settings,
} from "lucide-react";

interface ExportJob {
  id: string;
  name: string;
  format: "csv" | "jsonl" | "json" | "xlsx";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  createdDate: string;
  completedDate?: string;
  fileSize?: string;
  downloadUrl?: string;
  filters: {
    batches: string[];
    dateRange: { from: string; to: string };
    labelStatus: string[];
    annotators: string[];
  };
  totalRecords: number;
  exportedRecords: number;
}

export function DataExport() {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: "1",
      name: "Export Batch 001 - Hoàn thành",
      format: "csv",
      status: "completed",
      progress: 100,
      createdDate: "2024-01-15",
      completedDate: "2024-01-15",
      fileSize: "2.5 MB",
      downloadUrl: "#",
      filters: {
        batches: ["Batch 001"],
        dateRange: { from: "2024-01-01", to: "2024-01-15" },
        labelStatus: ["completed"],
        annotators: ["Nguyễn Thị Lan", "Trần Văn Minh"],
      },
      totalRecords: 1000,
      exportedRecords: 1000,
    },
    {
      id: "2",
      name: "Export tất cả dữ liệu - JSONL",
      format: "jsonl",
      status: "processing",
      progress: 65,
      createdDate: "2024-01-16",
      filters: {
        batches: ["all"],
        dateRange: { from: "2024-01-01", to: "2024-01-16" },
        labelStatus: ["completed", "reviewed"],
        annotators: ["all"],
      },
      totalRecords: 3000,
      exportedRecords: 1950,
    },
  ]);

  const [isCreateExportOpen, setIsCreateExportOpen] = useState(false);
  const [newExport, setNewExport] = useState({
    name: "",
    format: "csv" as ExportJob["format"],
    batches: [] as string[],
    dateFrom: "",
    dateTo: "",
    labelStatus: [] as string[],
    annotators: [] as string[],
    includeMetadata: true,
    includeConfidence: true,
    includeDisagreements: false,
  });

  const availableBatches = [
    "Batch 001 - Hồ sơ tuyển sinh 2024",
    "Batch 002 - Hồ sơ kỹ thuật",
    "Batch 003 - Hồ sơ kinh tế",
  ];

  const availableAnnotators = [
    "Nguyễn Thị Lan",
    "Trần Văn Minh",
    "Lê Thị Hoa",
    "Phạm Văn Đức",
  ];

  const handleCreateExport = () => {
    if (!newExport.name || !newExport.format) return;

    const exportJob: ExportJob = {
      id: Date.now().toString(),
      name: newExport.name,
      format: newExport.format,
      status: "pending",
      progress: 0,
      createdDate: new Date().toISOString().split("T")[0],
      filters: {
        batches: newExport.batches,
        dateRange: { from: newExport.dateFrom, to: newExport.dateTo },
        labelStatus: newExport.labelStatus,
        annotators: newExport.annotators,
      },
      totalRecords: Math.floor(Math.random() * 2000) + 500,
      exportedRecords: 0,
    };

    setExportJobs([exportJob, ...exportJobs]);

    // Simulate processing
    setTimeout(() => {
      setExportJobs((prev) =>
        prev.map((job) =>
          job.id === exportJob.id ? { ...job, status: "processing" } : job
        )
      );
    }, 1000);

    setNewExport({
      name: "",
      format: "csv",
      batches: [],
      dateFrom: "",
      dateTo: "",
      labelStatus: [],
      annotators: [],
      includeMetadata: true,
      includeConfidence: true,
      includeDisagreements: false,
    });
    setIsCreateExportOpen(false);
  };

  const handleBatchSelection = (batch: string, checked: boolean) => {
    if (checked) {
      setNewExport({ ...newExport, batches: [...newExport.batches, batch] });
    } else {
      setNewExport({
        ...newExport,
        batches: newExport.batches.filter((b) => b !== batch),
      });
    }
  };

  const handleAnnotatorSelection = (annotator: string, checked: boolean) => {
    if (checked) {
      setNewExport({
        ...newExport,
        annotators: [...newExport.annotators, annotator],
      });
    } else {
      setNewExport({
        ...newExport,
        annotators: newExport.annotators.filter((a) => a !== annotator),
      });
    }
  };

  const handleLabelStatusSelection = (status: string, checked: boolean) => {
    if (checked) {
      setNewExport({
        ...newExport,
        labelStatus: [...newExport.labelStatus, status],
      });
    } else {
      setNewExport({
        ...newExport,
        labelStatus: newExport.labelStatus.filter((s) => s !== status),
      });
    }
  };

  const getStatusBadge = (status: ExportJob["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Settings className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  const getFormatIcon = (format: ExportJob["format"]) => {
    switch (format) {
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "json":
      case "jsonl":
        return <Code className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
      </div>
      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exportJobs.length}</div>
            <p className="text-xs text-muted-foreground">All export jobs</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exportJobs.filter((j) => j.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready to download</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exportJobs.filter((j) => j.status === "processing").length}
            </div>
            <p className="text-xs text-muted-foreground">Generating files</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exportJobs
                .reduce((sum, job) => sum + job.totalRecords, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Exported</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Export Labeled Data</CardTitle>
              <CardDescription>
                Export cleaned and labeled data for Machine Learning
              </CardDescription>
            </div>
            <Dialog
              open={isCreateExportOpen}
              onOpenChange={setIsCreateExportOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Tạo Export mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Data Export</DialogTitle>
                  <DialogDescription>
                    Configure and export labeled data for ML formats
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="export-name">Export Name</Label>
                      <Input
                        id="export-name"
                        placeholder="e.g., Export Batch 001 - CSV"
                        value={newExport.name}
                        onChange={(e) =>
                          setNewExport({ ...newExport, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Select
                        value={newExport.format}
                        onValueChange={(value: ExportJob["format"]) =>
                          setNewExport({ ...newExport, format: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">
                            CSV - Comma Separated Values
                          </SelectItem>
                          <SelectItem value="jsonl">
                            JSONL - JSON Lines (ML Training)
                          </SelectItem>
                          <SelectItem value="json">
                            JSON - JavaScript Object Notation
                          </SelectItem>
                          <SelectItem value="xlsx">
                            XLSX - Excel Spreadsheet
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="date-from">From date</Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={newExport.dateFrom}
                          onChange={(e) =>
                            setNewExport({
                              ...newExport,
                              dateFrom: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date-to">To date</Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={newExport.dateTo}
                          onChange={(e) =>
                            setNewExport({
                              ...newExport,
                              dateTo: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Batches</Label>
                      <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="all-batches"
                            checked={
                              newExport.batches.length ===
                              availableBatches.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewExport({
                                  ...newExport,
                                  batches: [...availableBatches],
                                });
                              } else {
                                setNewExport({ ...newExport, batches: [] });
                              }
                            }}
                          />
                          <Label
                            htmlFor="all-batches"
                            className="text-sm font-medium"
                          >
                            All Batches
                          </Label>
                        </div>
                        {availableBatches.map((batch) => (
                          <div
                            key={batch}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={batch}
                              checked={newExport.batches.includes(batch)}
                              onCheckedChange={(checked) =>
                                handleBatchSelection(batch, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={batch}
                              className="text-sm font-normal"
                            >
                              {batch}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Label Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "completed",
                          "reviewed",
                          "approved",
                          "disagreement",
                        ].map((status) => (
                          <div
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={status}
                              checked={newExport.labelStatus.includes(status)}
                              onCheckedChange={(checked) =>
                                handleLabelStatusSelection(
                                  status,
                                  checked as boolean
                                )
                              }
                            />
                            <Label
                              htmlFor={status}
                              className="text-sm font-normal"
                            >
                              {status === "completed" && "Completed"}
                              {status === "reviewed" && "Reviewed"}
                              {status === "approved" && "Approved"}
                              {status === "disagreement" && "Disagreement"}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label>Select Annotators</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {availableAnnotators.map((annotator) => (
                          <div
                            key={annotator}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={annotator}
                              checked={newExport.annotators.includes(annotator)}
                              onCheckedChange={(checked) =>
                                handleAnnotatorSelection(
                                  annotator,
                                  checked as boolean
                                )
                              }
                            />
                            <Label
                              htmlFor={annotator}
                              className="text-sm font-normal"
                            >
                              {annotator}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Export Options</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="include-metadata"
                            checked={newExport.includeMetadata}
                            onCheckedChange={(checked) =>
                              setNewExport({
                                ...newExport,
                                includeMetadata: checked as boolean,
                              })
                            }
                          />
                          <Label htmlFor="include-metadata" className="text-sm">
                            Include metadata
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="include-confidence"
                            checked={newExport.includeConfidence}
                            onCheckedChange={(checked) =>
                              setNewExport({
                                ...newExport,
                                includeConfidence: checked as boolean,
                              })
                            }
                          />
                          <Label
                            htmlFor="include-confidence"
                            className="text-sm"
                          >
                            Confidence score
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="include-disagreements"
                            checked={newExport.includeDisagreements}
                            onCheckedChange={(checked) =>
                              setNewExport({
                                ...newExport,
                                includeDisagreements: checked as boolean,
                              })
                            }
                          />
                          <Label
                            htmlFor="include-disagreements"
                            className="text-sm"
                          >
                            Disagreements
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateExportOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateExport}>Create Export</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exportJobs.map((job) => (
              <Card key={job.id} className="p-4  ">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      {getFormatIcon(job.format)}
                    </div>
                    <div>
                      <div className="font-medium">{job.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {job.createdDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {job.exportedRecords.toLocaleString()}/
                          {job.totalRecords.toLocaleString()} records
                        </span>
                        {job.fileSize && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.fileSize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {getStatusBadge(job.status)}
                      {job.status === "processing" && (
                        <div className="mt-2 w-32">
                          <Progress value={job.progress} className="h-2" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {job.progress}%
                          </div>
                        </div>
                      )}
                    </div>
                    {job.status === "completed" && (
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
