"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { ArrowLeft, Upload, Edit, Plus, Users, FileText, X, Loader2, Zap, Database, Sparkles, User, UserPlus, ChevronRight, Send } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { projectToSlug } from "@/types/project";
import { getBatch, updateBatch, assignBatchToUsers, distributeFileToUsers, splitProjectFile, deleteBatch } from "@/app/api/batch";
import { getProjectFiles, uploadFilesToProject, createInvitation, listPendingInvitations, setLabelingType, getProjectCollaborators } from "@/app/api/project";
import { getMe } from "@/app/api/auth";
import { toast } from "sonner";
import React from "react";

export default function ProjectBatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const batchId = searchParams.get("batchId");

  // State
  const [batchData, setBatchData] = useState<any>(null);
  const [batchFiles, setBatchFiles] = useState<any[]>([]);
  const [batchFileIds, setBatchFileIds] = useState<number[]>([]); // Store file IDs of this batch
  const [isLoading, setIsLoading] = useState(true);
  const [batchName, setBatchName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"myself" | "team" | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Co-Owner" | "Labeler" | "Viewer">("Labeler");
  const [isAssigning, setIsAssigning] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Team members state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [csvRowCounts, setCsvRowCounts] = useState<{ [fileId: number]: number }>({});
  const [totalRows, setTotalRows] = useState<number>(0);
  const [isRenaming, setIsRenaming] = useState(false);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load batch data
  useEffect(() => {
    if (batchId && project) {
      loadBatchData();
    }
  }, [batchId, project]);

  // Load team members and invitations when user selects "Label with my team"
  useEffect(() => {
    if (selectedOption === "team" && project) {
      loadTeamData();
    }
  }, [selectedOption, project]);

  const loadCurrentUser = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      // Don't auto-select current user - let them select from collaborators list
    } catch (error: any) {
      console.error("Failed to load current user:", error);
    }
  };

  const loadTeamData = async () => {
    try {
      setIsLoadingTeam(true);

      // Load invitations
      const pendingInvites = await listPendingInvitations(parseInt(project!.id));
      setInvitations(pendingInvites);

      // Load collaborators (users who have accepted invitations)
      const collabs = await getProjectCollaborators(parseInt(project!.id));
      setCollaborators(collabs);

    } catch (error: any) {
      console.error("Failed to load team data:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const loadBatchData = async () => {
    try {
      setIsLoading(true);

      // Fetch batch details
      const batch = await getBatch(parseInt(batchId!));
      setBatchData(batch);
      setBatchName(batch.name);

      console.log("Batch data:", batch);
      console.log("Batch metadata:", batch.batch_metadata);

      // Load CSV row counts from batch metadata (if available)
      if (batch.batch_metadata?.csv_row_counts) {
        const rowCounts = batch.batch_metadata.csv_row_counts;
        setCsvRowCounts(rowCounts);
        const total = batch.batch_metadata.total_csv_rows || Object.values(rowCounts).reduce((sum: number, count: any) => sum + (count || 0), 0);
        setTotalRows(total);
        console.log("Loaded CSV row counts from metadata:", rowCounts);
        console.log("Total rows from metadata:", total);
      } else {
        setCsvRowCounts({});
        setTotalRows(0);
      }

      // Get file_ids from URL params (if coming from upload) or from batch metadata
      const fileIdsParam = searchParams.get("fileIds");
      let targetFileIds: number[] = [];

      // Priority: batch metadata > URL params > state
      if (batch.batch_metadata?.file_ids) {
        // File IDs stored in batch metadata (most reliable source)
        console.log("Using file_ids from batch metadata:", batch.batch_metadata.file_ids);
        targetFileIds = batch.batch_metadata.file_ids;
        setBatchFileIds(targetFileIds);
      } else if (fileIdsParam) {
        // File IDs passed from upload page or unassigned section
        console.log("Using file_ids from URL:", fileIdsParam);
        try {
          const parsed = JSON.parse(fileIdsParam);
          targetFileIds = Array.isArray(parsed) ? parsed : [];
          setBatchFileIds(targetFileIds);
        } catch (e) {
          console.error("Failed to parse fileIds from URL:", e);
        }
      } else if (batchFileIds.length > 0) {
        // Use existing state
        console.log("Using file_ids from state:", batchFileIds);
        targetFileIds = batchFileIds;
      }

      console.log("Final target file IDs:", targetFileIds);

      // Fetch project files and filter by batch file IDs
      if (targetFileIds.length > 0) {
        const files = await getProjectFiles(parseInt(project!.id));
        console.log("All project files:", files.length);
        const batchSpecificFiles = files.filter(f =>
          targetFileIds.includes(f.file_id)
        );
        console.log("Batch specific files:", batchSpecificFiles.length);
        setBatchFiles(batchSpecificFiles);

      } else {
        // No file IDs found - this shouldn't happen
        console.error("No file_ids found for batch!");
        toast.error("No files found for this batch");
        setBatchFiles([]);
      }

    } catch (error: any) {
      console.error("Failed to load batch:", error);
      toast.error("Failed to load batch data");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to read CSV file and count rows from URL
  // Calculate rows per member
  const rowsPerMember = selectedMembers.length > 0 && totalRows > 0
    ? Math.ceil(totalRows / selectedMembers.length)
    : 0;

  const filesPerMember = selectedMembers.length > 0
    ? Math.ceil(batchFiles.length / selectedMembers.length)
    : 0;

  // Helper function to get role name from role_id
  const getRoleName = (roleId: number): string => {
    const roleNames: Record<number, string> = {
      1: "Admin",
      2: "User",
      3: "Owner",
      4: "Co-Owner",
      5: "Labeler",
      6: "Viewer",
    };
    return roleNames[roleId] || "Unknown";
  };

  const handleStartLabeling = async () => {
    if (!batchId) return;

    setIsAssigning(true);
    try {
      // Update batch status to 'in_progress'
      await updateBatch(parseInt(batchId), {
        status: 'in_progress'
      });

      if (selectedOption === "myself") {
        if (!currentUser?.user_id) {
          toast.error("Unable to identify current user");
          return;
        }

        await assignBatchToUsers({
          batch_id: parseInt(batchId),
          user_ids: [currentUser.user_id],
          notes: instructions || undefined,
        });

        toast.success("Batch assigned to you!");

        // Redirect to job page with file IDs
        const fileIdsParam = encodeURIComponent(JSON.stringify(batchFileIds));
        router.push(`/${projectSlug}/annotate/job?jobId=${batchId}&fileIds=${fileIdsParam}`);
      } else if (selectedOption === "team") {
        // Assign batch to selected team members
        if (selectedMembers.length === 0) {
          toast.error("Please select at least one team member");
          return;
        }

        // Separate actual user IDs from pending invitation IDs
        const actualUserIds: number[] = [];
        const pendingInviteIds: string[] = [];

        selectedMembers.forEach(id => {
          if (id.startsWith('pending_')) {
            pendingInviteIds.push(id.replace('pending_', ''));
          } else {
            actualUserIds.push(parseInt(id));
          }
        });

        // Get pending invitation emails
        const pendingEmails = invitations
          .filter(inv => pendingInviteIds.includes(inv.invitation_id.toString()))
          .map(inv => inv.email);

        // Check if batch has CSV files that need to be distributed
        const csvFiles = batchFiles.filter((f) => {
          const rawName = f.filename || f.file_name || "";
          const loweredName = typeof rawName === "string" ? rawName.toLowerCase() : "";
          const loweredType =
            f.file_type && typeof f.file_type === "string" ? f.file_type.toLowerCase() : "";
          return (
            (loweredName && loweredName.endsWith(".csv")) ||
            (loweredType && loweredType.includes("csv"))
          );
        });

        console.log("[Assign team] batchFiles:", batchFiles);
        console.log("[Assign team] csvFiles:", csvFiles);
        console.log("[Assign team] selectedMembers:", selectedMembers);
        console.log("[Assign team] actualUserIds:", actualUserIds);

        let totalJobsCreated = 0;
        let hasDistributedFiles = false;
        
        // Only run CSV distribution when more than one actual collaborator is selected.
        // For a single assignee we keep the original batch so the file stays attached.
        if (csvFiles.length > 0 && actualUserIds.length > 1) {
          hasDistributedFiles = true;
          const ensureRowCount = async (fileId: number, filename?: string) => {
            if (!project) return 0;
            try {
              const splitResponse = await splitProjectFile({
                project_id: parseInt(project.id),
                file_id: fileId,
                auto_create_batches: false,
              });
              const fetchedRows = splitResponse?.total_rows || 0;

              if (fetchedRows > 0) {
                setCsvRowCounts((prev) => {
                  const updated = { ...prev, [fileId]: fetchedRows };
                  const newTotal = Object.values(updated).reduce(
                    (sum, count) => sum + (count || 0),
                    0
                  );
                  setTotalRows(newTotal);
                  return updated;
                });
              }

              console.log(
                `Fetched row count for ${filename || `file ${fileId}`}:`,
                fetchedRows
              );
              return fetchedRows;
            } catch (error: any) {
              console.error(
                `Failed to fetch row count for ${filename || `file ${fileId}`}:`,
                error
              );
              toast.error(
                `Failed to get row count for ${filename || "file"}. Using backend defaults.`
              );
              return 0;
            }
          };

          for (const csvFile of csvFiles) {
            let rowsForFile = csvRowCounts[csvFile.file_id] || 0;
            if (rowsForFile === 0) {
              rowsForFile = await ensureRowCount(csvFile.file_id, csvFile.filename);
            }

            // Calculate chunk size so each user gets exactly 1 chunk (1 job per user)
            // We want: numChunks = numUsers, so chunkSize = rowsPerMember
            const numUsers = actualUserIds.length;
            const rowsPerMember = rowsForFile > 0 ? Math.ceil(rowsForFile / numUsers) : 0;

            // Calculate chunk size to ensure we get exactly numUsers chunks
            // chunkSize = rowsPerMember ensures: Math.ceil(rowsForFile / chunkSize) = numUsers
            // Example: rowsForFile = 30, numUsers = 2 → rowsPerMember = 15 → chunkSize = 15 → 2 chunks ✓
            // Example: rowsForFile = 31, numUsers = 2 → rowsPerMember = 16 → chunkSize = 16 → 2 chunks (16+15) ✓
            // Example: rowsForFile = 10, numUsers = 2 → rowsPerMember = 5 → chunkSize = 5 → 2 chunks (5+5) ✓
            // Minimum chunk size is 1 (allow small chunks if file is small)
            const finalChunkSize = rowsPerMember > 0 ? Math.max(1, rowsPerMember) : undefined;
            const expectedChunks =
              rowsForFile > 0 && finalChunkSize
                ? Math.ceil(rowsForFile / finalChunkSize)
                : "backend";

            console.log(
              `Distributing ${rowsForFile || "unknown"
              } rows from ${csvFile.filename} to ${numUsers} users, chunk_size: ${finalChunkSize ?? "auto"
              }, expected_chunks: ${expectedChunks} (target ${numUsers})`
            );

            try {
              const distributeResponse = await distributeFileToUsers({
                project_id: parseInt(project!.id),
                file_id: csvFile.file_id,
                chunk_size: finalChunkSize,
                user_ids: actualUserIds,
                // Use first_takes_remainder to ensure each user gets consecutive chunks
                // This ensures each user gets 1 job with their chunk when numChunks = numUsers
                distribution_method: 'first_takes_remainder',
                notes: instructions || undefined,
              });

              console.log(`Distribution response for ${csvFile.filename}:`, distributeResponse);

              // Each user should get 1 batch (1 job), so total jobs = number of users
              const jobsCreated = distributeResponse.batches_created || actualUserIds.length;
              totalJobsCreated += jobsCreated;

              const actualRowsPerMember = Math.ceil(rowsForFile / numUsers);
              toast.success(
                `File ${csvFile.filename}: ${actualRowsPerMember} rows per member • ${jobsCreated} job(s) created (1 job per member)`
              );
            } catch (error: any) {
              console.error(`Failed to distribute CSV file ${csvFile.filename}:`, error);
              toast.error(`Failed to distribute ${csvFile.filename}: ${error.message}`);
            }
          }

          if (totalJobsCreated > 0) {
            toast.success(`Total: ${totalJobsCreated} job(s) created for ${actualUserIds.length} team member(s)`);
            
            // Delete the original batch after distributing files successfully
            // This prevents creating an extra job for the original file
            try {
              await deleteBatch(parseInt(batchId));
              console.log(`Original batch ${batchId} deleted after distributing files`);
            } catch (error: any) {
              console.error(`Failed to delete original batch ${batchId}:`, error);
              // Don't show error to user as distribution was successful
            }
          }
        }
        
        // Only assign original batch if we didn't distribute any CSV files
        // This prevents creating an extra job for the original file
        if (!hasDistributedFiles && actualUserIds.length > 0) {
          // No CSV files to split → simple batch assignment only
          try {
            await assignBatchToUsers({
              batch_id: parseInt(batchId),
              user_ids: actualUserIds,
              notes: instructions || undefined,
            });
            toast.success(`Batch assigned to ${actualUserIds.length} team member(s)`);
          } catch (error: any) {
            console.error("Failed to assign batch:", error);
            toast.error(error.message || "Failed to assign batch");
            return;
          }
        }

        // Save pending emails to batch metadata (if any)
        if (pendingEmails.length > 0) {
          const batch = await getBatch(parseInt(batchId));
          const currentMetadata = batch.batch_metadata || {};
          const existingPendingEmails = currentMetadata.assigned_pending_emails || [];
          const updatedPendingEmails = [...new Set([...existingPendingEmails, ...pendingEmails])];

          await updateBatch(parseInt(batchId), {
            batch_metadata: {
              ...currentMetadata,
              assigned_pending_emails: updatedPendingEmails
            }
          });
        }

        const totalAssigned = actualUserIds.length + pendingEmails.length;
        if (csvFiles.length > 0 && totalJobsCreated > 0) {
          toast.success(`${totalJobsCreated} job(s) created - ${rowsPerMember} câu per member`);
        } else if (totalAssigned > 0) {
          toast.success(`Batch assigned to ${totalAssigned} team member(s)`);
        }

        // Redirect to annotate page to see all jobs
        router.push(`/${projectSlug}/annotate`);
      }
    } catch (error: any) {
      console.error("Failed to start labeling:", error);
      toast.error(error.message || "Failed to assign batch");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!project) {
      toast.error("Project not found");
      return;
    }

    setIsSendingInvite(true);
    try {
      // Map role names to role_ids
      const roleMap: Record<string, number> = {
        "Co-Owner": 4,
        "Labeler": 5,
        "Viewer": 6,
      };

      await createInvitation(parseInt(project.id), {
        email: inviteEmail,
        role_id: roleMap[inviteRole] || 5,
      });

      toast.success(`Invitation sent to ${inviteEmail}`);

      // Reload team data
      await loadTeamData();

      // Clear form
      setInviteEmail("");
      setInviteRole("Labeler");

    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      // Add new files to existing ones (avoid duplicates)
      setUploadFiles(prev => {
        const newFiles = filesArray.filter(
          newFile => !prev.some(existingFile =>
            existingFile.name === newFile.name && existingFile.size === newFile.size
          )
        );
        return [...prev, ...newFiles];
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveBatchFile = async (fileId: number) => {
    try {
      // TODO: Call API to remove file from batch
      // For now, just remove from local state
      setBatchFiles(prev => prev.filter(f => f.file_id !== fileId));
      toast.success("File removed from batch");
    } catch (error: any) {
      console.error("Failed to remove file:", error);
      toast.error("Failed to remove file");
    }
  };

  const handleUploadMore = async () => {
    if (uploadFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    if (!project || !batchId) {
      toast.error("Project or batch not found");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading(`Uploading ${uploadFiles.length} files...`);

    try {
      // Step 1: Upload files to project
      const uploadResponse = await uploadFilesToProject(parseInt(project.id), uploadFiles);

      toast.success("Files uploaded successfully!", { id: loadingToast });

      // Step 2: Extract file_ids from the files array
      const fileIds = uploadResponse?.files?.map(file => file.file_id) || [];

      // Step 3: Get the newly uploaded files info
      if (uploadResponse?.success && fileIds.length > 0) {
        const projectFiles = await getProjectFiles(parseInt(project.id));

        // Filter to get only the newly uploaded files
        const newFiles = projectFiles.filter(file =>
          fileIds.includes(file.file_id)
        );

        // Step 4: Add new files to current batch files (local state)
        setBatchFiles(prev => [...prev, ...newFiles]);

        // Step 5: Update batchFileIds to include new file IDs
        setBatchFileIds(prev => [...prev, ...fileIds]);

        toast.success(`${newFiles.length} files added to batch!`);
      }

      // Step 5: Reset and close dialog
      setUploadFiles([]);
      setIsUploadOpen(false);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload files", { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading batch data...</p>
      </div>
    );
  }

  // Format date for display
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload More
          </Button>
          <Button variant="outline" onClick={() => setIsRenameOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        {/* Left: Batch Details */}
        <div className="space-y-4">
          {/* Batch Title and Info */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">{batchName}</h1>
            {batchData?.created_at && (
              <Badge variant="secondary" className="text-xs">
                Uploaded {formatUploadDate(batchData.created_at)}
              </Badge>
            )}
          </div>

          {/* Files Grid */}
          {batchFiles.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {batchFiles.map((file) => {
                const isImage = file.file_type?.startsWith('image/') ||
                  file.filename?.match(/\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i);
                const imageUrl = file.file_path
                  ? (file.file_path.startsWith('http') ? file.file_path : `/api/files/${file.file_id}`)
                  : null;

                return (
                  <div key={file.file_id} className="relative group space-y-2">
                    <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden">
                      {isImage && imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={file.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-full items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </>
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                      <button
                        onClick={() => handleRemoveBatchFile(file.file_id)}
                        className="absolute top-1 right-1 z-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs truncate" title={file.filename}>
                      {file.filename || `File ${file.file_id}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No files in this batch</p>
            </div>
          )}
        </div>

        {/* Right: Labeling Options Sidebar */}
        <Card className="p-6 flex flex-col h-full">
          {!selectedOption && (
            <>
              <h3 className="font-semibold mb-6">How do you want to label your files?</h3>
            </>
          )}

          {selectedOption === "team" && (
            <>
              <h3 className="font-semibold mb-4">Assign Files to Team Members</h3>
              {totalRows > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Total rows to Assign</Label>
                    <span className="text-sm text-muted-foreground">
                      {totalRows} / {totalRows}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedOption && (
            <div className="space-y-3">


              {/* Label Myself Option */}
              <Card
                className="p-4 border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={async () => {
                  setSelectedOption("myself");
                  if (project) {
                    try {
                      await setLabelingType(parseInt(project.id), { labeling_type: "myself" });
                      toast.success("Labeling type set to: Label Myself");
                    } catch (error: any) {
                      console.error("Failed to set labeling type:", error);
                      toast.error("Failed to set labeling type");
                    }
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Label Myself</div>
                    <div className="text-sm text-muted-foreground">
                      Label images with our AI labeling tools.
                    </div>
                  </div>
                </div>
              </Card>

              {/* Label With My Team Option */}
              <Card
                className="p-4 border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={async () => {
                  setSelectedOption("team");
                  if (project) {
                    try {
                      await setLabelingType(parseInt(project.id), { labeling_type: "team" });
                      toast.success("Labeling type set to: Label with Team");
                    } catch (error: any) {
                      console.error("Failed to set labeling type:", error);
                      toast.error("Failed to set labeling type");
                    }
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold mb-1">Label With My Team</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Split up the labeling work across your team.
                    </div>
                  </div>
                </div>
              </Card>

              {/* Auto-Label Option */}
              {/* <Card className="p-4 border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Auto-Label Entire Batch</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Use your own custom model or a zero-shot model to automatically label your entire batch.
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Try with SAM3
                    </Button>
                  </div>
                </div>
              </Card> */}

              {/* Hire Outsourced Labelers Option */}
              {/* <Card className="p-4 border hover:border-primary/40 transition-colors cursor-pointer opacity-60">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold mb-1">Hire Outsourced Labelers</div>
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                        Upgrade
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Work with a professional labeling team vetted by our team.
                    </div>
                  </div>
                </div>
              </Card> */}
            </div>
          )}

          {selectedOption === "myself" && (
            <div className="space-y-4">
              {totalRows > 0 ? (
                <p className="text-sm text-muted-foreground">
                  You will label all <span className="font-semibold">{totalRows} rows</span> in this batch.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You will label all {batchFiles.length} files in this batch.
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedOption(null)} disabled={isAssigning}>
                  Back
                </Button>
                <Button onClick={handleStartLabeling} disabled={isAssigning}>
                  {isAssigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Start Labeling"
                  )}
                </Button>
              </div>
            </div>
          )}

          {selectedOption === "team" && (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
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
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-muted-foreground" />
                      <h4 className="font-semibold">Invite Team Members</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowTeamMembers(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="invite-email"
                          placeholder="Email address"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={isSendingInvite}
                          className="flex-1"
                        />
                        <Select
                          value={inviteRole}
                          onValueChange={(v: any) => setInviteRole(v)}
                          disabled={isSendingInvite}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Co-Owner">Co-Owner</SelectItem>
                            <SelectItem value="Labeler">Labeler</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={handleSendInvitation}
                      disabled={isSendingInvite || !inviteEmail.trim()}
                      className="w-full"
                    >
                      {isSendingInvite ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {!showInstructions && !showTeamMembers && (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <p className="text-sm font-medium">
                    Selected Team Members
                  </p>

                  {/* Collaborators (Accepted Members) */}
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user_id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedMembers.includes(collab.user_id.toString())
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-muted/50'
                        }`}
                      onClick={() => handleMemberToggle(collab.user_id.toString())}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{collab.user_email || collab.user_username || 'Unknown'}</p>
                            <Badge variant="outline" className="text-xs">{getRoleName(collab.role_id)}</Badge>
                          </div>
                        </div>
                      </div>
                      {selectedMembers.includes(collab.user_id.toString()) && (
                        <Badge variant="secondary">
                          {totalRows > 0 ? `${rowsPerMember} câu` : `${filesPerMember} files`}
                        </Badge>
                      )}
                    </div>
                  ))}

                  {/* Pending Members - Can be selected */}
                  {invitations.filter(inv => inv.status === 'pending').map((invite) => (
                    <div
                      key={invite.invitation_id}
                      className={`flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50 cursor-pointer transition-colors ${selectedMembers.includes(`pending_${invite.invitation_id}`)
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-orange-100'
                        }`}
                      onClick={() => handleMemberToggle(`pending_${invite.invitation_id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invite.email}</p>
                            <Badge variant="outline" className="text-xs">{getRoleName(invite.role_id)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">Pending Invitation</Badge>
                          </p>
                        </div>
                      </div>
                      {selectedMembers.includes(`pending_${invite.invitation_id}`) && (
                        <Badge variant="secondary">
                          {totalRows > 0 ? `${rowsPerMember} câu` : `${filesPerMember} files`}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t mt-auto justify-end flex-shrink-0">
                <Button variant="outline" onClick={() => setSelectedOption(null)} disabled={isAssigning}>
                  Back
                </Button>
                <Button
                  onClick={handleStartLabeling}
                  disabled={selectedMembers.length === 0 || isAssigning}
                  className={selectedMembers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Start Labeling"
                  )}
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
          <Input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            disabled={isRenaming}
            placeholder="Enter batch name"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!batchId || !batchName.trim()) {
                  toast.error("Please enter a valid batch name");
                  return;
                }

                setIsRenaming(true);
                try {
                  await updateBatch(parseInt(batchId), {
                    name: batchName.trim()
                  });
                  toast.success("Batch renamed successfully!");
                  setIsRenameOpen(false);
                  // Reload batch data to get updated name
                  await loadBatchData();
                } catch (error: any) {
                  console.error("Failed to rename batch:", error);
                  toast.error(error.message || "Failed to rename batch");
                } finally {
                  setIsRenaming(false);
                }
              }}
              disabled={isRenaming || !batchName.trim()}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload More Files</DialogTitle>
            <DialogDescription>Add more files to this batch</DialogDescription>
          </DialogHeader>

          {uploadFiles.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Click to browse or drag and drop files here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports: .jpg, .png, .pdf, .xlsx, .json, .csv
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{uploadFiles.length} file(s) selected</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add More
                </Button>
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                {uploadFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleRemoveFile(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".jpg,.png,.bmp,.webp,.avif,.pdf,.xlsx,.json,.csv"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                setUploadFiles([]);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadMore}
              disabled={isUploading || uploadFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


