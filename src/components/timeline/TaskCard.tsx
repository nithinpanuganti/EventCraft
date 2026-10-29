"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { type TaskWithDependencies } from "@/lib/storage/types";
import { CanonicalTaskStatus } from "@/lib/timeline/task-state-machine";
import {
  CheckCircle2,
  AlertOctagon,
  ArrowRightCircle,
  RotateCcw,
  Calendar,
  User,
  Edit2,
  Trash2,
} from "lucide-react";

interface TaskCardProps {
  task: TaskWithDependencies;
  onStatusChange: (taskId: string, targetStatus: CanonicalTaskStatus) => Promise<void>;
  onEdit: (task: TaskWithDependencies) => void;
  onDelete: (taskId: string, taskTitle: string) => Promise<void>;
}

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusClick = async (targetStatus: CanonicalTaskStatus) => {
    try {
      setUpdating(true);
      await onStatusChange(task.id, targetStatus);
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return <Badge variant="danger" size="sm">Critical</Badge>;
      case "HIGH":
        return <Badge variant="warning" size="sm">High</Badge>;
      case "MEDIUM":
        return <Badge variant="primary" size="sm">Medium</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Low</Badge>;
    }
  };

  const isOverdue =
    task.dueDate &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 text-xs backdrop-blur-md relative overflow-hidden ${
        task.status === "COMPLETED"
          ? "border-emerald-200/80 bg-emerald-50/40 shadow-glass-subtle"
          : task.isBlockedByPrerequisites || task.status === "BLOCKED"
          ? "border-amber-200/80 bg-amber-50/45 shadow-glass-subtle"
          : "glass-card-interactive shadow-glass border-surface-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Title and Badges */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`font-bold text-sm ${
                task.status === "COMPLETED"
                  ? "line-through text-surface-400"
                  : "text-surface-900"
              }`}
            >
              {task.title}
            </span>
            {getPriorityBadge(task.priority)}
            {task.isBlockedByPrerequisites && (
              <Badge variant="warning" size="sm" className="gap-1">
                <AlertOctagon className="h-3 w-3" />
                <span>Blocked</span>
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="danger" size="sm">Overdue</Badge>
            )}
          </div>

          {task.description && (
            <p className="text-surface-600 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Blocking explanation */}
          {task.isBlockedByPrerequisites && task.blockingReason && (
            <div className="rounded-xl bg-amber-100/80 p-2.5 text-[11px] text-amber-900 border border-amber-200/80 shadow-sm">
              {task.blockingReason}
            </div>
          )}

          {/* Metadata badges (Due date & assignee) */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-surface-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-surface-400" />
                <span className={isOverdue ? "text-danger-600 font-bold" : "font-mono"}>
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-1 font-medium text-surface-700">
                <User className="h-3.5 w-3.5 text-surface-400" />
                <span>{task.assignedTo}</span>
              </div>
            )}
            {task.completedAt && (
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Done {new Date(task.completedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            className="h-7 w-7 p-0 text-surface-400 hover:text-surface-900 rounded-lg"
            title="Edit task"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id, task.title)}
            className="h-7 w-7 p-0 text-danger-500 hover:text-danger-700 hover:bg-danger-50/80 rounded-lg"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* State Machine Transition Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-surface-200/50">
        <div className="flex items-center gap-1.5 text-surface-500 text-[11px]">
          <span>Status:</span>
          <span className="font-bold text-surface-800 uppercase text-[10px] tracking-wide">
            {task.status.replace("_", " ")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {task.status === "TODO" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("IN_PROGRESS")}
                className="h-6 text-[10px] px-2.5 gap-1 text-primary-700 border-primary-200/80 bg-primary-50/80 hover:bg-primary-100 font-semibold"
              >
                <ArrowRightCircle className="h-3 w-3" />
                <span>Start</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("CANCELLED")}
                className="h-6 text-[10px] px-2 text-surface-400 hover:text-surface-600"
              >
                Cancel
              </Button>
            </>
          )}

          {task.status === "IN_PROGRESS" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("COMPLETED")}
                className="h-6 text-[10px] px-2.5 gap-1 text-emerald-700 border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100 font-semibold"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Complete</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("BLOCKED")}
                className="h-6 text-[10px] px-2.5 gap-1 text-amber-700 border-amber-200/80 bg-amber-50/80 hover:bg-amber-100 font-semibold"
              >
                <AlertOctagon className="h-3 w-3" />
                <span>Mark Blocked</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("TODO")}
                className="h-6 text-[10px] px-2 text-surface-500"
              >
                Reset
              </Button>
            </>
          )}

          {task.status === "BLOCKED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("IN_PROGRESS")}
                className="h-6 text-[10px] px-2.5 gap-1 text-primary-700 border-primary-200/80 bg-primary-50 font-semibold"
              >
                <ArrowRightCircle className="h-3 w-3" />
                <span>Resume</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("TODO")}
                className="h-6 text-[10px] px-2 text-surface-500"
              >
                Reset
              </Button>
            </>
          )}

          {task.status === "COMPLETED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={updating}
              onClick={() => handleStatusClick("IN_PROGRESS")}
              className="h-6 text-[10px] px-2.5 gap-1 text-surface-600 hover:bg-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reopen</span>
            </Button>
          )}

          {task.status === "CANCELLED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={updating}
              onClick={() => handleStatusClick("TODO")}
              className="h-6 text-[10px] px-2.5 gap-1 text-surface-600 hover:bg-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
