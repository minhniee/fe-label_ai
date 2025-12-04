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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Trash2,
  Search,
  RefreshCw,
  Folder,
  File,
  Download,
  HardDrive,
  Server,
  Globe,
  MapPin,
} from "lucide-react";
import {
  getBucketInfo,
  listObjects,
  deleteObject,
  bulkDeleteObjects,
  type StorageObjectInfo,
  type StorageBucketInfo,
} from "@/app/api/storage";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function StorageManagement() {
  const [bucketInfo, setBucketInfo] = useState<StorageBucketInfo | null>(null);
  const [objects, setObjects] = useState<StorageObjectInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [searchPrefix, setSearchPrefix] = useState<string>("");
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [continuationToken, setContinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(false);

  const { toast } = useToast();

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string;
    isBulk: boolean;
  } | null>(null);

  useEffect(() => {
    fetchBucketInfo();
    fetchObjects();
  }, []);

  const fetchBucketInfo = async () => {
    try {
      const info = await getBucketInfo();
      setBucketInfo(info);
    } catch (e: any) {
      setError(e?.message || "Failed to load bucket info");
      toast({ title: "Failed to load bucket info", variant: "destructive" });
    }
  };

  const fetchObjects = async (newPrefix?: string, token?: string) => {
    setLoading(true);
    setError("");
    try {
      const currentPrefix = newPrefix !== undefined ? newPrefix : prefix;
      const data = await listObjects(currentPrefix, 100, token);
      if (token) {
        // Append to existing objects for pagination
        setObjects((prev) => [...prev, ...data.objects]);
      } else {
        setObjects(data.objects);
      }
      setContinuationToken(data.continuation_token);
      setHasMore(data.has_more);
      setPrefix(currentPrefix);
    } catch (e: any) {
      setError(e?.message || "Failed to load objects");
      toast({ title: "Failed to load objects", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSelectedObjects(new Set());
    fetchObjects(searchPrefix);
  };

  const handleLoadMore = () => {
    if (continuationToken) {
      fetchObjects(prefix, continuationToken);
    }
  };

  const handleRefresh = () => {
    setSelectedObjects(new Set());
    fetchBucketInfo();
    fetchObjects(prefix);
  };

  const toggleSelectObject = (key: string) => {
    setSelectedObjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedObjects.size === objects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(objects.map((obj) => obj.key)));
    }
  };

  const requestDeleteObject = (key: string) => {
    setDeleteTarget({ key, isBulk: false });
  };

  const requestBulkDelete = () => {
    if (selectedObjects.size === 0) {
      toast({ title: "Please select objects to delete", variant: "destructive" });
      return;
    }
    setDeleteTarget({ key: "", isBulk: true });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.isBulk) {
        const keys = Array.from(selectedObjects);
        const result = await bulkDeleteObjects(keys);
        if (result.success) {
          toast({
            title: `Successfully deleted ${result.deleted_count} objects`,
          });
          setObjects((prev) => prev.filter((obj) => !selectedObjects.has(obj.key)));
          setSelectedObjects(new Set());
          fetchBucketInfo(); // Refresh bucket info to update stats
        } else {
          toast({
            title: `Deleted ${result.deleted_count} objects, ${result.failed_count} failed`,
            variant: "destructive",
          });
          // Remove successfully deleted objects from list
          setObjects((prev) =>
            prev.filter(
              (obj) =>
                !selectedObjects.has(obj.key) ||
                result.failed_keys.includes(obj.key)
            )
          );
          setSelectedObjects(new Set());
        }
      } else {
        await deleteObject(deleteTarget.key);
        toast({ title: "Successfully deleted object" });
        setObjects((prev) => prev.filter((obj) => obj.key !== deleteTarget.key));
        fetchBucketInfo(); // Refresh bucket info to update stats
      }
    } catch (e: any) {
      toast({
        title: "Failed to delete object(s)",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Storage Management</h1>
        <p className="text-muted-foreground">
          Manage storage bucket and objects
        </p>
      </div>

      {/* Bucket Info */}
      {bucketInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Provider</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold uppercase">{bucketInfo.provider}</div>
              <p className="text-xs text-muted-foreground">Storage type</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bucket</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{bucketInfo.bucket_name}</div>
              <p className="text-xs text-muted-foreground">Bucket name</p>
            </CardContent>
          </Card>

          {bucketInfo.total_objects !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Objects</CardTitle>
                <File className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bucketInfo.total_objects.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Objects in bucket</p>
              </CardContent>
            </Card>
          )}

          {bucketInfo.total_size !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes(bucketInfo.total_size)}
                </div>
                <p className="text-xs text-muted-foreground">Total storage used</p>
              </CardContent>
            </Card>
          )}

          {bucketInfo.endpoint && (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Endpoint</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono truncate">{bucketInfo.endpoint}</div>
                <p className="text-xs text-muted-foreground">Storage endpoint URL</p>
              </CardContent>
            </Card>
          )}

          {bucketInfo.region && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Region</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{bucketInfo.region}</div>
                <p className="text-xs text-muted-foreground">Storage region</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storage Objects</CardTitle>
              <CardDescription>
                Browse and manage objects in the storage bucket
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedObjects.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={requestBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedObjects.size})
                </Button>
              )}
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <Label htmlFor="prefix">Filter by prefix (path)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="prefix"
                  placeholder="e.g., documents/, datasets/, or leave empty for all"
                  value={searchPrefix}
                  onChange={(e) => setSearchPrefix(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>

          {prefix && (
            <div className="mb-4 flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Current path: <span className="font-mono">{prefix}</span>
              </span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 mb-3">{error}</div>
          )}

          {/* Objects Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedObjects.size === objects.length && objects.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                      disabled={loading}
                    />
                  </TableHead>
                  <TableHead>Key (Path)</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && objects.length === 0 ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-4 rounded" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-64" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 rounded" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : objects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No objects found
                    </TableCell>
                  </TableRow>
                ) : (
                  objects.map((obj) => (
                    <TableRow key={obj.key}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedObjects.has(obj.key)}
                          onChange={() => toggleSelectObject(obj.key)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm break-all">{obj.key}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(obj.size)}</TableCell>
                      <TableCell>{formatDate(obj.last_modified)}</TableCell>
                      <TableCell>
                        {obj.content_type ? (
                          <Badge variant="secondary">{obj.content_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDeleteObject(obj.key)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loading || !continuationToken}
              >
                Load More
              </Button>
            </div>
          )}

          {/* Summary */}
          {objects.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {objects.length} objects • Total size: {formatBytes(totalSize)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.isBulk
                ? `Delete ${selectedObjects.size} objects?`
                : "Delete object?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isBulk ? (
                <span>
                  Are you sure you want to delete <b>{selectedObjects.size}</b> selected
                  objects? This action cannot be undone.
                </span>
              ) : (
                <span>
                  Are you sure you want to delete <b>{deleteTarget?.key}</b>? This action
                  cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

