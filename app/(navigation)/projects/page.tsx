"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, FolderPlus, Plus, MoreVertical, FileText, Pencil, UserPlus, Trash2 } from "lucide-react";
import { setSelectedProject, projectToSlug, type Project } from "@/types/project";
import { 
  createProject, 
  viewAllProjects, 
  getProjectFiles, 
  updateProject,
  deleteProject,
  createInvitation,
  type ProjectCreateRequest,
  type AddCollaboratorRequest
} from "@/app/api/project";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [projectFileCounts, setProjectFileCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-edited");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitingProject, setInvitingProject] = useState<Project | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<number>(5); // Default to Labeler
  const [isInviting, setIsInviting] = useState(false);

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
        dataset_id: p.dataset_id,
      }));
      setProjects(convertedProjects);

      // Load file counts for each project
      const fileCounts: Record<string, number> = {};
      await Promise.all(
        convertedProjects.map(async (project) => {
          try {
            const files = await getProjectFiles(parseInt(project.id));
            fileCounts[project.id] = files.length;
          } catch (error) {
            console.error(`Failed to load files for project ${project.id}:`, error);
            fileCounts[project.id] = 0;
          }
        })
      );
      setProjectFileCounts(fileCounts);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
      setProjects([]);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    // default: date-edited (newest first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    const slug = projectToSlug(project);
    router.push(`/${slug}/upload-file`);
  };

  // Helper function to format status
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: "Draft",
      ready_to_label: "Ready To Label",
      labeling: "Labeling",
      completed: "Completed",
    };
    return statusMap[status] || status;
  };

  // Helper function to get days ago
  const getDaysAgo = (date: string): string => {
    const now = new Date();
    const updatedDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "today";
    } else if (diffDays === 1) {
      return "1 day ago";
    } else {
      return `${diffDays} days ago`;
    }
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

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsUpdating(true);
    try {
      const updatedProject = await updateProject(parseInt(editingProject.id), {
        name: editProjectName.trim(),
        description: editProjectDescription.trim() || undefined,
      });
      
      toast.success(`Project "${updatedProject.name}" updated successfully!`);
      
      // Reload projects
      await loadProjects();
      
      // Reset and close dialog
      setIsEditDialogOpen(false);
      setEditingProject(null);
      setEditProjectName("");
      setEditProjectDescription("");
    } catch (error: any) {
      console.error("Failed to update project:", error);
      toast.error(error.message || "Failed to update project");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleInviteClick = (project: Project) => {
    setInvitingProject(project);
    setInviteEmail("");
    setInviteRoleId(5); // Reset to Labeler
    setIsInviteDialogOpen(true);
  };

  const handleSendInvitation = async () => {
    if (!invitingProject) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteEmail.trim() || !emailRegex.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    try {
      const payload: AddCollaboratorRequest = {
        email: inviteEmail.trim(),
        role_id: inviteRoleId,
      };

      await createInvitation(parseInt(invitingProject.id), payload);
      toast.success(`Invitation sent to ${inviteEmail.trim()} successfully!`);
      
      // Close dialog and reset
      setIsInviteDialogOpen(false);
      setInvitingProject(null);
      setInviteEmail("");
      setInviteRoleId(5);
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;

    setIsDeleting(true);
    try {
      await deleteProject(parseInt(deletingProject.id));
      toast.success(`Project "${deletingProject.name}" deleted successfully!`);
      
      // Reload projects
      await loadProjects();
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      setDeletingProject(null);
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      toast.error(error.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
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
            {sortedProjects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow relative"
                onClick={() => handleProjectClick(project)}
              >
                {/* Dropdown Menu */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(project);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleInviteClick(project);
                      }}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite team member
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(project);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Project Info */}
                <div className="p-5 space-y-3">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between gap-2 pr-8">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-xl truncate">{project.name}</h3>
                    </div>
                    <Badge 
                      variant={
                        project.status === 'completed' ? 'default' : 
                        project.status === 'labeling' ? 'default' : 
                        project.status === 'ready_to_label' ? 'secondary' : 
                        'outline'
                      }
                      className={`flex-shrink-0 ${
                        project.status === 'completed' 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : ''
                      }`}
                    >
                      {formatStatus(project.status)}
                    </Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Files count */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>{projectFileCounts[project.id] ?? 0} file{projectFileCounts[project.id] !== 1 ? 's' : ''}</span>
                  </div>
                  
                  {/* Created and Updated dates */}
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-2 border-t">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    <span>Edited {getDaysAgo(project.updated_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name *</Label>
              <Input
                id="edit-project-name"
                placeholder="Enter project name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleUpdateProject();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description (Optional)</Label>
              <Textarea
                id="edit-project-description"
                placeholder="Enter project description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingProject(null);
                setEditProjectName("");
                setEditProjectDescription("");
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={isUpdating || !editProjectName.trim()}>
              {isUpdating ? "Updating..." : "Update Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <span className="font-semibold"> "{deletingProject?.name}"</span> and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Team Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join the project{" "}
              <span className="font-semibold">"{invitingProject?.name}"</span> as a collaborator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendInvitation();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role *</Label>
              <Select
                value={inviteRoleId.toString()}
                onValueChange={(value) => setInviteRoleId(parseInt(value))}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Co-Owner</SelectItem>
                  <SelectItem value="5">Labeler</SelectItem>
                  <SelectItem value="6">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRoleId === 4 && "Co-Owner can manage the project and invite members."}
                {inviteRoleId === 5 && "Labeler can label and annotate project data."}
                {inviteRoleId === 6 && "Viewer can only view project data."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteDialogOpen(false);
                setInvitingProject(null);
                setInviteEmail("");
                setInviteRoleId(5);
              }}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

