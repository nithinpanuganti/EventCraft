"use client";

import React, { useEffect, useState, useCallback, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { TaskModal } from "@/components/timeline/TaskModal";
import { TaskCard } from "@/components/timeline/TaskCard";
import { RunSheetViewer, type DayOfActivity } from "@/components/timeline/RunSheetViewer";
import { type TaskWithDependencies } from "@/lib/timeline/timeline-service";
import { CanonicalTaskStatus } from "@/lib/timeline/task-state-machine";
import { TaskPhase, TaskPriority, TaskStatus } from "@prisma/client";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  PlusCircle,
  AlertOctagon,
  Sparkles,
} from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  type: string;
  eventDate: string | null;
  status: string;
}

const PHASES: { key: TaskPhase; label: string; desc: string }[] = [
  { key: "PLANNING", label: "1. Planning", desc: "Concept, requirements & budget limits" },
  { key: "BOOKING", label: "2. Booking", desc: "Venue confirmations & vendor deposits" },
  { key: "PREPARATION", label: "3. Preparation", desc: "Guest lists, dietary & equipment setup" },
  { key: "EVENT_DAY", label: "4. Event Day", desc: "Run-of-show execution & arrivals" },
  { key: "POST_EVENT", label: "5. Post Event", desc: "Teardown, closure & vendor reconciliation" },
];

function TimelineContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<TaskWithDependencies[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<TaskStatus, number>>({
    TODO: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run-of-show schedule state
  const [schedule, setSchedule] = useState<DayOfActivity[]>([]);

  // Filtering & Modal States
  const [activeTab, setActiveTab] = useState<string>("phases");
  const [selectedPhase, setSelectedPhase] = useState<TaskPhase | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDependencies | null>(null);
  const [, startTransition] = useTransition();

  // Load user events
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError(null);
      const res = await fetch("/api/events");
      if (res.status === 401) {
        setIsUnauthenticated(true);
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || "Unable to load events.");
        setEvents([]);
        return;
      }
      const data = await res.json();
      const evList = data.events || [];
      setEvents(evList);

      if (evList.length > 0) {
        setSelectedEventId((prev) => (prev && evList.some((e: EventItem) => e.id === prev) ? prev : evList[0].id));
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load events. Please check your connection or sign in.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Load tasks & schedule for selected event
  const loadTasksAndSchedule = useCallback(async (eventId: string) => {
    try {
      setLoadingTasks(true);
      setError(null);

      const [tasksRes, scheduleRes] = await Promise.all([
        fetch(`/api/events/${eventId}/tasks`),
        fetch(`/api/events/${eventId}/tasks?view=schedule`),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
        setStatusCounts(tasksData.statusCounts || {});
      } else {
        const errJson = await tasksRes.json();
        throw new Error(errJson.error || "Failed to load tasks");
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setSchedule(scheduleData.schedule || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load timeline tasks.";
      setError(msg);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      loadTasksAndSchedule(selectedEventId);
    }
  }, [selectedEventId, loadTasksAndSchedule]);

  // Save task (create or update)
  const handleSaveTask = async (data: {
    title: string;
    description?: string | null;
    phase: TaskPhase;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string | null;
    assignedTo?: string | null;
    prerequisiteTaskIds?: string[];
  }) => {
    if (!selectedEventId) return;

    let res: Response;
    if (editingTask) {
      res = await fetch(`/api/events/${selectedEventId}/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      res = await fetch(`/api/events/${selectedEventId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save task.");
    }

    await loadTasksAndSchedule(selectedEventId);
    setEditingTask(null);
  };

  // Change task status via state machine
  const handleStatusChange = async (taskId: string, targetStatus: CanonicalTaskStatus) => {
    if (!selectedEventId) return;

    const res = await fetch(`/api/events/${selectedEventId}/tasks/${taskId}?action=status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to update task status.");
      return;
    }

    await loadTasksAndSchedule(selectedEventId);
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!selectedEventId) return;
    if (!confirm(`Are you sure you want to delete task "${taskTitle}"?`)) return;

    const res = await fetch(`/api/events/${selectedEventId}/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete task.");
      return;
    }

    await loadTasksAndSchedule(selectedEventId);
  };

  // Save schedule
  const handleSaveSchedule = async (newSchedule: DayOfActivity[]) => {
    if (!selectedEventId) return;

    const res = await fetch(`/api/events/${selectedEventId}/tasks?action=schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: newSchedule }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save run-sheet.");
    }

    setSchedule(newSchedule);
  };

  if (loadingEvents) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isUnauthenticated) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Timeline, Tasks & Run-of-Show"
          description="Execution phases, dependency blocking, milestone deadlines, and coordinator schedules."
        />
        <EmptyState
          icon={ListTodo}
          title="Sign in required"
          description="Please sign in or create an account to view and manage your event timeline and milestones."
          actionLabel="Sign In"
          actionHref="/login"
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Timeline & Task Operations"
          description="Track execution phases, manage task dependencies, and run event-day schedules."
        />
        <EmptyState
          icon={ListTodo}
          title="No events found"
          description="Create your first event draft to unlock preparation milestones and task management."
          actionLabel="Create Event"
          actionHref="/events/new"
        />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalTasks = tasks.length;
  const completedTasks = statusCounts.COMPLETED || 0;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks based on selected phase and status
  const filteredTasks = tasks.filter((t) => {
    if (selectedPhase !== "ALL" && t.phase !== selectedPhase) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-page-enter">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Timeline, Tasks & Run-of-Show"
          description="Execution phases, dependency blocking, milestone deadlines, and coordinator schedules."
        />

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Calendar className="h-4 w-4 text-surface-500" />
          <select
            value={selectedEventId || ""}
            onChange={(e) => {
              const id = e.target.value;
              startTransition(() => {
                setSelectedEventId(id);
              });
            }}
            className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingTasks && (
        <div className="flex h-36 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {!loadingTasks && selectedEvent && (
        <>
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-surface-200">
              <div className="flex items-center justify-between text-surface-500 mb-1">
                <span className="text-xs font-medium">Overall Progress</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-surface-900">{completionPercent}%</div>
              <div className="text-[11px] text-surface-500 mt-1">
                {completedTasks} of {totalTasks} tasks completed
              </div>
            </Card>

            <Card className="p-4 border-surface-200">
              <div className="flex items-center justify-between text-surface-500 mb-1">
                <span className="text-xs font-medium">Active Tasks</span>
                <Clock className="h-4 w-4 text-primary-600" />
              </div>
              <div className="text-xl font-bold text-primary-700">
                {(statusCounts.IN_PROGRESS || 0) + (statusCounts.TODO || 0)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1">
                {statusCounts.IN_PROGRESS || 0} in progress, {statusCounts.TODO || 0} to do
              </div>
            </Card>

            <Card className="p-4 border-surface-200">
              <div className="flex items-center justify-between text-surface-500 mb-1">
                <span className="text-xs font-medium">Blocked Tasks</span>
                <AlertOctagon className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-700">
                {tasks.filter((t) => t.isBlockedByPrerequisites || t.status === "BLOCKED").length}
              </div>
              <div className="text-[11px] text-surface-500 mt-1">
                Awaiting prerequisite completion
              </div>
            </Card>

            <Card className="p-4 border-surface-200">
              <div className="flex items-center justify-between text-surface-500 mb-1">
                <span className="text-xs font-medium">Event Date Target</span>
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-sm font-bold text-surface-900 mt-1">
                {selectedEvent.eventDate
                  ? new Date(selectedEvent.eventDate).toLocaleDateString()
                  : "Date Unconfirmed"}
              </div>
              <div className="text-[11px] text-surface-500 mt-1">
                {selectedEvent.eventDate ? "Anchor for milestones" : "Relative timeline active"}
              </div>
            </Card>
          </div>

          {/* Main Workspace Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-200">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "phases", label: "Execution Phases", count: totalTasks },
                { id: "checklist", label: "Full Task Checklist", count: filteredTasks.length },
                { id: "runsheet", label: "Event-Day Run-Sheet", count: schedule.length },
              ]}
            />

            <Button
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </Button>
          </div>

          {/* TAB 1: EXECUTION PHASES */}
          {activeTab === "phases" && (
            <div className="space-y-6 pt-2">
              <div className="space-y-6">
                {PHASES.map((p) => {
                  const phaseTasks = tasks.filter((t) => t.phase === p.key);
                  const doneCount = phaseTasks.filter((t) => t.status === "COMPLETED").length;
                  const phasePct = phaseTasks.length > 0 ? Math.round((doneCount / phaseTasks.length) * 100) : 0;

                  return (
                    <Card key={p.key} className="p-5 border-surface-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-surface-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-surface-900">{p.label}</h3>
                            <Badge variant="outline" className="text-[10px]">
                              {doneCount}/{phaseTasks.length} Done ({phasePct}%)
                            </Badge>
                          </div>
                          <p className="text-xs text-surface-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>

                      {phaseTasks.length === 0 ? (
                        <div className="text-xs text-surface-400 py-3 text-center border border-dashed rounded-lg bg-surface-50/50">
                          No tasks assigned to this phase.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {phaseTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onStatusChange={handleStatusChange}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              onDelete={handleDeleteTask}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-4 pt-2">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 border border-surface-200 rounded-xl text-xs">
                <span className="font-semibold text-surface-700">Filter by:</span>

                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value as TaskPhase | "ALL")}
                  className="rounded border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-800"
                >
                  <option value="ALL">All Phases</option>
                  <option value="PLANNING">1. Planning</option>
                  <option value="BOOKING">2. Booking</option>
                  <option value="PREPARATION">3. Preparation</option>
                  <option value="EVENT_DAY">4. Event Day</option>
                  <option value="POST_EVENT">5. Post Event</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <span className="ml-auto text-surface-500 text-[11px]">
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </span>
              </div>

              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No matching tasks"
                  description="Adjust your phase or status filters to view tasks, or create a new task."
                  actionLabel="Add Task"
                  onAction={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RUN-OF-SHOW SCHEDULE */}
          {activeTab === "runsheet" && (
            <div className="pt-2">
              <Card className="p-5 border-surface-200">
                <RunSheetViewer
                  schedule={schedule}
                  eventTitle={selectedEvent.title}
                  eventDate={selectedEvent.eventDate}
                  onSaveSchedule={handleSaveSchedule}
                />
              </Card>
            </div>
          )}
        </>
      )}

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
        availableTasks={tasks}
        onSave={handleSaveTask}
      />
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <TimelineContent />
    </Suspense>
  );
}
