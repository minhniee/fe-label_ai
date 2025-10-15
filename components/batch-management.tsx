"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Shuffle,
  Database,
  Settings,
  BarChart3,
} from "lucide-react"
import { 
  getBatches, 
  createBatch, 
  getBatch, 
  updateBatch, 
  deleteBatch,
  getBatchProgress,
  type BatchResponse,
  type CreateBatchRequest,
  type UpdateBatchRequest,
  type BatchStatus,
  type BatchProgressResponse
} from "@/app/api/batch"
import { getUsers, type User as ApiUser } from "@/app/api/users"
import { getDatasets, getDatasetVersions, type Dataset as ApiDataset, type DatasetVersion } from "@/app/api/datasets"
import { useToast } from "@/hooks/use-toast"

interface Batch {
  id: string
  name: string
  description: string
  totalQuestions: number
  assignedTo: string[]
  annotators: number
  status: "pending" | "in_progress" | "completed" | "review"
  createdDate: string
  dueDate: string
  progress: number
  priority: "low" | "medium" | "high"
  datasetId?: string
  datasetName?: string
  questionRange?: { start: number; end: number }
  assignmentDetails?: {
    userId: string
    userName: string
    questionCount: number
    questionRange: { start: number; end: number }
  }[]
}

// Helper function to convert API response to local Batch format
const convertApiBatchToLocal = (apiBatch: BatchResponse): Batch => {
  return {
    id: apiBatch.batch_id.toString(),
    name: apiBatch.name,
    description: apiBatch.description || "",
    totalQuestions: apiBatch.total_files,
    assignedTo: [], // Will be populated from assignment details if available
    annotators: 1, // Default, can be updated based on actual assignments
    status: apiBatch.status.toLowerCase() as Batch["status"],
    createdDate: apiBatch.created_at.split('T')[0],
    dueDate: apiBatch.updated_at.split('T')[0], // Using updated_at as due date fallback
    progress: apiBatch.progress_percentage,
    priority: "medium", // Default priority
    datasetId: apiBatch.dataset_id.toString(),
    datasetName: `Dataset ${apiBatch.dataset_id}`,
    questionRange: { start: 1, end: apiBatch.total_files },
  }
}

// Convert API User to local User format
const convertApiUserToLocal = (apiUser: ApiUser) => ({
  id: apiUser.user_id.toString(),
  name: apiUser.username,
  email: apiUser.email,
  role: apiUser.role_name || `role_${apiUser.role_id}`,
})

// Convert API Dataset to local Dataset format
const convertApiDatasetToLocal = (apiDataset: ApiDataset) => ({
  id: apiDataset.dataset_id.toString(),
  name: apiDataset.name,
  totalQuestions: 0, // Will be updated when we get file count
  uploadDate: apiDataset.created_at.split('T')[0],
  status: "ready" as const,
})

export function BatchManagement() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [users, setUsers] = useState<ReturnType<typeof convertApiUserToLocal>[]>([])
  const [datasets, setDatasets] = useState<ReturnType<typeof convertApiDatasetToLocal>[]>([])
  const [versions, setVersions] = useState<DatasetVersion[]>([])
  const [loading, setLoading] = useState(true)

  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false)
  const [isBatchAssignmentOpen, setIsBatchAssignmentOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchProgressResponse | null>(null)
  const [newBatch, setNewBatch] = useState({
    name: "",
    description: "",
    totalQuestions: 0,
    assignedTo: [] as string[],
    annotators: 1,
    dueDate: "",
    priority: "medium" as Batch["priority"],
    datasetId: "",
    versionId: 0,
    questionRangeStart: 1,
    questionRangeEnd: 0,
    selectedUsers: [] as string[],
    distributionMode: "equal" as "equal" | "custom",
    customAssignments: [] as { userId: string; questionCount: number }[],
  })

  // Load data on component mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadBatches(),
        loadUsers(),
        loadDatasets(),
      ])
    } catch (error: any) {
      toast({
        title: error.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBatches = async () => {
    try {
      const response = await getBatches()
      const convertedBatches = response.batches.map(convertApiBatchToLocal)
      setBatches(convertedBatches)
    } catch (error: any) {
      toast({
        title: error.message || "Failed to load batches",
        variant: "destructive",
      })
    }
  }

  const loadUsers = async () => {
    try {
      const response = await getUsers()
      const convertedUsers = response.map(convertApiUserToLocal)
      setUsers(convertedUsers)
    } catch (error: any) {
      toast({
        title: error.message || "Failed to load users",
        variant: "destructive",
      })
    }
  }

  const loadDatasets = async () => {
    try {
      const response = await getDatasets()
      const convertedDatasets = response.map(convertApiDatasetToLocal)
      setDatasets(convertedDatasets)
    } catch (error: any) {
      toast({
        title: error.message || "Failed to load datasets",
        variant: "destructive",
      })
    }
  }

  const loadBatchProgress = async (batchId: number) => {
    try {
      const progress = await getBatchProgress(batchId)
      return progress
    } catch (error: any) {
      toast({
        title: error.message || "Failed to load batch progress",
        variant: "destructive",
      })
      return null
    }
  }

  const calculateEqualDistribution = () => {
    if (newBatch.selectedUsers.length === 0 || newBatch.totalQuestions === 0) return []

    const questionsPerUser = Math.floor(newBatch.totalQuestions / newBatch.selectedUsers.length)
    const remainder = newBatch.totalQuestions % newBatch.selectedUsers.length

    return newBatch.selectedUsers.map((userId, index) => ({
      userId,
      questionCount: questionsPerUser + (index < remainder ? 1 : 0),
    }))
  }

  const handleDatasetSelection = async (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId)
    if (dataset) {
      try {
        // Load versions for the selected dataset
        const datasetVersions = await getDatasetVersions(parseInt(datasetId))
        setVersions(datasetVersions)
        
        setNewBatch({
          ...newBatch,
          datasetId,
          totalQuestions: dataset.totalQuestions,
          questionRangeEnd: dataset.totalQuestions,
          name: `Batch - ${dataset.name}`,
        })
      } catch (error: any) {
        toast({
          title: error.message || "Failed to load dataset versions",
          variant: "destructive",
        })
      }
    }
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    let updatedUsers: string[]
    if (checked) {
      updatedUsers = [...newBatch.selectedUsers, userId]
    } else {
      updatedUsers = newBatch.selectedUsers.filter((id) => id !== userId)
    }

    setNewBatch({
      ...newBatch,
      selectedUsers: updatedUsers,
      customAssignments:
        newBatch.distributionMode === "equal" ? calculateEqualDistribution() : newBatch.customAssignments,
    })
  }

  const handleCreateBatch = async () => {
    if (!newBatch.name || !newBatch.datasetId || !newBatch.versionId) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const createPayload: CreateBatchRequest = {
        name: newBatch.name,
        description: newBatch.description,
        dataset_id: parseInt(newBatch.datasetId),
        version_id: newBatch.versionId,
      }

      const response = await createBatch(createPayload)
      const newBatchLocal = convertApiBatchToLocal(response)
      
      setBatches([...batches, newBatchLocal])
      setNewBatch({
        name: "",
        description: "",
        totalQuestions: 0,
        assignedTo: [],
        annotators: 1,
        dueDate: "",
        priority: "medium",
        datasetId: "",
        versionId: 0,
        questionRangeStart: 1,
        questionRangeEnd: 0,
        selectedUsers: [],
        distributionMode: "equal",
        customAssignments: [],
      })
      setIsCreateBatchOpen(false)
      
      toast({
        title: "Batch created successfully",
      })
    } catch (error: any) {
      toast({
        title: error.message || "Failed to create batch",
        variant: "destructive",
      })
    }
  }

  const handleEditBatch = async () => {
    if (!selectedBatch || !newBatch.name) return

    try {
      const updatePayload: UpdateBatchRequest = {
        name: newBatch.name,
        description: newBatch.description,
      }

      const response = await updateBatch(parseInt(selectedBatch.id), updatePayload)
      const updatedBatch = convertApiBatchToLocal(response)
      
      setBatches(batches.map((batch) => (batch.id === selectedBatch.id ? updatedBatch : batch)))
      setIsEditBatchOpen(false)
      setSelectedBatch(null)
      
      toast({
        title: "Batch updated successfully",
      })
    } catch (error: any) {
      toast({
        title: error.message || "Failed to update batch",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await deleteBatch(parseInt(batchId))
      setBatches(batches.filter((batch) => batch.id !== batchId))
      
      toast({
        title: "Batch deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: error.message || "Failed to delete batch",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setNewBatch({
      name: batch.name,
      description: batch.description,
      totalQuestions: batch.totalQuestions,
      assignedTo: batch.assignedTo,
      annotators: batch.annotators,
      dueDate: batch.dueDate,
      priority: batch.priority,
      datasetId: batch.datasetId || "",
      versionId: 0,
      questionRangeStart: batch.questionRange?.start || 1,
      questionRangeEnd: batch.questionRange?.end || 0,
      selectedUsers: [],
      distributionMode: "equal",
      customAssignments: [],
    })
    setIsEditBatchOpen(true)
  }

  const getStatusBadge = (status: Batch["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <UserCheck className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        )
    }
  }

  const getPriorityBadge = (priority: Batch["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const handleAssignUser = (userId: string, checked: boolean) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    if (checked) {
      setNewBatch({
        ...newBatch,
        assignedTo: [...newBatch.assignedTo, user.name],
      })
    } else {
      setNewBatch({
        ...newBatch,
        assignedTo: newBatch.assignedTo.filter((name) => name !== user.name),
      })
    }
  }

  const openBatchAssignmentDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setIsBatchAssignmentOpen(true)
  }

  const handleViewProgress = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId)
    if (!batch) return

    setSelectedBatch(batch)
    const progress = await loadBatchProgress(parseInt(batchId))
    setBatchProgress(progress)
    setIsProgressOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Batch Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">
              {batches.filter((b) => b.status === "in_progress").length} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, batch) => sum + batch.totalQuestions, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all batches</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.filter((b) => b.status === "completed").length}</div>
            <p className="text-xs text-muted-foreground">Batches completed</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(batches.reduce((sum, batch) => sum + batch.progress, 0) / batches.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Of all batches</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Management */}
      <Card className="bg-white/90">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Management</CardTitle>
              <CardDescription>Create and manage batches to organize labeling work</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Shuffle className="h-4 w-4 mr-2" />
                Auto Split Batch
              </Button>
              <Dialog open={isCreateBatchOpen} onOpenChange={setIsCreateBatchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Labeling Batch</DialogTitle>
                    <DialogDescription>Select data and organize into batches for labelers</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        1. Select Dataset
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {datasets.map((dataset) => (
                          <div
                            key={dataset.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              newBatch.datasetId === dataset.id
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            } ${dataset.status !== "ready" ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => dataset.status === "ready" && handleDatasetSelection(dataset.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{dataset.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded: {dataset.uploadDate}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={dataset.status === "ready" ? "default" : "secondary"}>
                                  {dataset.status === "ready"
                                    ? "Ready"
                                    : dataset.status === "processing"
                                      ? "Processing"
                                      : "Error"}
                                </Badge>
                                {newBatch.datasetId === dataset.id && <CheckCircle className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {newBatch.datasetId && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            2. Configure Batch
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="batch-name">Batch Name</Label>
                              <Input
                                id="batch-name"
                                placeholder="e.g., Batch 001 - Admission Records"
                                value={newBatch.name}
                                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="version-select">Dataset Version</Label>
                              <Select
                                value={newBatch.versionId.toString()}
                                onValueChange={(value) => {
                                  setNewBatch({
                                    ...newBatch,
                                    versionId: Number.parseInt(value),
                                  })
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a version" />
                                </SelectTrigger>
                                <SelectContent>
                                  {versions.map((version) => (
                                    <SelectItem key={version.version_id} value={version.version_id.toString()}>
                                      Version {version.version_number} - {version.changelog || "No changelog"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="range-start">Start Question</Label>
                              <Input
                                id="range-start"
                                type="number"
                                min="1"
                                value={newBatch.questionRangeStart}
                                onChange={(e) => {
                                  const start = Number.parseInt(e.target.value) || 1
                                  setNewBatch({
                                    ...newBatch,
                                    questionRangeStart: start,
                                    questionRangeEnd: start + newBatch.totalQuestions - 1,
                                  })
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="range-end">End Question</Label>
                              <Input
                                id="range-end"
                                type="number"
                                value={newBatch.questionRangeEnd}
                                onChange={(e) => {
                                  const end = Number.parseInt(e.target.value) || 0
                                  setNewBatch({
                                    ...newBatch,
                                    questionRangeEnd: end,
                                    totalQuestions: end - newBatch.questionRangeStart + 1,
                                  })
                                }}
                              />
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                placeholder="Detailed description of this batch..."
                                value={newBatch.description}
                                onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="due-date">Due Date</Label>
                              <Input
                                id="due-date"
                                type="date"
                                value={newBatch.dueDate}
                                onChange={(e) => setNewBatch({ ...newBatch, dueDate: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="annotators">Number of Annotators</Label>
                              <Select
                                value={newBatch.annotators.toString()}
                                onValueChange={(value) =>
                                  setNewBatch({ ...newBatch, annotators: Number.parseInt(value) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 person (Single annotation)</SelectItem>
                                  <SelectItem value="2">2 people (Double annotation)</SelectItem>
                                  <SelectItem value="3">3 people (Triple annotation)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            3. Assign to Labelers
                          </h3>

                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Label>Distribution Mode:</Label>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="distribution"
                                    value="equal"
                                    checked={newBatch.distributionMode === "equal"}
                                    onChange={(e) => setNewBatch({ ...newBatch, distributionMode: "equal" })}
                                  />
                                  Equal Distribution (default)
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="distribution"
                                    value="custom"
                                    checked={newBatch.distributionMode === "custom"}
                                    onChange={(e) => setNewBatch({ ...newBatch, distributionMode: "custom" })}
                                  />
                                  Custom
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              {users
                                .filter((u) => u.role !== "admin" && u.role !== "superadmin")
                                .map((user) => {
                                  const isSelected = newBatch.selectedUsers.includes(user.id)
                                  const assignment =
                                    newBatch.distributionMode === "equal"
                                      ? calculateEqualDistribution().find((a) => a.userId === user.id)
                                      : newBatch.customAssignments.find((a) => a.userId === user.id)

                                  return (
                                    <div
                                      key={user.id}
                                      className={`border rounded-lg p-4 ${isSelected ? "border-primary bg-primary/5" : "border-gray-200"}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            id={user.id}
                                            checked={isSelected}
                                            onCheckedChange={(checked) =>
                                              handleUserSelection(user.id, checked as boolean)
                                            }
                                          />
                                          <div>
                                            <Label htmlFor={user.id} className="font-medium cursor-pointer">
                                              {user.name}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <div className="flex items-center gap-4">
                                            {newBatch.distributionMode === "custom" ? (
                                              <Input
                                                type="number"
                                                placeholder="Number of questions"
                                                className="w-32"
                                                value={assignment?.questionCount || ""}
                                                onChange={(e) => {
                                                  const count = Number.parseInt(e.target.value) || 0
                                                  const updatedAssignments = newBatch.customAssignments.filter(
                                                    (a) => a.userId !== user.id,
                                                  )
                                                  if (count > 0) {
                                                    updatedAssignments.push({ userId: user.id, questionCount: count })
                                                  }
                                                  setNewBatch({ ...newBatch, customAssignments: updatedAssignments })
                                                }}
                                              />
                                            ) : (
                                              <Badge variant="outline">{assignment?.questionCount || 0} questions</Badge>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>

                            {newBatch.selectedUsers.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4" />
                                  Distribution Summary
                                </h4>
                                <div className="space-y-2">
                                  {(newBatch.distributionMode === "equal"
                                    ? calculateEqualDistribution()
                                    : newBatch.customAssignments
                                  ).map((assignment) => {
                                    const user = users.find((u) => u.id === assignment.userId)
                                    return (
                                      <div key={assignment.userId} className="flex justify-between text-sm">
                                        <span>{user?.name}</span>
                                        <span className="font-medium">{assignment.questionCount} questions</span>
                                      </div>
                                    )
                                  })}
                                  <div className="border-t border-blue-200 pt-2 flex justify-between font-medium text-blue-900">
                                    <span>Total:</span>
                                    <span>
                                      {(newBatch.distributionMode === "equal"
                                        ? calculateEqualDistribution()
                                        : newBatch.customAssignments
                                      ).reduce((sum, a) => sum + a.questionCount, 0)}{" "}
                                      questions
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateBatchOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBatch}
                      disabled={!newBatch.datasetId || !newBatch.versionId || !newBatch.name}
                    >
                      Create Batch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading batches...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Source Data</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No batches found. Create your first batch to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{batch.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {batch.totalQuestions.toLocaleString()} questions
                          {batch.questionRange && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              #{batch.questionRange.start}-{batch.questionRange.end}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{batch.datasetName || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">Dataset ID: {batch.datasetId || "N/A"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {batch.assignedTo.map((name, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      <div className="text-xs text-muted-foreground">{batch.annotators} annotators</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${batch.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{batch.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {batch.dueDate}
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openBatchAssignmentDialog(batch)}>
                          <Users className="mr-2 h-4 w-4" />
                          Assignment Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewProgress(batch.id)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Progress
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteBatch(batch.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Batch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBatchAssignmentOpen} onOpenChange={setIsBatchAssignmentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assignment Details - {selectedBatch?.name}</DialogTitle>
            <DialogDescription>View detailed assignment breakdown for each labeler</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Total Questions:</Label>
                  <p className="text-lg font-bold">{selectedBatch.totalQuestions.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Range:</Label>
                  <p className="text-lg font-bold">
                    #{selectedBatch.questionRange?.start} - #{selectedBatch.questionRange?.end}
                  </p>
                </div>
              </div>

              {selectedBatch.assignmentDetails && (
                <div className="space-y-3">
                  <h4 className="font-medium">Detailed Assignments:</h4>
                  {selectedBatch.assignmentDetails.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h5 className="font-medium">{assignment.userName}</h5>
                            <p className="text-sm text-muted-foreground">{assignment.questionCount} questions assigned</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          #{assignment.questionRange.start} - #{assignment.questionRange.end}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchAssignmentOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={isEditBatchOpen} onOpenChange={setIsEditBatchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update batch labeling information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-batch-name">Batch Name</Label>
              <Input
                id="edit-batch-name"
                value={newBatch.name}
                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total-questions">Number of Questions</Label>
              <Input
                id="edit-total-questions"
                type="number"
                value={newBatch.totalQuestions || ""}
                onChange={(e) => setNewBatch({ ...newBatch, totalQuestions: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newBatch.description}
                onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={newBatch.dueDate}
                onChange={(e) => setNewBatch({ ...newBatch, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={newBatch.priority}
                onValueChange={(value: Batch["priority"]) => setNewBatch({ ...newBatch, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBatchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditBatch}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Progress Dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Batch Progress - {selectedBatch?.name}</DialogTitle>
            <DialogDescription>View detailed progress information for this batch</DialogDescription>
          </DialogHeader>
          {batchProgress && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Progress:</Label>
                  <p className="text-lg font-bold">{batchProgress.progress_percentage}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status:</Label>
                  <p className="text-lg font-bold capitalize">{batchProgress.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Completed Files:</Label>
                  <p className="text-lg font-bold">{batchProgress.completed_files} / {batchProgress.total_files}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Assigned Users:</Label>
                  <p className="text-lg font-bold">{batchProgress.assigned_users.length}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Overall Progress</Label>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${batchProgress.progress_percentage}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {batchProgress.completed_files} of {batchProgress.total_files} files completed
                </p>
              </div>

              {/* Assigned Users */}
              {batchProgress.assigned_users.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Assigned Users:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {batchProgress.assigned_users.map((user, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-medium">{user}</h5>
                          <p className="text-sm text-muted-foreground">Assigned to this batch</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-blue-900">Created:</Label>
                  <p className="text-sm text-blue-800">
                    {new Date(batchProgress.created_at).toLocaleDateString()} at {new Date(batchProgress.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-900">Last Updated:</Label>
                  <p className="text-sm text-blue-800">
                    {new Date(batchProgress.updated_at).toLocaleDateString()} at {new Date(batchProgress.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgressOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
