"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database, Search, FileSpreadsheet, RefreshCw, Sparkles } from "lucide-react"

interface Dataset {
  id: string
  name: string
  status: string
  recordCount: number
}

export function DataLabelingInterface() {
  const [selectedDataset, setSelectedDataset] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const mockDatasets: Dataset[] = [
    {
      id: "ds001",
      name: "Tuyển sinh Kỳ 1 - 2024",
      status: "ready",
      recordCount: 2000,
    },
    {
      id: "ds002",
      name: "Tuyển sinh Kỳ 2 - 2024",
      status: "processing",
      recordCount: 1500,
    },
  ]

  const recordsPerPage = 50
  const totalRecords = 100
  const totalPages = Math.ceil(totalRecords / recordsPerPage)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chọn Dataset
          </CardTitle>
          <CardDescription>Chọn bộ dữ liệu để bắt đầu gán nhãn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dataset</Label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn dataset..." />
              </SelectTrigger>
              <SelectContent>
                {mockDatasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDataset && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Dữ liệu
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Suggestions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Đang tải dữ liệu...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p>Dữ liệu mẫu sẽ hiển thị ở đây</p>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {(currentPage - 1) * recordsPerPage + 1} -{" "}
                      {Math.min(currentPage * recordsPerPage, totalRecords)} trong tổng số {totalRecords} bản ghi
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
