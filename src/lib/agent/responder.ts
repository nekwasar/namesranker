/**
 * M1 deterministic responder — the chat shell's reply generator.
 *
 * The full model-driven agent brain lands in M3 (agent runtime + tool
 * registry). Until then this responder is *not* a fake: it answers from real
 * account state and only ever says things that are true of the workspace it
 * can see. M3 replaces the dispatch below with the tool registry — the chat
 * surface and message persistence it answers through stay.
 */

export interface ResponderFacts {
  firstName?: string;
  plan: "FREE" | "PREMIUM";
  hasClaim: boolean;
  hubLive: boolean;
  livePageUrl?: string | null;
  connectorCount: number;
  syncedProfileCount: number;
  publishedCount: number;
  pendingApprovalCount: number;
  envelopeConfigured: boolean;
  watchedQueryCount: number;
}

const lower = (s: string) => s.toLowerCase().trim();

/** Very small intent matcher — enough for a shell, replaced by the M3 brain. */
function matchIntent(
  raw: string
): "greeting" | "status" | "permissions" | "claim" | "thanks" | null {
  const text = lower(raw);
  if (/^(hi|hey|hello|yo|howdy)\b/.test(text)) return "greeting";
  if (/(thanks|thank you|thx|cheers|nice|great|awesome|good job|perfect)/.test(text))
    return "thanks";
  if (/(status|progress|where (are|am) i|what.*(happening|state)|how.*(going|doing))/.test(text))
    return "status";
  if (/(permission|envelope|allow|rules|what can you (not )?do)/.test(text)) return "permissions";
  if (/(claim|slug|hub|page|publish)/.test(text)) return "claim";
  return null;
}

export function buildAgentReply(raw: string, f: ResponderFacts): string {
  const intent = matchIntent(raw);

  switch (intent) {
    case "greeting":
      return `Hey${f.firstName ? ` ${f.firstName}` : ""} — good to see you. I'm your ranking agent.\n\nRight now I'm standing up your workspace. The fastest way to get me working is to point me at your work: claim your name and publish your hub page, and in the next step I'll take your resume and build your footprint from it. What would you like to do first?`;
    case "thanks":
      return "Anytime. I'll log everything I do here so you always know what's happening — and you can change what I'm allowed to do any time in Settings → Permissions.";
    case "status":
      return statusReply(f);
    case "permissions":
      return `My permission envelope is the set of rules for what I may do, and it's yours to set. It covers five areas: your hub page on NamesRanker, your existing third-party profiles, republishing your work, pitches & outreach, and rank tracking.\n\nDefaults are deliberately safe — I act automatically only on our own hub and rank tracking; everything else needs your sign-off before or right after it happens. Open Settings → Permissions to tune each area.`;
    case "claim":
      return claimReply(f);
    default:
      return `I've logged that${
        f.firstName ? `, ${f.firstName}` : ""
      }. Right now I'm running in shell mode while the full agent brain is wired up — so I may not answer that specific question yet. What I can tell you is real: ask me “what's my status?” and I'll show you exactly where your workspace stands, or tell me to check my permissions.`;
  }
}

function statusReply(f: ResponderFacts): string {
  const lines: string[] = [];
  lines.push(
    f.hubLive && f.livePageUrl
      ? `• Your hub page is live at ${f.livePageUrl} — Google-visible and ready to build on.`
      : f.hasClaim
        ? "• You've claimed your name but haven't published your hub page yet. That's the single highest-leverage next step."
        : "• You haven't claimed your name yet — claiming it is step one, so your page has a home."
  );
  lines.push(
    f.connectorCount > 0
      ? `• ${f.connectorCount} content source${f.connectorCount === 1 ? "" : "s"} connected for study (RSS / GitHub / YouTube).`
      : "• No content sources connected yet — once your page is up I'll point them at your blog, GitHub and YouTube."
  );
  lines.push(
    f.syncedProfileCount > 0
      ? `• ${f.syncedProfileCount} external profile${f.syncedProfileCount === 1 ? "" : "s"} on my radar for your identity web.`
      : "• No external profiles mapped yet — your resume upload will seed the discovery of your existing footprint."
  );
  lines.push(
    f.publishedCount > 0
      ? `• ${f.publishedCount} published item${f.publishedCount === 1 ? "" : "s"} logged.`
      : "• Nothing published to third-party surfaces yet — republishing starts once your works are in the footprint."
  );
  lines.push(
    f.watchedQueryCount > 0
      ? `• ${f.watchedQueryCount} query${f.watchedQueryCount === 1 ? "" : "s"} being watched for rank movement.`
      : "• No rank queries watched yet — I'll add “your name + profession” the moment your footprint is built."
  );
  lines.push(
    f.pendingApprovalCount > 0
      ? `• ${f.pendingApprovalCount} item${f.pendingApprovalCount === 1 ? "" : "s"} waiting on your approval above.`
      : "• Nothing needs your approval right now — I only ask when it matters."
  );
  return `Here's your real status, pulled from your workspace right now:\n\n${lines.join("\n")}`;
}

function claimReply(f: ResponderFacts): string {
  if (f.hubLive) {
    return `Your name is claimed and your hub page is live${
      f.livePageUrl ? ` at ${f.livePageUrl}` : ""
    }. Next moves I'd recommend, in order: keep your page complete and current, connect your content sources, and send me your resume when the resume step opens so I can start mapping — and ranking — your footprint.`;
  }
  if (f.hasClaim) {
    return `You've claimed your name — nice. The page exists but isn't published yet. Finishing the publish flow (headline, bio, links, work) is what flips it live; after that it becomes the hub of your identity web.`;
  }
  return `You haven't claimed your name yet. Claiming gives your page a permanent home (namesranker.com/your-name) and it's the anchor every other ranking surface points back to. Head to the claim flow to reserve it — while you're deciding, someone else with the same name could take it.`;
}
