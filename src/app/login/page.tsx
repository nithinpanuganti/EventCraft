"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/layout/AuthContext";
import { UserRole } from "@/lib/storage/types";
import {
  ShieldCheck,
  HardDrive,
  Eye,
  EyeOff,
  Sparkles,
  Crown,
  Radio,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";

const ROLE_INFO: Record<
  UserRole,
  {
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    targetPath: string;
    features: string[];
  }
> = {
  ORGANIZER: {
    title: "Event Organizer",
    description: "Full event creation, budgeting, guest lists, seating, and comprehensive planning.",
    icon: Crown,
    color: "from-amber-500/20 to-purple-500/20 text-amber-500 border-amber-500/30",
    targetPath: "/dashboard",
    features: ["All 21 modules & settings", "Budget & payments management", "Seating & invitations generator"],
  },
  COORDINATOR: {
    title: "Event Coordinator",
    description: "Day-of execution, live runsheet tracking, issue resolution, and guest check-in.",
    icon: Radio,
    color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
    targetPath: "/control-center",
    features: ["Live runsheet & countdown clock", "Guest QR check-in console", "Emergency contacts & issue desk"],
  },
  VENDOR: {
    title: "Service Vendor",
    description: "Direct access to assigned deliverables, contract milestones, and payment receipts.",
    icon: Briefcase,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    targetPath: "/vendors",
    features: ["Contract terms & signed milestones", "Payment disbursement ledger", "Event schedule synchronization"],
  },
  GUEST: {
    title: "Invited Guest",
    description: "Submit RSVPs, view digital invitation cards, check table seating, and QR event pass.",
    icon: Users,
    color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    targetPath: "/invitations?view=guest",
    features: ["Instant RSVP submission", "Assigned seating & meal preferences", "Digital entry QR pass"],
  },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role")?.toUpperCase() as UserRole) || "ORGANIZER";

  const { profiles, activeProfile, switchProfile, switchRoleQuick, loadDemoAccounts } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    ROLE_INFO[initialRole] ? initialRole : "ORGANIZER"
  );
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Filter profiles by the selected role
  const roleProfiles = profiles.filter((p) => (p.role || "ORGANIZER") === selectedRole);

  const handleSelectProfile = async (id: string) => {
    setLoading(true);
    try {
      await switchProfile(id);
      router.push(ROLE_INFO[selectedRole].targetPath);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickSwitch = async (role: UserRole) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      await switchRoleQuick(role);
      router.push(ROLE_INFO[role].targetPath);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Find matching profile by email or fallback to first role profile or switch role
      const matched = profiles.find(
        (p) => p.email.toLowerCase() === emailInput.trim().toLowerCase()
      );
      if (matched) {
        await switchProfile(matched.id);
        router.push(ROLE_INFO[matched.role || "ORGANIZER"].targetPath);
      } else {
        await switchRoleQuick(selectedRole);
        router.push(ROLE_INFO[selectedRole].targetPath);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setSeedingDemo(true);
    try {
      await loadDemoAccounts();
      await switchRoleQuick(selectedRole);
      router.push(ROLE_INFO[selectedRole].targetPath);
    } finally {
      setSeedingDemo(false);
    }
  };

  const currentRoleConfig = ROLE_INFO[selectedRole];
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-10 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="w-full max-w-2xl space-y-7">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white shadow-glass-glow border border-white/30 relative">
            <RoleIcon className="h-8 w-8" />
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-surface-900">
              Welcome to EventCraft AI
            </h1>
            <p className="text-sm text-surface-500 max-w-md mx-auto">
              Select your persona to access tailored planning tools, live control rooms, and guest portals.
            </p>
          </div>
        </div>

        {/* Role Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => {
            const config = ROLE_INFO[role];
            const Icon = config.icon;
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary-500/15 border-primary-500/50 shadow-glass-subtle ring-2 ring-primary-500/30 text-surface-900"
                    : "glass-surface-subtle border-white/60 dark:border-white/10 hover:border-primary-400/40 text-surface-600 hover:text-surface-900"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${config.color} border flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && <Badge variant="primary" size="sm">Active</Badge>}
                </div>
                <div>
                  <div className="font-semibold text-xs text-surface-900 leading-tight">
                    {config.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Storage & Privacy Disclosure */}
        <div className="glass-surface-subtle rounded-2xl p-4 border border-white/60 dark:border-white/10 text-xs text-surface-600 flex items-start gap-3 shadow-glass-subtle">
          <div className="h-7 w-7 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-surface-900">Browser-Local Confidentiality:</span>
            <p className="leading-relaxed">
              All credentials and event plans persist directly in your browser&apos;s IndexedDB. No external servers or telemetry are contacted.
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-6">
          <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <span>{currentRoleConfig.title} Portal</span>
              </h2>
              <p className="text-xs text-surface-500">{currentRoleConfig.description}</p>
            </div>
            <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
              Role: {selectedRole}
            </Badge>
          </div>

          {/* Features preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-surface-600 bg-surface-500/5 rounded-xl p-3 border border-white/10">
            {currentRoleConfig.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>

          {/* Existing profiles for this role */}
          {roleProfiles.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
                Saved {currentRoleConfig.title} Profiles ({roleProfiles.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {roleProfiles.map((p) => {
                  const isActive = activeProfile?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProfile(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary-500/10 border-primary-500/40 shadow-glass-subtle"
                          : "glass-surface-subtle hover:bg-white/80 dark:hover:bg-surface-800/80 border-white/60 dark:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500/20 to-indigo-500/20 border border-primary-500/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-surface-900 text-xs truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-surface-500 truncate">{p.email}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-surface-400 shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Sign-In Form */}
          <form onSubmit={handleManualLogin} className="space-y-4 pt-1">
            <Input
              label="Email or Username"
              type="text"
              placeholder={`e.g. ${selectedRole.toLowerCase()}@local.demo`}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              helperText="Enter any profile email or proceed directly."
            />

            <div className="space-y-1.5">
              <label htmlFor="login-passcode" className="text-xs font-semibold text-surface-700 block">
                Local Passcode (Simulated)
              </label>
              <div className="relative">
                <input
                  id="login-passcode"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 p-1 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="text-[11px] text-surface-500 flex items-center gap-1">
                <Info className="h-3 w-3 text-surface-400" />
                <span>Passcode is verified locally inside your browser sandbox.</span>
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="flex-1 font-semibold shadow-glass-glow flex items-center justify-center gap-2"
              >
                <span>Enter as {currentRoleConfig.title}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                isLoading={loading}
                onClick={() => handleRoleQuickSwitch(selectedRole)}
                className="font-medium"
              >
                Quick Switch
              </Button>
            </div>
          </form>

          {/* Quick Demo Accounts Banner */}
          <div className="pt-4 border-t border-surface-200/50 dark:border-surface-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Instant Demo Access
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isLoading={seedingDemo}
                onClick={handleLoadDemo}
                className="text-xs text-primary-600 hover:text-primary-700 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Seed Full 4-Role Test Data</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRoleQuickSwitch("ORGANIZER")}
                className="p-2.5 rounded-xl border border-white/60 dark:border-white/10 glass-surface-subtle hover:border-amber-400/50 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-amber-500">Elena Rostova</div>
                <div className="text-[10px] text-surface-500">Head Organizer</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickSwitch("COORDINATOR")}
                className="p-2.5 rounded-xl border border-white/60 dark:border-white/10 glass-surface-subtle hover:border-cyan-400/50 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-cyan-400">Marcus Vance</div>
                <div className="text-[10px] text-surface-500">Lead Coordinator</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickSwitch("VENDOR")}
                className="p-2.5 rounded-xl border border-white/60 dark:border-white/10 glass-surface-subtle hover:border-emerald-400/50 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-400">Julian Moreau</div>
                <div className="text-[10px] text-surface-500">Catering Director</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickSwitch("GUEST")}
                className="p-2.5 rounded-xl border border-white/60 dark:border-white/10 glass-surface-subtle hover:border-purple-400/50 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-purple-400">Dr. Sophia Lin</div>
                <div className="text-[10px] text-surface-500">VIP Guest</div>
              </button>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-surface-200/50 dark:border-surface-800/50">
            <p className="text-xs text-surface-500">
              Need a custom profile?{" "}
              <Link
                href={`/register?role=${selectedRole.toLowerCase()}`}
                className="font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2"
              >
                Create New Profile
              </Link>
            </p>
          </div>
        </Card>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-surface-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Zero Server Storage • Local-First Architecture • Complete Privacy</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
