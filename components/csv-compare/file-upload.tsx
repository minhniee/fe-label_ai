"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CSVData } from "../../lib/csv-compare/csv-types";

interface FileUploadProps {
  label: string;
  onFileLoaded: (data: CSVData) => void;
  fileData: CSVData | null;
}

export function FileUpload({ label, onFileLoaded, fileData }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      const { parseCSVFile } = await import("../../lib/csv-compare/csv-parser");
      const data = await parseCSVFile(file);
      onFileLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") processFile(file);
    else setError("Please upload a valid CSV file");
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{label}</h3>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border"} ${fileData ? "bg-success/5 border-success" : ""}`}
      >
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-muted-foreground">Processing file...</p>
          </div>
        ) : fileData ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <div>
              <p className="font-medium">{fileData.fileName}</p>
              <p className="text-sm text-muted-foreground mt-1">{fileData.rows.length} rows × {fileData.headers.length} columns</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Drop CSV file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Supports files up to 10MB</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </Card>
  );
}


