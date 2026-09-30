import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysRemaining, effectivePlan, getPlanCatalog } from "@/lib/plans";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        pharmacy: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true,
            licenseNumber: true,
            verified: true,
            verifiedAt: true,
            plan: true,
            planExpiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // The plan is stored, but what the UI should act on is the *effective* tier —
    // a lapsed plan reads as FREE without anything needing to be written back.
    return NextResponse.json({
      user: {
        ...user,
        pharmacy: user.pharmacy
          ? {
              ...user.pharmacy,
              effectivePlan: effectivePlan(user.pharmacy.plan, user.pharmacy.planExpiresAt),
              daysRemaining: daysRemaining(user.pharmacy.plan, user.pharmacy.planExpiresAt),
            }
          : null,
      },
      // Prices are env-driven, so the client renders whatever ops configured.
      plans: getPlanCatalog().map(({ plan, priceRupees, label, benefits, rank, paid }) => ({
        plan,
        priceRupees,
        label,
        benefits,
        rank,
        paid,
      })),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
