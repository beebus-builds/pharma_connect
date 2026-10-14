import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const PW = "E2ePass!23";

async function doLogin(email, pw) {
  const c = async (path, init) => {
    const res = await fetch(BASE + path, { ...init, redirect: "manual" });
    return res;
  };
  // csrf
  const csrfRes = await c("/api/auth/csrf");
  const cookies = (csrfRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const csrf = await csrfRes.json();
  const jar = cookies.map((raw) => raw.split(";")[0]).join("; ");
  const body = new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: pw, callbackUrl: BASE, json: "true" });
  const cb = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar },
    body: body.toString(),
    redirect: "manual",
  });
  const setCookies = (cb.headers as any).getSetCookie?.() ?? [];
  const cookie = [...cookies, ...setCookies].map((r) => r.split(";")[0]).join("; ");
  const sess = await fetch(BASE + "/api/auth/session", { headers: { Cookie: cookie } });
  const json = await sess.json().catch(() => ({}));
  return { cookie, session: json };
}

async function probe(path, cookie, expected) {
  const r = await fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {} });
  const j = await r.json().catch(() => ({}));
  const ok = r.status === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${expected}  ${path}  (got ${r.status})${j.error ? "  err=" + j.error : ""}`);
  return { ok, r, j };
}

async function main() {
  const admin = await doLogin("admin@pharmaconnect.local", "Admin@123!");
  console.log("admin session:", admin.session?.user?.email, admin.session?.user?.role);
  if (admin.session?.user?.role !== "ADMIN") {
    console.log("FAIL admin login not admin");
    process.exit(1);
  }
  await probe("/api/admin/stats", admin.cookie, 200);
  await probe("/api/admin/pharmacies?status=pending", admin.cookie, 200);
  await probe("/api/admin/pharmacies?status=all", admin.cookie, 200);
  await probe("/api/admin/medicines", admin.cookie, 200);
  await probe("/api/admin/reports", admin.cookie, 200);
  await probe("/api/admin/prescriptions", admin.cookie, 200);

  // Non-admin role check (patient account from initial seed)
  const patient = await doLogin("e2e.patient1@pharmaconnect.local", "E2ePass!23");
  console.log("patient session:", patient.session?.user?.email, patient.session?.user?.role);
  if (patient.session?.user?.role === "PATIENT") {
    await probe("/api/admin/stats", patient.cookie, 403);
    await probe("/api/admin/pharmacies", patient.cookie, 403);
  }

  // Unauth
  await probe("/api/admin/stats", null, 403);

  // Verify a pharmacy (round-trip) on an e2e fixture if present
  const ph = admin.j ?? null;
  const list = await (await fetch(BASE + "/api/admin/pharmacies?status=all", { headers: { Cookie: admin.cookie } })).json().catch(() => ({}));
  const first = (list.pharmacies || [])[0];
  if (first) {
    console.log("admin roundtrip on pharmacy:", first.name);
    const r = await fetch(BASE + "/api/admin/pharmacies/" + first.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: admin.cookie },
      body: JSON.stringify({ verified: first.verified }),
    });
    console.log(r.status === 200 ? "PASS 200 verify round-trip" : "FAIL " + r.status);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
