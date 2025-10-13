"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, Award, Target, Zap } from "lucide-react"

interface ModelMetrics {
  id: string
  name: string
  version: string
  accuracy: number
  f1Score: number
  precision: number
  recall: number
  trainingTime: number
  dataVersion: string
  trainDate: string
}

export function ModelComparison() {
  const [selectedMetric, setSelectedMetric] = useState<string>("accuracy")

  // Mock model data
  const models: ModelMetrics[] = [
    {
      id: "1",
      name: "FPTU Admission Classifier",
      version: "v1.5",
      accuracy: 94.2,
      f1Score: 93.8,
      precision: 94.5,
      recall: 93.1,
      trainingTime: 135,
      dataVersion: "v2.1",
      trainDate: "2024-01-15",
    },
    {
      id: "2",
      name: "FPTU Admission Classifier",
      version: "v1.4",
      accuracy: 91.8,
      f1Score: 91.2,
      precision: 92.1,
      recall: 90.3,
      trainingTime: 105,
      dataVersion: "v2.0",
      trainDate: "2024-01-10",
    },
    {
      id: "3",
      name: "FPTU Admission Classifier",
      version: "v1.3",
      accuracy: 89.5,
      f1Score: 88.9,
      precision: 90.2,
      recall: 87.6,
      trainingTime: 90,
      dataVersion: "v1.9",
      trainDate: "2024-01-05",
    },
    {
      id: "4",
      name: "FPTU Admission Classifier",
      version: "v1.2",
      accuracy: 87.3,
      f1Score: 86.8,
      precision: 88.1,
      recall: 85.5,
      trainingTime: 75,
      dataVersion: "v1.8",
      trainDate: "2023-12-28",
    },
    {
      id: "5",
      name: "FPTU Admission Classifier",
      version: "v1.1",
      accuracy: 85.1,
      f1Score: 84.5,
      precision: 86.2,
      recall: 82.8,
      trainingTime: 60,
      dataVersion: "v1.7",
      trainDate: "2023-12-20",
    },
  ]

  // Prepare chart data
  const chartData = models.map((model) => ({
    version: model.version,
    accuracy: model.accuracy,
    f1Score: model.f1Score,
    precision: model.precision,
    recall: model.recall,
  }))

  const timelineData = models.map((model) => ({
    date: model.trainDate,
    version: model.version,
    accuracy: model.accuracy,
    trainingTime: model.trainingTime,
  }))

  const getBestModel = (metric: keyof ModelMetrics) => {
    return models.reduce((best, current) => {
      if (typeof current[metric] === "number" && typeof best[metric] === "number") {
        return current[metric] > best[metric] ? current : best
      }
      return best
    })
  }

  const getMetricColor = (value: number, metric: string) => {
    if (metric === "trainingTime") {
      return value <= 90 ? "text-green-600" : value <= 120 ? "text-yellow-600" : "text-red-600"
    }
    return value >= 94 ? "text-green-600" : value >= 90 ? "text-yellow-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mô hình tốt nhất</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{getBestModel("accuracy").version}</div>
            <p className="text-xs text-muted-foreground">Accuracy: {getBestModel("accuracy").accuracy}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy cao nhất</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{Math.max(...models.map((m) => m.accuracy))}%</div>
            <p className="text-xs text-muted-foreground">
              Cải thiện +
              {(Math.max(...models.map((m) => m.accuracy)) - Math.min(...models.map((m) => m.accuracy))).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">F1-Score cao nhất</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{Math.max(...models.map((m) => m.f1Score))}%</div>
            <p className="text-xs text-muted-foreground">Mô hình {getBestModel("f1Score").version}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huấn luyện nhanh nhất</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{Math.min(...models.map((m) => m.trainingTime))}m</div>
            <p className="text-xs text-muted-foreground">
              Mô hình {models.find((m) => m.trainingTime === Math.min(...models.map((m) => m.trainingTime)))?.version}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>So sánh hiệu suất mô hình</CardTitle>
              <CardDescription>Biểu đồ so sánh các chỉ số đánh giá qua các phiên bản</CardDescription>
            </div>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn chỉ số" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accuracy">Accuracy</SelectItem>
                <SelectItem value="f1Score">F1-Score</SelectItem>
                <SelectItem value="precision">Precision</SelectItem>
                <SelectItem value="recall">Recall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="version" />
                <YAxis domain={[80, 100]} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, selectedMetric]}
                  labelFormatter={(label) => `Phiên bản: ${label}`}
                />
                <Bar dataKey={selectedMetric} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng cải thiện theo thời gian</CardTitle>
          <CardDescription>Biểu đồ đường thể hiện sự cải thiện accuracy qua thời gian</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData.reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="version" />
                <YAxis domain={[80, 100]} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Accuracy"]}
                  labelFormatter={(label) => `Phiên bản: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bảng so sánh chi tiết</CardTitle>
          <CardDescription>So sánh tất cả các chỉ số của các mô hình</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phiên bản</TableHead>
                <TableHead>Dữ liệu</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>F1-Score</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead>Recall</TableHead>
                <TableHead>Thời gian huấn luyện</TableHead>
                <TableHead>Ngày huấn luyện</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.version}</span>
                      {model.version === "v1.5" && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tốt nhất</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{model.dataVersion}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getMetricColor(model.accuracy, "accuracy")}`}>
                      {model.accuracy}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getMetricColor(model.f1Score, "f1Score")}`}>{model.f1Score}%</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getMetricColor(model.precision, "precision")}`}>
                      {model.precision}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getMetricColor(model.recall, "recall")}`}>{model.recall}%</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getMetricColor(model.trainingTime, "trainingTime")}`}>
                      {model.trainingTime}m
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{model.trainDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
