"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";

interface Label {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export default function ProjectClassesPage() {
  const { project } = useProjectFromSlug();

  const [labels, setLabels] = useState<Label[]>([
    { id: "1", name: "Person", color: "#FF6B6B", visible: true },
    { id: "2", name: "Car", color: "#4ECDC4", visible: true },
    { id: "3", name: "Building", color: "#45B7D1", visible: true },
  ]);

  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string>("");

  const handleColorChange = (labelId: string, newColor: string) => {
    setLabels(
      labels.map((label) =>
        label.id === labelId ? { ...label, color: newColor } : label
      )
    );
  };

  const handleVisibilityToggle = (labelId: string) => {
    setLabels(
      labels.map((label) =>
        label.id === labelId ? { ...label, visible: !label.visible } : label
      )
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage label classes for project: {project?.name || "Loading..."}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[200px]">Color</TableHead>
              <TableHead className="w-[100px]">Visibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label) => (
              <TableRow key={label.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">{label.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Popover
                      open={editingColor === label.id}
                      onOpenChange={(open) => {
                        setEditingColor(open ? label.id : null);
                        if (open) setTempColor(label.color);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-16 p-0 border-2"
                          style={{ backgroundColor: label.color }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <div className="space-y-3">
                          <HexColorPicker
                            color={tempColor}
                            onChange={setTempColor}
                          />
                          <Input
                            value={tempColor}
                            onChange={(e) => setTempColor(e.target.value)}
                            placeholder="#000000"
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              handleColorChange(label.id, tempColor);
                              setEditingColor(null);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm text-muted-foreground font-mono">
                      {label.color}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleVisibilityToggle(label.id)}
                  >
                    {label.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

