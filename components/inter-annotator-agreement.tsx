"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, XCircle, Users, Eye, ThumbsUp, Clock, TrendingUp } from "lucide-react"

interface Disagreement {
  id: string
  questionId: string
  questionText: string
  annotator1: string
  annotator1Label: string
  annotator2: string
  annotator2Label: string
  batchName: string
  status: "pending" | "resolved" | "escalated"
  resolvedBy?: string
  finalLabel?: string
  resolvedDate?: string
  confidence1: number
  confidence2: number
}

interface AgreementStats {
  batchId: string
  batchName: string
  totalQuestions: number
  agreedQuestions: number
  disagreedQuestions: number
  agreementRate: number
  kappaScore: number
  annotator1: string
  annotator2: string
}

export function InterAnnotatorAgreement() {
  const [disagreements, setDisagreements] = useState<Disagreement[]>([
    {
      id: "1",
      questionId: "Q001",
      questionText: "Học sinh có điểm thi đại học cao và có nhiều hoạt động ngoại khóa...",
      annotator1: "Nguyễn Thị Lan",
      annotator1Label: "Đậu",
      annotator2: "Trần Văn Minh",
      annotator2Label: "Rớt",
      batchName: "Batch 001 - Hồ sơ tuyển sinh 2024",
      status: "pending",
      confidence1: 85,
      confidence2: 78,
    },
    {
      id: "2",
      questionId: "Q045",
      questionText: "Học sinh có điểm trung bình khá nhưng thiếu hoạt động xã hội...",
      annotator1: "Nguyễn Thị Lan",
      annotator1Label: "Rớt",
      annotator2: "Trần Văn Minh",
      annotator2Label: "Đậu",
      batchName: "Batch 001 - Hồ sơ tuyển sinh 2024",
      status: "resolved",
      resolvedBy: "Admin",
      finalLabel: "Rớt",
      resolvedDate: "2024-01-14",
      confidence1: 72,
      confidence2: 68,
    },
    {
      id: "3",
      questionId: "Q078",
      questionText: "Học sinh có thành tích học tập xuất sắc và giải thưởng quốc gia...",
      annotator1: "Lê Thị Hoa",
      annotator1Label: "Đậu",
      annotator2: "Phạm Văn Đức",
      annotator2Label: "Có điều kiện",
      batchName: "Batch 002 - Hồ sơ kỹ thuật",
      status: "escalated",
      confidence1: 92,
      confidence2: 85,
    },
  ])

  const [agreementStats] = useState<AgreementStats[]>([
    {
      batchId: "1",
      batchName: "Batch 001 - Hồ sơ tuyển sinh 2024",
      totalQuestions: 1000,
      agreedQuestions: 847,
      disagreedQuestions: 153,
      agreementRate: 84.7,
      kappaScore: 0.78,
      annotator1: "Nguyễn Thị Lan",
      annotator2: "Trần Văn Minh",
    },
    {
      batchId: "2",
      batchName: "Batch 002 - Hồ sơ kỹ thuật",
      totalQuestions: 800,
      agreedQuestions: 720,
      disagreedQuestions: 80,
      agreementRate: 90.0,
      kappaScore: 0.85,
      annotator1: "Lê Thị Hoa",
      annotator2: "Phạm Văn Đức",
    },
  ])

  const [selectedDisagreement, setSelectedDisagreement] = useState<Disagreement | null>(null)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [finalLabel, setFinalLabel] = useState("")

  const handleResolveDisagreement = () => {
    if (!selectedDisagreement || !finalLabel) return

    setDisagreements(
      disagreements.map((d) =>
        d.id === selectedDisagreement.id
          ? {
              ...d,
              status: "resolved",
              resolvedBy: "Admin",
              finalLabel,
              resolvedDate: new Date().toISOString().split("T")[0],
            }
          : d,
      ),
    )

    setIsResolveDialogOpen(false)
    setSelectedDisagreement(null)
    setFinalLabel("")
  }

  const openResolveDialog = (disagreement: Disagreement) => {
    setSelectedDisagreement(disagreement)
    setIsResolveDialogOpen(true)
  }

  const getStatusBadge = (status: Disagreement["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        )
      case "escalated":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Needs review
          </Badge>
        )
    }
  }

  const getAgreementColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getKappaInterpretation = (kappa: number) => {
    if (kappa >= 0.8) return { text: "Excellent", color: "text-green-600" }
    if (kappa >= 0.6) return { text: "Good", color: "text-blue-600" }
    if (kappa >= 0.4) return { text: "Average", color: "text-yellow-600" }
    return { text: "Poor", color: "text-red-600" }
  }

  return (
    <div className="space-y-6">
      {/* Agreement Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total disagreements</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disagreements.filter((d) => d.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disagreements.filter((d) => d.status === "resolved").length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agreement rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(agreementStats.reduce((sum, stat) => sum + stat.agreementRate, 0) / agreementStats.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kappa Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(agreementStats.reduce((sum, stat) => sum + stat.kappaScore, 0) / agreementStats.length).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="disagreements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="disagreements">Disagreements</TabsTrigger>
          <TabsTrigger value="statistics">Agreement statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="disagreements" className="space-y-6">
          <Card className=" ">
            <CardHeader>
              <CardTitle>Disagreement list in labeling</CardTitle>
              <CardDescription>
                Review and resolve cases where annotators disagree
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Annotator 1</TableHead>
                    <TableHead>Annotator 2</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disagreements.map((disagreement) => (
                    <TableRow key={disagreement.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium text-sm">{disagreement.questionId}</div>
                          <div className="text-xs text-muted-foreground truncate">{disagreement.questionText}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{disagreement.annotator1}</div>
                          <Badge
                            variant={disagreement.annotator1Label === "Đậu" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {disagreement.annotator1Label}
                          </Badge>
                          <div className="text-xs text-muted-foreground">Confidence: {disagreement.confidence1}%</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{disagreement.annotator2}</div>
                          <Badge
                            variant={disagreement.annotator2Label === "Đậu" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {disagreement.annotator2Label}
                          </Badge>
                          <div className="text-xs text-muted-foreground">Confidence: {disagreement.confidence2}%</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{disagreement.batchName}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(disagreement.status)}</TableCell>
                      <TableCell>
                        {disagreement.status === "pending" && (
                          <Button size="sm" onClick={() => openResolveDialog(disagreement)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
                        {disagreement.status === "resolved" && (
                          <div className="text-xs text-muted-foreground">
                            <div>
                              Result: <strong>{disagreement.finalLabel}</strong>
                            </div>
                            <div>By: {disagreement.resolvedBy}</div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <Card className=" ">
            <CardHeader>
              <CardTitle>Agreement statistics by batch</CardTitle>
              <CardDescription>Analyze agreement level between annotators per batch</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Annotator</TableHead>
                    <TableHead>Total questions</TableHead>
                    <TableHead>Agreed</TableHead>
                    <TableHead>Disagreed</TableHead>
                    <TableHead>Agreement rate</TableHead>
                    <TableHead>Kappa Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreementStats.map((stat) => (
                    <TableRow key={stat.batchId}>
                      <TableCell>
                        <div className="font-medium">{stat.batchName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{stat.annotator1}</div>
                          <div className="text-sm">{stat.annotator2}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stat.totalQuestions.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{stat.agreedQuestions.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{stat.disagreedQuestions.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getAgreementColor(stat.agreementRate)}`}>
                          {stat.agreementRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{stat.kappaScore.toFixed(2)}</span>
                          <Badge variant="outline" className={getKappaInterpretation(stat.kappaScore).color}>
                            {getKappaInterpretation(stat.kappaScore).text}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Disagreement Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resolve labeling disagreement</DialogTitle>
            <DialogDescription>Review details and make the final decision for this question</DialogDescription>
          </DialogHeader>
          {selectedDisagreement && (
            <div className="space-y-6">
              {/* Question Details */}
              <Card className=" ">
                <CardHeader>
                  <CardTitle className="text-lg">Question details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Question ID</Label>
                      <div className="text-sm">{selectedDisagreement.questionId}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Nội dung</Label>
                      <div className="text-sm bg-gray-50 p-3 rounded-md">{selectedDisagreement.questionText}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Annotations Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <Card className=" ">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {selectedDisagreement.annotator1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Nhãn:</Label>
                        <Badge variant={selectedDisagreement.annotator1Label === "Đậu" ? "default" : "secondary"}>
                          {selectedDisagreement.annotator1Label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Độ tin cậy:</Label>
                        <span className="font-medium">{selectedDisagreement.confidence1}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className=" ">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {selectedDisagreement.annotator2}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Nhãn:</Label>
                        <Badge variant={selectedDisagreement.annotator2Label === "Đậu" ? "default" : "secondary"}>
                          {selectedDisagreement.annotator2Label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Độ tin cậy:</Label>
                        <span className="font-medium">{selectedDisagreement.confidence2}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Final Decision */}
              <Card className=" ">
                <CardHeader>
                  <CardTitle className="text-base">Quyết định cuối cùng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="final-label">Chọn nhãn cuối cùng</Label>
                      <Select value={finalLabel} onValueChange={setFinalLabel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhãn cuối cùng" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Đậu">Đậu</SelectItem>
                          <SelectItem value="Rớt">Rớt</SelectItem>
                          <SelectItem value="Có điều kiện">Có điều kiện</SelectItem>
                          <SelectItem value="Cần xem xét thêm">Cần xem xét thêm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setFinalLabel(selectedDisagreement.annotator1Label)}
                        className="flex items-center gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Chọn {selectedDisagreement.annotator1}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setFinalLabel(selectedDisagreement.annotator2Label)}
                        className="flex items-center gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Chọn {selectedDisagreement.annotator2}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleResolveDisagreement} disabled={!finalLabel}>
              Xác nhận quyết định
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
