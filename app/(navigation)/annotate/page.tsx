"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import UnassignedSection from "@/components/unassigned-section"
import AnnotatingSection from "@/components/annotating-section"
import DatasetSection from "@/components/dataset-section"

export default function AnnotatePage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState("newest")

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Anotate</h1>
      
     {/* Sort By */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm cursor-pointer hover:bg-accent"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch min-h-[calc(100vh-200px)]">
        {/* Unassigned Column */}
        <UnassignedSection />

        {/* Annotating Column */}
        <AnnotatingSection />

        {/* Dataset Column */}
        <DatasetSection />
      </div>
    </div>
  );
}
