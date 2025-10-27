"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Schema {
  schema_id: number
  dataset_id: number
  dataset_name?: string
  version_number: number
  ontology: any
  created_at: string
  created_by: number
  creator_username?: string
}

interface Dataset {
  dataset_id: number
  name: string
  description?: string
}

export default function SchemaPage() {
  const [schemas, setSchemas] = useState<Schema[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDataset, setSelectedDataset] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form state for creating schema
  const [formData, setFormData] = useState({
    dataset_id: "",
    ontology: {},
    description: ""
  })

  useEffect(() => {
    fetchSchemas()
    fetchDatasets()
  }, [selectedDataset])

  const fetchSchemas = async () => {
    try {
      setLoading(true)
      
      let url = `${process.env.NEXT_PUBLIC_API_BASE}/schemas/`
      if (selectedDataset !== "all") {
        url += `?dataset_id=${selectedDataset}`
      }

      const response = await fetch(url, {
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSchemas(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch schemas",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching schemas:", error)
      toast({
        title: "Error",
        description: "Failed to fetch schemas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDatasets = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/datasets/`, {
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDatasets(data)
      }
    } catch (error) {
      console.error("Error fetching datasets:", error)
    }
  }

  const handleCreateSchema = async () => {
    try {
      // Here you would normally parse the ontology JSON
      // For now, we'll create a simple structure
      const ontology = {
        labels: []
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/schemas/?dataset_id=${formData.dataset_id}`, {
        method: "POST",
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schema_definition: ontology,
          description: formData.description
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schema created successfully"
        })
        setIsCreateDialogOpen(false)
        setFormData({ dataset_id: "", ontology: {}, description: "" })
        fetchSchemas()
      } else {
        toast({
          title: "Error",
          description: "Failed to create schema",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating schema:", error)
      toast({
        title: "Error",
        description: "Failed to create schema",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSchema = async (schemaId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/schemas/${schemaId}`, {
        method: "DELETE",
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schema deleted successfully"
        })
        fetchSchemas()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete schema",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting schema:", error)
      toast({
        title: "Error",
        description: "Failed to delete schema",
        variant: "destructive"
      })
    }
  }

  const filteredSchemas = schemas.filter(schema => {
    if (searchQuery) {
      return JSON.stringify(schema.ontology || {}).toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schema Management</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý ontology và schema cho các dataset
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Schema Mới
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Schema Mới</DialogTitle>
              <DialogDescription>
                Tạo schema mới cho dataset
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataset">Dataset</Label>
                <Select
                  value={formData.dataset_id}
                  onValueChange={(value) => setFormData({ ...formData, dataset_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.dataset_id} value={String(dataset.dataset_id)}>
                        {dataset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Nhập mô tả cho schema..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateSchema}>
                Tạo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lọc Schema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Tìm kiếm schema..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataset-filter">Dataset</Label>
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger id="dataset-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả datasets</SelectItem>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.dataset_id} value={String(dataset.dataset_id)}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Schema</CardTitle>
          <CardDescription>
            {filteredSchemas.length} schema được tìm thấy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không có schema nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Label Count</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchemas.map((schema) => (
                  <TableRow key={schema.schema_id}>
                    <TableCell className="font-medium">
                      {schema.dataset_name || `Dataset #${schema.dataset_id}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{schema.version_number}</Badge>
                    </TableCell>
                    <TableCell>
                      {schema.ontology?.labels?.length || 0} labels
                    </TableCell>
                    <TableCell>{schema.creator_username || `User #${schema.created_by}`}</TableCell>
                    <TableCell>{formatDate(schema.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteSchema(schema.schema_id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

