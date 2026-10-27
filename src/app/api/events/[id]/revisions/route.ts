import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  generateRevisionProposal,
  applyRevisionProposal,
  getEventRevisionHistory,
} from "@/lib/revisions/revision-service";
import { PlanRevisionProposalSchema } from "@/lib/revisions/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const history = await getEventRevisionHistory(eventId, session.id);
    if (!history) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ revisions: history });
  } catch (error) {
    console.error("[GET /api/events/[id]/revisions] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve revision history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "propose" | "apply"
    const body = await req.json();

    if (action === "apply") {
      const parsed = PlanRevisionProposalSchema.safeParse(body.proposal);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid revision proposal payload", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const applied = await applyRevisionProposal(eventId, session.id, parsed.data);
      return NextResponse.json({ revision: applied }, { status: 200 });
    }

    // Default: Generate Proposal
    const prompt = body.prompt;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt string is required" },
        { status: 400 }
      );
    }

    const proposal = await generateRevisionProposal(eventId, session.id, prompt.trim());
    return NextResponse.json({ proposal }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process revision";
    console.error("[POST /api/events/[id]/revisions] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
