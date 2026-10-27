import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEventVendors,
  createEventVendor,
  createVendorQuote,
} from "@/lib/vendors/vendor-service";
import {
  VendorInputSchema,
  VendorQuoteInputSchema,
} from "@/lib/vendors/schemas";

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
    const data = await getEventVendors(eventId, session.id);
    if (!data) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/events/[id]/vendors] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve vendors" },
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
    const action = url.searchParams.get("action");
    const body = await req.json();

    if (action === "quote") {
      const parsed = VendorQuoteInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const quote = await createVendorQuote(parsed.data.vendorId, session.id, parsed.data);
      return NextResponse.json({ quote }, { status: 201 });
    }

    // Default: Create Vendor
    const parsed = VendorInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await createEventVendor(eventId, session.id, parsed.data);
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create vendor resource";
    console.error("[POST /api/events/[id]/vendors] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
