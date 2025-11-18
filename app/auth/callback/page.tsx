"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/app/api/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const picture = searchParams.get("picture");
    const error = searchParams.get("error");

    if (error) {
      console.error("OAuth Error:", error);
      router.replace("/login?error=oauth_failed");
      return;
    }

    if (accessToken) {
      try {
        localStorage.setItem("access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }
        if (picture) {
          // Save the picture URL separately for easy access by the sidebar
          localStorage.setItem("picture", picture);
        }
      } catch (e) {
        console.error("Failed to save auth data to localStorage", e);
        router.replace("/login?error=storage_failed");
        return;
      }

      // Check for pending invitation token
      const pendingInviteToken = localStorage.getItem("pending_invite_token");
      if (pendingInviteToken) {
        // Remove the pending token
        localStorage.removeItem("pending_invite_token");
        
        // Redirect to accept invitation page to handle acceptance
        router.replace(`/invites/accept?token=${pendingInviteToken}`);
        return;
      }

      // Async function to handle user info and redirect
      const handleRedirect = async () => {
        // Get user info to validate redirect URL
        let userRoleId: number | null = null;
        try {
          const me = await getMe();
          userRoleId = me?.role_id || null;
          // Update localStorage with user info
          if (me) {
            localStorage.setItem("user", JSON.stringify(me));
          }
        } catch (e) {
          console.error("Failed to get user info:", e);
        }

        // Check for saved redirect URL from Google login
        const redirectAfterLogin = localStorage.getItem("redirect_after_login");
        if (redirectAfterLogin) {
          // Remove the saved redirect URL
          localStorage.removeItem("redirect_after_login");
          
          // Extract path + search from URL if it's a full URL, otherwise use as-is
          let redirectPath: string;
          try {
            // Try to parse as full URL (with protocol)
            if (redirectAfterLogin.startsWith('http://') || redirectAfterLogin.startsWith('https://')) {
              const url = new URL(redirectAfterLogin);
              redirectPath = url.pathname + url.search;
            } else {
              // Already a path + search (relative URL)
              redirectPath = redirectAfterLogin;
            }
          } catch {
            // If parsing fails, assume it's already a path + search
            redirectPath = redirectAfterLogin;
          }
          
          // Validate redirect path based on user role
          const isAdminRoute = redirectPath.includes('/admin/');
          const isAdmin = userRoleId === 1; // Admin role_id = 1
          
          // Only allow redirect to admin routes if user is admin
          if (isAdminRoute && !isAdmin) {
            // User is not admin but trying to access admin route, redirect to projects
            console.warn("Non-admin user attempted to access admin route, redirecting to /projects");
            router.replace("/projects");
          } else {
            // Safe to redirect to saved URL
            router.replace(redirectPath);
          }
        } else {
          // Default redirect to projects
          router.replace("/projects");
        }
      };

      handleRedirect();
    } else {
      // Handle case where no token is provided
      router.replace("/login?error=no_token");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}
