import type { Metadata } from "next";
import { connection } from "next/server";
import { AlarmDialog } from "@/components/alarm-dialog";
import { QueueBanner } from "@/components/queue-banner";
import { NavBar } from "@/components/nav-bar";
import { readSettings } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "6324 Pit Display",
  description: "Pit display for FRC team 6324",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const { clockFormat, alarmVolume } = await readSettings();
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only rounded-control bg-surface px-3 py-2 text-sm font-medium text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>
        <NavBar clockFormat={clockFormat} />
        <QueueBanner />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <AlarmDialog volume={alarmVolume} />
      </body>
    </html>
  );
}
