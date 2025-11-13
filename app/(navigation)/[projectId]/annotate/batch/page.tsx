"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, Edit, Plus, Users, FileText, X } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { projectToSlug } from "@/types/project";

export default function ProjectBatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const batchId = searchParams.get("batchId");

  // Mock batch data
  const [batchName, setBatchName] = useState("Batch 001");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"myself" | "team" | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Labeler" | "Viewer">("Labeler");

  const mockFiles = [
    { id: "1", name: "image1.jpg", url: "/placeholder.svg" },
    { id: "2", name: "image2.jpg", url: "/placeholder.svg" },
    { id: "3", name: "image3.jpg", url: "/placeholder.svg" },
    { id: "4", name: "image4.jpg", url: "/placeholder.svg" },
  ];

  const mockTeamMembers = [
    { id: "1", name: "Truong Vinh Hao", email: "hao@example.com" },
    { id: "2", name: "Truong Hao", email: "truonghao@example.com" },
    { id: "3", name: "John Doe", email: "john@example.com" },
  ];

  const filesPerMember = selectedMembers.length > 0 
    ? Math.ceil(mockFiles.length / selectedMembers.length) 
    : 0;

  const handleStartLabeling = () => {
    if (selectedOption === "myself") {
      router.push(`/${projectSlug}/annotate/job?jobId=${batchId}`);
    } else if (selectedOption === "team") {
      // Create job and redirect
      router.push(`/${projectSlug}/annotate/job?jobId=${batchId}`);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${projectSlug}/annotate`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{batchName}</h1>
            <p className="text-muted-foreground">
              {mockFiles.length} files • Project: {project?.name || "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsRenameOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Rename Batch
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload More
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Files */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Files ({mockFiles.length})</h3>
          <div className="grid grid-cols-2 gap-4">
            {mockFiles.map((file) => (
              <div key={file.id} className="aspect-square rounded-lg border bg-muted" />
            ))}
          </div>
        </Card>

        {/* Right: Options */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Labeling Options</h3>
          
          {!selectedOption && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setSelectedOption("myself")}
              >
                <div className="text-left">
                  <div className="font-semibold">Label Myself</div>
                  <div className="text-sm text-muted-foreground">
                    Start labeling this batch on your own
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => setSelectedOption("team")}
              >
                <div className="text-left">
                  <div className="font-semibold">Label with my team</div>
                  <div className="text-sm text-muted-foreground">
                    Assign files to team members
                  </div>
                </div>
              </Button>
            </div>
          )}

          {selectedOption === "myself" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You will label all {mockFiles.length} files in this batch.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleStartLabeling}>Start Labeling</Button>
                <Button variant="outline" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {selectedOption === "team" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={showInstructions ? "default" : "outline"}
                  className={showTeamMembers ? "opacity-50" : ""}
                  onClick={() => {
                    setShowInstructions(!showInstructions);
                    setShowTeamMembers(false);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Add Instructions
                </Button>
                <Button
                  variant={showTeamMembers ? "default" : "outline"}
                  className={showInstructions ? "opacity-50" : ""}
                  onClick={() => {
                    setShowTeamMembers(!showTeamMembers);
                    setShowInstructions(false);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Add Team Members
                </Button>
              </div>

              {showInstructions && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter labeling instructions..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={6}
                  />
                </div>
              )}

              {showTeamMembers && (
                <div className="space-y-2">
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Labeler">Labeler</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!showInstructions && !showTeamMembers && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Selected Team Members ({selectedMembers.length})
                  </p>
                  {mockTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => handleMemberToggle(member.id)}
                        />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      {selectedMembers.includes(member.id) && (
                        <Badge variant="secondary">{filesPerMember} files</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={handleStartLabeling}
                  disabled={selectedMembers.length === 0}
                >
                  Start Labeling
                </Button>
                <Button variant="outline" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Batch</DialogTitle>
            <DialogDescription>Enter a new name for this batch</DialogDescription>
          </DialogHeader>
          <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsRenameOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload More Files</DialogTitle>
            <DialogDescription>Add more files to this batch</DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsUploadOpen(false)}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

