import { getStreamStatus } from "@/lib/stream-detect";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getStreamStatus(), { headers: { "Cache-Control": "no-store" } });
}
