"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FPTLogo } from "@/components/fpt-logo";
import { LoginForm } from "@/components/login-form";
import { getMe } from "@/app/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    // Extract callback_url from query params to display to the user
    const searchParams = new URLSearchParams(window.location.search);
    const cbUrl = searchParams.get('callback_url');
    if (cbUrl) {
      try {
        setCallbackUrl(decodeURIComponent(cbUrl));
      } catch (e) {
        console.error("Failed to decode callback_url:", e);
      }
    }
    const checkAuth = async () => {
      try {
        // Check if user has valid token
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        
        if (token) {
          // Verify token is valid by calling /auth/me
          try {
            await getMe();
            // User is already authenticated, redirect to dashboard
            setIsAuthenticated(true);
            router.replace("/dashboard");
            return;
          } catch (error) {
            // Token is invalid, clear it and show login form
            console.log("Token invalid, showing login form");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
          }
        }
        
        // No token or invalid token, show login form
        setIsChecking(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking authentication
  if (isChecking || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">
            {isAuthenticated ? "Redirecting to dashboard..." : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form (50%) */}
      <div className="w-1/2 relative flex flex-col justify-center p-8 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <div className="flex items-center justify-center mb-2">
              <FPTLogo
                size="lg"
                showText={true}
              />
            </div>
            <p className="text-muted-foreground text-sm animate-fadeIn [animation-delay:200ms] opacity-0">
              AI Labeling & Training Platform
            </p>
          </div>

          {/* Login Form */}
          <div className="mt-32">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>

      {/* Right side - FPTU Image (50%) */}
      <div className="w-1/2 relative">
        <Image
          src="/fptu_img.png"
          alt="FPT University Campus"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
