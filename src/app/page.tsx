import { connection } from "next/server";
import { getStreamStatus } from "@/lib/stream-detect";
import { readSettings } from "@/lib/store";
import { Display } from "./display";

export default async function Home() {
  await connection();
  const [settings, stream] = await Promise.all([readSettings(), getStreamStatus()]);
  return (
    <Display
      initialStreamUrl={stream.url}
      initialStreamSource={stream.source}
      initialStreamLabel={stream.label}
      nexusUrl={settings.nexusUrl}
      initialLayout={settings.layout}
      questions={settings.questions}
      eventName={settings.eventName}
    />
  );
}
