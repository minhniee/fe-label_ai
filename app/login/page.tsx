"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SnowfallOverlay } from "@/components/snowfall";
import { FPTLogo } from "@/components/fpt-logo";
import { LoginForm } from "@/components/login-form";
import { getMe } from "@/app/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Extract callback_url and error from query params
    const cbUrl = searchParams.get('callback_url');
    const errorParam = searchParams.get('error');
    
    if (cbUrl) {
      try {
        setCallbackUrl(decodeURIComponent(cbUrl));
      } catch (e) {
        console.error("Failed to decode callback_url:", e);
      }
    }
    
    // Check auth in background - if already logged in, redirect immediately
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");
        
        if (token) {
          try {
            const me = await getMe();
            
            let redirectUrl = "/projects";
            if (cbUrl) {
              const decodedUrl = decodeURIComponent(cbUrl);
              const isAdminRoute = decodedUrl.includes('/admin/');
              const isAdmin = me?.role_id === 1;
              
              if (isAdminRoute && !isAdmin) {
                redirectUrl = "/projects";
              } else {
                redirectUrl = decodedUrl;
              }
            }
            
            router.replace(redirectUrl);
          } catch (error) {
            // Token invalid, clear it
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            localStorage.removeItem("redirect_after_login");
          }
        }
      } catch (error) {
        // Silent fail - just show login form
      }
    };

    checkAuth();
  }, [router, searchParams, mounted]);

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <SnowfallOverlay />
      {/* Left side - Login form (50%) */}
      <div className="w-1/2 relative flex flex-col justify-center p-8 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <div className="flex items-center justify-center mb-2">
              <FPTLogo
                size="lg"
                showText={true}
                clickable={false}
              />
            </div>
            <p className="text-muted-foreground text-sm animate-fadeIn [animation-delay:200ms] opacity-0">
              AI Labeling & Training Platform
            </p>
          </div>

          {/* Login Form */}
          <div className="mt-32" data-login-form>
            <LoginForm callbackUrl={callbackUrl} error={error} />
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
