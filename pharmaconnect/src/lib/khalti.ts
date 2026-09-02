const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

// NPR, in paisa (1 rupee = 100 paisa). Khalti requires amount in paisa.
export const PHARMACY_SUBSCRIPTION_AMOUNT_PAISA = 99900; // NPR 999/month
export const PHARMACY_SUBSCRIPTION_DAYS = 30;

interface InitiateParams {
  amount: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface InitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
}

function secretKey(): string {
  const key = process.env.KHALTI_SECRET_KEY;
  if (!key) throw new Error("KHALTI_SECRET_KEY is not configured");
  return key;
}

function returnUrl(): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/payments/khalti/callback`;
}

function websiteUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function initiateKhaltiPayment(params: InitiateParams): Promise<InitiateResponse> {
  const res = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: returnUrl(),
      website_url: websiteUrl(),
      amount: params.amount,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      customer_info: params.customerEmail
        ? { name: params.customerName, email: params.customerEmail, phone: params.customerPhone }
        : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Khalti initiate failed (${res.status}): ${body}`);
  }

  return res.json();
}

export type KhaltiLookupStatus = "Completed" | "Pending" | "Expired" | "User canceled" | "Refunded" | "Partially Refunded";

interface LookupResponse {
  pidx: string;
  status: KhaltiLookupStatus;
  transaction_id: string | null;
  total_amount: number;
}

export async function lookupKhaltiPayment(pidx: string): Promise<LookupResponse> {
  const res = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Khalti lookup failed (${res.status}): ${body}`);
  }

  return res.json();
}
