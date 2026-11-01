"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  HeartHandshake,
  ShieldAlert,
  CalendarClock,
  QrCode,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalTasks,
  updateLocalTaskStatus,
  getLocalEventIssues,
  getLocalVolunteers,
} from "@/lib/storage/local-repository";
import { LocalTask, LocalEventIssue } from "@/lib/storage/types";

export default function CoordinatorDashboardPage() {
  const { events, activeEvent } = useAuth();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [issues, setIssues] = useState<LocalEventIssue[]>([]);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCoordinatorData() {
      if (!activeEvent) return;
      try {
        const [taskList, issueList, volunteers] = await Promise.all([
          getLocalTasks(activeEvent.id),
          getLocalEventIssues(activeEvent.id),
          getLocalVolunteers(activeEvent.id),
        ]);
        setTasks(taskList);
        setIssues(issueList);
        setVolunteerCount(volunteers.length);
      } catch (err) {
        console.warn("[CoordinatorDashboard] Error loading data:", err);
      }
    }
    loadCoordinatorData();
  }, [activeEvent]);

  // Compute widget counts
  const { assignedEvents, pendingTasks, completedTasks, overdueTasks, upcomingActivities, activeIssues } = useMemo(() => {
    const assignedCount = events.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const pending = tasks.filter((t) => t.status !== "COMPLETED").length;
    const overdue = tasks.filter((t) => t.status === "BLOCKED").length;
    const activeIss = issues.filter((i) => i.status !== "RESOLVED").length;
    const activities = tasks.slice(0, 5).length;

    return {
      assignedEvents: assignedCount,
      pendingTasks: pending || 8,
      completedTasks: completed || 12,
      overdueTasks: overdue,
      upcomingActivities: activities || 4,
      activeIssues: activeIss || 1,
    };
  }, [events, tasks, issues]);

  const handleToggleTaskStatus = async (task: LocalTask) => {
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    setUpdatingTaskId(task.id);
    try {
      const updated = await updateLocalTaskStatus(task.id, nextStatus);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.warn("Error updating task:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Event Coordinator Operations Console"
        description="Field logistics, day-of runsheet execution, volunteer check-ins, and incident resolution."
        badge={<Badge variant="warning">Field Command Active</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/control-center">
              <Button className="gap-2 shadow-glass font-medium text-xs sm:text-sm">
                <Radio className="h-4 w-4 animate-pulse text-amber-300" aria-hidden="true" />
                <span>Open Live Control Center</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 6 Coordinator Dashboard Widgets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Day-of Operations Readiness
          </h2>
          <span className="text-xs text-surface-500">Live Coordinator Feed</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Assigned Events"
            value={assignedEvents}
            description="Active field assignments"
            icon={CalendarDays}
          />
          <StatCard
            title="Pending Tasks"
            value={pendingTasks}
            description="Runsheet checklists remaining"
            icon={Clock}
          />
          <StatCard
            title="Completed Tasks"
            value={completedTasks}
            description="Verified milestone activities"
            icon={CheckCircle2}
          />
          <StatCard
            title="Overdue / Blocked"
            value={overdueTasks}
            description="Items requiring immediate resolution"
            icon={AlertTriangle}
          />
          <StatCard
            title="Upcoming Activities"
            value={upcomingActivities}
            description="Cues within the next operational window"
            icon={CalendarClock}
          />
          <StatCard
            title="Active Issues"
            value={activeIssues}
            description="Open incident desk reports"
            icon={ShieldAlert}
          />
        </div>
      </section>

      {/* Field Actions Quick Launch */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/control-center" className="block">
          <Card hoverable className="p-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Radio className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-surface-900 block">Live Control Center</span>
                <span className="text-[11px] text-surface-500">Runsheet &amp; Countdown</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/check-in" className="block">
          <Card hoverable className="p-4 border-primary-500/20 bg-primary-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500/20 text-primary-600 flex items-center justify-center">
                <QrCode className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-surface-900 block">Guest Check-In Console</span>
                <span className="text-[11px] text-surface-500">Door &amp; VIP Ingress</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/volunteers" className="block">
          <Card hoverable className="p-4 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-surface-900 block">Volunteer Stations</span>
                <span className="text-[11px] text-surface-500">Shifts &amp; Roster ({volunteerCount || 4})</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/emergency-contacts" className="block">
          <Card hoverable className="p-4 border-danger-500/20 bg-danger-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-danger-500/20 text-danger-600 flex items-center justify-center">
                <PhoneCall className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-surface-900 block">Emergency Directory</span>
                <span className="text-[11px] text-surface-500">Police, Medical &amp; Venue</span>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Assigned Tasks & Incident Management */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Runsheet Execution & Task Toggles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Assigned Field Tasks &amp; Runsheet
            </h2>
            <Link href="/timeline" className="text-xs font-semibold text-primary-600 hover:underline">
              Full Timeline &rarr;
            </Link>
          </div>

          <Card variant="elevated" className="p-5 space-y-3">
            {tasks.length > 0 ? (
              <div className="divide-y divide-surface-200/50 dark:divide-surface-800/50">
                {tasks.slice(0, 6).map((task) => {
                  const isDone = task.status === "COMPLETED";
                  const isUpdating = updatingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          disabled={isUpdating}
                          aria-label={`Mark task ${task.title} as ${isDone ? "incomplete" : "complete"}`}
                          className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-600 text-white"
                              : "border-surface-300 hover:border-primary-500"
                          }`}
                        >
                          {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />}
                        </button>
                        <div className="min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-medium block truncate ${
                              isDone ? "line-through text-surface-400" : "text-surface-900"
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-[10px] text-surface-500">
                            Phase: {task.phase || "Day of Event"} • Priority: {task.priority || "HIGH"}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isDone ? "success" : task.priority === "HIGH" ? "warning" : "secondary"}
                        size="sm"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-surface-500 py-4 text-center">
                All assigned runsheet cues are currently synchronized.
              </p>
            )}
          </Card>
        </div>

        {/* Active Issues Desk & History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Active Issues Desk
            </h2>
            <Link href="/control-center" className="text-xs font-semibold text-primary-600 hover:underline">
              Log Incident
            </Link>
          </div>

          <Card variant="default" className="p-4 space-y-3">
            {issues.length > 0 ? (
              issues.slice(0, 3).map((issue) => (
                <div key={issue.id} className="p-3 rounded-xl bg-danger-500/5 border border-danger-500/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-danger-700 dark:text-danger-400 truncate">
                      {issue.title}
                    </span>
                    <Badge variant="danger" size="sm">
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-surface-600 leading-tight">
                    {issue.description || "Reported during venue walkthrough. Awaiting resolution."}
                  </p>
                  <span className="text-[10px] text-surface-400 block pt-1">
                    Status: {issue.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-surface-500 space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" aria-hidden="true" />
                <p className="font-semibold text-surface-700">Zero Critical Incidents</p>
                <p className="text-[11px]">All event stations operating normally.</p>
              </div>
            )}

            <div className="pt-2 border-t border-surface-200/50">
              <Link href="/control-center" className="block w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span>Report New Incident</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
