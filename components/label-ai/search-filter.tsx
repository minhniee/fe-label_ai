"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { X, Search } from "lucide-react"

interface SearchFilterProps {
  onSearchChange: (query: string) => void
  placeholder?: string
}

export function SearchFilter({ onSearchChange, placeholder = "Search data..." }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearchChange(value)
  }

  const handleClear = () => {
    setSearchQuery("")
    onSearchChange("")
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
