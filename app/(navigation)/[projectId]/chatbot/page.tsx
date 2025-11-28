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
  Upload,
  User,
  Zap,
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
} from "@/app/api/chatbot";
import { getDataset, getDatasets, uploadFileToDataset, type Dataset } from "@/app/api/dataset";
import type { ChatHistory } from "@/app/api/chatbot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  text: string;
  type: "user" | "bot";
  timestamp: string;
  context?: string[];
  chatId?: number;
}

export default function ProjectChatbotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { project } = useProjectFromSlug();
  const projectId = project?.id ? Number(project.id) : null;
  const [datasetId, setDatasetId] = useState<number | null>(project?.dataset_id ?? null);
  const [datasetInfo, setDatasetInfo] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: "-",
    status: "-",
    responseTime: "-",
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isDatasetReloading, setIsDatasetReloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project?.dataset_id) {
      setDatasetId(project.dataset_id);
    }
  }, [project?.dataset_id]);

  const loadDatasets = useCallback(async () => {
    setIsLoadingDatasets(true);
    try {
      const datasetsList = await getDatasets();
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
  }, [toast]);

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

  const loadChatHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getChatHistory(20, projectId);
      if (data.chats && data.chats.length > 0) {
        const historyMessages: Message[] = [];
        data.chats
          .slice()
          .reverse()
          .forEach((chat: ChatHistory) => {
            historyMessages.push({
              id: `user-${chat.chat_id}`,
              text: chat.query,
              type: "user",
              timestamp: chat.created_at,
              chatId: chat.chat_id,
            });
            historyMessages.push({
              id: `bot-${chat.chat_id}`,
              text: chat.answer,
              type: "bot",
              timestamp: chat.created_at,
              chatId: chat.chat_id,
            });
          });
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, [projectId]);

  const reloadDataset = async () => {
    if (!datasetId) return;
    setIsDatasetReloading(true);
    try {
      const response = await switchChatbotDataset(datasetId, { projectId: projectId ?? undefined });
      toast({
        title: "Dataset reloaded",
        description: `${response.message} (Questions: ${response.total_questions})`,
      });
      await loadStats();
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

  const handleDatasetFileUpload = async (file: File | null) => {
    if (!file || !datasetId) return;
    setIsUploading(true);
    try {
      await uploadFileToDataset(datasetId, file, "text");
      toast({
        title: "Upload successful",
        description: `Added "${file.name}". Click Reload for the chatbot to refresh.`,
      });
      await loadDatasetInfo();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Unable to upload data to the dataset",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }
    try {
      await deleteChatMessage(chatId);
      setMessages((prev) => prev.filter((msg) => msg.chatId !== chatId));
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

    setInputValue("");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message,
      type: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const loadingId = `loading-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingId,
      text: "",
      type: "bot",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, loadingMessage]);

    setIsLoading(true);
    setStartTime(Date.now());

    try {
      const data = await sendChatMessage(message, 3, {
        datasetId,
        projectId,
      });

      if (startTime) {
        const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
        setStats((prev) => ({ ...prev, responseTime: `${responseTime}s` }));
      }

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingId);
        return [
          ...filtered,
          {
            id: `bot-${Date.now()}`,
            text: data.answer,
            type: "bot",
            timestamp: new Date().toISOString(),
            context: data.context,
          },
        ];
      });
    } catch (error: any) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingId);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            text: "Sorry, something went wrong. Please try again.",
            type: "bot",
            timestamp: new Date().toISOString(),
          },
        ];
      });
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (projectId) {
      loadStats();
      loadChatHistory();
    }
  }, [projectId, loadStats, loadChatHistory]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7" />
          RAG Chatbot
        </h1>
        <p className="text-muted-foreground">
          Interact with your project&apos;s labeled data in a conversational workflow.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-220px)] overflow-hidden">
        <div className="bg-muted/40 p-4 border-b flex justify-around flex-wrap gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-primary flex items-center justify-center gap-2">
              <Database className="w-4 h-4" />
              <span>{stats.totalQuestions}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              <span>{stats.status}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Status</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{stats.responseTime}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Response time</div>
          </div>
        </div>

        <div className="p-4 border-b bg-muted/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Database className="w-4 h-4" />
                Select Dataset
              </p>
              <Select
                value={datasetId?.toString() || "none"}
                onValueChange={handleDatasetChange}
                disabled={isLoadingDatasets}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a dataset">
                    {isLoadingDatasets
                      ? "Loading datasets..."
                      : datasetInfo
                      ? `${datasetInfo.name}${datasetInfo.description ? ` - ${datasetInfo.description}` : ""}`
                      : "No dataset selected"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dataset</SelectItem>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.dataset_id} value={dataset.dataset_id.toString()}>
                      {dataset.name}
                      {dataset.description && ` - ${dataset.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {datasetInfo && (
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(datasetInfo.created_at).toLocaleDateString()} by {datasetInfo.created_by_username}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  className="hidden"
                  disabled={!datasetId || isUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    handleDatasetFileUpload(file);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!datasetId || isUploading}
                  onClick={() => uploadInputRef.current?.click()}
                  className="gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload CSV/TXT
                    </>
                  )}
                </Button>
              </label>
              <Button
                size="sm"
                className="gap-2"
                disabled={!datasetId || isDatasetReloading}
                onClick={reloadDataset}
              >
                {isDatasetReloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Reloading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reload Dataset
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 flex-wrap border-b bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("What is the overview of this project?")}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Overview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("Which items have already been completed?")}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Progress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExampleQuestion("Are there any notes for labeling this dataset?")}
            className="gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Labeling notes
          </Button>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 bg-background space-y-5">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Hello! Ask a question about this project.</p>
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
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-card-foreground rounded-bl-sm shadow-sm"
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
                        Referencing {message.context.length} dataset source{message.context.length === 1 ? "" : "s"}
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

        <div className="p-5 bg-white border-t flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your question..."
            className="flex-1"
            disabled={isLoading || !datasetId}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim() || !datasetId || !projectId}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}


