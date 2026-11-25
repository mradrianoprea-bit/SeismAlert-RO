import {
  generateMajorRomaniaSirenWav,
  generateStandardRomaniaSirenWav,
} from './majorSirenWav';

let audioCtx: AudioContext | null = null;
let alarmIntervalId: number | null = null;
let activeOscillators: OscillatorNode[] = [];
let whistleOsc: OscillatorNode | null = null;
let whistleGain: GainNode | null = null;

// Persistent HTMLAudioElement + instant in-memory WAV Blob URLs for 100% reliable mobile playback
let sirenAudioEl: HTMLAudioElement | null = null;
let standardWavUrl: string | null = null;
let majorWavUrl: string | null = null;
let autoUnlockInstalled = false;

function getSirenBlobUrl(isMajor: boolean): string | null {
  if (typeof window === 'undefined' || typeof Blob === 'undefined') return null;
  try {
    if (isMajor) {
      if (!majorWavUrl) {
        const bytes = generateMajorRomaniaSirenWav();
        majorWavUrl = URL.createObjectURL(
          new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' })
        );
      }
      return majorWavUrl;
    }
    if (!standardWavUrl) {
      const bytes = generateStandardRomaniaSirenWav();
      standardWavUrl = URL.createObjectURL(
        new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' })
      );
    }
    return standardWavUrl;
  } catch {
    return isMajor ? '/sounds/ro-major-quake-55.wav' : '/sounds/ro-standard-quake-30.wav';
  }
}

function getSirenAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!sirenAudioEl) {
    sirenAudioEl = new Audio();
    sirenAudioEl.preload = 'auto';
    sirenAudioEl.loop = true;
    sirenAudioEl.volume = 1.0;
    sirenAudioEl.setAttribute('playsinline', 'true');
    sirenAudioEl.setAttribute('webkit-playsinline', 'true');
  }
  return sirenAudioEl;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synchronously primes both AudioContext and HTMLAudioElement inside a user gesture
 * (required on Android Chrome & iOS Safari so siren audio plays reliably).
 */
export function unlockAudioSync(): boolean {
  let ok = false;
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      ok = true;
    } catch {
      // ignore
    }
  }

  getSirenBlobUrl(false);
  getSirenBlobUrl(true);

  const el = getSirenAudioElement();
  if (el && el.paused && !el.src) {
    const url = getSirenBlobUrl(false);
    if (url) {
      el.src = url;
      el.load();
    }
  }
  return ok;
}

export async function unlockAudioContext(): Promise<boolean> {
  unlockAudioSync();
  const ctx = getAudioContext();
  if (!ctx) return Boolean(getSirenAudioElement());
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return true;
  } catch {
    return Boolean(getSirenAudioElement());
  }
}

export function installAutoAudioUnlock() {
  if (autoUnlockInstalled || typeof window === 'undefined') return;
  autoUnlockInstalled = true;
  const onFirstInteraction = () => {
    unlockAudioSync();
    window.removeEventListener('pointerdown', onFirstInteraction);
    window.removeEventListener('touchstart', onFirstInteraction);
    window.removeEventListener('click', onFirstInteraction);
  };
  window.addEventListener('pointerdown', onFirstInteraction, { passive: true });
  window.addEventListener('touchstart', onFirstInteraction, { passive: true });
  window.addEventListener('click', onFirstInteraction, { passive: true });
}

export function playShortPing() {
  unlockAudioSync();
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046.5, now);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function triggerAlarmPulse(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'square';

  osc1.frequency.setValueAtTime(853, now);
  osc1.frequency.setValueAtTime(960, now + 0.22);
  osc1.frequency.setValueAtTime(853, now + 0.44);

  osc2.frequency.setValueAtTime(960, now);
  osc2.frequency.setValueAtTime(1280, now + 0.22);
  osc2.frequency.setValueAtTime(960, now + 0.44);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.58, now + 0.04);
  gain.gain.setValueAtTime(0.58, now + 0.58);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.7);
  osc2.stop(now + 0.7);

  activeOscillators = [osc1, osc2];
}

function triggerMajorRomaniaSirenPulse(ctx: AudioContext) {
  const now = ctx.currentTime;
  const created: OscillatorNode[] = [];

  // Stage 1: Rising & falling civil-defense klaxon sweep (620 Hz -> 1680 Hz -> 620 Hz)
  const sweepOsc = ctx.createOscillator();
  const sweepHarm = ctx.createOscillator();
  const sweepGain = ctx.createGain();

  sweepOsc.type = 'sawtooth';
  sweepHarm.type = 'triangle';

  sweepOsc.frequency.setValueAtTime(620, now);
  sweepOsc.frequency.exponentialRampToValueAtTime(1680, now + 0.36);
  sweepOsc.frequency.exponentialRampToValueAtTime(620, now + 0.72);

  sweepHarm.frequency.setValueAtTime(1240, now);
  sweepHarm.frequency.exponentialRampToValueAtTime(2240, now + 0.36);
  sweepHarm.frequency.exponentialRampToValueAtTime(1240, now + 0.72);

  sweepGain.gain.setValueAtTime(0.001, now);
  sweepGain.gain.linearRampToValueAtTime(0.7, now + 0.03);
  sweepGain.gain.setValueAtTime(0.7, now + 0.67);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

  sweepOsc.connect(sweepGain);
  sweepHarm.connect(sweepGain);
  sweepGain.connect(ctx.destination);

  sweepOsc.start(now);
  sweepHarm.start(now);
  sweepOsc.stop(now + 0.73);
  sweepHarm.stop(now + 0.73);
  created.push(sweepOsc, sweepHarm);

  // Stage 2: 3 piercing staccato emergency bursts (1568 Hz + 1175 Hz)
  for (let b = 0; b < 3; b++) {
    const startT = now + 0.75 + b * 0.14;
    const stopT = startT + 0.095;
    const hiOsc = ctx.createOscillator();
    const midOsc = ctx.createOscillator();
    const bGain = ctx.createGain();

    hiOsc.type = 'square';
    midOsc.type = 'sawtooth';
    hiOsc.frequency.setValueAtTime(1568, startT);
    midOsc.frequency.setValueAtTime(1175, startT);

    bGain.gain.setValueAtTime(0.001, startT);
    bGain.gain.linearRampToValueAtTime(0.68, startT + 0.01);
    bGain.gain.setValueAtTime(0.68, stopT - 0.015);
    bGain.gain.exponentialRampToValueAtTime(0.001, stopT);

    hiOsc.connect(bGain);
    midOsc.connect(bGain);
    bGain.connect(ctx.destination);

    hiOsc.start(startT);
    midOsc.start(startT);
    hiOsc.stop(stopT + 0.01);
    midOsc.stop(stopT + 0.01);
    created.push(hiOsc, midOsc);
  }

  activeOscillators = created;
}

function startWebAudioFallbackLoop(isMajor: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (isMajor) {
    triggerMajorRomaniaSirenPulse(ctx);
    alarmIntervalId = window.setInterval(() => {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      triggerMajorRomaniaSirenPulse(ctx);
    }, 1220);
  } else {
    triggerAlarmPulse(ctx);
    alarmIntervalId = window.setInterval(() => {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      triggerAlarmPulse(ctx);
    }, 1150);
  }
}

export function startSeismicAlarm(options: {
  magnitude: number;
  place: string;
  soundEnabled: boolean;
  isMajorRomania?: boolean;
}) {
  stopSeismicAlarm();

  const isMajor = Boolean(options.isMajorRomania);

  if (
    options.soundEnabled &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator
  ) {
    try {
      navigator.vibrate(
        isMajor
          ? [500, 120, 500, 120, 500, 120, 900, 150, 900]
          : [400, 150, 400, 150, 800]
      );
    } catch {
      // ignore if blocked
    }
  }

  if (options.soundEnabled) {
    unlockAudioSync();
    const el = getSirenAudioElement();
    const wavUrl = getSirenBlobUrl(isMajor);

    if (el && wavUrl) {
      try {
        el.pause();
        el.src = wavUrl;
        el.currentTime = 0;
        el.loop = true;
        el.muted = false;
        el.volume = isMajor ? 1.0 : 0.88;
        const playPromise = el.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            startWebAudioFallbackLoop(isMajor);
          });
        }
      } catch {
        startWebAudioFallbackLoop(isMajor);
      }
    } else {
      startWebAudioFallbackLoop(isMajor);
    }
  }
}

export function stopSeismicAlarm() {
  if (sirenAudioEl) {
    try {
      sirenAudioEl.pause();
      sirenAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
  }
  if (alarmIntervalId !== null) {
    window.clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  }
  activeOscillators = [];

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}

export function startOfflineWhistle() {
  stopOfflineWhistle();
  unlockAudioSync();
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(3100, now);
  gain.gain.setValueAtTime(0.7, now);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  whistleOsc = osc;
  whistleGain = gain;
}

export function stopOfflineWhistle() {
  if (whistleOsc) {
    try {
      whistleOsc.stop();
      whistleOsc.disconnect();
    } catch {
      // ignore
    }
    whistleOsc = null;
  }
  if (whistleGain) {
    try {
      whistleGain.disconnect();
    } catch {
      // ignore
    }
    whistleGain = null;
  }
}
