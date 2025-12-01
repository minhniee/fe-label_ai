"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Calendar, Columns, Loader2, Sparkles, FileText, ArrowLeft, ChevronRight, Upload, Key, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as dataset from "@/app/api/dataset"
import { getDatasets, getDatasetVersions, testApiKey } from "@/app/api/labelai"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseCSVFromFile, getApiKeyFromStorage, saveApiKeyToStorage } from "@/lib/label-ai-utils"

interface Dataset {
  id: string
  name: string
  description: string
  rowCount: number
  columns: string[]
  createdAt: string
}

interface DatasetVersion {
  id: string
  versionNumber: string
  fileName: string
  description: string
  rowCount: number
  columnCount: number
  columns: string[]
  uploadDate: string
  status: string
}

interface DatasetSelectorProps {
  onVersionSelect: (datasetId: string, versionId: string) => void
  onGenerateClick?: () => void
  onFileUpload?: (data: any[], columns: string[], fileName: string) => void
}

export function DatasetSelector({ onVersionSelect, onGenerateClick, onFileUpload }: DatasetSelectorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [versions, setVersions] = useState<DatasetVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDatasets()
    // Load API key from localStorage if available
    const savedApiKey = getApiKeyFromStorage()
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])


  const fetchDatasets = async () => {
    try {
      setLoading(true)
      
      const result = await getDatasets()

      if (result.success) {
        setDatasets(result.datasets)
      } else {
        if (result.error === "Not authenticated" || result.error?.includes("authentication")) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access datasets. Redirecting to login page...",
            variant: "destructive",
          })
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = "/"
          }, 2000)
        } else {
          toast({
            title: "Failed to fetch datasets",
            description: result.error || "An unexpected error occurred",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("Unauthorized")) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access datasets. Redirecting to login page...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/"
        }, 2000)
      } else {
        toast({
          title: "Error fetching datasets",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchVersions = async (datasetId: string) => {
    try {
      setLoadingVersions(true)
      
      const result = await getDatasetVersions(datasetId)

      if (result.success) {
        setVersions(result.versions)
      } else {
        toast({
          title: "Failed to fetch versions",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("Unauthorized")) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access datasets.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error fetching versions",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setSelectedVersionId(null)
    fetchVersions(dataset.id)
  }

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId)
  }

  const handleStartLabeling = () => {
    if (selectedDataset && selectedVersionId) {
      onVersionSelect(selectedDataset.id, selectedVersionId)
    }
  }

  const handleBack = () => {
    setSelectedDataset(null)
    setVersions([])
    setSelectedVersionId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      })
      return
    }

    setIsTestingKey(true)
    setApiKeyStatus("idle")

    try {
      const result = await testApiKey(apiKey.trim(), "gemini-2.5-flash")

      if (result.success) {
        setApiKeyStatus("valid")
        // Save API key to localStorage
        saveApiKeyToStorage(apiKey.trim())
        toast({
          title: "API Key Valid",
          description: result.message || "API key is valid and ready to use",
        })
      } else {
        setApiKeyStatus("invalid")
        toast({
          title: "API Key Invalid",
          description: result.error || "Please check your API key and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      setApiKeyStatus("invalid")
      const errorMessage = error instanceof Error ? error.message : "Failed to test API key"
      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: "Please upload a CSV file smaller than 20MB",
        variant: "destructive",
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const { data, columns } = await parseCSVFromFile(file)

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
            {onGenerateClick && (
              <Button onClick={onGenerateClick} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Data
              </Button>
            )}
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
                    key={version.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedVersionId === version.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-foreground">{version.fileName}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              v{version.versionNumber}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{version.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          <span>{version.rowCount} rows</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Columns className="h-3 w-3" />
                          <span>{version.columnCount} columns</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(version.uploadDate)}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Columns:</p>
                        <div className="flex flex-wrap gap-1">
                          {version.columns.map((col) => (
                            <span key={col} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {selectedVersionId && (
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
          {onGenerateClick && (
            <Button onClick={onGenerateClick} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New Data
            </Button>
          )}
        </div>
      </div>

      {/* API Key Configuration */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">API Key Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your Gemini API key to use AI features like search and data generation
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setApiKeyStatus("idle")
                  }}
                  className="pr-10"
                />
                {apiKeyStatus === "valid" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {apiKeyStatus === "invalid" && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and not sent to our servers
              </p>
            </div>
            <Button
              onClick={handleTestApiKey}
              disabled={isTestingKey || !apiKey.trim()}
              variant="outline"
              className="gap-2"
            >
              {isTestingKey ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Test Key
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((dataset) => (
          <Card
            key={dataset.id}
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

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{dataset.rowCount} rows</span>
                </div>
                <div className="flex items-center gap-1">
                  <Columns className="h-3 w-3" />
                  <span>{dataset.columns.length} columns</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{dataset.createdAt}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {dataset.columns.slice(0, 4).map((col) => (
                  <span key={col} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {col}
                  </span>
                ))}
                {dataset.columns.length > 4 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5">+{dataset.columns.length - 4} more</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
