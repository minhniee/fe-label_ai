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
import { getSchemas, createSchema as apiCreateSchema, deleteSchema as apiDeleteSchema } from "@/app/api/schema"
import { getDatasets as apiGetDatasets } from "@/app/api/dataset"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

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
      const datasetFilter = selectedDataset !== "all" ? Number(selectedDataset) : undefined
      const apiData = await getSchemas(datasetFilter)
      const mapped: Schema[] = apiData.map((s: any) => ({
        schema_id: s.schema_id,
        dataset_id: s.dataset_id,
        dataset_name: undefined,
        // Backend response doesn't include version_number; fallback to 1 or unknown
        version_number: 1,
        ontology: s.schema_definition,
        created_at: s.created_at,
        created_by: s.created_by ?? 0,
        creator_username: undefined,
      }))
      setSchemas(mapped)
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
      const data = await apiGetDatasets()
      setDatasets(data as any)
    } catch (error) {
      console.error("Error fetching datasets:", error)
    }
  }

  const handleCreateSchema = async () => {
    try {
      const datasetId = Number(formData.dataset_id)
      if (!datasetId) {
        toast({ title: "Error", description: "Please select a dataset", variant: "destructive" })
        return
      }
      const ontology = { labels: [] }
      await apiCreateSchema(datasetId, {
        // Backend requires a name; use a sensible default if not provided in UI
        name: `Schema ${new Date().toISOString()}`,
        schema_definition: ontology,
        description: formData.description || "",
      })
      toast({ title: "Success", description: "Schema created successfully" })
      setIsCreateDialogOpen(false)
      setFormData({ dataset_id: "", ontology: {}, description: "" })
      fetchSchemas()
    } catch (error) {
      console.error("Error creating schema:", error)
      toast({ title: "Error", description: "Failed to create schema", variant: "destructive" })
    }
  }

  const handleDeleteSchema = async (schemaId: number) => {
    try {
      await apiDeleteSchema(schemaId)
      toast({ title: "Success", description: "Schema deleted successfully" })
      fetchSchemas()
    } catch (error) {
      console.error("Error deleting schema:", error)
      toast({ title: "Error", description: "Failed to delete schema", variant: "destructive" })
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
            Manage ontology and schemas for datasets
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schema
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Schema</DialogTitle>
              <DialogDescription>
                Create a new schema for a dataset
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
                    <SelectValue placeholder="Select dataset" />
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter schema description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchema}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Schemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search schemas..."
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
                  <SelectItem value="all">All datasets</SelectItem>
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
          <CardTitle>Schema List</CardTitle>
          <CardDescription>
            {filteredSchemas.length} schemas found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSchemas.length === 0 ? (
            <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30% py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No Schemas</EmptyTitle>
                <EmptyDescription>
                  There are no schemas yet. Create your first schema to get started.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schema
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Label Count</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created at</TableHead>
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
                            Edit
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
                            Delete
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

