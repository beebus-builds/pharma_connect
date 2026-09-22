import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: unknown;
  skipped?: boolean;
}

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE !== "false"
      : port === 465;
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = (process.env.SMTP_PASS ?? "").replace(/\s/g, "");
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "PharmaConnect";
  const fromEmail =
    process.env.SMTP_FROM?.trim() || user || "no-reply@pharmaconnect.local";
  return { host, port, secure, user, pass, fromName, fromEmail };
}

export function isMailConfigured(): boolean {
  const { user, pass } = getMailConfig();
  return Boolean(user && pass);
}

let cachedTransporter: Transporter | null = null;
let cachedKey = "";

function getTransporter(): Transporter | null {
  const cfg = getMailConfig();
  if (!cfg.user || !cfg.pass) return null;

  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (!cachedTransporter || cachedKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      // Production-safe timeouts so a hung SMTP server can't hang API routes.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    cachedKey = key;
  }
  return cachedTransporter;
}

export function getMailFrom(): string {
  const { fromName, fromEmail } = getMailConfig();
  return `"${fromName}" <${fromEmail}>`;
}

/**
 * Production-safe send. Never throws — returns a result object so callers
 * can decide whether to surface a warning. Set SMTP_* env vars to enable;
 * without them the send is skipped (logged) instead of crashing.
 */
export async function sendEmail({ to, subject, text, html }: MailOptions): Promise<SendEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "[mail] SMTP not configured (SMTP_USER/SMTP_PASS missing) — skipping email to",
      to,
      `subject="${subject}"`
    );
    return { success: false, skipped: true, error: new Error("SMTP not configured") };
  }

  const normalizedTo = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTo)) {
    console.warn("[mail] Invalid recipient, skipping:", to);
    return { success: false, skipped: true, error: new Error("Invalid recipient") };
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom(),
      to: normalizedTo,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br/>"),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[mail] Email sending error:", error);
    return { success: false, error };
  }
}

/** Fire-and-forget helper for transactional notifications — never rejects. */
export function sendEmailInBackground(options: MailOptions): void {
  sendEmail(options).catch((err) => {
    console.error("[mail] Background send failed:", err);
  });
}

export async function verifyMailConnection(): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("[mail] SMTP verify failed:", error);
    return false;
  }
}
