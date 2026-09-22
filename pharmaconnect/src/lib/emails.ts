/** Branded transactional email templates for PharmaConnect. */

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
<div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
<div style="background:#0f766e;padding:20px 24px;color:#ffffff;">
<div style="font-size:20px;font-weight:bold;">PharmaConnect</div>
<div style="font-size:13px;opacity:0.9;">Find medicines near you in Nepal</div>
</div>
<div style="padding:24px;">
<h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">${heading}</h1>
<div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
</div>
<div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
<p style="margin:0;">${escapeHtml(title)} — PharmaConnect · Kathmandu, Nepal</p>
<p style="margin:4px 0 0;">You received this because you have a PharmaConnect account. Never share verification links or passwords.</p>
</div>
</div>
</div>
</body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:20px 0;"><a href="${url}" style="display:inline-block;padding:12px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">${label}</a></p><p style="font-size:12px;color:#64748b;">If the button doesn't work, copy this link:<br/><span style="word-break:break-all;">${url}</span></p>`;
}

export function verificationEmail(name: string, token: string) {
  const url = `${baseUrl()}/auth/verify?token=${token}`;
  const safeName = escapeHtml(name || "there");
  return {
    subject: "Verify your PharmaConnect account",
    text: `Hi ${name || "there"},\n\nWelcome to PharmaConnect! Please verify your email within 24 hours:\n${url}\n\nAfter verifying you can search medicines, send requests to nearby pharmacies, and chat with them.\n\n— PharmaConnect team`,
    html: layout(
      "Email verification",
      `Welcome, ${safeName}! Verify your email`,
      `<p>Thanks for joining <strong>PharmaConnect</strong> — Nepal's medicine finder.</p>
       <p>Please confirm this email address within <strong>24 hours</strong> so you can:</p>
       <ul><li>Search medicines near you</li><li>Send stock requests to pharmacies</li><li>Chat with pharmacists</li></ul>
       ${button(url, "Verify my email")}`
    ),
  };
}

export function welcomeEmail(name: string, role: string) {
  const safeName = escapeHtml(name || "there");
  const isPharmacy = role === "PHARMACY";
  const cta = isPharmacy
    ? `<p><strong>Next steps for your pharmacy:</strong></p>
       <ul><li>Add your medicine stock from the pharmacy dashboard</li><li>Respond to patient requests quickly to earn trust</li><li>Get <strong>Verified</strong> by the admin to stand out</li></ul>
       ${button(`${baseUrl()}/dashboard/pharmacy`, "Open pharmacy dashboard")}`
    : `<p><strong>Get started in 1 minute:</strong></p>
       <ul><li>Search any medicine (e.g. Paracetamol) near you</li><li>Send a request to the nearest in-stock pharmacy</li><li>Chat to confirm price & pickup time</li></ul>
       ${button(`${baseUrl()}/`, "Search medicines now")}`;
  return {
    subject: isPharmacy
      ? "Your pharmacy is live — add stock to get requests"
      : "You're verified — find medicines near you",
    text: `Hi ${name || "there"},\n\nYour PharmaConnect email is verified. ${isPharmacy ? "Open your pharmacy dashboard, add stock, and respond to patient requests." : "Search medicines, send requests to nearby pharmacies, and chat to confirm pickup."}\n\n${baseUrl()}\n\n— PharmaConnect team`,
    html: layout(
      "Welcome",
      `You're in, ${safeName}!`,
      `<p>Your email is verified. Here's how to get value from PharmaConnect today:</p>${cta}
       <p style="font-size:12px;color:#64748b;">Tip: enable location so we can show the nearest in-stock pharmacies.</p>`
    ),
  };
}

export function passwordResetEmail(name: string, token: string) {
  const url = `${baseUrl()}/reset-password?token=${token}`;
  return {
    subject: "Reset your PharmaConnect password",
    text: `Hi ${name || "there"},\n\nWe received a password reset request. This link expires in 60 minutes:\n${url}\n\nIf you didn't request this, you can ignore this email.\n\n— PharmaConnect team`,
    html: layout(
      "Password reset",
      "Reset your password",
      `<p>Hi ${escapeHtml(name || "there")},</p><p>Click below to set a new password. This link <strong>expires in 60 minutes</strong>.</p>${button(url, "Reset password")}<p style="font-size:12px;color:#64748b;">Didn't ask for this? Just ignore the email — your password stays unchanged.</p>`
    ),
  };
}

export function passwordChangedEmail(name: string) {
  return {
    subject: "Your PharmaConnect password was changed",
    text: `Hi ${name || "there"},\n\nYour password was just changed. If this was you, no action needed. If not, reset your password immediately.\n\n— PharmaConnect team`,
    html: layout(
      "Security notice",
      "Password changed",
      `<p>Hi ${escapeHtml(name || "there")},</p><p>Your PharmaConnect password was just changed. If this was you, you're all set.</p><p>If you didn't do this, <a href="${baseUrl()}/forgot-password">reset your password now</a> and contact support.</p>`
    ),
  };
}

export function newRequestEmail(opts: {
  pharmacyName: string;
  patientName: string;
  medicineLabel: string;
}) {
  return {
    subject: `New medicine request: ${opts.medicineLabel}`,
    text: `Hi ${opts.pharmacyName},\n\n${opts.patientName} just requested ${opts.medicineLabel} from your pharmacy. Open your dashboard to mark it Available or Unavailable.\n\n${baseUrl()}/dashboard/pharmacy\n\n— PharmaConnect`,
    html: layout(
      "New request",
      `New request: ${escapeHtml(opts.medicineLabel)}`,
      `<p>Hi ${escapeHtml(opts.pharmacyName)},</p><p><strong>${escapeHtml(opts.patientName)}</strong> requested <strong>${escapeHtml(opts.medicineLabel)}</strong>.</p><p>Respond quickly — patients usually visit the first pharmacy that confirms stock.</p>${button(`${baseUrl()}/dashboard/pharmacy`, "Review request")}`
    ),
  };
}

export function requestStatusEmail(opts: {
  patientName: string;
  pharmacyName: string;
  medicineLabel: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "PENDING";
}) {
  const available = opts.status === "AVAILABLE";
  return {
    subject: available
      ? `${opts.medicineLabel} is available at ${opts.pharmacyName}`
      : `Update on your ${opts.medicineLabel} request`,
    text: `Hi ${opts.patientName},\n\n${opts.pharmacyName} marked your request for ${opts.medicineLabel} as ${opts.status}.\n${available ? "Visit or call them soon to confirm pickup." : "Try another nearby pharmacy from the search page."}\n\n${baseUrl()}/\n\n— PharmaConnect`,
    html: layout(
      "Request update",
      available ? "Good news — it's in stock!" : "Request update",
      `<p>Hi ${escapeHtml(opts.patientName)},</p><p><strong>${escapeHtml(opts.pharmacyName)}</strong> marked <strong>${escapeHtml(opts.medicineLabel)}</strong> as <strong>${opts.status}</strong>.</p>${available ? `<p>Call or visit soon to confirm pickup before stock runs out.</p>${button(`${baseUrl()}/dashboard/patient`, "View my requests")}` : `<p>Don't worry — try another nearby pharmacy:</p>${button(`${baseUrl()}/`, "Search again")}`}`
    ),
  };
}

export function newMessageEmail(opts: {
  recipientName: string;
  senderName: string;
  medicineLabel: string;
  preview: string;
}) {
  const preview = opts.preview.length > 140 ? opts.preview.slice(0, 140) + "…" : opts.preview;
  return {
    subject: `New message from ${opts.senderName} (${opts.medicineLabel})`,
    text: `Hi ${opts.recipientName},\n\n${opts.senderName} sent you a message about ${opts.medicineLabel}:\n"${preview}"\n\nReply here: ${baseUrl()}/dashboard/patient\n\n— PharmaConnect`,
    html: layout(
      "New message",
      `New message from ${escapeHtml(opts.senderName)}`,
      `<p>Hi ${escapeHtml(opts.recipientName)},</p><p>About <strong>${escapeHtml(opts.medicineLabel)}</strong>:</p><blockquote style="border-left:3px solid #0f766e;padding-left:12px;color:#334155;">${escapeHtml(preview)}</blockquote>${button(`${baseUrl()}/chat`, "Open chat")}`
    ),
  };
}

export function pharmacyVerifiedEmail(pharmacyName: string, verified: boolean) {
  return {
    subject: verified
      ? "Your pharmacy is now Verified on PharmaConnect"
      : "Your pharmacy verification was removed",
    text: verified
      ? `Congratulations ${pharmacyName}!\n\nYour pharmacy is now VERIFIED on PharmaConnect. Patients will see a Verified badge on your listing, map pin, and profile — respond fast to requests to make the most of it.\n\n${baseUrl()}/dashboard/pharmacy`
      : `Hi ${pharmacyName},\n\nYour Verified badge was removed. Make sure your license, address, and stock are accurate, then contact support for re-verification.`,
    html: layout(
      verified ? "Verified" : "Verification update",
      verified ? "You're Verified!" : "Verification update",
      verified
        ? `<p>Congratulations, <strong>${escapeHtml(pharmacyName)}</strong>!</p><p>Your pharmacy now shows a <strong>Verified badge</strong> on cards, map pins, and your profile. Keep stock fresh and response times fast.</p>${button(`${baseUrl()}/dashboard/pharmacy`, "Open dashboard")}`
        : `<p>Hi ${escapeHtml(pharmacyName)},</p><p>Your Verified badge was removed. Check your license details, address pin, and stock accuracy, then reply to support for re-review.</p>`
    ),
  };
}

export function reportStatusEmail(opts: {
  reporterName: string;
  pharmacyName: string;
  status: string;
}) {
  return {
    subject: `Update on your report for ${opts.pharmacyName}`,
    text: `Hi ${opts.reporterName},\n\nThanks for keeping PharmaConnect accurate. Your report for ${opts.pharmacyName} is now ${opts.status}.\n\n— PharmaConnect team`,
    html: layout(
      "Report update",
      "Thanks for your report",
      `<p>Hi ${escapeHtml(opts.reporterName)},</p><p>Your report for <strong>${escapeHtml(opts.pharmacyName)}</strong> is now <strong>${escapeHtml(opts.status)}</strong>. Thanks for keeping listings accurate for everyone.</p>`
    ),
  };
}

export function lowStockAlertEmail(opts: {
  pharmacyName: string;
  medicineLabel: string;
  quantity: number;
  threshold: number;
}) {
  return {
    subject: `Low stock: ${opts.medicineLabel} (${opts.quantity} left)`,
    text: `Hi ${opts.pharmacyName},\n\nHeads up — ${opts.medicineLabel} is down to ${opts.quantity} units (your alert threshold is ${opts.threshold}).\n\nRestock soon so patients keep finding you in search. Open your dashboard to update stock.\n\n${baseUrl()}/dashboard/pharmacy\n\n— PharmaConnect`,
    html: layout(
      "Low stock",
      `Running low: ${escapeHtml(opts.medicineLabel)}`,
      `<p>Hi ${escapeHtml(opts.pharmacyName)},</p><p><strong>${escapeHtml(opts.medicineLabel)}</strong> is down to <strong>${opts.quantity} units</strong> (alert threshold: ${opts.threshold}).</p><p>Restock soon — listings with zero stock disappear from patient search.</p>${button(`${baseUrl()}/dashboard/pharmacy`, "Update stock")}`
    ),
  };
}

export function subscriptionReceiptEmail(opts: {
  pharmacyName: string;
  amount: number;
  transactionId?: string | null;
}) {
  return {
    subject: "PharmaConnect subscription activated",
    text: `Hi ${opts.pharmacyName},\n\nYour PharmaConnect subscription payment of Rs. ${opts.amount} succeeded${opts.transactionId ? ` (txn ${opts.transactionId})` : ""}. Your subscription is now active.\n\n${baseUrl()}/dashboard/pharmacy\n\n— PharmaConnect`,
    html: layout(
      "Payment receipt",
      "Subscription activated",
      `<p>Hi ${escapeHtml(opts.pharmacyName)},</p><p>Payment of <strong>Rs. ${opts.amount}</strong> succeeded${opts.transactionId ? ` (txn <code>${escapeHtml(opts.transactionId)}</code>)` : ""}. Your subscription is active — enjoy priority placement and the Verified fast-track queue.</p>${button(`${baseUrl()}/dashboard/pharmacy`, "Open dashboard")}`
    ),
  };
}
