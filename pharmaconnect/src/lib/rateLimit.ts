import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export function rateLimit(req: NextRequest, limit = 20, windowMs = 60000): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const now = Date.now();

  if (!store[ip] || now > store[ip].resetTime) {
    store[ip] = { count: 1, resetTime: now + windowMs };
    return null;
  }

  store[ip].count++;

  if (store[ip].count > limit) {
    return NextResponse.json(
      { error: "Too many requests, please try again later." },
      { status: 429 }
    );
  }

  return null;
}
