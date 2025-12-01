"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Database, Upload, Loader2, Settings, CheckCircle2, RefreshCw, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  uploadDocument, 
  getProjectDocuments, 
  indexProjectDocuments,
  deleteDocument
} from "@/app/api/labelai"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Document {
  document_id: number
  name: string
  file_type: string
  status: string
  created_at: string
  metadata: any
}

interface DocumentRAGManagerProps {
  projectId: number
  onEmbeddingConfigChange?: (config: {
    provider: string
    apiKey?: string
    model?: string
  }) => void
  onDocumentsChange?: (hasDocuments: boolean) => void  // NEW: notify parent about documents status
  onSelectedDocumentsChange?: (documentIds: number[]) => void  // NEW: notify parent about selected documents
}

export function DocumentRAGManager({ projectId, onEmbeddingConfigChange, onDocumentsChange, onSelectedDocumentsChange }: DocumentRAGManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [embeddingProvider, setEmbeddingProvider] = useState("local")
  const [embeddingApiKey, setEmbeddingApiKey] = useState("")
  const [embeddingModel, setEmbeddingModel] = useState("")
  const { toast } = useToast()

  // Use refs to avoid dependency issues with callbacks
  const onEmbeddingConfigChangeRef = useRef(onEmbeddingConfigChange)
  const onDocumentsChangeRef = useRef(onDocumentsChange)
  const onSelectedDocumentsChangeRef = useRef(onSelectedDocumentsChange)

  // Keep refs updated
  useEffect(() => {
    onEmbeddingConfigChangeRef.current = onEmbeddingConfigChange
    onDocumentsChangeRef.current = onDocumentsChange
    onSelectedDocumentsChangeRef.current = onSelectedDocumentsChange
  }, [onEmbeddingConfigChange, onDocumentsChange, onSelectedDocumentsChange])

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getProjectDocuments(projectId)
      if (result.success) {
        const docs: Document[] = result.documents || []
        setDocuments(docs)
        // Notify parent about documents status
        onDocumentsChangeRef.current?.(docs.length > 0)
        
        // Try to restore previous selection from localStorage
        try {
          const previousSelection = localStorage.getItem(`doc_selection_${projectId}`)
          if (previousSelection) {
            const savedIds = JSON.parse(previousSelection)
            // Only use saved IDs that still exist and are indexed
            const validIds = savedIds.filter((id: number) => 
              docs.some((d: Document) => d.document_id === id && d.status === 'indexed')
            )
            if (validIds.length > 0) {
              setSelectedDocumentIds(validIds)
              return
            }
          }
        } catch (e) {
          // Invalid saved selection, continue to auto-select
        }
        
        // Auto-select all indexed documents only if no previous selection exists
        const indexedDocIds = docs.filter((d: Document) => d.status === 'indexed').map((d: Document) => d.document_id)
        setSelectedDocumentIds(indexedDocIds)
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      })
      onDocumentsChangeRef.current?.(false)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Reset model when provider changes
  useEffect(() => {
    // Reset model when provider changes to avoid invalid combinations
    if (embeddingProvider === "local") {
      setEmbeddingModel("")
    } else {
      // Set default model for non-local providers if not set
      const defaultModels: Record<string, string> = {
        openai: "text-embedding-3-small",
        gemini: "models/text-embedding-004",
        qwen: "text-embedding-v2"
      }
      // Only set default if model is empty (to avoid overwriting user selection)
      if (embeddingModel === "" && defaultModels[embeddingProvider]) {
        setEmbeddingModel(defaultModels[embeddingProvider])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embeddingProvider])

  useEffect(() => {
    // Notify parent of embedding config changes
    onEmbeddingConfigChangeRef.current?.({
      provider: embeddingProvider,
      apiKey: embeddingApiKey || undefined,
      model: embeddingModel || undefined,
    })
  }, [embeddingProvider, embeddingApiKey, embeddingModel])

  useEffect(() => {
    // Notify parent of selected documents changes
    console.log(`[DocumentRAGManager] Selected documents changed:`, selectedDocumentIds)
    onSelectedDocumentsChangeRef.current?.(selectedDocumentIds)
    
    // Save selection to localStorage when it changes
    if (selectedDocumentIds.length > 0) {
      try {
        localStorage.setItem(`doc_selection_${projectId}`, JSON.stringify(selectedDocumentIds))
        console.log(`[DocumentRAGManager] Saved selection to localStorage:`, selectedDocumentIds)
      } catch (e) {
        // Ignore localStorage errors
      }
    } else {
      // Clear localStorage when no documents are selected (user unchecked all)
      try {
        localStorage.removeItem(`doc_selection_${projectId}`)
        console.log(`[DocumentRAGManager] Cleared localStorage - no documents selected`)
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [selectedDocumentIds, projectId])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast({
            title: "File too large",
            description: `File "${file.name}" exceeds the 20MB limit and was skipped.`,
            variant: "destructive",
          })
          continue
        }
        await uploadDocument(projectId, file)
      }
      
      await loadDocuments()
      // onDocumentsChange will be called by loadDocuments
      toast({
        title: "Documents uploaded",
        description: `Successfully uploaded ${files.length} document(s)`,
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const handleIndexDocuments = async () => {
    // Validate embedding config for non-local providers
    if (embeddingProvider !== "local") {
      if (!embeddingApiKey) {
        toast({
          title: "Validation Error",
          description: "API Key is required for non-local embedding providers",
          variant: "destructive",
        })
        return
      }
      if (!embeddingModel) {
        toast({
          title: "Validation Error",
          description: "Model is required for non-local embedding providers",
          variant: "destructive",
        })
        return
      }
    }

    setIsIndexing(true)
    try {
      await indexProjectDocuments(
        projectId,
        embeddingProvider,
        embeddingApiKey || undefined,
        embeddingModel || undefined,
        false
      )
      
      // Reload documents to get updated statuses
      // loadDocuments() will auto-select all indexed documents
      await loadDocuments()
      
      toast({
        title: "Documents indexed",
        description: `Documents indexed using ${embeddingProvider}`,
      })
    } catch (error) {
      toast({
        title: "Indexing failed",
        description: error instanceof Error ? error.message : "Failed to index documents",
        variant: "destructive",
      })
    } finally {
      setIsIndexing(false)
    }
  }

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }

    setDeletingDocId(documentId)
    try {
      await deleteDocument(documentId)
      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully",
      })
      // Remove from selected if it was selected
      setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== documentId))
      // Reload documents list
      await loadDocuments()
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      })
    } finally {
      setDeletingDocId(null)
    }
  }

  const getModelOptions = (provider: string) => {
    switch (provider) {
      case "openai":
        return [
          { value: "text-embedding-3-small", label: "text-embedding-3-small" },
          { value: "text-embedding-3-large", label: "text-embedding-3-large" },
          { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
        ]
      case "gemini":
        return [
          { value: "models/text-embedding-004", label: "text-embedding-004" },
        ]
      case "qwen":
        return [
          { value: "text-embedding-v2", label: "text-embedding-v2" },
        ]
      default:
        return [
          { value: "keepitreal/vietnamese-sbert", label: "Vietnamese SBERT" },
          { value: "paraphrase-multilingual-MiniLM-L12-v2", label: "Multilingual MiniLM" },
        ]
    }
  }

  const indexedCount = documents.filter(d => d.status === 'indexed').length

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Document RAG (NotebookLM Style)
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload documents to use as ground truth context for CSV labeling
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <label htmlFor="document-upload">
              <Button variant="outline" size="sm" asChild disabled={isUploading}>
                <span className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="document-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              Select documents to use for labeling (only indexed documents can be selected):
            </div>
            {documents.map((doc) => {
              const isIndexed = doc.status === 'indexed'
              const isSelected = selectedDocumentIds.includes(doc.document_id)
              return (
                <div
                  key={doc.document_id}
                  className={`flex items-center justify-between p-3 bg-secondary/50 rounded-lg border ${
                    isSelected ? 'border-primary' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          console.log(`[DocumentRAGManager] User checked document:`, doc.document_id, doc.name)
                          setSelectedDocumentIds([...selectedDocumentIds, doc.document_id])
                        } else {
                          console.log(`[DocumentRAGManager] User unchecked document:`, doc.document_id, doc.name)
                          setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.document_id))
                        }
                      }}
                      disabled={!isIndexed}
                      className="flex-shrink-0"
                    />
                    <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${
                      isIndexed ? 'text-green-500' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_type} • {doc.status} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isIndexed && (
                      <span className="text-xs text-green-600">Ready</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.document_id)}
                      disabled={deletingDocId === doc.document_id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingDocId === doc.document_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
            {selectedDocumentIds.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                {selectedDocumentIds.length} document(s) selected for labeling
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload PDF, DOCX, or TXT files to enable RAG-augmented labeling
            </p>
          </div>
        )}

        {/* Index Button */}
        {documents.length > 0 && (
          <Button
            onClick={handleIndexDocuments}
            disabled={isIndexing}
            className="w-full"
            variant="outline"
          >
            {isIndexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Index Documents ({indexedCount}/{documents.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embedding Settings</DialogTitle>
            <DialogDescription>
              Configure embedding provider for document search
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Embedding Provider</Label>
              <Select value={embeddingProvider} onValueChange={setEmbeddingProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (SentenceTransformer)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="qwen">Qwen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {embeddingProvider !== "local" && (
              <>
                <div>
                  <Label>API Key *</Label>
                  <Input
                    type="password"
                    value={embeddingApiKey}
                    onChange={(e) => setEmbeddingApiKey(e.target.value)}
                    placeholder="Enter API key"
                    required
                  />
                </div>
                <div>
                  <Label>Model *</Label>
                  <Select 
                    value={embeddingModel} 
                    onValueChange={setEmbeddingModel}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelOptions(embeddingProvider).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!embeddingModel && (
                    <p className="text-xs text-destructive mt-1">Please select a model</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

