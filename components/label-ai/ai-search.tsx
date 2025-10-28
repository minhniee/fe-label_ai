"use client"

import { useState } from "react"
import { Search, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface AISearchProps {
  onSearchResults?: (results: any[]) => void
}

export function AISearch({ onSearchResults }: AISearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setResults(result.data)
        onSearchResults?.(result.data)

        toast({
          title: "Search completed",
          description: `Found ${result.data.length} results`,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to search",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-lg">AI-Powered Search</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask a question about any topic (e.g., "biology questions about photosynthesis") and AI will search for
          relevant data and generate sample results
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a question... e.g., 'biology questions about cells'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            disabled={isSearching}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Search Results ({results.length})</p>
              <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                AI Generated
              </span>
            </div>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-4 bg-background rounded-lg border border-border hover:border-blue-500/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground text-sm flex-1">{result.question}</p>
                      <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded whitespace-nowrap">
                        {result.ai_label || "AI Label"}
                      </span>
                    </div>
                    {result.topic && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Topic:</span> {result.topic}
                      </p>
                    )}
                    {result.answer && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium">Answer:</span> {result.answer}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
