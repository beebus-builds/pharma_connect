import { createHash } from "crypto";
import Redis from "ioredis";
import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetTime: number };

const memoryStore = new Map<string, RateLimitEntry>();
let redisClient: Redis | null = null;
let redisInitialized = false;
let lastPrunedAt = 0;

function getRedisClient() {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  redisClient.on("error", () => undefined);
  return redisClient;
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function getRateLimitKey(req: NextRequest) {
  const route = req.nextUrl?.pathname || "unknown";
  const identity = `${route}:${getClientIp(req)}`;
  const digest = createHash("sha256").update(identity).digest("hex");
  return `pharmaconnect:rate:${digest}`;
}

function pruneMemoryStore(now: number) {
  if (now - lastPrunedAt < 60_000 && memoryStore.size < 1000) return;

  for (const [key, entry] of memoryStore) {
    if (entry.resetTime <= now) memoryStore.delete(key);
  }
  lastPrunedAt = now;
}

function consumeMemory(key: string, windowMs: number, now: number): RateLimitEntry {
  pruneMemoryStore(now);
  const current = memoryStore.get(key);
  if (!current || current.resetTime <= now) {
    const next = { count: 1, resetTime: now + windowMs };
    memoryStore.set(key, next);
    return next;
  }

  current.count += 1;
  return current;
}

async function consumeRedis(client: Redis, key: string, windowMs: number): Promise<RateLimitEntry | null> {
  try {
    if (client.status === "wait") await client.connect();
    const count = await client.incr(key);
    if (count === 1) await client.pexpire(key, windowMs);
    const ttl = await client.pttl(key);
    return { count, resetTime: Date.now() + Math.max(ttl, 0) };
  } catch {
    return null;
  }
}

export async function rateLimit(
  req: NextRequest,
  limit = 20,
  windowMs = 60000
): Promise<NextResponse | null> {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const client = getRedisClient();
  const entry = (client && (await consumeRedis(client, key, windowMs))) || consumeMemory(key, windowMs, now);

  if (entry.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests, please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}
