"use client"

import type React from "react"

import { useState } from "react"
import { FileText, Loader2, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { parseReference } from "@/app/api/labelai"

interface ReferenceFile {
  name: string
  content: string
  size: number
}

interface ReferenceUploaderProps {
  onReferenceUpdate: (content: string, files: ReferenceFile[]) => void
}

export function ReferenceUploader({ onReferenceUpdate }: ReferenceUploaderProps) {
  const [files, setFiles] = useState<ReferenceFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    setIsUploading(true)

    try {
      const newFiles: ReferenceFile[] = []

      for (const file of Array.from(uploadedFiles)) {
        const result = await parseReference(file)

        if (result.success) {
          newFiles.push({
            name: file.name,
            content: result.content,
            size: file.size,
          })
        } else {
          throw new Error(result.error || "Failed to parse file")
        }
      }

      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)

      // Combine all file contents
      const combinedContent = updatedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join("\n\n")
      onReferenceUpdate(combinedContent, updatedFiles)

      toast({
        title: "Reference files uploaded",
        description: `Successfully processed ${newFiles.length} file(s)`,
      })
    } catch (error) {
      console.error("[v0] Error uploading reference files:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : JSON.stringify(error),
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset input
      event.target.value = ""
    }
  }

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)

    const combinedContent = updatedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join("\n\n")
    onReferenceUpdate(combinedContent, updatedFiles)

    toast({
      title: "File removed",
      description: "Reference file has been removed",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Reference Documents</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDF, DOCX, or TXT files to provide context for AI labeling
            </p>
          </div>
          <label htmlFor="reference-upload">
            <Button variant="outline" asChild disabled={isUploading}>
              <span className="cursor-pointer gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Upload Files
                  </>
                )}
              </span>
            </Button>
          </label>
          <input
            id="reference-upload"
            type="file"
            accept="*/*" // ALLOW ALL FILES for backend testing
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.content.length} characters extracted
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No reference files uploaded yet</p>
          </div>
        )}
      </div>
    </Card>
  )
}
