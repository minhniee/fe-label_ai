"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Calendar, Columns, Loader2, Sparkles, FileText, ArrowLeft, ChevronRight, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as dataset from "@/app/api/datasets"
import Papa from "papaparse"



interface DatasetSelectorProps {
  onVersionSelect: (datasetId: any, versionId: any) => void
  onGenerateClick: () => void
  onFileUpload?: (data: any[], columns: string[], fileName: string) => void
}

export function DatasetSelector({ onVersionSelect, onGenerateClick, onFileUpload }: DatasetSelectorProps) {
  const [datasets, setDatasets] = useState<dataset.Dataset[]>([])
  const [versions, setVersions] = useState<dataset.DatasetVersion[]>([])
  const [files, setFiles] = useState<dataset.DataFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<dataset.Dataset | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const response = await dataset.getDatasets()
      if (response) {
        setDatasets(response)
      } else {
        console.error("Failed to fetch datasets:", response)
      }
    } catch (error) {
      console.error("Error fetching datasets:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVersions = async (datasetId: number) => {
    try {
      setLoadingVersions(true)
      const response = await dataset.getDatasetVersions(datasetId)
      if (response) {
        setVersions(response)
      } else {
        console.error("Failed to fetch versions:", response)
      }
    } catch (error) {
      console.error("Error fetching versions:", error)
    } finally {
      setLoadingVersions(false)
    }
  }

  const fetchFiles = async (versionId: number) => {
    try {
      setLoadingFiles(true)
      const response = await dataset.getVersionFiles(versionId)
      if (response) {
        setFiles(response)
      } else {
        console.error("Failed to fetch files:", response)
      }
    } catch (error) {
      console.error("Error fetching files:", error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleDatasetSelect = (dataset: dataset.Dataset) => {
    setSelectedDataset(dataset)
    setSelectedVersionId(null)
    fetchVersions(dataset.dataset_id)
  }

  const handleVersionSelect = (versionId: number) => {
    setSelectedVersionId(versionId)
    fetchFiles(versionId)
  }

  const handleStartLabeling = () => {
    if (selectedDataset && selectedVersionId) {
      onVersionSelect(selectedDataset.dataset_id, selectedVersionId)
    }
  }

  const handleBack = () => {
    setSelectedDataset(null)
    setVersions([])
    setFiles([])
    setSelectedVersionId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error(results.errors[0].message)
          }

          const data = results.data as any[]
          const columns = results.meta.fields || []

          if (data.length === 0) {
            throw new Error("CSV file is empty")
          }

          if (columns.length === 0) {
            throw new Error("No columns found in CSV file")
          }

          onFileUpload?.(data, columns, file.name)

          toast({
            title: "File uploaded successfully",
            description: `Loaded ${data.length} rows with ${columns.length} columns`,
          })

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        } catch (error) {
          console.error("Error parsing CSV:", error)
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Failed to parse CSV file",
            variant: "destructive",
          })
        } finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        console.error("Error reading file:", error)
        toast({
          title: "Upload failed",
          description: error.message || "Failed to read CSV file",
          variant: "destructive",
        })
        setIsUploading(false)
      },
    })
  }

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading datasets...</p>
        </div>
      </Card>
    )
  }

  if (selectedDataset) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Datasets
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </>
              )}
            </Button>
            <Button onClick={onGenerateClick} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New Data
            </Button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedDataset.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selectedDataset.description}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        {loadingVersions ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading versions...</p>
            </div>
          </Card>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Select a Version</h3>
              <div className="space-y-3">
                {versions.map((version) => (
                  <Card
                    key={version.version_id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedVersionId === version.version_id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleVersionSelect(version.version_id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-foreground">{version.changelog || `Version ${version.version_number}`}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              v{version.version_number}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(version.created_at)}
                          </p>
                        </div>
                      </div>

                      {selectedVersionId === version.version_id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          {loadingFiles ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading files...
                            </div>
                          ) : files.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-foreground">Files in this version:</p>
                              {files.map((file) => (
                                <div key={file.file_id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono">{file.file_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({file.line_count} rows, {file.column_count} columns)
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No files in this version</p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {selectedVersionId && files.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleStartLabeling} size="lg">
                  Start Labeling
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Select a Dataset</h2>
            <p className="text-sm text-muted-foreground">Choose a dataset from your database to view its versions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </>
            )}
          </Button>
          <Button onClick={onGenerateClick} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate New Data
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((dataset) => (
          <Card
            key={dataset.dataset_id}
            className="p-4 cursor-pointer transition-all hover:border-primary/50"
            onClick={() => handleDatasetSelect(dataset)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{dataset.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{dataset.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{dataset.total_rows} rows</span>
                </div>
                <div className="flex items-center gap-1">
                  <Columns className="h-3 w-3" />
                  <span>{dataset.column_count} columns</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{dataset.created_at}</span>
                </div>
              </div> */}

              {/* <div className="flex flex-wrap gap-1">
                {dataset.columns.split(",").slice(0, 4).map((col) => (
                  <span key={col} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {col.trim()}
                  </span>
                ))}
                {dataset.columns.split(",").length > 4 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5">+{dataset.columns.split(",").length - 4} more</span>
                )}
              </div> */}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
