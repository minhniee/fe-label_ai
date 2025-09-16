"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LabelingInterface } from "@/components/labeling-interface"
import { LabelingAdmin } from "@/components/labeling-admin"
import { DataLabelingInterface } from "@/components/data-labeling-interface"

export default function LabelingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gán nhãn dữ liệu</h1>
        <p className="text-muted-foreground mt-2">Gán nhãn cho dữ liệu tuyển sinh để huấn luyện mô hình AI</p>
      </div>

      {/* Tabs for Labeling and Admin */}
      <Tabs defaultValue="data-labeling" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="data-labeling">Dữ liệu & Gán nhãn</TabsTrigger>
          <TabsTrigger value="labeling">Gán nhãn nhanh</TabsTrigger>
          <TabsTrigger value="admin">Quản lý</TabsTrigger>
        </TabsList>

        <TabsContent value="data-labeling" className="space-y-6">
          <DataLabelingInterface />
        </TabsContent>

        <TabsContent value="labeling" className="space-y-6">
          <LabelingInterface />
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <LabelingAdmin />
        </TabsContent>
      </Tabs>
    </div>
  )
}
