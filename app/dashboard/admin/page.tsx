"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "@/components/user-management"
import { LabelManagement } from "@/components/label-management"
import { ProgressStatistics } from "@/components/progress-statistics"
import { BatchManagement } from "@/components/batch-management"
import { InterAnnotatorAgreement } from "@/components/inter-annotator-agreement"
import { DataExport } from "@/components/data-export"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quản trị hệ thống</h1>
        <p className="text-muted-foreground mt-2">Quản lý người dùng, nhãn dữ liệu và theo dõi thống kê tổng thể</p>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="batches" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
          <TabsTrigger value="batches">Quản lý Batch</TabsTrigger>
          <TabsTrigger value="agreement">Inter-Annotator</TabsTrigger>
          <TabsTrigger value="export">Xuất dữ liệu</TabsTrigger>
          <TabsTrigger value="users">Quản lý User</TabsTrigger>
          <TabsTrigger value="labels">Quản lý Labels</TabsTrigger>
          <TabsTrigger value="statistics">Thống kê</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="space-y-6">
          <BatchManagement />
        </TabsContent>

        <TabsContent value="agreement" className="space-y-6">
          <InterAnnotatorAgreement />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <DataExport />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="labels" className="space-y-6">
          <LabelManagement />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <ProgressStatistics />
        </TabsContent>
      </Tabs>
    </div>
  )
}
