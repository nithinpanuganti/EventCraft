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
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <UserCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Create Local Profile</h1>
          <p className="text-sm text-surface-500">
            Set up a local planner profile on this device. All data is persisted directly in browser IndexedDB.
          </p>
        </div>

        {/* Local Architecture Transparency Notice */}
        <div className="rounded-xl p-3 bg-primary-50/70 border border-primary-200/60 text-xs text-primary-900 flex items-start gap-2.5">
          <HardDrive className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Local-Only Browser Storage:</span> Your profiles, events, and budgets stay on this computer. No remote servers or cloud accounts are used.
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

        <Card className="p-6 sm:p-8 glass-surface-elevated shadow-glass-elevated specular-top">
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
              helperText="Used to identify your plans in this browser."
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

          <div className="mt-6 border-t border-surface-200/80 pt-4 text-center">
            <p className="text-xs text-surface-500">
              Already have a local profile on this browser?{" "}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2">
                Select Profile
              </Link>
            </p>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-xs text-surface-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Zero external tracking • No cloud database required</span>
        </div>
      </div>
    </div>
  );
}
