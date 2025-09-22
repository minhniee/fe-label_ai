"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, ChevronLeft, ChevronRight, Trash2, Database, RefreshCw } from "lucide-react"
import { getDatasets, deleteDataset, type Dataset } from "@/api/datasets"

interface DatasetRecord extends Dataset {
  created_by_username: string
  version_count: number
  latest_version: number
}

export function DataExplorer() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [datasets, setDatasets] = useState<DatasetRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingDataset, setDeletingDataset] = useState<DatasetRecord | null>(null)

  const itemsPerPage = 10
  const totalPages = Math.ceil(datasets.length / itemsPerPage)

  // Load datasets on mount
  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      setError("")
      const data = await getDatasets()
      setDatasets(data as DatasetRecord[])
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách datasets")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (dataset: DatasetRecord) => {
    setDeletingDataset(dataset)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingDataset) return

    try {
      await deleteDataset(deletingDataset.dataset_id)
      setDatasets(datasets.filter(d => d.dataset_id !== deletingDataset.dataset_id))
      setIsDeleteOpen(false)
      setDeletingDataset(null)
    } catch (err: any) {
      setError(err?.message || "Xóa dataset thất bại")
    }
  }

  const filteredData = datasets.filter((dataset) => {
    const matchesSearch =
      dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.created_by_username.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên dataset, mô tả, người tạo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" onClick={loadDatasets}>
              <RefreshCw />
            </Button>
          </div>
          {error && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}


      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách Dataset</CardTitle>
              <CardDescription>
                Hiển thị {filteredData.length} dataset (trang {currentPage} / {totalPages})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Dataset</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Versions</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((dataset) => (
                    <TableRow key={dataset.dataset_id}>
                      <TableCell className="font-medium">{dataset.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {dataset.description || "Không có mô tả"}
                      </TableCell>
                      <TableCell>{dataset.created_by_username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dataset.version_count} versions 
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(dataset.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(dataset.updated_at)}
                      </TableCell>
                      <TableCell>
                            <Badge 
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleDeleteClick(dataset)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa dataset
                            </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} trong tổng số {filteredData.length} dataset
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa dataset</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa dataset "{deletingDataset?.name}"? 
              Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Xóa dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
