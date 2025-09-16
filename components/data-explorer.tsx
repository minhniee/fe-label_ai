"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, Download, Edit, History, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"

interface DataRecord {
  id: string
  studentId: string
  name: string
  email: string
  phone: string
  program: string
  score: number
  status: "pending" | "approved" | "rejected"
  submissionDate: string
  lastModified: string
  modifiedBy: string
}

export function DataExplorer() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProgram, setSelectedProgram] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)

  // Mock data
  const [data] = useState<DataRecord[]>([
    {
      id: "1",
      studentId: "SV001",
      name: "Nguyễn Văn An",
      email: "an.nguyen@student.fpt.edu.vn",
      phone: "0901234567",
      program: "Công nghệ thông tin",
      score: 8.5,
      status: "approved",
      submissionDate: "2024-01-15",
      lastModified: "2024-01-16",
      modifiedBy: "admin@fpt.edu.vn",
    },
    {
      id: "2",
      studentId: "SV002",
      name: "Trần Thị Bình",
      email: "binh.tran@student.fpt.edu.vn",
      phone: "0901234568",
      program: "Kinh doanh quốc tế",
      score: 7.8,
      status: "pending",
      submissionDate: "2024-01-14",
      lastModified: "2024-01-14",
      modifiedBy: "system",
    },
    {
      id: "3",
      studentId: "SV003",
      name: "Lê Văn Cường",
      email: "cuong.le@student.fpt.edu.vn",
      phone: "0901234569",
      program: "Thiết kế đồ họa",
      score: 6.2,
      status: "rejected",
      submissionDate: "2024-01-13",
      lastModified: "2024-01-15",
      modifiedBy: "admin@fpt.edu.vn",
    },
    {
      id: "4",
      studentId: "SV004",
      name: "Phạm Thị Dung",
      email: "dung.pham@student.fpt.edu.vn",
      phone: "0901234570",
      program: "Công nghệ thông tin",
      score: 9.1,
      status: "approved",
      submissionDate: "2024-01-12",
      lastModified: "2024-01-13",
      modifiedBy: "admin@fpt.edu.vn",
    },
    {
      id: "5",
      studentId: "SV005",
      name: "Hoàng Văn Em",
      email: "em.hoang@student.fpt.edu.vn",
      phone: "0901234571",
      program: "Marketing",
      score: 7.5,
      status: "pending",
      submissionDate: "2024-01-11",
      lastModified: "2024-01-11",
      modifiedBy: "system",
    },
  ])

  const programs = ["Công nghệ thông tin", "Kinh doanh quốc tế", "Thiết kế đồ họa", "Marketing"]
  const itemsPerPage = 10
  const totalPages = Math.ceil(data.length / itemsPerPage)

  const filteredData = data.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesProgram = selectedProgram === "all" || record.program === selectedProgram
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus

    return matchesSearch && matchesProgram && matchesStatus
  })

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getStatusBadge = (status: DataRecord["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Đã duyệt</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Chờ duyệt</Badge>
      case "rejected":
        return <Badge variant="destructive">Từ chối</Badge>
    }
  }

  const handleCellEdit = (id: string, field: string, value: string) => {
    // TODO: Implement cell editing logic
    console.log("Edit cell:", { id, field, value })
    setEditingCell(null)
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Khám phá dữ liệu
          </CardTitle>
          <CardDescription>Tìm kiếm, lọc và chỉnh sửa dữ liệu tuyển sinh một cách trực quan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã sinh viên, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Chọn ngành học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành học</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất dữ liệu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bảng dữ liệu</CardTitle>
              <CardDescription>
                Hiển thị {filteredData.length} bản ghi (trang {currentPage} / {totalPages})
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc nâng cao
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SV</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ngành học</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày nộp</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentId}</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell className="text-muted-foreground">{record.email}</TableCell>
                    <TableCell>{record.program}</TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${record.score >= 8 ? "text-green-600" : record.score >= 7 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {record.score}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{record.submissionDate}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            Lịch sử thay đổi
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Xóa bản ghi</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} trong tổng số {filteredData.length} bản ghi
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
        </CardContent>
      </Card>
    </div>
  )
}
