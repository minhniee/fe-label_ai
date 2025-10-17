"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, User, MessageCircle, Search, Bell } from "lucide-react"
import { ChatPanel } from "@/components/chat-panel"

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Mock data for user tasks
  const userTasks = [
    {
      id: 1,
      title: "Gán nhãn hồ sơ tuyển sinh - Batch A1",
      description: "Xem xét và gán nhãn cho 250 hồ sơ tuyển sinh khối A",
      assignedBy: "Nguyễn Văn Admin",
      assignedTo: "Bạn",
      priority: "high",
      status: "in-progress",
      progress: 65,
      dueDate: "2024-01-15",
      questionsTotal: 250,
      questionsCompleted: 163,
      estimatedTime: "4 giờ",
      tags: ["Khối A", "Tuyển sinh 2024"],
    },
    {
      id: 2,
      title: "Kiểm tra chất lượng gán nhãn - Batch B2",
      description: "Rà soát và xác nhận nhãn cho 150 hồ sơ đã được gán nhãn",
      assignedBy: "Trần Thị Manager",
      assignedTo: "Bạn",
      priority: "urgent",
      status: "pending",
      progress: 0,
      dueDate: "2024-01-12",
      questionsTotal: 150,
      questionsCompleted: 0,
      estimatedTime: "3 giờ",
      tags: ["Khối B", "Kiểm tra chất lượng"],
    },
    {
      id: 3,
      title: "Gán nhãn hồ sơ tuyển sinh - Batch C1",
      description: "Xem xét và gán nhãn cho 180 hồ sơ tuyển sinh khối C",
      assignedBy: "Lê Văn Senior",
      assignedTo: "Bạn",
      priority: "normal",
      status: "completed",
      progress: 100,
      dueDate: "2024-01-10",
      questionsTotal: 180,
      questionsCompleted: 180,
      estimatedTime: "3.5 giờ",
      tags: ["Khối C", "Hoàn thành"],
    },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Khẩn cấp"
      case "high":
        return "Cao"
      case "normal":
        return "Bình thường"
      case "low":
        return "Thấp"
      default:
        return "Không xác định"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
        return "bg-gray-100 text-gray-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành"
      case "in-progress":
        return "Đang thực hiện"
      case "pending":
        return "Chờ xử lý"
      case "overdue":
        return "Quá hạn"
      default:
        return "Không xác định"
    }
  }

  const filteredTasks = userTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority
    return matchesSearch && matchesPriority
  })

  return (
    <div className="space-y-6">
      {/* Main Content */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            {/* Search and Filter */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search for quest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tất cả mức độ</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Cao</option>
                <option value="normal">Bình thường</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng nhiệm vụ</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Đang thực hiện</p>
                    <p className="text-2xl font-bold text-yellow-600">3</p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Hoàn thành</p>
                    <p className="text-2xl font-bold text-green-600">8</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Quá hạn</p>
                    <p className="text-2xl font-bold text-red-600">1</p>
                  </div>
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Bell className="h-4 w-4 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <Badge className={getPriorityColor(task.priority)}>{getPriorityText(task.priority)}</Badge>
                        <Badge className={getStatusColor(task.status)}>{getStatusText(task.status)}</Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{task.description}</p>

                      {/* Task Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>Giao bởi: {task.assignedBy}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Hạn: {new Date(task.dueDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Ước tính: {task.estimatedTime}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Tiến độ</span>
                          <span className="text-sm text-gray-600">
                            {task.questionsCompleted}/{task.questionsTotal} câu hỏi ({task.progress}%)
                          </span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-2 mb-4">
                        {task.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {task.status === "pending" && <Button size="sm">Bắt đầu</Button>}
                      {task.status === "in-progress" && <Button size="sm">Tiếp tục</Button>}
                      {task.status === "completed" && (
                        <Button size="sm" variant="outline">
                          Xem chi tiết
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      {/* Chat Panel */}
      {isChatOpen && <ChatPanel onClose={() => setIsChatOpen(false)} />}
    </div>
  )
}


