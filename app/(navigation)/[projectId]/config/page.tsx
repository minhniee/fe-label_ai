"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { useProjectFromSlug } from "@/hooks/use-project-from-slug";
import {
  createInvitation,
  listPendingInvitations,
  getProjectCollaborators,
  cancelInvitation,
  resendInvitation,
  updateCollaboratorRole,
  removeCollaborator,
  updateProjectApiKey,
  getProjectApiKey,
} from "@/app/api/project";
import { getMe } from "@/app/api/auth";
import { toast } from "sonner";
import { UserPlus, Mail, MoreVertical, X, Send, Loader2, Key } from "lucide-react";

export default function ProjectConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { project } = useProjectFromSlug();
  const projectId = project?.id;

  // Invite Member State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Owner" | "Labeler">("Labeler");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Invites and Requests State
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<number | null>(null);

  // Team Members State
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<number | null>(null);
  const [updatingRoleCollaboratorId, setUpdatingRoleCollaboratorId] = useState<number | null>(null);
  const [changingRoleForCollaborator, setChangingRoleForCollaborator] = useState<number | null>(null);
  const [confirmRemoveDialog, setConfirmRemoveDialog] = useState<{
    open: boolean;
    collaboratorId: number | null;
    collaboratorName: string;
  }>({ open: false, collaboratorId: null, collaboratorName: "" });

  // API Key State
  const [apiKey, setApiKey] = useState("");
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // Current User State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    loadCurrentUser();
    if (projectId) {
      loadInvitations();
      loadCollaborators();
      loadApiKey();
    }
  }, [projectId]);

  // Listen for page refresh event to reload team data
  useEffect(() => {
    const handlePageRefresh = () => {
      if (projectId) {
        loadInvitations();
        loadCollaborators();
      }
    };

    window.addEventListener('page-refresh', handlePageRefresh);
    return () => window.removeEventListener('page-refresh', handlePageRefresh);
  }, [projectId]);

  const loadCurrentUser = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
    } catch (error: any) {
      console.error("Failed to load current user:", error);
    }
  };

  const loadInvitations = async () => {
    if (!projectId) return;
    setIsLoadingInvitations(true);
    try {
      const invitations = await listPendingInvitations(parseInt(projectId));
      setPendingInvitations(invitations);
      // Refresh server components to reflect invitation changes
      router.refresh();
    } catch (error: any) {
      console.error("Failed to load invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const loadCollaborators = async () => {
    if (!projectId) return;
    setIsLoadingCollaborators(true);
    try {
      const collabs = await getProjectCollaborators(parseInt(projectId));
      setCollaborators(collabs);
      // Refresh server components to reflect team member changes
      router.refresh();
    } catch (error: any) {
      console.error("Failed to load collaborators:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const loadApiKey = async () => {
    if (!projectId) return;
    setIsLoadingApiKey(true);
    try {
      const key = await getProjectApiKey(parseInt(projectId));
      if (key) {
        setApiKey(key);
      }
    } catch (error: any) {
      console.error("Failed to load API key:", error);
    } finally {
      setIsLoadingApiKey(false);
    }
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

    if (!projectId) {
      toast.error("Project not found");
      return;
    }

    setIsSendingInvite(true);
    try {
      const roleMap: Record<string, number> = {
        Owner: 3,
        Labeler: 5,
      };

      await createInvitation(parseInt(projectId), {
        email: trimmedEmail,
        role_id: roleMap[inviteRole] || 5,
      });

      toast.success(`Invitation sent to ${trimmedEmail}`);
      setInviteEmail("");
      setInviteRole("Labeler");
      await loadInvitations();
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!projectId) return;
    setCancelingInviteId(invitationId);
    try {
      await cancelInvitation(parseInt(projectId), invitationId);
      toast.success("Invitation cancelled");
      await loadInvitations();
    } catch (error: any) {
      console.error("Failed to cancel invitation:", error);
      toast.error(error.message || "Failed to cancel invitation");
    } finally {
      setCancelingInviteId(null);
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    if (!projectId) return;
    setResendingInviteId(invitationId);
    try {
      await resendInvitation(parseInt(projectId), invitationId);
      toast.success("Invitation resent");
    } catch (error: any) {
      console.error("Failed to resend invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleChangeRole = async (collaboratorId: number, newRoleId: number) => {
    if (!projectId) return;
    setUpdatingRoleCollaboratorId(collaboratorId);
    try {
      await updateCollaboratorRole(parseInt(projectId), collaboratorId, newRoleId);
      toast.success("Role updated successfully");
      await loadCollaborators();
    } catch (error: any) {
      console.error("Failed to update role:", error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setUpdatingRoleCollaboratorId(null);
      setChangingRoleForCollaborator(null);
    }
  };

  const handleRemoveCollaborator = (collaboratorId: number, collaboratorName: string) => {
    setConfirmRemoveDialog({
      open: true,
      collaboratorId,
      collaboratorName,
    });
  };

  const confirmRemoveCollaborator = async () => {
    if (!projectId || !confirmRemoveDialog.collaboratorId) return;
    const collaboratorId = confirmRemoveDialog.collaboratorId;
    setRemovingCollaboratorId(collaboratorId);
    setConfirmRemoveDialog({ open: false, collaboratorId: null, collaboratorName: "" });
    try {
      await removeCollaborator(parseInt(projectId), collaboratorId);
      toast.success("Member removed from project");
      await loadCollaborators();
    } catch (error: any) {
      console.error("Failed to remove collaborator:", error);
      toast.error(error.message || "Failed to remove member");
    } finally {
      setRemovingCollaboratorId(null);
    }
  };

  const handleSaveApiKey = async () => {
    if (!projectId) return;
    setIsSavingApiKey(true);
    try {
      await updateProjectApiKey(parseInt(projectId), apiKey);
      toast.success("API key saved successfully");
    } catch (error: any) {
      console.error("Failed to save API key:", error);
      toast.error(error.message || "Failed to save API key");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const getRoleName = (roleId: number) => {
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

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage team members, invitations, and project settings
        </p>
      </div>

            {/* Config API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Config API Key
          </CardTitle>
          <CardDescription>
            Configure API key for this project. This key will be used automatically when annotating or using AI features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoadingApiKey || isSavingApiKey}
              />
              <p className="text-sm text-muted-foreground">
                Your API key will be securely stored and used for AI features in this project.
              </p>
            </div>
            <Button
              onClick={handleSaveApiKey}
              disabled={isSavingApiKey || isLoadingApiKey}
            >
              {isSavingApiKey ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Member
          </CardTitle>
          <CardDescription>
            Invite team members to collaborate on this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isSendingInvite}
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v: "Owner" | "Labeler") => setInviteRole(v)}
                disabled={isSendingInvite}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Labeler">Labeler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSendInvitation}
                disabled={isSendingInvite || !inviteEmail.trim()}
                className="w-full sm:w-auto"
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
          </div>
        </CardContent>
      </Card>

      {/* Invites and Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invites and Requests
          </CardTitle>
          <CardDescription>
            Manage pending invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending invitations
            </p>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.invitation_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invite.email}</p>
                      <Badge variant="outline">{getRoleName(invite.role_id)}</Badge>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Invited on {new Date(invite.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvitation(invite.invitation_id)}
                      disabled={resendingInviteId === invite.invitation_id}
                    >
                      {resendingInviteId === invite.invitation_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invite.invitation_id)}
                      disabled={cancelingInviteId === invite.invitation_id}
                    >
                      {cancelingInviteId === invite.invitation_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members with Access Section */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members with Access</CardTitle>
          <CardDescription>
            Manage team members who have access to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCollaborators ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators.map((collab) => {
                  const isCurrentUser = currentUser?.user_id === collab.user_id;
                  return (
                    <TableRow key={collab.collaborator_id}>
                      <TableCell className="font-medium">
                        {collab.user_email || collab.user_username || "Unknown"}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {changingRoleForCollaborator === collab.collaborator_id ? (
                          <Select
                            defaultValue={collab.role_id.toString()}
                            onValueChange={(value) => {
                              handleChangeRole(collab.collaborator_id, parseInt(value));
                            }}
                            disabled={updatingRoleCollaboratorId === collab.collaborator_id || isCurrentUser}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">Owner</SelectItem>
                              <SelectItem value="5">Labeler</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {collab.role_name || getRoleName(collab.role_id)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {changingRoleForCollaborator === collab.collaborator_id ? (
                          <div className="flex items-center gap-2 justify-end">
                            {updatingRoleCollaboratorId === collab.collaborator_id && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChangingRoleForCollaborator(null)}
                              disabled={updatingRoleCollaboratorId === collab.collaborator_id}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isCurrentUser}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setChangingRoleForCollaborator(collab.collaborator_id)}
                                disabled={updatingRoleCollaboratorId === collab.collaborator_id || isCurrentUser}
                              >
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleRemoveCollaborator(
                                    collab.collaborator_id,
                                    collab.user_email || collab.user_username || "Unknown"
                                  )
                                }
                                disabled={removingCollaboratorId === collab.collaborator_id || isCurrentUser}
                              >
                                Remove from Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Remove Dialog */}
      <AlertDialog
        open={confirmRemoveDialog.open}
        onOpenChange={(open) => {
          if (!removingCollaboratorId) {
            setConfirmRemoveDialog({ open, collaboratorId: null, collaboratorName: "" });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{confirmRemoveDialog.collaboratorName}</strong> from this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingCollaboratorId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveCollaborator}
              disabled={!!removingCollaboratorId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingCollaboratorId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

