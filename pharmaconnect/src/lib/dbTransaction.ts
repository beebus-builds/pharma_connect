import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Run an interactive transaction with a serverless-safe budget and a retry for
 * the two transient Prisma codes that Neon cold-starts and concurrent writers
 * throw:
 *
 *   P2028 — "Unable to start a transaction in the given time": the pool couldn't
 *           hand over a connection before `maxWait`. Cold starts hit this.
 *   P2034 — write conflict / deadlock (serializable-style contention).
 *
 * Both are safe to retry because the transaction is atomic — a failed attempt
 * has already rolled back. Everything else (validation, constraint violations)
 * re-throws immediately so callers still surface real errors.
 */
const RETRYABLE = new Set(["P2028", "P2034"]);

export async function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  { attempts = 3, baseDelayMs = 200 } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await prisma.$transaction(fn, { maxWait: 15_000, timeout: 20_000 });
    } catch (error) {
      const code = (error as Prisma.PrismaClientKnownRequestError | undefined)?.code;
      if (code && RETRYABLE.has(code) && attempt < attempts - 1) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
