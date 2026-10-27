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
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <User className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Select Local Profile</h1>
          <p className="text-sm text-surface-500">
            Choose a planner profile on this browser to access your local events and budgets.
          </p>
        </div>

        <div className="rounded-xl p-3 bg-surface-100/90 border border-surface-200/90 text-xs text-surface-600 flex items-start gap-2.5">
          <HardDrive className="h-4 w-4 text-surface-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-surface-800">Browser-Local Storage:</span> Profiles are stored locally in your browser&apos;s IndexedDB. No passwords or server connections are needed.
          </div>
        </div>

        <Card className="p-6 glass-surface-elevated shadow-glass-elevated specular-top space-y-4">
          <div className="space-y-2.5">
            {profiles.map((p) => {
              const isActive = (selectedId || activeProfile?.id) === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary-50/80 border-primary-300 shadow-sm"
                      : "bg-white/60 hover:bg-white border-surface-200/90 hover:border-surface-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-surface-900 text-sm flex items-center gap-2">
                        {p.name}
                        {p.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <div className="text-xs text-surface-500">{p.email}</div>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="text-xs text-primary-600 font-medium">Select</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
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
