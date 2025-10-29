"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export function SidebarNav({ items, collapsed = false }: { items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  {collapsed ? (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "sidebar-item group flex items-center rounded-md p-2 text-sm leading-6 font-semibold transition-colors justify-center",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            aria-label={item.name}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" className="px-3 py-2 text-sm font-semibold">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "sidebar-item group flex items-center rounded-md p-2 text-sm leading-6 font-semibold transition-colors gap-x-3",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      </ul>
    </nav>
  );
}


