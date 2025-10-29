import type { CSVData, ComparisonResult } from "./csv-types";

export function compareCSV(file1: CSVData, file2: CSVData): ComparisonResult {
  const allHeaders = Array.from(new Set([...file1.headers, ...file2.headers]));
  const file1Map = new Map(file1.rows.map((row) => [createRowKey(row), row]));
  const file2Map = new Map(file2.rows.map((row) => [createRowKey(row), row]));

  const added: Record<string, string>[] = [];
  const removed: Record<string, string>[] = [];
  const modified: Array<{ oldRow: Record<string, string>; newRow: Record<string, string> }> = [];
  const unchanged: Record<string, string>[] = [];

  for (const [key, oldRow] of file1Map) {
    const newRow = file2Map.get(key);
    if (!newRow) {
      removed.push(normalizeRow(oldRow, allHeaders));
    } else {
      const hasChanges = allHeaders.some((header) => oldRow[header] !== newRow[header]);
      if (hasChanges) {
        modified.push({ oldRow: normalizeRow(oldRow, allHeaders), newRow: normalizeRow(newRow, allHeaders) });
      } else {
        unchanged.push(normalizeRow(oldRow, allHeaders));
      }
    }
  }

  for (const [key, newRow] of file2Map) {
    if (!file1Map.has(key)) {
      added.push(normalizeRow(newRow, allHeaders));
    }
  }

  return { headers: allHeaders, added, removed, modified, unchanged };
}

function createRowKey(row: Record<string, string>): string {
  return Object.values(row).join("|");
}

function normalizeRow(row: Record<string, string>, headers: string[]): Record<string, string> {
  const normalized: Record<string, string> = {};
  headers.forEach((header) => { normalized[header] = row[header] || ""; });
  return normalized;
}


