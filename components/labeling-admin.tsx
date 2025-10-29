"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Package, Clock, CheckCircle, Plus, Eye, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Labeler {
  id: string
  name: string
  email: string
  role: "labeler" | "senior_labeler"
  assigned: number
  completed: number
  accuracy: number
  lastActive: string
  status: "active" | "inactive"
}

interface Batch {
  id: string
  name: string
  totalQuestions: number
  assignedTo: string[]
  completed: number
  status: "pending" | "in_progress" | "completed" | "review"
  createdDate: string
  dueDate: string
}

export function LabelingAdmin() {
  const { toast } = useToast()
  const [selectedLabeler, setSelectedLabeler] = useState<string>("")
  const [batchSize, setBatchSize] = useState<string>("100")

  // Mock data
  const [labelers] = useState<Labeler[]>([
    {
      id: "1",
      name: "Nguyễn Thị Lan",
      email: "lan.nguyen@fpt.edu.vn",
      role: "senior_labeler",
      assigned: 500,
      completed: 480,
      accuracy: 96.5,
      lastActive: "2024-01-15 14:30",
      status: "active",
    },
    {
      id: "2",
      name: "Trần Văn Minh",
      email: "minh.tran@fpt.edu.vn",
      role: "labeler",
      assigned: 300,
      completed: 285,
      accuracy: 94.2,
      lastActive: "2024-01-15 13:45",
      status: "active",
    },
    {
      id: "3",
      name: "Lê Thị Hoa",
      email: "hoa.le@fpt.edu.vn",
      role: "labeler",
      assigned: 250,
      completed: 240,
      accuracy: 92.8,
      lastActive: "2024-01-15 12:20",
      status: "active",
    },
    {
      id: "4",
      name: "Phạm Văn Đức",
      email: "duc.pham@fpt.edu.vn",
      role: "labeler",
      assigned: 200,
      completed: 180,
      accuracy: 89.5,
      lastActive: "2024-01-14 16:00",
      status: "inactive",
    },
  ])

  const [batches] = useState<Batch[]>([
    {
      id: "B001",
      name: "Batch Tuyển sinh Q1 2024",
      totalQuestions: 500,
      assignedTo: ["Nguyễn Thị Lan", "Trần Văn Minh"],
      completed: 480,
      status: "in_progress",
      createdDate: "2024-01-10",
      dueDate: "2024-01-20",
    },
    {
      id: "B002",
      name: "Batch Đánh giá năng lực",
      totalQuestions: 300,
      assignedTo: ["Lê Thị Hoa"],
      completed: 300,
      status: "completed",
      createdDate: "2024-01-05",
      dueDate: "2024-01-15",
    },
    {
      id: "B003",
      name: "Batch Xét tuyển đặc biệt",
      totalQuestions: 150,
      assignedTo: ["Phạm Văn Đức"],
      completed: 0,
      status: "pending",
      createdDate: "2024-01-15",
      dueDate: "2024-01-25",
    },
  ])

  const getStatusBadge = (status: Batch["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In progress</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "review":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">In review</Badge>
    }
  }

  const getLabelerStatusBadge = (status: Labeler["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
    }
  }

  const handleAssignBatch = () => {
    // TODO: Implement batch assignment logic
    toast({ title: "Assigning batch successfully!" })
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total labelers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelers.length}</div>
            <p className="text-xs text-muted-foreground">
              {labelers.filter((l) => l.status === "active").length} active
            </p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">
              {batches.filter((b) => b.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.filter((b) => b.status === "in_progress").length}</div>
            <p className="text-xs text-muted-foreground">batches in progress</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. accuracy</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(labelers.reduce((acc, l) => acc + l.accuracy, 0) / labelers.length).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">across all labelers</p>
          </CardContent>
        </Card>
      </div>

      {/* Assign New Batch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Assign new task
          </CardTitle>
          <CardDescription>Create and assign labeling batches to labelers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labeler-select">Select labeler</Label>
              <Select value={selectedLabeler} onValueChange={setSelectedLabeler}>
                <SelectTrigger>
                  <SelectValue placeholder="Select labeler" />
                </SelectTrigger>
                <SelectContent>
                  {labelers
                    .filter((l) => l.status === "active")
                    .map((labeler) => (
                      <SelectItem key={labeler.id} value={labeler.id}>
                        {labeler.name} ({labeler.accuracy}% accuracy)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-size">Number of questions</Label>
              <Input
                id="batch-size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssignBatch} disabled={!selectedLabeler || !batchSize} className="w-full">
                Assign task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labeler Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Labeler performance</CardTitle>
          <CardDescription>Track progress and quality for each labeler</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labelers.map((labeler) => (
                <TableRow key={labeler.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{labeler.name}</div>
                      <div className="text-sm text-muted-foreground">{labeler.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={labeler.role === "senior_labeler" ? "default" : "secondary"}>
                      {labeler.role === "senior_labeler" ? "Senior" : "Labeler"}
                    </Badge>
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
                    <span
                      className={`font-medium ${labeler.accuracy >= 95 ? "text-green-600" : labeler.accuracy >= 90 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {labeler.accuracy}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{labeler.lastActive}</TableCell>
                  <TableCell>{getLabelerStatusBadge(labeler.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Management */}
      <Card>
        <CardHeader>
          <CardTitle>Batch management</CardTitle>
          <CardDescription>List of labeling batches and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Batch name</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.id}</TableCell>
                  <TableCell>{batch.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {batch.assignedTo.map((name, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {batch.completed}/{batch.totalQuestions}
                        </span>
                        <span>{Math.round((batch.completed / batch.totalQuestions) * 100)}%</span>
                      </div>
                      <Progress value={(batch.completed / batch.totalQuestions) * 100} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{batch.dueDate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
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
