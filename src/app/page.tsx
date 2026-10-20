import { connection } from "next/server";
import { readSettings } from "@/lib/store";
import { Display } from "./display";

export default async function Home() {
  await connection();
  const settings = await readSettings();
  return <Display streamUrl={settings.streamUrl} nexusUrl={settings.nexusUrl} initialLayout={settings.layout} />;
}
