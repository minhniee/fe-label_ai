"use client";

import { useState, useEffect } from "react";
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
  listAuditEvents,
  listAuditChanges,
  type AuditEventItem,
  type AuditChangeItem,
  type AuditEventQuery,
  type AuditChangeQuery,
} from "@/app/api/audit";
import { getUsers, type User } from "@/app/api/users";
import {
  Activity,
  Database,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User as UserIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AuditLogPage() {
  const [activeTab, setActiveTab] = useState<"events" | "changes">("events");
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [changes, setChanges] = useState<AuditChangeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Pagination
  const [eventsPage, setEventsPage] = useState(1);
  const [changesPage, setChangesPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [changesTotal, setChangesTotal] = useState(0);
  const pageSize = 20;

  // Filters for Events
  const [eventFilters, setEventFilters] = useState<AuditEventQuery>({
    page: 1,
    page_size: pageSize,
  });

  // Filters for Changes
  const [changeFilters, setChangeFilters] = useState<AuditChangeQuery>({
    page: 1,
    page_size: pageSize,
  });

  // Load users for filter dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await getUsers();
        setUsers(usersData);
      } catch (error: any) {
        console.error("Failed to load users:", error);
      }
    };
    loadUsers();
  }, []);

  // Load audit events
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const response = await listAuditEvents({
        ...eventFilters,
        page: eventsPage,
        page_size: pageSize,
      });
      setEvents(response.items);
      setEventsTotal(response.total);
    } catch (error: any) {
      console.error("Failed to load audit events:", error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        toast.error("Authentication required. Please login again.");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required to view audit logs.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please check backend logs or contact administrator.");
      } else if (error.message?.includes("Network Error") || error.message?.includes("CORS")) {
        toast.error("Network error. Please ensure backend server is running and CORS is configured.");
      } else {
        toast.error(error.message || "Failed to load audit events");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load audit changes
  const loadChanges = async () => {
    setIsLoading(true);
    try {
      const response = await listAuditChanges({
        ...changeFilters,
        page: changesPage,
        page_size: pageSize,
      });
      setChanges(response.items);
      setChangesTotal(response.total);
    } catch (error: any) {
      console.error("Failed to load audit changes:", error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        toast.error("Authentication required. Please login again.");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required to view audit logs.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please check backend logs or contact administrator.");
      } else if (error.message?.includes("Network Error") || error.message?.includes("CORS")) {
        toast.error("Network error. Please ensure backend server is running and CORS is configured.");
      } else {
        toast.error(error.message || "Failed to load audit changes");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when tab or page changes
  useEffect(() => {
    if (activeTab === "events") {
      loadEvents();
    } else {
      loadChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventsPage, changesPage]);

  // Reset page when filters change
  useEffect(() => {
    if (activeTab === "events") {
      setEventsPage(1);
    }
  }, [activeTab, eventFilters]);

  useEffect(() => {
    if (activeTab === "changes") {
      setChangesPage(1);
    }
  }, [activeTab, changeFilters]);

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
    } catch {
      return timestamp;
    }
  };

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {statusCode}
        </Badge>
      );
    } else if (statusCode >= 400 && statusCode < 500) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          {statusCode}
        </Badge>
      );
    } else if (statusCode >= 500) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          {statusCode}
        </Badge>
      );
    }
    return <Badge variant="outline">{statusCode}</Badge>;
  };

  const getOperationBadge = (operation: string) => {
    const colors: Record<string, string> = {
      INSERT: "bg-green-50 text-green-700 border-green-200",
      UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
      DELETE: "bg-red-50 text-red-700 border-red-200",
    };
    const color = colors[operation] || "bg-gray-50 text-gray-700 border-gray-200";
    return (
      <Badge variant="outline" className={color}>
        {operation}
      </Badge>
    );
  };

  const handleResetFilters = () => {
    if (activeTab === "events") {
      setEventFilters({ page: 1, page_size: pageSize });
      setEventsPage(1);
    } else {
      setChangeFilters({ page: 1, page_size: pageSize });
      setChangesPage(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-2">
          Track all system changes and user activities
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>System Audit Trail</CardTitle>
          <CardDescription>
            Monitor events and database changes across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "events" | "changes")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Events ({eventsTotal})
              </TabsTrigger>
              <TabsTrigger value="changes" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Changes ({changesTotal})
              </TabsTrigger>
            </TabsList>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4 mt-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-user">User</Label>
                      <Select
                        value={eventFilters.user_id?.toString() || "all"}
                        onValueChange={(value) =>
                          setEventFilters({
                            ...eventFilters,
                            user_id: value === "all" ? undefined : parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger id="event-user">
                          <SelectValue placeholder="All users" />
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

                    <div className="space-y-2">
                      <Label htmlFor="event-action">Action</Label>
                      <Input
                        id="event-action"
                        placeholder="Filter by action"
                        value={eventFilters.action || ""}
                        onChange={(e) =>
                          setEventFilters({ ...eventFilters, action: e.target.value || undefined })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event-resource">Resource Type</Label>
                      <Input
                        id="event-resource"
                        placeholder="e.g., batch, project"
                        value={eventFilters.resource_type || ""}
                        onChange={(e) =>
                          setEventFilters({
                            ...eventFilters,
                            resource_type: e.target.value || undefined,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event-method">HTTP Method</Label>
                      <Select
                        value={eventFilters.http_method || "all"}
                        onValueChange={(value) =>
                          setEventFilters({
                            ...eventFilters,
                            http_method: value === "all" ? undefined : value,
                          })
                        }
                      >
                        <SelectTrigger id="event-method">
                          <SelectValue placeholder="All methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All methods</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleResetFilters} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button onClick={loadEvents} variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Events Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Endpoint</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.event_id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {formatTimestamp(event.occurred_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.user_id ? (
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  User ID: {event.user_id}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.action}</Badge>
                          </TableCell>
                          <TableCell>
                            {event.resource_type && event.resource_id ? (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{event.resource_type}</span>
                                <Badge variant="outline" className="text-xs">
                                  #{event.resource_id}
                                </Badge>
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
                          <TableCell>{getStatusBadge(event.status_code)}</TableCell>
                          <TableCell className="font-mono text-sm max-w-xs truncate">
                            {event.path || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(eventsPage - 1) * pageSize + 1} to{" "}
                  {Math.min(eventsPage * pageSize, eventsTotal)} of {eventsTotal} events
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                    disabled={eventsPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEventsPage((p) => p + 1)}
                    disabled={eventsPage * pageSize >= eventsTotal || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Changes Tab */}
            <TabsContent value="changes" className="space-y-4 mt-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="change-user">User</Label>
                      <Select
                        value={changeFilters.user_id?.toString() || "all"}
                        onValueChange={(value) =>
                          setChangeFilters({
                            ...changeFilters,
                            user_id: value === "all" ? undefined : parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger id="change-user">
                          <SelectValue placeholder="All users" />
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

                    <div className="space-y-2">
                      <Label htmlFor="change-table">Table Name</Label>
                      <Input
                        id="change-table"
                        placeholder="e.g., batches, projects"
                        value={changeFilters.table_name || ""}
                        onChange={(e) =>
                          setChangeFilters({
                            ...changeFilters,
                            table_name: e.target.value || undefined,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="change-operation">Operation</Label>
                      <Select
                        value={changeFilters.operation || "all"}
                        onValueChange={(value) =>
                          setChangeFilters({
                            ...changeFilters,
                            operation: value === "all" ? undefined : value,
                          })
                        }
                      >
                        <SelectTrigger id="change-operation">
                          <SelectValue placeholder="All operations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All operations</SelectItem>
                          <SelectItem value="INSERT">INSERT</SelectItem>
                          <SelectItem value="UPDATE">UPDATE</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="change-request-id">Request ID</Label>
                      <Input
                        id="change-request-id"
                        placeholder="Filter by request ID"
                        value={changeFilters.request_id || ""}
                        onChange={(e) =>
                          setChangeFilters({
                            ...changeFilters,
                            request_id: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleResetFilters} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button onClick={loadChanges} variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Changes Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : changes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No changes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      changes.map((change) => (
                        <TableRow key={change.change_id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {formatTimestamp(change.changed_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {change.user_id ? (
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  User ID: {change.user_id}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{change.table_name}</Badge>
                          </TableCell>
                          <TableCell>{getOperationBadge(change.operation)}</TableCell>
                          <TableCell>
                            {change.primary_key ? (
                              <Badge variant="outline">
                                {(() => {
                                  // Extract record ID from primary_key
                                  const pk = change.primary_key;
                                  if (typeof pk === 'object' && pk !== null) {
                                    // Try to find an ID field
                                    for (const [key, value] of Object.entries(pk)) {
                                      if (key.toLowerCase().includes('id') || key === 'id') {
                                        return `#${value}`;
                                      }
                                    }
                                    // If no ID found, show first value
                                    const firstValue = Object.values(pk)[0];
                                    return `#${firstValue}`;
                                  }
                                  return `#${pk}`;
                                })()}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md">
                            {change.old_row || change.new_row ? (
                              <div className="space-y-1 text-xs">
                                {change.old_row && Object.keys(change.old_row).length > 0 && (
                                  <div className="text-red-600">
                                    <strong>Old:</strong>{" "}
                                    {JSON.stringify(change.old_row, null, 2).substring(0, 100)}
                                    {JSON.stringify(change.old_row, null, 2).length > 100 && "..."}
                                  </div>
                                )}
                                {change.new_row && Object.keys(change.new_row).length > 0 && (
                                  <div className="text-green-600">
                                    <strong>New:</strong>{" "}
                                    {JSON.stringify(change.new_row, null, 2).substring(0, 100)}
                                    {JSON.stringify(change.new_row, null, 2).length > 100 && "..."}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(changesPage - 1) * pageSize + 1} to{" "}
                  {Math.min(changesPage * pageSize, changesTotal)} of {changesTotal} changes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChangesPage((p) => Math.max(1, p - 1))}
                    disabled={changesPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChangesPage((p) => p + 1)}
                    disabled={changesPage * pageSize >= changesTotal || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

