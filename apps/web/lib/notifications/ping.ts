"use client";

const SOUND_KEY = "kipita-sound";
const ICON = "/favicons/favicon-32x32.png";
const QUIET_MS = 1500;
const NOTES = [
  { hz: 783.99, at: 0, level: 0.85 },
  { hz: 1046.5, at: 0.095, level: 1 },
];
const PARTIALS = [
  { ratio: 1, gain: 1, decay: 0.55 },
  { ratio: 3.99, gain: 0.16, decay: 0.12 },
  { ratio: 10.1, gain: 0.04, decay: 0.05 },
];

let audio: AudioContext | null = null;
let lastRing = 0;

export type Ping = {
  title: string;
  body?: string;
  tag: string;
  href?: string | null;
};

export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    return;
  }
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audio ??= new Ctor();
  return audio;
}

export function unlockSound(): void {
  const ctx = context();
  if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
}

function ring(ctx: AudioContext): void {
  const start = ctx.currentTime + 0.01;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 3400;
  soften.Q.value = 0.5;
  const master = ctx.createGain();
  master.gain.value = 0.13;
  soften.connect(master);
  master.connect(ctx.destination);

  for (const { hz, at, level } of NOTES) {
    const t = start + at;
    for (const { ratio, gain, decay } of PARTIALS) {
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0.0001, t);
      envelope.gain.exponentialRampToValueAtTime(gain * level, t + 0.006);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      envelope.connect(soften);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz * ratio;
      osc.connect(envelope);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }
}

export function chime(preview = false): void {
  if (!preview && !soundOn()) return;
  const now = Date.now();
  if (!preview && now - lastRing < QUIET_MS) return;
  lastRing = now;

  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "running") {
    ring(ctx);
    return;
  }
  void ctx
    .resume()
    .then(() => ring(ctx))
    .catch(() => undefined);
}

export function ping({ title, body, tag, href }: Ping): void {
  chime();

  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    const shown = new Notification(title, { body, tag, icon: ICON });
    shown.onclick = () => {
      window.focus();
      if (href) window.location.assign(href);
      shown.close();
    };
  } catch {
    return;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockSound, { once: true, capture: true });
  window.addEventListener("keydown", unlockSound, { once: true, capture: true });
}
