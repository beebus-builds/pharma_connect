import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { verifyToken, verifyViaWeb } from "./auth";

const prisma = new PrismaClient();
const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), connections: io.engine.clientsCount });
});

app.get("/", (_req, res) => {
  res.json({ service: "pharmaconnect-realtime", version: "1.0.0", ws: `ws://localhost:${PORT}` });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"], credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: ["websocket", "polling"],
});

// Redis adapter for horizontal scaling (optional - graceful fallback if REDIS_URL not set)
async function setupRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[realtime] REDIS_URL not set — running single instance (in-memory adapter)");
    return;
  }
  try {
    const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[realtime] Redis adapter connected");
    pubClient.on("error", (e) => console.error("[redis] pub error", e.message));
    subClient.on("error", (e) => console.error("[redis] sub error", e.message));
  } catch (e: any) {
    console.warn("[realtime] Redis failed, falling back to memory:", e.message);
  }
}

// Auth middleware
io.use(async (socket, next) => {
  const token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string);
  if (!token) return next(new Error("Missing token"));

  // Try local verify first, then via web
  let user = verifyToken(token);
  if (!user) user = await verifyViaWeb(token);
  if (!user) return next(new Error("Invalid token"));

  (socket as any).user = user;
  next();
});

const sendSchema = z.object({
  conversationId: z.string().cuid().optional(),
  requestId: z.string().cuid().optional(),
  content: z.string().min(1).max(2000).trim(),
});

io.on("connection", (socket) => {
  const user = (socket as any).user as { id: string; role: string; pharmacyId: string | null; name: string };
  console.log(`[realtime] connected ${user.id} (${user.role}) ${socket.id}`);

  // Join personal room for inbox updates
  socket.join(`user:${user.id}`);
  if (user.pharmacyId) socket.join(`pharmacy:${user.pharmacyId}`);

  socket.on("join", async ({ requestId, conversationId }: { requestId?: string; conversationId?: string }) => {
    try {
      let conv = null;
      if (conversationId) {
        conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { request: true } });
      } else if (requestId) {
        conv = await prisma.conversation.findUnique({ where: { requestId }, include: { request: true } });
        if (!conv) {
          // Auto-create conversation if request exists and user is participant
          const req = await prisma.request.findUnique({ where: { id: requestId } });
          if (!req) return socket.emit("error", { message: "Request not found" });
          const isParticipant = req.patientId === user.id || req.pharmacyId === user.pharmacyId;
          if (!isParticipant) return socket.emit("error", { message: "Not authorized" });
          conv = await prisma.conversation.create({
            data: { requestId, patientId: req.patientId, pharmacyId: req.pharmacyId },
            include: { request: true },
          });
        }
      }
      if (!conv) return socket.emit("error", { message: "Conversation not found" });

      const isParticipant = conv.patientId === user.id || conv.pharmacyId === user.pharmacyId;
      if (!isParticipant) return socket.emit("error", { message: "Not authorized for this conversation" });

      const room = `conv:${conv.id}`;
      socket.join(room);
      socket.emit("joined", { conversationId: conv.id, requestId: conv.requestId });

      // Send recent history (last 30)
      const messages = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { sender: { select: { id: true, name: true } } },
      });
      socket.emit("history", messages);
      console.log(`[realtime] ${user.id} joined ${room}`);
    } catch (e: any) {
      console.error("[join] error", e);
      socket.emit("error", { message: e.message });
    }
  });

  socket.on("leave", ({ conversationId }: { conversationId: string }) => {
    socket.leave(`conv:${conversationId}`);
  });

  socket.on("send", async (payload, ack?: (res: any) => void) => {
    try {
      const parsed = sendSchema.safeParse(payload);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message || "Invalid payload";
        if (ack) ack({ ok: false, error: msg });
        return;
      }
      const { conversationId, requestId, content } = parsed.data;

      let conv = null;
      if (conversationId) {
        conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      } else if (requestId) {
        conv = await prisma.conversation.findUnique({ where: { requestId } });
        if (!conv) {
          const req = await prisma.request.findUnique({ where: { id: requestId } });
          if (!req) {
            if (ack) ack({ ok: false, error: "Request not found" });
            return;
          }
          const isParticipant = req.patientId === user.id || req.pharmacyId === user.pharmacyId;
          if (!isParticipant) {
            if (ack) ack({ ok: false, error: "Not authorized" });
            return;
          }
          conv = await prisma.conversation.create({
            data: { requestId, patientId: req.patientId, pharmacyId: req.pharmacyId },
          });
        }
      }
      if (!conv) {
        if (ack) ack({ ok: false, error: "Conversation not found" });
        return;
      }

      const isParticipant = conv.patientId === user.id || conv.pharmacyId === user.pharmacyId;
      if (!isParticipant) {
        if (ack) ack({ ok: false, error: "Not authorized" });
        return;
      }

      const message = await prisma.message.create({
        data: { conversationId: conv.id, senderId: user.id, content },
        include: { sender: { select: { id: true, name: true } } },
      });

      await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });

      const room = `conv:${conv.id}`;
      io.to(room).emit("new_message", message);

      // Notify inbox for both participants (for unread counts)
      io.to(`user:${conv.patientId}`).emit("inbox_update", { conversationId: conv.id, lastMessage: message });
      io.to(`pharmacy:${conv.pharmacyId}`).emit("inbox_update", { conversationId: conv.id, lastMessage: message });
      io.to(`user:${conv.pharmacyId}`).emit("inbox_update", { conversationId: conv.id, lastMessage: message });

      if (ack) ack({ ok: true, message });
    } catch (e: any) {
      console.error("[send] error", e);
      if (ack) ack({ ok: false, error: e.message });
    }
  });

  socket.on("typing", ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
    socket.to(`conv:${conversationId}`).emit("typing", { userId: user.id, name: user.name, isTyping });
  });

  socket.on("mark_read", async ({ conversationId }: { conversationId: string }) => {
    try {
      await prisma.message.updateMany({
        where: { conversationId, senderId: { not: user.id }, readAt: null },
        data: { readAt: new Date() },
      });
      io.to(`conv:${conversationId}`).emit("read", { conversationId, readerId: user.id });
    } catch (e) {
      console.error("[mark_read] error", e);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[realtime] disconnected ${user.id} ${socket.id} reason=${reason}`);
  });
});

async function start() {
  await setupRedis();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[realtime] listening on http://0.0.0.0:${PORT} (CORS ${CORS_ORIGIN})`);
  });
}

start().catch((e) => {
  console.error("[realtime] failed to start", e);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[realtime] SIGTERM");
  io.close();
  await prisma.$disconnect();
  process.exit(0);
});
