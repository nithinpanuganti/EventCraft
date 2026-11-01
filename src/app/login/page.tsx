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
import {
  Crown,
  Radio,
  Briefcase,
  Users,
  HardDrive,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface RoleCardConfig {
  role: UserRole;
  title: string;
  subtitle: string;
  href: string;
  dashboardHref: string;
  icon: React.ElementType;
  badge: string;
  gradient: string;
  glowColor: string;
  borderColor: string;
  accentText: string;
  demoUser: string;
  demoPass: string;
  features: string[];
}

const ROLE_CARDS: RoleCardConfig[] = [
  {
    role: "ORGANIZER",
    title: "Event Organizer",
    subtitle: "Lead planning executive & administrator",
    href: "/login/organizer",
    dashboardHref: "/dashboard/organizer",
    icon: Crown,
    badge: "Lead Authority",
    gradient: "from-purple-500/20 via-indigo-500/15 to-purple-600/25",
    glowColor: "shadow-[0_8px_24px_rgba(124,58,237,0.18)]",
    borderColor: "border-purple-500/30 hover:border-purple-500/60",
    accentText: "text-purple-600 dark:text-purple-400",
    demoUser: DEMO_CREDENTIALS.ORGANIZER.username,
    demoPass: DEMO_CREDENTIALS.ORGANIZER.password,
    features: [
      "Manage all events, budgets & expenses",
      "Interactive seating charts & invitations",
      "Executive audit reports & settings",
    ],
  },
  {
    role: "COORDINATOR",
    title: "Event Coordinator",
    subtitle: "Day-of field operations & schedule director",
    href: "/login/coordinator",
    dashboardHref: "/dashboard/coordinator",
    icon: Radio,
    badge: "Field Command",
    gradient: "from-amber-500/20 via-orange-500/15 to-amber-600/25",
    glowColor: "shadow-[0_8px_24px_rgba(245,158,11,0.18)]",
    borderColor: "border-amber-500/30 hover:border-amber-500/60",
    accentText: "text-amber-600 dark:text-amber-400",
    demoUser: DEMO_CREDENTIALS.COORDINATOR.username,
    demoPass: DEMO_CREDENTIALS.COORDINATOR.password,
    features: [
      "Live Control Center & ticking countdown",
      "Runsheet checklist & task toggles",
      "Incident logging & volunteer stations",
    ],
  },
  {
    role: "VENDOR",
    title: "Vendor Partner",
    subtitle: "Commercial supplier & service provider",
    href: "/login/vendor",
    dashboardHref: "/dashboard/vendor",
    icon: Briefcase,
    badge: "Commercial Scope",
    gradient: "from-emerald-500/20 via-teal-500/15 to-emerald-600/25",
    glowColor: "shadow-[0_8px_24px_rgba(16,185,129,0.18)]",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/60",
    accentText: "text-emerald-600 dark:text-emerald-400",
    demoUser: DEMO_CREDENTIALS.VENDOR.username,
    demoPass: DEMO_CREDENTIALS.VENDOR.password,
    features: [
      "Assigned bookings & quotation bids",
      "Executed contracts & milestone terms",
      "Real-time payment ledger & disbursements",
    ],
  },
  {
    role: "GUEST",
    title: "Invited Guest",
    subtitle: "Attendee self-service portal & RSVP",
    href: "/login/guest",
    dashboardHref: "/dashboard/guest",
    icon: Users,
    badge: "Self-Service",
    gradient: "from-pink-500/20 via-rose-500/15 to-pink-600/25",
    glowColor: "shadow-[0_8px_24px_rgba(236,72,153,0.18)]",
    borderColor: "border-pink-500/30 hover:border-pink-500/60",
    accentText: "text-pink-600 dark:text-pink-400",
    demoUser: DEMO_CREDENTIALS.GUEST.username,
    demoPass: DEMO_CREDENTIALS.GUEST.password,
    features: [
      "Digital invitation & instant RSVP",
      "Dietary preferences & plus-one setup",
      "Personalized seating table & QR pass",
    ],
  },
];

export default function CentralLoginPage() {
  const router = useRouter();
  const { loginRoleAccount, loadDemoAccounts } = useAuth();
  const [launchingRole, setLaunchingRole] = useState<UserRole | null>(null);

  const handleFastLaunchDemo = async (config: RoleCardConfig) => {
    setLaunchingRole(config.role);
    try {
      await loadDemoAccounts();
      const res = await loginRoleAccount(config.role, config.demoUser, config.demoPass);
      if (res.success) {
        router.push(config.dashboardHref);
      } else {
        router.push(config.href);
      }
    } catch {
      router.push(config.href);
    } finally {
      setLaunchingRole(null);
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 animate-page-enter">
      {/* Central Welcome Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-xs font-semibold text-primary-700 dark:text-primary-300 shadow-glass-subtle">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Role-Based Authentication &amp; Multi-Tenant Workspaces</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-surface-900 leading-tight">
          Select Your Workspace Portal
        </h1>
        <p className="text-sm sm:text-base text-surface-600 leading-relaxed max-w-2xl mx-auto">
          EventCraft AI provides distinct, role-tailored dashboards with isolated permissions for organizers, day-of coordinators, vendor partners, and invited guests.
        </p>
      </div>

      {/* 4 Visually Distinct Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          const isLaunching = launchingRole === card.role;

          return (
            <Card
              key={card.role}
              variant="elevated"
              className={`p-6 flex flex-col justify-between transition-all duration-200 border ${card.borderColor} ${card.glowColor} relative overflow-hidden group hover:-translate-y-1`}
            >
              <div className="space-y-5">
                {/* Header: Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/40 dark:border-white/10 flex items-center justify-center ${card.accentText} shadow-sm group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <Badge variant="secondary" size="sm" className="font-semibold">
                    {card.badge}
                  </Badge>
                </div>

                {/* Role Titles */}
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-surface-900 tracking-tight">
                    {card.title}
                  </h2>
                  <p className="text-xs text-surface-500 font-medium">
                    {card.subtitle}
                  </p>
                </div>

                {/* Feature checklist */}
                <ul className="space-y-2 text-xs text-surface-600 pt-2 border-t border-surface-200/50 dark:border-surface-800/50">
                  {card.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Demo Credentials Snippet */}
                <div className="bg-surface-500/5 dark:bg-surface-800/50 rounded-xl p-2.5 border border-surface-200/60 dark:border-surface-700/60 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-surface-500 font-medium">
                    <span>Sample User:</span>
                    <span className="font-semibold text-surface-800">{DEMO_CREDENTIALS[card.role].name}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-surface-600">
                    <span>User: <strong>{card.demoUser}</strong></span>
                    <span>Pass: <strong>{card.demoPass}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-6 mt-4 border-t border-surface-200/50 dark:border-surface-800/50">
                <Link href={card.href} className="block w-full">
                  <Button className="w-full gap-2 shadow-glass font-semibold text-xs py-2.5">
                    <span>{card.title} Login</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFastLaunchDemo(card)}
                  disabled={isLaunching}
                  className="w-full text-[11px] gap-1.5 font-medium hover:border-primary-400"
                >
                  {isLaunching ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-primary-600" aria-hidden="true" />
                      <span>1-Click Launch Demo</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Storage and Architecture Statement */}
      <div className="glass-surface-subtle rounded-2xl p-5 border border-white/60 dark:border-white/10 shadow-glass-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 shrink-0">
            <HardDrive className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-900">
              100% Client-Side Local Persistence
            </h3>
            <p className="text-xs text-surface-600">
              All 4 role workspaces persist directly in your browser&apos;s IndexedDB across 21 stores. Zero cloud server lock-in.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/register">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
              <span>Create Custom Account</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
