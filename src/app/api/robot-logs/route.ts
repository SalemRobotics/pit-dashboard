import { getRobotLogState, startRobotLogMonitor } from "@/lib/robot-logs";

export const dynamic = "force-dynamic";

export function GET() {
  startRobotLogMonitor();
  return Response.json(getRobotLogState(), { headers: { "Cache-Control": "no-store" } });
}
