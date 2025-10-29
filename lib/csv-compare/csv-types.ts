export interface CSVData {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface ComparisonResult {
  headers: string[];
  added: Record<string, string>[];
  removed: Record<string, string>[];
  modified: Array<{ oldRow: Record<string, string>; newRow: Record<string, string> }>;
  unchanged: Record<string, string>[];
}


