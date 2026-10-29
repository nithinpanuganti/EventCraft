"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/layout/AuthContext";
import { User, Check, Plus, ArrowRight, HardDrive } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { profiles, activeProfile, switchProfile } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(activeProfile?.id || "");
  const [loading, setLoading] = useState(false);

  const handleSelectProfile = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      await switchProfile(id);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueActive = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white shadow-glass-glow border border-white/30 relative">
            <User className="h-7 w-7" />
            <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white/80 shadow-sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">Select Local Profile</h1>
            <p className="text-xs sm:text-sm text-surface-500 max-w-sm mx-auto">
              Choose a planner profile on this device to access your local events, budgets, and schedules.
            </p>
          </div>
        </div>

        {/* Storage Notice */}
        <div className="glass-surface-subtle rounded-2xl p-4 border border-white/60 dark:border-white/10 text-xs text-surface-600 flex items-start gap-3 shadow-glass-subtle">
          <div className="h-6 w-6 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-surface-900">Browser-Local Storage:</span> Profiles are stored securely inside your browser&apos;s IndexedDB. No passwords or server connections are needed.
          </div>
        </div>

        <Card variant="elevated" className="p-6 sm:p-7 specular-top space-y-5">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
              Available Profiles ({profiles.length})
            </div>
            {profiles.map((p) => {
              const isActive = (selectedId || activeProfile?.id) === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary-500/10 border-primary-500/40 shadow-glass-subtle ring-1 ring-primary-500/20"
                      : "glass-surface-subtle hover:bg-white/80 dark:hover:bg-surface-800/80 border-white/60 dark:border-white/10 hover:border-primary-400/50 hover:shadow-glass-hover"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-indigo-500/20 border border-primary-500/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm shadow-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-surface-900 text-sm flex items-center gap-2">
                        {p.name}
                        {p.isDefault && <Badge variant="secondary" size="sm">Default</Badge>}
                      </div>
                      <div className="text-xs text-surface-500">{p.email}</div>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-glass-subtle border border-white/20">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="text-xs text-primary-600 font-medium px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-colors">
                      Select
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              isLoading={loading}
              onClick={handleContinueActive}
              className="w-full font-semibold shadow-glass-glow flex items-center justify-center gap-2"
            >
              <span>Continue as {activeProfile?.name || "Planner"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Link href="/register">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Another Profile</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
