import { z } from "zod";
import { isDisposableEmail, isInNepal } from "./nepal";

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
    if (data.latitude === undefined || Number.isNaN(data.latitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude is required" });
    }
    if (data.longitude === undefined || Number.isNaN(data.longitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude is required" });
    }
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      !Number.isNaN(data.latitude) &&
      !Number.isNaN(data.longitude) &&
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

export const stockUpsertSchema = z.object({
  medicineId: z.string().min(1),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
});

export type StockUpsertInput = z.infer<typeof stockUpsertSchema>;

export const requestCreateSchema = z.object({
  pharmacyId: z.string().min(1),
  medicineId: z.string().min(1),
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
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  medicineId: z.string().optional(),
  radiusKm: z.coerce.number().min(0).max(500).optional().default(50),
});

export const medicineSearchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
});
