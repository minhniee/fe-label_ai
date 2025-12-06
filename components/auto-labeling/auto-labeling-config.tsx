"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Settings2, Sparkles, FileText, HelpCircle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import type { AutoLabelingConfig, AutoLabelBatchResponse } from "@/app/api/batch"
import { DocumentRAGManager } from "@/components/label-ai/document-rag-manager"
import { Separator } from "@/components/ui/separator"
import { getBatch } from "@/app/api/batch"
import { getFile } from "@/app/api/dataset"
import { getApiKeyFromStorage, saveApiKeyToStorage, detectContextColumn, detectResultColumn } from "@/lib/label-ai-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [loadingColumns, setLoadingColumns] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  
  const [model, setModel] = useState(initialConfig?.model || "gemini-2.5-flash")
  const [apiKey, setApiKey] = useState(initialConfig?.api_key || "")
  const [contextColumn, setContextColumn] = useState(initialConfig?.context_column || "")
  const [resultColumn, setResultColumn] = useState(initialConfig?.result_column || "")
  const [referenceContext, setReferenceContext] = useState(initialConfig?.reference_context || "")
  const [embeddingProvider, setEmbeddingProvider] = useState(initialConfig?.embedding_provider || "gemini")
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autoDetectedContext, setAutoDetectedContext] = useState<string | null>(null)
  const [autoDetectedResult, setAutoDetectedResult] = useState<string | null>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = getApiKeyFromStorage()
    if (savedApiKey && !initialConfig?.api_key) {
      setApiKey(savedApiKey)
    }
  }, [initialConfig?.api_key])

  // Load RAG settings from localStorage on mount
  useEffect(() => {
    try {
      const savedRAGSettings = localStorage.getItem("rag_settings")
      if (savedRAGSettings) {
        const settings = JSON.parse(savedRAGSettings)
        // Convert "local" to "gemini" if found
        const provider = settings.provider === "local" ? "gemini" : (settings.provider || "gemini")
        if (!initialConfig?.embedding_provider && provider) {
          setEmbeddingProvider(provider)
          setEmbeddingConfig((prev) => ({ ...prev, provider }))
        }
        if (!initialConfig?.embedding_api_key && settings.apiKey) {
          setEmbeddingApiKey(settings.apiKey)
          setEmbeddingConfig((prev) => ({ ...prev, apiKey: settings.apiKey }))
        }
        if (!initialConfig?.embedding_model && settings.model) {
          setEmbeddingModel(settings.model)
          setEmbeddingConfig((prev) => ({ ...prev, model: settings.model }))
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [initialConfig])

  // Save RAG settings to localStorage when they change
  useEffect(() => {
    try {
      const ragSettings = {
        provider: embeddingConfig.provider,
        apiKey: embeddingConfig.apiKey || "",
        model: embeddingConfig.model || "",
      }
      localStorage.setItem("rag_settings", JSON.stringify(ragSettings))
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [embeddingConfig])

  // Load columns from batch files
  useEffect(() => {
    const loadColumns = async () => {
      try {
        setLoadingColumns(true)
        const batch = await getBatch(batchId)
        const fileIds = batch.batch_metadata?.file_ids || []
        
        if (fileIds.length > 0) {
          // Get the first file to extract columns
          const firstFileId = fileIds[0]
          
          // Try to get columns from file preview (headers)
          try {
            const { getFilePreview } = await import("@/app/api/dataset")
            const preview = await getFilePreview(firstFileId, 1)
            if (preview.headers && preview.headers.length > 0) {
              setAvailableColumns(preview.headers)
              
              // Auto-detect and suggest columns
              const suggestedContext = detectContextColumn(preview.headers)
              const suggestedResult = detectResultColumn(preview.headers)
              
              if (suggestedContext && !contextColumn) {
                setAutoDetectedContext(suggestedContext)
                setContextColumn(suggestedContext)
              }
              
              if (suggestedResult && !resultColumn) {
                setAutoDetectedResult(suggestedResult)
              }
            }
          } catch (previewError) {
            // Fallback: try to get from file object
            try {
              const file = await getFile(firstFileId)
              if ((file as any).column_names && Array.isArray((file as any).column_names)) {
                const columns = (file as any).column_names
                setAvailableColumns(columns)
                
                // Auto-detect and suggest columns
                const suggestedContext = detectContextColumn(columns)
                const suggestedResult = detectResultColumn(columns)
                
                if (suggestedContext && !contextColumn) {
                  setAutoDetectedContext(suggestedContext)
                  setContextColumn(suggestedContext)
                }
                
                if (suggestedResult && !resultColumn) {
                  setAutoDetectedResult(suggestedResult)
                }
              }
            } catch (fileError) {
              console.warn("Could not get file columns:", fileError)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load columns:", error)
        // Don't show error toast, just log it
      } finally {
        setLoadingColumns(false)
      }
    }

    loadColumns()
  }, [batchId])

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
          {/* Essential Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Essential Settings</h3>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="model">AI Model *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Choose the AI model for labeling. Gemini 2.5 Flash is recommended for speed and cost-effectiveness.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={model} onValueChange={setModel} disabled={disabled || loading}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash">
                    <div className="flex items-center gap-2">
                      <span>Gemini 2.5 Flash</span>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                  </SelectItem>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Your API key is securely stored locally and used only for this labeling session.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your AI model API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  // Save to localStorage when user types
                  if (e.target.value.trim()) {
                    saveApiKeyToStorage(e.target.value.trim())
                  }
                }}
                disabled={disabled || loading}
                required
                className={apiKey ? "border-green-500/50" : ""}
              />
              {apiKey && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>API key saved</span>
                </div>
              )}
            </div>

            {/* Context Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="contextColumn">Context Column *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The column containing the data you want to label. This will be sent to the AI model.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {loadingColumns ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading columns from file...</span>
                </div>
              ) : availableColumns.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={contextColumn}
                    onValueChange={setContextColumn}
                    disabled={disabled || loading}
                    required
                  >
                    <SelectTrigger id="contextColumn" className={contextColumn ? "border-green-500/50" : ""}>
                      <SelectValue placeholder="Select context column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span>{col}</span>
                            {autoDetectedContext === col && (
                              <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {autoDetectedContext === contextColumn && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Auto-detected based on column name</span>
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  id="contextColumn"
                  placeholder="e.g., question, context, text"
                  value={contextColumn}
                  onChange={(e) => setContextColumn(e.target.value)}
                  disabled={disabled || loading}
                  required
                />
              )}
            </div>

            {/* Result Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="resultColumn">Result Column (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Where to save the labeled results. Leave empty to create a new column automatically.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {availableColumns.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={resultColumn || "__none__"}
                    onValueChange={(value) => {
                      // Convert special value back to empty string
                      setResultColumn(value === "__none__" ? "" : value)
                    }}
                    disabled={disabled || loading}
                  >
                    <SelectTrigger id="resultColumn">
                      <SelectValue placeholder="Select result column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (will create new column)</SelectItem>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span>{col}</span>
                            {autoDetectedResult === col && (
                              <Badge variant="secondary" className="text-xs">Suggested</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {autoDetectedResult && !resultColumn && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>Suggested: "{autoDetectedResult}" - Select it or leave empty to create new column</span>
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  id="resultColumn"
                  placeholder="e.g., answer, label, result"
                  value={resultColumn}
                  onChange={(e) => setResultColumn(e.target.value)}
                  disabled={disabled || loading}
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Optional Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Optional Settings</h3>
            </div>

            {/* Prompt Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="promptType">Prompt Type</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Auto-Labeling is optimized for generating labels. Fact-Checking is for validation/review tasks.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={promptType} onValueChange={setPromptType} disabled={disabled || loading}>
                <SelectTrigger id="promptType">
                  <SelectValue placeholder="Select prompt type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_labeling">
                    <div className="flex items-center gap-2">
                      <span>Auto-Labeling</span>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="fact_checking">Fact-Checking (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Context */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="referenceContext">Reference Context (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Provide examples or guidelines to help the AI understand your labeling requirements better.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="referenceContext"
                placeholder="Example: Label positive comments as 'positive', negative as 'negative'..."
                value={referenceContext}
                onChange={(e) => setReferenceContext(e.target.value)}
                disabled={disabled || loading}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Additional context or examples to help the AI with labeling
              </p>
            </div>
          </div>

          {/* Document Selection (RAG) */}
          {projectId && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Reference Documents (Optional)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Upload documents to provide context. The AI will search these documents to generate more accurate labels.</p>
                    </TooltipContent>
                  </Tooltip>
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

          {/* Advanced Settings */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span>Advanced Settings</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showAdvanced && !hasDocuments && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="embeddingProvider">Embedding Provider</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Choose the embedding provider for document search. Gemini is recommended for best results.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                      <SelectItem value="gemini">
                        <div className="flex items-center gap-2">
                          <span>Google Gemini</span>
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embeddingApiKey">Embedding API Key *</Label>
                  <Input
                    id="embeddingApiKey"
                    type="password"
                    placeholder={embeddingConfig.provider === "gemini" ? "Enter Gemini API key" : embeddingConfig.provider === "openai" ? "Enter OpenAI API key" : "Enter Google API key"}
                    value={embeddingConfig.apiKey || ""}
                    onChange={(e) => {
                      const newApiKey = e.target.value
                      setEmbeddingConfig((prev) => ({ ...prev, apiKey: newApiKey }))
                      setEmbeddingApiKey(newApiKey)
                    }}
                    disabled={disabled || loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embeddingModel">Embedding Model *</Label>
                  <Input
                    id="embeddingModel"
                    placeholder={embeddingConfig.provider === "gemini" ? "e.g., models/text-embedding-004" : embeddingConfig.provider === "openai" ? "e.g., text-embedding-3-small" : "e.g., text-embedding-004"}
                    value={embeddingConfig.model || ""}
                    onChange={(e) => {
                      const newModel = e.target.value
                      setEmbeddingConfig((prev) => ({ ...prev, model: newModel }))
                      setEmbeddingModel(newModel)
                    }}
                    disabled={disabled || loading}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation Summary */}
          {(!apiKey.trim() || !contextColumn.trim()) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fill in all required fields (marked with *) to start auto-labeling.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t">
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
            <p className="text-xs text-center text-muted-foreground mt-2">
              The labeling process will run in the background. Check the Status tab to monitor progress.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

