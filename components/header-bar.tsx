"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Mail, Menu, User } from "lucide-react";
import { FPTLogo } from "./fpt-logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MeResponse } from "@/api/auth";

interface HeaderBarProps {
  me: MeResponse | null;
  onLogout: () => Promise<void> | void;
  navigation: Array<{ name: string; href: string; icon: React.ComponentType<any> }>;
  pathname: string;
  onCloseMobile?: () => void;
}

export function HeaderBar({ me, onLogout, navigation, pathname, onCloseMobile }: HeaderBarProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={onCloseMobile}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <FPTLogo size="sm" showText={true} />
      </div>
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <Button variant="ghost" size="sm">
          <Bell className="h-5 w-5" />
          <span className="sr-only">View notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 rounded-full px-2 pr-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-foreground" />
                </div>
                <span className="text-sm font-medium max-w-[120px] truncate">{me?.username ?? "User"}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </div>
              <span className="sr-only">Open user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 z-50" align="end" sideOffset={8}>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                <span className="truncate">{me?.email ?? "View Profile"}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


