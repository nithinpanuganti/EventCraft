import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  updateEventVendor,
  deleteEventVendor,
} from "@/lib/vendors/vendor-service";
import { UpdateVendorSchema } from "@/lib/vendors/schemas";

interface RouteParams {
  params: Promise<{ id: string; vendorId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await params;
    const body = await req.json();
    const parsed = UpdateVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateEventVendor(vendorId, session.id, parsed.data);
    return NextResponse.json({ vendor: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update vendor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await params;
    await deleteEventVendor(vendorId, session.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete vendor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
