"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { type TaskWithDependencies } from "@/lib/timeline/timeline-service";
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
        return <Badge variant="danger" className="text-[10px]">Critical</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[10px]">High</Badge>;
      case "MEDIUM":
        return <Badge variant="primary" className="text-[10px]">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Low</Badge>;
    }
  };

  const isOverdue =
    task.dueDate &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 text-xs backdrop-blur-md ${
        task.status === "COMPLETED"
          ? "border-emerald-200/70 bg-emerald-50/30 shadow-glass"
          : task.isBlockedByPrerequisites || task.status === "BLOCKED"
          ? "border-amber-200/70 bg-amber-50/40 shadow-glass"
          : "border-white/60 bg-white/65 hover:bg-white/80 hover:border-primary-200/50 hover:shadow-glass-hover shadow-glass"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Title and Badges */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`font-semibold text-sm ${
                task.status === "COMPLETED"
                  ? "line-through text-surface-500"
                  : "text-surface-900"
              }`}
            >
              {task.title}
            </span>
            {getPriorityBadge(task.priority)}
            {task.isBlockedByPrerequisites && (
              <Badge variant="warning" className="text-[10px] gap-1">
                <AlertOctagon className="h-3 w-3" />
                <span>Blocked</span>
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="danger" className="text-[10px]">Overdue</Badge>
            )}
          </div>

          {task.description && (
            <p className="text-surface-600 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Blocking explanation */}
          {task.isBlockedByPrerequisites && task.blockingReason && (
            <div className="rounded bg-amber-100/70 p-2 text-[11px] text-amber-900 border border-amber-200">
              {task.blockingReason}
            </div>
          )}

          {/* Metadata badges (Due date & assignee) */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-surface-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className={isOverdue ? "text-rose-600 font-semibold" : ""}>
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{task.assignedTo}</span>
              </div>
            )}
            {task.completedAt && (
              <div className="flex items-center gap-1 text-emerald-700">
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
            className="h-7 w-7 p-0 text-surface-500 hover:text-surface-900"
            title="Edit task"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id, task.title)}
            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* State Machine Transition Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-surface-100">
        <div className="flex items-center gap-1 text-surface-500 text-[11px]">
          <span>Status:</span>
          <span className="font-semibold text-surface-800 uppercase text-[10px] tracking-wide">
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
                className="h-6 text-[10px] px-2 gap-1 text-primary-700 border-primary-200 bg-primary-50 hover:bg-primary-100"
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
                className="h-6 text-[10px] px-2 gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Complete</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusClick("BLOCKED")}
                className="h-6 text-[10px] px-2 gap-1 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
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
                className="h-6 text-[10px] px-2 gap-1 text-primary-700 border-primary-200 bg-primary-50"
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
              className="h-6 text-[10px] px-2 gap-1 text-surface-600 hover:bg-surface-100"
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
              className="h-6 text-[10px] px-2 gap-1 text-surface-600 hover:bg-surface-100"
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
