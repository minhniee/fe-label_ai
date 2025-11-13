"use client";

import * as React from "react";
import {
  Shield,
  Database,
  Tag,
  Brain,
  Settings,
  CheckSquare,
  Sparkles,
  GitCompare,
  FileCode,
  ListOrdered,
  FileText,
  Upload,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { FPTLogo } from "@/components/fpt-logo";
import { ProjectSwitcher } from "@/components/project-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { getSelectedProject, setSelectedProject, projectToSlug, type Project } from "@/types/project";
import { viewAllProjects } from "@/app/api/project";

interface User {
  name: string;
  email: string;
  avatar: string;
}

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive: boolean;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onLogout?: () => void;
}

export function AppSidebar({ onLogout, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User>({
    name: "User",
    email: "",
    avatar: "",
  });
  const [me, setMe] = React.useState<any>(null);
  const [selectedProject, setSelectedProjectState] = React.useState<Project | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Load user profile data from localStorage
  React.useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const picture =
        typeof window !== "undefined" ? localStorage.getItem("picture") : null;

      if (raw) {
        const parsed: any = JSON.parse(raw);
        setUser({
          name: parsed.username || parsed.name || "User",
          email: parsed.email || "",
          // Prioritize the picture from localStorage, then the one in the user object, then default
          avatar: picture || parsed.picture || "",
        });
      } else if (picture) {
        // If there's a picture in localStorage but no user object, still use the picture
        setUser((u) => ({ ...u, avatar: picture }));
      }
    } catch (error) {
      console.warn("Failed to load user data from localStorage:", error);
    }
  }, []);

  // Load projects and selected project
  React.useEffect(() => {
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
        console.warn("Failed to load projects from API:", error);
        setProjects([]);
      }
    };

    loadProjects();
    setSelectedProjectState(getSelectedProject());

    const handleProjectChange = () => {
      setSelectedProjectState(getSelectedProject());
      // Reload projects when project changes
      loadProjects();
    };

    window.addEventListener("project-changed", handleProjectChange);
    return () => window.removeEventListener("project-changed", handleProjectChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user role for navigation filtering
  React.useEffect(() => {
    const loadUserRole = async () => {
      try {
        const { getMe } = await import("@/app/api/auth");
        const data = await getMe();
        setMe(data);
        // Also hydrate visible user info from backend (Google name/email/image if provided)
        try {
          setUser((prev) => ({
            name:
              (data as any).username ||
              (data as any).name ||
              prev.name ||
              "User",
            email: (data as any).email || prev.email || "",
            avatar:
              // prefer picture from backend if available
              (data as any).picture ||
              (typeof window !== "undefined"
                ? localStorage.getItem("user_picture")
                : null) ||
              prev.avatar ||
              "",
          }));
        } catch {}
      } catch (error) {
        console.warn("Failed to load user role:", error);
      }
    };
    loadUserRole();
  }, []);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedProjectState(project);
    const slug = projectToSlug(project);
    router.push(`/${slug}/upload-file`);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setSelectedProjectState(null);
    router.push("/projects");
  };

  // Define all navigation items (shown when a project is selected)
  const allNavItems: NavItem[] = React.useMemo(
    () => {
      const projectPrefix = selectedProject ? `/${projectToSlug(selectedProject)}` : "";
      
      return [
        {
          title: "Upload Data",
          url: `${projectPrefix}/upload-file`,
          icon: Upload,
          isActive: pathname === `${projectPrefix}/upload-file`,
        },
        {
          title: "Annotate",
          url: `${projectPrefix}/annotate`,
          icon: Tag,
          isActive: pathname.startsWith(`${projectPrefix}/annotate`),
        },
        {
          title: "Dataset",
          url: `${projectPrefix}/dataset`,
          icon: FileText,
          isActive: pathname === `${projectPrefix}/dataset`,
        },
        {
          title: "Schema",
          url: `${projectPrefix}/schema`,
          icon: FileCode,
          isActive: pathname === `${projectPrefix}/schema`,
        },
        {
          title: "Labeling with AI",
          url: `${projectPrefix}/labelai`,
          icon: Tag,
          isActive: pathname === `${projectPrefix}/labelai`,
        },

        {
          title: "Classes",
          url: `${projectPrefix}/classes`,
          icon: ListOrdered,
          isActive: pathname === `${projectPrefix}/classes`,
        },
        {
          title: "Administrator",
          url: "/admin",
          icon: Shield,
          isActive: pathname.startsWith("/admin"),
        },
        {
          title: "Comparison Tool",
          url: `${projectPrefix}/comparison-tool`,
          icon: GitCompare,
          isActive: pathname === `${projectPrefix}/comparison-tool`,
        },
      ];
    },
    [pathname, selectedProject]
  );

  // Filter navigation items based on user role
  const flatItems = React.useMemo(() => {
    if (!me) return allNavItems;

    // Manager (role_id=3) and Labeler (role_id=4) restrictions
    if (me.role_id === 3 || me.role_id === 4) {
      let items = allNavItems.filter((item) => item.title !== "Administrator");

      // Labeler (role_id=4) additional restrictions
      if (me.role_id === 4) {
        items = items.filter((item) => item.title !== "Data Management");
      }

      return items;
    }

    // Admin/SuperAdmin - full access
    return allNavItems;
  }, [me, allNavItems]);

  // Group items: Data
  const dataGroupTitles = new Set([
    "Upload Data",
    "Annotate",
    "Dataset",
    "Schema",
    "Labeling with AI",
    "Classes",
  ]);

  // Group items: Admin
  const adminGroupTitles = new Set(["Administrator"]);

  // Group items: Tool
  const toolGroupTitles = new Set(["Comparison Tool"]);

  const dataItems = flatItems.filter((i) => dataGroupTitles.has(i.title));
  const adminItems = flatItems.filter((i) => adminGroupTitles.has(i.title));
  const toolItems = flatItems.filter((i) => toolGroupTitles.has(i.title));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Show FPT Logo when no project is selected */}
        {!selectedProject ? (
          <div className="px-2 py-1.5 pr-2.5 flex items-center justify-center">
            <FPTLogo size="sm" showText={true} />
          </div>
        ) : (
          /* Show Project Switcher when a project is selected */
          <ProjectSwitcher
            projects={projects}
            activeProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            onCreateProject={handleBackToProjects}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        {selectedProject ? (
          <>
            {/* Data group  */}
            <NavMain groupTitle="Data" items={dataItems} />
            {/* Admin group  */}
            <NavMain groupTitle="Admin" items={adminItems} />
            {/* Platform group  */}
            <NavMain groupTitle="Tool" items={toolItems} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground text-sm">
            <FolderOpen className="h-12 w-12 mb-3 opacity-20" />
            <p>Select a project or create new project to view navigation</p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
