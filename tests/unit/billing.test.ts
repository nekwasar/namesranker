import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyEntitlement,
  revokeSubscription,
  releaseOneWordClaims,
  startGracePeriod,
  writeBillingAudit,
  lapseEmail,
} from "@/lib/billing/service";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { update: vi.fn() },
    nameClaim: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const sendEmail = vi.fn();
  return { prisma, sendEmail };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.auditLog.create.mockResolvedValue({ id: "log1" });
  mocks.prisma.user.update.mockResolvedValue({ id: "u1" });
  mocks.prisma.nameClaim.updateMany.mockResolvedValue({ count: 1 });
});

describe("applyEntitlement", () => {
  it("sets PREMIUM with subscription/customer ids", async () => {
    await applyEntitlement({
      userId: "u1",
      email: "a@example.com",
      subscriptionId: "sub_123",
      customerId: "cus_456",
      kind: "recurring",
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({
        plan: "PREMIUM",
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_456",
      }),
    });
  });

  it("supports lifetime purchases (no subscription)", async () => {
    await applyEntitlement({
      userId: "u1",
      email: "a@example.com",
      kind: "lifetime",
      sessionId: "cs_1",
    });
    // No subscription id is fine; the user is premium.
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "PREMIUM" }) })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "billing.entitled" }),
    });
  });
});

describe("revokeSubscription", () => {
  it("clears plan + subscription id and audits", async () => {
    await revokeSubscription("u1", "sub_123", "subscription_deleted");
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({ plan: "FREE", stripeSubscriptionId: null }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "billing.revoked" }),
    });
  });
});

describe("lapse policy", () => {
  it("releases only one-word claims (monthly immediate)", async () => {
    await releaseOneWordClaims("u1");
    expect(mocks.prisma.nameClaim.updateMany).toHaveBeenCalledWith({
      where: {
        claimedById: "u1",
        status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
        wordCount: 1,
      },
      data: { status: "RELEASED", graceUntil: null },
    });
  });

  it("opens a 30-day grace window for yearly grace and marks claims PENDING_RELEASE", async () => {
    const before = Date.now();
    const graceUntil = await startGracePeriod("u1");
    expect(graceUntil.getTime()).toBeGreaterThan(before);
    // 30 days (± 1 min)
    expect(graceUntil.getTime() - before).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(graceUntil.getTime() - before).toBeLessThan(31 * 24 * 60 * 60 * 1000);
    expect(mocks.prisma.nameClaim.updateMany).toHaveBeenCalledWith({
      where: {
        claimedById: "u1",
        status: { in: ["CLAIMED", "PROTECTED"] },
        wordCount: 1,
      },
      data: { status: "PENDING_RELEASE", graceUntil },
    });
  });
});

describe("writeBillingAudit", () => {
  it("allows null actor (system events)", async () => {
    await writeBillingAudit(null, "stripe:checkout.session.completed", { handled: "entitled" });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: undefined,
        entityId: undefined,
        action: "stripe:checkout.session.completed",
        entityType: "User",
        metadata: { handled: "entitled" },
      },
    });
  });
});

describe("lapseEmail", () => {
  it("builds an immediate-release email", () => {
    const mail = lapseEmail("a@example.com", { reason: "now" });
    expect(mail.subject).toContain("released");
    expect(mail.tags).toEqual(["lapse-now"]);
  });

  it("builds a grace email referencing the grace days", () => {
    const mail = lapseEmail("a@example.com", { reason: "grace" });
    expect(mail.subject).toContain("lapses in 30 days");
    expect(mail.tags).toEqual(["lapse-grace"]);
  });
});
