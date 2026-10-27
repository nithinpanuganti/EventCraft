"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, Sparkles, PlusCircle, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./AuthContext";

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { session, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Derive human-readable page title
  const currentNav = NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
  const pageTitle = currentNav?.name || (pathname.includes("/new") ? "New Event" : "EventCraft AI");

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between glass-header px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger & title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-surface-600 hover:bg-white/80 hover:text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden transition-all duration-150"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold tracking-tight text-surface-900 sm:text-base">{pageTitle}</span>
            <span className="hidden sm:inline-block text-surface-300">/</span>
            <span className="hidden sm:inline-block text-xs text-surface-500 font-medium">
              GenAI Event Planning Suite
            </span>
          </div>
        </div>

        {/* Top actions & Authentication State */}
        <div className="flex items-center gap-3">
          <Link href="/events/new" className="hidden sm:block">
            <Button variant="outline" size="sm" className="gap-1.5 shadow-subtle">
              <PlusCircle className="h-4 w-4" />
              <span>Create Event</span>
            </Button>
          </Link>

          {!loading && session ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-surface-200/80 bg-white/70 px-3 py-1.5 text-xs text-surface-700 shadow-subtle backdrop-blur-md">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-[10px] shadow-sm">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold hidden md:inline">{session.name}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-surface-500 hover:bg-white/80 hover:text-danger-600 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : !loading ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {/* Accessible Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div className="fixed inset-y-0 left-0 w-72 glass-surface-elevated p-5 shadow-glass-elevated transition-transform duration-200">
            <div className="flex items-center justify-between border-b border-surface-200/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-bold text-surface-900">EventCraft AI</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-surface-500 hover:bg-white/80"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <Link href="/events/new" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <Button variant="primary" size="md" className="w-full justify-center shadow-glass">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create New Event</span>
                </Button>
              </Link>
            </div>

            <nav className="mt-6 space-y-1.5">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "glass-nav-item-active"
                        : "glass-nav-item-inactive text-surface-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary-600" : "text-surface-400"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-primary-100/90 px-2 py-0.5 text-[10px] font-bold text-primary-700 border border-primary-200/50">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
