"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  RefreshCw,
  Search,
  HardDrive,
  File,
  TrendingUp,
  Mail,
  Database,
} from "lucide-react";
import {
  getStorageUsageByUser,
  type UserStorageUsage,
  type UserStorageUsageResponse,
} from "@/app/api/storage";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

type SortField = "username" | "total_size" | "object_count";
type SortDirection = "asc" | "desc";

export function UserStorageUsageComponent() {
  const [data, setData] = useState<UserStorageUsageResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("total_size");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getStorageUsageByUser();
      setData(result);
    } catch (e: any) {
      setError(e?.message || "Failed to load storage usage");
      toast({ title: "Failed to load storage usage", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedUsers = data
    ? [...data.users]
        .filter((user) => {
          if (!searchTerm) return true;
          const term = searchTerm.toLowerCase();
          return (
            user.username.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.user_id.toString().includes(term)
          );
        })
        .sort((a, b) => {
          let aValue: string | number;
          let bValue: string | number;

          switch (sortField) {
            case "username":
              aValue = a.username.toLowerCase();
              bValue = b.username.toLowerCase();
              break;
            case "total_size":
              aValue = a.total_size;
              bValue = b.total_size;
              break;
            case "object_count":
              aValue = a.object_count;
              bValue = b.object_count;
              break;
            default:
              return 0;
          }

          if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          } else {
            return sortDirection === "asc"
              ? (aValue as number) - (bValue as number)
              : (bValue as number) - (aValue as number);
          }
        })
    : [];

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Storage Usage by User
        </h1>
        <p className="text-muted-foreground">
          View storage consumption for each user in the system
        </p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.users.length}</div>
              <p className="text-xs text-muted-foreground">
                Users with storage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBytes(data.total_size)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Objects</CardTitle>
              <File className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.total_objects.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Files in storage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Storage Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Storage Details</CardTitle>
              <CardDescription>
                Detailed storage usage breakdown by user
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 mb-3">{error}</div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort("username")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      User {getSortIcon("username")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("total_size")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Storage Used {getSortIcon("total_size")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("object_count")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Objects {getSortIcon("object_count")}
                    </button>
                  </TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : filteredAndSortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {searchTerm
                        ? "No users found matching your search"
                        : "No users with storage found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedUsers.map((user) => {
                    const percentage =
                      data && data.total_size > 0
                        ? ((user.total_size / data.total_size) * 100).toFixed(2)
                        : "0";
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                ID: {user.user_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatBytes(user.total_size)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.object_count.toLocaleString()} files
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${Math.min(parseFloat(percentage), 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {percentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {filteredAndSortedUsers.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedUsers.length} of {data?.users.length || 0}{" "}
              users
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

