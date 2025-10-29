"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DiffRow } from "../../components/csv-compare/diff-row";
import type { ComparisonResult } from "../../lib/csv-compare/csv-types";

interface ComparisonViewProps {
  comparison: ComparisonResult;
  file1Name: string;
  file2Name: string;
}

export function ComparisonView({ comparison, file1Name, file2Name }: ComparisonViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredData = useMemo(() => {
    const allChanges = [
      ...comparison.added.map((row) => ({ type: "added" as const, row, oldRow: null })),
      ...comparison.removed.map((row) => ({ type: "removed" as const, row, oldRow: null })),
      ...comparison.modified.map(({ newRow, oldRow }) => ({
        type: "modified" as const,
        row: newRow,
        oldRow,
      })),
    ];

    let filtered = allChanges;
    if (activeTab !== "all") filtered = filtered.filter((i) => i.type === activeTab);
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item.row).some((v) => String(v).toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }
    return filtered;
  }, [comparison, activeTab, searchTerm]);

  const headers = comparison.headers;

  return (
    <Card className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All Changes</TabsTrigger>
            <TabsTrigger value="added">Added</TabsTrigger>
            <TabsTrigger value="removed">Removed</TabsTrigger>
            <TabsTrigger value="modified">Modified</TabsTrigger>
          </TabsList>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search in results..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </div>
        <TabsContent value={activeTab} className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold w-24">Status</th>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-sm font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 1} className="px-4 py-8 text-center text-muted-foreground">No changes found</td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <DiffRow key={index} type={item.type} row={item.row} oldRow={item.oldRow} headers={headers} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground text-center">Showing {filteredData.length} {filteredData.length === 1 ? "change" : "changes"}</div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}


