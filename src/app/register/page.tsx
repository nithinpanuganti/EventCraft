"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { useAuth } from "@/components/layout/AuthContext";
import { UserRole } from "@/lib/storage/types";
import {
  UserCheck,
  ShieldCheck,
  HardDrive,
  Eye,
  EyeOff,
  Crown,
  Radio,
  Briefcase,
  Users,
  CheckCircle2,
} from "lucide-react";

const ROLES: { id: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "ORGANIZER", label: "Organizer", icon: Crown, desc: "Full planning & control" },
  { id: "COORDINATOR", label: "Coordinator", icon: Radio, desc: "Day-of runsheet execution" },
  { id: "VENDOR", label: "Vendor", icon: Briefcase, desc: "Contracts & milestones" },
  { id: "GUEST", label: "Guest", icon: Users, desc: "RSVP & event attendance" },
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role")?.toUpperCase() as UserRole) || "ORGANIZER";

  const { createProfile } = useAuth();
  const [role, setRole] = useState<UserRole>(
    ROLES.some((r) => r.id === initialRole) ? initialRole : "ORGANIZER"
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    passcode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
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
      await createProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role,
        phone: formData.phone.trim() || undefined,
        organization: formData.organization.trim() || undefined,
        passcode: formData.passcode.trim() || undefined,
      });

      // Redirect based on selected role
      if (role === "COORDINATOR") router.push("/control-center");
      else if (role === "VENDOR") router.push("/vendors");
      else if (role === "GUEST") router.push("/invitations?view=guest");
      else router.push("/dashboard");

      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create local profile.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-10 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white shadow-glass-glow border border-white/30">
            <UserCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Create Local Profile
            </h1>
            <p className="text-xs sm:text-sm text-surface-500 max-w-md mx-auto">
              Set up your persona on this device. Stored securely and exclusively within browser IndexedDB.
            </p>
          </div>
        </div>

        {/* Local Architecture Transparency Notice */}
        <div className="glass-surface-subtle rounded-2xl p-4 border border-primary-500/20 bg-primary-500/5 text-xs text-surface-700 flex items-start gap-3 shadow-glass-subtle">
          <div className="h-6 w-6 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-surface-900">Local-Only Storage:</span> Your profiles, events, and records stay on this browser. No remote servers or tracking exist.
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

        <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-5">
          {/* Role selector segmented tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-700 block">
              Choose Your Role
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary-500/15 border-primary-500/60 ring-2 ring-primary-500/30 text-surface-900"
                        : "glass-surface-subtle border-white/60 dark:border-white/10 hover:border-primary-400/40 text-surface-600"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-bold truncate">{r.label}</span>
                    </div>
                    <div className="text-[10px] text-surface-500 leading-tight">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                name="name"
                placeholder={
                  role === "ORGANIZER"
                    ? "e.g. Elena Rostova"
                    : role === "COORDINATOR"
                    ? "e.g. Marcus Vance"
                    : role === "VENDOR"
                    ? "e.g. Julian Moreau"
                    : "e.g. Dr. Sophia Lin"
                }
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
              />

              <Input
                label="Email / Local Identifier"
                type="email"
                required
                name="email"
                placeholder="e.g. name@eventcraft.local"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number (Optional)"
                type="tel"
                name="phone"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                helperText="Used for rapid run-sheet communications."
              />

              <Input
                label={role === "VENDOR" ? "Company / Vendor Name" : "Organization / Title"}
                type="text"
                name="organization"
                placeholder={role === "VENDOR" ? "e.g. Moreau Fine Dining" : "e.g. EventCraft Studio"}
                value={formData.organization}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-700 block">
                Local Passcode (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="passcode"
                  placeholder="Set an optional local passcode"
                  value={formData.passcode}
                  onChange={handleChange}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 p-1"
                  aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-surface-500">
                Optional security shield simulated inside your browser sandbox.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-3 font-semibold shadow-glass-glow flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Create {role} Profile</span>
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-200/50 dark:border-surface-800/50 pt-4 text-center">
            <p className="text-xs text-surface-500">
              Already have a local profile?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2"
              >
                Select Profile / Login
              </Link>
            </p>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-xs text-surface-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>No external network requests • 100% Client-Side Persistence</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
