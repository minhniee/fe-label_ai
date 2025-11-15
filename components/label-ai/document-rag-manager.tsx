"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  useEffect(() => {
    // Notify parent of embedding config changes
    onEmbeddingConfigChange?.({
      provider: embeddingProvider,
      apiKey: embeddingApiKey || undefined,
      model: embeddingModel || undefined,
    })
  }, [embeddingProvider, embeddingApiKey, embeddingModel, onEmbeddingConfigChange])

  useEffect(() => {
    // Notify parent of selected documents changes
    onSelectedDocumentsChange?.(selectedDocumentIds)
  }, [selectedDocumentIds, onSelectedDocumentsChange])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const result = await getProjectDocuments(projectId)
      if (result.success) {
        const docs = result.documents || []
        setDocuments(docs)
        // Notify parent about documents status
        onDocumentsChange?.(docs.length > 0)
        // Auto-select all indexed documents
        const indexedDocIds = docs.filter(d => d.status === 'indexed').map(d => d.document_id)
        setSelectedDocumentIds(indexedDocIds)
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      })
      onDocumentsChange?.(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
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
    setIsIndexing(true)
    try {
      await indexProjectDocuments(
        projectId,
        embeddingProvider,
        embeddingApiKey || undefined,
        embeddingModel || undefined,
        false
      )
      toast({
        title: "Documents indexed",
        description: `Documents indexed using ${embeddingProvider}`,
      })
      await loadDocuments()
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
                          setSelectedDocumentIds([...selectedDocumentIds, doc.document_id])
                        } else {
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
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={embeddingApiKey}
                    onChange={(e) => setEmbeddingApiKey(e.target.value)}
                    placeholder="Enter API key"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
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

