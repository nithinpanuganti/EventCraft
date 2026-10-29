"use client";

import React, { useEffect, useState, useCallback, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { TaskCard } from "@/components/timeline/TaskCard";

const TaskModal = dynamic(
  () => import("@/components/timeline/TaskModal").then((mod) => mod.TaskModal),
  { ssr: false }
);
import { RunSheetViewer, type DayOfActivity } from "@/components/timeline/RunSheetViewer";
import { type TaskWithDependencies } from "@/lib/storage/types";
import { CanonicalTaskStatus } from "@/lib/timeline/task-state-machine";
import { TaskPhase, TaskPriority, TaskStatus } from "@/lib/storage/types";
import {
  getLocalEvents,
  getLocalTasksWithDependencies,
  createLocalTask,
  updateLocalTask,
  updateLocalTaskStatus,
  deleteLocalTask,
  getLocalRunSheet,
  saveLocalRunSheet,
} from "@/lib/storage/local-repository";
import { useAuth } from "@/components/layout/AuthContext";
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
  eventDate?: string | null;
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
  const { user, activeEvent } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);

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

  // Load user events from local IndexedDB
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError(null);
      const evList = await getLocalEvents(user?.id);
      setEvents(evList);

      if (evList.length > 0) {
        setSelectedEventId((prev) => (prev && evList.some((e: EventItem) => e.id === prev) ? prev : (activeEvent?.id || evList[0].id)));
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load events from local storage.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.id, activeEvent?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load tasks with prerequisites and run-of-show schedule for selected event
  const loadTasksAndSchedule = useCallback(async (evId: string) => {
    try {
      setLoadingTasks(true);
      setError(null);

      const [tasksData, runSheet] = await Promise.all([
        getLocalTasksWithDependencies(evId),
        getLocalRunSheet(evId),
      ]);

      setTasks(tasksData.tasks);
      setStatusCounts(tasksData.statusCounts);
      setSchedule(runSheet || []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load tasks and schedule.");
      setTasks([]);
      setSchedule([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTasksAndSchedule(selectedEventId);
    } else {
      setTasks([]);
      setSchedule([]);
    }
  }, [selectedEventId, loadTasksAndSchedule]);

  // Handle status update
  const handleStatusChange = async (taskId: string, targetStatus: CanonicalTaskStatus) => {
    if (!selectedEventId) return;

    try {
      await updateLocalTaskStatus(taskId, targetStatus as TaskStatus);
      await loadTasksAndSchedule(selectedEventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status transition failed.";
      alert(msg);
    }
  };

  // Create or update task
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

    if (editingTask) {
      await updateLocalTask(editingTask.id, {
        title: data.title,
        description: data.description || undefined,
        phase: data.phase,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
        assignedTo: data.assignedTo,
        prerequisiteIds: data.prerequisiteTaskIds,
      });
    } else {
      await createLocalTask({
        eventId: selectedEventId,
        title: data.title,
        description: data.description || undefined,
        phase: data.phase,
        priority: data.priority,
        dueDate: data.dueDate,
        assignedTo: data.assignedTo,
        prerequisiteIds: data.prerequisiteTaskIds,
      });
    }

    await loadTasksAndSchedule(selectedEventId);
    setEditingTask(null);
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!selectedEventId) return;
    if (!confirm(`Are you sure you want to delete task "${taskTitle}"?`)) return;

    try {
      await deleteLocalTask(taskId);
      await loadTasksAndSchedule(selectedEventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete task.";
      alert(msg);
    }
  };

  // Save schedule
  const handleSaveSchedule = async (newSchedule: DayOfActivity[]) => {
    if (!selectedEventId) return;

    try {
      await saveLocalRunSheet(selectedEventId, newSchedule);
      setSchedule(newSchedule);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save run-sheet.";
      throw new Error(msg);
    }
  };

  if (loadingEvents) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Timeline, Tasks & Run-of-Show"
          description="Execution phases, dependency blocking, milestone deadlines, and coordinator schedules."
        />
        <EmptyState
          icon={ListTodo}
          title="Local profile required"
          description="Please select or create a local browser profile to view and manage your event timeline and milestones."
          actionLabel="Select Profile"
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

        <div className="flex items-center gap-2 self-start md:self-auto rounded-2xl glass-card px-3.5 py-2 shadow-glass-subtle">
          <Calendar className="h-4 w-4 text-primary-600" />
          <select
            value={selectedEventId || ""}
            onChange={(e) => {
              const id = e.target.value;
              startTransition(() => {
                setSelectedEventId(id);
              });
            }}
            className="glass-input rounded-xl px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-glass-subtle cursor-pointer focus:outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-white text-surface-900">
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
        <div className="rounded-2xl border border-danger-200/80 bg-danger-50/80 backdrop-blur-md p-4 text-xs text-danger-800 shadow-glass">
          {error}
        </div>
      )}

      {!loadingTasks && selectedEvent && (
        <>
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Overall Progress</span>
                <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-surface-900">{completionPercent}%</div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                {completedTasks} of {totalTasks} tasks completed
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Tasks</span>
                <div className="p-1.5 rounded-lg bg-primary-100/80 text-primary-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-primary-700">
                {(statusCounts.IN_PROGRESS || 0) + (statusCounts.TODO || 0)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                {statusCounts.IN_PROGRESS || 0} in progress, {statusCounts.TODO || 0} to do
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Blocked Tasks</span>
                <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-600">
                  <AlertOctagon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-700">
                {tasks.filter((t) => t.isBlockedByPrerequisites || t.status === "BLOCKED").length}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                Awaiting prerequisite completion
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Target Date</span>
                <div className="p-1.5 rounded-lg bg-indigo-100/80 text-indigo-600">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-surface-900 mt-1 truncate">
                {selectedEvent.eventDate
                  ? new Date(selectedEvent.eventDate).toLocaleDateString()
                  : "Date Unconfirmed"}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                {selectedEvent.eventDate ? "Anchor for milestones" : "Relative timeline active"}
              </div>
            </Card>
          </div>

          {/* Main Workspace Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-200/60">
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
              className="gap-1.5 text-xs self-start sm:self-auto shadow-glass font-medium"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </Button>
          </div>

          {/* TAB 1: EXECUTION PHASES */}
          {activeTab === "phases" && (
            <div className="space-y-6 pt-2 animate-page-enter">
              <div className="space-y-6">
                {PHASES.map((p) => {
                  const phaseTasks = tasks.filter((t) => t.phase === p.key);
                  const doneCount = phaseTasks.filter((t) => t.status === "COMPLETED").length;
                  const phasePct = phaseTasks.length > 0 ? Math.round((doneCount / phaseTasks.length) * 100) : 0;

                  return (
                    <Card key={p.key} className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-surface-200/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-surface-900">{p.label}</h3>
                            <Badge variant="outline" size="sm">
                              {doneCount}/{phaseTasks.length} Done ({phasePct}%)
                            </Badge>
                          </div>
                          <p className="text-xs text-surface-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>

                      {phaseTasks.length === 0 ? (
                        <div className="text-xs text-surface-400 py-6 text-center border-2 border-dashed border-surface-200/80 rounded-2xl glass-surface-subtle shadow-glass-subtle">
                          No tasks assigned to this phase.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
            <div className="space-y-4 pt-2 animate-page-enter">
              {/* Filter controls in Glass Surface */}
              <div className="flex flex-wrap items-center gap-3 p-3.5 glass-surface-subtle border border-surface-200/80 rounded-2xl text-xs shadow-glass-subtle">
                <span className="font-bold text-surface-700">Filter by:</span>

                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value as TaskPhase | "ALL")}
                  className="glass-input rounded-xl px-3 py-1.5 text-xs text-surface-800 font-medium cursor-pointer"
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
                  className="glass-input rounded-xl px-3 py-1.5 text-xs text-surface-800 font-medium cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <span className="ml-auto text-surface-500 text-[11px] font-medium">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
            <Card className="p-5 sm:p-6 animate-page-enter">
              <RunSheetViewer
                schedule={schedule}
                eventTitle={selectedEvent.title}
                eventDate={selectedEvent.eventDate}
                onSaveSchedule={handleSaveSchedule}
              />
            </Card>
          )}
        </>
      )}

      {/* Task Modal */}
      {selectedEvent && (
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
      )}
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
