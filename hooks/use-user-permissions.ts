import { useState, useEffect } from "react";
import { getMe, type MeResponse } from "@/app/api/auth";

export interface UserPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canViewAdmin: boolean;
  roleId: number | null;
  roleName: string | null;
  isLoading: boolean;
}

/**
 * Hook to get user permissions based on role
 * Role mapping: 1=Admin, 2=User, 3=Owner, 4=Co-Owner, 5=Labeler, 6=Viewer
 */
export function useUserPermissions(): UserPermissions {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: true, // Default to true, will be updated based on role
    canViewAdmin: false,
    roleId: null,
    roleName: null,
    isLoading: true,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const me: MeResponse = await getMe();
        const roleId = me.role_id;
        const roleName = me.role_name || "";

        // Admin (1) - full access
        if (roleId === 1) {
          setPermissions({
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canExport: true,
            canViewAdmin: true,
            roleId,
            roleName,
            isLoading: false,
          });
          return;
        }

        // User (2), Owner (3), Co-Owner (4), Labeler (5) - CRUD all but no Admin
        if (roleId === 2 || roleId === 3 || roleId === 4 || roleId === 5) {
          setPermissions({
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canExport: true,
            canViewAdmin: false,
            roleId,
            roleName,
            isLoading: false,
          });
          return;
        }

        // Viewer (6) - Read only, can export, no Admin
        if (roleId === 6) {
          setPermissions({
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canExport: true,
            canViewAdmin: false,
            roleId,
            roleName,
            isLoading: false,
          });
          return;
        }

        // Default: no permissions
        setPermissions({
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canExport: false,
          canViewAdmin: false,
          roleId,
          roleName,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to load user permissions:", error);
        setPermissions((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadPermissions();
  }, []);

  return permissions;
}

