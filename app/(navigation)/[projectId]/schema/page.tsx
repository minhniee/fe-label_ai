"use client";

import { useState, useEffect } from "react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { 
  // We only use backend for validation and some optional views;
  // create/update/delete will be handled locally per project.
  validateOntology,
  getSchemaVersion,
  uploadSchemaFile,
  deleteSchemaFile,
  type SchemaResponse,
  type OntologyStructure,
  type SchemaFileResponse,
  type SchemaHistoryResponse,
  type SchemaVersionResponse,
  type SchemaCompareResponse,
  type OntologyValidationResponse,
} from "@/app/api/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, FileText, History, GitCompare, Upload, Download, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

export default function ProjectSchemaPage() {
  const { project } = useProjectFromSlug();
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const [schemas, setSchemas] = useState<SchemaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<SchemaResponse | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  
  // Form states
  const [schemaName, setSchemaName] = useState("");
  const [schemaDescription, setSchemaDescription] = useState("");
  const [schemaDefinition, setSchemaDefinition] = useState<any>({ labels: [] });
  const [ontologyJson, setOntologyJson] = useState("");
  const [validationResult, setValidationResult] = useState<OntologyValidationResponse | null>(null);
  
  // Version states
  const [versions, setVersions] = useState<SchemaHistoryResponse[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionChanges, setVersionChanges] = useState("");
  
  // File states
  const [files, setFiles] = useState<SchemaFileResponse[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("json");
  
  // Compare states
  const [compareSchema1, setCompareSchema1] = useState<number | null>(null);
  const [compareSchema2, setCompareSchema2] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<SchemaCompareResponse | null>(null);
  
  // Statistics
  const [statistics, setStatistics] = useState<any>(null);

  // Active schema for current project (frontend-only, per-project)
  const [activeSchemaId, setActiveSchemaId] = useState<number | null>(null);

  // Get dataset_id from project
  const datasetId = project?.dataset_id || undefined;
  const projectId = project?.id;

  const getStorageKey = () =>
    projectId ? `project_schemas_${projectId}` : null;

  useEffect(() => {
    if (project) {
      loadSchemas();
      loadStatistics();
      // Load active schema for this project from localStorage
      try {
        const stored = localStorage.getItem(`active_schema_project_${project.id}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            setActiveSchemaId(parsed);
          }
        }
      } catch (e) {
        // ignore localStorage errors
      }
    } else {
      setSchemas([]);
      setStatistics(null);
      setActiveSchemaId(null);
    }
  }, [project?.id]);

  const loadSchemas = async () => {
    try {
      setIsLoading(true);
      const storageKey = getStorageKey();
      if (!storageKey || typeof window === "undefined") {
        setSchemas([]);
        return;
      }
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setSchemas([]);
        return;
      }
      const parsed = JSON.parse(raw) as SchemaResponse[];
      setSchemas(Array.isArray(parsed) ? parsed : []);
    } catch (error: any) {
      console.error("Failed to load local schemas:", error);
      toast.error("Failed to load local schemas");
      setSchemas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      // Compute simple stats from local schemas
      const total_schemas = schemas.length;
      const total_versions = schemas.length;
      const total_files = 0;
      const last_updated =
        schemas.length > 0
          ? schemas
              .map((s) => s.created_at)
              .sort()
              .slice(-1)[0]
          : null;

      setStatistics({
        total_schemas,
        total_versions,
        total_files,
        last_updated,
      });
    } catch (error: any) {
      console.error("Failed to load statistics:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadSchemas();
      return;
    }
    // Local-only search is handled by filteredSchemas; no extra work needed here.
  };

  const handleCreateSchema = async () => {
    if (!projectId) {
      toast.error("Project context is required to create a schema.");
      return;
    }

    try {
      let definition = schemaDefinition;
      if (ontologyJson.trim()) {
        try {
          definition = JSON.parse(ontologyJson);
        } catch (e) {
          toast.error("Invalid JSON format");
          return;
        }
      }

      const now = new Date().toISOString();
      const newSchema: SchemaResponse = {
        schema_id: Date.now(), // simple local id
        dataset_id: 0,
        name: schemaName,
        schema_definition: definition,
        description: schemaDescription || undefined,
        created_at: now,
        created_by: 0,
        created_by_username: project?.name || "local",
        version: 1,
      };

      const updated = [...schemas, newSchema];
      setSchemas(updated);

      const storageKey = getStorageKey();
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(updated));
      }

      toast.success("Schema created locally for this project");
      setCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create schema");
    }
  };

  const handleUpdateSchema = async () => {
    if (!selectedSchema) return;
    try {
      let definition = schemaDefinition;
      if (ontologyJson.trim()) {
        try {
          definition = JSON.parse(ontologyJson);
        } catch (e) {
          toast.error("Invalid JSON format");
          return;
        }
      }

      const updatedSchemas = schemas.map((s) =>
        s.schema_id === selectedSchema.schema_id
          ? {
              ...s,
              name: schemaName,
              description: schemaDescription || undefined,
              schema_definition: definition,
            }
          : s
      );

      setSchemas(updatedSchemas);

      const storageKey = getStorageKey();
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(updatedSchemas));
      }

      toast.success("Schema updated locally");
      setEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to update schema");
    }
  };

  const handleDeleteSchema = async (schemaId: number) => {
    try {
      const updated = schemas.filter((s) => s.schema_id !== schemaId);
      setSchemas(updated);
      const storageKey = getStorageKey();
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      toast.success("Schema deleted locally");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete schema");
    }
  };

  const handleViewSchema = async (schema: SchemaResponse) => {
    setSelectedSchema(schema);
    setSchemaName(schema.name);
    setSchemaDescription(schema.description || "");
    setSchemaDefinition(schema.schema_definition);
    setOntologyJson(JSON.stringify(schema.schema_definition, null, 2));
    setViewDialogOpen(true);
  };

  const handleEditSchema = async (schema: SchemaResponse) => {
    setSelectedSchema(schema);
    setSchemaName(schema.name);
    setSchemaDescription(schema.description || "");
    setSchemaDefinition(schema.schema_definition);
    setOntologyJson(JSON.stringify(schema.schema_definition, null, 2));
    setEditDialogOpen(true);
  };

  const handleValidateOntology = async () => {
    try {
      let ontology: OntologyStructure;
      if (ontologyJson.trim()) {
        try {
          ontology = JSON.parse(ontologyJson);
        } catch (e) {
          toast.error("Invalid JSON format");
          return;
        }
      } else {
        ontology = schemaDefinition;
      }

      const result = await validateOntology(ontology);
      setValidationResult(result);
      if (result.is_valid) {
        toast.success("Ontology is valid");
      } else {
        toast.error(`Validation failed: ${result.errors?.join(", ")}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to validate ontology");
    }
  };

  const handleLoadVersions = async (schemaId: number) => {
    // Local-only mode: version history not persisted yet
    setVersions([]);
    setSelectedSchema(schemas.find((s) => s.schema_id === schemaId) || null);
    setVersionDialogOpen(true);
  };

  const handleCreateVersion = async () => {
    if (!selectedSchema) return;
    toast.error("Versioning is not supported for local project schemas yet.");
  };

  const handleLoadFiles = async (schemaId: number) => {
    // Guideline files rely on backend schemas; keep disabled for local-only schemas
    toast.error("Guideline files are not supported for local project schemas yet.");
    setFiles([]);
    setSelectedSchema(schemas.find((s) => s.schema_id === schemaId) || null);
    setFileDialogOpen(true);
  };

  const handleUploadFile = async () => {
    if (!selectedSchema || !uploadFile) return;
    try {
      await uploadSchemaFile(selectedSchema.schema_id, uploadFile, fileType);
      toast.success("File uploaded successfully");
      setUploadFile(null);
      handleLoadFiles(selectedSchema.schema_id);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      await deleteSchemaFile(fileId);
      toast.success("File deleted successfully");
      if (selectedSchema) {
        handleLoadFiles(selectedSchema.schema_id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete file");
    }
  };

  const handleCompareSchemas = async () => {
    if (!compareSchema1 || !compareSchema2) {
      toast.error("Please select two schemas to compare");
      return;
    }
    toast.error("Compare is not supported for local project schemas yet.");
  };

  const resetForm = () => {
    setSchemaName("");
    setSchemaDescription("");
    setSchemaDefinition({ labels: [] });
    setOntologyJson("");
    setValidationResult(null);
    setSelectedSchema(null);
    setVersionChanges("");
    setUploadFile(null);
  };

  const filteredSchemas = schemas.filter(schema =>
    schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schema.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSetActiveSchema = (schemaId: number) => {
    if (!project?.id) {
      toast.error("Project context is missing. Please select a project.");
      return;
    }
    setActiveSchemaId(schemaId);
    try {
      localStorage.setItem(
        `active_schema_project_${project.id}`,
        schemaId.toString()
      );
    } catch (e) {
      // ignore storage errors
    }
    toast.success("Active schema for this project has been updated.");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
          <p className="text-muted-foreground">
            Manage schemas and ontologies for project: {project?.name || "Loading..."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Schema
          </Button>
          {!datasetId && (
            <p className="text-xs text-muted-foreground max-w-sm text-right">
              To create a schema, this project needs an associated dataset. Please upload data for the project first.
            </p>
          )}
          {datasetId && !canCreate && (
            <p className="text-xs text-muted-foreground max-w-sm text-right">
              You don&apos;t have permission to create schemas in this project. Ask an owner or co-owner to update your role.
            </p>
          )}
        </div>
      </div>

      {/* Active schema for this project */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Active Schema for This Project</CardTitle>
            <CardDescription>
              The active schema is used as the main guideline / ontology reference for this project.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {activeSchemaId
            ? (() => {
                const active = schemas.find((s) => s.schema_id === activeSchemaId);
                if (!active) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Active schema ID {activeSchemaId} is not available in the current list.
                    </p>
                  );
                }
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Badge variant="default">Active</Badge>
                        {active.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {active.description || "No description"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Schema ID: {active.schema_id}
                    </span>
                  </div>
                );
              })()
            : (
              <p className="text-sm text-muted-foreground">
                No active schema selected for this project. Choose one in the list below and set it as active.
              </p>
            )}
        </CardContent>
      </Card>

      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_schemas || schemas.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_versions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_files || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {statistics.last_updated ? new Date(statistics.last_updated).toLocaleDateString() : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="schemas" className="w-full">
        <TabsList>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="schemas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Schemas</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search schemas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-64"
                  />
                  <Button variant="outline" size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredSchemas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No schemas found. Create your first schema to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchemas.map((schema) => (
                      <TableRow key={schema.schema_id}>
                        <TableCell className="font-medium">{schema.name}</TableCell>
                        <TableCell>{schema.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">v{schema.version || 1}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(schema.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSchema(schema)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSchema(schema)}
                              disabled={!canUpdate}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLoadVersions(schema.schema_id)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLoadFiles(schema.schema_id)}
                              disabled={!canCreate}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={schema.schema_id === activeSchemaId ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleSetActiveSchema(schema.schema_id)}
                              title={
                                schema.schema_id === activeSchemaId
                                  ? "This schema is currently active for this project"
                                  : "Set this schema as active for this project"
                              }
                            >
                              <CheckCircle2
                                className={
                                  schema.schema_id === activeSchemaId
                                    ? "h-4 w-4"
                                    : "h-4 w-4 text-muted-foreground"
                                }
                              />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!canDelete}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the schema "{schema.name}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSchema(schema.schema_id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compare Schemas</CardTitle>
              <CardDescription>Compare two schemas to see differences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Schema 1</Label>
                  <Select
                    value={compareSchema1?.toString() || ""}
                    onValueChange={(v) => setCompareSchema1(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schema" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemas.map((schema) => (
                        <SelectItem key={schema.schema_id} value={schema.schema_id.toString()}>
                          {schema.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Schema 2</Label>
                  <Select
                    value={compareSchema2?.toString() || ""}
                    onValueChange={(v) => setCompareSchema2(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schema" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemas.map((schema) => (
                        <SelectItem key={schema.schema_id} value={schema.schema_id.toString()}>
                          {schema.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCompareSchemas} disabled={!compareSchema1 || !compareSchema2}>
                <GitCompare className="mr-2 h-4 w-4" />
                Compare
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Schema Drawer */}
      <Drawer open={createDialogOpen} onOpenChange={setCreateDialogOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-1/2 data-[vaul-drawer-direction=right]:sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>Create New Schema</DrawerTitle>
            <DrawerDescription>
              Create a new schema with an ontology structure for this project.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label>Schema Name *</Label>
              <Input
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                placeholder="Enter schema name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={schemaDescription}
                onChange={(e) => setSchemaDescription(e.target.value)}
                placeholder="Enter schema description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Ontology Definition (JSON) *</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateOntology}
                >
                  Validate
                </Button>
              </div>
              <Textarea
                value={ontologyJson}
                onChange={(e) => setOntologyJson(e.target.value)}
                placeholder='{"labels": ["label1", "label2"], "hierarchy": {}, "categories": {}, "metadata": {}}'
                rows={18}
                className="font-mono text-sm"
              />
              {validationResult && (
                <Alert variant={validationResult.is_valid ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validationResult.is_valid ? (
                      <div>
                        <CheckCircle2 className="h-4 w-4 inline mr-2" />
                        Valid ontology. {validationResult.label_count} labels found.
                      </div>
                    ) : (
                      <div>
                        <XCircle className="h-4 w-4 inline mr-2" />
                        Validation errors: {validationResult.errors?.join(", ")}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <DrawerFooter className="border-t">
            <div className="flex w-full justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSchema}
                disabled={!schemaName || !ontologyJson.trim() || !canCreate}
              >
                Create Schema
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Schema Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Schema</DialogTitle>
            <DialogDescription>
              Update schema information and ontology structure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schema Name *</Label>
              <Input
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                placeholder="Enter schema name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={schemaDescription}
                onChange={(e) => setSchemaDescription(e.target.value)}
                placeholder="Enter schema description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ontology Definition (JSON) *</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateOntology}
                >
                  Validate
                </Button>
              </div>
              <Textarea
                value={ontologyJson}
                onChange={(e) => setOntologyJson(e.target.value)}
                placeholder='{"labels": ["label1", "label2"], "hierarchy": {}, "categories": {}, "metadata": {}}'
                rows={15}
                className="font-mono text-sm"
              />
              {validationResult && (
                <Alert variant={validationResult.is_valid ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validationResult.is_valid ? (
                      <div>
                        <CheckCircle2 className="h-4 w-4 inline mr-2" />
                        Valid ontology. {validationResult.label_count} labels found.
                      </div>
                    ) : (
                      <div>
                        <XCircle className="h-4 w-4 inline mr-2" />
                        Validation errors: {validationResult.errors?.join(", ")}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSchema} disabled={!schemaName || !ontologyJson.trim() || !canUpdate}>
              Update Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Schema Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSchema?.name}</DialogTitle>
            <DialogDescription>
              {selectedSchema?.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ontology Definition</Label>
              <ScrollArea className="h-96 w-full rounded border p-4">
                <pre className="text-sm font-mono">
                  {JSON.stringify(selectedSchema?.schema_definition, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Management Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schema Versions - {selectedSchema?.name}</DialogTitle>
            <DialogDescription>
              View version history and create new versions
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Version History</TabsTrigger>
              <TabsTrigger value="create">Create New Version</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.version}>
                      <TableCell>
                        <Badge variant={version.is_current ? "default" : "outline"}>
                          v{version.version} {version.is_current && "(Current)"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(version.created_at).toLocaleString()}</TableCell>
                      <TableCell>{version.created_by_username || "Unknown"}</TableCell>
                      <TableCell>{version.changes || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!selectedSchema) return;
                            try {
                              const versionData = await getSchemaVersion(selectedSchema.schema_id, version.version);
                              setOntologyJson(JSON.stringify(versionData.schema_definition, null, 2));
                              setSelectedVersion(version.version);
                            } catch (error: any) {
                              toast.error(error.message || "Failed to load version");
                            }
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-2">
                <Label>Changes Description</Label>
                <Textarea
                  value={versionChanges}
                  onChange={(e) => setVersionChanges(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>New Ontology Definition (JSON) *</Label>
                <Textarea
                  value={ontologyJson}
                  onChange={(e) => setOntologyJson(e.target.value)}
                  placeholder='{"labels": ["label1", "label2"], "hierarchy": {}, "categories": {}, "metadata": {}}'
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleCreateVersion} disabled={!ontologyJson.trim() || !canCreate}>
                Create Version
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Management Dialog */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schema Files - {selectedSchema?.name}</DialogTitle>
            <DialogDescription>
              Upload and manage guideline files for this schema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload File</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB
                    if (file && file.size > MAX_FILE_SIZE_BYTES) {
                      toast.error("File size must be less than 20MB")
                      e.target.value = ""
                      setUploadFile(null)
                      return
                    }
                    setUploadFile(file)
                  }}
                  accept=".json,.yaml,.yml,.pdf,.txt"
                />
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                    <SelectItem value="yml">YML</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="txt">TXT</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleUploadFile} disabled={!uploadFile || !canCreate}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.file_id}>
                      <TableCell>{file.file_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{file.file_type}</Badge>
                      </TableCell>
                      <TableCell>{new Date(file.uploaded_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!canDelete}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the file "{file.file_name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFile(file.file_id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Result Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schema Comparison</DialogTitle>
            <DialogDescription>
              Differences between the two schemas
            </DialogDescription>
          </DialogHeader>
          {compareResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Schema 1</CardTitle>
                    <CardDescription>
                      {compareResult.schema1 ? `v${compareResult.schema1.version}` : `ID: ${compareResult.left_schema_id}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{compareResult.schema1?.name || `Schema ${compareResult.left_schema_id}`}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Schema 2</CardTitle>
                    <CardDescription>
                      {compareResult.schema2 ? `v${compareResult.schema2.version}` : `ID: ${compareResult.right_schema_id}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{compareResult.schema2?.name || `Schema ${compareResult.right_schema_id}`}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2">
                <Label>Differences</Label>
                <ScrollArea className="h-64 w-full rounded border p-4">
                  <pre className="text-sm font-mono">
                    {JSON.stringify(compareResult.differences, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
