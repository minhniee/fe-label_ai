import { Search, Filter, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterBarProps {
  searchQuery: string
  statusFilter: string
  totalRows: number
  filteredRows: number
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onClearFilters: () => void
  getStatusCount: (status: string) => number
}

export function FilterBar({
  searchQuery,
  statusFilter,
  totalRows,
  filteredRows,
  onSearchChange,
  onStatusFilterChange,
  onClearFilters,
  getStatusCount,
}: FilterBarProps) {
  const hasActiveFilter = statusFilter !== "all" || !!searchQuery

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search in all columns..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={onStatusFilterChange}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Status ({totalRows})
              </SelectItem>
              <SelectItem value="correct">
                Correct ({getStatusCount("correct")})
              </SelectItem>
              <SelectItem value="incorrect">
                Incorrect ({getStatusCount("incorrect")})
              </SelectItem>
              <SelectItem value="ambiguous">
                Ambiguous ({getStatusCount("ambiguous")})
              </SelectItem>
              <SelectItem value="needs_label">
                Needs Label ({getStatusCount("needs_label")})
              </SelectItem>
              <SelectItem value="pending">
                Pending Review ({getStatusCount("pending")})
              </SelectItem>
              <SelectItem value="confirmed">
                Confirmed ({getStatusCount("confirmed")})
              </SelectItem>
              <SelectItem value="none">
                No Status ({getStatusCount("none")})
              </SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      {hasActiveFilter && (
        <div className="mt-2 text-sm text-muted-foreground">
          Showing {filteredRows} of {totalRows} rows
        </div>
      )}
    </Card>
  )
}


