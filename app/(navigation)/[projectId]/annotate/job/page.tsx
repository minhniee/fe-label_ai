"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, FileText, Search, X, Zap } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { getBatch, updateBatch, getBatchAssignments, getUserBatchProgress, createBatchAssignment, deleteBatchAssignment } from "@/app/api/batch";
import { getProjectFiles, listPendingInvitations, getProjectCollaborators } from "@/app/api/project";
import { getMe } from "@/app/api/auth";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";


export default function ProjectJobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const batchId = searchParams.get("jobId"); // jobId is actually batchId
  const fileIdsParam = searchParams.get("fileIds");

  const [batchData, setBatchData] = useState<any>(null);
  const [batchName, setBatchName] = useState("");
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab === "annotated" ? "annotated" : "unannotated"
  );
  const [unannotatedFiles, setUnannotatedFiles] = useState<any[]>([]);
  const [annotatedFiles, setAnnotatedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [assignedUser, setAssignedUser] = useState<any>(null); // Only one assigned user
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isReassignDrawerOpen, setIsReassignDrawerOpen] = useState(false);
  const [selectedReassignUserId, setSelectedReassignUserId] = useState<number | null>(null);
  const [selectedReassignEmail, setSelectedReassignEmail] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProgress, setUserProgress] = useState<any>(null);
  const [batchAssignments, setBatchAssignments] = useState<any[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [csvRowCounts, setCsvRowCounts] = useState<{ [fileId: number]: number }>({});

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "annotated" || tabParam === "unannotated") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load job data on mount
  useEffect(() => {
    if (batchId && project) {
      loadCurrentUser();
      loadJobData();
      loadPendingInvitations();
      loadCollaborators();
    }
  }, [batchId, project]);

  // Derive current assignment display whenever assignments/collaborators change
  useEffect(() => {
    if (!batchData) {
      setAssignedUser(null);
      return;
    }

    if (batchAssignments.length > 0) {
      const mostRecentAssignment = batchAssignments[0];
      const collaborator = collaborators.find(c => c.user_id === mostRecentAssignment.user_id);

      if (collaborator) {
        setAssignedUser({
          user_id: mostRecentAssignment.user_id,
          email: collaborator.user_email || collaborator.user_username || "",
          role_id: collaborator.role_id,
          role_name: collaborator.role_name,
          assigned_at: mostRecentAssignment.assigned_at,
          assigner_username: mostRecentAssignment.assigner_username,
        });
        return;
      }
    }

    // Check for pending email assignment from batch metadata
    const pendingEmails = batchData.batch_metadata?.assigned_pending_emails || [];
    if (pendingEmails.length > 0) {
      const invitation = pendingInvitations.find(inv => inv.email === pendingEmails[0]);
      setAssignedUser({
        email: pendingEmails[0],
        role_id: invitation?.role_id,
        role_name: invitation ? getRoleName(invitation.role_id) : undefined,
        is_pending: true,
      });
      return;
    }

    // Fallback to current user if they are labeling themselves
    if (currentUser) {
      const currentUserCollaborator = collaborators.find(c => c.user_id === currentUser.user_id);
      setAssignedUser({
        user_id: currentUser.user_id,
        email: currentUser.email || currentUserCollaborator?.user_email || currentUser.username || "",
        role_id: currentUserCollaborator?.role_id,
        role_name: currentUserCollaborator?.role_name,
        is_owner: true,
      });
      return;
    }

    setAssignedUser(null);
  }, [batchAssignments, collaborators, pendingInvitations, currentUser, batchData]);

  // Load user progress when assigned user changes
  useEffect(() => {
    if (assignedUser?.user_id) {
      loadUserProgress(assignedUser.user_id);
    }
  }, [assignedUser]);

  const loadCurrentUser = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
    } catch (error: any) {
      console.error("Failed to load current user:", error);
    }
  };

  const loadJobData = async () => {
    try {
      setIsLoading(true);

      // Get batch details
      const batch = await getBatch(parseInt(batchId!));
      setBatchData(batch);
      setBatchName(batch.name);

      // Get file_ids from URL or batch metadata
      let targetFileIds: number[] = [];
      if (fileIdsParam) {
        targetFileIds = JSON.parse(fileIdsParam);
      } else if (batch.batch_metadata?.file_ids) {
        targetFileIds = batch.batch_metadata.file_ids;
      }

      // Get instructions from batch metadata
      if (batch.batch_metadata?.instructions) {
        setInstructions(batch.batch_metadata.instructions);
      }
      
      // Load CSV row counts from batch metadata (if available)
      if (batch.batch_metadata?.csv_row_counts) {
        const rowCounts = batch.batch_metadata.csv_row_counts;
        setCsvRowCounts(rowCounts);
        console.log("Loaded CSV row counts from metadata:", rowCounts);
      } else {
        setCsvRowCounts({});
      }

      // Load assignment history from batch metadata
      if (batch.batch_metadata?.assignment_history) {
        const history = Array.isArray(batch.batch_metadata.assignment_history) 
          ? batch.batch_metadata.assignment_history 
          : [];
        setAssignmentHistory(history);
      } else {
        setAssignmentHistory([]);
      }

      // Get current batch assignments (only active ones, old ones are deleted)
      const assignments = await getBatchAssignments({ batch_id: parseInt(batchId!), page: 1, page_size: 10 });
      console.log("Loaded current assignments:", assignments.assignments);
      // Sort by assigned_at descending to get most recent first
      const sortedAssignments = (assignments.assignments || []).sort((a, b) => 
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );
      setBatchAssignments(sortedAssignments);
      console.log("Sorted assignments:", sortedAssignments);

      const logsFromMetadata = Array.isArray(batch.batch_metadata?.assignment_logs)
        ? [...batch.batch_metadata.assignment_logs]
        : [];
      if (!logsFromMetadata.length && batch.created_at) {
        const earliestAssignment = sortedAssignments.length
          ? sortedAssignments[sortedAssignments.length - 1]
          : null;
        const initialEmail = earliestAssignment?.user_username || "";
        logsFromMetadata.push({
          type: "creation",
          timestamp: batch.created_at,
          message: initialEmail
            ? `Job created via API and assigned it to ${initialEmail}`
            : "Job created via API",
          color: "bg-orange-500",
        });
      }
      setAssignmentLogs(logsFromMetadata);

      // Fetch project files
      const projectFiles = await getProjectFiles(parseInt(project!.id));

      // Filter files by batch file IDs
      let batchFiles = projectFiles;
      if (targetFileIds.length > 0) {
        batchFiles = projectFiles.filter(f => targetFileIds.includes(f.file_id));
      }

      // Separate into unannotated and annotated
      const unannotated = batchFiles.filter(f => 
        f.annotation_status === 'unannotated' || f.annotation_status === 'annotating'
      );
      const annotated = batchFiles.filter(f => 
        f.annotation_status === 'completed' || f.annotation_status === 'verified'
      );

      setUnannotatedFiles(unannotated);
      setAnnotatedFiles(annotated);

      // Load audit logs for this batch
    } catch (error: any) {
      console.error("Failed to load job data:", error);
      toast.error("Failed to load job data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgress = async (userId: number) => {
    try {
      const progress = await getUserBatchProgress(userId);
      setUserProgress(progress);
    } catch (error: any) {
      console.error("Failed to load user progress:", error);
      // Don't show error toast, just log it
    }
  };

  const loadPendingInvitations = async () => {
    try {
      if (!project) return;
      const invitations = await listPendingInvitations(parseInt(project.id));
      setPendingInvitations(invitations);
    } catch (error: any) {
      console.error("Failed to load pending invitations:", error);
    }
  };

  const loadCollaborators = async () => {
    try {
      if (!project) return;
      const collabs = await getProjectCollaborators(parseInt(project.id));
      setCollaborators(collabs);
    } catch (error: any) {
      console.error("Failed to load collaborators:", error);
    }
  };

  const totalCsvRows = Object.values(csvRowCounts || {}).reduce(
    (sum, count) => sum + (count || 0),
    0
  );

  const handleReassign = async () => {
    if (!selectedReassignUserId && !selectedReassignEmail) {
      toast.error("Please select a user to reassign");
      return;
    }

    setIsReassigning(true);
    try {
      const currentBatch = await getBatch(parseInt(batchId!));
      const currentMetadata = currentBatch.batch_metadata || {};
      const currentAssignments = await getBatchAssignments({
        batch_id: parseInt(batchId!),
        page: 1,
        page_size: 10,
      });

      const existingHistory = Array.isArray(currentMetadata.assignment_history)
        ? [...currentMetadata.assignment_history]
        : [];
      const historyEntries = currentAssignments.assignments.length
        ? currentAssignments.assignments.map((assignment) => ({
            assignment_id: assignment.assignment_id,
            user_id: assignment.user_id,
            user_username: assignment.user_username,
            assigned_by: assignment.assigned_by,
            assigner_username: assignment.assigner_username,
            assigned_at: assignment.assigned_at,
            deleted_at: new Date().toISOString(),
          }))
        : [];
      const updatedHistory = [...existingHistory, ...historyEntries];

      for (const assignment of currentAssignments.assignments) {
        try {
          await deleteBatchAssignment(assignment.assignment_id);
        } catch (error: any) {
          console.error(`Failed to delete assignment ${assignment.assignment_id}:`, error);
        }
      }

      const logsToPersist = Array.isArray(currentMetadata.assignment_logs)
        ? [...currentMetadata.assignment_logs]
        : [];
      const ensureCreationLog = () => {
        if (logsToPersist.length === 0) {
          const initialEmail =
            assignedUser?.email ||
            currentAssignments.assignments[currentAssignments.assignments.length - 1]?.user_username ||
            "";
          logsToPersist.push({
            type: "creation",
            timestamp: currentBatch.created_at || new Date().toISOString(),
            message: initialEmail
              ? `Job created via API and assigned it to ${initialEmail}`
              : "Job created via API",
            color: "bg-orange-500",
          });
        }
      };

      const metadataBase: any = {
        ...currentMetadata,
        assignment_history: updatedHistory,
      };

      if (selectedReassignUserId) {
        const newAssignment = await createBatchAssignment({
          batch_id: parseInt(batchId!),
          user_id: selectedReassignUserId,
          notes: "Reassigned job",
        });

        const collaborator = collaborators.find(c => c.user_id === selectedReassignUserId);
        const newHistoryEntry = {
          assignment_id: `reassign-${Date.now()}`,
          user_id: selectedReassignUserId,
          user_username: collaborator?.user_email || collaborator?.user_username || "",
          assigned_at: newAssignment?.assigned_at || new Date().toISOString(),
          assigner_username: currentUser?.username || currentUser?.email || "Someone",
        };

        metadataBase.assignment_history = [
          ...updatedHistory,
          newHistoryEntry,
        ];

        ensureCreationLog();
        const newAssigneeEmail =
          collaborator?.user_email || collaborator?.user_username || newAssignment?.user_username || "";
        if (newAssigneeEmail) {
          logsToPersist.push({
            type: "assignment",
            timestamp: newAssignment?.assigned_at || new Date().toISOString(),
            message: `${currentUser?.username || currentUser?.email || "Someone"} assigned ${newAssigneeEmail} as labeler`,
            color: "bg-blue-500",
          });
        }
        metadataBase.assignment_logs = logsToPersist;
      } else if (selectedReassignEmail) {
        metadataBase.assigned_pending_emails = [selectedReassignEmail];
      }

      if (!metadataBase.assignment_logs && logsToPersist.length) {
        metadataBase.assignment_logs = logsToPersist;
      }

        await updateBatch(parseInt(batchId!), {
        batch_metadata: metadataBase,
        });

      if (metadataBase.assignment_logs) {
        setAssignmentLogs(metadataBase.assignment_logs);
      }

      toast.success("Job reassigned successfully");
      setIsReassignDrawerOpen(false);
      setSelectedReassignUserId(null);
      setSelectedReassignEmail(null);
      
      // Reload job data and audit logs to show history
      // Add a small delay to ensure database commit is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadJobData();
      
      const finalBatch = await getBatch(parseInt(batchId!));
      console.log("Final check - assignment logs after reload:", finalBatch.batch_metadata?.assignment_logs);
    } catch (error: any) {
      console.error("Failed to reassign job:", error);
      toast.error(error.message || "Failed to reassign job");
    } finally {
      setIsReassigning(false);
    }
  };

  const getRoleName = (roleId: number) => {
    const roleNames: Record<number, string> = {
      1: "Owner",
      2: "Co-Owner",
      3: "Manager",
      4: "Reviewer",
      5: "Labeler",
      6: "Viewer",
    };
    return roleNames[roleId] || "Unknown";
  };

  // Get all available users (collaborators + pending invitations)
  const getAllAvailableUsers = () => {
    const allUsers: any[] = [];
    
    // Add collaborators
    collaborators.forEach(collab => {
      const disabled = batchAssignments.some(
        assignment => assignment.user_id === collab.user_id
      );

      allUsers.push({
        type: 'collaborator',
        user_id: collab.user_id,
        email: collab.user_email || collab.user_username,
        username: collab.user_username || collab.user_email,
        role_id: collab.role_id,
        role_name: collab.role_name,
        disabled
      });
    });

    // Add pending invitations
    pendingInvitations.forEach(invite => {
      allUsers.push({
        type: 'pending',
        email: invite.email,
        role_id: invite.role_id,
            invitation_id: invite.invitation_id,
            disabled: false
      });
    });

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return allUsers.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    }

    return allUsers;
  };

  const totalFiles = unannotatedFiles.length + annotatedFiles.length;
  const progress = totalFiles > 0 ? (annotatedFiles.length / totalFiles) * 100 : 0;
  
  // Calculate progress from user progress API if available
  const userProgressPercentage = userProgress?.total_progress || 0;
  const userCompletedFiles = userProgress?.completed_batches || 0;
  const userAssignedFiles = userProgress?.assigned_batches || 0;

  // Check if current user is Owner (3) or Co-Owner (4) in this project
  const currentUserProjectRole = currentUser?.user_id 
    ? collaborators.find(c => c.user_id === currentUser.user_id)?.role_id 
    : null;
  const canReassign = currentUserProjectRole === 3 || currentUserProjectRole === 4; // Owner or Co-Owner

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading job data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${projectSlug}/annotate`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Uploaded on {batchData?.created_at ? new Date(batchData.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-4">
            <Button 
              className="flex-1 cursor-pointer" 
              onClick={() => {
                // Navigate to labelai page with jobId in path
                const fileIds = unannotatedFiles.map(f => f.file_id);
                const params = new URLSearchParams({
                  fileIds: JSON.stringify(fileIds),
                  jobName: batchName
                });
                  router.push(`/${projectSlug}/annotate/job/${batchId}/annotating?${params.toString()}`);
              }}
              disabled={unannotatedFiles.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Annotating
            </Button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-4">Progress</h3>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="text-muted-foreground font-medium">
                  {Math.round(progress)}%
                  </span>
                </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{annotatedFiles.length} / {totalFiles} Files</span>
                <span>{annotatedFiles.length} Annotated • {unannotatedFiles.length} Unannotated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <p className="text-sm text-muted-foreground">{instructions}</p>
          </div>
        )}

        {/* Row Summary */}
        {totalCsvRows > 0 && (
          <div className="p-6 border-b">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Total rows to label: <span className="font-bold">{totalCsvRows} rows</span>
              </p>
            </div>
          </div>
        )}

        {/* Assignment */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Assignment</h3>
            {canReassign && (
              <Drawer open={isReassignDrawerOpen} onOpenChange={setIsReassignDrawerOpen} direction="right">
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm">
                    Reassign
                  </Button>
                </DrawerTrigger>
              <DrawerContent className="max-h-[100vh] h-full" data-vaul-drawer-direction="right">
                <DrawerHeader>
                  <DrawerTitle>Reassign Job</DrawerTitle>
                  <DrawerDescription>
                    Select a team member to reassign this job to
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 flex-1 overflow-hidden flex flex-col">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for team members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* User List */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {getAllAvailableUsers().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No team members found
                      </p>
                    ) : (
                      getAllAvailableUsers().map((user, index) => {
                        const isSelected = (user.user_id && selectedReassignUserId === user.user_id) ||
                          (user.email && selectedReassignEmail === user.email);
                        
                      const cardClass = user.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted";
                        
                        return (
                          <div
                            key={user.user_id || user.email || index}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${cardClass}`}
                            onClick={() => {
                            if (user.disabled) return;
                              if (user.user_id) {
                                setSelectedReassignUserId(user.user_id);
                                setSelectedReassignEmail(null);
                              } else if (user.email) {
                                setSelectedReassignEmail(user.email);
                                setSelectedReassignUserId(null);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {user.email || user.username}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {user.type === 'pending' && (
                                  <Badge variant="outline" className="text-xs">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Invited
                                  </Badge>
                                )}
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <DrawerFooter>
                  <Button 
                    onClick={handleReassign} 
                    disabled={isReassigning || (!selectedReassignUserId && !selectedReassignEmail)}
                  >
                    {isReassigning ? "Reassigning..." : "Reassign Job"}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            )}
          </div>
          <div className="space-y-2">
            {/* Display assigned user */}
            {assignedUser ? (
              <div className="p-3 rounded-lg">
                <p className="font-medium text-sm">{assignedUser.email || 'Unknown'}</p>
                {assignedUser.role_name && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {assignedUser.role_name}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No user assigned</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <div className="space-y-3">
            {assignmentLogs
              .slice()
              .sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )
              .map((event, index) => (
                <div key={`event-${index}`} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${event.color || "bg-blue-500"} mt-2`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Content - Files Grid with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-6 pt-4">
              <TabsList>
                <TabsTrigger value="unannotated">
                  Unannotated
                  <Badge variant="secondary" className="ml-2">
                    {unannotatedFiles.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="annotated">
                  Annotated
                  <Badge variant="secondary" className="ml-2">
                    {annotatedFiles.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="unannotated" className="mt-0 p-6">
              {unannotatedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>No unannotated files</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {unannotatedFiles.map((file) => (
                    <div key={file.file_id} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden hover:border-primary transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        {file.filename && file.filename.toLowerCase().endsWith('.csv') && csvRowCounts[file.file_id] && (
                          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                            {csvRowCounts[file.file_id]} câu
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs truncate mt-2" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="annotated" className="mt-0 p-6">
              {annotatedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>No annotated files yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {annotatedFiles.map((file) => (
                    <div key={file.file_id} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden hover:border-primary transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <Badge 
                          variant="default" 
                          className="absolute top-2 right-2 text-xs"
                        >
                          ✓
                        </Badge>
                        {file.filename && file.filename.toLowerCase().endsWith('.csv') && csvRowCounts[file.file_id] && (
                          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                            {csvRowCounts[file.file_id]} câu
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs truncate mt-2" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
