import { TEAM_NUMBER, type Alliance } from "./types";

export interface QueuedMatch {
  label: string;
  alliance: Alliance;
  status: string;
}

const teamList = (v: unknown): string[] => (Array.isArray(v) ? v.map((t) => String(t).replace(/^frc/i, "").trim()) : []);

/** Pure parser: finds our "Now queuing" match in a Nexus event payload. Unknown shapes yield null. */
export function findOurQueuedMatch(data: unknown, team = TEAM_NUMBER): QueuedMatch | null {
  if (!data || typeof data !== "object") return null;
  const matches = (data as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return null;
  const us = String(team);
  for (const m of matches) {
    if (!m || typeof m !== "object") continue;
    const { label, status, redTeams, blueTeams } = m as Record<string, unknown>;
    if (typeof label !== "string" || status !== "Now queuing") continue;
    if (teamList(redTeams).includes(us)) return { label, alliance: "red", status };
    if (teamList(blueTeams).includes(us)) return { label, alliance: "blue", status };
  }
  return null;
}

export async function fetchOurQueuedMatch(apiKey: string, eventKey: string): Promise<QueuedMatch | null> {
  let res: Response;
  try {
    res = await fetch(`https://frc.nexus/api/v1/event/${encodeURIComponent(eventKey)}`, {
      headers: { "Nexus-Api-Key": apiKey },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Couldn't reach Nexus.");
  }
  if (res.status === 401 || res.status === 403) throw new Error("Nexus rejected the API key.");
  if (res.status === 404) throw new Error("Nexus doesn't have that event key.");
  if (!res.ok) throw new Error("Couldn't reach Nexus.");
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Couldn't reach Nexus.");
  }
  return findOurQueuedMatch(data);
}
