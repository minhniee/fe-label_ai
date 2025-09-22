"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataUpload } from "@/components/data-upload";
import { DataExplorer } from "@/components/data-explorer";

export default function DataManagementPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quản lý Dữ liệu</h1>
        <p className="text-muted-foreground mt-2">
          Tải lên, quản lý và khám phá dữ liệu tuyển sinh cho hệ thống AI
        </p>
      </div>

      {/* Tabs for Upload and Explorer */}
      <Tabs defaultValue="explorer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="explorer">Khám phá dữ liệu</TabsTrigger>
          <TabsTrigger value="upload">Tải lên dữ liệu</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <DataUpload />
        </TabsContent>

        <TabsContent value="explorer" className="space-y-6">
          <DataExplorer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
