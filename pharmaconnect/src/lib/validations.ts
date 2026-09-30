import { z } from "zod";
import { isDisposableEmail, isInNepal } from "./nepal";

const queryNumber = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === null || (typeof value === "string" && value.trim() === "") ? undefined : value),
    schema
  );

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["PATIENT", "PHARMACY"]),
  // Pharmacy-only fields
  pharmacyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  licenseNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (isDisposableEmail(data.email)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Please use a permanent email address — verification mail can't reach throwaway inboxes",
    });
  }
  if (data.role === "PHARMACY") {
    if (!data.pharmacyName || data.pharmacyName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pharmacyName"], message: "Pharmacy name is required" });
    }
    if (!data.address || data.address.trim().length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Address is required" });
    }
    if (!data.phone || data.phone.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Phone number is required" });
    }
    if (data.latitude === undefined || !Number.isFinite(data.latitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude is required — pick your shop location on the map" });
    }
    if (data.longitude === undefined || !Number.isFinite(data.longitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude is required — pick your shop location on the map" });
    }
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      Number.isFinite(data.latitude) &&
      Number.isFinite(data.longitude) &&
      !isInNepal(data.latitude, data.longitude)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Location must be inside Nepal — pin your exact shop location on the map",
      });
    }
  }
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const stockUpsertSchema = z.object({
  medicineId: z.string().min(1),
  /** SPECS 4C: which branch. Omitted means the chain's primary branch. */
  locationId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").max(1000000),
  // Optional production fields — empty string from the form counts as "not set".
  expiryDate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.date({ invalid_type_error: "Enter a valid expiry date" }).optional()
  ),
  mrp: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ invalid_type_error: "MRP must be a number" }).int().min(0, "MRP cannot be negative").max(10000000).optional()
  ),
  lowStockThreshold: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ invalid_type_error: "Threshold must be a number" }).int().min(0).max(1000000).optional()
  ),
  clearExpiry: z.boolean().optional(),
});

export type StockUpsertInput = z.infer<typeof stockUpsertSchema>;

const optionalTrimmed = (max: number) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().trim().max(max).optional());

/** SPECS 4C. A branch always has a real pin inside Nepal. */
export const locationCreateSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required").max(80),
  address: z.string().trim().min(3, "Address is required").max(200),
  phone: optionalTrimmed(30),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  isPrimary: z.boolean().optional(),
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;

export const locationUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(3).max(200).optional(),
  phone: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(30).nullable().optional()),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isPrimary: z.boolean().optional(),
});

export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

/** SPECS 5B: refill reminder. Days of supply is what sets the cadence. */
export const reminderCreateSchema = z.object({
  medicineId: z.string().min(1),
  daysSupply: z.coerce.number().int().min(1, "Must be at least 1 day").max(365).default(30),
  /** Days of warning before the course is expected to run out. */
  leadDays: z.coerce.number().int().min(0).max(30).default(3),
});

export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;

export const reminderUpdateSchema = z.object({
  medicineId: z.string().min(1),
  active: z.boolean().optional(),
  daysSupply: z.coerce.number().int().min(1).max(365).optional(),
  leadDays: z.coerce.number().int().min(0).max(30).optional(),
});

export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;

export const requestCreateSchema = z.object({
  pharmacyId: z.string().min(1),
  medicineId: z.string().min(1),
  /** SPECS 4C: which branch. Omitted means the chain's primary branch. */
  locationId: z.string().min(1).optional(),
});

export type RequestCreateInput = z.infer<typeof requestCreateSchema>;

export const requestUpdateSchema = z.object({
  status: z.enum(["PENDING", "AVAILABLE", "UNAVAILABLE"]),
});

export type RequestUpdateInput = z.infer<typeof requestUpdateSchema>;

export const reportCreateSchema = z.object({
  pharmacyId: z.string().min(1),
  reason: z.enum(["WRONG_STOCK", "CLOSED", "WRONG_LOCATION", "FAKE_LISTING", "OTHER"]),
  details: z.string().max(1000).optional(),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

export const reportUpdateSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
});

export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;

export const pharmacyVerifySchema = z.object({
  verified: z.boolean(),
});

export type PharmacyVerifyInput = z.infer<typeof pharmacyVerifySchema>;

export const nearbyQuerySchema = z.object({
  lat: queryNumber(z.coerce.number().min(-90).max(90)),
  lng: queryNumber(z.coerce.number().min(-180).max(180)),
  medicineId: z.string().optional(),
  radiusKm: queryNumber(z.coerce.number().min(0).max(500)).optional().default(50),
  limit: queryNumber(z.coerce.number().int().min(1).max(50)).optional().default(20),
  cursor: z.string().max(500).optional(),
});

export const medicineSearchSchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  limit: queryNumber(z.coerce.number().int().min(1).max(30)).optional().default(15),
  cursor: z.string().max(500).optional(),
});

export const medicineCreateSchema = z.object({
  genericName: z.string().trim().min(2, "Generic name is required").max(100),
  brandName: z.string().trim().min(1, "Brand name is required").max(100),
  strength: z.string().trim().min(1, "Strength is required (e.g. 500mg)").max(50),
  manufacturer: z.string().trim().min(2, "Manufacturer is required").max(100),
});

export type MedicineCreateInput = z.infer<typeof medicineCreateSchema>;

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long").optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.password !== undefined, {
    message: "No fields to update",
  });

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  // Honeypot: a hidden field real people never fill. Deliberately unbounded so a
  // bot that fills it still passes validation and gets a bland success response.
  website: z.string().optional(),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

