"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col glass-sidebar lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto select-none">
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-200/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_2px_8px_rgba(124,58,237,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-surface-900 leading-tight tracking-tight">EventCraft AI</span>
          <span className="text-[11px] font-medium text-primary-700">Planning Assistant</span>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-4">
        <Link href="/events/new" className="block">
          <Button variant="primary" size="md" className="w-full justify-center shadow-glass">
            <PlusCircle className="h-4 w-4" />
            <span>Create New Event</span>
          </Button>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-3 py-2">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium glass-nav-item",
                isActive ? "glass-nav-item-active" : "glass-nav-item-inactive text-surface-600"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors duration-150",
                    isActive ? "text-primary-600" : "text-surface-400 group-hover:text-surface-700"
                  )}
                />
                <span className="transition-colors duration-150">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold transition-all",
                    isActive
                      ? "bg-primary-100/90 text-primary-800 border border-primary-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                      : "bg-surface-100/80 text-surface-600 border border-surface-200/60"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Phase Badge & System Notice */}
      <div className="border-t border-surface-200/50 p-4">
        <div className="rounded-xl border border-surface-200/80 bg-white/70 p-3.5 shadow-glass backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-surface-700">
            <span>Production Ready</span>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200/60">
              Active
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-surface-500 leading-relaxed">
            Full-stack AI event planning, deterministic ledgers & operations.
          </p>
        </div>
      </div>
    </aside>
  );
}
