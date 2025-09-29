"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Shuffle,
  Database,
  Settings,
  BarChart3,
} from "lucide-react"

interface Batch {
  id: string
  name: string
  description: string
  totalQuestions: number
  assignedTo: string[]
  annotators: number
  status: "pending" | "in_progress" | "completed" | "review"
  createdDate: string
  dueDate: string
  progress: number
  priority: "low" | "medium" | "high"
  datasetId?: string
  datasetName?: string
  questionRange?: { start: number; end: number }
  assignmentDetails?: {
    userId: string
    userName: string
    questionCount: number
    questionRange: { start: number; end: number }
  }[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Dataset {
  id: string
  name: string
  totalQuestions: number
  uploadDate: string
  status: "ready" | "processing" | "error"
}

export function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([
    {
      id: "1",
      name: "Batch 001 - Hồ sơ tuyển sinh 2024",
      description: "Gán nhãn cho 1000 hồ sơ tuyển sinh đầu tiên",
      totalQuestions: 1000,
      assignedTo: ["Nguyễn Thị Lan", "Trần Văn Minh"],
      annotators: 2,
      status: "in_progress",
      createdDate: "2024-01-10",
      dueDate: "2024-01-20",
      progress: 65,
      priority: "high",
      datasetId: "ds1",
      datasetName: "Hồ sơ tuyển sinh 2024 - Đợt 1",
      questionRange: { start: 1, end: 1000 },
      assignmentDetails: [
        { userId: "1", userName: "Nguyễn Thị Lan", questionCount: 500, questionRange: { start: 1, end: 500 } },
        { userId: "2", userName: "Trần Văn Minh", questionCount: 500, questionRange: { start: 501, end: 1000 } },
      ],
    },
    {
      id: "2",
      name: "Batch 002 - Hồ sơ kỹ thuật",
      description: "Gán nhãn cho hồ sơ ngành kỹ thuật",
      totalQuestions: 800,
      assignedTo: ["Lê Thị Hoa"],
      annotators: 1,
      status: "pending",
      createdDate: "2024-01-12",
      dueDate: "2024-01-25",
      progress: 0,
      priority: "medium",
    },
    {
      id: "3",
      name: "Batch 003 - Hồ sơ kinh tế",
      description: "Gán nhãn cho hồ sơ ngành kinh tế",
      totalQuestions: 1200,
      assignedTo: ["Nguyễn Thị Lan", "Phạm Văn Đức"],
      annotators: 2,
      status: "completed",
      createdDate: "2024-01-05",
      dueDate: "2024-01-15",
      progress: 100,
      priority: "low",
    },
  ])

  const [users] = useState<User[]>([
    { id: "1", name: "Nguyễn Thị Lan", email: "lan.nguyen@fpt.edu.vn", role: "senior_labeler" },
    { id: "2", name: "Trần Văn Minh", email: "minh.tran@fpt.edu.vn", role: "labeler" },
    { id: "3", name: "Lê Thị Hoa", email: "hoa.le@fpt.edu.vn", role: "labeler" },
    { id: "4", name: "Phạm Văn Đức", email: "duc.pham@fpt.edu.vn", role: "labeler" },
  ])

  const [datasets] = useState<Dataset[]>([
    {
      id: "ds1",
      name: "Hồ sơ tuyển sinh 2024 - Đợt 1",
      totalQuestions: 5000,
      uploadDate: "2024-01-05",
      status: "ready",
    },
    {
      id: "ds2",
      name: "Hồ sơ tuyển sinh 2024 - Đợt 2",
      totalQuestions: 3200,
      uploadDate: "2024-01-08",
      status: "ready",
    },
    { id: "ds3", name: "Hồ sơ chuyển ngành", totalQuestions: 1500, uploadDate: "2024-01-10", status: "processing" },
  ])

  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false)
  const [isBatchAssignmentOpen, setIsBatchAssignmentOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [newBatch, setNewBatch] = useState({
    name: "",
    description: "",
    totalQuestions: 0,
    assignedTo: [] as string[],
    annotators: 1,
    dueDate: "",
    priority: "medium" as Batch["priority"],
    datasetId: "",
    questionRangeStart: 1,
    questionRangeEnd: 0,
    selectedUsers: [] as string[],
    distributionMode: "equal" as "equal" | "custom",
    customAssignments: [] as { userId: string; questionCount: number }[],
  })

  const calculateEqualDistribution = () => {
    if (newBatch.selectedUsers.length === 0 || newBatch.totalQuestions === 0) return []

    const questionsPerUser = Math.floor(newBatch.totalQuestions / newBatch.selectedUsers.length)
    const remainder = newBatch.totalQuestions % newBatch.selectedUsers.length

    return newBatch.selectedUsers.map((userId, index) => ({
      userId,
      questionCount: questionsPerUser + (index < remainder ? 1 : 0),
    }))
  }

  const handleDatasetSelection = (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId)
    if (dataset) {
      setNewBatch({
        ...newBatch,
        datasetId,
        totalQuestions: dataset.totalQuestions,
        questionRangeEnd: dataset.totalQuestions,
        name: `Batch - ${dataset.name}`,
      })
    }
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    let updatedUsers: string[]
    if (checked) {
      updatedUsers = [...newBatch.selectedUsers, userId]
    } else {
      updatedUsers = newBatch.selectedUsers.filter((id) => id !== userId)
    }

    setNewBatch({
      ...newBatch,
      selectedUsers: updatedUsers,
      customAssignments:
        newBatch.distributionMode === "equal" ? calculateEqualDistribution() : newBatch.customAssignments,
    })
  }

  const handleCreateBatch = () => {
    if (!newBatch.name || !newBatch.totalQuestions || !newBatch.dueDate || !newBatch.datasetId) return

    const assignments =
      newBatch.distributionMode === "equal" ? calculateEqualDistribution() : newBatch.customAssignments

    let currentStart = newBatch.questionRangeStart
    const assignmentDetails = assignments.map((assignment) => {
      const user = users.find((u) => u.id === assignment.userId)
      const detail = {
        userId: assignment.userId,
        userName: user?.name || "",
        questionCount: assignment.questionCount,
        questionRange: { start: currentStart, end: currentStart + assignment.questionCount - 1 },
      }
      currentStart += assignment.questionCount
      return detail
    })

    const batch: Batch = {
      id: Date.now().toString(),
      name: newBatch.name,
      description: newBatch.description,
      totalQuestions: newBatch.totalQuestions,
      assignedTo: assignmentDetails.map((a) => a.userName),
      annotators: newBatch.annotators,
      status: "pending",
      createdDate: new Date().toISOString().split("T")[0],
      dueDate: newBatch.dueDate,
      progress: 0,
      priority: newBatch.priority,
      datasetId: newBatch.datasetId,
      datasetName: datasets.find((d) => d.id === newBatch.datasetId)?.name,
      questionRange: { start: newBatch.questionRangeStart, end: newBatch.questionRangeEnd },
      assignmentDetails,
    }

    setBatches([...batches, batch])
    setNewBatch({
      name: "",
      description: "",
      totalQuestions: 0,
      assignedTo: [],
      annotators: 1,
      dueDate: "",
      priority: "medium",
      datasetId: "",
      questionRangeStart: 1,
      questionRangeEnd: 0,
      selectedUsers: [],
      distributionMode: "equal",
      customAssignments: [],
    })
    setIsCreateBatchOpen(false)
  }

  const handleEditBatch = () => {
    if (!selectedBatch || !newBatch.name) return

    setBatches(batches.map((batch) => (batch.id === selectedBatch.id ? { ...batch, ...newBatch } : batch)))
    setIsEditBatchOpen(false)
    setSelectedBatch(null)
  }

  const handleDeleteBatch = (batchId: string) => {
    setBatches(batches.filter((batch) => batch.id !== batchId))
  }

  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setNewBatch({
      name: batch.name,
      description: batch.description,
      totalQuestions: batch.totalQuestions,
      assignedTo: batch.assignedTo,
      annotators: batch.annotators,
      dueDate: batch.dueDate,
      priority: batch.priority,
    })
    setIsEditBatchOpen(true)
  }

  const getStatusBadge = (status: Batch["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        )
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <UserCheck className="w-3 h-3 mr-1" />
            Đang thực hiện
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hoàn thành
          </Badge>
        )
      case "review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Đang review
          </Badge>
        )
    }
  }

  const getPriorityBadge = (priority: Batch["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Cao</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Trung bình</Badge>
      case "low":
        return <Badge variant="secondary">Thấp</Badge>
    }
  }

  const handleAssignUser = (userId: string, checked: boolean) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    if (checked) {
      setNewBatch({
        ...newBatch,
        assignedTo: [...newBatch.assignedTo, user.name],
      })
    } else {
      setNewBatch({
        ...newBatch,
        assignedTo: newBatch.assignedTo.filter((name) => name !== user.name),
      })
    }
  }

  const openBatchAssignmentDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setIsBatchAssignmentOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Batch Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Batch</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">
              {batches.filter((b) => b.status === "in_progress").length} đang thực hiện
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng câu hỏi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, batch) => sum + batch.totalQuestions, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Trong tất cả batch</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.filter((b) => b.status === "completed").length}</div>
            <p className="text-xs text-muted-foreground">Batch đã hoàn thành</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiến độ trung bình</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(batches.reduce((sum, batch) => sum + batch.progress, 0) / batches.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Của tất cả batch</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quản lý Batch gán nhãn</CardTitle>
              <CardDescription>Tạo và quản lý các batch để chia nhỏ công việc gán nhãn</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Shuffle className="h-4 w-4 mr-2" />
                Tự động chia batch
              </Button>
              <Dialog open={isCreateBatchOpen} onOpenChange={setIsCreateBatchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Batch mới
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tạo Batch gán nhãn mới</DialogTitle>
                    <DialogDescription>Chọn dữ liệu và chia nhỏ thành batch để gán cho các labeler</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        1. Chọn bộ dữ liệu
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {datasets.map((dataset) => (
                          <div
                            key={dataset.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              newBatch.datasetId === dataset.id
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            } ${dataset.status !== "ready" ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => dataset.status === "ready" && handleDatasetSelection(dataset.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{dataset.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {dataset.totalQuestions.toLocaleString()} câu hỏi • Tải lên: {dataset.uploadDate}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={dataset.status === "ready" ? "default" : "secondary"}>
                                  {dataset.status === "ready"
                                    ? "Sẵn sàng"
                                    : dataset.status === "processing"
                                      ? "Đang xử lý"
                                      : "Lỗi"}
                                </Badge>
                                {newBatch.datasetId === dataset.id && <CheckCircle className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {newBatch.datasetId && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            2. Cấu hình batch
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="batch-name">Tên Batch</Label>
                              <Input
                                id="batch-name"
                                placeholder="Ví dụ: Batch 001 - Hồ sơ tuyển sinh"
                                value={newBatch.name}
                                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="total-questions">Số câu hỏi trong batch</Label>
                              <Input
                                id="total-questions"
                                type="number"
                                max={datasets.find((d) => d.id === newBatch.datasetId)?.totalQuestions}
                                value={newBatch.totalQuestions || ""}
                                onChange={(e) => {
                                  const value = Number.parseInt(e.target.value) || 0
                                  setNewBatch({
                                    ...newBatch,
                                    totalQuestions: value,
                                    questionRangeEnd: newBatch.questionRangeStart + value - 1,
                                  })
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="range-start">Câu hỏi bắt đầu</Label>
                              <Input
                                id="range-start"
                                type="number"
                                min="1"
                                value={newBatch.questionRangeStart}
                                onChange={(e) => {
                                  const start = Number.parseInt(e.target.value) || 1
                                  setNewBatch({
                                    ...newBatch,
                                    questionRangeStart: start,
                                    questionRangeEnd: start + newBatch.totalQuestions - 1,
                                  })
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="range-end">Câu hỏi kết thúc</Label>
                              <Input
                                id="range-end"
                                type="number"
                                value={newBatch.questionRangeEnd}
                                onChange={(e) => {
                                  const end = Number.parseInt(e.target.value) || 0
                                  setNewBatch({
                                    ...newBatch,
                                    questionRangeEnd: end,
                                    totalQuestions: end - newBatch.questionRangeStart + 1,
                                  })
                                }}
                              />
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label htmlFor="description">Mô tả</Label>
                              <Textarea
                                id="description"
                                placeholder="Mô tả chi tiết về batch này..."
                                value={newBatch.description}
                                onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="due-date">Hạn hoàn thành</Label>
                              <Input
                                id="due-date"
                                type="date"
                                value={newBatch.dueDate}
                                onChange={(e) => setNewBatch({ ...newBatch, dueDate: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="annotators">Số người gán nhãn</Label>
                              <Select
                                value={newBatch.annotators.toString()}
                                onValueChange={(value) =>
                                  setNewBatch({ ...newBatch, annotators: Number.parseInt(value) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 người (Single annotation)</SelectItem>
                                  <SelectItem value="2">2 người (Double annotation)</SelectItem>
                                  <SelectItem value="3">3 người (Triple annotation)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            3. Gán cho Labeler
                          </h3>

                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Label>Chế độ phân chia:</Label>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="distribution"
                                    value="equal"
                                    checked={newBatch.distributionMode === "equal"}
                                    onChange={(e) => setNewBatch({ ...newBatch, distributionMode: "equal" })}
                                  />
                                  Chia đều (mặc định)
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="distribution"
                                    value="custom"
                                    checked={newBatch.distributionMode === "custom"}
                                    onChange={(e) => setNewBatch({ ...newBatch, distributionMode: "custom" })}
                                  />
                                  Tuỳ chỉnh
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              {users
                                .filter((u) => u.role !== "admin")
                                .map((user) => {
                                  const isSelected = newBatch.selectedUsers.includes(user.id)
                                  const assignment =
                                    newBatch.distributionMode === "equal"
                                      ? calculateEqualDistribution().find((a) => a.userId === user.id)
                                      : newBatch.customAssignments.find((a) => a.userId === user.id)

                                  return (
                                    <div
                                      key={user.id}
                                      className={`border rounded-lg p-4 ${isSelected ? "border-primary bg-primary/5" : "border-gray-200"}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            id={user.id}
                                            checked={isSelected}
                                            onCheckedChange={(checked) =>
                                              handleUserSelection(user.id, checked as boolean)
                                            }
                                          />
                                          <div>
                                            <Label htmlFor={user.id} className="font-medium cursor-pointer">
                                              {user.name}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <div className="flex items-center gap-4">
                                            {newBatch.distributionMode === "custom" ? (
                                              <Input
                                                type="number"
                                                placeholder="Số câu hỏi"
                                                className="w-32"
                                                value={assignment?.questionCount || ""}
                                                onChange={(e) => {
                                                  const count = Number.parseInt(e.target.value) || 0
                                                  const updatedAssignments = newBatch.customAssignments.filter(
                                                    (a) => a.userId !== user.id,
                                                  )
                                                  if (count > 0) {
                                                    updatedAssignments.push({ userId: user.id, questionCount: count })
                                                  }
                                                  setNewBatch({ ...newBatch, customAssignments: updatedAssignments })
                                                }}
                                              />
                                            ) : (
                                              <Badge variant="outline">{assignment?.questionCount || 0} câu hỏi</Badge>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>

                            {newBatch.selectedUsers.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4" />
                                  Tóm tắt phân chia
                                </h4>
                                <div className="space-y-2">
                                  {(newBatch.distributionMode === "equal"
                                    ? calculateEqualDistribution()
                                    : newBatch.customAssignments
                                  ).map((assignment) => {
                                    const user = users.find((u) => u.id === assignment.userId)
                                    return (
                                      <div key={assignment.userId} className="flex justify-between text-sm">
                                        <span>{user?.name}</span>
                                        <span className="font-medium">{assignment.questionCount} câu hỏi</span>
                                      </div>
                                    )
                                  })}
                                  <div className="border-t border-blue-200 pt-2 flex justify-between font-medium text-blue-900">
                                    <span>Tổng cộng:</span>
                                    <span>
                                      {(newBatch.distributionMode === "equal"
                                        ? calculateEqualDistribution()
                                        : newBatch.customAssignments
                                      ).reduce((sum, a) => sum + a.questionCount, 0)}{" "}
                                      câu hỏi
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateBatchOpen(false)}>
                      Hủy
                    </Button>
                    <Button
                      onClick={handleCreateBatch}
                      disabled={!newBatch.datasetId || newBatch.selectedUsers.length === 0}
                    >
                      Tạo Batch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Dữ liệu gốc</TableHead>
                <TableHead>Gán cho</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead>Hạn hoàn thành</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{batch.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {batch.totalQuestions.toLocaleString()} câu hỏi
                          {batch.questionRange && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              #{batch.questionRange.start}-{batch.questionRange.end}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{batch.datasetName || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">Dataset ID: {batch.datasetId || "N/A"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {batch.assignedTo.map((name, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      <div className="text-xs text-muted-foreground">{batch.annotators} người gán nhãn</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${batch.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{batch.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {batch.dueDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openBatchAssignmentDialog(batch)}>
                          <Users className="mr-2 h-4 w-4" />
                          Chi tiết phân công
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteBatch(batch.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa batch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isBatchAssignmentOpen} onOpenChange={setIsBatchAssignmentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phân công - {selectedBatch?.name}</DialogTitle>
            <DialogDescription>Xem chi tiết cách phân chia câu hỏi cho từng labeler</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Tổng câu hỏi:</Label>
                  <p className="text-lg font-bold">{selectedBatch.totalQuestions.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phạm vi:</Label>
                  <p className="text-lg font-bold">
                    #{selectedBatch.questionRange?.start} - #{selectedBatch.questionRange?.end}
                  </p>
                </div>
              </div>

              {selectedBatch.assignmentDetails && (
                <div className="space-y-3">
                  <h4 className="font-medium">Phân công chi tiết:</h4>
                  {selectedBatch.assignmentDetails.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h5 className="font-medium">{assignment.userName}</h5>
                            <p className="text-sm text-muted-foreground">{assignment.questionCount} câu hỏi được gán</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          #{assignment.questionRange.start} - #{assignment.questionRange.end}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchAssignmentOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={isEditBatchOpen} onOpenChange={setIsEditBatchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Batch</DialogTitle>
            <DialogDescription>Cập nhật thông tin batch gán nhãn</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-batch-name">Tên Batch</Label>
              <Input
                id="edit-batch-name"
                value={newBatch.name}
                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total-questions">Số câu hỏi</Label>
              <Input
                id="edit-total-questions"
                type="number"
                value={newBatch.totalQuestions || ""}
                onChange={(e) => setNewBatch({ ...newBatch, totalQuestions: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={newBatch.description}
                onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Hạn hoàn thành</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={newBatch.dueDate}
                onChange={(e) => setNewBatch({ ...newBatch, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Độ ưu tiên</Label>
              <Select
                value={newBatch.priority}
                onValueChange={(value: Batch["priority"]) => setNewBatch({ ...newBatch, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBatchOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditBatch}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
