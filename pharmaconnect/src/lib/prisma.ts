import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Serverless Postgres (Neon) cold-starts a pooled connection on the first
    // write after idle, which can take several seconds. Prisma's default 2s
    // `maxWait` / 5s `timeout` turn that cold start into a P2028 500, so we give
    // transaction start and batch a realistic budget. See lib/dbTransaction.ts.
    transactionOptions: { maxWait: 15_000, timeout: 20_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
