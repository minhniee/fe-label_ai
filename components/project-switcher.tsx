"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { type Project } from "@/types/project";

export function ProjectSwitcher({
  projects,
  activeProject,
  onProjectSelect,
  onCreateProject,
}: {
  projects: Project[];
  activeProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onCreateProject: () => void;
}) {
  const { isMobile } = useSidebar();

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

  if (!activeProject) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <FolderOpen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeProject.name}</span>
                {/* <span className="truncate text-xs">
                  <Badge 
                    variant={
                      activeProject.status === 'labeling' ? 'default' : 
                      activeProject.status === 'ready_to_label' ? 'secondary' : 
                      'outline'
                    }
                    className="text-xs px-1 py-0 h-4"
                  >
                    {formatStatus(activeProject.status)}
                  </Badge>
                </span> */}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Projects
            </DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <FolderOpen className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate font-medium">{project.name}</span>
                  {project.labeling_type && (
                    <span className="text-xs text-muted-foreground truncate">
                      {project.labeling_type}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={onCreateProject}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">View All Projects</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

