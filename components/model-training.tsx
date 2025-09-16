"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Download,
  Play,
  Pause,
  Square,
  Brain,
  Database,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react"

interface Model {
  id: string
  name: string
  version: string
  dataVersion: string
  trainDate: string
  status: "training" | "completed" | "failed" | "pending"
  accuracy: number
  f1Score: number
  precision: number
  recall: number
  trainingTime: string
  description?: string
}

interface TrainingJob {
  id: string
  modelName: string
  dataVersion: string
  status: "running" | "queued" | "completed" | "failed"
  progress: number
  startTime: string
  estimatedTime: string
}

export function ModelTraining() {
  const [selectedDataVersion, setSelectedDataVersion] = useState<string>("")
  const [modelName, setModelName] = useState<string>("")
  const [modelDescription, setModelDescription] = useState<string>("")
  const [isTraining, setIsTraining] = useState(false)

  // Mock data
  const [models] = useState<Model[]>([
    {
      id: "1",
      name: "FPTU Admission Classifier",
      version: "v1.5",
      dataVersion: "v2.1",
      trainDate: "2024-01-15",
      status: "completed",
      accuracy: 94.2,
      f1Score: 93.8,
      precision: 94.5,
      recall: 93.1,
      trainingTime: "2h 15m",
      description: "Mô hình phân loại ứng viên với độ chính xác cao nhất",
    },
    {
      id: "2",
      name: "FPTU Admission Classifier",
      version: "v1.4",
      dataVersion: "v2.0",
      trainDate: "2024-01-10",
      status: "completed",
      accuracy: 91.8,
      f1Score: 91.2,
      precision: 92.1,
      recall: 90.3,
      trainingTime: "1h 45m",
    },
    {
      id: "3",
      name: "FPTU Admission Classifier",
      version: "v1.3",
      dataVersion: "v1.9",
      trainDate: "2024-01-05",
      status: "completed",
      accuracy: 89.5,
      f1Score: 88.9,
      precision: 90.2,
      recall: 87.6,
      trainingTime: "1h 30m",
    },
  ])

  const [currentTraining] = useState<TrainingJob | null>({
    id: "job_001",
    modelName: "FPTU Admission Classifier v1.6",
    dataVersion: "v2.1",
    status: "running",
    progress: 65,
    startTime: "2024-01-15 14:30",
    estimatedTime: "45 phút",
  })

  const dataVersions = ["v2.1", "v2.0", "v1.9", "v1.8"]

  const handleExportData = (format: "csv" | "jsonl") => {
    // TODO: Implement data export logic
    console.log(`Exporting data in ${format} format`)
  }

  const handleStartTraining = () => {
    if (!selectedDataVersion || !modelName) return

    // TODO: Implement training start logic
    console.log("Starting training:", {
      dataVersion: selectedDataVersion,
      modelName,
      description: modelDescription,
    })
    setIsTraining(true)
  }

  const handleStopTraining = () => {
    // TODO: Implement training stop logic
    setIsTraining(false)
  }

  const getStatusIcon = (status: Model["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "training":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: Model["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Hoàn thành</Badge>
      case "training":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Đang huấn luyện</Badge>
      case "failed":
        return <Badge variant="destructive">Thất bại</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Chờ xử lý</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Xuất dữ liệu huấn luyện
          </CardTitle>
          <CardDescription>Xuất dữ liệu đã gán nhãn để huấn luyện mô hình AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => handleExportData("csv")} variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
            <Button onClick={() => handleExportData("jsonl")} variant="outline" className="flex-1">
              <Database className="h-4 w-4 mr-2" />
              Xuất JSONL
            </Button>
          </div>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Tổng bản ghi:</span>
                <p className="text-muted-foreground">3,400 câu hỏi đã gán nhãn</p>
              </div>
              <div>
                <span className="font-medium">Phiên bản dữ liệu:</span>
                <p className="text-muted-foreground">v2.1 (mới nhất)</p>
              </div>
              <div>
                <span className="font-medium">Cập nhật cuối:</span>
                <p className="text-muted-foreground">2024-01-15 16:30</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Training Status */}
      {currentTraining && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Trạng thái huấn luyện hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{currentTraining.modelName}</h4>
                <p className="text-sm text-muted-foreground">Dữ liệu: {currentTraining.dataVersion}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Đang huấn luyện</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tiến độ huấn luyện</span>
                <span>{currentTraining.progress}%</span>
              </div>
              <Progress value={currentTraining.progress} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Bắt đầu: {currentTraining.startTime}</span>
              <span>Còn lại: {currentTraining.estimatedTime}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Tạm dừng
              </Button>
              <Button variant="outline" size="sm" onClick={handleStopTraining}>
                <Square className="h-4 w-4 mr-2" />
                Dừng huấn luyện
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start New Training */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Bắt đầu huấn luyện mới
          </CardTitle>
          <CardDescription>Cấu hình và khởi động quá trình huấn luyện mô hình AI mới</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Tên mô hình</Label>
              <Input
                id="model-name"
                placeholder="FPTU Admission Classifier v1.6"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-version">Phiên bản dữ liệu</Label>
              <Select value={selectedDataVersion} onValueChange={setSelectedDataVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phiên bản dữ liệu" />
                </SelectTrigger>
                <SelectContent>
                  {dataVersions.map((version) => (
                    <SelectItem key={version} value={version}>
                      {version} {version === "v2.1" && "(mới nhất)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả (tùy chọn)</Label>
            <Textarea
              id="description"
              placeholder="Mô tả về mô hình và mục đích sử dụng..."
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleStartTraining}
            disabled={!selectedDataVersion || !modelName || isTraining || !!currentTraining}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Bắt đầu huấn luyện
          </Button>
        </CardContent>
      </Card>

      {/* Model History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Lịch sử mô hình
          </CardTitle>
          <CardDescription>Danh sách các mô hình đã huấn luyện và kết quả đánh giá</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mô hình</TableHead>
                <TableHead>Dữ liệu</TableHead>
                <TableHead>Ngày huấn luyện</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>F1-Score</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">{model.version}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{model.dataVersion}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {model.trainDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${model.accuracy >= 94 ? "text-green-600" : model.accuracy >= 90 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {model.accuracy}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{model.f1Score}%</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{model.trainingTime}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(model.status)}
                      {getStatusBadge(model.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
