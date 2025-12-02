"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Mail,
  Briefcase,
  Eye,
  Tag,
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword,
  type User,
} from "@/app/api/users";

// ===== Roles from DB =====
// 1: Admin, 2: User, 3: Owner, 4: Co-Owner, 5: Labeler, 6: Viewer

type UiRole = "admin" | "user" | "owner" | "co-owner" | "labeler" | "viewer";

type UserManagementProps = { currentUserId?: number };

interface UserManagementUser {
  id: number;
  name: string;
  email: string;
  role: UiRole;
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserManagementUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const { toast } = useToast();

  // Create dialog state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role_id: 2 as number, // default User
    password: "",
  });

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role_id: 2 as number,
  });
  const [editOriginalRoleId, setEditOriginalRoleId] = useState<number>(2);

  // Change password dialog state (admin resets another user's password)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<{ id: number; name: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    role: UiRole;
  } | null>(null);

  function mapRoleIdToUiRole(roleId: number): UiRole {
    if (roleId === 1) return "admin";
    if (roleId === 2) return "user";
    if (roleId === 3) return "owner";
    if (roleId === 4) return "co-owner";
    if (roleId === 5) return "labeler";
    if (roleId === 6) return "viewer";
    return "user"; // default
  }

  function mapUiRoleToRoleId(role: UiRole): number {
    switch (role) {
      case "admin":
        return 1;
      case "user":
        return 2;
      case "owner":
        return 3;
      case "co-owner":
        return 4;
      case "labeler":
        return 5;
      case "viewer":
        return 6;
      default:
        return 2; // default to User
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getUsers();
        const uiUsers: UserManagementUser[] = data.map((u: User) => ({
          id: u.user_id,
          name: u.username,
          email: u.email,
          role: mapRoleIdToUiRole(u.role_id),
        }));
        setUsers(uiUsers);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ====== Create ======
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return;
    try {
      const created = await createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role_id: newUser.role_id,
      });
      setUsers((prev) => [
        ...prev,
        {
          id: created.user_id,
          name: created.username,
          email: created.email,
          role: mapRoleIdToUiRole(created.role_id),
        },
      ]);
      setNewUser({ username: "", email: "", role_id: 4, password: "" });
      setIsAddUserOpen(false);
      toast({ title: "Created user successfully!" });
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
      toast({ title: "Failed to create user", variant: "destructive" });
    }
  };

  // ====== Edit ======
  const openEditDialog = (u: UserManagementUser) => {
    setEditingUserId(u.id);
    const roleId = mapUiRoleToRoleId(u.role);
    setEditForm({ username: u.name, email: u.email, role_id: roleId });
    setEditOriginalRoleId(roleId);
    setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
    if (editingUserId == null) return;

    // Prevent admin from lowering own role
    if (
      currentUserId &&
      editingUserId === currentUserId &&
      editForm.role_id < editOriginalRoleId
    ) {
      toast({
        title: "You cannot downgrade your own role.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = await apiUpdateUser(editingUserId, {
        username: editForm.username,
        email: editForm.email,
        role_id: editForm.role_id,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                id: updated.user_id,
                name: updated.username,
                email: updated.email,
                role: mapRoleIdToUiRole(updated.role_id),
              }
            : u
        )
      );
      setIsEditOpen(false);
      setEditingUserId(null);
      toast({ title: "Updated user successfully!" });
    } catch (e: any) {
      setError(e?.message || "Failed to update user");
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  };

  // ====== Delete ======
  const requestDeleteUser = (userId: number, name: string, role: UiRole) => {
    if (role === "admin") return; // Prevent deleting Admin users
    if (currentUserId && userId === currentUserId) return;
    setDeleteTarget({ id: userId, name, role });
  };

  const openChangePasswordDialog = (user: UserManagementUser) => {
    // Prevent opening for self; self should use profile change-password flow
    if (currentUserId && user.id === currentUserId) {
      toast({
        title: "You cannot change your own password here.",
        description: "Please use your personal Change Password page instead.",
        variant: "destructive",
      });
      return;
    }
    setPasswordUser({ id: user.id, name: user.name });
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setIsChangePasswordOpen(true);
  };

  const handleChangePassword = async () => {
    if (!passwordUser) return;

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Password is required",
        description: "Please enter and confirm the new password.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must be the same.",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetUserPassword({
        user_id: passwordUser.id,
        new_password: passwordForm.newPassword,
      });
      toast({ title: "Password reset successfully!" });
      setIsChangePasswordOpen(false);
      setPasswordUser(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to reset user password");
      toast({
        title: "Failed to reset user password",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await apiDeleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast({ title: "Deleted user successfully!" });
    } catch (e: any) {
      setError(e?.message || "Failed to delete user");
      toast({ title: "Failed to delete user", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getRoleBadge = (role: UserManagementUser["role"]) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Admin
          </Badge>
        );
      case "user":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            User
          </Badge>
        );
      case "owner":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Owner
          </Badge>
        );
      case "co-owner":
        return (
          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
            Co-Owner
          </Badge>
        );
      case "labeler":
        return <Badge variant="secondary">Labeler</Badge>;
      case "viewer":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Viewer
          </Badge>
        );
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const countBy = (r: UiRole) => users.filter((u) => u.role === r).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
      </div>
      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Users in system</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("admin")}</div>
            <p className="text-xs text-muted-foreground">Administrators</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("user")}</div>
            <p className="text-xs text-muted-foreground">Users</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owner</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("owner")}</div>
            <p className="text-xs text-muted-foreground">Owners</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Co-Owner</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("co-owner")}</div>
            <p className="text-xs text-muted-foreground">Co-Owners</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labeler</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("labeler")}</div>
            <p className="text-xs text-muted-foreground">Labelers</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewer</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("viewer")}</div>
            <p className="text-xs text-muted-foreground">Viewers</p>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <span>
                  Are you sure you want to delete <b>{deleteTarget.name}</b>?
                  This action cannot be undone.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User List</CardTitle>
              <CardDescription>
                Manage user accounts and permissions in the system
              </CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account in the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter strong password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={String(newUser.role_id)}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, role_id: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Limit assignable roles to Admin and User only */}
                        <SelectItem value="1">Admin</SelectItem>
                        <SelectItem value="2">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddUserOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser}>Add User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground mb-3">Loading...</div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openChangePasswordDialog(user)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            requestDeleteUser(user.id, user.name, user.role)
                          }
                          disabled={user.role === "admin" ? true : false}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog (no password field; use Change Password) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. To change password, use the "Change Password" action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="Enter username"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="user@example.com"
                value={editForm.email}
                disabled
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={String(editForm.role_id)}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role_id: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {/* Limit assignable roles to Admin and User only */}
                  <SelectItem value="1">Admin</SelectItem>
                  <SelectItem value="2">User</SelectItem>
                </SelectContent>
              </Select>
              {currentUserId &&
                editingUserId === currentUserId &&
                editForm.role_id < editOriginalRoleId && (
                  <p className="text-xs text-red-600">
                    You cannot downgrade your own role.
                  </p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={
                editingUserId == null ||
                !!(
                  currentUserId &&
                  editingUserId === currentUserId &&
                  editForm.role_id < editOriginalRoleId
                )
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog (admin resets another user's password) */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium">
                {passwordUser?.name || "this user"}
              </span>
              . The user will use this password the next time they log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="Enter new strong password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangePasswordOpen(false);
                setPasswordUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Save Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
