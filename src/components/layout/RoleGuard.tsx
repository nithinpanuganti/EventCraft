"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { canAccessRoute, getRoleDefaultDashboard } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShieldAlert, ArrowRight, UserCheck } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const { userRole, session, loading } = useAuth();

  if (loading) {
    return <>{children}</>;
  }

  const isAllowed = canAccessRoute(userRole, pathname);

  if (!isAllowed) {
    const defaultDash = getRoleDefaultDashboard(userRole);

    return (
      <div className="flex min-h-[70vh] items-center justify-center py-10 px-4 animate-page-enter">
        <Card variant="elevated" className="max-w-lg w-full p-8 text-center space-y-6 specular-top border-danger-500/30">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/10 text-danger-600 border border-danger-500/30 shadow-sm mx-auto">
            <ShieldAlert className="h-8 w-8" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <Badge variant="danger" size="sm" className="font-semibold uppercase tracking-wider">
              403 • Unauthorized Access
            </Badge>
            <h1 className="text-2xl font-black text-surface-900 tracking-tight">
              Access Restricted
            </h1>
            <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
              Your active profile (<strong className="text-surface-800">{session?.name || userRole}</strong>) is assigned the <strong className="text-surface-800">{userRole}</strong> role, which does not have permission to view or modify <code className="text-[11px] bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded font-mono text-danger-600">{pathname}</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-500/5 border border-surface-200/60 dark:border-surface-700/60 text-xs text-surface-500 text-left space-y-1">
            <span className="font-bold text-surface-800 block">Role Boundary Policy:</span>
            <p>
              {userRole === "COORDINATOR" && "Event Coordinators cannot access organizer financial settings, budget allocation ledgers, or unassigned events."}
              {userRole === "VENDOR" && "Vendors are restricted from viewing overall event budgets, guest rosters, and other vendors' bids."}
              {userRole === "GUEST" && "Guests are restricted from back-of-house planning tools, vendor contracts, and control center operations."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link href={defaultDash} className="w-full sm:flex-1">
              <Button className="w-full gap-2 text-xs font-semibold py-2.5">
                <span>Return to {userRole} Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:flex-1">
              <Button variant="outline" className="w-full gap-2 text-xs font-semibold py-2.5">
                <UserCheck className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />
                <span>Switch Role Profile</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
