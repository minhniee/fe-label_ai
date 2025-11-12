"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FilePlus2,
  ImagePlus,
  PenSquare,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface UploadedFile {
  id: string
  name: string
  preview: string
  uploadedAt: string
  annotated: boolean
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: "Admin" | "Labeler" | "Viewer"
  status: "active" | "invited"
  assignedCount: number
}

export default function AnnotateBatchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batchId") ?? ""

  const initialFiles = useMemo<UploadedFile[]>(
    () => [
      {
        id: "f1",
        name: "Screenshot 2025-11-06 143502.png",
        preview: "https://picsum.photos/seed/annotate01/600/400",
        uploadedAt: "Nov 12, 2025",
        annotated: false,
      },
      {
        id: "f2",
        name: "Screenshot 2025-11-05 110223.png",
        preview: "https://picsum.photos/seed/annotate02/600/400",
        uploadedAt: "Nov 12, 2025",
        annotated: true,
      },
      {
        id: "f3",
        name: "Screenshot 2025-11-06 182233.png",
        preview: "https://picsum.photos/seed/annotate03/600/400",
        uploadedAt: "Nov 12, 2025",
        annotated: false,
      },
      {
        id: "f4",
        name: "Screenshot 2025-11-06 190115.png",
        preview: "https://picsum.photos/seed/annotate04/600/400",
        uploadedAt: "Nov 12, 2025",
        annotated: false,
      },
    ],
    []
  )

  const [batchName, setBatchName] = useState(batchId ? `Batch ${batchId}` : "Uploaded Batch")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialFiles)
  const [labelMode, setLabelMode] = useState<"solo" | "team">("solo")
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "tm1",
      name: "Truong Vinh Hao",
      email: "haotvhe172558@fpt.edu.vn",
      role: "Admin",
      status: "active",
      assignedCount: 4,
    },
    {
      id: "tm2",
      name: "Truong Hao",
      email: "haotom03@gmail.com",
      role: "Labeler",
      status: "active",
      assignedCount: 0,
    },
    {
      id: "tm3",
      name: "minhlqhe172558@fpt.edu.vn",
      email: "minhlqhe172558@fpt.edu.vn",
      role: "Viewer",
      status: "invited",
      assignedCount: 0,
    },
  ])
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("Labeler")
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<UploadedFile[]>([])
  const [activeUploadTab, setActiveUploadTab] = useState("all")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const totalSlides = uploadedFiles.length

  const handleUploadSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const mapped = Array.from(files).map<UploadedFile>((file) => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      preview: URL.createObjectURL(file),
      uploadedAt: new Date().toLocaleDateString(),
      annotated: false,
    }))

    setPendingUploads((prev) => [...prev, ...mapped])
  }

  const confirmUpload = () => {
    if (pendingUploads.length === 0) {
      setUploadDialogOpen(false)
      return
    }

    setUploadedFiles((prev) => mappedUnique(prev, pendingUploads))
    setPendingUploads([])
    setUploadDialogOpen(false)
  }

  const mappedUnique = (existing: UploadedFile[], additions: UploadedFile[]) => {
    const existingIds = new Set(existing.map((f) => f.id))
    return [...existing, ...additions.filter((file) => !existingIds.has(file.id))]
  }

  const handleRename = (nextName: string) => {
    setBatchName(nextName.trim() || batchName)
    setRenameDialogOpen(false)
  }

  // Assignment is handled by selecting a member (assign all files to that member)

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) return

    setTeamMembers((prev) => [
      ...prev,
      {
        id: `${newMemberEmail}-${Date.now()}`,
        name: newMemberEmail,
        email: newMemberEmail,
        role: newMemberRole,
        status: "invited",
        assignedCount: 0,
      },
    ])

    setNewMemberEmail("")
    setNewMemberRole("Labeler")
    setShowTeamForm(false)
  }

  const handleStartLabeling = () => {
    router.push("/annotate/job")
  }

  const redistributeAssignments = (memberIds: string[]) => {
    const uniqueIds = Array.from(new Set(memberIds))
    const count = uniqueIds.length
    if (count === 0) {
      setTeamMembers((prev) => prev.map((m) => ({ ...m, assignedCount: 0 })))
      return
    }

    const base = Math.floor(totalSlides / count)
    const remainder = totalSlides % count

    setTeamMembers((prev) =>
      prev.map((member) => {
        const index = uniqueIds.indexOf(member.id)
        if (index === -1) {
          return { ...member, assignedCount: 0 }
        }
        const bonus = index < remainder ? 1 : 0
        return { ...member, assignedCount: base + bonus }
      })
    )
  }

  const filteredPendingUploads = useMemo(() => {
    if (activeUploadTab === "annotated") {
      return pendingUploads.filter((file) => file.annotated)
    }
    if (activeUploadTab === "not-annotated") {
      return pendingUploads.filter((file) => !file.annotated)
    }
    return pendingUploads
  }, [pendingUploads, activeUploadTab])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/annotate">
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{batchName}</h1>
            <p className="text-sm text-muted-foreground">Uploaded {new Date().toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ImagePlus className="mr-2 h-4 w-4" /> Upload More
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop images here or use the buttons below.
                  </p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <Button variant="outline" onClick={() => document.getElementById("upload-files-input")?.click()}>
                      <FilePlus2 className="mr-2 h-4 w-4" /> Select Files
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("upload-folders-input")?.click()}
                    >
                      <FilePlus2 className="mr-2 h-4 w-4" /> Select Folder
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported images: JPG, PNG, BMP, WEBP, AVIF | Supported annotations: JSON, XML, CSV, TXT, etc
                  </p>
                  <input
                    id="upload-files-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => handleUploadSelection(event.target.files)}
                  />
                  <input
                    id="upload-folders-input"
                    type="file"
                    multiple
                    className="hidden"
                    {...{ webkitdirectory: "true" }}
                    onChange={(event) => handleUploadSelection(event.target.files)}
                  />
                </div>

                <Tabs value={activeUploadTab} onValueChange={setActiveUploadTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All Images ({pendingUploads.length})</TabsTrigger>
                    <TabsTrigger value="annotated">Annotated</TabsTrigger>
                    <TabsTrigger value="not-annotated">Not Annotated</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-6">
                    <UploadPreview files={filteredPendingUploads} />
                  </TabsContent>
                  <TabsContent value="annotated" className="mt-6">
                    <UploadPreview files={filteredPendingUploads} />
                  </TabsContent>
                  <TabsContent value="not-annotated" className="mt-6">
                    <UploadPreview files={filteredPendingUploads} />
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => (setPendingUploads([]), setUploadDialogOpen(false))}>
                  Close
                </Button>
                <Button onClick={confirmUpload} disabled={pendingUploads.length === 0}>
                  Upload and Start Annotating
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PenSquare className="mr-2 h-4 w-4" /> Rename
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Batch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  defaultValue={batchName}
                  onChange={(event) => setBatchName(event.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleRename(batchName)}
                  disabled={!batchName.trim()}
                >
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Files in this batch</CardTitle>
            <CardDescription>{uploadedFiles.length} files currently attached to this batch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="border rounded-lg overflow-hidden bg-muted/40">
                  <div className="aspect-video bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.preview} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3 text-sm">
                    <p className="font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Uploaded {file.uploadedAt}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Status: {file.annotated ? "Annotated" : "Not annotated"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>How do you want to label?</CardTitle>
            <CardDescription>Select the approach that fits this batch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {labelMode !== "team" && (
                <Button
                  variant={labelMode === "solo" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setLabelMode("solo")}
                >
                  Label Myself
                </Button>
              )}
              <Button
                variant={labelMode === "team" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setLabelMode("team")
                  setShowInstructions(false)
                  setShowTeamForm(false)
                }}
              >
                Label With My Team
              </Button>
            </div>

            {labelMode === "solo" ? (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/40">
                <p className="text-sm text-muted-foreground">
                  You will label the {uploadedFiles.length} files in this batch yourself using the project tools.
                </p>
                <Button className="w-full" onClick={handleStartLabeling}>
                  Start Labeling
                </Button>
              </div>
            ) : (
              <div className="space-y-6 rounded-lg border p-4 bg-muted/40">
                {/* Top row buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start disabled:opacity-50 disabled:blur-[0.5px]"
                    disabled={showTeamForm}
                    onClick={() => {
                      setShowInstructions((prev) => !prev)
                      if (!showInstructions) setShowTeamForm(false)
                    }}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" /> Add Instructions
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start disabled:opacity-50 disabled:blur-[0.5px]"
                    disabled={showInstructions}
                    onClick={() => {
                      setShowTeamForm((prev) => !prev)
                      if (!showTeamForm) setShowInstructions(false)
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Add Team Members
                  </Button>
                </div>

                {showInstructions && (
                  <div className="rounded-lg border p-3 bg-background space-y-3">
                    <Label htmlFor="instructions">Labeling Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      placeholder="Add optional labeling instructions for your team members."
                      rows={5}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => setShowInstructions(false)}>
                        Save Instructions
                      </Button>
                    </div>
                  </div>
                )}

                {showTeamForm && (
                  <div className="rounded-lg border p-3 bg-background space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="team@company.com"
                        value={newMemberEmail}
                        onChange={(event) => setNewMemberEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <select
                        id="invite-role"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newMemberRole}
                        onChange={(event) => setNewMemberRole(event.target.value as TeamMember["role"])}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Labeler">Labeler</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowTeamForm(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddMember} disabled={!newMemberEmail.trim()}>
                        Send Invite
                      </Button>
                    </div>
                  </div>
                )}

                {/* No total slider as requested */}

                {!showInstructions && !showTeamForm && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Team Members</h4>
                    <div className="space-y-2">
                      {teamMembers.map((m) => {
                        const isSelected = selectedMemberIds.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMemberIds((prev) => {
                                const next = prev.includes(m.id)
                                  ? prev.filter((id) => id !== m.id)
                                  : [...prev, m.id]
                                redistributeAssignments(next)
                                return next
                              })
                            }}
                            className={`w-full text-left rounded-lg border p-3 bg-background transition ${
                              isSelected ? "ring-2 ring-primary" : "hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.email}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{m.assignedCount} files</span>
                            </div>
                            {m.status === "invited" && (
                              <p className="text-xs text-purple-600 mt-2">Invitation pending</p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // reset team-specific UI and go back to initial view
                      setLabelMode("solo")
                      setShowInstructions(false)
                      setShowTeamForm(false)
                      setSelectedMemberIds([])
                      setTeamMembers((prev) => prev.map((m) => ({ ...m, assignedCount: 0 })))
                    }}
                  >
                    Back
                  </Button>
                  <Button onClick={handleStartLabeling} disabled={selectedMemberIds.length === 0}>
                    Start Labeling
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UploadPreview({ files }: { files: UploadedFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No files selected yet. Use the buttons above to upload more.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <div key={file.id} className="rounded-lg border bg-background overflow-hidden">
          <div className="aspect-video bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.preview} alt={file.name} className="h-full w-full object-cover" />
          </div>
          <div className="p-3 text-sm">
            <p className="font-medium truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">Will be added to this batch</p>
          </div>
        </div>
      ))}
    </div>
  )
}
