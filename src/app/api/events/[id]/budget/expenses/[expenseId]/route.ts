import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateExpense, deleteExpense } from "@/lib/budget/budget-service";
import { UpdateExpenseSchema } from "@/lib/budget/schemas";

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expenseId } = await params;
    const body = await req.json();
    const parsed = UpdateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateExpense(expenseId, session.id, parsed.data);
    return NextResponse.json({ expense: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expenseId } = await params;
    await deleteExpense(expenseId, session.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
