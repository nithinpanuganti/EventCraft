import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEventTasks,
  createEventTask,
  getEventDaySchedule,
  updateEventDaySchedule,
} from "@/lib/timeline/timeline-service";
import {
  TaskInputSchema,
  UpdateDayOfScheduleSchema,
} from "@/lib/timeline/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/tasks
 * Returns tasks organized by phase, counts, and dependency statuses.
 * Supports `?view=schedule` to fetch the event-day run-of-show.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const url = new URL(req.url);
    const view = url.searchParams.get("view");

    if (view === "schedule") {
      const scheduleData = await getEventDaySchedule(eventId, session.id);
      if (!scheduleData) {
        return NextResponse.json(
          { error: "Event not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json(scheduleData);
    }

    const data = await getEventTasks(eventId, session.id);
    if (!data) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/events/[id]/tasks] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/tasks
 * Creates a new task or updates the full event-day run-sheet (`?action=schedule`).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();

    if (action === "schedule") {
      const parsed = UpdateDayOfScheduleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const updated = await updateEventDaySchedule(eventId, session.id, parsed.data.schedule);
      return NextResponse.json({ schedule: updated }, { status: 200 });
    }

    // Default: Create Task
    const parsed = TaskInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const task = await createEventTask(eventId, session.id, parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    console.error("[POST /api/events/[id]/tasks] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
