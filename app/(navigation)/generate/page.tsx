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
import { createProjectBatch } from "@/app/api/batch"
import { projectToSlug } from "@/types/project"
import { ArrowLeft } from "lucide-react"
import { convertDataToCSV } from "@/lib/label-ai-utils"
import { toast as sonnerToast } from "sonner"

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

    const toastId = sonnerToast.loading("Importing data to project...")

    try {
      setImporting(true)

      // Step 1: Convert data to CSV format
      const csvContent = convertDataToCSV(generatedData, generatedColumns)
      const blob = new Blob([csvContent], { type: "text/csv" })
      const file = new File([blob], `${datasetName || "generated-data"}.csv`, { type: "text/csv" })

      // Step 2: Upload to project
      const uploadResponse = await uploadFilesToProject(parseInt(selectedProjectId), [file])

      if (!uploadResponse?.success || !uploadResponse?.files || uploadResponse.files.length === 0) {
        throw new Error("Failed to upload file to project")
      }

      sonnerToast.success("File uploaded successfully!", { id: toastId })

      // Step 3: Extract file_ids from upload response
      const fileIds = uploadResponse.files.map((f) => f.file_id)

      // Step 4: Create batch name with timestamp
      const now = new Date()
      const batchName = `Generated Data - ${now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      })} at ${now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`

      // Step 5: Create batch with the uploaded file
      const batchResponse = await createProjectBatch({
        project_id: parseInt(selectedProjectId),
        name: batchName,
        description: `Generated data batch with ${generatedData.length} rows`,
        file_ids: fileIds,
        batch_metadata: {
          file_ids: fileIds,
          source: "generated_data",
          row_count: generatedData.length,
          columns: generatedColumns,
        },
      })

      console.log("=== Batch Creation Response ===")
      console.log("Batch Response:", batchResponse)
      console.log("Batch ID:", batchResponse.batch_id)
      console.log("File IDs:", fileIds)
      console.log("===============================")

      sonnerToast.success("Batch created successfully!", { id: toastId })

      toast({
        title: "Success",
        description: `Successfully imported ${generatedData.length} rows to project`,
      })

      // Step 6: Redirect to batch annotation page with file IDs
      const selectedProject = projects.find((p) => p.id === selectedProjectId)
      console.log("=== Redirect Debug ===")
      console.log("Selected Project:", selectedProject)
      console.log("Project Slug:", selectedProject?.slug)
      console.log("Batch ID:", batchResponse.batch_id)
      console.log("=====================")

      if (selectedProject && selectedProject.slug) {
        const fileIdsParam = encodeURIComponent(JSON.stringify(fileIds))
        const redirectUrl = `/${selectedProject.slug}/annotate/batch?batchId=${batchResponse.batch_id}&fileIds=${fileIdsParam}`
        console.log("Redirecting to:", redirectUrl)
        router.push(redirectUrl)
      } else {
        console.error("Project or slug not found, redirecting to projects")
        router.push("/projects")
      }
    } catch (error: any) {
      console.error("Error importing to project:", error)
      sonnerToast.error(error.message || "Failed to import to project", { id: toastId })
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

