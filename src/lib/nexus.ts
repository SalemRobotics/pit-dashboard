import { TBA_BASE, getTeamMatches, type TbaMatchSimple } from "./tba";
import { TEAM_NUMBER, type Alliance } from "./types";

export interface QueueTrack {
  matchKey: string;
  label: string;
  alliance: Alliance;
}

interface NexusMatchInfo {
  label: string;
  status: string;
  played: boolean;
}

interface NexusInfo {
  now_queueing?: { match_key: string; match_name: string } | null;
  matches?: Record<string, NexusMatchInfo>;
}

/**
 * Pure: decides which match's queue banner should be showing right now.
 * - If Nexus says we're now queuing, track that match (resolving our alliance via `teamMatches`).
 * - Otherwise, keep showing whatever match is already tracked (`current`) until TBA/Nexus marks it
 *   played, so the banner survives the gap between "now queuing" clearing and the match being scored.
 */
export function nextQueueTrack(
  nexusInfo: NexusInfo,
  teamMatches: TbaMatchSimple[],
  current: QueueTrack | null,
  team = TEAM_NUMBER,
): QueueTrack | null {
  const nq = nexusInfo.now_queueing;
  if (nq) {
    const us = `frc${team}`;
    const match = teamMatches.find((m) => m.key === nq.match_key);
    if (match?.alliances.red.team_keys.includes(us)) return { matchKey: nq.match_key, label: nq.match_name, alliance: "red" };
    if (match?.alliances.blue.team_keys.includes(us)) return { matchKey: nq.match_key, label: nq.match_name, alliance: "blue" };
  }
  if (current && !nexusInfo.matches?.[current.matchKey]?.played) return current;
  return null;
}

// Not cached like other TBA calls: queue status changes second-to-second, so every poll needs a live fetch.
async function fetchNexusInfo(eventKey: string, apiKey: string): Promise<NexusInfo> {
  let res: Response;
  try {
    res = await fetch(`${TBA_BASE}/event/${encodeURIComponent(eventKey)}/nexus_info`, {
      headers: { "X-TBA-Auth-Key": apiKey },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Couldn't reach The Blue Alliance.");
  }
  if (res.status === 401 || res.status === 403) throw new Error("The Blue Alliance rejected the API key.");
  if (res.status === 404) throw new Error("This event doesn't have a Nexus feed.");
  if (!res.ok) throw new Error("Couldn't reach The Blue Alliance.");
  try {
    return (await res.json()) as NexusInfo;
  } catch {
    throw new Error("Couldn't reach The Blue Alliance.");
  }
}

export async function fetchQueueTrack(apiKey: string, eventKey: string, current: QueueTrack | null): Promise<QueueTrack | null> {
  const nexusInfo = await fetchNexusInfo(eventKey, apiKey);
  // Only worth resolving alliances when there's a new "now queuing" match to check against.
  const teamMatches = nexusInfo.now_queueing ? await getTeamMatches(eventKey, apiKey) : [];
  return nextQueueTrack(nexusInfo, teamMatches, current);
}
