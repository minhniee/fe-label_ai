"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Settings2, Sparkles, FileText } from "lucide-react"
import type { AutoLabelingConfig, AutoLabelBatchResponse } from "@/app/api/batch"
import { DocumentRAGManager } from "@/components/label-ai/document-rag-manager"
import { Separator } from "@/components/ui/separator"

interface AutoLabelingConfigProps {
  batchId: number
  projectId?: number
  onConfigSubmit: (config: AutoLabelingConfig) => Promise<AutoLabelBatchResponse | void>
  initialConfig?: Partial<AutoLabelingConfig>
  disabled?: boolean
}

export function AutoLabelingConfig({
  batchId,
  projectId,
  onConfigSubmit,
  initialConfig,
  disabled = false,
}: AutoLabelingConfigProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [model, setModel] = useState(initialConfig?.model || "gemini-2.5-flash")
  const [apiKey, setApiKey] = useState(initialConfig?.api_key || "")
  const [contextColumn, setContextColumn] = useState(initialConfig?.context_column || "")
  const [resultColumn, setResultColumn] = useState(initialConfig?.result_column || "")
  const [referenceContext, setReferenceContext] = useState(initialConfig?.reference_context || "")
  const [embeddingProvider, setEmbeddingProvider] = useState(initialConfig?.embedding_provider || "local")
  const [embeddingApiKey, setEmbeddingApiKey] = useState(initialConfig?.embedding_api_key || "")
  const [embeddingModel, setEmbeddingModel] = useState(initialConfig?.embedding_model || "")
  const [documentIds, setDocumentIds] = useState<number[]>(initialConfig?.document_ids || [])
  const [promptType, setPromptType] = useState(initialConfig?.prompt_type || "auto_labeling")
  const [embeddingConfig, setEmbeddingConfig] = useState<{
    provider: string
    apiKey?: string
    model?: string
  }>({ provider: embeddingProvider })
  const [hasDocuments, setHasDocuments] = useState(false)

  // Memoize callbacks to prevent infinite loops
  const handleEmbeddingConfigChange = useCallback((config: {
    provider: string
    apiKey?: string
    model?: string
  }) => {
    setEmbeddingConfig(config)
  }, [])

  const handleDocumentsChange = useCallback((hasDocs: boolean) => {
    setHasDocuments(hasDocs)
  }, [])

  const handleSelectedDocumentsChange = useCallback((ids: number[] | null | undefined) => {
    setDocumentIds(ids || [])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your AI model API key",
        variant: "destructive",
      })
      return
    }

    if (!contextColumn.trim()) {
      toast({
        title: "Context Column Required",
        description: "Please specify the context column name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const config: AutoLabelingConfig = {
        model,
        api_key: apiKey.trim(),
        context_column: contextColumn.trim(),
        result_column: resultColumn.trim() || undefined,
        reference_context: referenceContext.trim() || undefined,
        embedding_provider: embeddingConfig.provider || undefined,
        embedding_api_key: embeddingConfig.apiKey || undefined,
        embedding_model: embeddingConfig.model || undefined,
        document_ids: documentIds.length > 0 ? documentIds : undefined,
        prompt_type: promptType || "auto_labeling",
      }

      const result = await onConfigSubmit(config)
      
      // Show warning if documents were selected but no context found
      if (result && typeof result === 'object' && 'warning' in result && result.warning) {
        toast({
          title: "Lưu ý về Documents",
          description: String(result.warning),
          variant: "default",
        })
      } else {
        toast({
          title: "Auto-Labeling Started",
          description: "The batch is now being labeled automatically. Check the status below.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Failed to Start Auto-Labeling",
        description: error.message || "An error occurred while starting auto-labeling",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Auto-Labeling Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure AI model and settings to automatically label all files in this batch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="promptType">Prompt Type</Label>
            <Select value={promptType} onValueChange={setPromptType} disabled={disabled || loading}>
              <SelectTrigger id="promptType">
                <SelectValue placeholder="Select prompt type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_labeling">Auto-Labeling (Recommended)</SelectItem>
                <SelectItem value="fact_checking">Fact-Checking (Legacy)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-Labeling: Optimized for generating labels. Fact-Checking: For validation/review.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model *</Label>
            <Select value={model} onValueChange={setModel} disabled={disabled || loading}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your AI model API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={disabled || loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your API key will be used to call the AI model. It is securely stored during the labeling process.
            </p>
          </div>

          {/* Context Column */}
          <div className="space-y-2">
            <Label htmlFor="contextColumn">Context Column *</Label>
            <Input
              id="contextColumn"
              placeholder="e.g., question, context, text"
              value={contextColumn}
              onChange={(e) => setContextColumn(e.target.value)}
              disabled={disabled || loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Column name containing the data to be labeled
            </p>
          </div>

          {/* Result Column */}
          <div className="space-y-2">
            <Label htmlFor="resultColumn">Result Column (Optional)</Label>
            <Input
              id="resultColumn"
              placeholder="e.g., answer, label, result"
              value={resultColumn}
              onChange={(e) => setResultColumn(e.target.value)}
              disabled={disabled || loading}
            />
            <p className="text-xs text-muted-foreground">
              Column name where the labeled results will be saved
            </p>
          </div>

          {/* Reference Context */}
          <div className="space-y-2">
            <Label htmlFor="referenceContext">Reference Context (Optional)</Label>
            <Textarea
              id="referenceContext"
              placeholder="Enter reference context or examples for labeling..."
              value={referenceContext}
              onChange={(e) => setReferenceContext(e.target.value)}
              disabled={disabled || loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Additional context or examples to help the AI with labeling
            </p>
          </div>

          {/* Document Selection (RAG) */}
          {projectId && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Reference Documents (Optional)</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload and select documents to use as reference for labeling. The AI will use information from these documents to generate more accurate labels.
                </p>
                <DocumentRAGManager
                  projectId={projectId}
                  onEmbeddingConfigChange={handleEmbeddingConfigChange}
                  onDocumentsChange={handleDocumentsChange}
                  onSelectedDocumentsChange={handleSelectedDocumentsChange}
                />
              </div>
            </>
          )}

          {/* Embedding Provider (Advanced) */}
          {!hasDocuments && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Advanced Settings (RAG)</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="embeddingProvider">Embedding Provider</Label>
                <Select 
                  value={embeddingConfig.provider} 
                  onValueChange={(v) => {
                    setEmbeddingConfig((prev) => ({ ...prev, provider: v }))
                  }} 
                  disabled={disabled || loading}
                >
                  <SelectTrigger id="embeddingProvider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {embeddingConfig.provider !== "local" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="embeddingApiKey">Embedding API Key</Label>
                    <Input
                      id="embeddingApiKey"
                      type="password"
                      placeholder="Enter embedding API key"
                      value={embeddingConfig.apiKey || ""}
                      onChange={(e) => {
                        setEmbeddingConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }}
                      disabled={disabled || loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="embeddingModel">Embedding Model</Label>
                    <Input
                      id="embeddingModel"
                      placeholder="e.g., text-embedding-3-small"
                      value={embeddingConfig.model || ""}
                      onChange={(e) => {
                        setEmbeddingConfig((prev) => ({ ...prev, model: e.target.value }))
                      }}
                      disabled={disabled || loading}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={disabled || loading || !apiKey.trim() || !contextColumn.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Auto-Labeling...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Auto-Labeling
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

