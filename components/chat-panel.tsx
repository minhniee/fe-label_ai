"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, X, Users, Hash, Plus, Search, MoreVertical, Phone, Video, Paperclip, Smile } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface ChatPanelProps {
  onClose: () => void
}

interface Message {
  id: number
  sender: string
  avatar: string
  content: string
  timestamp: string
  type: "text" | "file" | "system"
  isOwn?: boolean
}

interface Channel {
  id: string
  name: string
  type: "channel" | "direct"
  unreadCount: number
  lastMessage: string
  lastActivity: string
  members?: number
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [activeChannel, setActiveChannel] = useState("general")
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const channels: Channel[] = [
    {
      id: "general",
      name: "Tổng quát",
      type: "channel",
      unreadCount: 3,
      lastMessage: "Nguyễn Văn A: Đã hoàn thành batch A1",
      lastActivity: "2 phút trước",
      members: 12,
    },
    {
      id: "labeling-team",
      name: "Nhóm gán nhãn",
      type: "channel",
      unreadCount: 1,
      lastMessage: "Trần Thị B: Cần hỗ trợ với batch B2",
      lastActivity: "5 phút trước",
      members: 8,
    },
    {
      id: "quality-check",
      name: "Kiểm tra chất lượng",
      type: "channel",
      unreadCount: 0,
      lastMessage: "Lê Văn C: Báo cáo tuần đã sẵn sàng",
      lastActivity: "1 giờ trước",
      members: 5,
    },
    {
      id: "admin-nguyen",
      name: "Nguyễn Văn Admin",
      type: "direct",
      unreadCount: 2,
      lastMessage: "Bạn có thể kiểm tra batch mới không?",
      lastActivity: "10 phút trước",
    },
  ]

  const messages: Message[] = [
    {
      id: 1,
      sender: "Nguyễn Văn Admin",
      avatar: "/avatars/admin.jpg",
      content: "Chào mọi người! Chúng ta có batch mới cần gán nhãn. Ai rảnh có thể nhận không?",
      timestamp: "09:30",
      type: "text",
    },
    {
      id: 2,
      sender: "Trần Thị B",
      avatar: "/avatars/user-b.jpg",
      content: "Em có thể nhận batch nhỏ được ạ. Hiện tại em đang làm batch C1.",
      timestamp: "09:32",
      type: "text",
    },
    {
      id: 3,
      sender: "Bạn",
      avatar: "/avatars/you.jpg",
      content: "Anh có thể giao cho em batch A1 được không ạ? Em vừa hoàn thành batch trước.",
      timestamp: "09:35",
      type: "text",
      isOwn: true,
    },
    {
      id: 4,
      sender: "Nguyễn Văn Admin",
      avatar: "/avatars/admin.jpg",
      content: "Tốt! Em sẽ được giao batch A1 - 250 câu hỏi. Hạn hoàn thành là 15/01.",
      timestamp: "09:36",
      type: "text",
    },
    {
      id: 5,
      sender: "Lê Văn C",
      avatar: "/avatars/user-c.jpg",
      content: "Mọi người nhớ kiểm tra kỹ trước khi submit nhé. Tuần trước có vài lỗi nhỏ.",
      timestamp: "09:40",
      type: "text",
    },
  ]

  const onlineUsers = [
    { name: "Nguyễn Văn Admin", status: "online", role: "Admin" },
    { name: "Trần Thị B", status: "online", role: "Labeler" },
    { name: "Lê Văn C", status: "away", role: "Senior Labeler" },
    { name: "Phạm Thị D", status: "offline", role: "Labeler" },
  ]

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle sending message
      toast({
        title: "Message Sent",
        description: `Message sent to #${activeChannel}`,
      })
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const filteredChannels = channels.filter((channel) => channel.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">
              {channels.find((c) => c.id === activeChannel)?.name || "Chat"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Thông tin kênh</DropdownMenuItem>
                <DropdownMenuItem>Tìm kiếm tin nhắn</DropdownMenuItem>
                <DropdownMenuItem>Cài đặt thông báo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="channels">Kênh</TabsTrigger>
            <TabsTrigger value="users">Người dùng</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={msg.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${msg.isOwn ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{msg.sender}</span>
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    </div>
                    <div
                      className={`inline-block p-3 rounded-lg max-w-xs ${
                        msg.isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pr-10"
                  />
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="channels" className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm kênh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeChannel === channel.id ? "bg-blue-100 border-blue-200" : "hover:bg-gray-100"
                    }`}
                    onClick={() => setActiveChannel(channel.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {channel.type === "channel" ? (
                          <Hash className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Users className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">{channel.name}</span>
                        {channel.members && <span className="text-xs text-gray-500">({channel.members})</span>}
                      </div>
                      {channel.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">{channel.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{channel.lastMessage}</p>
                    <p className="text-xs text-gray-400">{channel.lastActivity}</p>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4 bg-transparent" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Tạo kênh mới
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-3">
                Người dùng trực tuyến ({onlineUsers.filter((u) => u.status === "online").length})
              </h4>

              <div className="space-y-3">
                {onlineUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
