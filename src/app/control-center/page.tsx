"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalEvent,
  LocalTask,
  LocalEventIssue,
  LocalEmergencyContact,
  IssueSeverity,
  IssueStatus,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalTasks,
  updateLocalTask,
  getLocalEventIssues,
  createLocalEventIssue,
  updateLocalEventIssue,
  deleteLocalEventIssue,
  getLocalEmergencyContacts,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  Radio,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Play,
  Plus,
  AlertOctagon,
  Phone,
  Check,
  X,
} from "lucide-react";

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  LOW: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  CRITICAL: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold",
};

const STATUS_BADGES: Record<
  IssueStatus,
  { label: string; variant: "danger" | "warning" | "success" }
> = {
  OPEN: { label: "Open", variant: "danger" },
  INVESTIGATING: { label: "Investigating", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
};

function ControlCenterContent() {
  const { activeEvent, activeProfile } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);

  // Real-time local device clock
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Data states
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [issues, setIssues] = useState<LocalEventIssue[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<LocalEmergencyContact[]>([]);
  const [, setLoading] = useState(true);

  // Issue modal
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    title: "",
    description: "",
    severity: "MEDIUM" as IssueSeverity,
    assignedTo: "",
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Clock tick
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load events
  useEffect(() => {
    async function init() {
      try {
        const evts = await listLocalEvents();
        setAvailableEvents(evts);
        const defaultEvt = evts.find((e) => e.id === activeEvent?.id) || evts[0];
        if (defaultEvt) {
          setSelectedEventId(defaultEvt.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, [activeEvent]);

  // Load event-day operational data
  const loadDayData = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [tList, iList, ecList] = await Promise.all([
        getLocalTasks(eventId),
        getLocalEventIssues(eventId),
        getLocalEmergencyContacts(eventId),
      ]);
      setTasks(tList);
      setIssues(iList);
      setEmergencyContacts(ecList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadDayData(selectedEventId);
    }
  }, [selectedEventId]);

  // Next scheduled upcoming activity countdown
  const nextActivity = useMemo(() => {
    return tasks.find((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  }, [tasks]);

  const handleUpdateTaskStatus = async (
    taskId: string,
    status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  ) => {
    try {
      await updateLocalTask(taskId, { status });
      await loadDayData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueFormData.title.trim()) return;

    try {
      await createLocalEventIssue({
        eventId: selectedEventId,
        title: issueFormData.title.trim(),
        description: issueFormData.description.trim() || issueFormData.title.trim(),
        severity: issueFormData.severity,
        status: "OPEN",
        reportedBy: activeProfile?.name || "Coordinator",
        assignedTo: issueFormData.assignedTo.trim() || undefined,
      });
      setIsAddIssueOpen(false);
      setIssueFormData({
        title: "",
        description: "",
        severity: "MEDIUM",
        assignedTo: "",
      });
      setNotification({
        type: "info",
        title: "Issue Logged",
        message: "New incident reported and assigned to incident desk.",
      });
      await loadDayData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      await updateLocalEventIssue(issueId, {
        status,
        resolvedAt: status === "RESOLVED" ? new Date().toISOString() : null,
      });
      await loadDayData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      await deleteLocalEventIssue(issueId);
      await loadDayData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const openIssues = issues.filter((i) => i.status !== "RESOLVED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
      {notification && (
        <ToastNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Header with Live Ticking Clock */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Event-Day Control Center
            </h1>
            <Badge variant="primary" size="sm">Live Broadcast Room</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Real-time runsheet execution, rapid issue dispatcher, and rapid vendor SOS contacts.
          </p>
        </div>

        {/* Live Device Clock Banner */}
        <div className="flex items-center gap-3">
          {availableEvents.length > 1 && (
            <select
              aria-label="Select Active Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 shadow-sm"
            >
              {availableEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          )}

          <div className="glass-surface px-4 py-2 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass-subtle flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-primary-500" />
            <div className="text-sm font-black text-surface-900 tracking-wider">
              {currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status / Activity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4 specular-top flex items-center gap-3 md:col-span-2">
          <div className="h-12 w-12 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-600 shrink-0">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
              Next Scheduled Milestone
            </div>
            <div className="text-sm font-extrabold text-surface-900 truncate">
              {nextActivity ? nextActivity.title : "All scheduled milestones fulfilled!"}
            </div>
            <div className="text-xs text-surface-500 flex items-center gap-2 mt-0.5">
              <span>Status: {nextActivity?.status || "Standing By"}</span>
              {nextActivity?.assignedTo && <span>• Assigned: {nextActivity.assignedTo}</span>}
            </div>
          </div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="text-xs text-surface-500 font-medium flex items-center justify-between">
            <span>Runsheet Progress</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">
            {completedTasks} / {tasks.length}
          </div>
          <div className="text-[11px] text-surface-500">
            {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% completed
          </div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="text-xs text-rose-500 font-medium flex items-center justify-between">
            <span>Active Issues</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">{openIssues}</div>
          <div className="text-[11px] text-surface-500">
            {openIssues === 0 ? "Zero operational blocks" : "Requiring resolution"}
          </div>
        </Card>
      </div>

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Runsheet Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Play className="h-4 w-4 text-primary-500" />
              <span>Live Event Runsheet ({tasks.length})</span>
            </h2>
            <Badge variant="outline" size="sm">
              {inProgressTasks} In Progress
            </Badge>
          </div>

          <Card variant="elevated" className="divide-y divide-surface-200/50 dark:divide-surface-800/50 specular-top">
            {tasks.length > 0 ? (
              tasks.map((task, idx) => {
                const isCompleted = task.status === "COMPLETED";
                const isInProgress = task.status === "IN_PROGRESS";
                const isBlocked = task.status === "BLOCKED";

                return (
                  <div
                    key={task.id}
                    className={`p-4 transition-colors flex items-center justify-between gap-3 ${
                      isInProgress
                        ? "bg-primary-500/10"
                        : isCompleted
                        ? "opacity-60 bg-surface-500/5"
                        : "hover:bg-surface-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(
                            task.id,
                            isCompleted ? "TODO" : "COMPLETED"
                          )
                        }
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          isCompleted
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : "border-surface-300 dark:border-surface-700 text-transparent hover:text-surface-400"
                        }`}
                        title={isCompleted ? "Mark Incomplete" : "Mark Completed"}
                        aria-label={isCompleted ? `Mark task ${task.title} as incomplete` : `Mark task ${task.title} as completed`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <div className="truncate">
                        <div
                          className={`font-bold text-xs sm:text-sm text-surface-900 truncate ${
                            isCompleted ? "line-through text-surface-400" : ""
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] text-surface-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-primary-600 dark:text-primary-400">
                            #{idx + 1}
                          </span>
                          {task.assignedTo && <span>• Lead: {task.assignedTo}</span>}
                          {task.priority && <span>• {task.priority}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Status quick advancement buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCompleted && !isInProgress && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateTaskStatus(task.id, "IN_PROGRESS")}
                          className="text-xs text-primary-600 hover:bg-primary-500/10 px-2 py-1"
                        >
                          Start
                        </Button>
                      )}
                      {isInProgress && (
                        <Badge variant="warning" size="sm">
                          Live Now
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(
                            task.id,
                            isBlocked ? "TODO" : "BLOCKED"
                          )
                        }
                        className={`p-1.5 rounded-lg border text-xs transition-all ${
                          isBlocked
                            ? "bg-rose-500 text-white border-rose-600"
                            : "border-surface-200 dark:border-surface-700 text-surface-400 hover:text-rose-500"
                        }`}
                        title="Mark Delayed / Blocked"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-surface-400">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No tasks logged on the runsheet. Add timeline items to coordinate here.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Incident Desk & Emergency Contacts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Issue Logger & Resolver */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-500" />
                <span>Issue & Incident Desk</span>
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddIssueOpen(true)}
                className="flex items-center gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Incident</span>
              </Button>
            </div>

            <Card variant="elevated" className="p-4 specular-top space-y-3">
              {issues.length > 0 ? (
                issues.map((issue) => {
                  const sBadge = STATUS_BADGES[issue.status];
                  return (
                    <div
                      key={issue.id}
                      className="p-3 rounded-2xl bg-surface-500/5 border border-white/10 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-surface-900">
                            {issue.title}
                          </div>
                          {issue.description && (
                            <p className="text-[11px] text-surface-500 mt-0.5">
                              {issue.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${
                            SEVERITY_COLORS[issue.severity]
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <Badge variant={sBadge.variant} size="sm">
                          {sBadge.label}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          {issue.status !== "RESOLVED" ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(issue.id, "RESOLVED")}
                              className="text-xs text-emerald-600 hover:underline font-semibold"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(issue.id, "OPEN")}
                              className="text-xs text-surface-400 hover:underline"
                            >
                              Re-open
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteIssue(issue.id)}
                            aria-label={`Dismiss incident: ${issue.title}`}
                            className="text-surface-400 hover:text-rose-500 p-1 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-surface-400">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                  No incidents logged. Everything running smoothly!
                </div>
              )}
            </Card>
          </div>

          {/* Rapid Emergency Speed Dial */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-cyan-500" />
              <span>Rapid Emergency Speed Dial</span>
            </h2>

            <Card variant="subtle" className="p-4 space-y-2">
              {emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 dark:bg-surface-800/50 border border-white/60 dark:border-white/10"
                  >
                    <div>
                      <div className="font-bold text-xs text-surface-900">
                        {contact.name}
                      </div>
                      <div className="text-[10px] text-surface-500">
                        {contact.role} • {contact.organization || contact.category}
                      </div>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/25 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-xs text-surface-400 text-center py-4">
                  No emergency contacts configured yet.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Log Issue Modal */}
      {isAddIssueOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-issue-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsAddIssueOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 id="log-issue-modal-title" className="font-bold text-surface-900">Log Operational Incident</h3>
              <button
                type="button"
                onClick={() => setIsAddIssueOpen(false)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-surface-400 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <Input
                label="Incident Summary"
                required
                placeholder="e.g. Microphone feedback on stage 1"
                value={issueFormData.title}
                onChange={(e) =>
                  setIssueFormData({ ...issueFormData, title: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Severity
                  </label>
                  <select
                    value={issueFormData.severity}
                    onChange={(e) =>
                      setIssueFormData({
                        ...issueFormData,
                        severity: e.target.value as IssueSeverity,
                      })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <Input
                  label="Assign To"
                  placeholder="e.g. Sound Tech / Marcus"
                  value={issueFormData.assignedTo}
                  onChange={(e) =>
                    setIssueFormData({ ...issueFormData, assignedTo: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Incident Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe location, affected area, or immediate risk..."
                  value={issueFormData.description}
                  onChange={(e) =>
                    setIssueFormData({ ...issueFormData, description: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddIssueOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="shadow-glass-glow"
                >
                  Submit Incident
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ControlCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ControlCenterContent />
    </Suspense>
  );
}
