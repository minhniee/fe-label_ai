"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ClipboardList } from "lucide-react"

export default function AnnotateBatchPage() {
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batchId")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Annotate Batch</h1>
          <p className="text-sm text-muted-foreground">
            {batchId ? `Preparing workspace for batch ${batchId}` : "Load a batch from the list to start annotating."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/annotate">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to batches
          </Link>
        </Button>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Annotation Workspace
          </CardTitle>
          <CardDescription>
            This is a placeholder for the batch annotation interface. Connect this screen to your annotation workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground bg-muted/30">
            <p>
              You can render the selected batch details here (images, metadata, assignees, etc.). Use the <code>batchId</code>
              from the query string to fetch the correct data from your backend.
            </p>
            {!batchId && (
              <p className="mt-3 text-xs text-muted-foreground">
                Tip: select a batch from the Unassigned column to open it here automatically.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
