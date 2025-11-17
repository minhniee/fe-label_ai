"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, FolderPlus, Plus, MoreVertical } from "lucide-react";
import { setSelectedProject, projectToSlug, type Project } from "@/types/project";
import { createProject, viewAllProjects, type ProjectCreateRequest } from "@/app/api/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { toast } from "sonner";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-edited");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      const apiProjects = await viewAllProjects();
      const convertedProjects: Project[] = apiProjects.map((p) => ({
        id: p.project_id.toString(),
        name: p.name,
        description: p.description,
        labeling_type: p.labeling_type,
        status: p.status,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
      setProjects(convertedProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
      setProjects([]);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    const slug = projectToSlug(project);
    router.push(`/${slug}/upload-file`);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreating(true);
    try {
      const payload: ProjectCreateRequest = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      };

      const newProject = await createProject(payload);
      
      toast.success(`Project "${newProject.name}" created successfully!`);
      
      // Reload projects
      await loadProjects();
      
      // Reset form and close dialog
      setNewProjectName("");
      setNewProjectDescription("");
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to organize your data labeling workflow.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateProject();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description (Optional)</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Enter project description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewProjectName("");
                    setNewProjectDescription("");
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Show Empty State if no projects */}
      {projects.length === 0 ? (
        <Empty className="min-h-[400px]">
          <EmptyHeader>
            <EmptyMedia>
              <FolderPlus className="h-16 w-16" />
            </EmptyMedia>
            <EmptyTitle>No projects found</EmptyTitle>
            <EmptyDescription>
              Create your first project to start labeling and managing your data.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* Search and Sort Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date Edited" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-edited">Date Edited</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                onClick={() => handleProjectClick(project)}
              >
                {/* Project Thumbnail */}
                <div className="bg-muted overflow-hidden relative">
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-background"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </div>

                {/* Project Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

