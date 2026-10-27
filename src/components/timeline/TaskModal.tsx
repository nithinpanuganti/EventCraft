"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { type TaskWithDependencies } from "@/lib/timeline/timeline-service";
import { TaskPhase, TaskPriority, TaskStatus } from "@prisma/client";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: TaskWithDependencies | null;
  availableTasks: TaskWithDependencies[];
  onSave: (taskData: {
    title: string;
    description?: string | null;
    phase: TaskPhase;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string | null;
    assignedTo?: string | null;
    prerequisiteTaskIds?: string[];
  }) => Promise<void>;
}

export function TaskModal({
  isOpen,
  onClose,
  initialTask,
  availableTasks,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(initialTask?.description || "");
  const [phase, setPhase] = useState<TaskPhase>(initialTask?.phase || "PLANNING");
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || "MEDIUM");
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || "TODO");
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate ? new Date(initialTask.dueDate).toISOString().split("T")[0] : ""
  );
  const [assignedTo, setAssignedTo] = useState(initialTask?.assignedTo || "");
  const [prerequisiteTaskIds, setPrerequisiteTaskIds] = useState<string[]>(
    initialTask?.prerequisites?.map((p) => p.id) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validPrereqCandidates = availableTasks.filter(
    (t) => !initialTask || t.id !== initialTask.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        phase,
        priority,
        status,
        dueDate: dueDate || null,
        assignedTo: assignedTo.trim() || null,
        prerequisiteTaskIds,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save task.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrerequisite = (id: string) => {
    setPrerequisiteTaskIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-surface-200">
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-900">
            {initialTask ? "Edit Actionable Task" : "Create Actionable Task"}
          </h3>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-surface-700 mb-1">Task Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm floral arrangement delivery window"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block font-medium text-surface-700 mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Key specifications, phone numbers, or checklist items..."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Select
                label="Execution Phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value as TaskPhase)}
                disabled={isSubmitting}
                options={[
                  { value: "PLANNING", label: "1. Planning" },
                  { value: "BOOKING", label: "2. Booking" },
                  { value: "PREPARATION", label: "3. Preparation" },
                  { value: "EVENT_DAY", label: "4. Event Day" },
                  { value: "POST_EVENT", label: "5. Post Event" },
                ]}
              />
            </div>

            <div>
              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={isSubmitting}
                options={[
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                  { value: "CRITICAL", label: "Critical" },
                ]}
              />
            </div>

            <div>
              <Select
                label="Initial Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={isSubmitting}
                options={[
                  { value: "TODO", label: "To Do" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "BLOCKED", label: "Blocked" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-surface-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-medium text-surface-700 mb-1">
                Assigned Role / Person
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="e.g. Lead Coordinator, Decor Lead"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Task Prerequisites Selection */}
          {validPrereqCandidates.length > 0 && (
            <div>
              <label className="block font-medium text-surface-700 mb-1">
                Prerequisites (Must be completed first)
              </label>
              <div className="max-h-28 overflow-y-auto rounded-lg border border-surface-200 bg-surface-50 p-2 space-y-1">
                {validPrereqCandidates.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 text-[11px] text-surface-800 hover:bg-surface-100/60 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={prerequisiteTaskIds.includes(t.id)}
                      onChange={() => togglePrerequisite(t.id)}
                      className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="truncate">{t.title}</span>
                    <span className="text-[10px] text-surface-400 ml-auto">({t.phase})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
