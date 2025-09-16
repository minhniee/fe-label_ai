"use client"

import { useState } from "react"
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
  const [labelSets, setLabelSets] = useState<LabelSet[]>([
    {
      id: "1",
      name: "Phân loại tiềm năng tuyển sinh",
      description: "Bộ nhãn chính để đánh giá tiềm năng của ứng viên tuyển sinh",
      labels: [
        {
          id: "1",
          label: "Tiềm năng cao",
          description: "Ứng viên có tiềm năng cao, phù hợp với chương trình",
          hotkey: "1",
          color: "bg-green-100 text-green-800",
        },
        {
          id: "2",
          label: "Tiềm năng trung bình",
          description: "Ứng viên có tiềm năng trung bình, cần xem xét thêm",
          hotkey: "2",
          color: "bg-yellow-100 text-yellow-800",
        },
        {
          id: "3",
          label: "Tiềm năng thấp",
          description: "Ứng viên có tiềm năng thấp, không phù hợp",
          hotkey: "3",
          color: "bg-red-100 text-red-800",
        },
        {
          id: "4",
          label: "Cần xem xét",
          description: "Cần thêm thông tin hoặc đánh giá từ chuyên gia",
          hotkey: "4",
          color: "bg-blue-100 text-blue-800",
        },
      ],
      createdDate: "2024-01-01",
      isActive: true,
      usageCount: 3400,
      hasExistingData: true,
    },
    {
      id: "2",
      name: "Đánh giá năng lực học tập",
      description: "Bộ nhãn đánh giá khả năng học tập và thích ứng của ứng viên",
      labels: [
        {
          id: "5",
          label: "Xuất sắc",
          description: "Năng lực học tập xuất sắc",
          hotkey: "1",
          color: "bg-purple-100 text-purple-800",
        },
        {
          id: "6",
          label: "Tốt",
          description: "Năng lực học tập tốt",
          hotkey: "2",
          color: "bg-blue-100 text-blue-800",
        },
        {
          id: "7",
          label: "Trung bình",
          description: "Năng lực học tập trung bình",
          hotkey: "3",
          color: "bg-yellow-100 text-yellow-800",
        },
      ],
      createdDate: "2024-01-05",
      isActive: false,
      usageCount: 0,
      hasExistingData: false,
    },
  ])

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
    { value: "bg-green-100 text-green-800", label: "Xanh lá", preview: "bg-green-100" },
    { value: "bg-blue-100 text-blue-800", label: "Xanh dương", preview: "bg-blue-100" },
    { value: "bg-yellow-100 text-yellow-800", label: "Vàng", preview: "bg-yellow-100" },
    { value: "bg-red-100 text-red-800", label: "Đỏ", preview: "bg-red-100" },
    { value: "bg-purple-100 text-purple-800", label: "Tím", preview: "bg-purple-100" },
    { value: "bg-orange-100 text-orange-800", label: "Cam", preview: "bg-orange-100" },
    { value: "bg-pink-100 text-pink-800", label: "Hồng", preview: "bg-pink-100" },
    { value: "bg-gray-100 text-gray-800", label: "Xám", preview: "bg-gray-100" },
  ]

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

  const handleAddLabelSet = () => {
    if (!newLabelSet.name || !newLabelSet.description || newLabelSet.labels.length === 0) return

    const labelSet: LabelSet = {
      id: Date.now().toString(),
      name: newLabelSet.name,
      description: newLabelSet.description,
      labels: newLabelSet.labels.map((label, index) => ({
        id: (Date.now() + index).toString(),
        ...label,
      })),
      createdDate: new Date().toISOString().split("T")[0],
      isActive: false,
      usageCount: 0,
      hasExistingData: false,
    }

    setLabelSets([...labelSets, labelSet])
    setNewLabelSet({ name: "", description: "", labels: [] })
    setIsAddLabelSetOpen(false)
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

  const saveChangesToLabelSet = () => {
    if (!selectedLabelSet) return

    const updatedLabels = [
      ...editingLabels,
      ...newLabelsToAdd.map((label, index) => ({
        id: (Date.now() + index).toString(),
        ...label,
      })),
    ]

    setLabelSets(labelSets.map((set) => (set.id === selectedLabelSet.id ? { ...set, labels: updatedLabels } : set)))

    setIsEditLabelOpen(false)
    setSelectedLabelSet(null)
    setEditingLabels([])
    setNewLabelsToAdd([])
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
      {/* Label Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bộ nhãn</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.length}</div>
            <p className="text-xs text-muted-foreground">
              {labelSets.filter((set) => set.isActive).length} đang sử dụng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng nhãn</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.reduce((acc, set) => acc + set.labels.length, 0)}</div>
            <p className="text-xs text-muted-foreground">Trong tất cả bộ nhãn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã sử dụng</CardTitle>
            <Keyboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {labelSets.reduce((acc, set) => acc + set.usageCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Lần gán nhãn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bộ nhãn hoạt động</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labelSets.filter((set) => set.isActive).length}</div>
            <p className="text-xs text-muted-foreground">{labelSets.find((set) => set.isActive)?.name || "Không có"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Label Sets Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quản lý bộ nhãn</CardTitle>
              <CardDescription>Tạo và quản lý các bộ nhãn để phân loại dữ liệu</CardDescription>
            </div>
            <Dialog open={isAddLabelSetOpen} onOpenChange={setIsAddLabelSetOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm bộ nhãn
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Thêm bộ nhãn mới</DialogTitle>
                  <DialogDescription>Tạo bộ nhãn mới với tên, mô tả và các nhãn cụ thể</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelset-name">Tên bộ nhãn *</Label>
                      <Input
                        id="labelset-name"
                        placeholder="Ví dụ: Phân loại tiềm năng tuyển sinh"
                        value={newLabelSet.name}
                        onChange={(e) => setNewLabelSet({ ...newLabelSet, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelset-description">Mô tả *</Label>
                      <Textarea
                        id="labelset-description"
                        placeholder="Mô tả mục đích sử dụng bộ nhãn này"
                        value={newLabelSet.description}
                        onChange={(e) => setNewLabelSet({ ...newLabelSet, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Nhãn trong bộ nhãn</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addNewLabelToForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm nhãn
                      </Button>
                    </div>

                    {newLabelSet.labels.length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Bộ nhãn cần có ít nhất một nhãn. Nhấn "Thêm nhãn" để bắt đầu.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      {newLabelSet.labels.map((label, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Tên nhãn *</Label>
                              <Input
                                placeholder="Ví dụ: Tiềm năng cao"
                                value={label.label}
                                onChange={(e) => updateLabelInForm(index, "label", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Phím tắt</Label>
                              <Input
                                placeholder="1-9"
                                maxLength={1}
                                value={label.hotkey}
                                onChange={(e) => updateLabelInForm(index, "hotkey", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Màu sắc</Label>
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
                            <Label>Mô tả</Label>
                            <Textarea
                              placeholder="Mô tả chi tiết về nhãn này"
                              value={label.description}
                              onChange={(e) => updateLabelInForm(index, "description", e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="mt-3">
                            <Label className="text-sm text-muted-foreground">Xem trước:</Label>
                            <div className="mt-1">
                              <Badge className={label.color}>
                                {label.label || "Tên nhãn"} ({label.hotkey})
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
                    Hủy
                  </Button>
                  <Button
                    onClick={handleAddLabelSet}
                    disabled={!newLabelSet.name || !newLabelSet.description || newLabelSet.labels.length === 0}
                  >
                    Tạo bộ nhãn
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labelSets.map((labelSet) => (
              <Card key={labelSet.id} className={labelSet.isActive ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{labelSet.name}</CardTitle>
                        {labelSet.isActive && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Đang sử dụng</Badge>
                        )}
                        {labelSet.hasExistingData && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Có dữ liệu hiện tại
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{labelSet.description}</CardDescription>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Tạo: {labelSet.createdDate}</span>
                        <span>{labelSet.labels.length} nhãn</span>
                        <span>{labelSet.usageCount.toLocaleString()} lần sử dụng</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditLabels(labelSet)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa nhãn
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(labelSet.id)}>
                          <Tags className="mr-2 h-4 w-4" />
                          {labelSet.isActive ? "Ngừng sử dụng" : "Sử dụng"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteLabelSet(labelSet.id)}
                          disabled={labelSet.isActive || labelSet.usageCount > 0}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa bộ nhãn
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
                    <Card key={label.id} className="p-4">
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
                            onClick={() => {
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
                  <Card key={index} className="p-4 border-dashed">
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
    </div>
  )
}
