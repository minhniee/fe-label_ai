"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Bot, 
  User, 
  Send, 
  Database, 
  Activity, 
  Zap, 
  BookOpen, 
  Clock, 
  DollarSign,
  ChevronDown,
  RefreshCw,
  Trash2,
  MessageCircle,
  BookMarked
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  getChatbotStatus, 
  sendChatMessage, 
  getChatbotDatasets, 
  switchChatbotDataset,
  getChatHistory,
  deleteChatMessage,
  type ChatbotDataset,
  type ChatHistory
} from "@/app/api/chatbot"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Message {
  id: string
  text: string
  type: "user" | "bot"
  timestamp: string
  context?: string[]
  chatId?: number
}

export default function ChatbotPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalQuestions: "-",
    status: "-",
    responseTime: "-"
  })
  const [datasetsOpen, setDatasetsOpen] = useState(false)
  const [datasets, setDatasets] = useState<ChatbotDataset[]>([])
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await getChatbotStatus()
      setStats({
        totalQuestions: data.total_questions?.toString() || "-",
        status: data.status === "healthy" ? "Sẵn sàng" : "Lỗi",
        responseTime: stats.responseTime
      })
    } catch (error) {
      console.error("Error loading stats:", error)
      setStats(prev => ({ ...prev, status: "Lỗi" }))
    }
  }, [stats.responseTime])

  // Load datasets
  const loadDatasets = useCallback(async () => {
    setIsLoadingDatasets(true)
    try {
      const data = await getChatbotDatasets()
      setDatasets(data.datasets || [])
    } catch (error) {
      console.error("Error loading datasets:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách datasets",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDatasets(false)
    }
  }, [toast])

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    try {
      const data = await getChatHistory(20)
      if (data.chats && data.chats.length > 0) {
        const historyMessages: Message[] = []
        data.chats.reverse().forEach((chat: ChatHistory) => {
          historyMessages.push({
            id: `user-${chat.chat_id}`,
            text: chat.query,
            type: "user",
            timestamp: chat.created_at,
            chatId: chat.chat_id
          })
          historyMessages.push({
            id: `bot-${chat.chat_id}`,
            text: chat.answer,
            type: "bot",
            timestamp: chat.created_at,
            chatId: chat.chat_id
          })
        })
        setMessages(historyMessages)
      }
    } catch (error) {
      console.error("Error loading chat history:", error)
    }
  }, [])

  // Switch dataset
  const handleSwitchDataset = async (datasetId: number) => {
    if (!confirm(`Bạn có chắc muốn chuyển sang dataset ID ${datasetId}?\n\nChatbot sẽ reload dữ liệu.`)) {
      return
    }

    try {
      const data = await switchChatbotDataset(datasetId)
      toast({
        title: "Thành công",
        description: `${data.message}\nSố câu hỏi: ${data.total_questions}`,
      })
      loadStats()
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể chuyển dataset",
        variant: "destructive",
      })
    }
  }

  // Delete chat
  const handleDeleteChat = async (chatId: number) => {
    if (!confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
      return
    }

    try {
      await deleteChatMessage(chatId)
      setMessages(prev => prev.filter(msg => msg.chatId !== chatId))
      toast({
        title: "Đã xóa",
        description: "Tin nhắn đã được xóa",
      })
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa tin nhắn",
        variant: "destructive",
      })
    }
  }

  // Send message
  const handleSendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    // Clear input
    setInputValue("")

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message,
      type: "user",
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    // Add loading message
    const loadingId = `loading-${Date.now()}`
    const loadingMessage: Message = {
      id: loadingId,
      text: "",
      type: "bot",
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, loadingMessage])

    setIsLoading(true)
    setStartTime(Date.now())

    try {
      const data = await sendChatMessage(message, 2)
      
      // Calculate response time
      if (startTime) {
        const responseTime = ((Date.now() - startTime) / 1000).toFixed(2)
        setStats(prev => ({ ...prev, responseTime: `${responseTime}s` }))
      }

      // Remove loading message and add bot response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId)
        return [...filtered, {
          id: `bot-${Date.now()}`,
          text: data.answer,
          type: "bot",
          timestamp: new Date().toISOString(),
          context: data.context
        }]
      })
    } catch (error: any) {
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId)
        return [...filtered, {
          id: `error-${Date.now()}`,
          text: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
          type: "bot",
          timestamp: new Date().toISOString()
        }]
      })
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi tin nhắn",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setStartTime(null)
    }
  }

  // Handle example question
  const handleExampleQuestion = (question: string) => {
    setInputValue(question)
  }

  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Load data on mount
  useEffect(() => {
    loadStats()
    loadChatHistory()
  }, [loadStats, loadChatHistory])

  // Load datasets when panel opens
  useEffect(() => {
    if (datasetsOpen) {
      loadDatasets()
    }
  }, [datasetsOpen, loadDatasets])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 p-5 flex items-center justify-center">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 text-center">
          <h1 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
            <Bot className="w-8 h-8" />
            RAG Chatbot - FPT University
          </h1>
          <p className="text-sm opacity-90">Hỏi đáp về Đại học FPT với AI</p>
        </div>

        {/* Stats */}
        <div className="bg-muted/50 p-4 border-b flex justify-around flex-wrap gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 flex items-center justify-center gap-2">
              <Database className="w-4 h-4" />
              <span>{stats.totalQuestions}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Câu hỏi</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              <span>{stats.status}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Trạng thái</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{stats.responseTime}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Thời gian phản hồi</div>
          </div>
        </div>

        {/* Datasets Panel */}
        <div className="text-center p-2 bg-muted/50 border-b">
          <Collapsible open={datasetsOpen} onOpenChange={setDatasetsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Database className="w-4 h-4" />
                <span>{datasetsOpen ? "Ẩn datasets" : "Xem datasets"}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", datasetsOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 max-h-[300px] overflow-y-auto">
                {isLoadingDatasets ? (
                  <div className="text-center text-muted-foreground py-4">Đang tải...</div>
                ) : datasets.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    Chưa có dataset nào trong database
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-semibold text-purple-600 mb-3 text-sm flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Datasets từ Database
                    </div>
                    {datasets.map((dataset) => (
                      <Card key={dataset.dataset_id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2">
                              <Database className="w-4 h-4" />
                              {dataset.name}
                            </div>
                            {dataset.description && (
                              <div className="text-xs text-muted-foreground mt-1 ml-6">
                                {dataset.description}
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2 ml-6">
                              <span>{dataset.dataset_type}</span>
                              <span>{dataset.status}</span>
                              <span>{new Date(dataset.created_at).toLocaleDateString("vi-VN")}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSwitchDataset(dataset.dataset_id)}
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Dùng
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Example Questions */}
        <div className="flex gap-2 p-4 flex-wrap bg-muted/30 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("Đại học FPT có những ngành học nào?")}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Các ngành học
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("Sinh viên đến muộn bao lâu thì không được dự thi?")}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Quy chế thi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("Học phí môn AI là bao nhiêu?")}
            className="gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Học phí
          </Button>
        </div>

        {/* Chat Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 bg-muted/30 space-y-5"
        >
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Chào bạn! Hãy đặt câu hỏi về Đại học FPT</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                  message.type === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === "user"
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : "bg-gradient-to-r from-pink-400 to-pink-500"
                  )}
                >
                  {message.type === "user" ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col max-w-[70%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      message.type === "user"
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-sm"
                        : "bg-white text-foreground rounded-bl-sm shadow-sm"
                    )}
                  >
                    {message.id.startsWith("loading") ? (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150" />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{message.text}</div>
                    )}
                    {message.context && message.context.length > 0 && (
                      <div className="text-xs opacity-75 mt-2 pt-2 border-t border-white/20 flex items-center gap-1">
                        <BookMarked className="w-3 h-3" />
                        Tham khảo {message.context.length} nguồn từ dataset
                      </div>
                    )}
                  </div>
                  {message.timestamp && (
                    <div
                      className={cn(
                        "text-xs text-muted-foreground mt-1 flex items-center gap-2",
                        message.type === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <span>{formatTime(message.timestamp)}</span>
                      {message.chatId && message.type === "bot" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteChat(message.chatId!)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Container */}
        <div className="p-5 bg-white border-t flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gửi
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

