import type { EnvelopeSurface, PermissionEnvelope } from "./envelope";

/**
 * Agent tool contract — ratified in M0 (milestones-v2.md M0, §2.2).
 *
 * The agent has no business logic of its own: it orchestrates *tools*, each
 * backed by one of the five engine services. Every tool declares:
 *  - which engine owns it (the tool registry = engines as registries)
 *  - which envelope surface it acts on (permission enforcement is per-tool)
 *  - whether it is idempotent (runtime requires idempotency keys, M3)
 *
 * Engines are implemented in later milestones (Listener M4, Transformer +
 * Publisher M5, Outreach M6, Rank M7). This file is the interface contract
 * those implementations register against — nothing here is a stub of engine
 * logic; it is the type system the engines must satisfy.
 */

export type EngineName = "study" | "transform" | "publish" | "pitch" | "track";

export interface AgentTool<TInput extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable identifier, e.g. "study.detect-new-work". Logged to WorkLog. */
  name: string;
  engine: EngineName;
  /** Envelope surface this tool acts on — used for permission checks. */
  surface: EnvelopeSurface;
  description: string;
  /** Plain-JSON zod-compatible input shape; validated by the runtime (M3). */
  input: Record<string, unknown>;
  /** True when retrying the tool with the same input is safe (M3 relies on it). */
  idempotent: boolean;
  /** Human-facing summary used in the approval queue when sign-off is needed. */
  summarize(input: TInput): string;
}

/** The five engines, as declared tool inventories (implemented per milestone). */
export interface EngineRegistry {
  study: AgentTool[];
  transform: AgentTool[];
  publish: AgentTool[];
  pitch: AgentTool[];
  track: AgentTool[];
}

/**
 * Permission check: may `tool` run under `envelope`?
 *   NEVER_TOUCH  → never
 *   DRAFT_ONLY   → never unsupervised (must land in the approval queue)
 *   COPY_APPROVE → yes, then notify (still logged to the work feed)
 *   FULL_AUTO    → yes
 */
export function toolAllowed(tool: Pick<AgentTool, "surface">, envelope: PermissionEnvelope) {
  const level = envelope.surfaces[tool.surface];
  return { level, allowed: level === "COPY_APPROVE" || level === "FULL_AUTO" };
}

/** What the M3 runtime should do with a tool call under a given envelope. */
export type ToolDisposition =
  | { kind: "run" } // FULL_AUTO / COPY_APPROVE (notify after)
  | { kind: "queue-approval" } // DRAFT_ONLY → ApprovalItem + chat card
  | { kind: "blocked" }; // NEVER_TOUCH

export function dispositionFor(
  tool: Pick<AgentTool, "surface">,
  envelope: PermissionEnvelope
): ToolDisposition {
  const level = envelope.surfaces[tool.surface];
  switch (level) {
    case "FULL_AUTO":
    case "COPY_APPROVE":
      return { kind: "run" };
    case "DRAFT_ONLY":
      return { kind: "queue-approval" };
    case "NEVER_TOUCH":
      return { kind: "blocked" };
  }
}

/** Registry skeleton — engines register their tools here as they land. */
export const engineRegistry: EngineRegistry = {
  study: [],
  transform: [],
  publish: [],
  pitch: [],
  track: [],
};
