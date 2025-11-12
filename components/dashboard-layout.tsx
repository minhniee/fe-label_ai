"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-guard"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty"
import { Bell } from "lucide-react"

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
  const { logout } = useAuth()
  const [notifications, setNotifications] = React.useState<any[]>([])

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
      <AppSidebar onLogout={logout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
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

            <div className="ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  {notifications.length === 0 ? (
                    <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Bell />
                        </EmptyMedia>
                        <EmptyTitle>No Notifications</EmptyTitle>
                        <EmptyDescription>
                          You&apos;re all caught up. New notifications will appear here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="p-3">
                      {/* Render notifications list here */}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>
        <div className={cn("flex-1 p-4 pt-0")}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
