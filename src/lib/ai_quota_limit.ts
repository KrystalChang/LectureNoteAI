import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MONTHLY_AI_REQUEST_LIMIT = 100;
const USAGE_TIME_ZONE = "Asia/Taipei";

export type AiUsageSnapshot = {
  month: string;
  limit: number;
  used: number;
  remaining: number;
};

export class AiQuotaLimitError extends Error {
  readonly code = "MONTHLY_AI_LIMIT";

  constructor(readonly usage: AiUsageSnapshot) {
    super("Monthly AI request limit reached");
    this.name = "AiQuotaLimitError";
  }
}

export function getAiUsageMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: USAGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Unable to determine the AI usage month");
  }

  return `${year}-${month}`;
}

/** 查詢使用者當月已使用的 AI request 次數。 */
export async function getUserUsage(
  userId: string,
  month = getAiUsageMonth(),
): Promise<number> {
  const row = await prisma.aiUsage.findUnique({
    where: { userId_month: { userId, month } },
    select: { count: true },
  });

  return row?.count ?? 0;
}

/** 查詢使用者當月完整額度狀態，供 profile 等唯讀介面使用。 */
export async function getUserAiQuota(
  userId: string,
): Promise<AiUsageSnapshot> {
  const month = getAiUsageMonth();
  const used = await getUserUsage(userId, month);

  return {
    month,
    limit: MONTHLY_AI_REQUEST_LIMIT,
    used,
    remaining: Math.max(0, MONTHLY_AI_REQUEST_LIMIT - used),
  };
}

export async function hasAiQuota(userId: string): Promise<boolean> {
  return (await getUserUsage(userId)) < MONTHLY_AI_REQUEST_LIMIT;
}

/**
 * 原子性地保留一次額度。不要先呼叫 hasAiQuota 再扣額度，否則並行請求可能超額。
 */
export async function incrementUserUsage(
  userId: string,
): Promise<AiUsageSnapshot> {
  const month = getAiUsageMonth();
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "AIUsage" ("id", "userId", "month", "count")
    VALUES (${randomUUID()}, ${userId}, ${month}, 1)
    ON CONFLICT ("userId", "month")
    DO UPDATE SET "count" = "AIUsage"."count" + 1
    WHERE "AIUsage"."count" < ${MONTHLY_AI_REQUEST_LIMIT}
    RETURNING "count"
  `);
  const used = rows[0]?.count;

  if (used === undefined) {
    throw new AiQuotaLimitError({
      month,
      limit: MONTHLY_AI_REQUEST_LIMIT,
      used: MONTHLY_AI_REQUEST_LIMIT,
      remaining: 0,
    });
  }

  return {
    month,
    limit: MONTHLY_AI_REQUEST_LIMIT,
    used,
    remaining: MONTHLY_AI_REQUEST_LIMIT - used,
  };
}

/** AI provider 未完整回應時，歸還先前保留的額度。 */
export async function releaseUserUsage(
  userId: string,
  month: string,
): Promise<void> {
  await prisma.aiUsage.updateMany({
    where: { userId, month, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  });
}

export function aiQuotaLimitResponse(error: AiQuotaLimitError): Response {
  return Response.json(
    {
      error: error.message,
      code: error.code,
      usage: error.usage,
    },
    { status: 429 },
  );
}
