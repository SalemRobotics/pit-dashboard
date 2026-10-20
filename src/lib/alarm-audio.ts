// Client-only. The alarm is synthesised with Web Audio, so there is no audio file to ship.
let ctx: AudioContext | null = null;

/** Create/resume the shared AudioContext. Call from a user gesture so later alarms are allowed to play. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** How often to repeat the burst while the alarm is ringing. */
export const ALARM_REPEAT_MS = 1500;

/** Three short beeps. `volume` is 0-100; used for both the alarm and the settings test sound. */
export function playAlarmBurst(volume: number) {
  const c = unlockAudio();
  if (!c || volume <= 0) return;
  const peak = Math.pow(volume / 100, 2) * 0.8;
  const start = c.currentTime + 0.02;
  for (let i = 0; i < 3; i++) {
    const t = start + i * 0.25;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.01);
    gain.gain.setValueAtTime(peak, t + 0.12);
    gain.gain.linearRampToValueAtTime(0, t + 0.16);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  }
}
