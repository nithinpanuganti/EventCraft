import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  updateEventTask,
  updateTaskStatus,
  deleteEventTask,
} from "@/lib/timeline/timeline-service";
import {
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
} from "@/lib/timeline/schemas";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();

    if (action === "status") {
      const parsed = UpdateTaskStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const updated = await updateTaskStatus(taskId, session.id, parsed.data.status);
      return NextResponse.json({ task: updated });
    }

    // Default: Full task update
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateEventTask(taskId, session.id, parsed.data);
    return NextResponse.json({ task: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    await deleteEventTask(taskId, session.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
