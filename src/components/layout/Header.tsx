"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Sparkles,
  PlusCircle,
  LogOut,
  LogIn,
  ChevronRight,
  User,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./AuthContext";

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { session, userRole, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const navigationItems = getNavigationItemsForRole(userRole);

  // Derive human-readable page title
  const currentNav = navigationItems.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && !item.href.includes("?") && pathname.startsWith(item.href))
  );
  const pageTitle = currentNav?.name || (pathname.includes("/new") ? "New Event" : "EventCraft AI");

  const roleBadgeText: Record<string, string> = {
    ORGANIZER: "Organizer",
    COORDINATOR: "Coordinator",
    VENDOR: "Vendor",
    GUEST: "Guest",
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between glass-header px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger & breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-xl p-2 text-surface-600 hover:bg-white/80 hover:text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden transition-all duration-150 border border-transparent hover:border-surface-200/60"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-surface-900 sm:text-base">{pageTitle}</span>
            <ChevronRight className="hidden sm:inline-block h-3.5 w-3.5 text-surface-400" />
            <span className="hidden sm:inline-block text-xs text-surface-500 font-medium">
              Event Planning Suite
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-primary-100/80 px-2 py-0.5 text-[10px] font-semibold text-primary-800 border border-primary-200">
              <Shield className="h-2.5 w-2.5" />
              {roleBadgeText[userRole] || userRole}
            </span>
          </div>
        </div>

        {/* Top actions & Authentication State */}
        <div className="flex items-center gap-3">
          {userRole === "ORGANIZER" && (
            <Link href="/events/new" className="hidden sm:block">
              <Button variant="outline" size="sm" className="gap-1.5 shadow-glass-subtle font-medium">
                <PlusCircle className="h-4 w-4 text-primary-600" />
                <span>Create Event</span>
              </Button>
            </Link>
          )}

          {!loading && session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-surface-200/80 bg-white/75 px-3 py-1.5 text-xs text-surface-700 shadow-glass-subtle backdrop-blur-md hover:bg-white transition-colors"
                title="Switch Profile / Role"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-[10px] shadow-sm">
                  {session.name ? session.name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                </div>
                <div className="flex flex-col text-left hidden md:flex">
                  <span className="font-semibold text-surface-800 text-[11px] leading-tight">{session.name}</span>
                  <span className="text-[9px] text-primary-600 font-medium">{roleBadgeText[userRole] || userRole}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl p-2 text-surface-400 hover:bg-white/80 hover:text-danger-600 border border-transparent hover:border-surface-200/60 transition-colors"
                title="Switch Profile / Sign Out"
                aria-label="Switch Profile / Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : !loading ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 font-medium">
                  <LogIn className="h-4 w-4" />
                  <span>Roles</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">Register</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {/* Accessible Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          {/* Backdrop with liquid blur */}
          <div
            className="fixed inset-0 bg-surface-900/40 backdrop-blur-md transition-opacity duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div className="fixed inset-y-0 left-0 w-72 glass-surface-elevated p-5 shadow-glass-elevated transition-transform duration-200 border-r border-surface-200/80 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-200/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-surface-900 text-base leading-tight">EventCraft AI</span>
                  <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide">
                    {roleBadgeText[userRole] || userRole} Portal
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl p-1.5 text-surface-500 hover:bg-white/80 hover:text-surface-800"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {userRole === "ORGANIZER" && (
              <div className="mt-4">
                <Link href="/events/new" onClick={() => setIsMobileMenuOpen(false)} className="block">
                  <Button variant="primary" size="md" className="w-full justify-center shadow-glass font-medium gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>Create New Event</span>
                  </Button>
                </Link>
              </div>
            )}

            <nav className="mt-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && !item.href.includes("?") && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name + item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 glass-nav-item",
                      isActive
                        ? "glass-nav-item-active"
                        : "glass-nav-item-inactive text-surface-600"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-600" : "text-surface-400"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-primary-100/90 px-1.5 py-0.2 text-[9px] font-bold text-primary-700 border border-primary-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-surface-200/60">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium rounded-xl border border-surface-200 text-surface-700 bg-white/70 hover:bg-white"
              >
                <LogIn className="h-3.5 w-3.5 text-primary-600" />
                <span>Switch Role / Profile</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
