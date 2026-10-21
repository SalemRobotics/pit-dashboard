import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import SftpClient from "ssh2-sftp-client";
import { LOGS_DIR, readSettings } from "./store";
import type { RobotLogState } from "./types";

const POLL_MS = 15000;
const ERROR_BACKOFF_MS = 30000;
const CONNECT_TIMEOUT_MS = 3000;

interface Monitor {
  state: RobotLogState;
  started: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

const g = globalThis as unknown as { __pitRobotLogMonitor?: Monitor };
const monitor: Monitor = (g.__pitRobotLogMonitor ??= {
  state: { status: "idle", error: null, lastSeen: null, lastPulled: null },
  started: false,
  timer: null,
});

/** Best-effort match number/round extraction from common FMS/WPILib log filenames. Null if nothing recognizable is found. */
export function parseMatchLabel(fileName: string): string | null {
  const patterns: [RegExp, string][] = [
    [/\bQM(\d+)\b/i, "Quals match $1"],
    [/\bQ(\d+)\b/i, "Quals match $1"],
    [/\bSF(\d+)\b/i, "Semifinal $1"],
    [/\bF(\d+)\b/i, "Final $1"],
    [/\bMatch[_-]?(\d+)\b/i, "Match $1"],
  ];
  for (const [re, label] of patterns) {
    const m = re.exec(fileName);
    if (m) return label.replace("$1", m[1]);
  }
  return null;
}

async function localFileExists(fileName: string): Promise<boolean> {
  try {
    await stat(path.join(LOGS_DIR, fileName));
    return true;
  } catch {
    return false;
  }
}

async function pullDir(sftp: SftpClient, remoteDir: string): Promise<void> {
  const entries = await sftp.list(remoteDir);
  for (const entry of entries) {
    if (entry.type !== "-") continue;
    const fileName = entry.name;
    if (await localFileExists(fileName)) continue;

    const remotePath = `${remoteDir.replace(/\/+$/, "")}/${fileName}`;
    const localPath = path.join(LOGS_DIR, fileName);
    const tempPath = `${localPath}.part`;

    await sftp.fastGet(remotePath, tempPath);
    const remoteStat = await sftp.stat(remotePath);
    const localStat = await stat(tempPath);
    if (localStat.size !== remoteStat.size) {
      await unlink(tempPath).catch(() => {});
      console.error(`[robot-logs] size mismatch downloading ${fileName}, leaving it on the robot`);
      continue;
    }

    await rename(tempPath, localPath);
    // Only delete off the robot once the local copy is confirmed in place and size-matched.
    await sftp.delete(remotePath);

    monitor.state = {
      ...monitor.state,
      lastPulled: { fileName, matchLabel: parseMatchLabel(fileName), pulledAt: new Date().toISOString() },
    };
  }
}

async function poll(): Promise<number> {
  const settings = await readSettings();
  if (!settings.robotHost || !settings.robotSshUsername) {
    monitor.state = { ...monitor.state, status: "idle", error: null };
    return POLL_MS;
  }

  const sftp = new SftpClient();
  try {
    monitor.state = { ...monitor.state, status: "searching", error: null };
    await sftp.connect({
      host: settings.robotHost,
      port: settings.robotSshPort,
      username: settings.robotSshUsername,
      password: settings.robotSshPassword,
      readyTimeout: CONNECT_TIMEOUT_MS,
    });

    monitor.state = { ...monitor.state, status: "pulling", lastSeen: new Date().toISOString(), error: null };
    await mkdir(LOGS_DIR, { recursive: true });
    if (settings.robotWpilogDir) await pullDir(sftp, settings.robotWpilogDir);
    if (settings.robotHootLogDir) await pullDir(sftp, settings.robotHootLogDir);

    monitor.state = { ...monitor.state, status: "connected" };
    await sftp.end();
    return POLL_MS;
  } catch (e) {
    await sftp.end().catch(() => {});
    const message = e instanceof Error ? e.message : "Couldn't reach the robot.";
    // A disconnected robot on the pit network is the expected steady state, not an error worth surfacing loudly.
    const connectionRefused = /ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT|timeout/i.test(message);
    monitor.state = connectionRefused
      ? { ...monitor.state, status: "searching", error: null }
      : { ...monitor.state, status: "error", error: message };
    return connectionRefused ? POLL_MS : ERROR_BACKOFF_MS;
  }
}

function loop() {
  poll()
    .catch(() => ERROR_BACKOFF_MS)
    .then((delay) => {
      monitor.timer = setTimeout(loop, delay);
    });
}

export function startRobotLogMonitor() {
  if (monitor.started) return;
  monitor.started = true;
  loop();
}

export function getRobotLogState(): RobotLogState {
  return monitor.state;
}
