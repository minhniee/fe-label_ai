"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tags, Plus, MoreHorizontal, Edit, Trash2, Keyboard, Save, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createLabel, getLabel, updateLabel, deleteLabel, getAllLabels, type CreateLabelRequest, type UpdateLabelRequest } from "@/app/api/label"
import { getDatasets } from "@/app/api/dataset"
import { useToast } from "@/hooks/use-toast"

interface LabelSet {
  id: string
  name: string
  description: string
  labels: LabelOption[]
  createdDate: string
  isActive: boolean
  usageCount: number
  hasExistingData?: boolean
}

interface LabelOption {
  id: string
  label: string
  description: string
  hotkey: string
  color: string
}

interface NewLabel {
  label: string
  description: string
  hotkey: string
  color: string
}

export function LabelManagement() {
  const [labelSets, setLabelSets] = useState<LabelSet[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [datasets, setDatasets] = useState<Array<{ dataset_id: number; name: string; description?: string; created_at: string }>>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)

  const [isAddLabelSetOpen, setIsAddLabelSetOpen] = useState(false)
  const [isEditLabelOpen, setIsEditLabelOpen] = useState(false)
  const [selectedLabelSet, setSelectedLabelSet] = useState<LabelSet | null>(null)
  const [editingLabels, setEditingLabels] = useState<LabelOption[]>([])
  const [newLabelsToAdd, setNewLabelsToAdd] = useState<NewLabel[]>([])

  const [newLabelSet, setNewLabelSet] = useState({
    name: "",
    description: "",
    labels: [] as NewLabel[],
  })

  const colorOptions = [
    { value: "bg-green-100 text-green-800", label: "Green", preview: "bg-green-100", hex: "#26F7D2" },
    { value: "bg-blue-100 text-blue-800", label: "Blue", preview: "bg-blue-100", hex: "#3B82F6" },
    { value: "bg-yellow-100 text-yellow-800", label: "Yellow", preview: "bg-yellow-100", hex: "#F59E0B" },
    { value: "bg-red-100 text-red-800", label: "Red", preview: "bg-red-100", hex: "#EF4444" },
    { value: "bg-purple-100 text-purple-800", label: "Purple", preview: "bg-purple-100", hex: "#8B5CF6" },
    { value: "bg-orange-100 text-orange-800", label: "Orange", preview: "bg-orange-100", hex: "#F97316" },
    { value: "bg-pink-100 text-pink-800", label: "Pink", preview: "bg-pink-100", hex: "#EC4899" },
    { value: "bg-gray-100 text-gray-800", label: "Gray", preview: "bg-gray-100", hex: "#6B7280" },
  ]

  const getHexColor = (tailwindClass: string): string => {
    const colorOption = colorOptions.find(option => option.value === tailwindClass)
    return colorOption?.hex || "#26F7D2"
  }

  // Load labels and datasets from API
  const loadLabelSets = async () => {
    try {
      setLoading(true)
      
      // Load datasets and labels in parallel
      const [datasets, labels] = await Promise.all([
        getDatasets(),
        getAllLabels()
      ])

      setDatasets(datasets)
      if (datasets.length > 0 && selectedDatasetId === null) {
        setSelectedDatasetId(datasets[0].dataset_id)
      }

      // Group labels by dataset_id
      const labelsByDataset = labels.reduce((acc, label) => {
        if (!acc[label.dataset_id]) {
          acc[label.dataset_id] = []
        }
        acc[label.dataset_id].push(label)
        return acc
      }, {} as Record<number, typeof labels>)

      // Create label sets from datasets
      const labelSetsData: LabelSet[] = datasets.map(dataset => {
        const datasetLabels = labelsByDataset[dataset.dataset_id] || []
        
        return {
          id: dataset.dataset_id.toString(),
          name: dataset.name,
          description: dataset.description || "",
          labels: datasetLabels.map(label => ({
            id: label.label_id.toString(),
            label: label.name,
            description: label.description,
            hotkey: label.hotkey,
            color: label.color,
          })),
          createdDate: new Date(dataset.created_at).toISOString().split("T")[0],
          isActive: false,
          usageCount: 0,
          hasExistingData: datasetLabels.length > 0,
        }
      })

      setLabelSets(labelSetsData)
    } catch (error) {
      console.error("Error loading label sets:", error)
      toast({
        title: "Error",
        description: "Failed to load label sets. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadLabelSets()
  }, [])

  const addNewLabelToForm = () => {
    const newLabel: NewLabel = {
      label: "",
      description: "",
      hotkey: (newLabelSet.labels.length + 1).toString(),
      color: colorOptions[newLabelSet.labels.length % colorOptions.length].value,
    }
    setNewLabelSet({
      ...newLabelSet,
      labels: [...newLabelSet.labels, newLabel],
    })
  }

  const updateLabelInForm = (index: number, field: keyof NewLabel, value: string) => {
    const updatedLabels = [...newLabelSet.labels]
    updatedLabels[index] = { ...updatedLabels[index], [field]: value }
    setNewLabelSet({ ...newLabelSet, labels: updatedLabels })
  }

  const removeLabelFromForm = (index: number) => {
    const updatedLabels = newLabelSet.labels.filter((_, i) => i !== index)
    setNewLabelSet({ ...newLabelSet, labels: updatedLabels })
  }

  const handleAddLabelSet = async () => {
    if (!newLabelSet.labels.length || selectedDatasetId === null) return

    try {
      // Create labels in the selected dataset
      const createdLabels = await Promise.all(
        newLabelSet.labels.map(async (label, index) => {
          const labelData: CreateLabelRequest = {
            name: label.label,
            description: label.description,
            color: getHexColor(label.color),
            guidelines: label.description,
            hotkey: label.hotkey,
            priority: index + 1,
            dataset_id: selectedDatasetId,
          }

          const response = await createLabel(labelData)
          return {
            id: response.label_id.toString(),
            label: response.name,
            description: response.description,
            hotkey: response.hotkey,
            color: response.color,
          }
        })
      )

      // Reload data from API to get the latest state
      await loadLabelSets()
      
      setNewLabelSet({ name: "", description: "", labels: [] })
      setIsAddLabelSetOpen(false)

      const datasetName = datasets.find(d => d.dataset_id === selectedDatasetId)?.name || "dataset"
      toast({
        title: "Success",
        description: `Created ${createdLabels.length} labels in ${datasetName}`,
      })
    } catch (error) {
      console.error("Error creating labels:", error)
      toast({
        title: "Error",
        description: "Failed to create labels. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateLabel = async (labelId: number, updatedData: UpdateLabelRequest) => {
    try {
      const response = await updateLabel(labelId, updatedData)
      
      // Reload data from API to get the latest state
      await loadLabelSets()

      toast({
        title: "Success",
        description: `Label "${response.name}" updated successfully`,
      })
    } catch (error) {
      console.error("Error updating label:", error)
      toast({
        title: "Error",
        description: "Failed to update label. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLabel = async (labelId: number) => {
    try {
      await deleteLabel(labelId)
      
      // Reload data from API to get the latest state
      await loadLabelSets()

      toast({
        title: "Success",
        description: "Label deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting label:", error)
      toast({
        title: "Error",
        description: "Failed to delete label. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditLabels = (labelSet: LabelSet) => {
    setSelectedLabelSet(labelSet)
    setEditingLabels([...labelSet.labels])
    setNewLabelsToAdd([])
    setIsEditLabelOpen(true)
  }

  const addNewLabelToExisting = () => {
    const newLabel: NewLabel = {
      label: "",
      description: "",
      hotkey: (editingLabels.length + newLabelsToAdd.length + 1).toString(),
      color: colorOptions[(editingLabels.length + newLabelsToAdd.length) % colorOptions.length].value,
    }
    setNewLabelsToAdd([...newLabelsToAdd, newLabel])
  }

  const saveChangesToLabelSet = async () => {
    if (!selectedLabelSet) return

    try {
      // Update existing labels via API
      const updatePromises = editingLabels.map(async (label) => {
        const labelId = parseInt(label.id)
        const updateData: UpdateLabelRequest = {
          name: label.label,
          description: label.description,
          hotkey: label.hotkey,
          color: getHexColor(label.color),
          guidelines: label.description,
        }
        return await updateLabel(labelId, updateData)
      })

      await Promise.all(updatePromises)

      // Create new labels via API
      const createPromises = newLabelsToAdd.map(async (label, index) => {
        const labelData: CreateLabelRequest = {
          name: label.label,
          description: label.description,
          color: getHexColor(label.color),
          guidelines: label.description,
          hotkey: label.hotkey,
          priority: editingLabels.length + index + 1,
          dataset_id: parseInt(selectedLabelSet.id),
        }
        return await createLabel(labelData)
      })

      const createdLabels = await Promise.all(createPromises)

      // Reload data from API to get the latest state
      await loadLabelSets()

      setIsEditLabelOpen(false)
      setSelectedLabelSet(null)
      setEditingLabels([])
      setNewLabelsToAdd([])

      toast({
        title: "Success",
        description: `Updated ${editingLabels.length} labels and created ${createdLabels.length} new labels`,
      })
    } catch (error) {
      console.error("Error saving label changes:", error)
      toast({
        title: "Error",
        description: "Failed to save label changes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLabelSet = (labelSetId: string) => {
    setLabelSets(labelSets.filter((set) => set.id !== labelSetId))
  }

  const handleToggleActive = (labelSetId: string) => {
    setLabelSets(
      labelSets.map((set) => {
        if (set.id === labelSetId) {
          // Deactivate all other sets if activating this one
          if (!set.isActive) {
            setLabelSets((prev) => prev.map((s) => ({ ...s, isActive: false })))
          }
          return { ...set, isActive: !set.isActive }
        }
        return set
      }),
    )
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading label sets...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Dataset selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select dataset</CardTitle>
                  <CardDescription>Choose an existing dataset to manage its labels</CardDescription>
                </div>
                <div className="min-w-[240px]">
                  <Select
                    value={selectedDatasetId !== null ? String(selectedDatasetId) : undefined}
                    onValueChange={(value) => setSelectedDatasetId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((ds) => (
                        <SelectItem key={ds.dataset_id} value={String(ds.dataset_id)}>
                          {ds.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Label Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total label sets</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.length}</div>
            <p className="text-xs text-muted-foreground">
              {labelSets.filter((set) => set.isActive).length} in use
            </p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total labels</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.reduce((acc, set) => acc + set.labels.length, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all label sets</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <Keyboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {labelSets.reduce((acc, set) => acc + set.usageCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Labeling times</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active label set</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.filter((set) => set.isActive).length}</div>
            <p className="text-xs text-muted-foreground">{labelSets.find((set) => set.isActive)?.name || "None"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Label Sets Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Label set management</CardTitle>
              <CardDescription>Create and manage label sets for data classification</CardDescription>
            </div>
            <Dialog open={isAddLabelSetOpen} onOpenChange={setIsAddLabelSetOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add label set
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add a new label set</DialogTitle>
                  <DialogDescription>Create a new label set with name, description and labels</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelset-name">Label set name *</Label>
                      <Input
                        id="labelset-name"
                        placeholder="e.g., Enrollment potential classification"
                        value={newLabelSet.name}
                        onChange={(e) => setNewLabelSet({ ...newLabelSet, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelset-description">Description *</Label>
                      <Textarea
                        id="labelset-description"
                        placeholder="Describe the purpose of this label set"
                        value={newLabelSet.description}
                        onChange={(e) => setNewLabelSet({ ...newLabelSet, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Labels in set</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addNewLabelToForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add label
                      </Button>
                    </div>

                    {newLabelSet.labels.length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          A label set needs at least one label. Click "Add label" to start.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      {newLabelSet.labels.map((label, index) => (
                        <Card key={index} className="p-4  ">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Label name *</Label>
                              <Input
                                placeholder="e.g., High potential"
                                value={label.label}
                                onChange={(e) => updateLabelInForm(index, "label", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Hotkey</Label>
                              <Input
                                placeholder="1-9"
                                maxLength={1}
                                value={label.hotkey}
                                onChange={(e) => updateLabelInForm(index, "hotkey", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Color</Label>
                              <Select
                                value={label.color}
                                onValueChange={(value) => updateLabelInForm(index, "color", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {colorOptions.map((color) => (
                                    <SelectItem key={color.value} value={color.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded ${color.preview}`} />
                                        {color.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLabelFromForm(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Detailed description for this label"
                              value={label.description}
                              onChange={(e) => updateLabelInForm(index, "description", e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="mt-3">
                            <Label className="text-sm text-muted-foreground">Preview:</Label>
                            <div className="mt-1">
                              <Badge className={label.color}>
                                {label.label || "Label name"} ({label.hotkey})
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddLabelSetOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddLabelSet}
                    disabled={!newLabelSet.name || !newLabelSet.description || newLabelSet.labels.length === 0}
                >
                    Create label set
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(selectedDatasetId ? labelSets.filter((s) => s.id === String(selectedDatasetId)) : labelSets).map((labelSet) => (
              <Card key={labelSet.id} className={`  ${labelSet.isActive ? "border-primary" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{labelSet.name}</CardTitle>
                        {labelSet.isActive && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In use</Badge>
                        )}
                        {labelSet.hasExistingData && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Has current data
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{labelSet.description}</CardDescription>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {labelSet.createdDate}</span>
                        <span>{labelSet.labels.length} labels</span>
                        <span>{labelSet.usageCount.toLocaleString()} uses</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditLabels(labelSet)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit label
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(labelSet.id)}>
                          <Tags className="mr-2 h-4 w-4" />
                          {labelSet.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteLabelSet(labelSet.id)}
                          disabled={labelSet.isActive || labelSet.usageCount > 0}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete label set
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {labelSet.hasExistingData && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Bộ nhãn này đã được sử dụng để gán nhãn cho {labelSet.usageCount.toLocaleString()} mẫu dữ liệu.
                        Bạn có thể thêm nhãn mới nhưng không nên xóa các nhãn hiện có.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {labelSet.labels.map((label) => (
                      <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={label.color}>{label.label}</Badge>
                            <Badge variant="outline" className="text-xs">
                              Phím {label.hotkey}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{label.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditLabelOpen} onOpenChange={setIsEditLabelOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhãn - {selectedLabelSet?.name}</DialogTitle>
            <DialogDescription>
              {selectedLabelSet?.hasExistingData
                ? "Bộ nhãn này đã có dữ liệu. Bạn có thể thêm nhãn mới nhưng nên cẩn thận khi chỉnh sửa nhãn hiện có."
                : "Thêm, sửa hoặc xóa các nhãn trong bộ nhãn này"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {editingLabels.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Nhãn hiện có</Label>
                  {selectedLabelSet?.hasExistingData && (
                    <Badge variant="outline" className="text-xs">
                      Đã có dữ liệu
                    </Badge>
                  )}
                </div>
                <div className="grid gap-3">
                  {editingLabels.map((label, index) => (
                    <Card key={label.id} className="p-4  ">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Tên nhãn</Label>
                          <Input
                            value={label.label}
                            onChange={(e) => {
                              const updated = [...editingLabels]
                              updated[index] = { ...updated[index], label: e.target.value }
                              setEditingLabels(updated)
                            }}
                            disabled={selectedLabelSet?.hasExistingData}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phím tắt</Label>
                          <Input
                            value={label.hotkey}
                            maxLength={1}
                            onChange={(e) => {
                              const updated = [...editingLabels]
                              updated[index] = { ...updated[index], hotkey: e.target.value }
                              setEditingLabels(updated)
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Màu sắc</Label>
                          <Select
                            value={label.color}
                            onValueChange={(value) => {
                              const updated = [...editingLabels]
                              updated[index] = { ...updated[index], color: value }
                              setEditingLabels(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded ${color.preview}`} />
                                    {color.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const labelId = parseInt(label.id)
                              await handleDeleteLabel(labelId)
                              setEditingLabels(editingLabels.filter((_, i) => i !== index))
                            }}
                            disabled={selectedLabelSet?.hasExistingData}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <Label>Mô tả</Label>
                        <Textarea
                          value={label.description}
                          onChange={(e) => {
                            const updated = [...editingLabels]
                            updated[index] = { ...updated[index], description: e.target.value }
                            setEditingLabels(updated)
                          }}
                          rows={2}
                        />
                      </div>
                      <div className="mt-3">
                        <Label className="text-sm text-muted-foreground">Xem trước:</Label>
                        <div className="mt-1">
                          <Badge className={label.color}>
                            {label.label} ({label.hotkey})
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Thêm nhãn mới</Label>
                <Button type="button" variant="outline" size="sm" onClick={addNewLabelToExisting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm nhãn
                </Button>
              </div>

              {newLabelsToAdd.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Nhấn "Thêm nhãn" để thêm nhãn mới vào bộ nhãn hiện có.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {newLabelsToAdd.map((label, index) => (
                  <Card key={index} className="p-4 border-dashed  ">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Tên nhãn *</Label>
                        <Input
                          placeholder="Ví dụ: Nhãn mới"
                          value={label.label}
                          onChange={(e) => {
                            const updated = [...newLabelsToAdd]
                            updated[index] = { ...updated[index], label: e.target.value }
                            setNewLabelsToAdd(updated)
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phím tắt</Label>
                        <Input
                          placeholder="1-9"
                          maxLength={1}
                          value={label.hotkey}
                          onChange={(e) => {
                            const updated = [...newLabelsToAdd]
                            updated[index] = { ...updated[index], hotkey: e.target.value }
                            setNewLabelsToAdd(updated)
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Màu sắc</Label>
                        <Select
                          value={label.color}
                          onValueChange={(value) => {
                            const updated = [...newLabelsToAdd]
                            updated[index] = { ...updated[index], color: value }
                            setNewLabelsToAdd(updated)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded ${color.preview}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewLabelsToAdd(newLabelsToAdd.filter((_, i) => i !== index))
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        placeholder="Mô tả chi tiết về nhãn này"
                        value={label.description}
                        onChange={(e) => {
                          const updated = [...newLabelsToAdd]
                          updated[index] = { ...updated[index], description: e.target.value }
                          setNewLabelsToAdd(updated)
                        }}
                        rows={2}
                      />
                    </div>
                    <div className="mt-3">
                      <Label className="text-sm text-muted-foreground">Xem trước:</Label>
                      <div className="mt-1">
                        <Badge className={label.color}>
                          {label.label || "Nhãn mới"} ({label.hotkey})
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLabelOpen(false)}>
              Hủy
            </Button>
            <Button onClick={saveChangesToLabelSet}>
              <Save className="h-4 w-4 mr-2" />
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
