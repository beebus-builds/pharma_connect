import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmailInBackground } from "@/lib/mail";
import { newMessageEmail } from "@/lib/emails";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: requestId } = await params;
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const isParticipant = request.patientId === session.user.id || request.pharmacyId === session.user.pharmacyId;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const conversation = await prisma.conversation.findUnique({ where: { requestId } });
  if (!conversation) return NextResponse.json({ messages: [] });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { sender: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ messages, conversationId: conversation.id });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, 30, 60000);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: requestId } = await params;
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      pharmacy: {
        select: {
          id: true,
          name: true,
          user: { select: { email: true, name: true } },
        },
      },
      medicine: { select: { genericName: true, brandName: true } },
    },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const isParticipant = request.patientId === session.user.id || request.pharmacyId === session.user.pharmacyId;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const content = (body.content as string)?.trim();
  if (!content || content.length > 2000) return NextResponse.json({ error: "Invalid content" }, { status: 400 });

  let conversation = await prisma.conversation.findUnique({ where: { requestId } });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { requestId, patientId: request.patientId, pharmacyId: request.pharmacyId },
    });
  }

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: session.user.id, content },
    include: { sender: { select: { id: true, name: true } } },
  });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  // Email nudge to the other participant (realtime covers online users; email catches the rest).
  try {
    const senderIsPatient = session.user.id === request.patientId;
    const recipientEmail = senderIsPatient ? request.pharmacy.user.email : request.patient.email;
    const recipientName = senderIsPatient ? request.pharmacy.user.name : request.patient.name;
    const medicineLabel = `${request.medicine.genericName} (${request.medicine.brandName})`;
    const tpl = newMessageEmail({
      recipientName,
      senderName: message.sender.name,
      medicineLabel,
      preview: content,
    });
    sendEmailInBackground({
      to: recipientEmail,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    });
  } catch (e) {
    console.error("[messages] notify email failed:", e);
  }

  // Note: realtime push happens via realtime service if WS is connected;
  // HTTP fallback also returns message for polling clients.
  return NextResponse.json({ message }, { status: 201 });
}
