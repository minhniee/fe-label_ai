"use client";

import type React from "react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HeaderBar } from "./header-bar";
import { SidebarNav } from "./sidebar-nav";
import {
  LayoutDashboard,
  Database,
  Tag,
  Brain,
  Settings,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { getMe, logout, type MeResponse } from "@/api/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
  },
  {
    name: "Data Management",
    href: "/dashboard/data",
    icon: Database,
  },
  {
    name: "Labeling",
    href: "/dashboard/labeling",
    icon: Tag,
  },
  {
    name: "Model Dashboard",
    href: "/dashboard/models",
    icon: Brain,
  },
  {
    name: "Admin",
    href: "/dashboard/admin",
    icon: Settings,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const data = await getMe();
        setMe(data);
      } catch {
        // ignore
      }
    };
    loadMe();
  }, []);

  // Filter navigation items for Manager(3) and Labeler(4)
  const visibleNavigation = (() => {
    if (!me) return navigation;
    // Manager (3) and Labeler (4) cannot see Model Dashboard and Admin
    let items = navigation.filter((i) => i.name !== "Model Dashboard" && i.name !== "Admin");
    // Labeler (4) additionally cannot see Data Management
    if (me.role_id === 4) {
      items = items.filter((i) => i.name !== "Data Management");
    }
    return items;
  })();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-background">
        <HeaderBar
          me={me}
          onLogout={handleLogout}
          navigation={visibleNavigation}
          pathname={pathname}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="top-16 h-[calc(100vh-4rem)] w-64 p-0"
        >
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-1 px-3 py-4">
              {visibleNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn("hidden lg:fixed lg:top-16 lg:bottom-0 lg:z-40 lg:flex lg:flex-col transition-all", sidebarCollapsed ? "lg:w-16" : "lg:w-64") }>
        <div className={cn("flex grow flex-col gap-y-5 overflow-y-auto bg-white/40 border-r border-sidebar-border", sidebarCollapsed ? "px-2" : "px-6") }>
          <div className="flex items-center justify-center py-3">
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <SidebarNav items={visibleNavigation} collapsed={sidebarCollapsed} />
        </div>
      </div>

      <div className={cn("pt-16 transition-all", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64") }>
        <main className="py-8 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
