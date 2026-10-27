import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEventById, updateEvent, deleteEvent } from "@/lib/data-access/events";
import { UpdateEventSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const event = await getEventById(id, session.id);
    if (!event) {
      // Return 404 to avoid leaking existence of events owned by other users
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Failed to retrieve event:", error);
    return NextResponse.json({ error: "Failed to retrieve event." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const result = UpdateEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateEvent(id, session.id, result.data);
    if (!updated) {
      return NextResponse.json({ error: "Event not found or unauthorized." }, { status: 404 });
    }

    return NextResponse.json({ message: "Event updated successfully", event: updated });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json({ error: "Failed to update event." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const success = await deleteEvent(id, session.id);
    if (!success) {
      return NextResponse.json({ error: "Event not found or unauthorized." }, { status: 404 });
    }

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Failed to delete event." }, { status: 500 });
  }
}
