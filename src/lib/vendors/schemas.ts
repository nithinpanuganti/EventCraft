import { z } from "zod";

export const VendorStatusEnum = z.enum([
  "RESEARCHING",
  "CONTACTED",
  "QUOTED",
  "BOOKED",
  "DECLINED",
]);

export const VENDOR_CATEGORIES = [
  "Venues & Halls",
  "Catering & Bar",
  "Decor & Floral",
  "Photography & Video",
  "Music & Entertainment",
  "Lighting & AV",
  "Transportation",
  "Stationery & Invitations",
  "Hair & Makeup",
  "Event Coordination",
  "Other Services",
] as const;

export const VendorInputSchema = z.object({
  categoryName: z.string().trim().min(2, "Category is required").max(100),
  companyName: z.string().trim().min(2, "Company / Vendor name is required").max(150),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email("Invalid email address").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable(),
  websiteUrl: z.string().trim().url("Invalid website URL").optional().nullable().or(z.literal("")),
  status: VendorStatusEnum.default("RESEARCHING"),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const UpdateVendorSchema = VendorInputSchema.partial();

export const VendorQuoteInputSchema = z.object({
  vendorId: z.string().min(1, "Vendor ID is required"),
  description: z.string().trim().min(2, "Quote description is required").max(250),
  quotedAmount: z.number().positive("Quoted amount must be greater than zero").max(100000000),
  currency: z.string().trim().min(3).max(3).default("INR"),
  validUntil: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === "string" ? new Date(val) : val;
  }),
  isSelected: z.boolean().default(false),
  quoteDocumentUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
});

export const UpdateVendorQuoteSchema = VendorQuoteInputSchema.partial();

export const SelectQuoteSchema = z.object({
  quoteId: z.string().min(1, "Quote ID is required"),
});
