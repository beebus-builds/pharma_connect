import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newsletterSubscribeSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { isDisposableEmail } from "@/lib/nepal";
import { parseLocale } from "@/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60_000);
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = newsletterSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Enter a valid email address" },
        { status: 400 }
      );
    }

    // Honeypot tripped — return success so bots do not learn they were caught.
    if (parsed.data.website) {
      return NextResponse.json({ message: "Thanks for subscribing!" }, { status: 201 });
    }

    const email = parsed.data.email.toLowerCase();
    if (!EMAIL_RE.test(email) || isDisposableEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const requested = (body as Record<string, unknown>)?.locale;
    const locale = parseLocale(typeof requested === "string" ? requested : null) ?? "en";

    // Subscribe is intentionally idempotent, and re-subscribing an unsubscribed
    // address opts them back in. "Already subscribed" is not an error here.
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, locale, source: "footer" },
      update: { unsubscribedAt: null, locale },
    });

    return NextResponse.json({ message: "Thanks for subscribing!" }, { status: 201 });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
