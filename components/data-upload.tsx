"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Calendar, Eye, Download, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataVersion {
  id: string
  version: string
  filename: string
  uploadDate: string
  size: string
  status: "processing" | "completed" | "error"
  records: number
  description?: string
}

export function DataUpload() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Mock data versions
  const [dataVersions] = useState<DataVersion[]>([
    {
      id: "1",
      version: "v2.1",
      filename: "admissions_data_2024_q1.csv",
      uploadDate: "2024-01-15",
      size: "2.4 MB",
      status: "completed",
      records: 5000,
      description: "Dữ liệu tuyển sinh Q1 2024 với thông tin đầy đủ",
    },
    {
      id: "2",
      version: "v2.0",
      filename: "admissions_data_2023_q4.xlsx",
      uploadDate: "2023-12-20",
      size: "1.8 MB",
      status: "completed",
      records: 3800,
      description: "Dữ liệu tuyển sinh Q4 2023",
    },
    {
      id: "3",
      version: "v1.9",
      filename: "admissions_data_2023_q3.csv",
      uploadDate: "2023-09-15",
      size: "1.6 MB",
      status: "completed",
      records: 3200,
    },
  ])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = (files: FileList) => {
    const file = files[0]
    if (
      file &&
      (file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    ) {
      simulateUpload()
    }
  }

  const simulateUpload = () => {
    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const getStatusIcon = (status: DataVersion["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: DataVersion["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Hoàn thành</Badge>
      case "processing":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Đang xử lý</Badge>
      case "error":
        return <Badge variant="destructive">Lỗi</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Tải lên dữ liệu mới
          </CardTitle>
          <CardDescription>
            Tải lên file CSV hoặc Excel chứa dữ liệu tuyển sinh để gán nhãn và huấn luyện AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50",
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Kéo thả file vào đây hoặc</p>
              <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
                Chọn file
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4">Hỗ trợ file CSV, Excel (.xlsx, .xls). Tối đa 10MB.</p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Đang tải lên...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả phiên bản (tùy chọn)</Label>
            <Textarea id="description" placeholder="Nhập mô tả cho phiên bản dữ liệu này..." className="resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* Data Versions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Các phiên bản dữ liệu
          </CardTitle>
          <CardDescription>Danh sách các phiên bản dữ liệu đã tải lên và trạng thái xử lý</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataVersions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{version.version}</h4>
                      {getStatusIcon(version.status)}
                      {getStatusBadge(version.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{version.filename}</p>
                    {version.description && <p className="text-xs text-muted-foreground">{version.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {version.uploadDate}
                      </span>
                      <span>{version.size}</span>
                      <span>{version.records.toLocaleString()} bản ghi</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Xem dữ liệu
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Tải xuống
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
