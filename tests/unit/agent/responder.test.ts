import { describe, it, expect } from "vitest";
import { buildAgentReply, ResponderFacts } from "@/lib/agent/responder";

const baseFacts: ResponderFacts = {
  firstName: "Ada",
  plan: "FREE",
  hasClaim: true,
  hubLive: true,
  livePageUrl: "https://namesranker.com/ada-lovelace",
  connectorCount: 1,
  syncedProfileCount: 0,
  publishedCount: 0,
  pendingApprovalCount: 0,
  envelopeConfigured: true,
  watchedQueryCount: 0,
};

describe("M1 responder", () => {
  it("answers a status request with real facts", () => {
    const reply = buildAgentReply("what's my status?", baseFacts);
    expect(reply).toContain("live at https://namesranker.com/ada-lovelace");
    expect(reply).toContain("1 content source");
    expect(reply).toContain("No external profiles mapped yet");
  });

  it("reports an unclaimed name for the claim intent", () => {
    const reply = buildAgentReply("I want to claim my name", {
      ...baseFacts,
      hasClaim: false,
      hubLive: false,
      livePageUrl: null,
    });
    expect(reply).toContain("You haven't claimed your name yet");
  });

  it("explains the permission envelope when asked", () => {
    const reply = buildAgentReply("what are your permissions?", baseFacts);
    expect(reply.toLowerCase()).toContain("permission envelope");
    expect(reply).toContain("Settings → Permissions");
  });

  it("falls back honestly for unknown questions without inventing facts", () => {
    const reply = buildAgentReply("convert my docx resume", baseFacts);
    expect(reply).toContain("shell mode");
    expect(reply).toContain("what's my status?");
  });

  it("never claims a live hub that is not live", () => {
    const reply = buildAgentReply("status", {
      ...baseFacts,
      hasClaim: true,
      hubLive: false,
      livePageUrl: null,
    });
    expect(reply).not.toContain("live at");
    expect(reply).toContain("haven't published your hub page yet");
  });
});
