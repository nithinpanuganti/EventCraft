"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, PlusCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col glass-sidebar lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto select-none border-r border-surface-200/70 z-30">
      {/* Brand Logo Header with Refraction Line */}
      <div className="relative flex h-16 items-center gap-3 border-b border-surface-200/60 px-6 backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white shadow-[0_4px_12px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.45)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-surface-900 leading-tight tracking-tight text-base">EventCraft AI</span>
          <span className="text-[11px] font-semibold text-primary-600 tracking-wide uppercase">Planning Suite</span>
        </div>
        {/* Specular top sheen */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>

      {/* Quick Action Button */}
      <div className="p-4">
        <Link href="/events/new" className="block">
          <Button variant="primary" size="md" className="w-full justify-center shadow-glass gap-2 font-semibold">
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
                    isActive ? "text-primary-600" : "text-surface-400 group-hover:text-surface-800"
                  )}
                />
                <span className="transition-colors duration-150">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold transition-all",
                    isActive
                      ? "bg-primary-100/90 text-primary-800 border border-primary-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "bg-surface-200/60 text-surface-600 border border-surface-300/40"
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
      <div className="border-t border-surface-200/60 p-4">
        <div className="relative overflow-hidden rounded-xl border border-surface-200/80 bg-white/75 p-3.5 shadow-glass-subtle backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-surface-800">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Production Ready</span>
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/70">
              Active
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-surface-500 leading-relaxed">
            Local browser storage, deterministic ledgers, & AI planning workspace.
          </p>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        </div>
      </div>
    </aside>
  );
}
