import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, requestCreateSchema } from "../validations";

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
      address: "123 Main St",
      phone: "555-0192",
      latitude: 40.7128,
      longitude: -74.0060,
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
});
