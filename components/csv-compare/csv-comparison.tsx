"use client";

import { useState } from "react";
import { FileUpload } from "../../components/csv-compare/file-upload";
import { ComparisonView } from "../../components/csv-compare/comparison-view";
import { ComparisonStats } from "../../components/csv-compare/comparison-stats";
import type { CSVData, ComparisonResult } from "../../lib/csv-compare/csv-types";

interface CSVComparisonProps {
  file1Data?: CSVData | null;
  file2Data?: CSVData | null;
  onFile1DataChange?: (data: CSVData | null) => void;
  onFile2DataChange?: (data: CSVData | null) => void;
}

export function CSVComparison({
  file1Data: controlledFile1Data,
  file2Data: controlledFile2Data,
  onFile1DataChange,
  onFile2DataChange,
}: CSVComparisonProps = {}) {
  const [internalFile1Data, setInternalFile1Data] = useState<CSVData | null>(null);
  const [internalFile2Data, setInternalFile2Data] = useState<CSVData | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const activeFile1Data = controlledFile1Data ?? internalFile1Data;
  const activeFile2Data = controlledFile2Data ?? internalFile2Data;
  const setFile1Data = onFile1DataChange ?? setInternalFile1Data;
  const setFile2Data = onFile2DataChange ?? setInternalFile2Data;

  const handleCompare = async () => {
    if (!activeFile1Data || !activeFile2Data) return;
    setIsComparing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const { compareCSV } = await import("../../lib/csv-compare/csv-compare");
    const result = compareCSV(activeFile1Data, activeFile2Data);
    setComparison(result);
    setIsComparing(false);
  };

  const handleReset = () => {
    setFile1Data(null);
    setFile2Data(null);
    setComparison(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8 text-center">
        <p className="text-muted-foreground text-lg">Upload two CSV files to compare and visualize their differences</p>
      </header>

      {!comparison ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <FileUpload label="Original File" onFileLoaded={setFile1Data} fileData={activeFile1Data} />
            <FileUpload label="Modified File" onFileLoaded={setFile2Data} fileData={activeFile2Data} />
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={!activeFile1Data || !activeFile2Data || isComparing}
              className="px-8 py-3 bg-accent text-accent-foreground rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isComparing ? "Comparing..." : "Compare Files"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Comparison Results</h2>
            <button onClick={handleReset} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">
              New Comparison
            </button>
          </div>
          <ComparisonStats comparison={comparison} />
          <ComparisonView
            comparison={comparison}
            file1Name={activeFile1Data?.fileName || "File 1"}
            file2Name={activeFile2Data?.fileName || "File 2"}
          />
        </div>
      )}
    </div>
  );
}


