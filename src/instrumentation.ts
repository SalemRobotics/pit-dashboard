export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueueMonitor } = await import("./lib/queue-monitor");
    startQueueMonitor();
  }
}
