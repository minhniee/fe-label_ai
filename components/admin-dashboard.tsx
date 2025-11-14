"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Database, Tag, Users, FileText, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function AdminDashboard() {
  // Mock data for statistics
  const stats = {
    totalDatasets: 12,
    labelingProgress: 68,
    activeLabelers: 8,
    latestVersion: "v2.1",
    completedBatches: 34,
    pendingBatches: 16,
    totalQuestions: 5000,
    labeledQuestions: 3400,
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        
      </div>
      

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bộ dữ liệu</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDatasets}</div>
            <p className="text-xs text-muted-foreground">Phiên bản mới nhất: {stats.latestVersion}</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiến độ gán nhãn</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.labelingProgress}%</div>
            <Progress value={stats.labelingProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.labeledQuestions}/{stats.totalQuestions} câu hỏi
            </p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người gán nhãn</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeLabelers}</div>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batch hoàn thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.completedBatches}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingBatches} đang chờ xử lý</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hoạt động gần đây
            </CardTitle>
            <CardDescription>Các hoạt động mới nhất trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dữ liệu v2.1 được tải lên</p>
                  <p className="text-xs text-muted-foreground">2 giờ trước</p>
                </div>
              </div>
              <Badge variant="secondary">Mới</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-full">
                  <Tag className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Batch #34 hoàn thành gán nhãn</p>
                  <p className="text-xs text-muted-foreground">4 giờ trước</p>
                </div>
              </div>
              <Badge variant="outline">Hoàn thành</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-chart-3/10 p-2 rounded-full">
                  <TrendingUp className="h-4 w-4 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm font-medium">Model v1.5 đạt accuracy 94.2%</p>
                  <p className="text-xs text-muted-foreground">1 ngày trước</p>
                </div>
              </div>
              <Badge className="bg-chart-3 text-white">Thành công</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-destructive/10 p-2 rounded-full">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cần review batch #35</p>
                  <p className="text-xs text-muted-foreground">2 ngày trước</p>
                </div>
              </div>
              <Badge variant="destructive">Cần xử lý</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tổng quan tiến độ
            </CardTitle>
            <CardDescription>Thống kê chi tiết về quá trình gán nhãn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Dữ liệu đã gán nhãn</span>
                <span className="text-sm text-muted-foreground">{stats.labelingProgress}%</span>
              </div>
              <Progress value={stats.labelingProgress} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Batch đã hoàn thành</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((stats.completedBatches / (stats.completedBatches + stats.pendingBatches)) * 100)}%
                </span>
              </div>
              <Progress
                value={(stats.completedBatches / (stats.completedBatches + stats.pendingBatches)) * 100}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.completedBatches}</div>
                <div className="text-xs text-muted-foreground">Hoàn thành</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.pendingBatches}</div>
                <div className="text-xs text-muted-foreground">Đang xử lý</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
