import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (pathname.startsWith("/dashboard/pharmacy") && token?.role !== "PHARMACY") {
      return NextResponse.redirect(new URL("/dashboard/patient", req.url));
    }

    if (pathname.startsWith("/dashboard/patient") && token?.role !== "PATIENT") {
      return NextResponse.redirect(new URL("/dashboard/pharmacy", req.url));
    }

    if (pathname.startsWith("/api/pharmacies/stock") && token?.role !== "PHARMACY") {
      return NextResponse.json({ error: "Forbidden: pharmacy role required" }, { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/pharmacies/stock/:path*",
    "/api/requests/:path*",
  ],
};
