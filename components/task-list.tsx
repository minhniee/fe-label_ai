"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, User, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Task {
  id: number
  title: string
  description: string
  assignedBy: string
  assignedTo: string
  priority: "urgent" | "high" | "normal" | "low"
  status: "pending" | "in-progress" | "completed" | "overdue"
  progress: number
  dueDate: string
  questionsTotal: number
  questionsCompleted: number
  estimatedTime: string
  tags: string[]
}

interface TaskListProps {
  tasks: Task[]
  onTaskAction: (taskId: number, action: string) => void
}

export function TaskList({ tasks, onTaskAction }: TaskListProps) {
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && status !== "completed"
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className={`hover:shadow-md transition-shadow ${isOverdue(task.dueDate) ? "border-red-200 bg-red-50" : ""}`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <Badge className={getPriorityColor(task.priority)}>{getPriorityText(task.priority)}</Badge>
                  <Badge className={getStatusColor(task.status)}>{getStatusText(task.status)}</Badge>
                  {isOverdue(task.dueDate) && <Badge className="bg-red-100 text-red-800">Quá hạn</Badge>}
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
                <div className="flex items-center gap-2">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                {task.status === "pending" && (
                  <Button size="sm" onClick={() => onTaskAction(task.id, "start")}>
                    Bắt đầu
                  </Button>
                )}
                {task.status === "in-progress" && (
                  <Button size="sm" onClick={() => onTaskAction(task.id, "continue")}>
                    Tiếp tục
                  </Button>
                )}
                {task.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => onTaskAction(task.id, "view")}>
                    Xem chi tiết
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTaskAction(task.id, "edit")}>Chỉnh sửa</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTaskAction(task.id, "duplicate")}>Nhân bản</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTaskAction(task.id, "archive")}>Lưu trữ</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
