# PharmaConnect — Platform Spec & Phased Build Plan

All features brainstormed, specced properly, cheapest-first. Rules: no billing
required unless flagged; guests browse free; accounts only where accountability
matters (requests, chat, reports).

---

## Phase 1 — Trust (BUILD NOW)

### 1A. Verified pharmacy badge
- **Goal:** patients can tell a vetted pharmacy from an unvetted claim.
- **UX:** `BadgeCheck` "Verified" chip on PharmacyCard, map popup, profile.
  Unverified pharmacies still appear (no cold-start problem) but without the chip.
- **Data:** `Pharmacy.verified Boolean @default(false)`, `verifiedAt DateTime?`.
  `NearbyPharmacyDTO.verified`; `/api/pharmacies/nearby` includes it.
- **Admin:** `/admin/pharmacies` queue (pending first) → Verify / Unverify
  (`PATCH /api/admin/pharmacies/[id]`). License number shown for eyeballing.
- **Accept:** new signup unverified; admin verify flips chip on within one reload;
  non-admins get 403 on all `/api/admin/*`.

### 1B. Patient report flow
- **Goal:** self-policing listings (wrong stock, closed shop, wrong pin, fake).
- **UX:** flag button on PharmacyCard (patients only) → dialog
  (reason select + optional details) → toast confirmation. Guests are pointed
  to login — reports need identity or pharmacies get anonymous spam.
- **Data:** `Report { id, pharmacyId, reporterId, reason enum
  (WRONG_STOCK | CLOSED | WRONG_LOCATION | FAKE_LISTING | OTHER),
  details?, status enum (OPEN | RESOLVED | DISMISSED) @default(OPEN), timestamps }`.
- **API:** `POST /api/reports` (PATIENT only, rate-limited);
  `GET /api/admin/reports?status=`, `PATCH /api/admin/reports/[id]`.
- **Admin:** `/admin/reports` triage queue; dashboard "Pending Issues" card shows
  real count (`openReports + unverifiedCount` added to `/api/admin/stats`).
- **Accept:** guest prompted to log in; duplicate spam limited by rate limit;
  resolving a report updates the queue instantly.

### 1C. Seed + access
- Seed creates `ADMIN` user + marks seed pharmacies verified. Creds documented
  in `prisma/seed.ts` header comment only (never in README).

---

## Phase 2 — Growth (NEXT)

### 2A. SEO medicine pages
- **Goal:** free Google traffic ("Paracetamol price Kathmandu").
- **UX:** `/medicines/[generic]` static-ish pages: description, strengths,
  nearby-stock CTA. `generateMetadata` per drug; sitemap.xml.
- **Data:** none (reads existing). Optional `Medicine.description` field later.
- **Accept:** Lighthouse SEO 100, pages indexed, no auth required.

### 2B. Facebook share intents
- **Goal:** reach users where Nepali commerce happens.
- **UX:** share button on pharmacy card / medicine page → FB share intent with
  OG tags (name, address, stock). Zero SDK, plain links.
- **Accept:** shared link unfurls with pharmacy name + stock status.

---

## Phase 3 — Reach (NEXT)

### 3A. PWA + offline catalog
- **Goal:** installable, usable on flaky data.
- **UX:** manifest, icons (reuse `icon.svg`), service worker caching shell +
  medicine catalog; offline banner.
- **Accept:** Lighthouse PWA pass; airplane-mode catalog browse works.

### 3B. Low-bandwidth mode
- **Goal:** keep budget phones / 2G users.
- **UX:** auto-detect via `navigator.connection` + manual toggle: disables 3D
  hero, swaps map for text list, smaller images. Persist in localStorage.
- **Accept:** homepage < 200 KB transferred in lite mode (verify in DevTools).

### 3C. Nepali language toggle
- **Goal:** reach beyond English readers.
- **UX:** `next-intl`, `en`/`ne` toggle persisted per user. Translate chrome
  first, medicine names stay Latin (they're printed that way on strips).
- **Accept:** full homepage + auth + search flow readable in Nepali.

---

## Phase 4 — Pharmacy power tools

### 4A. Expiry / dead-stock alerts
- **Data:** `PharmacyStock` += `expiryDate?`, `mrp?`, `discountPct?`.
- **UX:** dashboard "expiring in 30/60/90 days" list; optional public
  near-expiry discount shelf. Email digest via existing SMTP.
- **Accept:** expired stock auto-flagged out of search results.

### 4B. Demand analytics inbox
- **Goal:** "12 people searched X near you while you were out of stock."
- **Data:** log searches (`SearchLog { medicineId?, query, lat, lng, createdAt }`,
  already half-present in homepage flow) → aggregate per pharmacy radius.
- **Accept:** pharmacy dashboard shows top-5 missed demands weekly.

### 4C. Multi-branch support
- **Data:** `Pharmacy` → `Location[]` (1:N); requests/stock attach to locations.
- **Accept:** one login manages N pins; migration backfills single location.

### 4D. Khalti subscription tiers
- **Goal:** revenue. Free listing vs Verified-fast-track vs Top placement.
- **Data:** extend existing `Payment { purpose }` + `Pharmacy.plan` enum.
- **Accept:** upgrade flow end-to-end in sandbox before any production pricing.

---

## Phase 5 — Patient delight

### 5A. Prescription photo request
- Patient uploads prescription image with a request; pharmacy views it in chat.
- Needs: upload pipeline (Vercel Blob or S3), image moderation (manual queue
  first), retention policy in Privacy page. Storage cost ~zero at this scale.

### 5B. Refill reminders
- Chronic meds: "your 30-day course ends Friday." Cron (Vercel Cron) + SMTP.
- Data: `Reminder { userId, medicineId, daysSupply, nextDue }`.

### 5C. Price comparison + emergency mode
- Optional MRP per stock → "same generic within 2 km, cheapest first."
- Emergency banner: nearest 3 in-stock pins + call buttons, zero typing.

---

## Phase 6 — Data plays (needs volume first)

### 6A. Shortage heatmap
- Aggregate failed searches + UNAVAILABLE requests → public live map.
- Pitch to NGOs / health journalists when data is real. Grants + press.

### 6B. Seasonal forecasting + open API
- After ~1 year of logs: pre-season stock nudges to pharmacies.
- Read-only API keys for hospitals/NGOs. Near-free to expose.

## Parked (cost or accuracy caveats)
- **SMS results** (Sparrow SMS gateway, per-SMS cost).
- **Voice search in Nepali** (Web Speech API free, but `ne-NP` accuracy is weak).
- **WhatsApp Business auto-replies** (Cloud API free tier, setup overhead).

---

## Inspection gate (every phase)
1. `npx prisma migrate dev` applies cleanly on a fresh DB.
2. `npx tsc --noEmit` clean.
3. `eslint` 0 errors on touched files.
4. `npm test` green; new pure logic has unit tests.
5. Manual click-through of the phase's acceptance criteria above.
