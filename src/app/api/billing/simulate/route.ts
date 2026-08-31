import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyEntitlement, releaseOneWordClaims, startGracePeriod } from "@/lib/billing/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  userId: z.string().min(1).max(100),
  event: z.enum(["checkout.completed", "subscription.cancelled"]),
  cycle: z.enum(["monthly", "annual", "lifetime"]).optional(),
});

/**
 * DEV-ONLY webhook simulator for e2e tests. Mirrors what the real Stripe
 * webhook would apply, so the entitlement path can be verified without keys.
 * Never run in production: the same route exists as a real webhook at
 * /api/billing/webhook. Guarded by E2E_BILLING_DEV=1 (never set in prod).
 */
export async function POST(req: NextRequest) {
  if (process.env.E2E_BILLING_DEV !== "1") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const cycle = parsed.data.cycle ?? "monthly";
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, plan: true },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.event === "checkout.completed") {
    await applyEntitlement({
      userId: user.id,
      email: user.email,
      kind: cycle === "lifetime" ? "lifetime" : "recurring",
      subscriptionId: cycle === "lifetime" ? null : `sub_test_${user.id}`,
      customerId: `cus_test_${user.id}`,
      sessionId: "cs_test_sim",
    });
    return NextResponse.json({ ok: true, plan: "PREMIUM" });
  }

  // subscription.cancelled — apply lapse policy by cycle.
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "FREE", stripeSubscriptionId: null },
  });
  if (cycle === "monthly") {
    const released = await releaseOneWordClaims(user.id);
    return NextResponse.json({ ok: true, plan: "FREE", released });
  }
  // annual → grace window.
  await startGracePeriod(user.id);
  return NextResponse.json({ ok: true, plan: "FREE", grace: true });
}
