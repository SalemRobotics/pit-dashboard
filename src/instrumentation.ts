export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueueMonitor } = await import("./lib/queue-monitor");
    startQueueMonitor();
    const { startRobotLogMonitor } = await import("./lib/robot-logs");
    startRobotLogMonitor();
  }
}
