import { prisma } from "@/lib/prisma";
import { Prisma, VendorStatus } from "@prisma/client";

export interface VendorWithQuotes {
  id: string;
  eventId: string;
  categoryName: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  status: VendorStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  quotes: {
    id: string;
    vendorId: string;
    description: string | null;
    quotedAmount: number;
    currency: string;
    validUntil: Date | null;
    isSelected: boolean;
    quoteDocumentUrl: string | null;
    createdAt: Date;
  }[];
}

/**
 * Retrieves all vendors and quotations for an event with tenant isolation.
 */
export async function getEventVendors(
  eventId: string,
  userId: string
): Promise<{
  vendors: VendorWithQuotes[];
  categories: string[];
  statusCounts: Record<VendorStatus, number>;
} | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });

  if (!event) return null;

  const rawVendors = await prisma.vendor.findMany({
    where: { eventId },
    include: {
      quotes: {
        orderBy: [{ isSelected: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ categoryName: "asc" }, { companyName: "asc" }],
  });

  const categoriesSet = new Set<string>();
  const statusCounts: Record<VendorStatus, number> = {
    RESEARCHING: 0,
    CONTACTED: 0,
    QUOTED: 0,
    BOOKED: 0,
    DECLINED: 0,
  };

  const vendors: VendorWithQuotes[] = rawVendors.map((v) => {
    categoriesSet.add(v.categoryName);
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;

    return {
      id: v.id,
      eventId: v.eventId,
      categoryName: v.categoryName,
      companyName: v.companyName,
      contactPerson: v.contactPerson,
      email: v.email,
      phone: v.phone,
      websiteUrl: v.websiteUrl,
      status: v.status,
      notes: v.notes,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      quotes: v.quotes.map((q) => ({
        id: q.id,
        vendorId: q.vendorId,
        description: q.description,
        quotedAmount: Number(q.quotedAmount),
        currency: q.currency,
        validUntil: q.validUntil,
        isSelected: q.isSelected,
        quoteDocumentUrl: q.quoteDocumentUrl,
        createdAt: q.createdAt,
      })),
    };
  });

  return {
    vendors,
    categories: Array.from(categoriesSet),
    statusCounts,
  };
}

/**
 * Creates a new vendor under an event with tenant verification.
 */
export async function createEventVendor(
  eventId: string,
  userId: string,
  data: {
    categoryName: string;
    companyName: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    status?: VendorStatus;
    notes?: string | null;
  }
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });

  if (!event) {
    throw new Error("Event not found or access denied.");
  }

  return prisma.vendor.create({
    data: {
      eventId,
      categoryName: data.categoryName.trim(),
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      websiteUrl: data.websiteUrl?.trim() || null,
      status: data.status || "RESEARCHING",
      notes: data.notes?.trim() || null,
    },
  });
}

/**
 * Updates a vendor record.
 */
export async function updateEventVendor(
  vendorId: string,
  userId: string,
  data: {
    categoryName?: string;
    companyName?: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    status?: VendorStatus;
    notes?: string | null;
  }
) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { event: { select: { userId: true } } },
  });

  if (!vendor || vendor.event.userId !== userId) {
    throw new Error("Vendor not found or access denied.");
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      categoryName: data.categoryName?.trim(),
      companyName: data.companyName?.trim(),
      contactPerson: data.contactPerson !== undefined ? (data.contactPerson?.trim() || null) : undefined,
      email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : undefined,
      websiteUrl: data.websiteUrl !== undefined ? (data.websiteUrl?.trim() || null) : undefined,
      status: data.status,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
    },
  });
}

/**
 * Deletes a vendor record and cascades quotation removals.
 */
export async function deleteEventVendor(vendorId: string, userId: string): Promise<boolean> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { event: { select: { userId: true } } },
  });

  if (!vendor || vendor.event.userId !== userId) {
    throw new Error("Vendor not found or access denied.");
  }

  await prisma.vendor.delete({
    where: { id: vendorId },
  });

  return true;
}

/**
 * Creates a quotation record under a vendor.
 */
export async function createVendorQuote(
  vendorId: string,
  userId: string,
  data: {
    description: string;
    quotedAmount: number;
    currency?: string;
    validUntil?: Date | null;
    isSelected?: boolean;
    quoteDocumentUrl?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: { id: vendorId },
      include: { event: { select: { userId: true } } },
    });

    if (!vendor || vendor.event.userId !== userId) {
      throw new Error("Vendor not found or access denied.");
    }

    // If marked selected, deselect any previous quotes for this vendor
    if (data.isSelected) {
      await tx.vendorQuote.updateMany({
        where: { vendorId },
        data: { isSelected: false },
      });
    }

    const quote = await tx.vendorQuote.create({
      data: {
        vendorId,
        description: data.description.trim(),
        quotedAmount: new Prisma.Decimal(data.quotedAmount),
        currency: data.currency?.trim() || "INR",
        validUntil: data.validUntil || null,
        isSelected: data.isSelected ?? false,
        quoteDocumentUrl: data.quoteDocumentUrl?.trim() || null,
      },
    });

    // Advance vendor status to QUOTED if still in RESEARCHING or CONTACTED
    if (vendor.status === "RESEARCHING" || vendor.status === "CONTACTED") {
      await tx.vendor.update({
        where: { id: vendorId },
        data: { status: "QUOTED" },
      });
    }

    return quote;
  });
}

/**
 * Selects a quotation as the chosen offer for a vendor.
 * Deselects other quotes for the same vendor atomically.
 * Scoped by both eventId and userId to prevent cross-event manipulation.
 */
export async function selectVendorQuote(
  quoteId: string,
  userId: string,
  eventId?: string
) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.vendorQuote.findUnique({
      where: { id: quoteId },
      include: {
        vendor: {
          include: { event: { select: { id: true, userId: true } } },
        },
      },
    });

    if (!quote || quote.vendor.event.userId !== userId) {
      throw new Error("Quote not found or access denied.");
    }

    if (eventId && quote.vendor.eventId !== eventId) {
      throw new Error("Quote does not belong to the specified event.");
    }

    // Deselect other quotes for this vendor
    await tx.vendorQuote.updateMany({
      where: { vendorId: quote.vendorId },
      data: { isSelected: false },
    });

    // Set this quote as selected
    return tx.vendorQuote.update({
      where: { id: quoteId },
      data: { isSelected: true },
    });
  });
}

/**
 * Deletes a vendor quotation record.
 * Scoped by both eventId and userId to prevent cross-event deletion.
 */
export async function deleteVendorQuote(
  quoteId: string,
  userId: string,
  eventId?: string
): Promise<boolean> {
  const quote = await prisma.vendorQuote.findUnique({
    where: { id: quoteId },
    include: {
      vendor: {
        include: { event: { select: { id: true, userId: true } } },
      },
    },
  });

  if (!quote || quote.vendor.event.userId !== userId) {
    throw new Error("Quote not found or access denied.");
  }

  if (eventId && quote.vendor.eventId !== eventId) {
    throw new Error("Quote does not belong to the specified event.");
  }

  await prisma.vendorQuote.delete({
    where: { id: quoteId },
  });

  return true;
}
