"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  Filter,
  RefreshCw,
  User as UserIcon,
  Loader2,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getAuditLogs,
  getEventChanges,
  deleteAuditByProject,
  deleteAuditByUser,
  exportAllAuditLogs,
  type AuditEventResponse,
  type AuditChangeResponse,
  type AuditLogsQuery,
} from "@/app/api/audit";
import { getUsers, type User } from "@/app/api/users";

const PAGE_SIZE = 25;

type TabKey = "workspace" | "user";

export default function AuditLogPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("workspace");
  const [users, setUsers] = useState<User[]>([]);

  const [logs, setLogs] = useState<AuditEventResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    userId: "",
    projectId: "",
    action: "",
    resourceType: "",
    fromTime: "",
    toTime: "",
  });

  const [selectedUserId, setSelectedUserId] = useState("all");
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [eventChanges, setEventChanges] = useState<Record<number, AuditChangeResponse[]>>({});
  const [loadingChanges, setLoadingChanges] = useState<Record<number, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  const numericUserId = useMemo(() => {
    if (selectedUserId === "all") return undefined;
    const parsed = Number(selectedUserId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [selectedUserId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await getUsers();
        setUsers(list);
      } catch (error: any) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users");
      }
    };
    fetchUsers();
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query: AuditLogsQuery = {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        user_id: activeTab === "user" && numericUserId ? numericUserId : filters.userId ? Number(filters.userId) : undefined,
        project_id: filters.projectId ? Number(filters.projectId) : undefined,
        action: filters.action || undefined,
        resource_type: filters.resourceType || undefined,
        from_time: filters.fromTime ? new Date(filters.fromTime).toISOString() : undefined,
        to_time: filters.toTime ? new Date(filters.toTime + "T23:59:59").toISOString() : undefined,
      };

      const response = await getAuditLogs(query);
      setLogs(response.events || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error("Failed to load audit logs:", error);
      toast.error(error.message || "Failed to load audit logs");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, numericUserId, filters, currentPage]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, numericUserId, filters]);

  const loadEventChanges = useCallback(async (eventId: number) => {
    if (eventChanges[eventId]) {
      // Already loaded
      return;
    }

    setLoadingChanges((prev) => ({ ...prev, [eventId]: true }));
    try {
      const changes = await getEventChanges(eventId);
      setEventChanges((prev) => ({ ...prev, [eventId]: changes }));
    } catch (error: any) {
      console.error("Failed to load event changes:", error);
      toast.error(error.message || "Failed to load event changes");
    } finally {
      setLoadingChanges((prev) => ({ ...prev, [eventId]: false }));
    }
  }, [eventChanges]);

  const handleToggleEvent = (eventId: number) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      loadEventChanges(eventId);
    }
  };

  const handleDeleteByProject = async (projectId: number) => {
    try {
      const response = await deleteAuditByProject(projectId);
      toast.success(response.message || `Deleted ${response.deleted_events} events and ${response.deleted_changes} changes`);
      loadLogs();
    } catch (error: any) {
      console.error("Failed to delete audit logs:", error);
      toast.error(error.message || "Failed to delete audit logs");
    }
  };

  const handleDeleteByUser = async (userId: number) => {
    try {
      const response = await deleteAuditByUser(userId);
      toast.success(response.message || `Deleted ${response.deleted_events} events and ${response.deleted_changes} changes`);
      loadLogs();
    } catch (error: any) {
      console.error("Failed to delete audit logs:", error);
      toast.error(error.message || "Failed to delete audit logs");
    }
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "-";
    try {
      return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
    } catch {
      return value;
    }
  };

  const convertToCSV = (events: AuditEventResponse[]): string => {
    const headers = [
      "Event ID",
      "Timestamp",
      "User ID",
      "Action",
      "Resource Type",
      "Resource ID",
      "HTTP Method",
      "Path",
      "Status Code",
      "IP Address",
      "Request ID",
      "Extra",
    ];

    const rows = events.map((event) => {
      return [
        event.event_id.toString(),
        formatTimestamp(event.occurred_at),
        event.user_id?.toString() || "",
        event.action,
        event.resource_type || "",
        event.resource_id?.toString() || "",
        event.http_method || "",
        event.path || "",
        event.status_code?.toString() || "",
        event.ip_address || "",
        event.request_id || "",
        event.extra ? JSON.stringify(event.extra) : "",
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ];

    return csvRows.join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportWorkspace = async () => {
    setIsExporting(true);
    try {
      const query: AuditLogsQuery = {
        user_id: filters.userId ? Number(filters.userId) : undefined,
        project_id: filters.projectId ? Number(filters.projectId) : undefined,
        action: filters.action || undefined,
        resource_type: filters.resourceType || undefined,
        from_time: filters.fromTime ? new Date(filters.fromTime).toISOString() : undefined,
        to_time: filters.toTime ? new Date(filters.toTime + "T23:59:59").toISOString() : undefined,
      };

      toast.info("Exporting audit logs... This may take a moment.");
      const allEvents = await exportAllAuditLogs(query);
      
      if (allEvents.length === 0) {
        toast.warning("No audit logs to export");
        return;
      }

      const csv = convertToCSV(allEvents);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `audit-logs-workspace_${timestamp}.csv`;
      downloadCSV(csv, filename);
      
      toast.success(`Exported ${allEvents.length} audit log(s) successfully!`);
    } catch (error: any) {
      console.error("Failed to export audit logs:", error);
      toast.error(error.message || "Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUser = async () => {
    if (!numericUserId) {
      toast.error("Please select a user first");
      return;
    }

    setIsExporting(true);
    try {
      const query: AuditLogsQuery = {
        user_id: numericUserId,
      };

      toast.info("Exporting audit logs... This may take a moment.");
      const allEvents = await exportAllAuditLogs(query);
      
      if (allEvents.length === 0) {
        toast.warning("No audit logs to export for this user");
        return;
      }

      const csv = convertToCSV(allEvents);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `audit-logs-user-${numericUserId}_${timestamp}.csv`;
      downloadCSV(csv, filename);
      
      toast.success(`Exported ${allEvents.length} audit log(s) for user ${numericUserId} successfully!`);
    } catch (error: any) {
      console.error("Failed to export audit logs:", error);
      toast.error(error.message || "Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      userId: "",
      projectId: "",
      action: "",
      resourceType: "",
      fromTime: "",
      toTime: "",
    });
  };

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = total === 0 ? 0 : Math.min(total, startIndex + logs.length - 1);
  const canGoPrev = currentPage > 1;
  const canGoNext = total > 0 && currentPage < totalPages;

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    setExpandedEventId(null);
    setCurrentPage(newPage);
  };

  const renderPaginationFooter = () => (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <span>
        {total === 0
          ? "Showing 0 of 0 events"
          : `Showing ${startIndex}-${endIndex} of ${total} events`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoPrev || loading}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {total === 0 ? "Page 0 of 0" : `Page ${currentPage} of ${totalPages}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoNext || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Review and manage audit events across the workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Overview</CardTitle>
          <CardDescription>
            View audit events and their associated changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workspace" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                By User
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspace" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label>User ID</Label>
                      <Input
                        placeholder="Filter by user ID"
                        type="number"
                        value={filters.userId}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, userId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project ID</Label>
                      <Input
                        placeholder="Filter by project ID"
                        type="number"
                        value={filters.projectId}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, projectId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Input
                        placeholder="e.g., PROJECT_UPDATED, login"
                        value={filters.action}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, action: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resource Type</Label>
                      <Input
                        placeholder="e.g., project, user"
                        value={filters.resourceType}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, resourceType: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={filters.fromTime}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, fromTime: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={filters.toTime}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, toTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      disabled={loading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLogs}
                      disabled={loading}
                    >
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportWorkspace}
                      disabled={loading || isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isExporting ? "Exporting..." : "Export All"}
                    </Button>
                    {filters.projectId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={loading}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project Logs
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Audit Logs</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all audit logs for project {filters.projectId}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                const projectId = Number(filters.projectId);
                                if (projectId) {
                                  handleDeleteByProject(projectId);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading audit logs...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((event) => (
                        <Fragment key={event.event_id}>
                          <TableRow key={event.event_id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleToggleEvent(event.event_id)}
                              >
                                {expandedEventId === event.event_id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatTimestamp(event.occurred_at)}
                            </TableCell>
                            <TableCell>
                              {event.user_id ? (
                                <Badge variant="outline">User #{event.user_id}</Badge>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {event.resource_type ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">{event.resource_type}</span>
                                  {event.resource_id && (
                                    <span className="text-xs text-muted-foreground">
                                      ID: {event.resource_id}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {event.http_method ? (
                                <Badge variant="outline">{event.http_method}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-xs truncate">
                              {event.path || "-"}
                            </TableCell>
                            <TableCell>
                              {event.status_code ? (
                                <Badge
                                  variant={
                                    event.status_code >= 200 && event.status_code < 300
                                      ? "default"
                                      : event.status_code >= 400
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {event.status_code}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedEventId === event.event_id && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30 p-4">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Event Details</h4>
                                    {loadingChanges[event.event_id] && (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Request ID:</span>{" "}
                                      <span className="font-mono">{event.request_id || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">IP Address:</span>{" "}
                                      <span>{event.ip_address || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">User Agent:</span>{" "}
                                      <span className="truncate">{event.user_agent || "-"}</span>
                                    </div>
                                    {event.extra && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">Extra:</span>
                                        <pre className="mt-1 rounded bg-background p-2 text-xs overflow-auto">
                                          {JSON.stringify(event.extra, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                  {eventChanges[event.event_id] && (
                                    <div className="mt-4">
                                      <h5 className="font-semibold mb-2">
                                        Changes ({eventChanges[event.event_id].length})
                                      </h5>
                                      <div className="space-y-2">
                                        {eventChanges[event.event_id].map((change) => (
                                          <Card key={change.change_id} className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline">{change.operation}</Badge>
                                                <span className="text-sm font-medium">
                                                  {change.table_name}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(change.changed_at)}
                                              </span>
                                            </div>
                                            {change.diff && (
                                              <pre className="mt-2 rounded bg-background p-2 text-xs overflow-auto">
                                                {JSON.stringify(change.diff, null, 2)}
                                              </pre>
                                            )}
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {renderPaginationFooter()}
            </TabsContent>

            <TabsContent value="user" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserIcon className="h-4 w-4" />
                    Select User
                  </CardTitle>
                  <CardDescription>
                    View audit events for a specific user.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>User</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={(value) => {
                        setSelectedUserId(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id.toString()}>
                            {user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={loading}
                      onClick={() => setSelectedUserId("all")}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportUser}
                      disabled={!numericUserId || loading || isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isExporting ? "Exporting..." : "Export User Logs"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!numericUserId || loading}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User Logs
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Audit Logs</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all audit logs for user {numericUserId}.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => numericUserId && handleDeleteByUser(numericUserId)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          {numericUserId
                            ? "No logs for this user"
                            : "Select a user to load audit data"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((event) => (
                        <Fragment key={event.event_id}>
                          <TableRow key={event.event_id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleToggleEvent(event.event_id)}
                              >
                                {expandedEventId === event.event_id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatTimestamp(event.occurred_at)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {event.resource_type ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">{event.resource_type}</span>
                                  {event.resource_id && (
                                    <span className="text-xs text-muted-foreground">
                                      ID: {event.resource_id}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {event.http_method ? (
                                <Badge variant="outline">{event.http_method}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-xs truncate">
                              {event.path || "-"}
                            </TableCell>
                            <TableCell>
                              {event.status_code ? (
                                <Badge
                                  variant={
                                    event.status_code >= 200 && event.status_code < 300
                                      ? "default"
                                      : event.status_code >= 400
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {event.status_code}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedEventId === event.event_id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 p-4">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Event Details</h4>
                                    {loadingChanges[event.event_id] && (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Request ID:</span>{" "}
                                      <span className="font-mono">{event.request_id || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">IP Address:</span>{" "}
                                      <span>{event.ip_address || "-"}</span>
                                    </div>
                                    {event.extra && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">Extra:</span>
                                        <pre className="mt-1 rounded bg-background p-2 text-xs overflow-auto">
                                          {JSON.stringify(event.extra, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                  {eventChanges[event.event_id] && (
                                    <div className="mt-4">
                                      <h5 className="font-semibold mb-2">
                                        Changes ({eventChanges[event.event_id].length})
                                      </h5>
                                      <div className="space-y-2">
                                        {eventChanges[event.event_id].map((change) => (
                                          <Card key={change.change_id} className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline">{change.operation}</Badge>
                                                <span className="text-sm font-medium">
                                                  {change.table_name}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(change.changed_at)}
                                              </span>
                                            </div>
                                            {change.diff && (
                                              <pre className="mt-2 rounded bg-background p-2 text-xs overflow-auto">
                                                {JSON.stringify(change.diff, null, 2)}
                                              </pre>
                                            )}
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {renderPaginationFooter()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
