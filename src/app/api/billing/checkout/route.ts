import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createCheckoutSession, isBillingCycle } from "@/lib/billing/stripe";

export const runtime = "nodejs";

const bodySchema = z.object({
  cycle: z.string().min(1).max(20),
});

/** Starts (or continues) a checkout session for the signed-in user. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isBillingCycle(parsed.data.cycle)) {
    return NextResponse.json({ error: "invalid_cycle" }, { status: 400 });
  }

  try {
    const result = await createCheckoutSession({
      userId: session.sub,
      email: session.email,
      cycle: parsed.data.cycle,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("checkout failed", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
