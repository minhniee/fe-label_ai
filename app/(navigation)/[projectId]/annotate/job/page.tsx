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
import { listAuditEvents } from "@/app/api/audit";
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [batchAssignments, setBatchAssignments] = useState<any[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
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
        console.log("Loaded assignment history:", history);
        console.log("Assignment history length:", history.length);
        setAssignmentHistory(history);
      } else {
        console.log("No assignment history found in batch_metadata");
        console.log("Batch metadata:", batch.batch_metadata);
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
      
      // Get the most recent assignment for current assignment display
      if (sortedAssignments.length > 0) {
        const mostRecentAssignment = sortedAssignments[0];
        setAssignedUser({
          user_id: mostRecentAssignment.user_id,
          username: mostRecentAssignment.user_username,
          assigned_at: mostRecentAssignment.assigned_at,
          assigner_username: mostRecentAssignment.assigner_username
        });
      } else {
        // If no assignment, check if owner is doing it (label myself)
        if (currentUser) {
          setAssignedUser({
            user_id: currentUser.user_id,
            username: currentUser.username || currentUser.email,
            is_owner: true
          });
        }
      }

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
      await loadAuditLogs(parseInt(batchId!));

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

  const loadAuditLogs = async (batchId: number) => {
    try {
      const response = await listAuditEvents({
        resource_type: "batch",
        resource_id: batchId,
        page: 1,
        page_size: 50
      });
      setAuditLogs(response.items || []);
    } catch (error: any) {
      console.error("Failed to load audit logs:", error);
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
      // Get current batch and assignments
      const currentBatch = await getBatch(parseInt(batchId!));
      const currentAssignments = await getBatchAssignments({ batch_id: parseInt(batchId!), page: 1, page_size: 10 });
      
      console.log("Current assignments before reassign:", currentAssignments.assignments);
      
      // Save assignment history to batch_metadata before deleting
      const currentMetadata = currentBatch.batch_metadata || {};
      const existingHistory = currentMetadata.assignment_history || [];
      
      console.log("Existing assignment history:", existingHistory);
      
      // Add current assignments to history before deleting (only if there are assignments to save)
      const historyEntries = currentAssignments.assignments.length > 0 
        ? currentAssignments.assignments.map(assignment => ({
            assignment_id: assignment.assignment_id,
            user_id: assignment.user_id,
            user_username: assignment.user_username,
            assigned_by: assignment.assigned_by,
            assigner_username: assignment.assigner_username,
            assigned_at: assignment.assigned_at,
            deleted_at: new Date().toISOString()
          }))
        : [];
      
      const updatedHistory = [...existingHistory, ...historyEntries];
      console.log("Saving assignment history:", {
        existingHistoryCount: existingHistory.length,
        historyEntriesCount: historyEntries.length,
        updatedHistoryCount: updatedHistory.length,
        updatedHistory
      });
      
      // Delete existing assignments (replace old with new)
      for (const assignment of currentAssignments.assignments) {
        try {
          await deleteBatchAssignment(assignment.assignment_id);
        } catch (error: any) {
          console.error(`Failed to delete assignment ${assignment.assignment_id}:`, error);
        }
      }

      // Update batch metadata with assignment history first (before creating new assignment)
      // IMPORTANT: Send complete metadata to preserve all fields (file_ids, instructions, etc.)
      const mergedMetadata = {
        ...currentMetadata, // Preserve all existing metadata fields
        assignment_history: updatedHistory // Update assignment_history
      };
      console.log("Updating batch metadata with:", mergedMetadata);
      console.log("Assignment history to save:", updatedHistory);
      console.log("Current metadata keys:", Object.keys(currentMetadata));
      console.log("Merged metadata keys:", Object.keys(mergedMetadata));
      
      const updateResponse = await updateBatch(parseInt(batchId!), {
        batch_metadata: mergedMetadata
      });
      console.log("Batch updated, response:", updateResponse);
      
      // Verify the update by fetching the batch again
      const verifyBatch = await getBatch(parseInt(batchId!));
      console.log("Verified batch metadata after update:", verifyBatch.batch_metadata);
      console.log("Verified assignment history:", verifyBatch.batch_metadata?.assignment_history);
      console.log("Verified assignment history length:", verifyBatch.batch_metadata?.assignment_history?.length || 0);

      // Create new assignment if user_id is selected (not pending email)
      // This creates a new log entry in timeline
      if (selectedReassignUserId) {
        await createBatchAssignment({
          batch_id: parseInt(batchId!),
          user_id: selectedReassignUserId,
          notes: "Reassigned job"
        });
      } else if (selectedReassignEmail) {
        // For pending emails, save to batch metadata
        // Use the already-updated metadata that includes assignment_history
        const updatedMetadata = {
          ...mergedMetadata, // Use mergedMetadata which already has assignment_history
          assigned_pending_emails: [selectedReassignEmail]
        };
        console.log("Updating batch metadata for pending email with:", updatedMetadata);
        await updateBatch(parseInt(batchId!), {
          batch_metadata: updatedMetadata,
        });
        // Verify the update
        const verifyBatch2 = await getBatch(parseInt(batchId!));
        console.log("Verified batch metadata after pending email update:", verifyBatch2.batch_metadata);
      }

      toast.success("Job reassigned successfully");
      setIsReassignDrawerOpen(false);
      setSelectedReassignUserId(null);
      setSelectedReassignEmail(null);
      
      // Reload job data and audit logs to show history
      // Add a small delay to ensure database commit is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadJobData();
      await loadAuditLogs(parseInt(batchId!));
      
      // Double-check assignment history after reload
      const finalBatch = await getBatch(parseInt(batchId!));
      console.log("Final check - assignment history after reload:", finalBatch.batch_metadata?.assignment_history);
      console.log("Final check - assignment history length:", finalBatch.batch_metadata?.assignment_history?.length || 0);
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
      allUsers.push({
        type: 'collaborator',
        user_id: collab.user_id,
        email: collab.user_email || collab.user_username,
        username: collab.user_username || collab.user_email,
        role_id: collab.role_id,
        role_name: collab.role_name
      });
    });

    // Add pending invitations
    pendingInvitations.forEach(invite => {
      allUsers.push({
        type: 'pending',
        email: invite.email,
        role_id: invite.role_id,
        invitation_id: invite.invitation_id
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
              className="flex-1" 
              onClick={() => {
                // Pass batch ID and file IDs to labelai page
                const fileIds = unannotatedFiles.map(f => f.file_id);
                const params = new URLSearchParams({
                  batchId: batchId!,
                  fileIds: JSON.stringify(fileIds),
                  jobName: batchName
                });
                router.push(`/${projectSlug}/labelai?${params.toString()}`);
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
            {assignedUser && userProgress && (
              <div className="space-y-2 pt-2 ">
                <div className="text-xs text-muted-foreground">
                  {assignedUser.username || assignedUser.email}'s Progress
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {userCompletedFiles} / {userAssignedFiles} Files
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(userProgressPercentage)}%
                  </span>
                </div>
                <Progress value={userProgressPercentage} className="h-2" />
              </div>
            )}
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">{annotatedFiles.length} Annotated</p>
              <p className="text-muted-foreground">{unannotatedFiles.length} Unannotated</p>
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
                        
                        return (
                          <div
                            key={user.user_id || user.email || index}
                            onClick={() => {
                              if (user.user_id) {
                                setSelectedReassignUserId(user.user_id);
                                setSelectedReassignEmail(null);
                              } else if (user.email) {
                                setSelectedReassignEmail(user.email);
                                setSelectedReassignUserId(null);
                              }
                            }}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
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
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{assignedUser.username || assignedUser.email || 'Unknown'}</p>
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
            {/* Combine all events and sort by time */}
            {(() => {
              const allEvents: any[] = [];

              // Add job creation
              if (batchData?.created_at) {
                allEvents.push({
                  type: 'creation',
                  timestamp: batchData.created_at,
                  message: `Job created${batchData.creator_username ? ` by ${batchData.creator_username}` : ''}`,
                  color: 'bg-orange-500'
                });
              }

              // Add assignment history (deleted assignments) - each is a separate log entry
              console.log("Assignment history for timeline:", assignmentHistory);
              console.log("Assignment history type:", typeof assignmentHistory);
              console.log("Assignment history is array:", Array.isArray(assignmentHistory));
              if (assignmentHistory && Array.isArray(assignmentHistory) && assignmentHistory.length > 0) {
                assignmentHistory.forEach((historyEntry, idx) => {
                  console.log(`Adding history entry ${idx}:`, historyEntry);
                  allEvents.push({
                    type: 'assignment_history',
                    timestamp: historyEntry.assigned_at,
                    message: `${historyEntry.assigner_username || 'Someone'} assigned ${historyEntry.user_username || 'user'} as labeler`,
                    color: 'bg-blue-500',
                    assignment_id: historyEntry.assignment_id,
                    is_deleted: true
                  });
                });
              } else {
                console.log("Assignment history is empty or not an array");
              }

              // Add current batch assignments (active ones) - each is a separate log entry
              batchAssignments.forEach(assignment => {
                allEvents.push({
                  type: 'assignment',
                  timestamp: assignment.assigned_at,
                  message: `${assignment.assigner_username || 'Someone'} assigned ${assignment.user_username || 'user'} as labeler`,
                  color: 'bg-blue-500',
                  assignment_id: assignment.assignment_id
                });
              });

              // Add all audit logs (includes assignment deletion and other changes)
              // Filter out assignment creation logs to avoid duplicates with batchAssignments above
              auditLogs
                .filter(log => {
                  const action = log.action?.toLowerCase() || '';
                  // Include deletion and other non-creation assignment logs
                  return !(action.includes('create') && action.includes('assign'));
                })
                .forEach(log => {
                  allEvents.push({
                    type: 'audit',
                    timestamp: log.timestamp,
                    message: `${log.action || 'Action'}${log.username ? ` by ${log.username}` : ''}`,
                    color: log.action?.toLowerCase().includes('assign') || log.action?.toLowerCase().includes('delete') ? 'bg-blue-500' : 'bg-gray-500',
                    event_id: log.event_id
                  });
                });

              // Sort by timestamp (newest first)
              allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

              console.log("All events for timeline (after sort):", allEvents);
              console.log("Total events:", allEvents.length);

              return allEvents.map((event, index) => (
                <div key={event.assignment_id || event.event_id || `event-${index}`} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${event.color} mt-2`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ));
            })()}
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
