"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { type TaskWithDependencies } from "@/lib/storage/types";
import { TaskPhase, TaskPriority, TaskStatus } from "@/lib/storage/types";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? "Edit Actionable Task" : "Create Actionable Task"}
      description="Define milestones, dependencies, due dates, and assignments."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="shadow-glass font-medium"
          >
            {initialTask ? "Update Task" : "Create Task"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-danger-50/90 border border-danger-200/80 text-danger-800 text-xs shadow-glass-subtle">
            {error}
          </div>
        )}

        <Input
          label="Task Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Confirm floral arrangement delivery window"
          disabled={isSubmitting}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Key specifications, phone numbers, or checklist items..."
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Assigned Role / Person"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="e.g. Lead Coordinator, Decor Lead"
            disabled={isSubmitting}
          />
        </div>

        {/* Task Prerequisites Selection in Glass Container */}
        {validPrereqCandidates.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700">
              Prerequisites (Must be completed first)
            </label>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-surface-200/80 glass-surface-subtle p-2 space-y-1 shadow-glass-subtle">
              {validPrereqCandidates.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-xs text-surface-800 hover:bg-white/70 p-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={prerequisiteTaskIds.includes(t.id)}
                    onChange={() => togglePrerequisite(t.id)}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="truncate font-medium">{t.title}</span>
                  <span className="text-[10px] text-surface-400 ml-auto font-mono">({t.phase})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
