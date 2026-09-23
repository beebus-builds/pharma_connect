import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  requestCreateSchema,
  reportCreateSchema,
  reportUpdateSchema,
  pharmacyVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  medicineCreateSchema,
  medicineSearchSchema,
  nearbyQuerySchema,
  stockUpsertSchema,
} from "../validations";
import { verificationEmail, welcomeEmail, passwordResetEmail } from "../emails";
import { validatePhotoFile, PHOTO_MAX_BYTES } from "../photos";

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

  it("rejects NaN / Infinity coordinates at registration", () => {
    const base = {
      name: "Pharmacist",
      email: "pharma@example.com",
      password: "password123",
      role: "PHARMACY" as const,
      pharmacyName: "Health Plus",
      address: "New Road, Kathmandu",
      phone: "01-4223344",
    };
    expect(registerSchema.safeParse({ ...base, latitude: NaN, longitude: NaN }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, latitude: Infinity, longitude: 85.324 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, latitude: 27.7172, longitude: 85.324 }).success).toBe(true);
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

  it("validates auth email flows", () => {
    expect(resendVerificationSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(resendVerificationSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "secret1" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "", password: "secret1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "short" }).success).toBe(false);
  });

  it("validates stock upserts with expiry/MRP/threshold", () => {
    const base = { medicineId: "m1", quantity: 10 };
    expect(stockUpsertSchema.safeParse(base).success).toBe(true);
    expect(
      stockUpsertSchema.safeParse({ ...base, expiryDate: "2027-05-01", mrp: "45", lowStockThreshold: "5" }).success
    ).toBe(true);
    const parsed = stockUpsertSchema.safeParse({ ...base, expiryDate: "2027-05-01", mrp: "45" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expiryDate).toBeInstanceOf(Date);
      expect(parsed.data.mrp).toBe(45);
    }
    expect(stockUpsertSchema.safeParse({ ...base, quantity: -1 }).success).toBe(false);
    expect(stockUpsertSchema.safeParse({ ...base, expiryDate: "yesterday-never" }).success).toBe(false);
    expect(stockUpsertSchema.safeParse({ ...base, mrp: "-5" }).success).toBe(false);
  });

  it("validates new-product creation", () => {
    const good = {
      genericName: "Paracetamol",
      brandName: "Napa",
      strength: "500mg",
      manufacturer: "Beximco",
    };
    expect(medicineCreateSchema.safeParse(good).success).toBe(true);
    expect(medicineCreateSchema.safeParse({ ...good, genericName: "x" }).success).toBe(false);
    expect(medicineCreateSchema.safeParse({ ...good, strength: "" }).success).toBe(false);
  });

  it("validates paginated search inputs", () => {
    expect(
      nearbyQuerySchema.safeParse({ lat: "27.7172", lng: "85.324", limit: "20" }).success
    ).toBe(true);
    expect(nearbyQuerySchema.safeParse({ lat: "", lng: "85.324" }).success).toBe(false);
    expect(nearbyQuerySchema.safeParse({ lat: "27.7172", lng: "85.324", limit: "51" }).success).toBe(false);
    expect(medicineSearchSchema.safeParse({ q: "para", limit: "15" }).success).toBe(true);
    expect(medicineSearchSchema.safeParse({ q: "para", limit: "31" }).success).toBe(false);
  });

  it("validates pharmacy photo uploads", () => {
    const img = new File(["x".repeat(100)], "shop.jpg", { type: "image/jpeg" });
    expect(validatePhotoFile(img)).toBeNull();
    const badType = new File(["x"], "shop.gif", { type: "image/gif" });
    expect(validatePhotoFile(badType)).toMatch(/JPG, PNG or WebP/);
    const tooBig = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "big.png", { type: "image/png" });
    expect(validatePhotoFile(tooBig)).toMatch(/5 MB/);
  });

  it("builds transactional email templates with links", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    const verify = verificationEmail("Ram", "tok123");
    expect(verify.subject).toMatch(/Verify/);
    expect(verify.text).toContain("tok123");
    expect(verify.html).toContain("tok123");

    const welcome = welcomeEmail("Ram", "PATIENT");
    expect(welcome.subject.length).toBeGreaterThan(5);
    expect(welcome.html).toContain("Search medicines");

    const reset = passwordResetEmail("Ram", "res123");
    expect(reset.text).toContain("res123");
    expect(reset.html).toContain("60 minutes");
  });
});
