"use client"

import { useState } from "react"
import { Plus, Edit2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HexColorPicker, HexColorInput } from "react-colorful"

interface ClassItem {
  id: string
  name: string
  color: string
  count: number
  hotkey?: string
}

// Helper to generate a random hex color
const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [inputValue, setInputValue] = useState("")
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
      color: getRandomColor(),
      count: 0,
      hotkey: `${classes.length + index + 1}`,
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

  const handleColorChange = (classId: string, newColor: string) => {
    setClasses(prevClasses => 
      prevClasses.map(c => c.id === classId ? { ...c, color: newColor } : c)
    );
  };

  const filteredClasses = classes.filter((c) => c.name.toLowerCase().includes(searchValue.toLowerCase()))

  const isEmpty = classes.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Classes</h1>
      <p className="text-muted-foreground mt-1">
        Add a comma-separated list of class names to get started.
      </p>
      <div>
        {isEmpty ? (
          // Empty State
          <div>
            <div className="space-y-4 text-left">
              <Input
                placeholder="cat, dog, bird, ..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClasses()}
                className="py-2"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Classes CSV
                </Button>
                <Button className="gap-2" onClick={handleAddClasses}>
                  <Plus className="w-4 h-4" />
                  Add Classes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Data Table View
          <div className="space-y-6">
            <div className="flex items-center justify-end ">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleOpenAddDialog}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
                <Button className="gap-2" onClick={handleOpenModifyDialog}>
                  <Edit2 className="w-4 h-4" />
                  Modify Classes
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Input
                placeholder="Search classes..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead >Color</TableHead>
                    <TableHead >Class Name</TableHead>
                    <TableHead >Hotkey</TableHead>
                    <TableHead >Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-5 h-5 rounded-full border cursor-pointer"
                              style={{ backgroundColor: classItem.color }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 space-y-2 border-0 bg-card shadow-lg">
                            <HexColorPicker
                              color={classItem.color}
                              onChange={(newColor) =>
                                handleColorChange(classItem.id, newColor)
                              }
                            />
                            <HexColorInput
                              prefixed
                              className="w-full p-1 border rounded text-center bg-input"
                              color={classItem.color}
                              onChange={(newColor) =>
                                handleColorChange(classItem.id, newColor)
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {classItem.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {classItem.hotkey}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {classItem.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Add a comma-separated list of class names
              </label>
              <Input
                placeholder="cat, dog, ..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(
                  e
                ) =>
                  e.key === "Enter" &&
                  (handleAddClasses(), setIsAddDialogOpen(false))
                }
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleAddClasses();
                  setIsAddDialogOpen(false);
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
          <div className="space-y-4 pt-4">
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 sticky top-0">
                    <TableHead className="font-semibold text-foreground">
                      Class Name
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Rename
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Delete
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modifyData.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="text-foreground">
                        {classItem.name}
                      </TableCell>
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
                            const newSet = new Set(deleteChecked);
                            if (checked) {
                              newSet.add(classItem.id);
                            } else {
                              newSet.delete(classItem.id);
                            }
                            setDeleteChecked(newSet);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsModifyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleModifyClasses}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
