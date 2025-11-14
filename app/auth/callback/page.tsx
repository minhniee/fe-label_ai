"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

      router.replace("/projects");
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
