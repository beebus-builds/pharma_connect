import { NextResponse } from "next/server";
import { getPlanCatalog } from "@/lib/plans";

/**
 * Public plan catalog.
 *
 * Prices live in env (`PLAN_PRICE_NPR_*`) and are only readable on the server,
 * so the marketing pricing band fetches them here instead of duplicating the
 * numbers in the UI. Read-only: upgrading still goes through
 * `/api/payments/khalti/initiate`, which resolves the amount server-side.
 */
export async function GET() {
  return NextResponse.json(
    { plans: getPlanCatalog() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
