import { describe, it, expect } from "vitest";
import {
  DEFAULT_ENVELOPE,
  parseEnvelope,
  envelopeSchema,
  PermissionEnvelope,
  PermissionLevel,
} from "@/lib/agent/envelope";
import { dispositionFor, toolAllowed } from "@/lib/agent/contracts";

function withPitchLevel(level: PermissionLevel): PermissionEnvelope {
  return { ...DEFAULT_ENVELOPE, surfaces: { ...DEFAULT_ENVELOPE.surfaces, pitches: level } };
}

describe("permission envelope", () => {
  it("defaults to the safe baseline", () => {
    expect(DEFAULT_ENVELOPE.version).toBe(1);
    expect(DEFAULT_ENVELOPE.surfaces).toEqual({
      hub: "FULL_AUTO",
      connectedProfiles: "COPY_APPROVE",
      syndication: "COPY_APPROVE",
      pitches: "DRAFT_ONLY",
      rankTracking: "FULL_AUTO",
    });
  });

  it("parses a valid stored envelope", () => {
    const parsed = parseEnvelope(DEFAULT_ENVELOPE);
    expect(parsed.surfaces.pitches).toBe("DRAFT_ONLY");
    expect(envelopeSchema.safeParse(parsed).success).toBe(true);
  });

  it("falls back to defaults when the stored envelope is corrupt", () => {
    for (const bad of [null, {}, { surfaces: { hub: "WILDCARD" } }, "nope"]) {
      const parsed = parseEnvelope(bad);
      expect(parsed).toEqual(DEFAULT_ENVELOPE);
    }
  });

  it("rejects an envelope missing surfaces in validation", () => {
    const result = envelopeSchema.safeParse({ version: 1, surfaces: { hub: "FULL_AUTO" } });
    expect(result.success).toBe(false);
  });
});

describe("tool dispositions (contracts)", () => {
  const tool = { surface: "pitches" as const };

  it("blocks NEVER_TOUCH surfaces", () => {
    const envelope = withPitchLevel("NEVER_TOUCH");
    expect(toolAllowed(tool, envelope).allowed).toBe(false);
    expect(dispositionFor(tool, envelope)).toEqual({ kind: "blocked" });
  });

  it("queues DRAFT_ONLY actions for approval", () => {
    expect(dispositionFor(tool, DEFAULT_ENVELOPE)).toEqual({ kind: "queue-approval" });
  });

  it("runs COPY_APPROVE and FULL_AUTO actions", () => {
    const copyApprove = withPitchLevel("COPY_APPROVE");
    const fullAuto = withPitchLevel("FULL_AUTO");
    expect(toolAllowed(tool, copyApprove).allowed).toBe(true);
    expect(dispositionFor(tool, copyApprove)).toEqual({ kind: "run" });
    expect(dispositionFor(tool, fullAuto)).toEqual({ kind: "run" });
  });
});
