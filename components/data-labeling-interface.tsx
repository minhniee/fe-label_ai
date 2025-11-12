"use client";

import { useMemo, useRef, useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Download,
  Search,
  X,
  Columns,
  Eye,
  EyeOff,
} from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent, CellValueChangedEvent } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-material.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);
import * as XLSX from 'xlsx';
import {
  getDatasets,
  getDatasetVersions,
  getVersionFiles,
  getFilePreview,
  type Dataset,
  type DatasetVersion,
  type DataFile,
} from "@/app/api/dataset";
import { useToast } from "@/hooks/use-toast";

type GridRow = { id: string } & Record<string, any>;

export function DataLabelingInterface() {
  const { toast } = useToast()
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [columnDefs, setColumnDefs] = useState<ColDef<GridRow>[]>([]);
  const [rowData, setRowData] = useState<GridRow[]>([]);
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const [gridApi, setGridApi] = useState<GridApi<GridRow> | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  // Track which columns were originally hidden from Excel detection
  const [excelHiddenFields, setExcelHiddenFields] = useState<Set<string>>(new Set());
  // Track which columns are currently hidden due to user action
  const [userHiddenFields, setUserHiddenFields] = useState<Set<string>>(new Set());

  // Real dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [error, setError] = useState("");

  const hasGridData = columnDefs.length > 0 && rowData.length > 0;

  // Column rename state
  const [selectedCol, setSelectedCol] = useState<string>("");
  const [newHeader, setNewHeader] = useState<string>("");

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  // Load versions when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      loadVersions(parseInt(selectedDataset));
    }
  }, [selectedDataset]);

  // Load files when version changes
  useEffect(() => {
    if (selectedVersion) {
      loadFiles(parseInt(selectedVersion));
      setSelectedFile(""); // Reset file selection when version changes
    }
  }, [selectedVersion]);

  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      setError("");
      const data = await getDatasets();
      setDatasets(data);
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to load datasets";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoadingDatasets(false);
    }
  };

  const loadVersions = async (datasetId: number) => {
    try {
      const data = await getDatasetVersions(datasetId);
      setVersions(data);
      // Auto-select the latest version
      if (data.length > 0) {
        const latestVersion = data[data.length - 1];
        setSelectedVersion(latestVersion.version_id.toString());
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to load versions";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const loadFiles = async (versionId: number) => {
    try {
      const data = await getVersionFiles(versionId);
      setFiles(data);
      // Don't auto-load, let user select
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to load files";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleFileLoad = async (file: DataFile) => {
    setIsLoading(true);
    try {
      // Prefer server preview
      let headers: string[] = [];
      let rows: any[] = [];
      try {
        const preview = await getFilePreview(file.file_id);
        headers = preview.headers || [];
        rows = preview.rows || [];
      } catch {
        // Fallback to embedded content
        if (file.content) {
          const parsed = parseCsv(file.content);
          headers = parsed.headers;
          rows = parsed.rows;
        }
      }

      // Normalize rows if API returns array of objects instead of string[][]
      if (headers.length === 0 && Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
        headers = Object.keys(rows[0] as Record<string, unknown>);
        rows = (rows as Record<string, unknown>[]).map((r) => headers.map((h) => (r[h] ?? "") as string));
      }

      if (headers.length === 0 || !Array.isArray(rows) || rows.length === 0) {
        setColumnDefs([]);
        setRowData([]);
        return;
      }

      const uniqueHeaders: string[] = [];
      const seen = new Set<string>();
      headers.forEach((h, idx) => {
        let key = h || `column_${idx + 1}`;
        while (seen.has(key)) key = `${key}_dup`;
        seen.add(key);
        uniqueHeaders.push(key);
      });
      // Check for hidden columns in Excel data
      const hiddenColumns = new Set<string>();
      
      // Look for patterns that indicate hidden columns in Excel
      // Common patterns: empty headers, hidden column markers, etc.
      uniqueHeaders.forEach((header, index) => {
        // Check if header is empty or contains hidden markers
        if (!header || header.trim() === '' || header.includes('_HIDDEN_') || header.includes('__HIDDEN__')) {
          hiddenColumns.add(header);
        }
        
        // Check if all values in this column are empty (might be hidden)
        const columnIndex = index;
        const allEmpty = rows.every(row => {
          if (Array.isArray(row)) {
            return !row[columnIndex] || row[columnIndex].toString().trim() === '';
          } else if (row && typeof row === 'object') {
            return !row[header] || row[header].toString().trim() === '';
          }
          return true;
        });
        
        if (allEmpty && rows.length > 0) {
          hiddenColumns.add(header);
        }
      });

      const columns: ColDef<GridRow>[] = uniqueHeaders.map((field) => ({
        field,
        headerName: field,
        editable: true,
        resizable: true,
        hide: hiddenColumns.has(field), // Hide if detected as hidden column
      }));
      const data: GridRow[] = (rows as any[]).map((r, idx) => {
        const obj: GridRow = { id: String(idx) };
        // r can be array (by index) or object (by key)
        if (Array.isArray(r)) {
          uniqueHeaders.forEach((h, i) => {
            obj[h] = r[i] ?? "";
          });
        } else if (r && typeof r === "object") {
          uniqueHeaders.forEach((h) => {
            obj[h] = (r as Record<string, unknown>)[h] ?? "";
          });
        }
        return obj;
      });
      setColumnDefs(columns);
      setRowData(data);
      
      // Update column visibility state based on hidden columns
      const visibilityState: Record<string, boolean> = {};
      columns.forEach(col => {
        const field = String(col.field);
        visibilityState[field] = !col.hide; // true if not hidden
      });
      setVisibleColumns(visibilityState);
      // Save which fields were hidden by Excel
      setExcelHiddenFields(new Set(Array.from(hiddenColumns)));
      // Reset user hidden fields when loading a new file
      setUserHiddenFields(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    // Simple CSV parser (comma-separated, respects quotes)
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    };
    const headers = parseLine(lines[0]).map((h) => h.trim() || "column");
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  }

  function handleAddRow() {
    const nextId = rowData.length;
    const newRow: GridRow = { id: String(nextId) };
    columnDefs.forEach((c) => {
      const key = c.field as string;
      if (key && key !== "id") newRow[key] = "";
    });
    setRowData((prev) => [...prev, newRow]);
  }

  function handleAddColumn() {
    const base = "column";
    let idx = columnDefs.length + 1;
    let key = `${base}_${idx}`;
    const exists = (k: string) => columnDefs.some((c) => c.field === k);
    while (exists(key)) {
      idx++;
      key = `${base}_${idx}`;
    }
    const newCol: ColDef<GridRow> = {
      field: key,
      headerName: key,
      editable: true,
      resizable: true,
    };
    setColumnDefs((prev) => [...prev, newCol]);
    setRowData((prev) => prev.map((r) => ({ ...r, [key]: "" })));
  }

  const recordsPerPage = 50;
  const totalRecords = rowData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const handleExportData = (format: 'csv' | 'excel' | 'json') => {
    if (!gridApi) return;
    
    const fileName = `data-export-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      gridApi.exportDataAsCsv({
        fileName: `${fileName}.csv`
      });
    } else if (format === 'excel') {
      // Export as Excel using xlsx library
      const allData: GridRow[] = [];
      gridApi.forEachNode((node) => {
        if (node.data) {
          allData.push(node.data);
        }
      });
      
      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(allData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const allData: GridRow[] = [];
      gridApi.forEachNode((node) => {
        if (node.data) {
          allData.push(node.data);
        }
      });
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleColumnVisibility = (field: string, visible: boolean) => {
    if (gridApi) {
      gridApi.setColumnsVisible([field], visible);
    }
    // Keep local visibility state in sync so it persists when menu is toggled
    setVisibleColumns((prev) => ({
      ...prev,
      [field]: visible,
    }));
    // Also update colDef.hide so future renders reflect the current visibility
    setColumnDefs((prev) =>
      prev.map((col) =>
        col.field === field ? { ...col, hide: !visible } : col
      )
    );
    // Track user-driven hidden state
    setUserHiddenFields((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(field); else next.add(field);
      return next;
    });
  };

  const handleShowAllColumns = () => {
    if (gridApi) {
      const fields = columnDefs
        .map(col => col.field)
        .filter((f): f is string => typeof f === 'string');
      if (fields.length > 0) {
        gridApi.setColumnsVisible(fields, true);
      }
    }
    // Update local state for all columns
    setVisibleColumns((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      columnDefs.forEach((col) => {
        if (typeof col.field === 'string') next[col.field] = true;
      });
      return next;
    });
    // Update colDefs to not hidden
    setColumnDefs((prev) => prev.map((col) => ({ ...col, hide: false })));
    // Clear user hidden marks since all are now visible
    setUserHiddenFields(new Set());
  };

  const handleHideAllColumns = () => {
    if (gridApi) {
      const fields = columnDefs
        .map(col => col.field)
        .filter((f): f is string => typeof f === 'string' && f !== 'id');
      if (fields.length > 0) {
        gridApi.setColumnsVisible(fields, false);
      }
    }
    // Update local state for all non-id columns
    setVisibleColumns((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      columnDefs.forEach((col) => {
        if (typeof col.field === 'string' && col.field !== 'id') next[col.field] = false;
      });
      return next;
    });
    // Update colDefs to hidden for non-id columns
    setColumnDefs((prev) => prev.map((col) => (
      typeof col.field === 'string' && col.field !== 'id' ? { ...col, hide: true } : col
    )));
    // Mark all non-id as user hidden now
    setUserHiddenFields((prev) => {
      const next = new Set<string>();
      columnDefs.forEach((col) => {
        if (typeof col.field === 'string' && col.field !== 'id') next.add(col.field);
      });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Card className=" ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Dataset
          </CardTitle>
          <CardDescription>Select a dataset to start labeling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
          <div>
            <Label>Dataset</Label>
            <Select
              value={selectedDataset}
              onValueChange={setSelectedDataset}
              disabled={loadingDatasets}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingDatasets
                      ? "Loading datasets..."
                      : "Select dataset..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem
                    key={dataset.dataset_id.toString()}
                    value={dataset.dataset_id.toString()}
                  >
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDataset && versions.length > 0 && (
            <div>
              <Label>Version</Label>
              <Select
                value={selectedVersion}
                onValueChange={setSelectedVersion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem
                      key={version.version_id.toString()}
                      value={version.version_id.toString()}
                    >
                      Version {version.version_number} -{" "}
                      {version.changelog || "No description"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedVersion && files.length > 0 && (
            <div>
              <Label>File</Label>
              <Select
                value={selectedFile}
                onValueChange={(fileId) => {
                  const file = files.find(
                    (f) => f.file_id.toString() === fileId
                  );
                  if (file) {
                    setSelectedFile(fileId);
                    handleFileLoad(file);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select file to load into grid..." />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem
                      key={file.file_id.toString()}
                      value={file.file_id.toString()}
                    >
                      {file.file_name} ({file.file_type || "unknown"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDataset && (
        <Card className=" ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Data
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Suggestions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading data...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    disabled={!hasGridData}
                  >
                    Add Row
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddColumn}
                    disabled={!hasGridData}
                  >
                    Add Column
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <Input
                        placeholder="Quick filter..."
                        value={quickFilter}
                        onChange={(e) => {
                          setQuickFilter(e.target.value);
                          if (gridApi) {
                            gridApi.setGridOption('quickFilterText', e.target.value);
                          }
                        }}
                        className="w-48"
                      />
                      {quickFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQuickFilter("");
                            if (gridApi) {
                              gridApi.setGridOption('quickFilterText', "");
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColumnMenu(!showColumnMenu)}
                    >
                      <Columns className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          onClick={() => handleExportData('csv')}
                        >
                          Export as CSV
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          onClick={() => handleExportData('excel')}
                        >
                          Export as Excel
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          onClick={() => handleExportData('json')}
                        >
                          Export as JSON
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {showColumnMenu && hasGridData && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">Column Visibility</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShowAllColumns}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Show All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleHideAllColumns}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide All
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {columnDefs.map((col) => {
                        const field = String(col.field);
                        const isVisible = visibleColumns[field] ?? !col.hide;
                        const showExcelHiddenBadge = excelHiddenFields.has(field) && !isVisible && !userHiddenFields.has(field);
                        return (
                          <div key={field} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={field}
                              checked={isVisible}
                              onChange={(e) => handleColumnVisibility(field, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={field} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                              {col.headerName || field}
                              {showExcelHiddenBadge && (
                                <span className="ml-1 text-xs text-red-500">(Hidden in Excel)</span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hasGridData && (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="col-select">Rename column</Label>
                      <Select
                        value={selectedCol}
                        onValueChange={setSelectedCol}
                      >
                        <SelectTrigger id="col-select">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columnDefs.map((c) => (
                            <SelectItem
                              key={String(c.field)}
                              value={String(c.field)}
                            >
                              {c.headerName ?? String(c.field)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="new-header">New header</Label>
                      <Input
                        id="new-header"
                        placeholder="Enter new column header"
                        value={newHeader}
                        onChange={(e) => setNewHeader(e.target.value)}
                      />
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!selectedCol || !newHeader) return;
                          setColumnDefs((prev) =>
                            prev.map((c) =>
                              c.field === selectedCol
                                ? { ...c, headerName: newHeader }
                                : c
                            )
                          );
                          setNewHeader("");
                        }}
                        disabled={!selectedCol || !newHeader}
                      >
                        Rename
                      </Button>
                    </div>
                  </div>
                )}
                <div className="border rounded-lg overflow-hidden">
                  {hasGridData ? (
                    <div className="ag-theme-material" style={{ height: 700, width: '100%' }}>
                      <AgGridReact<GridRow>
                        ref={gridRef}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        theme="legacy"
                        defaultColDef={{
                          editable: true,
                          resizable: true,
                          sortable: true,
                          filter: true,
                        }}
                        animateRows
                        pagination
                        paginationPageSize={recordsPerPage}
                        rowSelection="multiple"
                        getRowId={(params: { data: GridRow }) => params.data.id}
                        onGridReady={(params: GridReadyEvent<GridRow>) => {
                          setGridApi(params.api);
                        }}
                        onCellValueChanged={(e: CellValueChangedEvent<GridRow>) => {
                          const id = e.data.id;
                          setRowData((prev) =>
                            prev.map((r) =>
                              r.id === id
                                ? {
                                    ...r,
                                    [e.colDef.field as string]: e.newValue,
                                  }
                                : r
                            )
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Select a file from the dataset to view and edit in the
                      grid.
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * recordsPerPage + 1} -{" "}
                      {Math.min(currentPage * recordsPerPage, totalRecords)} of{" "}
                      {totalRecords} records
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
