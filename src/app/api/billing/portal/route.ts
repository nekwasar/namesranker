import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createBillingPortalSession } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Opens the Stripe billing portal for premium users to manage/cancel. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { stripeCustomerId: true, plan: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  try {
    const { url } = await createBillingPortalSession({ customerId: user.stripeCustomerId });
    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    console.error("portal failed", err);
    return NextResponse.json({ error: "portal_failed" }, { status: 502 });
  }
}
