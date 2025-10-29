"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Database,
  Tag,
  Brain,
  Settings,
  CheckSquare,
  Sparkles,
  GitCompare,
  FileCode,
  type LucideIcon,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { FPTLogo } from "@/components/fpt-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

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
  const [user, setUser] = React.useState<User>({
    name: "User",
    email: "",
    avatar: "/avatars/default.jpg",
  });
  const [me, setMe] = React.useState<any>(null);

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
          avatar: picture || parsed.picture || "/avatars/default.jpg",
        });
      } else if (picture) {
        setUser((u) => ({ ...u, avatar: picture }));
      }
    } catch (error) {
      console.warn("Failed to load user data from localStorage:", error);
    }
  }, []);

  // Load user role for navigation filtering
  React.useEffect(() => {
    const loadUserRole = async () => {
      try {
        const { getMe } = await import("@/app/api/auth");
        const data = await getMe();
        setMe(data);
      } catch (error) {
        console.warn("Failed to load user role:", error);
      }
    };
    loadUserRole();
  }, []);

  // Define all navigation items
  const allNavItems: NavItem[] = React.useMemo(
    () => [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
      },
      {
        title: "Tasks",
        url: "/tasks",
        icon: CheckSquare,
        isActive: pathname === "/tasks",
      },
      {
        title: "Data Management",
        url: "/data",
        icon: Database,
        isActive: pathname === "/data",
      },
      {
        title: "Schema",
        url: "/schema",
        icon: FileCode,
        isActive: pathname === "/schema",
      },
      {
        title: "Labeling",
        url: "/labeling",
        icon: Tag,
        isActive: pathname === "/labeling",
      },
      {
        title: "Labeling with AI",
        url: "/labelai",
        icon: Tag,
        isActive: pathname === "/labelai",
      },
      {
        title: "Model Dashboard",
        url: "/models",
        icon: Brain,
        isActive: pathname === "/models",
      },
      {
        title: "AI Suggest",
        url: "/aisuggest",
        icon: Sparkles,
        isActive: pathname === "/aisuggest",
      },
      {
        title: "Admin",
        url: "/admin",
        icon: Settings,
        isActive: pathname === "/admin",
      },
      {
        title: "Comparison Tool",
        url: "/comparison-tool",
        icon: GitCompare,
        isActive: pathname === "/comparison-tool",
      },
    ],
    [pathname]
  );

  // Filter navigation items based on user role
  const navMainItems = React.useMemo(() => {
    if (!me) return allNavItems;

    // Manager (role_id=3) and Labeler (role_id=4) restrictions
    if (me.role_id === 3 || me.role_id === 4) {
      let items = allNavItems.filter(
        (item) => item.title !== "Model Dashboard" && item.title !== "Admin"
      );

      // Labeler (role_id=4) additional restrictions
      if (me.role_id === 4) {
        items = items.filter((item) => item.title !== "Data Management");
      }

      console.log(
        `[Navigation for role_id=${me.role_id}]:`,
        items.map((i) => i.title)
      );
      return items;
    }

    // Admin/SuperAdmin - full access
    console.log(
      "[Navigation for Admin/SuperAdmin]:",
      allNavItems.map((i) => i.title)
    );
    return allNavItems;
  }, [me, allNavItems]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-1.5">
          <FPTLogo size="sm" showText={true} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
