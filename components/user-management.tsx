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
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  type User,
} from "@/app/api/users";

// ===== Roles from DB =====
// 1: SuperAdmin, 2: Admin, 3: Manager, 4: Labeler

type UiRole = "superadmin" | "admin" | "manager" | "labeler";

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
    role_id: 4 as number, // default Labeler
    password: "",
  });

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role_id: 4 as number,
  });
  const [editOriginalRoleId, setEditOriginalRoleId] = useState<number>(4);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    role: UiRole;
  } | null>(null);

  function mapRoleIdToUiRole(roleId: number): UiRole {
    if (roleId === 1) return "superadmin";
    if (roleId === 2) return "admin";
    if (roleId === 3) return "manager";
    return "labeler";
  }

  function mapUiRoleToRoleId(role: UiRole): number {
    switch (role) {
      case "superadmin":
        return 1;
      case "admin":
        return 2;
      case "manager":
        return 3;
      default:
        return 4;
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
      toast({ title: "You cannot downgrade your own role.", variant: "destructive" });
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
    if (role === "superadmin") return;
    if (currentUserId && userId === currentUserId) return;
    setDeleteTarget({ id: userId, name, role });
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
      case "superadmin":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            SuperAdmin
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Admin
          </Badge>
        );
      case "manager":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Manager
          </Badge>
        );
      case "labeler":
        return <Badge variant="secondary">Labeler</Badge>;
    }
  };

  const countBy = (r: UiRole) => users.filter((u) => u.role === r).length;

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Users in system
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SuperAdmin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("superadmin")}</div>
            <p className="text-xs text-muted-foreground">Highest privileges</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("admin")}</div>
            <p className="text-xs text-muted-foreground">Administrators</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("manager")}</div>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labeler</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countBy("labeler")}</div>
            <p className="text-xs text-muted-foreground">Labelers</p>
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
                  Are you sure you want to delete <b>{deleteTarget.name}</b>? This action
                  cannot be undone.
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
                        <SelectItem value="1">SuperAdmin</SelectItem>
                        <SelectItem value="2">Admin</SelectItem>
                        <SelectItem value="3">Manager</SelectItem>
                        <SelectItem value="4">Labeler</SelectItem>
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
            <div className="text-sm text-muted-foreground mb-3">
              Loading...
            </div>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            requestDeleteUser(user.id, user.name, user.role)
                          }
                          disabled={user.role === "superadmin" ? true : false}
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

      {/* Edit User Dialog (no password field for Admin) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information (password changes not available here)
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
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
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
                  <SelectItem value="1">SuperAdmin</SelectItem>
                  <SelectItem value="2">Admin</SelectItem>
                  <SelectItem value="3">Manager</SelectItem>
                  <SelectItem value="4">Labeler</SelectItem>
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
    </div>
  );
}
