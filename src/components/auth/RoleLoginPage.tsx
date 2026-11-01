"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/storage/types";
import { DEMO_CREDENTIALS } from "@/lib/storage/local-repository";
import { useAuth } from "@/components/layout/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Eye,
  EyeOff,
  LogIn,
  Crown,
  Radio,
  Briefcase,
  Users,
  Sparkles,
  AlertCircle,
  HardDrive,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

interface RoleLoginPageProps {
  role: UserRole;
  targetDashboard: string;
}

const ROLE_THEME: Record<
  UserRole,
  {
    icon: React.ElementType;
    badge: string;
    gradient: string;
    accentBg: string;
    border: string;
    textColor: string;
  }
> = {
  ORGANIZER: {
    icon: Crown,
    badge: "Lead Authority",
    gradient: "from-purple-500/20 via-indigo-500/20 to-purple-600/30",
    accentBg: "bg-purple-500/10",
    border: "border-purple-500/30",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  COORDINATOR: {
    icon: Radio,
    badge: "Field Command",
    gradient: "from-amber-500/20 via-orange-500/20 to-amber-600/30",
    accentBg: "bg-amber-500/10",
    border: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  VENDOR: {
    icon: Briefcase,
    badge: "Commercial Partner",
    gradient: "from-emerald-500/20 via-teal-500/20 to-emerald-600/30",
    accentBg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  GUEST: {
    icon: Users,
    badge: "Self-Service Attendee",
    gradient: "from-pink-500/20 via-rose-500/20 to-pink-600/30",
    accentBg: "bg-pink-500/10",
    border: "border-pink-500/30",
    textColor: "text-pink-600 dark:text-pink-400",
  },
};

export function RoleLoginPage({ role, targetDashboard }: RoleLoginPageProps) {
  const router = useRouter();
  const { loginRoleAccount, loadDemoAccounts } = useAuth();
  const demo = DEMO_CREDENTIALS[role];
  const theme = ROLE_THEME[role];
  const Icon = theme.icon;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginRoleAccount(role, username.trim(), password);
      if (res.success) {
        router.push(targetDashboard);
      } else {
        setErrorMessage(res.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoCredentials = async () => {
    setUsername(demo.username);
    setPassword(demo.password);
    setErrorMessage(null);
    setLoading(true);
    try {
      await loadDemoAccounts();
      const res = await loginRoleAccount(role, demo.username, demo.password);
      if (res.success) {
        router.push(targetDashboard);
      } else {
        setErrorMessage(res.error || "Could not log into demonstration account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Demo login failed.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-10 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="w-full max-w-xl space-y-6">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-600 hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg px-2 py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Role Portals</span>
          </Link>
          <Badge variant="outline" size="sm" className="font-medium">
            {theme.badge}
          </Badge>
        </div>

        {/* Role Portal Header Card */}
        <div className="text-center space-y-3">
          <div
            className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.gradient} ${theme.border} border text-surface-900 shadow-glass-glow relative`}
          >
            <Icon className={`h-8 w-8 ${theme.textColor}`} aria-hidden="true" />
            <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              {demo.roleName} Login
            </h1>
            <p className="text-xs sm:text-sm text-surface-600 max-w-md mx-auto leading-relaxed">
              {demo.responsibility}
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-6">
          {/* Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-700 dark:text-danger-400 text-xs flex items-start gap-2.5 shadow-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`username-${role}`}
                className="block text-xs font-semibold text-surface-700 tracking-wide uppercase"
              >
                Username or Email
              </label>
              <Input
                id={`username-${role}`}
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={demo.username}
                className="w-full text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`password-${role}`}
                  className="block text-xs font-semibold text-surface-700 tracking-wide uppercase"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1 focus:outline-none focus:underline"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" aria-hidden="true" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" aria-hidden="true" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Input
                  id={`password-${role}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password text" : "Show password text"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 shadow-glass font-semibold py-2.5 text-sm"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Log in as {demo.roleName}</span>
                </>
              )}
            </Button>
          </form>

          {/* Demo Account Credentials Callout */}
          <div className="p-4 rounded-2xl border border-primary-500/25 bg-gradient-to-br from-primary-500/5 to-purple-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary-500/20 text-primary-600 flex items-center justify-center">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-surface-900">
                  Sample Demonstration Credentials
                </span>
              </div>
              <Badge variant="secondary" size="sm">
                Local Demo
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 dark:bg-surface-800/70 p-2.5 rounded-xl border border-surface-200/60 dark:border-surface-700/60">
              <div>
                <span className="text-surface-500 text-[10px] uppercase font-semibold block">Username</span>
                <code className="font-mono font-bold text-surface-900 select-all">{demo.username}</code>
              </div>
              <div>
                <span className="text-surface-500 text-[10px] uppercase font-semibold block">Password</span>
                <code className="font-mono font-bold text-surface-900 select-all">{demo.password}</code>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseDemoCredentials}
              disabled={loading}
              className="w-full gap-1.5 text-xs font-semibold hover:border-primary-400"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />
              <span>1-Click Fill &amp; Launch {demo.name}&apos;s Dashboard</span>
            </Button>
          </div>

          {/* Registration link */}
          <div className="text-center text-xs text-surface-500 pt-2 border-t border-surface-200/50">
            <span>Need a custom {demo.roleName.toLowerCase()} account? </span>
            <Link
              href={`/register?role=${role.toLowerCase()}`}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Register local profile
            </Link>
          </div>
        </Card>

        {/* Security & Local Storage Disclosure */}
        <div className="glass-surface-subtle rounded-2xl p-3.5 border border-white/60 dark:border-white/10 text-[11px] text-surface-600 flex items-start gap-2.5 shadow-glass-subtle">
          <HardDrive className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-surface-800">Browser-Only Security:</strong> Demo passwords are salted and SHA-256 hashed into local IndexedDB. No credentials ever traverse the network.
          </p>
        </div>
      </div>
    </div>
  );
}
