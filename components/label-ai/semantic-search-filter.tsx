"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Search, Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { semanticSearch, getSemanticSearchIndexStatus, indexFileForSemanticSearch } from "@/app/api/labelai"
import { Badge } from "@/components/ui/badge"

interface SemanticSearchFilterProps {
  fileId: number | null
  onSearchResults: (results: any[]) => void
  placeholder?: string
}

export function SemanticSearchFilter({ 
  fileId, 
  onSearchResults, 
  placeholder = "Semantic search (e.g., thiên nhiên)..." 
}: SemanticSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isIndexed, setIsIndexed] = useState<boolean | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const { toast } = useToast()
  const checkingRef = useRef(false) // Prevent concurrent checks
  const lastCheckedFileIdRef = useRef<number | null>(null) // Track last checked fileId
  const abortControllerRef = useRef<AbortController | null>(null) // Cancel pending requests

  // Check index status when fileId changes
  useEffect(() => {
    if (!fileId) {
      setIsIndexed(null)
      lastCheckedFileIdRef.current = null
      return
    }

    // Skip if we already checked this fileId
    if (lastCheckedFileIdRef.current === fileId) {
      return
    }

    // Prevent concurrent checks
    if (checkingRef.current) {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }

    checkingRef.current = true
    lastCheckedFileIdRef.current = fileId
    abortControllerRef.current = new AbortController()

    const checkStatus = async () => {
      try {
        const status = await getSemanticSearchIndexStatus(fileId)
        setIsIndexed(status.is_indexed || false)
      } catch (error: any) {
        // Don't update state if request was aborted
        if (error.name !== 'AbortError') {
          setIsIndexed(false)
        }
      } finally {
        checkingRef.current = false
        abortControllerRef.current = null
      }
    }

    checkStatus()

    // Cleanup on unmount or fileId change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fileId])

  const handleIndex = async () => {
    if (!fileId) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      })
      return
    }

    setIsIndexing(true)
    try {
      await indexFileForSemanticSearch(fileId)
      setIsIndexed(true)
      toast({
        title: "Success",
        description: "File indexed successfully. You can now use semantic search.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to index file",
        variant: "destructive",
      })
    } finally {
      setIsIndexing(false)
    }
  }

  const handleSearch = async () => {
    if (!fileId) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      })
      return
    }

    if (!searchQuery.trim()) {
      onSearchResults([])
      return
    }

    if (!isIndexed) {
      toast({
        title: "Not Indexed",
        description: "Please index the file first before searching",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const results = await semanticSearch(fileId, searchQuery, 20, 0.3)
      onSearchResults(results.results || [])
      
      if (results.num_results === 0) {
        toast({
          title: "No Results",
          description: "No matching rows found. Try a different query.",
        })
      } else {
        toast({
          title: "Search Complete",
          description: `Found ${results.num_results} matching rows`,
        })
      }
    } catch (error: any) {
      toast({
        title: "Search Error",
        description: error.message || "Failed to perform semantic search",
        variant: "destructive",
      })
      onSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleClear = () => {
    setSearchQuery("")
    onSearchResults([])
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  if (!fileId) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-10"
          disabled={!isIndexed || isSearching}
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isSearching}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {isIndexed === false && (
        <Button
          onClick={handleIndex}
          disabled={isIndexing}
          variant="outline"
          size="sm"
        >
          {isIndexing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Indexing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Index File
            </>
          )}
        </Button>
      )}

      {isIndexed && (
        <>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            variant="default"
            size="sm"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
          <Badge variant="secondary" className="text-xs">
            Indexed
          </Badge>
        </>
      )}
    </div>
  )
}

