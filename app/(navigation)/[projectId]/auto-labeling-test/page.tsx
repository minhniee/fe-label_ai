"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AutoLabelingManager } from "@/components/auto-labeling/auto-labeling-manager"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getBatch } from "@/app/api/batch"
import { slugToProjectId } from "@/types/project"

export default function AutoLabelingTestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const projectSlug = params.projectId as string
  const projectId = parseInt(slugToProjectId(projectSlug), 10)
  const batchIdParam = searchParams.get("batchId")
  
  const [batchId, setBatchId] = useState<number | null>(null)
  const [batchData, setBatchData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [inputBatchId, setInputBatchId] = useState(batchIdParam || "")

  useEffect(() => {
    if (batchIdParam) {
      loadBatch(parseInt(batchIdParam))
    }
  }, [batchIdParam])

  const loadBatch = async (id: number) => {
    if (!id) return

    setLoading(true)
    try {
      const batch = await getBatch(id)
      setBatchData(batch)
      setBatchId(id)
      setInputBatchId(id.toString())
      
      // Update URL
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.set("batchId", id.toString())
      router.replace(`/${projectSlug}/auto-labeling-test?${newParams.toString()}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load batch",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadBatch = () => {
    const id = parseInt(inputBatchId)
    if (isNaN(id)) {
      toast({
        title: "Invalid Batch ID",
        description: "Please enter a valid batch ID number",
        variant: "destructive",
      })
      return
    }
    loadBatch(id)
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Auto-Labeling Test</h1>
        </div>
        <p className="text-muted-foreground">
          Test the automatic labeling functionality for batches
        </p>
      </div>

      {/* Batch Selector */}
      {!batchId && (
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="batchId">Batch ID</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter a batch ID to start auto-labeling
              </p>
              <div className="flex gap-2">
                <Input
                  id="batchId"
                  type="number"
                  placeholder="Enter batch ID"
                  value={inputBatchId}
                  onChange={(e) => setInputBatchId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLoadBatch()
                    }
                  }}
                />
                <Button
                  onClick={handleLoadBatch}
                  disabled={loading || !inputBatchId.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load Batch"
                  )}
                </Button>
              </div>
            </div>
            
            {batchData && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Batch Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <span className="font-medium">{batchData.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium">{batchData.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Files:</span>{" "}
                    <span className="font-medium">{batchData.total_files}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Progress:</span>{" "}
                    <span className="font-medium">{batchData.progress_percentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Auto-Labeling Manager */}
      {batchId && (
        <div className="space-y-6">
          {batchData && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{batchData.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Batch ID: {batchId} • Status: {batchData.status}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBatchId(null)
                    setBatchData(null)
                    setInputBatchId("")
                  }}
                >
                  Change Batch
                </Button>
              </div>
            </Card>
          )}

          <AutoLabelingManager
            batchId={batchId!}
            projectId={projectId}
            projectSlug={projectSlug}
          />
        </div>
      )}

      {/* Instructions */}
      {!batchId && (
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <h3 className="font-semibold mb-3">How to Test Auto-Labeling:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Create a batch with CSV files in your project</li>
            <li>Enter the batch ID in the field above</li>
            <li>Configure the auto-labeling settings (model, API key, columns)</li>
            <li>Click "Start Auto-Labeling" to begin the process</li>
            <li>Monitor the progress in the Status tab</li>
            <li>Review the labeled files after completion</li>
          </ol>
        </Card>
      )}
    </div>
  )
}

