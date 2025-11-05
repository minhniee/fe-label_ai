"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Upload, FileUp, FolderOpen, X } from "lucide-react"

const SUPPORTED_FORMATS = {
  csv: ".csv",
  xlsx: ".xlsx",
  json: ".json",
  pdf: ".pdf",
}

const SUPPORTED_FORMAT_EXTENSIONS = [".csv", ".xlsx", ".json", ".pdf"]

export function UploadForm() {
  const [batchName, setBatchName] = useState("")
  const [createBatchInstantly, setCreateBatchInstantly] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Set default batch name on mount
  useEffect(() => {
    const now = new Date()
    const formattedDate = `Uploaded on ${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${now.getFullYear().toString().slice(-2)} at ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? "pm" : "am"}`
    setBatchName(formattedDate)
  }, [])

  const validateFiles = (files: File[]): File[] => {
    return files.filter((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`
      return SUPPORTED_FORMAT_EXTENSIONS.includes(extension)
    })
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = validateFiles(files)
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = validateFiles(files)
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const handleSelectFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = validateFiles(files)
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log("Submitting upload with:", {
      batchName,
      files: selectedFiles,
      createBatchInstantly,
    })
    // TODO: Add API call to upload files
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Upload className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Upload</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch Name Input */}
        <div className="space-y-2">
          <label htmlFor="batch-name" className="text-sm font-medium">
            Batch Name:
          </label>
          <Input
            id="batch-name"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter batch name"
            className="w-full"
          />
        </div>

        {/* Create Batch Instantly Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox id="create-batch" checked={createBatchInstantly} onCheckedChange={setCreateBatchInstantly} />
          <label htmlFor="create-batch" className="text-sm font-medium cursor-pointer">
            Create batch instantly
          </label>
        </div>

        {/* Drag and Drop Area */}
        <Card
          ref={dragRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed p-12 transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Upload Icon */}
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Main Text */}
            <h2 className="text-xl font-semibold text-center">Drag and drop file(s) to upload, or:</h2>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <FileUp className="w-4 h-4" />
                Select File(s)
              </Button>
              <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()} className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Select Folder
              </Button>
            </div>

            {/* Supported Formats */}
            <div className="w-full pt-6 border-t">
              <div className="text-sm font-semibold text-muted-foreground mb-3">Supported Formats</div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 font-medium text-sm mb-1">
                    <FileUp className="w-4 h-4" />
                    Data Files
                  </div>
                  <p className="text-sm text-muted-foreground">{Object.values(SUPPORTED_FORMATS).join(", ")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_FORMAT_EXTENSIONS.join(",")}
          onChange={handleSelectFiles}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory="true"
          accept={SUPPORTED_FORMAT_EXTENSIONS.join(",")}
          onChange={handleSelectFolder}
          className="hidden"
        />

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Selected Files ({selectedFiles.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileUp className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-2 p-1 hover:bg-destructive/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={selectedFiles.length === 0}>
          Upload Files
        </Button>
      </form>
    </div>
  )
}
