import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  requestCreateSchema,
  reportCreateSchema,
  reportUpdateSchema,
  pharmacyVerifySchema,
} from "../validations";

describe("Validations", () => {
  it("validates login input correctly", () => {
    const valid = loginSchema.safeParse({ email: "test@example.com", password: "password123" });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({ email: "notanemail", password: "" });
    expect(invalid.success).toBe(false);
  });

  it("validates patient registration input correctly", () => {
    const valid = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      role: "PATIENT",
    });
    expect(valid.success).toBe(true);
  });

  it("validates pharmacy registration input correctly", () => {
    const validPharmacy = registerSchema.safeParse({
      name: "Pharmacist",
      email: "pharma@example.com",
      password: "password123",
      role: "PHARMACY",
      pharmacyName: "Health Plus",
      address: "New Road, Kathmandu",
      phone: "01-4223344",
      latitude: 27.7172,
      longitude: 85.324,
    });
    expect(validPharmacy.success).toBe(true);

    const invalidPharmacy = registerSchema.safeParse({
      name: "Pharmacist",
      email: "pharma@example.com",
      password: "password123",
      role: "PHARMACY",
      // missing pharmacyName and address
    });
    expect(invalidPharmacy.success).toBe(false);
  });

  it("rejects pharmacy pins outside Nepal", () => {
    const base = {
      name: "Pharmacist",
      email: "pharma@example.com",
      password: "password123",
      role: "PHARMACY" as const,
      pharmacyName: "Health Plus",
      address: "New Road, Kathmandu",
      phone: "01-4223344",
    };
    const nyc = registerSchema.safeParse({ ...base, latitude: 40.7128, longitude: -74.006 });
    expect(nyc.success).toBe(false);
    if (!nyc.success) {
      expect(nyc.error.flatten().fieldErrors.latitude?.[0]).toMatch(/inside Nepal/);
    }

    const zeroZero = registerSchema.safeParse({ ...base, latitude: 0, longitude: 0 });
    expect(zeroZero.success).toBe(false);
  });

  it("rejects disposable email addresses", () => {
    const patient = registerSchema.safeParse({
      name: "John Doe",
      email: "john@mailinator.com",
      password: "password123",
      role: "PATIENT",
    });
    expect(patient.success).toBe(false);
    if (!patient.success) {
      expect(patient.error.flatten().fieldErrors.email?.[0]).toMatch(/permanent email/);
    }

    const subdomain = registerSchema.safeParse({
      name: "John Doe",
      email: "john@xyz.tempmail.com",
      password: "password123",
      role: "PATIENT",
    });
    expect(subdomain.success).toBe(false);
  });

  it("validates report creation input", () => {
    const valid = reportCreateSchema.safeParse({
      pharmacyId: "ph1",
      reason: "WRONG_STOCK",
      details: "Shelf was empty",
    });
    expect(valid.success).toBe(true);

    const noDetails = reportCreateSchema.safeParse({ pharmacyId: "ph1", reason: "CLOSED" });
    expect(noDetails.success).toBe(true);

    const badReason = reportCreateSchema.safeParse({ pharmacyId: "ph1", reason: "NOPE" });
    expect(badReason.success).toBe(false);

    const tooLong = reportCreateSchema.safeParse({
      pharmacyId: "ph1",
      reason: "OTHER",
      details: "x".repeat(1001),
    });
    expect(tooLong.success).toBe(false);
  });

  it("validates report updates and pharmacy verification", () => {
    expect(reportUpdateSchema.safeParse({ status: "RESOLVED" }).success).toBe(true);
    expect(reportUpdateSchema.safeParse({ status: "OPEN" }).success).toBe(true);
    expect(reportUpdateSchema.safeParse({ status: "BOGUS" }).success).toBe(false);
    expect(pharmacyVerifySchema.safeParse({ verified: true }).success).toBe(true);
    expect(pharmacyVerifySchema.safeParse({ verified: "yes" }).success).toBe(false);
  });
});
