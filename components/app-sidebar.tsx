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
  ListOrdered,
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
    avatar: "",
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
        title: "Classes",
        url: "/classes",
        icon: ListOrdered,
        isActive: pathname === "/classes",
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
  const flatItems = React.useMemo(() => {
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

      return items;
    }

    // Admin/SuperAdmin - full access
    return allNavItems;
  }, [me, allNavItems]);

  // Group items: Data
  const dataGroupTitles = new Set([
    "Dashboard",
    "Tasks",
    "Data Management",
    "Schema",
    "Labeling with AI",
    "Model Dashboard",
    "Classes",
  ]);

  // Group items: Admin
  const adminGroupTitles = new Set(["Admin"]);

  // Group items: Tool
  const toolGroupTitles = new Set(["Comparison Tool"]);

  const dataItems = flatItems.filter((i) => dataGroupTitles.has(i.title));
  const adminItems = flatItems.filter((i) => adminGroupTitles.has(i.title));
  const toolItems = flatItems.filter((i) => toolGroupTitles.has(i.title));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-1.5 pr-2.5 flex items-center justify-center">
          <FPTLogo size="sm" showText={true} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Data group  */}
        <NavMain groupTitle="Data" items={dataItems} />
        {/* Admin group  */}
        <NavMain groupTitle="Admin" items={adminItems} />
        {/* Platform group  */}
        <NavMain groupTitle="Tool" items={toolItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
