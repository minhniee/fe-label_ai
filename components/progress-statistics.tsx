"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { TrendingUp, Users, Target, Clock, Award, CheckCircle } from "lucide-react"

export function ProgressStatistics() {
  // Mock statistics data
  const overallStats = {
    totalQuestions: 5000,
    labeledQuestions: 3400,
    totalLabelers: 4,
    activeLabelers: 3,
    averageAccuracy: 93.2,
    completionRate: 68,
  }

  const labelerPerformance = [
    {
      id: "1",
      name: "Nguyễn Thị Lan",
      role: "Senior Labeler",
      completed: 480,
      assigned: 500,
      accuracy: 96.5,
      avgTimePerLabel: 2.3,
      status: "active",
    },
    {
      id: "2",
      name: "Trần Văn Minh",
      role: "Labeler",
      completed: 285,
      assigned: 300,
      accuracy: 94.2,
      avgTimePerLabel: 3.1,
      status: "active",
    },
    {
      id: "3",
      name: "Lê Thị Hoa",
      role: "Labeler",
      completed: 240,
      assigned: 250,
      accuracy: 92.8,
      avgTimePerLabel: 2.8,
      status: "active",
    },
    {
      id: "4",
      name: "Phạm Văn Đức",
      role: "Labeler",
      completed: 180,
      assigned: 200,
      accuracy: 89.5,
      avgTimePerLabel: 4.2,
      status: "inactive",
    },
  ]

  const labelDistribution = [
    { name: "Tiềm năng cao", value: 1200, color: "#22c55e" },
    { name: "Tiềm năng trung bình", value: 1500, color: "#eab308" },
    { name: "Tiềm năng thấp", value: 500, color: "#ef4444" },
    { name: "Cần xem xét", value: 200, color: "#3b82f6" },
  ]

  const dailyProgress = [
    { date: "2024-01-10", labeled: 120 },
    { date: "2024-01-11", labeled: 150 },
    { date: "2024-01-12", labeled: 180 },
    { date: "2024-01-13", labeled: 200 },
    { date: "2024-01-14", labeled: 160 },
    { date: "2024-01-15", labeled: 190 },
  ]

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 95) return "text-green-600"
    if (accuracy >= 90) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Hoạt động</Badge>
    ) : (
      <Badge variant="secondary">Không hoạt động</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng câu hỏi</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalQuestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cần gán nhãn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.labeledQuestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{overallStats.completionRate}% hoàn thành</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người gán nhãn</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.activeLabelers}</div>
            <p className="text-xs text-muted-foreground">/{overallStats.totalLabelers} đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Độ chính xác TB</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{overallStats.averageAccuracy}%</div>
            <p className="text-xs text-muted-foreground">Trung bình tất cả</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Còn lại</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(overallStats.totalQuestions - overallStats.labeledQuestions).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Câu hỏi chưa gán nhãn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiến độ</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.completionRate}%</div>
            <Progress value={overallStats.completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Label Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố nhãn</CardTitle>
            <CardDescription>Tỷ lệ các loại nhãn đã được gán</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={labelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {labelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), "Số lượng"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {labelDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm text-muted-foreground">({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Progress Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ hàng ngày</CardTitle>
            <CardDescription>Số lượng câu hỏi được gán nhãn mỗi ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => value.split("-")[2]} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, "Câu hỏi"]}
                    labelFormatter={(label) => `Ngày: ${label}`}
                  />
                  <Bar dataKey="labeled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labeler Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất từng labeler</CardTitle>
          <CardDescription>Bảng chi tiết hiệu suất công việc của từng người gán nhãn</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead>Độ chính xác</TableHead>
                <TableHead>Thời gian TB/nhãn</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labelerPerformance.map((labeler) => (
                <TableRow key={labeler.id}>
                  <TableCell className="font-medium">{labeler.name}</TableCell>
                  <TableCell>
                    <Badge variant={labeler.role === "Senior Labeler" ? "default" : "secondary"}>{labeler.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {labeler.completed}/{labeler.assigned}
                        </span>
                        <span>{Math.round((labeler.completed / labeler.assigned) * 100)}%</span>
                      </div>
                      <Progress value={(labeler.completed / labeler.assigned) * 100} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getPerformanceColor(labeler.accuracy)}`}>{labeler.accuracy}%</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{labeler.avgTimePerLabel} phút</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(labeler.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
