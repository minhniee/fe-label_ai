"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComparisonTool() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annotation Comparison</CardTitle>
        <CardDescription>Compare and analyze annotations for this project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Comparison tool coming soon...
        </div>
      </CardContent>
    </Card>
  );
}

