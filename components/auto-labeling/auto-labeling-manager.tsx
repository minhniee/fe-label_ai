"use client"

import { useState, useCallback } from "react"
import { AutoLabelingConfig } from "./auto-labeling-config"
import { AutoLabelingStatus } from "./auto-labeling-status"
import { autoLabelBatch } from "@/app/api/batch"
import type { AutoLabelingConfig as AutoLabelingConfigType } from "@/app/api/batch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AutoLabelingManagerProps {
  batchId: number
  projectId?: number
  projectSlug?: string
  initialConfig?: Partial<AutoLabelingConfigType>
}

export function AutoLabelingManager({
  batchId,
  projectId,
  projectSlug,
  initialConfig,
}: AutoLabelingManagerProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [config, setConfig] = useState<AutoLabelingConfigType | null>(null)

  const handleConfigSubmit = async (config: AutoLabelingConfigType) => {
    try {
      const result = await autoLabelBatch({
        batch_id: batchId,
        config,
      })
      setConfig(config)
      setHasStarted(true)
      return result // Return result to allow warning handling
    } catch (error) {
      throw error // Let the form handle the error
    }
  }

  const handleStatusChange = useCallback((status: any) => {
    // Update hasStarted based on status
    if (status.status === "auto_labeled" || status.status === "completed") {
      setHasStarted(false) // Allow re-configuration if needed
    }
  }, [])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-4">
          <AutoLabelingConfig
            batchId={batchId}
            projectId={projectId}
            onConfigSubmit={handleConfigSubmit}
            initialConfig={initialConfig}
            disabled={hasStarted}
          />
        </TabsContent>
        
        <TabsContent value="status" className="space-y-4">
          <AutoLabelingStatus
            batchId={batchId}
            projectSlug={projectSlug}
            autoRefresh={true}
            refreshInterval={3000}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

