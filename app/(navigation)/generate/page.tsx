"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataGenerator } from "@/components/label-ai/data-generator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { viewAllProjects } from "@/app/api/project"
import { uploadFilesToProject } from "@/app/api/project"
import { projectToSlug } from "@/types/project"
import { ArrowLeft } from "lucide-react"

export type RowData = {
  _id: string
  [key: string]: any
}

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const projectIdFromQuery = searchParams.get("projectId")
  const [generatedData, setGeneratedData] = useState<RowData[]>([])
  const [generatedColumns, setGeneratedColumns] = useState<string[]>([])
  const [datasetName, setDatasetName] = useState<string>("")
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [loadingProjects, setLoadingProjects] = useState(false)
const [importing, setImporting] = useState(false)

const loadProjects = useCallback(
  async (prefillProjectId?: string | null) => {
    try {
      setLoadingProjects(true)
      const projectsList = await viewAllProjects()
      const convertedProjects = projectsList.map((p) => ({
        id: p.project_id.toString(),
        name: p.name,
        description: p.description,
        labeling_type: p.labeling_type,
        status: p.status,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
        dataset_id: p.dataset_id,
        slug: projectToSlug({
          id: p.project_id.toString(),
          name: p.name,
          description: p.description,
          labeling_type: p.labeling_type,
          status: p.status,
          created_by: p.created_by,
          created_at: p.created_at,
          updated_at: p.updated_at,
          dataset_id: p.dataset_id,
        }),
      }))
      setProjects(convertedProjects)

      if (convertedProjects.length === 0) {
        setSelectedProjectId("")
        return
      }

      setSelectedProjectId((prev) => {
        if (prev && convertedProjects.some((project) => project.id === prev)) {
          return prev
        }

        if (prefillProjectId) {
          const matchingProject =
            convertedProjects.find((project) => project.slug === prefillProjectId) ??
            convertedProjects.find((project) => project.id === prefillProjectId)
          if (matchingProject) {
            return matchingProject.id
          }
        }

        return prev
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      })
    } finally {
      setLoadingProjects(false)
    }
  },
  [toast]
)

useEffect(() => {
  loadProjects(projectIdFromQuery)
}, [loadProjects, projectIdFromQuery])

const handleDataGenerated = (data: any[], columns: string[], name: string) => {
    setGeneratedData(data)
    setGeneratedColumns(columns)
    setDatasetName(name)
    setShowImportDialog(true)
  }

  const handleImportToProject = async () => {
    if (!selectedProjectId) {
      toast({
        title: "Missing information",
        description: "Please select a project to import to",
        variant: "destructive",
      })
      return
    }

    if (generatedData.length === 0) {
      toast({
        title: "No data",
        description: "No data to import",
        variant: "destructive",
      })
      return
    }

    try {
      setImporting(true)

      // Convert data to CSV format
      const csvRows: string[] = []
      
      // Add header row
      csvRows.push(generatedColumns.join(","))
      
      // Add data rows
      generatedData.forEach((row) => {
        const values = generatedColumns.map((col) => {
          const value = row[col] || ""
          // Escape commas and quotes in CSV
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        csvRows.push(values.join(","))
      })

      const csvContent = csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const file = new File([blob], `${datasetName || "generated-data"}.csv`, { type: "text/csv" })

      // Upload to project
      const result = await uploadFilesToProject(parseInt(selectedProjectId), [file])

      toast({
        title: "Success",
        description: `Successfully imported ${generatedData.length} rows to project`,
      })

      // Redirect to project annotate page
      const selectedProject = projects.find((p) => p.id === selectedProjectId)
      if (selectedProject) {
        router.push(`/${selectedProject.slug}/annotate`)
      } else {
        router.push("/projects")
      }
    } catch (error: any) {
      console.error("Error importing to project:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to import to project",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleBack = () => {
    if (projectIdFromQuery) {
      router.push(`/${projectIdFromQuery}/upload-file`)
    } else {
      router.back()
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

    <Card className="p-6 mb-4">
      <div className="space-y-2">
        <Label htmlFor="project-select">Select Project</Label>
        <Select
          value={selectedProjectId}
          onValueChange={setSelectedProjectId}
          disabled={loadingProjects || importing || projects.length === 0}
        >
          <SelectTrigger id="project-select">
            <SelectValue
              placeholder={
                loadingProjects ? "Loading projects..." : projects.length === 0 ? "No projects available" : "Choose a project"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Generated data will be imported into the selected project once you confirm.
        </p>
      </div>
    </Card>

      <Card className="p-6">
        <DataGenerator onDataGenerated={handleDataGenerated} />
      </Card>

      {/* Import to Project Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import to Project</DialogTitle>
            <DialogDescription>
              Select a project to import the generated data ({generatedData.length} rows)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects || importing}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportToProject}
              disabled={!selectedProjectId || importing}
            >
              {importing ? "Importing..." : "Import to Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

