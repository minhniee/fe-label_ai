"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  BookMarked,
  BookOpen,
  Clock,
  Database,
  DollarSign,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  Zap,
  Plus,
  Edit2,
  X,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import {
  deleteChatMessage,
  getChatHistory,
  getChatbotStatus,
  sendChatMessage,
  switchChatbotDataset,
  getFineTuneStatus,
  triggerFineTuning,
  type FineTuneStatus,
  type SwitchDatasetResponse,
} from "@/app/api/chatbot";
import { getDataset, getDatasets, type Dataset } from "@/app/api/dataset";
import type { ChatHistory } from "@/app/api/chatbot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  text: string;
  type: "user" | "bot";
  timestamp: string;
  context?: string[];
  chatId?: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "chatbot_conversations";

export default function ProjectChatbotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { project } = useProjectFromSlug();
  const projectId = project?.id ? Number(project.id) : null;
  const [datasetId, setDatasetId] = useState<number | null>(project?.dataset_id ?? null);
  const [datasetInfo, setDatasetInfo] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: "-",
    status: "-",
    responseTime: "-",
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isDatasetReloading, setIsDatasetReloading] = useState(false);
  const [fineTuneStatus, setFineTuneStatus] = useState<FineTuneStatus | null>(null);
  const [isLoadingFineTuneStatus, setIsLoadingFineTuneStatus] = useState(false);
  const [isTriggeringFineTune, setIsTriggeringFineTune] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  // Load conversations from localStorage
  useEffect(() => {
    if (projectId) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConversations(parsed);
          if (parsed.length > 0 && !currentConversationId) {
            setCurrentConversationId(parsed[0].id);
          }
        } catch (e) {
          console.error("Failed to load conversations:", e);
        }
      }
    }
  }, [projectId]);

  // Save conversations to localStorage
  useEffect(() => {
    if (projectId && conversations.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${projectId}`, JSON.stringify(conversations));
    }
  }, [conversations, projectId]);

  // Load chat history from API and merge with conversations
  const loadChatHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getChatHistory(100, projectId);
      if (data.chats && data.chats.length > 0) {
        // Calculate average response time from chat history
        const responseTimes = data.chats
          .map((chat: any) => chat.response_time)
          .filter((time: any) => time != null && time > 0);
        
        if (responseTimes.length > 0) {
          const avgResponseTime = (
            responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length
          ).toFixed(2);
          setStats((prev) => ({ ...prev, responseTime: `${avgResponseTime}s` }));
        }
        
        // Group chats into conversations based on time gaps (5 minutes)
        const groupedConversations: Conversation[] = [];
        let currentGroup: ChatHistory[] = [];
        let lastTime: Date | null = null;

        data.chats
          .slice()
          .reverse()
          .forEach((chat: ChatHistory, index: number) => {
            const chatTime = new Date(chat.created_at);
            if (
              lastTime === null ||
              (chatTime.getTime() - lastTime.getTime()) / 1000 / 60 > 5
            ) {
              // Start new conversation
              if (currentGroup.length > 0) {
                const conversationId = `conv-${currentGroup[0].chat_id}`;
                const title = currentGroup[0].query.slice(0, 50) || "New Conversation";
                const messages: Message[] = currentGroup.flatMap((c) => [
                  {
                    id: `user-${c.chat_id}`,
                    text: c.query,
                    type: "user" as const,
                    timestamp: c.created_at,
                    chatId: c.chat_id,
                  },
                  {
                    id: `bot-${c.chat_id}`,
                    text: c.answer,
                    type: "bot" as const,
                    timestamp: c.created_at,
                    chatId: c.chat_id,
                  },
                ]);
                groupedConversations.push({
                  id: conversationId,
                  title,
                  messages,
                  createdAt: currentGroup[0].created_at,
                  updatedAt: currentGroup[currentGroup.length - 1].created_at,
                });
              }
              currentGroup = [chat];
            } else {
              currentGroup.push(chat);
            }
            lastTime = chatTime;
          });

        // Add last group
        if (currentGroup.length > 0) {
          const conversationId = `conv-${currentGroup[0].chat_id}`;
          const title = currentGroup[0].query.slice(0, 50) || "New Conversation";
          const messages: Message[] = currentGroup.flatMap((c) => [
            {
              id: `user-${c.chat_id}`,
              text: c.query,
              type: "user" as const,
              timestamp: c.created_at,
              chatId: c.chat_id,
            },
            {
              id: `bot-${c.chat_id}`,
              text: c.answer,
              type: "bot" as const,
              timestamp: c.created_at,
              chatId: c.chat_id,
            },
          ]);
          groupedConversations.push({
            id: conversationId,
            title,
            messages,
            createdAt: currentGroup[0].created_at,
            updatedAt: currentGroup[currentGroup.length - 1].created_at,
          });
        }

        // Merge with existing conversations (avoid duplicates)
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newConversations = groupedConversations.filter((c) => !existingIds.has(c.id));
          const merged = [...newConversations, ...prev];
          if (merged.length > 0 && !currentConversationId) {
            setCurrentConversationId(merged[0].id);
          }
          return merged;
        });
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, [projectId, currentConversationId]);

  useEffect(() => {
    if (project?.dataset_id) {
      setDatasetId(project.dataset_id);
    }
  }, [project?.dataset_id]);

  const loadDatasets = useCallback(async () => {
    setIsLoadingDatasets(true);
    try {
      const projectIdForFilter = projectId ? Number(projectId) : undefined;
      const datasetsList = await getDatasets(projectIdForFilter);
      setDatasets(datasetsList);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast({
        title: "Error",
        description: "Failed to load datasets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [toast, projectId]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const loadDatasetInfo = useCallback(async () => {
    if (!datasetId) {
      setDatasetInfo(null);
      return;
    }
    try {
      const data = await getDataset(datasetId);
      setDatasetInfo(data);
    } catch (error) {
      console.error("Failed to load dataset info", error);
      setDatasetInfo(null);
    }
  }, [datasetId]);

  useEffect(() => {
    loadDatasetInfo();
  }, [loadDatasetInfo]);

  const loadStats = useCallback(async () => {
    if (!datasetId) {
      setStats((prev) => ({ ...prev, status: "No dataset linked" }));
      return;
    }
    try {
      const data = await getChatbotStatus(datasetId);
      setStats({
        totalQuestions: data.total_questions?.toString() || "-",
        status: data.status === "healthy" ? "Ready" : "Error",
        responseTime: "-",
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats((prev) => ({ ...prev, status: "Error" }));
    }
  }, [datasetId]);

  const loadFineTuneStatus = useCallback(async () => {
    if (!datasetId) {
      setFineTuneStatus(null);
      return;
    }
    setIsLoadingFineTuneStatus(true);
    try {
      const status = await getFineTuneStatus(datasetId);
      setFineTuneStatus(status);
    } catch (error) {
      console.error("Error loading fine-tuning status:", error);
      setFineTuneStatus(null);
    } finally {
      setIsLoadingFineTuneStatus(false);
    }
  }, [datasetId]);

  useEffect(() => {
    if (projectId) {
      loadStats();
      loadChatHistory();
      loadFineTuneStatus();
    }
  }, [projectId, loadStats, loadChatHistory, loadFineTuneStatus]);

  // Poll fine-tuning status if there's an active job
  useEffect(() => {
    if (!fineTuneStatus?.active_job) return;

    const interval = setInterval(() => {
      loadFineTuneStatus();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fineTuneStatus?.active_job, loadFineTuneStatus]);

  const reloadDataset = async () => {
    if (!datasetId) return;
    setIsDatasetReloading(true);
    try {
      const response = await switchChatbotDataset(datasetId, { projectId: projectId ?? undefined });
      
      // Show fine-tuning status first if triggered
      if (response.fine_tune_triggered) {
        toast({
          title: "Fine-tuning started automatically",
          description: response.fine_tune_reason || "Fine-tuning job has been started automatically",
        });
      }
      
      // Then show reload success
      toast({
        title: "Dataset reloaded",
        description: `${response.message} (Questions: ${response.total_questions})`,
      });
      
      await loadStats();
      await loadFineTuneStatus();
    } catch (error: any) {
      toast({
        title: "Reload failed",
        description: error.message || "Unable to reload dataset",
        variant: "destructive",
      });
    } finally {
      setIsDatasetReloading(false);
    }
  };

  const handleTriggerFineTune = async () => {
    if (!datasetId) return;
    setIsTriggeringFineTune(true);
    try {
      const response = await triggerFineTuning(datasetId);
      toast({
        title: "Fine-tuning started",
        description: "Fine-tuning job has been started successfully",
      });
      await loadFineTuneStatus();
    } catch (error: any) {
      toast({
        title: "Fine-tuning failed",
        description: error.message || "Unable to start fine-tuning",
        variant: "destructive",
      });
    } finally {
      setIsTriggeringFineTune(false);
    }
  };

  const handleDatasetChange = async (newDatasetId: string) => {
    const id = newDatasetId === "none" ? null : Number(newDatasetId);
    setDatasetId(id);
    if (id) {
      try {
        const data = await getDataset(id);
        setDatasetInfo(data);
        await loadStats();
      } catch (error) {
        console.error("Failed to load dataset info", error);
        setDatasetInfo(null);
      }
    } else {
      setDatasetInfo(null);
      setStats({
        totalQuestions: "-",
        status: "No dataset selected",
        responseTime: "-",
      });
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await deleteChatMessage(chatId);
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.filter((msg) => msg.chatId !== chatId),
        }))
      );
      toast({
        title: "Deleted",
        description: "Message removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to delete message",
        variant: "destructive",
      });
    }
  };

  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConversation: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId);
      if (currentConversationId === conversationId) {
        setCurrentConversationId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setDeletingConversationId(null);
  };

  const updateConversationTitle = (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, title: newTitle.trim() } : c))
    );
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;
    if (!datasetId || !projectId) {
      toast({
        title: "Missing data",
        description: "Please ensure this project has a linked dataset.",
        variant: "destructive",
      });
      return;
    }

    // Create new conversation if none exists
    if (!currentConversationId) {
      createNewConversation();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const conversationId = currentConversationId || `conv-${Date.now()}`;
    setInputValue("");

    // Force scroll to bottom when user sends a message
    setIsUserNearBottom(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message,
      type: "user",
      timestamp: new Date().toISOString(),
    };

    // Update conversation with user message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
            ...conv,
            messages: [...conv.messages, userMessage],
            updatedAt: new Date().toISOString(),
            title: conv.title === "New Conversation" ? message.slice(0, 50) : conv.title,
          }
          : conv
      )
    );

    const loadingId = `loading-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingId,
      text: "",
      type: "bot",
      timestamp: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, loadingMessage] }
          : conv
      )
    );

    setIsLoading(true);
    setStartTime(Date.now());

    try {
      const startTimeForResponse = Date.now();
      const data = await sendChatMessage(message, 3, {
        datasetId,
        projectId,
      });

      // Calculate and update response time
      const responseTime = ((Date.now() - startTimeForResponse) / 1000).toFixed(2);
      setStats((prev) => ({ ...prev, responseTime: `${responseTime}s` }));

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            const filtered = conv.messages.filter((msg) => msg.id !== loadingId);
            return {
              ...conv,
              messages: [
                ...filtered,
                {
                  id: `bot-${Date.now()}`,
                  text: data.answer,
                  type: "bot",
                  timestamp: new Date().toISOString(),
                  context: data.context,
                },
              ],
              updatedAt: new Date().toISOString(),
            };
          }
          return conv;
        })
      );
    } catch (error: any) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            const filtered = conv.messages.filter((msg) => msg.id !== loadingId);
            return {
              ...conv,
              messages: [
                ...filtered,
                {
                  id: `error-${Date.now()}`,
                  text: "Sorry, something went wrong. Please try again.",
                  type: "bot",
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }
          return conv;
        })
      );
      toast({
        title: "Error",
        description: error.message || "Unable to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setStartTime(null);
    }
  };

  const handleExampleQuestion = (question: string) => {
    setInputValue(question);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const currentMessages = currentConversation?.messages || [];

  // Check if user is near bottom of scroll container
  const checkIfNearBottom = useCallback(() => {
    if (!scrollViewportRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    const threshold = 200; // 200px from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsUserNearBottom(isNearBottom);
    return isNearBottom;
  }, []);

  // Handle scroll events to track user position
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      checkIfNearBottom();
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [checkIfNearBottom]);

  // Auto-scroll to bottom when conversation changes (always scroll to bottom when switching conversations)
  useEffect(() => {
    if (messagesEndRef.current && currentConversationId) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
          setIsUserNearBottom(true);
        }
      }, 100);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom only if user is near bottom or when loading (new message being sent)
  useEffect(() => {
    if (messagesEndRef.current && (isUserNearBottom || isLoading)) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [currentMessages.length, isLoading, isUserNearBottom]);

  return (
    <div className="flex h-[calc(100vh-4rem-1rem)] overflow-hidden bg-background -m-4">
      {/* Sidebar - Conversations List */}
      <div className="w-64 border-r bg-muted/40 flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <Button
            onClick={createNewConversation}
            className="w-full gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => {
              const isActive = conversation.id === currentConversationId;
              const isEditing = editingConversationId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => {
                    if (!isEditing) {
                      setCurrentConversationId(conversation.id);
                    }
                  }}
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateConversationTitle(conversation.id, editingTitle);
                          } else if (e.key === "Escape") {
                            setEditingConversationId(null);
                            setEditingTitle("");
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateConversationTitle(conversation.id, editingTitle);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConversationId(null);
                          setEditingTitle("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium truncate" title={conversation.title}>
                          {conversation.title.length > 30
                            ? `${conversation.title.slice(0, 30)}...`
                            : conversation.title}
                        </p>
                        <p className="text-xs opacity-70 truncate">
                          {formatDate(conversation.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConversationId(conversation.id);
                            setEditingTitle(conversation.title);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingConversationId(conversation.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Dataset Settings */}
        <div className="p-4 border-t space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Dataset</p>
            <Select
              value={datasetId?.toString() || "none"}
              onValueChange={handleDatasetChange}
              disabled={isLoadingDatasets}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {isLoadingDatasets
                    ? "Loading..."
                    : datasetInfo
                      ? datasetInfo.name
                      : "No dataset"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No dataset</SelectItem>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.dataset_id} value={dataset.dataset_id.toString()}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="w-full gap-1 h-8 text-xs"
            disabled={!datasetId || isDatasetReloading}
            onClick={reloadDataset}
          >
            {isDatasetReloading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Reload Dataset
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Stats */}
        <div className="border-b bg-muted/40 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="w-6 h-6" />
                RAG Chatbot
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Interact with your project&apos;s labeled data
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center min-w-[80px]">
                <div className="text-lg font-bold text-primary flex items-center justify-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>{stats.totalQuestions}</span>
                </div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="text-lg font-bold text-primary flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>{stats.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="text-lg font-bold text-primary flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>{stats.responseTime}</span>
                </div>
                <div className="text-xs text-muted-foreground">Response</div>
              </div>
              
              {/* Fine-Tuning Status */}
              {datasetId && (
                <div className="text-center min-w-[80px]">
                  <div className="text-lg font-bold text-primary flex items-center justify-center gap-2">
                    {isLoadingFineTuneStatus ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : fineTuneStatus?.active_job ? (
                      <Activity className="w-4 h-4 text-blue-500" />
                    ) : fineTuneStatus?.has_model ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {isLoadingFineTuneStatus ? (
                        "Loading"
                      ) : fineTuneStatus?.active_job ? (
                        fineTuneStatus.active_job.status === "running" ? "Training" : 
                        fineTuneStatus.active_job.status === "pending" ? "Queued" :
                        fineTuneStatus.active_job.status === "validating_files" ? "Validating" :
                        fineTuneStatus.active_job.status
                      ) : fineTuneStatus?.has_model ? (
                        "Ready"
                      ) : (
                        "No model"
                      )}
                    </span>
                    {fineTuneStatus?.active_job?.status === "running" && (
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Fine-Tuning</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Fine-Tuning Details (Error messages, action buttons, etc.) */}
          {datasetId && fineTuneStatus && (
            <div className="mt-2 space-y-1">
              {/* Action buttons */}
              {((fineTuneStatus?.needs_refresh && !fineTuneStatus?.active_job) || fineTuneStatus?.latest_job?.status === "failed") && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleTriggerFineTune}
                    disabled={isTriggeringFineTune}
                  >
                    {isTriggeringFineTune ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Starting...
                      </>
                    ) : fineTuneStatus?.latest_job?.status === "failed" ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Fine-Tuning
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Re-Fine-Tune
                      </>
                    )}
                  </Button>
                  {fineTuneStatus?.refresh_reason && (
                    <span className="text-xs text-muted-foreground">
                      {fineTuneStatus.refresh_reason}
                    </span>
                  )}
                </div>
              )}
              {/* Error messages */}
              {fineTuneStatus?.latest_job?.error_message && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  Error: {fineTuneStatus.latest_job.error_message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div
          ref={scrollViewportRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {currentMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Start a conversation</p>
                <p className="text-sm">Ask a question about this project or select an example above.</p>
              </div>
            ) : (
              <>
                {currentMessages.map((message, index) => {
                  const showDate =
                    index === 0 ||
                    new Date(message.timestamp).toDateString() !==
                    new Date(currentMessages[index - 1].timestamp).toDateString();

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-6">
                          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {formatDate(message.timestamp)}
                          </div>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex animate-in fade-in slide-in-from-bottom-2",
                          message.type === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className="flex flex-col max-w-[80%]">
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-3",
                              message.type === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            )}
                          >
                            {message.id.startsWith("loading") ? (
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
                                <span className="w-2 h-2 bg-current rounded-full animate-pulse delay-75" />
                                <span className="w-2 h-2 bg-current rounded-full animate-pulse delay-150" />
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{message.text}</div>
                            )}
                            {message.context && message.context.length > 0 && (
                              <div
                                className={cn(
                                  "text-xs opacity-75 mt-2 pt-2 border-t flex items-center gap-1",
                                  message.type === "user"
                                    ? "border-white/20"
                                    : "border-border"
                                )}
                              >
                                <BookMarked className="w-3 h-3" />
                                Referencing {message.context.length} source
                                {message.context.length === 1 ? "" : "s"}
                              </div>
                            )}
                          </div>
                          {message.timestamp && !message.id.startsWith("loading") && (
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
                                  className="h-5 px-2 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteChat(message.chatId!)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading || !datasetId}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim() || !datasetId || !projectId}
                size="icon"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Delete Conversation Dialog */}
      <AlertDialog
        open={deletingConversationId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingConversationId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingConversationId) {
                  deleteConversation(deletingConversationId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}