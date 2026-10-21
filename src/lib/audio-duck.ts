import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Alliance } from "./types";

export interface AlertOptions {
  chimeVolume: number;
  duckLevel: number;
}
export interface AlertResult {
  ok: boolean;
  message: string;
}

const SPEECH: Record<Alliance, string> = { red: "Now queued for Red", blue: "Now queued for Blue" };
const PACKAGES: Record<string, string> = {
  pactl: "pulseaudio-utils",
  paplay: "pulseaudio-utils",
  "espeak-ng": "espeak-ng",
};

async function voiceClip(alliance: Alliance): Promise<string | null> {
  const dir = process.env.PIT_VOICE_DIR;
  if (!dir) return null;
  const file = path.join(dir, `queued-${alliance}.wav`);
  try {
    await access(file);
    return file;
  } catch {
    return null;
  }
}

const warned = new Set<string>();
function warnMissing(cmd: string) {
  if (warned.has(cmd)) return;
  warned.add(cmd);
  console.warn(`[queue-alert] "${cmd}" not found; install the ${PACKAGES[cmd] ?? cmd} package.`);
}

class MissingCommand extends Error {
  constructor(public cmd: string) {
    super(`${cmd} missing`);
  }
}

function run(cmd: string, args: string[], timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (!err) return resolve(stdout);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        warnMissing(cmd);
        return reject(new MissingCommand(cmd));
      }
      reject(err);
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

/** 44.1kHz 16-bit mono WAV: two soft bell notes (E6 then B5), exponential decay, gentle attack. */
export function makeChimeWav(): Buffer {
  const rate = 44100;
  const total = Math.round(rate * 1.2);
  const samples = new Float32Array(total);
  const notes = [
    { freq: 1318.51, start: 0, decay: 5 },
    { freq: 987.77, start: 0.28, decay: 4 },
  ];
  for (const { freq, start, decay } of notes) {
    const s0 = Math.round(start * rate);
    for (let i = s0; i < total; i++) {
      const t = (i - s0) / rate;
      const attack = Math.min(1, t / 0.012);
      const env = attack * Math.exp(-decay * t);
      const v = Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-6 * t);
      samples[i] += 0.4 * env * v;
    }
  }
  const buf = Buffer.alloc(44 + total * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + total * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(total * 2, 40);
  // fade the last 20ms so there's no click
  const fade = Math.round(rate * 0.02);
  for (let i = 0; i < total; i++) {
    let v = samples[i];
    if (i > total - fade) v *= (total - i) / fade;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2);
  }
  return buf;
}

interface Stream {
  index: number;
  percent: number;
}

/** Other playback streams and their current volume. Failure (or no pactl) means "don't duck". */
async function listStreams(): Promise<Stream[]> {
  try {
    const raw = JSON.parse(await run("pactl", ["-f", "json", "list", "sink-inputs"], 5000));
    if (!Array.isArray(raw)) return [];
    const out: Stream[] = [];
    for (const s of raw) {
      const vol = s?.volume && typeof s.volume === "object" ? Object.values(s.volume)[0] : null;
      const pctStr = (vol as { value_percent?: string } | null)?.value_percent;
      const percent = pctStr ? parseFloat(pctStr) : NaN;
      if (Number.isInteger(s?.index) && Number.isFinite(percent)) out.push({ index: s.index, percent });
    }
    return out;
  } catch (e) {
    if (!(e instanceof MissingCommand)) console.warn("[queue-alert] couldn't list audio streams; skipping ducking.");
    return [];
  }
}

async function setVolume(index: number, percent: number) {
  try {
    await run("pactl", ["set-sink-input-volume", String(index), `${Math.max(0, Math.round(percent))}%`], 3000);
  } catch {
    // stream may have ended; ignore
  }
}

async function ramp(streams: Stream[], from: (s: Stream) => number, to: (s: Stream) => number, ms: number) {
  const steps = Math.max(2, Math.round(ms / 50));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await Promise.all(streams.map((s) => setVolume(s.index, from(s) + (to(s) - from(s)) * k)));
    await sleep(ms / steps);
  }
}

const paVolume = (chimeVolume: number) => String(Math.round((clampPct(chimeVolume) / 100) * 65536));

let chain: Promise<unknown> = Promise.resolve();

/** Plays chime + spoken alliance, ducking other audio. Calls are serialized. Never throws. */
export function playQueueAlert(alliance: Alliance, opts: AlertOptions): Promise<AlertResult> {
  const next = chain.then(() => doAlert(alliance, opts));
  chain = next.catch(() => undefined);
  return next;
}

async function doAlert(alliance: Alliance, { chimeVolume, duckLevel }: AlertOptions): Promise<AlertResult> {
  const id = randomUUID();
  const chimeFile = path.join(os.tmpdir(), `pit-chime-${id}.wav`);
  const voiceFile = path.join(os.tmpdir(), `pit-voice-${id}.wav`);
  const duck = clampPct(duckLevel) / 100;
  const vol = paVolume(chimeVolume);
  let streams: Stream[] = [];
  let ducked = false;
  let chimePlayed = false;
  let voicePlayed = false;
  let missing: string | null = null;

  try {
    streams = await listStreams();
    try {
      if (streams.length) {
        ducked = true;
        await ramp(streams, (s) => s.percent, (s) => s.percent * duck, 150);
      }

      try {
        await writeFile(chimeFile, makeChimeWav());
        await run("paplay", [`--volume=${vol}`, chimeFile]);
        chimePlayed = true;
      } catch (e) {
        if (e instanceof MissingCommand) missing = e.cmd;
        else console.error("[queue-alert] chime failed:", (e as Error).message);
      }

      if (!missing) {
        try {
          // Prefer the Piper clip the installer pre-renders; fall back to espeak-ng if it isn't there.
          const clip = await voiceClip(alliance);
          if (clip) {
            await run("paplay", [`--volume=${vol}`, clip]);
          } else {
            await run("espeak-ng", ["-s", "150", "-w", voiceFile, SPEECH[alliance]]);
            await run("paplay", [`--volume=${vol}`, voiceFile]);
          }
          voicePlayed = true;
        } catch (e) {
          if (e instanceof MissingCommand) missing = e.cmd;
          else console.error("[queue-alert] voice failed:", (e as Error).message);
        }
      }
      await sleep(300);
    } finally {
      if (ducked) await ramp(streams, (s) => s.percent * duck, (s) => s.percent, 600);
    }
  } catch (e) {
    console.error("[queue-alert] unexpected error:", (e as Error).message);
  } finally {
    await Promise.all([unlink(chimeFile), unlink(voiceFile)].map((p) => p.catch(() => undefined)));
  }

  const label = SPEECH[alliance].toLowerCase();
  if (voicePlayed) return { ok: true, message: `Played the ${alliance} alliance alert.` };
  if (chimePlayed)
    return {
      ok: false,
      message: missing
        ? `Played the chime, but couldn't speak "${label}": install espeak-ng on the Pi.`
        : `Played the chime, but couldn't speak "${label}".`,
    };
  if (missing) return { ok: false, message: "Couldn't play audio: install pulseaudio-utils and espeak-ng on the Pi." };
  return { ok: false, message: "Couldn't play audio. Check that the Pi's speakers are connected and PulseAudio is running." };
}
