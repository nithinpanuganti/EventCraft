import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEventBudgetOverview,
  createBudgetCategory,
  bulkAdjustCategoryAllocations,
  createExpense,
} from "@/lib/budget/budget-service";
import {
  BudgetCategoryInputSchema,
  BulkAdjustAllocationsSchema,
  ExpenseInputSchema,
} from "@/lib/budget/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/budget
 * Returns the complete deterministic financial overview, categories, and expenses.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const url = new URL(req.url);
    const thresholdParam = url.searchParams.get("warningThreshold");
    const warningThreshold = thresholdParam ? Number(thresholdParam) : undefined;

    const data = await getEventBudgetOverview(eventId, session.id, warningThreshold);
    if (!data) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/events/[id]/budget] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve budget overview" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/budget
 * Handles creating categories, bulk adjusting allocations, or logging expenses.
 * Dispatched via `action` query parameter or body payload.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "category" | "bulk-allocations" | "expense"
    const body = await req.json();

    if (action === "category") {
      const parsed = BudgetCategoryInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const category = await createBudgetCategory(eventId, session.id, parsed.data);
      return NextResponse.json({ category }, { status: 201 });
    }

    if (action === "bulk-allocations") {
      const parsed = BulkAdjustAllocationsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const updatedCategories = await bulkAdjustCategoryAllocations(
        eventId,
        session.id,
        parsed.data.categories
      );
      return NextResponse.json({ categories: updatedCategories }, { status: 200 });
    }

    if (action === "expense" || !action) {
      const parsed = ExpenseInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const expense = await createExpense(eventId, session.id, parsed.data);
      return NextResponse.json({ expense }, { status: 201 });
    }

    return NextResponse.json(
      { error: `Unknown budget action: ${action}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Budget operation failed";
    console.error("[POST /api/events/[id]/budget] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
