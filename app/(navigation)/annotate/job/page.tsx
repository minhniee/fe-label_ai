"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AnnotateJobPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/annotate/batch">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to batch
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Annotation Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Connect this screen to your labeling tool or flow. This placeholder keeps the route valid.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ready to integrate</CardTitle>
          <CardDescription>
            Render your annotation UI here (images, task details, controls, shortcuts, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The `/annotate/job` page is now a valid Next.js module. Hook it up to your annotation workflow to start
            labeling files that were assigned on the previous screen.
          </p>
          <p>
            Use routing, shared state, or backend APIs to load the job contents, persist progress, and provide labeling
            controls.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
