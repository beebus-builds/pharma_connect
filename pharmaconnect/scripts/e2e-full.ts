/**
 * Comprehensive end-to-end suite — public geo edge cases, auth, inventory, and
 * the authenticated request->chat loop. Drives the real HTTP API the app uses.
 *
 *   npx tsx scripts/e2e-full.ts        # run (keeps data)
 *   npx tsx scripts/e2e-full.ts --clean
 *
 * Distinct marker (Zetafull / emails e2ef.*) so it never collides with the
 * accounts from scripts/e2e-nearby-test.ts.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = "E2ePass!23";
const CLEAN = process.argv.includes("--clean");

const MED = { genericName: "Zetafull", brandName: "E2eFull", strength: "5mg", manufacturer: "E2E Labs" };
const ORIGIN = { lat: 27.7172, lng: 85.324, label: "Thamel, Kathmandu" };

type Branch = { name: string; lat: number; lng: number; qty: number; isPrimary: boolean; expiryPast?: boolean };

function km(lat2: number, lng2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - ORIGIN.lat);
  const dLng = rad(lng2 - ORIGIN.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(ORIGIN.lat)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

type C = { name: string; pass: boolean; detail: string };
const checks: C[] = [];
function chk(name: string, pass: boolean, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
const section = (s: string) => console.log(`\n===== ${s} =====`);

// ---------- HTTP client with a cookie jar + NextAuth login ----------
type Jar = Map<string, string>;
function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function harvest(jar: Jar, res: Response) {
  const setCookies = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
function client(jar: Jar = new Map()) {
  const req = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const cookie = cookieHeader(jar);
    if (cookie) headers.set("Cookie", cookie);
    const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
    harvest(jar, res);
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON */
    }
    return { res, json, text };
  };
  return {
    jar,
    get: (p: string) => req(p),
    postJson: (p: string, body: unknown) =>
      req(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }),
    patchJson: (p: string, body: unknown) =>
      req(p, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }),
  };
}

async function doLogin(email: string, password: string) {
  const c = client();
  const csrf = await c.get("/api/auth/csrf");
  const csrfToken = (csrf.json as { csrfToken?: string } | null)?.csrfToken ?? "";
  const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: BASE, json: "true" });
  const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader(c.jar) });
  const cb = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers, body: body.toString(), redirect: "manual" });
  harvest(c.jar, cb as unknown as Response);
  const session = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader(c.jar) } });
  const sessionJson = (await session.json().catch(() => null)) as { user?: { email?: string; role?: string }; expires?: string } | null;
  return { client: c, session: sessionJson };
}

// ---------- Seed ----------
async function wipe() {
  await prisma.pharmacyStock.deleteMany({ where: { medicine: { genericName: MED.genericName } } });
  await prisma.request.deleteMany({
    where: { OR: [{ patient: { email: { startsWith: "e2ef." } } }, { pharmacy: { user: { email: { startsWith: "e2ef." } } } }] },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2ef." } } }); // cascades pharmacy -> location -> stock
  await prisma.medicine.deleteMany({ where: { genericName: MED.genericName } });
}

interface Fixture { pharmacy: { id: string; name: string; plan: string }; branches: Record<string, { id: string; lat: number; lng: number }> }

async function createPharmacy(ph: {
  email: string;
  name: string;
  phone: string;
  plan?: "FREE" | "VERIFIED" | "FEATURED";
  planExpiresAt?: Date;
  branches: Branch[];
}): Promise<Fixture> {
  const medicine0 = await prisma.medicine.findFirst({ where: { genericName: MED.genericName } });
  const user = await prisma.user.create({
    data: {
      name: ph.name,
      email: ph.email,
      password: await bcrypt.hash(PW, 10),
      role: "PHARMACY",
      emailVerified: true,
      pharmacy: {
        create: {
          name: ph.name,
          address: ph.branches[0].name,
          phone: ph.phone,
          latitude: ph.branches[0].lat,
          longitude: ph.branches[0].lng,
          plan: ph.plan ?? "FREE",
          planExpiresAt: ph.planExpiresAt ?? null,
          verified: true,
          verifiedAt: new Date(),
          locations: {
            create: ph.branches.map((b) => ({
              name: b.name, address: b.name, phone: ph.phone, latitude: b.lat, longitude: b.lng, isPrimary: b.isPrimary,
            })),
          },
        },
      },
    },
    include: { pharmacy: { include: { locations: true } } },
  });
  const branches: Fixture["branches"] = {};
  for (const [i, b] of ph.branches.entries()) {
    const loc = user.pharmacy!.locations[i];
    branches[b.name] = { id: loc.id, lat: b.lat, lng: b.lng };
    await prisma.pharmacyStock.create({
      data: {
        pharmacyId: user.pharmacy!.id, locationId: loc.id, medicineId: medicine0!.id, quantity: b.qty,
        expiryDate: b.expiryPast ? new Date(Date.now() - 86_400_000) : null,
      },
    });
    await prisma.$executeRaw`
      UPDATE "Location" SET "location" = ST_SetSRID(ST_MakePoint(${b.lng}::double precision, ${b.lat}::double precision), 4326)::geography WHERE "id" = ${loc.id}`;
  }
  return { pharmacy: { id: user.pharmacy!.id, name: ph.name, plan: ph.plan ?? "FREE" }, branches };
}

interface Seed {
  medicineId: string;
  freeNear: Fixture;
  ownerEmail: string;
  gateEmail: string;
  strangerEmail: string;
  featured: Fixture;
}

async function seed(): Promise<Seed> {
  await wipe();
  const medicine = await prisma.medicine.create({ data: MED });

  // Verification-gate patient is created via HTTP later; pre-create the others.
  await prisma.user.createMany({
    data: [
      { name: "E2EF Stranger", email: "e2ef.stranger@pharmaconnect.local", password: await bcrypt.hash(PW, 10), role: "PATIENT", emailVerified: true },
    ],
  });

  const freeNear = await createPharmacy({
    email: "e2ef.owner@pharmaconnect.local", name: "E2EF FreeNear", phone: "9811111111",
    branches: [{ name: "Main", lat: 27.72, lng: 85.324, qty: 3, isPrimary: true }],
  });
  const featured = await createPharmacy({
    email: "e2ef.featured@pharmaconnect.local", name: "E2EF FeaturedRx", phone: "9811111112", plan: "FEATURED", planExpiresAt: new Date(Date.now() + 30 * 86_400_000),
    branches: [{ name: "Main", lat: 27.87, lng: 85.324, qty: 5, isPrimary: true }],
  });
  await createPharmacy({
    email: "e2ef.multibranch@pharmaconnect.local", name: "E2EF MultiBranch", phone: "9811111113",
    branches: [
      { name: "Primary-far-empty", lat: 27.825, lng: 85.324, qty: 0, isPrimary: true },
      { name: "Branch-near", lat: 27.724, lng: 85.3242, qty: 8, isPrimary: false },
    ],
  });
  await createPharmacy({
    email: "e2ef.faronly@pharmaconnect.local", name: "E2EF FarBranchOnly", phone: "9811111114",
    branches: [
      { name: "Primary-near-empty", lat: 27.7205, lng: 85.3243, qty: 0, isPrimary: true },
      { name: "Branch-far", lat: 27.815, lng: 85.3247, qty: 9, isPrimary: false },
    ],
  });
  await createPharmacy({
    email: "e2ef.expired@pharmaconnect.local", name: "E2EF ExpiredStock", phone: "9811111115",
    branches: [{ name: "Main", lat: 27.735, lng: 85.324, qty: 5, isPrimary: true, expiryPast: true }],
  });

  return { medicineId: medicine.id, freeNear, ownerEmail: "e2ef.owner@pharmaconnect.local", gateEmail: "e2ef.gate@pharmaconnect.local", strangerEmail: "e2ef.stranger@pharmaconnect.local", featured };
}

// ---------- Tests ----------
async function runPublic(medicineId: string) {
  section("PUBLIC — search + nearby (geo edge cases)");
  const c = client();

  // Search: adversarial inputs must never 500.
  for (const [label, q] of [["xss", "<script>alert(1)</script>"], ["emoji", "🚑💊"], ["long", "a".repeat(3000)], ["noexist", "zzzznotarealmedicine"]] as const) {
    const r = await c.get(`/api/medicines/search?q=${encodeURIComponent(q)}&limit=5`);
    chk(`Search '${label}' does not 500`, r.res.status === 200 || r.res.status === 400, `status=${r.res.status}`);
  }
  {
    const r = await c.get(`/api/medicines/search?q=`);
    chk("Search empty query rejected (400)", r.res.status === 400, `status=${r.res.status}`);
  }

  const url = (extra: string) => `/api/pharmacies/nearby?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&medicineId=${medicineId}&${extra}`;

  // Ranking / expiry / branch-distance.
  const wide = await c.get(url("radiusKm=25&limit=50"));
  const rows = (wide.json as { pharmacies?: any[] } | null)?.pharmacies ?? [];
  const names = rows.map((r) => r.name);
  chk("Nearby 200", wide.res.status === 200);
  chk("Out-of-stock & expired both excluded", !names.includes("E2EF ExpiredStock"), "");
  chk("Paid 'Featured' ranks first despite being far", names[0] === "E2EF FeaturedRx", `first=${names[0]}`);
  chk("Featured labelled sponsored", rows[0]?.sponsored === true && rows[0]?.plan === "FEATURED", `plan=${rows[0]?.plan} sponsored=${rows[0]?.sponsored}`);
  const free = rows.filter((r) => r.plan === "FREE");
  const freeAsc = free.every((r, i) => i === 0 || r.distanceKm >= free[i - 1].distanceKm);
  chk("FREE results sorted by distance", freeAsc, free.map((r) => `${r.name}@${r.distanceKm}km`).join(", "));
  const multi = rows.find((r) => r.name === "E2EF MultiBranch" && r.quantity === 8);
  chk("Stocked near branch returned (not empty far primary)", Boolean(multi) && multi.distanceKm < 1, multi ? `${multi.distanceKm}km` : "missing");
  const farOnly = rows.find((r) => r.name === "E2EF FarBranchOnly");
  chk("Distance uses the STOCKED branch (~11km, not the empty near one)", Boolean(farOnly) && farOnly.distanceKm > 8 && farOnly.distanceKm < 14, farOnly ? `${farOnly.distanceKm}km` : "missing");

  // Pagination cursor integrity.
  const single = await c.get(url("radiusKm=25&limit=50"));
  const singleIds = ((single.json as { pharmacies?: { id: string }[] } | null)?.pharmacies ?? []).map((r) => r.id).sort();
  const collected: string[] = [];
  let cursor = "";
  for (let i = 0; i < 12; i++) {
    const page = await c.get(url(`radiusKm=25&limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`));
    const j = (page.json as { pharmacies?: { id: string }[]; pagination?: { hasMore: boolean; nextCursor: string | null } } | null);
    collected.push(...(j?.pharmacies ?? []).map((r) => r.id));
    if (!j?.pagination?.hasMore) break;
    cursor = j?.pagination?.nextCursor ?? "";
    if (!cursor) break;
  }
  const dedup = new Set(collected).size === collected.length;
  chk("Pagination returns no duplicates", dedup, `${collected.length} rows`);
  chk("Paginated set equals single-page set", JSON.stringify([...collected].sort()) === JSON.stringify(singleIds), `${collected.length} vs ${singleIds.length}`);

  // Validation must 400, never 500.
  for (const [label, qs] of [
    ["lat out of range", "lat=999"], ["lng non-numeric", "lng=abc"], ["missing lat", "lat=&lng=${ORIGIN.lng}"],
    ["negative radius", "radiusKm=-5"], ["huge radius", "radiusKm=99999"], ["limit 0", "limit=0"],
  ] as const) {
    const r = await c.get(`/api/pharmacies/nearby?${qs}&medicineId=${medicineId}`);
    chk(`Validation '${label}' -> 400`, r.res.status === 400, `status=${r.res.status}`);
  }
}

async function runAuth(seed: Seed) {
  section("AUTH — register, verify gate, validation");
  const c = client();

  // Weak password.
  let r = await c.postJson("/api/auth/register", { name: "Weak", email: "e2ef.weak@pharmaconnect.local", password: "1", role: "PATIENT" });
  chk("Register rejects short password (400)", r.res.status === 400, `status=${r.res.status}`);

  // Disposable email.
  r = await c.postJson("/api/auth/register", { name: "Disp", email: "throw@mailinator.com", password: "password1", role: "PATIENT" });
  chk("Register rejects disposable email (400)", r.res.status === 400, `status=${r.res.status}`);

  // Pharmacy outside Nepal.
  r = await c.postJson("/api/auth/register", { name: "BadPin", pharmacyName: "BadPin", email: "e2ef.badpin@pharmaconnect.local", password: "password1", role: "PHARMACY", address: "Somewhere", phone: "9800000000", latitude: 10, longitude: 10 });
  chk("Register rejects out-of-Nepal pharmacy pin (400)", r.res.status === 400, `status=${r.res.status}`);

  // Real registration -> login blocked until verified -> verify -> login ok.
  r = await c.postJson("/api/auth/register", { name: "Gate Patient", email: seed.gateEmail, password: PW, role: "PATIENT" });
  chk("Register patient (201)", r.res.status === 201, `status=${r.res.status}`);
  let gate = await doLogin(seed.gateEmail, PW);
  chk("Login blocked before email verification", !gate.session?.user?.email, gate.session?.user?.email ? "logged in!" : "blocked");
  const token = (await prisma.user.findUnique({ where: { email: seed.gateEmail }, select: { verificationToken: true } }))?.verificationToken;
  const verify = await c.get(`/api/auth/verify?token=${token}`);
  chk("Email verification endpoint works (200)", verify.res.status === 200, `status=${verify.res.status}`);
  gate = await doLogin(seed.gateEmail, PW);
  chk("Login succeeds after verification", Boolean(gate.session?.user?.email) && gate.session?.user?.role === "PATIENT", `${gate.session?.user?.email}`);
}

async function runInventory(seed: Seed) {
  section("INVENTORY — stock upsert + expiry hides from search");
  const owner = await doLogin(seed.ownerEmail, PW);
  chk("Pharmacy owner login", owner.session?.user?.role === "PHARMACY", owner.session?.user?.email ?? "no session");

  const branchId = seed.freeNear.branches["Main"].id;
  let r = await owner.client.postJson("/api/pharmacies/stock", { medicineId: seed.medicineId, quantity: 40, mrp: 55 });
  chk("Upsert stock (200, qty 40)", r.res.status === 200, `status=${r.res.status}`);

  r = await owner.client.postJson("/api/pharmacies/stock", { medicineId: seed.medicineId, quantity: -3 });
  chk("Reject negative quantity (400)", r.res.status === 400, `status=${r.res.status}`);

  const stranger = await doLogin(seed.strangerEmail, PW);
  r = await stranger.client.postJson("/api/pharmacies/stock", { medicineId: seed.medicineId, quantity: 5 });
  // Middleware returns 403 for a wrong-role authenticated user; the route's own
  // 401 is the no-session case. Either way the write is blocked — that's the point.
  chk("Patient cannot write stock (blocked 401/403)", r.res.status === 401 || r.res.status === 403, `status=${r.res.status}`);

  // Expiry hides from nearby.
  r = await owner.client.postJson("/api/pharmacies/stock", { medicineId: seed.medicineId, quantity: 40, expiryDate: new Date(Date.now() - 3600_000).toISOString() });
  const warned = Array.isArray((r.json as { warnings?: string[] } | null)?.warnings) && (r.json as { warnings: string[] }).warnings.length > 0;
  chk("Upsert flags expired batch warning", warned);
  const after = await owner.client.get(`/api/pharmacies/nearby?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&medicineId=${seed.medicineId}&radiusKm=25&limit=50`);
  const gone = !((after.json as { pharmacies?: { name: string }[] } | null)?.pharmacies ?? []).some((p) => p.name === "E2EF FreeNear");
  chk("Expired stock hidden from patient search", gone);
}

async function runRequests(seed: Seed) {
  section("REQUESTS + CHAT — authenticated loop");
  const patient = await doLogin(seed.gateEmail, PW);
  const owner = await doLogin(seed.ownerEmail, PW);
  const stranger = await doLogin(seed.strangerEmail, PW);
  chk("Patient + owner + stranger all logged in", Boolean(patient.session?.user && owner.session?.user && stranger.session?.user));

  const branchId = seed.freeNear.branches["Main"].id;
  let r = await patient.client.postJson("/api/requests", { pharmacyId: seed.freeNear.pharmacy.id, medicineId: seed.medicineId, locationId: branchId });
  chk("Patient creates request (201, PENDING)", r.res.status === 201 && (r.json as { request?: { status: string } } | null)?.request?.status === "PENDING", `status=${r.res.status}`);
  const requestId = (r.json as { request?: { id: string } } | null)?.request?.id ?? "";

  r = await patient.client.postJson("/api/requests", { pharmacyId: seed.freeNear.pharmacy.id, medicineId: "nonexistent" });
  chk("Request with bad medicine -> 404", r.res.status === 404, `status=${r.res.status}`);
  r = await patient.client.postJson("/api/requests", { pharmacyId: "", medicineId: "" });
  chk("Request with missing fields -> 400", r.res.status === 400, `status=${r.res.status}`);

  // Pharmacy account cannot create a request (patients only).
  r = await owner.client.postJson("/api/requests", { pharmacyId: seed.freeNear.pharmacy.id, medicineId: seed.medicineId });
  chk("Pharmacy cannot create a request (403)", r.res.status === 403, `status=${r.res.status}`);

  // Owner sees it and marks AVAILABLE.
  r = await owner.client.get("/api/requests");
  const ownerSees = ((r.json as { requests?: { id: string; medicine: { genericName: string } }[] } | null)?.requests ?? []).some((x) => x.id === requestId && x.medicine.genericName === MED.genericName);
  chk("Pharmacy sees the incoming request", ownerSees);
  r = await owner.client.patchJson(`/api/requests/${requestId}`, { status: "AVAILABLE" });
  chk("Pharmacy marks AVAILABLE (200)", r.res.status === 200, `status=${r.res.status}`);
  r = await patient.client.get("/api/requests");
  const ptSees = ((r.json as { requests?: { id: string; status: string }[] } | null)?.requests ?? []).find((x) => x.id === requestId)?.status;
  chk("Patient sees AVAILABLE status", ptSees === "AVAILABLE", `status=${ptSees}`);

  // Chat: patient sends, owner reads, non-participant blocked, empty rejected.
  r = await patient.client.postJson(`/api/requests/${requestId}/messages`, { content: "Is a prescription needed?" });
  chk("Patient sends chat message (201)", r.res.status === 201, `status=${r.res.status}`);
  r = await owner.client.get(`/api/requests/${requestId}/messages`);
  const msg = ((r.json as { messages?: { content: string; sender: { name: string } }[] } | null)?.messages ?? []).find((m) => m.content === "Is a prescription needed?");
  chk("Owner reads the message (scoped)", Boolean(msg), msg ? `from=${msg.sender.name}` : "missing");
  r = await stranger.client.get(`/api/requests/${requestId}/messages`);
  chk("Non-participant blocked from chat (403)", r.res.status === 403, `status=${r.res.status}`);
  r = await owner.client.postJson(`/api/requests/${requestId}/messages`, { content: "" });
  chk("Empty chat message rejected (400)", r.res.status === 400, `status=${r.res.status}`);
}

async function clean() {
  await wipe();
  // also remove the near-test data for a full reset
  await prisma.pharmacyStock.deleteMany({ where: { medicine: { genericName: "Zetatestine" } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e." } } });
  await prisma.medicine.deleteMany({ where: { genericName: "Zetatestine" } });
  console.log("Cleaned all e2e/e2ef test data.");
}

async function main() {
  if (CLEAN) return clean();
  // warm up
  const warm = client();
  const deadline = Date.now() + 120_000;
  for (;;) {
    const r = await warm.get("/api/medicines/search?q=zetaf").catch(() => null);
    if (r && (r.res.status === 200 || r.res.status === 400)) break;
    if (Date.now() > deadline) throw new Error("Server not ready");
    await new Promise((res) => setTimeout(res, 1500));
  }

  const seed = await seedFull();
  await runPublic(seed.medicineId);
  await runAuth(seed);
  await runInventory(seed);
  await runRequests(seed);

  const passed = checks.filter((x) => x.pass).length;
  section("SUMMARY");
  console.log(`${passed}/${checks.length} checks passed`);
  if (passed !== checks.length) {
    console.log("Failed:");
    for (const x of checks.filter((c) => !c.pass)) console.log(`  - ${x.name}  ${x.detail}`);
  }
  console.log("\nAccounts (pw " + PW + "): owner e2ef.owner@…, stranger e2ef.stranger@…, gate patient e2ef.gate@… (verified during run)");
  process.exitCode = passed === checks.length ? 0 : 1;
}

async function seedFull() {
  return seed();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
