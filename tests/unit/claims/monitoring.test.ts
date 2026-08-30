import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClaimError } from "@/lib/claims/claim";
import {
  createMonitoringRule,
  deleteMonitoringRule,
  getMonitoringRules,
} from "@/lib/claims/monitoring";

const mocks = vi.hoisted(() => {
  const prisma = {
    nameMonitoringRule: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  };
  return { prisma };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("monitoring rules (premium)", () => {
  it("lists a user's rules", async () => {
    mocks.prisma.nameMonitoringRule.findMany.mockResolvedValue([
      { id: "r1", nameToMonitor: "jane doe", lastAlertAt: null, createdAt: new Date() },
    ]);

    const rules = await getMonitoringRules("u1");
    expect(rules).toHaveLength(1);
    expect(mocks.prisma.nameMonitoringRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });

  it("requires premium to create a rule", async () => {
    await expect(createMonitoringRule("u1", "Jane Doe", false)).rejects.toMatchObject({
      code: "premium_required",
    });
    expect(mocks.prisma.nameMonitoringRule.create).not.toHaveBeenCalled();
  });

  it("creates a rule with the normalized name for premium users", async () => {
    mocks.prisma.nameMonitoringRule.create.mockResolvedValue({
      id: "r1",
      nameToMonitor: "jane doe",
      lastAlertAt: null,
      createdAt: new Date(),
    });

    const rule = await createMonitoringRule("u1", "  Jane DOE  ", true);
    expect(rule.nameToMonitor).toBe("jane doe");
    expect(mocks.prisma.nameMonitoringRule.create).toHaveBeenCalledWith({
      data: { userId: "u1", nameToMonitor: "jane doe" },
      select: expect.anything(),
    });
  });

  it("rejects empty monitoring names", async () => {
    await expect(createMonitoringRule("u1", "   ", true)).rejects.toMatchObject({
      code: "invalid_name",
    });
  });

  it("only deletes the user's own rules", async () => {
    mocks.prisma.nameMonitoringRule.findFirst.mockResolvedValue(null);

    await expect(deleteMonitoringRule("u1", "r-other")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(mocks.prisma.nameMonitoringRule.delete).not.toHaveBeenCalled();
  });

  it("deletes an owned rule", async () => {
    mocks.prisma.nameMonitoringRule.findFirst.mockResolvedValue({ id: "r1" });
    mocks.prisma.nameMonitoringRule.delete.mockResolvedValue({ id: "r1" });

    await deleteMonitoringRule("u1", "r1");
    expect(mocks.prisma.nameMonitoringRule.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
  });
});

describe("ClaimError", () => {
  it("carries a typed code", () => {
    const err = new ClaimError("premium_required");
    expect(err.code).toBe("premium_required");
    expect(err.name).toBe("ClaimError");
  });
});
