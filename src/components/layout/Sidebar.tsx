"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./AuthContext";
import { UserRole } from "@/lib/storage/types";

export function Sidebar() {
  const pathname = usePathname();
  const { userRole, switchRoleQuick, loadDemoAccounts } = useAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const navigationItems = getNavigationItemsForRole(userRole);

  const roleLabels: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
    ORGANIZER: { label: "Event Organizer", color: "text-primary-700", bg: "bg-primary-50/90", border: "border-primary-200" },
    COORDINATOR: { label: "Event Coordinator", color: "text-amber-700", bg: "bg-amber-50/90", border: "border-amber-200" },
    VENDOR: { label: "Vendor Partner", color: "text-emerald-700", bg: "bg-emerald-50/90", border: "border-emerald-200" },
    GUEST: { label: "Guest Attendee", color: "text-indigo-700", bg: "bg-indigo-50/90", border: "border-indigo-200" },
  };

  const handleQuickRoleSwitch = async (role: UserRole) => {
    setIsRoleDropdownOpen(false);
    await switchRoleQuick(role);
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await loadDemoAccounts();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col glass-sidebar lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto select-none border-r border-surface-200/70 z-30">
      {/* Brand Logo Header with Refraction Line */}
      <div className="relative flex h-16 items-center gap-3 border-b border-surface-200/60 px-6 backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white shadow-[0_4px_12px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.45)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-surface-900 leading-tight tracking-tight text-base">EventCraft AI</span>
          <span className="text-[11px] font-semibold text-primary-600 tracking-wide uppercase">Suite v2.0</span>
        </div>
        {/* Specular top sheen */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>

      {/* Role Badge & Role Quick Switcher */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            aria-expanded={isRoleDropdownOpen}
            aria-haspopup="menu"
            aria-label={`Current role: ${roleLabels[userRole]?.label || userRole}. Click to switch role`}
            className={cn(
              "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold border transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500",
              roleLabels[userRole]?.bg || "bg-surface-100",
              roleLabels[userRole]?.border || "border-surface-200",
              roleLabels[userRole]?.color || "text-surface-800"
            )}
            title="Click to switch role during testing"
          >
            <div className="flex items-center gap-2 truncate">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{roleLabels[userRole]?.label || userRole}</span>
            </div>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
          </button>

          {isRoleDropdownOpen && (
            <div
              role="menu"
              aria-label="Switch user role"
              className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-surface-200/90 bg-white/95 backdrop-blur-xl p-1.5 shadow-glass-elevated space-y-1"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                Switch Test Role
              </div>
              {(["ORGANIZER", "COORDINATOR", "VENDOR", "GUEST"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitem"
                  onClick={() => handleQuickRoleSwitch(r)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
                    userRole === r ? "bg-primary-50 text-primary-700 font-semibold" : "text-surface-700 hover:bg-surface-100"
                  )}
                >
                  <span>{roleLabels[r].label}</span>
                  {userRole === r && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" aria-hidden="true" />}
                </button>
              ))}
              <div className="pt-1 border-t border-surface-100">
                <Link
                  href="/login"
                  role="menuitem"
                  onClick={() => setIsRoleDropdownOpen(false)}
                  className="block px-2.5 py-1.5 text-[11px] text-surface-500 hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                >
                  Full Role Selector Page &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Button for Organizers */}
      {userRole === "ORGANIZER" && (
        <div className="px-4 pb-2">
          <Link href="/events/new" className="block">
            <Button variant="primary" size="sm" className="w-full justify-center shadow-glass gap-2 font-semibold">
              <PlusCircle className="h-4 w-4" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-3 py-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-surface-400">
          Navigation
        </div>
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && !item.href.includes("?") && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name + item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium glass-nav-item transition-all",
                isActive ? "glass-nav-item-active" : "glass-nav-item-inactive text-surface-600"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-150",
                    isActive ? "text-primary-600" : "text-surface-400 group-hover:text-surface-800"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold transition-all shrink-0",
                    item.badge === "Live"
                      ? "bg-rose-100 text-rose-700 animate-pulse border border-rose-200"
                      : item.badge === "Sos"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : isActive
                      ? "bg-primary-100 text-primary-800 border border-primary-200"
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

      {/* Demo Seeding & Storage Footer */}
      <div className="border-t border-surface-200/60 p-3 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedDemo}
          disabled={seeding}
          className="w-full text-xs justify-center gap-1.5 py-1.5 bg-white/60 hover:bg-white text-surface-700 border-surface-200"
        >
          <Layers className="h-3.5 w-3.5 text-primary-600" />
          <span>{seeding ? "Loading Demo..." : "Seed 4-Role Demo Data"}</span>
        </Button>

        <div className="relative overflow-hidden rounded-xl border border-surface-200/80 bg-white/75 p-2.5 shadow-glass-subtle backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-semibold text-surface-800">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Multi-Role Active</span>
            </span>
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200/70">
              Local
            </span>
          </div>
          <p className="mt-1 text-[10px] text-surface-500 leading-tight">
            IndexedDB 21-store persistent workspace.
          </p>
        </div>
      </div>
    </aside>
  );
}
