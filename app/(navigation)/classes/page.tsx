"use client"

import { useState } from "react"
import { Plus, Edit2, Upload, ListFilter, ChevronDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ClassItem {
  id: string
  name: string
  color: string
  count: number
  hotkey?: string
}

const COLORS = ["#FFA500", "#7C3AED", "#3B82F6", "#10B981", "#EF4444", "#F59E0B"]

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [inputValue, setInputValue] = useState("")
  const [fixInvalid, setFixInvalid] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false)
  const [modifyData, setModifyData] = useState<ClassItem[]>([])
  const [deleteChecked, setDeleteChecked] = useState<Set<string>>(new Set())
  const [renameValues, setRenameValues] = useState<Record<string, string>>({})

  const handleAddClasses = () => {
    if (!inputValue.trim()) return

    const newClassNames = inputValue
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const newClasses = newClassNames.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      name,
      color: COLORS[classes.length % COLORS.length],
      count: 0,
      hotkey: `${index + 1}`,
    }))

    setClasses([...classes, ...newClasses])
    setInputValue("")
  }

  const handleOpenAddDialog = () => {
    setIsAddDialogOpen(true)
  }

  const handleOpenModifyDialog = () => {
    setModifyData([...classes])
    setRenameValues({})
    setDeleteChecked(new Set())
    setIsModifyDialogOpen(true)
  }

  const handleModifyClasses = () => {
    const updatedClasses = modifyData
      .filter((c) => !deleteChecked.has(c.id))
      .map((c) => ({
        ...c,
        name: renameValues[c.id] || c.name,
      }))

    setClasses(updatedClasses)
    setIsModifyDialogOpen(false)
  }

  const filteredClasses = classes.filter((c) => c.name.toLowerCase().includes(searchValue.toLowerCase()))

  const isEmpty = classes.length === 0

  return (
    <div className="min-h-screen bg-background ">
      <div >
        {isEmpty ? (
          // Empty State
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Classes
              </h1>
              <p className="text-muted-foreground mt-1">Add a comma separated list of class names</p>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="cat, dog, ..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="py-2"
              />

              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="w-4 h-4" />
                  Upload Classes CSV
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleAddClasses}>
                  <Plus className="w-4 h-4" />
                  Add Classes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Data Table View
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2 mb-6">
                <ListFilter className="w-6 h-6" />
                Classes & Tags
              </h1>

              <div className="space-y-4">
                {/* Header Section */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 max-w-xs">
                    <Input
                      placeholder="Search classes..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      What is a class?
                    </button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleOpenAddDialog}>
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleOpenModifyDialog}>
                      <Edit2 className="w-4 h-4" />
                      Modify Classes
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <span>Sort By</span>
                    <span className="text-muted-foreground">Class Ascending</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Color</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                          Class Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Hotkey</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((classItem) => (
                        <TableRow key={classItem.id} className="border-b last:border-b-0">
                          <TableCell>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: classItem.color }} />
                          </TableCell>
                          <TableCell className="text-foreground">{classItem.name}</TableCell>
                          <TableCell className="text-muted-foreground">{classItem.hotkey}</TableCell>
                          <TableCell className="text-muted-foreground">{classItem.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add New Classes Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Classes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Add a comma separated list of class names</label>
              <Input placeholder="cat, dog, ..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Upload Classes CSV
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  handleAddClasses()
                  setIsAddDialogOpen(false)
                }}
              >
                Add Classes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modify Classes Dialog */}
      <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modify Classes</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-semibold text-foreground">Class Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Rename</TableHead>
                    <TableHead className="font-semibold text-foreground">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modifyData.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="text-foreground">{classItem.name}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="New name"
                          value={renameValues[classItem.id] || ""}
                          onChange={(e) =>
                            setRenameValues({
                              ...renameValues,
                              [classItem.id]: e.target.value,
                            })
                          }
                          className="w-48"
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={deleteChecked.has(classItem.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(deleteChecked)
                            if (checked) {
                              newSet.add(classItem.id)
                            } else {
                              newSet.delete(classItem.id)
                            }
                            setDeleteChecked(newSet)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsModifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleModifyClasses}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
