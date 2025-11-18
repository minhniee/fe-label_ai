"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Activity,
  Filter,
  RefreshCw,
  Search,
  User as UserIcon,
  Upload,
  Server,
  Loader2,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getAllAuditLogs,
  getUserAuditLogs,
  searchAuditLogs,
  uploadAuditLocalFile,
  scanAndUploadAuditLogs,
  triggerAuditUpload,
  getAuditUploadStatus,
  type AuditLogRecord,
  type AdminAuditFilters,
} from "@/app/api/audit";
import { getUsers, type User } from "@/app/api/users";

const WORKSPACE_PAGE_SIZE = 25;
const USER_PAGE_SIZE = 20;
const SEARCH_PAGE_SIZE = 20;

type TabKey = "workspace" | "user" | "search" | "upload";

export default function AuditLogPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("workspace");
  const [users, setUsers] = useState<User[]>([]);

  const [workspaceLogs, setWorkspaceLogs] = useState<AuditLogRecord[]>([]);
  const [workspaceTotal, setWorkspaceTotal] = useState(0);
  const [workspacePage, setWorkspacePage] = useState(1);
  const [workspaceFilters, setWorkspaceFilters] = useState({
    tenantId: "",
    eventType: "",
    actorUserId: "",
    fromDate: "",
    toDate: "",
  });
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState("all");
  const [userLogs, setUserLogs] = useState<AuditLogRecord[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLogs, setSearchLogs] = useState<AuditLogRecord[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);

  const [localPath, setLocalPath] = useState("");
  const [scanRoot, setScanRoot] = useState("");
  const [scanPattern, setScanPattern] = useState("**/*.parquet,**/*.log");
  const [uploadStatus, setUploadStatus] = useState<Record<string, any> | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

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

  const loadWorkspaceLogs = useCallback(async () => {
    if (activeTab !== "workspace") return;
    setWorkspaceLoading(true);
    try {
      const filters: AdminAuditFilters = {
        tenant_id: workspaceFilters.tenantId || undefined,
        event_type: workspaceFilters.eventType || undefined,
        actor_user_id: workspaceFilters.actorUserId || undefined,
        from_date: workspaceFilters.fromDate || undefined,
        to_date: workspaceFilters.toDate || undefined,
        limit: WORKSPACE_PAGE_SIZE,
        offset: (workspacePage - 1) * WORKSPACE_PAGE_SIZE,
      };
      const response = await getAllAuditLogs(filters);
      setWorkspaceLogs(response?.data || []);
      setWorkspaceTotal(response?.total || 0);
    } catch (error: any) {
      console.error("Failed to load workspace logs:", error);
      toast.error(error.message || "Failed to load workspace logs");
      setWorkspaceLogs([]);
      setWorkspaceTotal(0);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [activeTab, workspaceFilters, workspacePage]);

  useEffect(() => {
    loadWorkspaceLogs();
  }, [loadWorkspaceLogs]);

  const loadUserLogs = useCallback(async () => {
    if (activeTab !== "user" || !numericUserId) {
      setUserLogs([]);
      setUserTotal(0);
      return;
    }
    setUserLoading(true);
    try {
      const response = await getUserAuditLogs(numericUserId, {
        limit: USER_PAGE_SIZE,
        offset: (userPage - 1) * USER_PAGE_SIZE,
      });
      setUserLogs(response?.data || []);
      setUserTotal(response?.total || 0);
    } catch (error: any) {
      console.error("Failed to load user logs:", error);
      toast.error(error.message || "Failed to load user logs");
      setUserLogs([]);
      setUserTotal(0);
    } finally {
      setUserLoading(false);
    }
  }, [activeTab, numericUserId, userPage]);

  useEffect(() => {
    loadUserLogs();
  }, [loadUserLogs]);

  const loadSearchLogs = useCallback(
    async (notifyOnEmpty = false) => {
      if (activeTab !== "search") return;
      if (!searchQuery.trim()) {
        if (notifyOnEmpty) toast.error("Enter a keyword to search");
        setSearchLogs([]);
        setSearchTotal(0);
        return;
      }
      setSearchLoading(true);
      try {
        const response = await searchAuditLogs({
          q: searchQuery.trim(),
          limit: SEARCH_PAGE_SIZE,
          offset: (searchPage - 1) * SEARCH_PAGE_SIZE,
        });
        setSearchLogs(response?.data || []);
        setSearchTotal(response?.total || 0);
      } catch (error: any) {
        console.error("Failed to search logs:", error);
        toast.error(error.message || "Failed to search audit logs");
        setSearchLogs([]);
        setSearchTotal(0);
      } finally {
        setSearchLoading(false);
      }
    },
    [activeTab, searchQuery, searchPage]
  );

  useEffect(() => {
    loadSearchLogs();
  }, [loadSearchLogs]);

  const refreshUploadStatus = useCallback(async () => {
    try {
      const status = await getAuditUploadStatus();
      setUploadStatus(status);
    } catch (error) {
      console.error("Failed to fetch upload status:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "upload") {
      refreshUploadStatus();
    }
  }, [activeTab, refreshUploadStatus]);

  const formatTimestamp = (value?: string) => {
    if (!value) return "-";
    try {
      return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
    } catch {
      return value;
    }
  };

  const renderRows = (logs: AuditLogRecord[]) =>
    logs.map((log, idx) => (
      <TableRow key={`${log.event_id ?? idx}-${log.req_trace_id ?? idx}`}>
        <TableCell className="font-mono text-xs">{formatTimestamp(log.ts)}</TableCell>
        <TableCell>
          {log.actor_user_id ? (
            <Badge variant="outline">User #{log.actor_user_id}</Badge>
          ) : (
            <span className="text-muted-foreground">System</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge variant="outline">{log.event_type || "event"}</Badge>
            <span className="text-xs text-muted-foreground">
              {log.event_action || "-"}
            </span>
          </div>
        </TableCell>
        <TableCell>
          {log.req_method ? (
            <Badge variant="outline">{log.req_method}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs max-w-xs truncate">
          {log.req_path || "-"}
        </TableCell>
        <TableCell className="font-mono text-xs max-w-xs truncate">
          {typeof log.ctx_json === "object" && log.ctx_json
            ? JSON.stringify(log.ctx_json).slice(0, 120)
            : typeof log.ctx_json === "string"
            ? log.ctx_json.slice(0, 120)
            : "-"}
        </TableCell>
      </TableRow>
    ));

  const handleResetWorkspaceFilters = () => {
    setWorkspaceFilters({
      tenantId: "",
      eventType: "",
      actorUserId: "",
      fromDate: "",
      toDate: "",
    });
    setWorkspacePage(1);
  };

  const handleUploadLocal = async () => {
    if (!localPath.trim()) {
      toast.error("Enter a file path");
      return;
    }
    setUploadBusy(true);
    try {
      await uploadAuditLocalFile(localPath.trim());
      toast.success("File upload scheduled");
      setLocalPath("");
      await refreshUploadStatus();
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadBusy(false);
    }
  };

  const handleScanUpload = async () => {
    setUploadBusy(true);
    try {
      await scanAndUploadAuditLogs({
        root: scanRoot || undefined,
        pattern: scanPattern || undefined,
      });
      toast.success("Directory scan scheduled");
      await refreshUploadStatus();
    } catch (error: any) {
      console.error("Failed to scan directory:", error);
      toast.error(error.message || "Failed to scan/upload logs");
    } finally {
      setUploadBusy(false);
    }
  };

  const handleTriggerUpload = async () => {
    setUploadBusy(true);
    try {
      await triggerAuditUpload();
      toast.success("Upload triggered");
      await refreshUploadStatus();
    } catch (error: any) {
      console.error("Failed to trigger upload:", error);
      toast.error(error.message || "Failed to trigger upload");
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Center</h1>
        <p className="text-muted-foreground">
          Review workspace activity, inspect user actions, run searches, and manage audit uploads.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Overview</CardTitle>
          <CardDescription>
            Switch between workspace feed, individual users, full-text search, and upload control.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workspace" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                User
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspace" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-4 w-4" />
                    Workspace filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                      <Label>Tenant</Label>
                      <Input
                        placeholder="tenant-a"
                        value={workspaceFilters.tenantId}
                        onChange={(e) =>
                          setWorkspaceFilters((prev) => ({ ...prev, tenantId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Event type</Label>
                      <Input
                        placeholder="project.created"
                        value={workspaceFilters.eventType}
                        onChange={(e) =>
                          setWorkspaceFilters((prev) => ({ ...prev, eventType: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Actor user ID</Label>
                      <Input
                        placeholder="42"
                        value={workspaceFilters.actorUserId}
                        onChange={(e) =>
                          setWorkspaceFilters((prev) => ({ ...prev, actorUserId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From date</Label>
                      <Input
                        type="date"
                        value={workspaceFilters.fromDate}
                        onChange={(e) =>
                          setWorkspaceFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To date</Label>
                      <Input
                        type="date"
                        value={workspaceFilters.toDate}
                        onChange={(e) =>
                          setWorkspaceFilters((prev) => ({ ...prev, toDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetWorkspaceFilters}
                      disabled={workspaceLoading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkspacePage(1);
                        loadWorkspaceLogs();
                      }}
                      disabled={workspaceLoading}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspaceLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading workspace feed...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : workspaceLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No workspace logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      renderRows(workspaceLogs)
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(workspacePage - 1) * WORKSPACE_PAGE_SIZE + 1} to{" "}
                  {Math.min(workspacePage * WORKSPACE_PAGE_SIZE, workspaceTotal)} of{" "}
                  {workspaceTotal} events
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkspacePage((prev) => Math.max(1, prev - 1))}
                    disabled={workspacePage === 1 || workspaceLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setWorkspacePage((prev) =>
                        prev * WORKSPACE_PAGE_SIZE >= workspaceTotal ? prev : prev + 1
                      )
                    }
                    disabled={
                      workspacePage * WORKSPACE_PAGE_SIZE >= workspaceTotal || workspaceLoading
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="user" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserIcon className="h-4 w-4" />
                    Select user
                  </CardTitle>
                  <CardDescription>Inspect audit events generated by one collaborator.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>User</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={(value) => {
                        setSelectedUserId(value);
                        setUserPage(1);
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
                      disabled={userLoading}
                      onClick={() => setSelectedUserId("all")}
                    >
                      Clear
                    </Button>
                    <Button
                      disabled={!numericUserId || userLoading}
                      onClick={() => {
                        setUserPage(1);
                        loadUserLogs();
                      }}
                    >
                      Fetch logs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : userLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {numericUserId
                            ? "No logs for this user"
                            : "Select a user to load audit data"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      renderRows(userLogs)
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(userPage - 1) * USER_PAGE_SIZE + 1} to{" "}
                  {Math.min(userPage * USER_PAGE_SIZE, userTotal)} of {userTotal} events
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                    disabled={userPage === 1 || userLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setUserPage((prev) =>
                        prev * USER_PAGE_SIZE >= userTotal ? prev : prev + 1
                      )
                    }
                    disabled={userPage * USER_PAGE_SIZE >= userTotal || userLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSearch className="h-4 w-4" />
                    Full-text search
                  </CardTitle>
                  <CardDescription>
                    Search across the entire audit index by request ID, path, or payload.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Keyword</Label>
                    <Input
                      placeholder="trace id, endpoint, etc."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchLogs([]);
                        setSearchTotal(0);
                        setSearchPage(1);
                      }}
                      disabled={searchLoading}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={() => {
                        setSearchPage(1);
                        loadSearchLogs(true);
                      }}
                      disabled={searchLoading}
                    >
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : searchLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {searchQuery.trim()
                            ? "No matching logs"
                            : "Enter a keyword to run a search"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      renderRows(searchLogs)
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(searchPage - 1) * SEARCH_PAGE_SIZE + 1} to{" "}
                  {Math.min(searchPage * SEARCH_PAGE_SIZE, searchTotal)} of {searchTotal} events
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchPage((prev) => Math.max(1, prev - 1))}
                    disabled={searchPage === 1 || searchLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSearchPage((prev) =>
                        prev * SEARCH_PAGE_SIZE >= searchTotal ? prev : prev + 1
                      )
                    }
                    disabled={searchPage * SEARCH_PAGE_SIZE >= searchTotal || searchLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-4 w-4" />
                    Upload local file
                  </CardTitle>
                  <CardDescription>Schedule a `.log` or `.parquet` file for ingestion.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="C:\\logs\\audit-2025-01-05.parquet"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                  />
                  <Button onClick={handleUploadLocal} disabled={uploadBusy} className="w-full">
                    Upload file
                  </Button>
                </CardContent>
              </Card>

              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-4 w-4" />
                    Scan directory
                  </CardTitle>
                  <CardDescription>Scan and upload every matching file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="C:\\logs"
                    value={scanRoot}
                    onChange={(e) => setScanRoot(e.target.value)}
                  />
                  <Input
                    placeholder="**/*.parquet,**/*.log"
                    value={scanPattern}
                    onChange={(e) => setScanPattern(e.target.value)}
                  />
                  <Button onClick={handleScanUpload} disabled={uploadBusy} className="w-full">
                    Scan & upload
                  </Button>
                </CardContent>
              </Card>

              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Server className="h-4 w-4" />
                    Upload status
                  </CardTitle>
                  <CardDescription>Trigger the scheduler or refresh its status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Running:</span>
                    <span>{uploadStatus?.is_running ? "Yes" : "No"}</span>
                    <span className="text-muted-foreground">Interval (min):</span>
                    <span>{uploadStatus?.upload_interval_minutes ?? "—"}</span>
                    <span className="text-muted-foreground">Auto upload:</span>
                    <span>{uploadStatus?.auto_upload_enabled ? "Enabled" : "Disabled"}</span>
                    <span className="text-muted-foreground">GCS upload:</span>
                    <span>{uploadStatus?.gcs_upload_enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={refreshUploadStatus} disabled={uploadBusy}>
                      Refresh
                    </Button>
                    <Button onClick={handleTriggerUpload} disabled={uploadBusy}>
                      Trigger now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

