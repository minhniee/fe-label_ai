"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Route title mapping for breadcrumbs
const ROUTE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  data: "Data Management",
  labeling: "Labeling",
  labelai: "Label AI",
  models: "Model Dashboard",
  aisuggest: "AI Suggest",
  "comparison-tool": "Comparison Tool",
  admin: "Admin",
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      const { logout } = await import("@/app/api/auth")
      await logout()
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    
    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1
      const label = ROUTE_TITLES[segment] ?? segment.replace(/[-_]/g, " ")
      const href = `/${segments.slice(0, index + 1).join("/")}`
      
      return (
        <React.Fragment key={index}>
          <BreadcrumbItem>
            {isLast ? (
              <BreadcrumbPage>{label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!isLast && <BreadcrumbSeparator />}
        </React.Fragment>
      )
    })
  }

  return (
    <SidebarProvider>
      <AppSidebar onLogout={handleLogout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 cursor-pointer" />
            <Separator 
              orientation="vertical" 
              className="mr-2 data-[orientation=vertical]:h-4" 
            />
            <Breadcrumb>
              <BreadcrumbList>
                {generateBreadcrumbs()}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className={cn("flex-1 p-4 pt-0")}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
