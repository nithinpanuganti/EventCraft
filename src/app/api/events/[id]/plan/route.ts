import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEventById, saveEventPlan } from "@/lib/data-access/events";
import { buildPlanningContext } from "@/lib/planning/context-builder";
import { PlanningService } from "@/lib/planning/planning-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Ownership-scoped query: Enforce tenant isolation
    const event = await getEventById(id, session.id);
    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized." }, { status: 404 });
    }

    // 2. Validate sufficient requirements
    if (!event.title || event.title.trim().length < 3) {
      return NextResponse.json(
        { error: "Event must have a title with at least 3 characters before generating a plan." },
        { status: 400 }
      );
    }

    // Parse preferences
    const prefs = event.preferences;
    let culturalPref: string | undefined;
    let specialNotes: string | undefined;

    if (prefs?.additionalNotes && typeof prefs.additionalNotes === "object") {
      const notesObj = prefs.additionalNotes as Record<string, unknown>;
      if (typeof notesObj.cultural === "string") culturalPref = notesObj.cultural;
      if (typeof notesObj.notes === "string") specialNotes = notesObj.notes;
    }

    // 3. Assemble validated planning context
    const context = buildPlanningContext({
      eventId: event.id,
      userId: session.id,
      type: event.type,
      title: event.title,
      eventDate: event.eventDate,
      location: event.location,
      guestCount: event.guestCount,
      totalBudget: Number(event.totalBudget),
      currency: event.currency,
      themePreferences: prefs?.themeDescription,
      culturalPreferences: culturalPref,
      dietaryRestrictions: prefs?.dietaryRestrictions,
      accessibilityRequirements: prefs?.accessibilityRequirements,
      specialInstructions: specialNotes,
    });

    // 4. Invoke PlanningService
    const planningService = new PlanningService();
    const result = await planningService.generatePlan(context);

    if (!result.success || !result.plan) {
      return NextResponse.json(
        { error: result.error || "Failed to generate event plan." },
        { status: 500 }
      );
    }

    // 5. Transactionally persist plan and synchronized relational records
    const persistedPlan = await saveEventPlan(event.id, session.id, result.plan);
    if (!persistedPlan) {
      return NextResponse.json(
        { error: "Failed to persist event plan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Event plan generated successfully.",
      plan: result.plan,
      source: result.source,
      provider: result.providerName,
      model: result.modelName,
      version: persistedPlan.version,
    });
  } catch (error) {
    console.error("Failed to generate event plan:", error);
    return NextResponse.json(
      { error: "Internal server error while orchestrating event plan." },
      { status: 500 }
    );
  }
}
