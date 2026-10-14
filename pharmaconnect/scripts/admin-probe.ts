async function doLogin(email: string, password: string): Promise<{ cookie: string; session: any }> {
  const safeFetch = async (path: string, init: any) => fetch("http://localhost:3000" + path, { ...init, redirect: "manual" });
  const csrfRes = await safeFetch("/api/auth/csrf", {});
  const cookies = ((csrfRes.headers as any)?.getSetCookie?.() as string[]) ?? [];
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const jar = cookies.map((raw: string) => raw.split(";")[0]).join("; ");
  const body = new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: "http://localhost:3000", json: "true" });
  const cb = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar },
    body: body.toString(),
    redirect: "manual",
  });
  const setCookies = ((cb.headers as any)?.getSetCookie?.() as string[]) ?? [];
  const cookie = [...cookies, ...setCookies].map((r: string) => r.split(";")[0]).join("; ");
  const sess = await fetch("http://localhost:3000/api/auth/session", { headers: { Cookie: cookie } });
  const json = await sess.json().catch(() => ({}));
  return { cookie, session: json };
}

async function probe(path: string, cookie: string | null, expected: number) {
  const r = await fetch("http://localhost:3000" + path, { headers: cookie ? { Cookie: cookie } : {} });
  const j: any = await r.json().catch(() => ({}));
  const ok = r.status === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${expected}  ${path}  (got ${r.status})${j.error ? "  err=" + j.error : ""}`);
  return { ok, r, j };
}

async function main() {
  const admin = await doLogin("admin@pharmaconnect.local", "Admin@123!");
  console.log("admin session:", admin.session?.user?.email, admin.session?.user?.role);
  if (admin.session?.user?.role !== "ADMIN") {
    console.log("FAIL: admin login not admin");
    process.exit(1);
  }
  await probe("/api/admin/stats", admin.cookie, 200);
  await probe("/api/admin/pharmacies?status=pending", admin.cookie, 200);
  await probe("/api/admin/pharmacies?status=all", admin.cookie, 200);
  await probe("/api/admin/medicines", admin.cookie, 200);
  await probe("/api/admin/reports", admin.cookie, 200);
  await probe("/api/admin/prescriptions", admin.cookie, 200);

  const patient = await doLogin("e2e.patient1@pharmaconnect.local", "E2ePass!23");
  console.log("patient session:", patient.session?.user?.email, patient.session?.user?.role);
  if (patient.session?.user?.role === "PATIENT") {
    await probe("/api/admin/stats", patient.cookie, 403);
    await probe("/api/admin/pharmacies", patient.cookie, 403);
  }

  await probe("/api/admin/stats", null, 403);

  process.exit(0);
}

void main().catch((e) => { console.error(e); process.exit(1); });
