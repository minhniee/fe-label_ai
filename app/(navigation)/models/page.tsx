"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModelTraining } from "@/components/model-training"
import { ModelComparison } from "@/components/model-comparison"

export default function ModelsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Training & Model Dashboard</h1>
      </div>

      {/* Tabs for Training and Comparison */}
      <Tabs defaultValue="training" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="training">Huấn luyện mô hình</TabsTrigger>
          <TabsTrigger value="comparison">So sánh mô hình</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-6">
          <ModelTraining />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <ModelComparison />
        </TabsContent>
      </Tabs>
    </div>
  )
}


