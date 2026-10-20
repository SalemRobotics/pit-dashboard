// Client-only countdown timer shared by every page. State is the end timestamp in localStorage,
// so it survives navigation and reloads and syncs across tabs.
import { unlockAudio } from "./alarm-audio";

const KEY = "pit-display.timer-end";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeTimer(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Epoch ms when the timer ends, or null if no timer is set (also null while ringing was dismissed). */
export function getTimerEnd(): number | null {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export const getServerTimerEnd = (): number | null => null;

export function startTimer(durationMs: number) {
  unlockAudio(); // starting the timer is a user gesture, which lets the alarm play later
  try {
    localStorage.setItem(KEY, String(Date.now() + durationMs));
  } catch {}
  emit();
}

/** Cancels a running timer or dismisses a ringing alarm. */
export function clearTimer() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  emit();
}
