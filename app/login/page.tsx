"use client";

import Image from "next/image";
import { FPTLogo } from "@/components/fpt-logo";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
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
            <LoginForm />
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
