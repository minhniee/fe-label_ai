"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Save, SkipForward, ArrowLeft, Clock, User, FileText, Keyboard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Question {
  id: string
  studentId: string
  studentName: string
  email: string
  phone: string
  program: string
  gpa: number
  essay: string
  extracurricular: string[]
  submissionDate: string
  currentLabel?: string
  notes?: string
}

interface LabelOption {
  id: string
  label: string
  description: string
  hotkey: string
  color: string
}

export function LabelingInterface() {
  const { toast } = useToast()
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [progress, setProgress] = useState({ current: 1, total: 0, completed: 0 })

  const labelOptions: LabelOption[] = [
    {
      id: "high_potential",
      label: "High Potential",
      description: "Candidate has high potential, suitable for the program",
      hotkey: "1",
      color: "bg-green-100 text-green-800",
    },
    {
      id: "medium_potential",
      label: "Medium Potential",
      description: "Candidate has medium potential, needs further consideration",
      hotkey: "2",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      id: "low_potential",
      label: "Low Potential",
      description: "Candidate has low potential, not suitable",
      hotkey: "3",
      color: "bg-red-100 text-red-800",
    },
    {
      id: "needs_review",
      label: "Needs Review",
      description: "Needs additional information or expert evaluation",
      hotkey: "4",
      color: "bg-blue-100 text-blue-800",
    },
  ]

  // Load current question from API
  useEffect(() => {
    // TODO: Load current question from API
    // setCurrentQuestion(questionData)
  }, [])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const option = labelOptions.find((opt) => opt.hotkey === event.key)
      if (option) {
        setSelectedLabel(option.id)
      } else if (event.key === "Enter" && event.ctrlKey) {
        handleSave()
      } else if (event.key === "ArrowRight" && event.ctrlKey) {
        handleNext()
      } else if (event.key === "ArrowLeft" && event.ctrlKey) {
        handlePrevious()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [selectedLabel])

  const handleSave = () => {
    if (!selectedLabel) return

    // TODO: Implement save logic
    toast({
      title: "Label Saved",
      description: `Question ${currentQuestion?.id} labeled as ${selectedLabel}`,
    })

    // Move to next question
    handleNext()
  }

  const handleNext = () => {
    // TODO: Load next question
    setProgress((prev) => ({ ...prev, current: prev.current + 1, completed: prev.completed + 1 }))
    setSelectedLabel("")
    setNotes("")
  }

  const handlePrevious = () => {
    // TODO: Load previous question
    setProgress((prev) => ({ ...prev, current: Math.max(1, prev.current - 1) }))
  }

  const handleSkip = () => {
    // TODO: Skip current question
    setProgress((prev) => ({ ...prev, current: prev.current + 1 }))
    setSelectedLabel("")
    setNotes("")
  }

  if (!currentQuestion) {
    return <div>Loading...</div>
  }

  const progressPercentage = (progress.completed / progress.total) * 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Question Details - Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Progress Bar */}
        <Card className="bg-white/90">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Labeling progress</span>
                </div>
                <Badge variant="outline">
                  {progress.current} / {progress.total}
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Completed: {progress.completed.toLocaleString()}</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Information */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate information
            </CardTitle>
            <CardDescription>ID: {currentQuestion.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Student ID</Label>
                <p className="font-medium">{currentQuestion.studentId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Full name</Label>
                <p className="font-medium">{currentQuestion.studentName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-muted-foreground">{currentQuestion.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone number</Label>
                <p className="text-muted-foreground">{currentQuestion.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Major</Label>
                <p className="font-medium">{currentQuestion.program}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">GPA</Label>
                <p className="font-medium text-primary">{currentQuestion.gpa}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Essay */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Motivation essay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm leading-relaxed">{currentQuestion.essay}</p>
            </div>
          </CardContent>
        </Card>

        {/* Extracurricular Activities */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Extracurricular activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.extracurricular.map((activity, index) => (
                <Badge key={index} variant="secondary">
                  {activity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labeling Panel - Right Column */}
      <div className="space-y-6">
        {/* Label Selection */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Labeling</CardTitle>
            <CardDescription>Select appropriate labels for this candidate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedLabel} onValueChange={setSelectedLabel}>
              {labelOptions.map((option) => (
                <div key={option.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50">
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={option.id} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {option.hotkey}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Add notes for labeling decision (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter notes about the reason for this label..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Hotkeys Guide */}
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Hotkeys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs space-y-1">
              {labelOptions.map((option) => (
                <div key={option.id} className="flex justify-between">
                  <span>{option.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {option.hotkey}
                  </Badge>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span>Save & Next</span>
                  <Badge variant="outline" className="text-xs">
                    Ctrl+Enter
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Previous</span>
                  <Badge variant="outline" className="text-xs">
                    Ctrl+←
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Next</span>
                  <Badge variant="outline" className="text-xs">
                    Ctrl+→
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleSave} disabled={!selectedLabel} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save & Next
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={progress.current === 1}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button variant="outline" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
