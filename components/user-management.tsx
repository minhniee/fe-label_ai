"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Users, Plus, MoreHorizontal, Edit, Trash2, Shield, Mail, Calendar } from "lucide-react"

interface UserManagementUser {
  id: string
  name: string
  email: string
  role: "admin" | "labeler" | "senior_labeler"
  status: "active" | "inactive"
  joinDate: string
  lastLogin: string
  totalLabeled: number
  accuracy: number
}

export function UserManagement() {
  const [users, setUsers] = useState<UserManagementUser[]>([
    {
      id: "1",
      name: "Nguyễn Văn Admin",
      email: "admin@fpt.edu.vn",
      role: "admin",
      status: "active",
      joinDate: "2023-12-01",
      lastLogin: "2024-01-15 16:30",
      totalLabeled: 0,
      accuracy: 0,
    },
    {
      id: "2",
      name: "Nguyễn Thị Lan",
      email: "lan.nguyen@fpt.edu.vn",
      role: "senior_labeler",
      status: "active",
      joinDate: "2024-01-01",
      lastLogin: "2024-01-15 14:30",
      totalLabeled: 480,
      accuracy: 96.5,
    },
    {
      id: "3",
      name: "Trần Văn Minh",
      email: "minh.tran@fpt.edu.vn",
      role: "labeler",
      status: "active",
      joinDate: "2024-01-05",
      lastLogin: "2024-01-15 13:45",
      totalLabeled: 285,
      accuracy: 94.2,
    },
    {
      id: "4",
      name: "Lê Thị Hoa",
      email: "hoa.le@fpt.edu.vn",
      role: "labeler",
      status: "active",
      joinDate: "2024-01-08",
      lastLogin: "2024-01-15 12:20",
      totalLabeled: 240,
      accuracy: 92.8,
    },
    {
      id: "5",
      name: "Phạm Văn Đức",
      email: "duc.pham@fpt.edu.vn",
      role: "labeler",
      status: "inactive",
      joinDate: "2024-01-10",
      lastLogin: "2024-01-14 16:00",
      totalLabeled: 180,
      accuracy: 89.5,
    },
  ])

  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "labeler" as UserManagementUser["role"],
  })

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return

    const user: UserManagementUser = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "active",
      joinDate: new Date().toISOString().split("T")[0],
      lastLogin: "Chưa đăng nhập",
      totalLabeled: 0,
      accuracy: 0,
    }

    setUsers([...users, user])
    setNewUser({ name: "", email: "", role: "labeler" })
    setIsAddUserOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: user.status === "active" ? "inactive" : "active" } : user,
      ),
    )
  }

  const getRoleBadge = (role: UserManagementUser["role"]) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Admin</Badge>
      case "senior_labeler":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Senior Labeler</Badge>
      case "labeler":
        return <Badge variant="secondary">Labeler</Badge>
    }
  }

  const getStatusBadge = (status: UserManagementUser["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Hoạt động</Badge>
      case "inactive":
        return <Badge variant="secondary">Không hoạt động</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter((u) => u.status === "active").length} đang hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>
            <p className="text-xs text-muted-foreground">Quản trị viên</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senior Labeler</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "senior_labeler").length}</div>
            <p className="text-xs text-muted-foreground">Người gán nhãn cao cấp</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labeler</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "labeler").length}</div>
            <p className="text-xs text-muted-foreground">Người gán nhãn</p>
          </CardContent>
        </Card>
      </div>

      {/* Add User Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách người dùng</CardTitle>
              <CardDescription>Quản lý tài khoản và phân quyền người dùng trong hệ thống</CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm người dùng
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm người dùng mới</DialogTitle>
                  <DialogDescription>Tạo tài khoản mới cho người dùng trong hệ thống</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ tên</Label>
                    <Input
                      id="name"
                      placeholder="Nhập họ tên"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@fpt.edu.vn"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: UserManagementUser["role"]) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="senior_labeler">Senior Labeler</SelectItem>
                        <SelectItem value="labeler">Labeler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleAddUser}>Thêm người dùng</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Đã gán nhãn</TableHead>
                <TableHead>Độ chính xác</TableHead>
                <TableHead>Đăng nhập cuối</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{user.totalLabeled.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    {user.accuracy > 0 ? (
                      <span
                        className={`font-medium ${user.accuracy >= 95 ? "text-green-600" : user.accuracy >= 90 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {user.accuracy}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {user.lastLogin}
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
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                          <Mail className="mr-2 h-4 w-4" />
                          {user.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.role === "admin"}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa người dùng
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
    </div>
  )
}
