import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { refillReminderEmail } from "@/lib/emails";

export const dynamic = "force-dynamic";

/**
 * SPECS 5B: daily Vercel Cron sweep. Emails a patient leadDays before their
 * course ends, then rolls nextDue forward once the course has passed so the
 * reminder recurs on the same cadence without manual cleanup.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const notified = { count: 0 };

  const due = await prisma.reminder.findMany({
    where: { active: true },
    include: {
      user: { select: { name: true, email: true } },
      medicine: { select: { genericName: true, brandName: true, strength: true } },
    },
  });

  for (const r of due) {
    const warnAt = r.nextDue.getTime() - r.leadDays * 24 * 60 * 60 * 1000;

    // Course already finished and we already warned: roll forward.
    if (r.nextDue.getTime() <= now.getTime() && r.lastNotifiedAt && r.lastNotifiedAt.getTime() >= warnAt) {
      await prisma.reminder.update({
        where: { id: r.id },
        data: { nextDue: new Date(now.getTime() + r.daysSupply * 24 * 60 * 60 * 1000), lastNotifiedAt: null },
      });
      continue;
    }

    // Not yet in the warning window, or already notified for this cycle.
    if (now.getTime() < warnAt) continue;
    if (r.lastNotifiedAt && r.lastNotifiedAt.getTime() >= warnAt) continue;

    const daysLeft = Math.max(0, Math.round((r.nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const medicineLabel = `${r.medicine.genericName} (${r.medicine.brandName}) ${r.medicine.strength}`;
    const tpl = refillReminderEmail({ patientName: r.user.name, medicineLabel, daysLeft });
    const result = await sendEmail({ to: r.user.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
    if (result.success || result.skipped) {
      await prisma.reminder.update({ where: { id: r.id }, data: { lastNotifiedAt: now } });
      notified.count += 1;
    }
  }

  return NextResponse.json({ ok: true, notified: notified.count, checked: due.length });
}
