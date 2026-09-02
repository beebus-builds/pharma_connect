import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const pharmacyId = session.user.pharmacyId;

  const where =
    session.user.role === "PHARMACY" && pharmacyId
      ? { pharmacyId }
      : { patientId: userId };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      request: { include: { medicine: true, pharmacy: { select: { name: true } }, patient: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items = await Promise.all(
    conversations.map(async (c) => {
      const unreadCount = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      });
      return {
        id: c.id,
        requestId: c.requestId,
        patient: { id: c.request.patientId, name: c.request.patient.name },
        pharmacy: { id: c.request.pharmacyId, name: c.request.pharmacy.name },
        medicine: c.request.medicine,
        updatedAt: c.updatedAt.toISOString(),
        lastMessage: c.messages[0]
          ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt.toISOString(), senderId: c.messages[0].senderId }
          : null,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ conversations: items });
}
