import { describe, expect, it, vi, beforeEach } from "vitest";
import { scanMonitoringAlerts } from "@/lib/claims/monitoring";
import { monitoringAlertEmail } from "@/lib/email";

const mocks = vi.hoisted(() => {
  const prisma = {
    nameMonitoringRule: { findMany: vi.fn(), update: vi.fn() },
    nameClaim: { findMany: vi.fn() },
  };
  const sendEmail = vi.fn();
  return { prisma, sendEmail };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, sendEmail: mocks.sendEmail };
});

const rule = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  userId: "u1",
  nameToMonitor: "Jane Doe",
  lastAlertAt: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
  user: { email: "watcher@example.com" },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.nameMonitoringRule.findMany.mockResolvedValue([rule()]);
  mocks.prisma.nameClaim.findMany.mockResolvedValue([{ slug: "jane-doe" }]);
  mocks.prisma.nameMonitoringRule.update.mockResolvedValue({ id: "r1" });
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe("scanMonitoringAlerts", () => {
  it("alerts once for a new matching claim and records lastAlertAt", async () => {
    const result = await scanMonitoringAlerts();

    expect(mocks.prisma.nameClaim.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
        claimedAt: { gt: rule().createdAt },
        OR: [{ slug: "jane-doe" }, { slug: { startsWith: "jane-doe-" } }],
      },
      select: { slug: true },
      orderBy: { claimedAt: "asc" },
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "watcher@example.com", tags: ["monitoring-alert"] })
    );
    expect(mocks.prisma.nameMonitoringRule.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { lastAlertAt: expect.any(Date) },
    });
    expect(result).toEqual({ rulesChecked: 1, alertsSent: 1, failed: 0 });
  });

  it("matches keyword variants under the watched base slug", async () => {
    mocks.prisma.nameClaim.findMany.mockResolvedValue([
      { slug: "jane-doe-designs" },
      { slug: "jane-doe-2" },
    ]);

    await scanMonitoringAlerts();

    // One email per rule, listing both slugs.
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const mail = mocks.sendEmail.mock.calls[0][0] as { text: string };
    expect(mail.text).toContain("/jane-doe-designs");
    expect(mail.text).toContain("/jane-doe-2");
  });

  it("skips the rule when no claim matches", async () => {
    mocks.prisma.nameClaim.findMany.mockResolvedValue([]);
    const result = await scanMonitoringAlerts();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(result.alertsSent).toBe(0);
  });

  it("only alerts for claims newer than the last alert (no duplicates)", async () => {
    mocks.prisma.nameMonitoringRule.findMany.mockResolvedValue([
      rule({ lastAlertAt: new Date("2026-08-10T00:00:00Z") }),
    ]);
    // A claim from before the last alert must not match the since window.
    await scanMonitoringAlerts();
    expect(mocks.prisma.nameClaim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ claimedAt: { gt: new Date("2026-08-10T00:00:00Z") } }),
      })
    );
  });

  it("counts failures without crashing the whole scan", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("brevo down"));
    const result = await scanMonitoringAlerts();
    expect(result.alertsSent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it("continues past a rule with an empty/unslugifiable name", async () => {
    mocks.prisma.nameMonitoringRule.findMany.mockResolvedValue([
      rule({ id: "r0", nameToMonitor: "!!!" }),
      rule(),
    ]);
    const result = await scanMonitoringAlerts();
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(result.alertsSent).toBe(1);
  });
});

describe("monitoringAlertEmail", () => {
  it("builds an alert email with all matching slugs", () => {
    const mail = monitoringAlertEmail("a@example.com", "Jane Doe", [
      "jane-doe",
      "jane-doe-designs",
    ]);
    expect(mail.subject).toContain("Jane Doe");
    expect(mail.tags).toEqual(["monitoring-alert"]);
    expect(mail.text).toContain("/jane-doe");
  });
});
