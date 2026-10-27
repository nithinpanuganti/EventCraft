import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUserEvents, createEvent } from "@/lib/data-access/events";
import { CreateEventSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  try {
    const events = await listUserEvents(session.id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ error: "Failed to fetch events." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = CreateEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Force tenancy: session.id is the source of truth, ignoring any client-sent user IDs
    const event = await createEvent(result.data, session.id);

    return NextResponse.json({ message: "Event created successfully", event }, { status: 201 });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }
}
