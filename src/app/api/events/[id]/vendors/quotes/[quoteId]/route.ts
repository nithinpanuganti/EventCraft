import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  selectVendorQuote,
  deleteVendorQuote,
} from "@/lib/vendors/vendor-service";

interface RouteParams {
  params: Promise<{ id: string; quoteId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId, quoteId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "select") {
      const selected = await selectVendorQuote(quoteId, session.id, eventId);
      return NextResponse.json({ quote: selected }, { status: 200 });
    }

    return NextResponse.json({ error: `Unknown quote action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process quote action";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId, quoteId } = await params;
    await deleteVendorQuote(quoteId, session.id, eventId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete quote";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
