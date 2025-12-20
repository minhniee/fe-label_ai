"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Upload, Edit, Plus, Users, FileText, X, Loader2, Zap, Database, Sparkles, User, UserPlus, ChevronRight, Send, Columns } from "lucide-react";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import { projectToSlug, slugToProjectId } from "@/types/project";
import { getBatch, updateBatch, assignBatchToUsers, distributeFileToUsers, splitProjectFile, deleteBatch } from "@/app/api/batch";
import { getProjectFiles, uploadFilesToProject, createInvitation, listPendingInvitations, setLabelingType, getProjectCollaborators, deleteProjectFile } from "@/app/api/project";
import { getMe } from "@/app/api/auth";
import api from "@/app/api/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import React from "react";
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

export default function ProjectBatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectFromSlug();
  const projectSlug = params.projectId as string;
  const batchId = searchParams.get("batchId");
  // Extract project ID from slug - this works even if project object isn't loaded yet
  const projectId = projectSlug ? slugToProjectId(projectSlug) : null;

  // State
  const [batchData, setBatchData] = useState<any>(null);
  const [batchFiles, setBatchFiles] = useState<any[]>([]);
  const [batchFileIds, setBatchFileIds] = useState<number[]>([]); // Store file IDs of this batch
  const [isLoading, setIsLoading] = useState(true);
  const [batchName, setBatchName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"myself" | "team" | null>(null);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Co-Owner" | "Labeler" | "Viewer">("Labeler");
  const [isAssigning, setIsAssigning] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [filePendingDeletion, setFilePendingDeletion] = useState<any | null>(null);

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
  const [fileColumns, setFileColumns] = useState<Record<number, string[]>>({});
  const [columnsLoading, setColumnsLoading] = useState<Record<number, boolean>>({});

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

  const loadBatchData = useCallback(async () => {
    if (!batchId || !projectId) return;
    
    try {
      setIsLoading(true);

      // Fetch batch details
      const batch = await getBatch(parseInt(batchId));
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
        // Use projectId from slug if project object isn't available yet
        const projectIdToUse = project?.id || projectId;
        if (!projectIdToUse) {
          console.error("No project ID available");
          toast.error("Project information not available");
          setBatchFiles([]);
          return;
        }
        const files = await getProjectFiles(parseInt(projectIdToUse));
        console.log("All project files:", files.length);
        const batchSpecificFiles = files.filter(f =>
          targetFileIds.includes(f.file_id)
        );
        console.log("Batch specific files:", batchSpecificFiles.length);
        setBatchFiles(batchSpecificFiles);

        // Extract row counts and column names from file objects if available
        // This is important for chunk files created from split operations
        const fileRowCounts: { [fileId: number]: number } = {};
        const fileColumnNames: Record<number, string[]> = {};
        
        for (const file of batchSpecificFiles) {
          // Use line_count from file object if available (for chunk files)
          // Type assertion needed as ProjectFileResponse might not have these fields in type definition
          const fileAny = file as any;
          if (fileAny.line_count && typeof fileAny.line_count === 'number') {
            fileRowCounts[file.file_id] = fileAny.line_count;
            console.log(`[Load Batch] File ${file.file_id} has line_count: ${fileAny.line_count}`);
          }
          
          // Parse column names from file.content if available (JSON format)
          if (fileAny.content) {
            try {
              const parsedContent = JSON.parse(fileAny.content);
              if (Array.isArray(parsedContent)) {
                fileColumnNames[file.file_id] = parsedContent;
                console.log(`[Load Batch] File ${file.file_id} has column names in content: ${parsedContent.length} columns`);
              }
            } catch (e) {
              // Not JSON, might be actual CSV content - will be handled by fetchCsvColumns
            }
          }
        }
        
        // Update row counts state with file metadata
        if (Object.keys(fileRowCounts).length > 0) {
          setCsvRowCounts(prev => {
            const updated = { ...prev, ...fileRowCounts };
            const newTotal = Object.values(updated).reduce(
              (sum: number, count: any) => sum + (count || 0),
              0
            );
            setTotalRows(newTotal);
            return updated;
          });
        }
        
        // Update column names state with file metadata
        if (Object.keys(fileColumnNames).length > 0) {
          setFileColumns(prev => ({ ...prev, ...fileColumnNames }));
        }

        // Fetch columns from CSV files (async, don't await)
        // This will only fetch for files that don't already have column names
        fetchCsvColumns(batchSpecificFiles).catch((err: any) => {
          console.error('Failed to fetch CSV columns:', err);
        });

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
  }, [batchId, projectId, project?.id, searchParams]);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load batch data - use projectId from slug instead of waiting for project object
  useEffect(() => {
    if (batchId && projectId) {
      loadBatchData();
    }
  }, [batchId, projectId, loadBatchData]);

  // Load team members and invitations when user selects "Label with my team"
  useEffect(() => {
    if (selectedOption === "team" && project) {
      loadTeamData();
    }
  }, [selectedOption, project]);

  // Listen for page refresh event to reload team data
  useEffect(() => {
    const handlePageRefresh = () => {
      if (project && selectedOption === "team") {
        loadTeamData();
      }
    };

    window.addEventListener('page-refresh', handlePageRefresh);
    return () => window.removeEventListener('page-refresh', handlePageRefresh);
  }, [project, selectedOption]);

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
      5: "Labeler",
    };
    return roleNames[roleId] || "Unknown";
  };

  // Parse CSV content to extract column names
  const parseCSVColumns = (content: string): string[] => {
    try {
      if (!content || content.trim().length === 0) {
        return [];
      }
      
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) {
        return [];
      }
      
      // Parse first line as headers
      const firstLine = lines[0].trim();
      
      // Improved CSV parsing to handle quoted values and commas inside quotes
      const columns: string[] = [];
      let currentColumn = '';
      let insideQuotes = false;
      
      for (let i = 0; i < firstLine.length; i++) {
        const char = firstLine[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      
      // Add the last column
      if (currentColumn.trim() || columns.length > 0) {
        columns.push(currentColumn.trim());
      }
      
      // Clean up columns (remove surrounding quotes)
      const cleanedColumns = columns
        .map(col => col.replace(/^"|"$/g, '').trim())
        .filter(col => col.length > 0);
      
      return cleanedColumns;
    } catch (error) {
      console.error('Error parsing CSV columns:', error);
      return [];
    }
  };

  // Fetch CSV columns from files
  const fetchCsvColumns = async (files: any[]) => {
    for (const file of files) {
      const fileName = (file as any).file_name || file.filename || '';
      if (!fileName.toLowerCase().endsWith('.csv')) {
        continue;
      }

      // Skip if already loaded or loading
      if (fileColumns[file.file_id] || columnsLoading[file.file_id]) {
        continue;
      }
      
      // Skip if file already has column names in content field (JSON format)
      const fileAny = file as any;
      if (fileAny.content) {
        try {
          const parsedContent = JSON.parse(fileAny.content);
          if (Array.isArray(parsedContent) && parsedContent.length > 0) {
            console.log(`[fetchCsvColumns] File ${file.file_id} already has column names in content, skipping API fetch`);
            // Set columns from content
            setFileColumns((prev) => ({ ...prev, [file.file_id]: parsedContent }));
            continue;
          }
        } catch (e) {
          // Not JSON, continue to fetch from API
        }
      }

      try {
        setColumnsLoading((prev) => ({ ...prev, [file.file_id]: true }));
        
        // Try to get file content from annotations API using API client (with auth)
        try {
          const response = await api.get(`/annotations/files/${file.file_id}/content`);
          const data = response.data;
          
          const content = data.content || '';
          
          if (!content || typeof content !== 'string') {
            setFileColumns((prev) => ({ ...prev, [file.file_id]: [] }));
            continue;
          }

          const columns = parseCSVColumns(content);
          if (columns.length > 0) {
            setFileColumns((prev) => ({ ...prev, [file.file_id]: columns }));
          }
        } catch (apiError: any) {
          // If annotations API fails (e.g., file not in dataset), skip
          console.log(`[fetchCsvColumns] Could not fetch columns for file ${file.file_id}:`, apiError.message);
          setFileColumns((prev) => ({ ...prev, [file.file_id]: [] }));
        }
      } catch (error) {
        console.error(`Failed to fetch columns for file ${file.file_id}:`, error);
        setFileColumns((prev) => ({ ...prev, [file.file_id]: [] }));
      } finally {
        setColumnsLoading((prev) => {
          const updated = { ...prev };
          delete updated[file.file_id];
          return updated;
        });
      }
    }
  };

  const ensureRowCount = useCallback(
    async (fileId: number, filename?: string) => {
      const projectIdToUse = project?.id || projectId;
      if (!projectIdToUse) return 0;
      try {
        const splitResponse = await splitProjectFile({
          project_id: parseInt(projectIdToUse),
          file_id: fileId,
          auto_create_batches: false,
        });
        const fetchedRows = splitResponse?.total_rows || 0;

        if (fetchedRows > 0) {
          setCsvRowCounts((prev) => {
            const updated = { ...prev, [fileId]: fetchedRows };
            const newTotal = Object.values(updated).reduce(
              (sum: number, count: any) => sum + (count || 0),
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
    },
    [project?.id, projectId]
  );

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
        // We detect CSVs either by filename/type OR because we've already
        // computed row counts for them (in csvRowCounts), which also covers
        // files uploaded later via "Upload More".
        const csvFiles = batchFiles.filter((f) => {
          const rawName = f.filename || f.file_name || "";
          const loweredName =
            rawName && typeof rawName === "string" ? rawName.toLowerCase() : "";
          const loweredType =
            f.file_type && typeof f.file_type === "string"
              ? f.file_type.toLowerCase()
              : "";
          const looksLikeCsv =
            (loweredName && loweredName.endsWith(".csv")) ||
            (loweredType && loweredType.includes("csv"));

          const hasRowCount = typeof csvRowCounts[f.file_id] === "number";

          return looksLikeCsv || hasRowCount;
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

          for (const csvFile of csvFiles) {
            let rowsForFile = csvRowCounts[csvFile.file_id] || 0;
            if (rowsForFile === 0) {
              const fileName = (csvFile as any).file_name || csvFile.filename || '';
              rowsForFile = await ensureRowCount(csvFile.file_id, fileName);
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

            const csvFileName = (csvFile as any).file_name || csvFile.filename || 'unknown file';
            console.log(
              `Distributing ${rowsForFile || "unknown"
              } rows from ${csvFileName} to ${numUsers} users, chunk_size: ${finalChunkSize ?? "auto"
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
              });

              const csvFileName = (csvFile as any).file_name || csvFile.filename || 'unknown file';
              console.log(`Distribution response for ${csvFileName}:`, distributeResponse);

              // Each user should get 1 batch (1 job), so total jobs = number of users
              const jobsCreated = distributeResponse.batches_created || actualUserIds.length;
              totalJobsCreated += jobsCreated;

              const actualRowsPerMember = Math.ceil(rowsForFile / numUsers);
              toast.success(
                `File ${csvFileName}: ${actualRowsPerMember} rows per member • ${jobsCreated} job(s) created (1 job per member)`
              );
            } catch (error: any) {
              const csvFileName = (csvFile as any).file_name || csvFile.filename || 'unknown file';
              console.error(`Failed to distribute CSV file ${csvFileName}:`, error);
              toast.error(`Failed to distribute ${csvFileName}: ${error.message}`);
            }
          }

          if (totalJobsCreated > 0) {
            toast.success(`Total: ${totalJobsCreated} job(s) created for ${actualUserIds.length} team member(s)`);
            
            // Delete the original batch after distributing files successfully
            // This prevents creating an extra job for the original file
            try {
              await deleteBatch(parseInt(batchId));
              console.log(`Original batch ${batchId} deleted after distributing files`);
              
              // Refresh server components immediately after deleting batch
              router.refresh();
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
            });
            toast.success(`Batch assigned to ${actualUserIds.length} team member(s)`);
            // Refresh server components to reflect new assignments
            router.refresh();
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

        // Refresh server components to reflect new assignments and batch deletions
        router.refresh();

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

  const handleAutoLabelNavigation = () => {
    if (!batchId) {
      toast.error("Batch information is missing");
      return;
    }

    const params = new URLSearchParams();
    if (batchName) {
      params.set("jobName", batchName);
    }

    const query = params.toString();
    router.push(`/${projectSlug}/annotate/job/${batchId}/auto-label${query ? `?${query}` : ""}`);
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSendInvitation = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = inviteEmail.trim();
    
    if (!trimmedEmail) {
      toast.error("Please enter an email address");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
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
        "Owner": 3,
        "Labeler": 5,
      };

      await createInvitation(parseInt(project.id), {
        email: trimmedEmail,
        role_id: roleMap[inviteRole] || 5,
      });

      toast.success(`Invitation sent to ${trimmedEmail}`);

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
    if (!e.target.files) return;

    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
    const filesArray = Array.from(e.target.files);

    const validFiles: File[] = [];
    let rejectedCount = 0;

    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedCount++;
        continue;
      }
      validFiles.push(file);
    }

    if (rejectedCount > 0) {
      toast.error(`Some files were skipped because they exceed 20MB (skipped ${rejectedCount} file(s)).`);
    }

    if (validFiles.length === 0) return;

    // Add new files to existing ones (avoid duplicates)
    setUploadFiles(prev => {
      const newFiles = validFiles.filter(
        newFile => !prev.some(existingFile =>
          existingFile.name === newFile.name && existingFile.size === newFile.size
        )
      );
      return [...prev, ...newFiles];
    });
  };

  const handleRemoveFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveBatchFile = async (fileId: number) => {
    if (!project) {
      toast.error("Project not found");
      return;
    }
    try {
      await deleteProjectFile(parseInt(project.id), fileId);
      setBatchFiles(prev => prev.filter(f => f.file_id !== fileId));
      setBatchFileIds(prev => prev.filter(id => id !== fileId));
      setCsvRowCounts((prev) => {
        const updated = { ...prev };
        if (fileId in updated) {
          delete updated[fileId];
        }
        const newTotal = Object.values(updated).reduce(
          (sum, count) => sum + (count || 0),
          0
        );
        setTotalRows(newTotal);
        return updated;
      });
      // Clear file columns
      setFileColumns((prev) => {
        const updated = { ...prev };
        if (fileId in updated) {
          delete updated[fileId];
        }
        return updated;
      });
      toast.success("File removed from batch");
    } catch (error: any) {
      console.error("Failed to remove file:", error);
      toast.error(error.message || "Failed to remove file");
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

        // Automatically split newly uploaded CSV files to capture row counts
        // Use same logic as handleStartLabeling to ensure consistency
        const newlyUploadedCsvFiles = newFiles.filter((file) => {
          const rawName = file.filename || (file as any).file_name || "";
          const loweredName =
            rawName && typeof rawName === "string" ? rawName.toLowerCase() : "";
          const loweredType =
            file.file_type && typeof file.file_type === "string"
              ? file.file_type.toLowerCase()
              : "";
          const looksLikeCsv =
            (loweredName && loweredName.endsWith(".csv")) ||
            (loweredType && loweredType.includes("csv"));

          // Also check if file already has row count (from previous upload or batch metadata)
          const hasRowCount = typeof csvRowCounts[file.file_id] === "number";

          return looksLikeCsv || hasRowCount;
        });

        console.log("[Upload More] New files:", newFiles);
        console.log("[Upload More] CSV files detected:", newlyUploadedCsvFiles);

        // Ensure row counts and fetch columns for all CSV files
        for (const csvFile of newlyUploadedCsvFiles) {
          try {
            const fileName = csvFile.filename || (csvFile as any).file_name;
            console.log(`[Upload More] Getting row count for file ${csvFile.file_id} (${fileName})`);
            const rowCount = await ensureRowCount(csvFile.file_id, fileName);
            console.log(`[Upload More] Row count for file ${csvFile.file_id}:`, rowCount);
            
            // Also fetch columns
            fetchCsvColumns([csvFile]).catch(err => {
              console.error(`[Upload More] Failed to fetch columns for file ${csvFile.file_id}:`, err);
            });
          } catch (error: any) {
            console.error(`[Upload More] Failed to get row count for file ${csvFile.file_id}:`, error);
            // Continue with other files even if one fails
          }
        }

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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchFiles.map((file) => {
                const fileName = (file as any).file_name || file.filename || '';
                const isImage = file.file_type?.startsWith('image/') ||
                  fileName?.match(/\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i);
                const imageUrl = file.file_path
                  ? (file.file_path.startsWith('http') ? file.file_path : `/api/files/${file.file_id}`)
                  : null;
                const isCsvFile = fileName.toLowerCase().endsWith('.csv');
                const columns = fileColumns[file.file_id] || [];
                const isLoadingFileColumns = columnsLoading[file.file_id] || false;

                return (
                  <div key={file.file_id} className="relative group space-y-2">
                    <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center relative overflow-hidden">
                      {isImage && imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={fileName || `File ${file.file_id}`}
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
                      {isCsvFile && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="absolute top-1 left-1 z-10 p-1.5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90"
                              title="View columns"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Columns className="w-3 h-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" side="right" className="w-auto p-4">
                            <div className="flex items-center gap-2 pb-2 border-b mb-3">
                              <FileText className="h-4 w-4" />
                              <h4 className="text-sm font-semibold truncate max-w-[300px]">{fileName}</h4>
                            </div>
                            <div className="space-y-3">
                              {isLoadingFileColumns ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : columns.length > 0 ? (
                                <>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{columns.length} column{columns.length !== 1 ? 's' : ''} found</span>
                                  </div>
                                  <ScrollArea className="max-h-[200px] w-full rounded-md border p-3">
                                    <div className="flex flex-wrap gap-2">
                                      {columns.map((column, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {column}
                                        </Badge>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </>
                              ) : (
                                <div className="text-xs text-muted-foreground">No columns available</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <button
                        onClick={() => setFilePendingDeletion(file)}
                        className="absolute top-1 right-1 z-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs truncate" title={fileName || `File ${file.file_id}`}>
                      {fileName || `File ${file.file_id}`}
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

              {/* Auto-Label with AI Option */}
              <Card
                className="p-4 border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={handleAutoLabelNavigation}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold mb-1">Auto-Label with AI</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Use AI models to automatically label your entire batch with custom configurations.
                    </div>
                  </div>
                </div>
              </Card>
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
                  variant={showTeamMembers ? "default" : "outline"}
                  onClick={() => {
                    setShowTeamMembers(!showTeamMembers);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Add Team Members
                </Button>
              </div>

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
                          type="email"
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
                            <SelectItem value="Owner">Owner</SelectItem>
                            <SelectItem value="Labeler">Labeler</SelectItem>
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

              {!showTeamMembers && (
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

                  {/* Pending Members - Disabled (not accepted yet) */}
                  {invitations.filter(inv => inv.status === 'pending').map((invite) => {
                    const isDisabled = true; // All pending invitations are disabled until they accept
                    return (
                      <div
                        key={invite.invitation_id}
                        className={`flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50 transition-colors ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : selectedMembers.includes(`pending_${invite.invitation_id}`)
                            ? 'ring-2 ring-primary cursor-pointer'
                            : 'hover:bg-orange-100 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isDisabled) {
                            handleMemberToggle(`pending_${invite.invitation_id}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{invite.email}</p>
                              <Badge variant="outline" className="text-xs">{getRoleName(invite.role_id)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Invitation not accepted yet
                            </p>
                          </div>
                        </div>
                        {!isDisabled && selectedMembers.includes(`pending_${invite.invitation_id}`) && (
                          <Badge variant="secondary">
                            {totalRows > 0 ? `${rowsPerMember} câu` : `${filesPerMember} files`}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
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
        <DialogContent className="w-full max-w-3xl sm:max-w-4xl">
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
                Supports: .csv, .xlsx, .json, .pdf
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

      <AlertDialog
        open={!!filePendingDeletion}
        onOpenChange={(open) => {
          if (!open) setFilePendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete
            <span className="font-medium text-foreground block break-all mt-1">
              {filePendingDeletion?.filename || filePendingDeletion?.file_name} ?
            </span>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (filePendingDeletion) {
                  handleRemoveBatchFile(filePendingDeletion.file_id);
                }
                setFilePendingDeletion(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


