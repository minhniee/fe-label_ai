"use client"

import React from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty"
import { Bell, Check, X } from "lucide-react"
import { 
  getNotifications, 
  markNotificationRead, 
  getUnreadCount,
  type NotificationResponse 
} from "@/app/api/notifications"
import { acceptInvitation, viewAllProjects } from "@/app/api/project"
import { projectToSlug, setSelectedProject, getSelectedProject, type Project } from "@/types/project"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

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

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { logout } = useAuth()
  const [notifications, setNotifications] = React.useState<NotificationResponse[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loadingNotifications, setLoadingNotifications] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [storedProject, setStoredProjectState] = React.useState<Project | null>(null)

  React.useEffect(() => {
    const updateStoredProject = () => {
      setStoredProjectState(getSelectedProject())
    }

    updateStoredProject()
    window.addEventListener("project-changed", updateStoredProject)
    return () => window.removeEventListener("project-changed", updateStoredProject)
  }, [])

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoadingNotifications(true)
      const response = await getNotifications({ limit: 50 })
      setNotifications(response.notifications || [])
      setUnreadCount(response.unread_count || 0)
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoadingNotifications(false)
    }
  }, [])

  // Fetch unread count only (lighter operation)
  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await getUnreadCount()
      setUnreadCount(response.unread_count || 0)
    } catch (error: any) {
      console.error("Failed to fetch unread count:", error)
    }
  }, [])

  // Fetch notifications on mount and when popover opens
  React.useEffect(() => {
    fetchNotifications()
    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications, fetchUnreadCount])

  // Fetch notifications when popover opens
  React.useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // Handle notification click
  const handleNotificationClick = React.useCallback(async (notification: NotificationResponse) => {
    try {
      // Mark as read
      if (!notification.read) {
        await markNotificationRead(notification.notification_id)
        setNotifications(prev => 
          prev.map(n => 
            n.notification_id === notification.notification_id 
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      const metadata = notification.notification_metadata || {}
      
      // Handle job assignment notifications
      if (notification.type === "job_assigned" && metadata.batch_id) {
        const projectSlug = metadata.project_slug
        const batchId = metadata.batch_id
        const fileIds = metadata.file_ids || []
        
        if (projectSlug && batchId) {
          const fileIdsParam = fileIds.length > 0 
            ? encodeURIComponent(JSON.stringify(fileIds))
            : ""
          const url = fileIdsParam
            ? `/${projectSlug}/annotate/job?jobId=${batchId}&fileIds=${fileIdsParam}`
            : `/${projectSlug}/annotate/job?jobId=${batchId}`
          router.push(url)
          setOpen(false)
          return
        }
      }

      // Handle project invitation notifications
      if (notification.type === "project_invitation" && metadata.invitation_id) {
        try {
          const inviteToken = metadata.invite_token
          
          if (!inviteToken) {
            // Fallback: redirect to accept page with invitation ID
            // But we need token, so try to get it from the invitation
            toast.error("Invitation token not available. Please use the email link.")
            setOpen(false)
            return
          }
          
          // Accept invitation directly
          const result = await acceptInvitation({ 
            invite_token: inviteToken
          })
          
          if (result.project_id) {
            // Fetch project details to create slug
            const projects = await viewAllProjects()
            const invitedProject = projects.find(p => p.project_id === result.project_id)
            
            if (invitedProject) {
              const project: Project = {
                id: invitedProject.project_id.toString(),
                name: invitedProject.name,
                description: invitedProject.description,
                labeling_type: invitedProject.labeling_type,
                status: invitedProject.status,
                created_by: invitedProject.created_by,
                created_at: invitedProject.created_at,
                updated_at: invitedProject.updated_at,
              }
              
              setSelectedProject(project)
              const slug = projectToSlug(project)
              router.push(`/${slug}/annotate`)
              toast.success("Invitation accepted! Welcome to the project.")
            } else {
              router.push("/projects")
              toast.success("Invitation accepted!")
            }
          }
          
          setOpen(false)
        } catch (error: any) {
          console.error("Failed to accept invitation:", error)
          // If already accepted, that's fine - just redirect
          if (error.message?.includes("already") || error.message?.includes("collaborator")) {
            try {
              if (metadata.project_id) {
                const projects = await viewAllProjects()
                const project = projects.find(p => p.project_id === metadata.project_id)
                if (project) {
                  const projectData: Project = {
                    id: project.project_id.toString(),
                    name: project.name,
                    description: project.description,
                    labeling_type: project.labeling_type,
                    status: project.status,
                    created_by: project.created_by,
                    created_at: project.created_at,
                    updated_at: project.updated_at,
                  }
                  setSelectedProject(projectData)
                  const slug = projectToSlug(projectData)
                  router.push(`/${slug}/annotate`)
                  toast.success("You're already a member of this project!")
                } else {
                  router.push("/projects")
                }
              } else {
                router.push("/projects")
              }
            } catch (fetchError) {
              router.push("/projects")
            }
          } else {
            toast.error(error.message || "Failed to accept invitation")
          }
        }
        return
      }

      // Default: close popover
      setOpen(false)
    } catch (error: any) {
      console.error("Error handling notification click:", error)
      toast.error("Failed to process notification")
    }
  }, [router])

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbItems: Array<{
      label: string
      href: string
      isLast: boolean
    }> = []

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index]

      // Handle /job/{jobId} paths
      if (
        segment === "job" &&
        index + 1 < segments.length &&
        /^\d+$/.test(segments[index + 1])
      ) {
        const jobIdSegment = segments[index + 1]
        const nextSegment = index + 2 < segments.length ? segments[index + 2] : null
        
        // Special case: /job/{jobId}/auto-label should show "Batch" instead of "Job"
        // because auto-label page is for configuring batch, not reviewing job
        if (nextSegment === "auto-label") {
          const batchQuery = new URLSearchParams()
          batchQuery.set("batchId", jobIdSegment)

          const fileIdsParam = searchParams?.get("fileIds")
          if (fileIdsParam) {
            batchQuery.set("fileIds", fileIdsParam)
          }

          // Build batch href: /{projectSlug}/annotate/batch?batchId=...
          const projectSlug = segments[0] // e.g., "6-data-h-c-ph-fpt"
          const batchHref = `/${projectSlug}/annotate/batch?${batchQuery.toString()}`
          
          // Batch is NOT the last item, "auto-label" will be added next
          breadcrumbItems.push({
            label: "Batch",
            href: batchHref,
            isLast: false,
          })

          // Now add "auto-label" segment immediately
          const autoLabelIsLast = index + 2 === segments.length - 1
          breadcrumbItems.push({
            label: "Auto Label",
            href: `/${segments.slice(0, index + 3).join("/")}`, // Full path including auto-label
            isLast: autoLabelIsLast,
          })

          // Skip "job", jobId, and "auto-label" segments (all 3)
          index += 3
          continue
        }

        // Normal job path: /job/{jobId} or /job/{jobId}/annotating
        const isLast = index + 1 === segments.length - 1

        const jobQuery = new URLSearchParams()
        jobQuery.set("jobId", jobIdSegment)

        const fileIdsParam = searchParams?.get("fileIds")
        const jobNameParam = searchParams?.get("jobName")
        if (fileIdsParam) {
          jobQuery.set("fileIds", fileIdsParam)
        }
        if (jobNameParam) {
          jobQuery.set("jobName", jobNameParam)
        }

        const jobHrefBase = segments.slice(0, index + 1).join("/")

        breadcrumbItems.push({
          label: "Job",
          href: `/${jobHrefBase}?${jobQuery.toString()}`,
          isLast,
        })

        index++ // Skip the jobId segment since it's combined
        continue
      }

      const isLast = index === segments.length - 1
      const projectMatch = segment.match(/^(\d+)-(.+)$/)
      let label: string
      let href: string

      if (projectMatch) {
        const [, projectId, projectNameSlug] = projectMatch
        const decodedSlugName = decodeURIComponent(projectNameSlug.replace(/-/g, " "))
        const matchedProjectName =
          storedProject && storedProject.id === projectId
            ? storedProject.name
            : decodedSlugName
        label = matchedProjectName
        // Always send users to the main project page when clicking project breadcrumb
        // Example: "/14-my-project/..." -> "/14-my-project/annotate"
        const projectSlug = segments[0]
        href = `/projects`
      } else {
        // Special handling for auto-label segment
        if (segment === "auto-label") {
          label = "Auto Label"
        } else {
          const segmentWithSpaces = segment.replace(/[-_]/g, " ")
          label = ROUTE_TITLES[segment] ?? capitalizeWords(segmentWithSpaces)
        }
        href = `/${segments.slice(0, index + 1).join("/")}`
      }

      breadcrumbItems.push({ label, href, isLast })
    }
    
    return breadcrumbItems.map((item, idx) => (
      <React.Fragment key={idx}>
        <BreadcrumbItem>
          {item.isLast ? (
            <BreadcrumbPage>{item.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!item.isLast && <BreadcrumbSeparator />}
      </React.Fragment>
    ))
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
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary">{unreadCount} unread</Badge>
                    )}
                  </div>
                  <ScrollArea className="h-[400px]">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-sm text-muted-foreground">Loading notifications...</div>
                      </div>
                    ) : notifications.length === 0 ? (
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
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <div
                            key={notification.notification_id}
                            className={cn(
                              "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                              !notification.read && "bg-muted/30"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-1">
                                  <h4 className={cn(
                                    "text-sm font-medium break-words flex-1 min-w-0",
                                    !notification.read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  )}
                                </div>
                                <p 
                                  className="text-sm text-muted-foreground mb-2 break-words whitespace-normal"
                                  style={{ 
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    hyphens: 'auto'
                                  }}
                                >
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
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
