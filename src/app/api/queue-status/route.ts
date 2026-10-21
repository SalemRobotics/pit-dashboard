import { getQueueState, startQueueMonitor } from "@/lib/queue-monitor";

export const dynamic = "force-dynamic";

export function GET() {
  startQueueMonitor();
  return Response.json(getQueueState(), { headers: { "Cache-Control": "no-store" } });
}
