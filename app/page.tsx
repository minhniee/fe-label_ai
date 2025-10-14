"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { loginUser, persistAuth } from "@/api/auth";
import { FPTLogo } from "@/components/fpt-logo";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const token = await loginUser(identifier, password);
      persistAuth(token);
      const roleId = token.user?.role_id;
      // Role mapping: 1: SuperAdmin, 2: Admin, 3: Manager, 4: Labeler
      if (roleId === 1 || roleId === 2) {
        window.location.href = "/dashboard";
      } else if (roleId === 3) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      toast({
        title: "Failed to login",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="w-2/5 relative flex flex-col justify-center p-8 bg-white">
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

          {/* Login Card */}
          <Card className="shadow-lg border border-gray-200 bg-white/90 backdrop-blur-sm mt-32">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-card-foreground">
                Login
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-card-foreground">
                    Account (Email or Username)
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="your.email@example.com or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="bg-input border-border focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-card-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-input border-border focus:ring-primary pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {loginError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Login
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                  >
                    Register now
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - FPTU Image */}
      <div className="hidden lg:flex lg:w-3/5 relative">
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
