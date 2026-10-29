"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { useAuth } from "@/components/layout/AuthContext";
import { UserCheck, ShieldCheck, HardDrive } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { createProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const newErrors: typeof errors = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email or identifier is required";
    else if (!formData.email.includes("@")) newErrors.email = "Please enter a valid email format";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await createProfile(formData.name.trim(), formData.email.trim());
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create local profile.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white shadow-glass-glow border border-white/30">
            <UserCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">Create Local Profile</h1>
            <p className="text-xs sm:text-sm text-surface-500 max-w-sm mx-auto">
              Set up a local planner profile on this device. All data is persisted directly in your browser&apos;s IndexedDB.
            </p>
          </div>
        </div>

        {/* Local Architecture Transparency Notice */}
        <div className="glass-surface-subtle rounded-2xl p-4 border border-primary-500/20 bg-primary-500/5 text-xs text-surface-700 flex items-start gap-3 shadow-glass-subtle">
          <div className="h-6 w-6 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-surface-900">Local-Only Browser Storage:</span> Your profiles, events, and budgets stay on this computer. No remote servers or cloud accounts are used.
          </div>
        </div>

        {errorMessage && (
          <ToastNotification
            type="error"
            title="Profile Error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        <Card variant="elevated" className="p-6 sm:p-8 specular-top">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Planner Name"
              required
              name="name"
              placeholder="e.g. Maya Chen"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />

            <Input
              label="Local Email / Identifier"
              type="email"
              required
              name="email"
              placeholder="e.g. maya@local.device"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              helperText="Used to identify your plans on this browser."
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2 font-semibold shadow-glass-glow"
            >
              Start Planning Locally
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-200/50 dark:border-surface-800/50 pt-4 text-center">
            <p className="text-xs text-surface-500">
              Already have a local profile on this browser?{" "}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2">
                Select Profile
              </Link>
            </p>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-xs text-surface-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Zero external tracking • No cloud database required</span>
        </div>
      </div>
    </div>
  );
}
