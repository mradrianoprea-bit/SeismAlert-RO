/**
 * Pure PCM WAV synthesizers for SeismAlert RO audio alarms.
 * Works identically in Node.js and browsers with zero external dependencies.
 *
 * Two acoustically distinct signatures:
 * 1. Standard Romania Seismic Alarm (M 3.0 – 5.5): rhythmic alternating dual-tone pulse (853/960/1280 Hz).
 * 2. Major Romania Civil-Defense Siren (M > 5.5): sweeping emergency klaxon (620->1680->620 Hz)
 *    followed by 3 piercing staccato warning bursts (1568/1175 Hz).
 */

function createWavBuffer(sampleRate: number, samples: Float32Array): Uint8Array {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit mono PCM
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return new Uint8Array(buffer);
}

export function generateStandardRomaniaSirenWav(): Uint8Array {
  const sampleRate = 22050;
  const durationSec = 2.3; // 2 clean 1.15s pulses
  const numSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(numSamples);

  let phase1 = 0;
  let phase2 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cycleT = t % 1.15;

    if (cycleT < 0.68) {
      let f1 = 853;
      let f2 = 960;
      if (cycleT >= 0.22 && cycleT < 0.44) {
        f1 = 960;
        f2 = 1280;
      }
      phase1 += (2 * Math.PI * f1) / sampleRate;
      phase2 += (2 * Math.PI * f2) / sampleRate;

      const tone1 = Math.sin(phase1) * 0.6 + Math.sin(phase1 * 2) * 0.2;
      const tone2 = Math.sin(phase2) * 0.6 + Math.sin(phase2 * 3) * 0.15;
      const env = Math.min(1, cycleT / 0.02, (0.68 - cycleT) / 0.04);
      samples[i] = (tone1 + tone2) * 0.58 * env;
    } else {
      samples[i] = 0;
    }
  }

  return createWavBuffer(sampleRate, samples);
}

export function generateMajorRomaniaSirenWav(): Uint8Array {
  const sampleRate = 22050;
  const durationSec = 3.6; // 3 urgent 1.2s cycles
  const numSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(numSamples);

  let sweepPhase = 0;
  let burstPhase = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cycleT = t % 1.2;
    let sample = 0;

    if (cycleT < 0.72) {
      // Rising-falling civil-defense klaxon sweep (620 Hz -> 1680 Hz -> 620 Hz)
      const norm = cycleT / 0.72;
      const tri = norm < 0.5 ? norm * 2 : (1 - norm) * 2;
      const freq = 620 + tri * 1060;
      sweepPhase += (2 * Math.PI * freq) / sampleRate;
      const fund = Math.sin(sweepPhase);
      const harm = Math.sin(sweepPhase * 2) * 0.35 + Math.sin(sweepPhase * 3) * 0.2;
      const env = Math.min(1, cycleT / 0.02, (0.72 - cycleT) / 0.03);
      sample = (fund * 0.65 + harm * 0.35) * 0.94 * env;
    } else if (cycleT < 1.14) {
      // 3 piercing staccato emergency bursts at 1568 Hz + 1175 Hz
      const subT = cycleT - 0.72;
      const slot = subT % 0.14;
      if (slot < 0.095) {
        burstPhase += (2 * Math.PI * 1568) / sampleRate;
        const hi = Math.sin(burstPhase);
        const mid = Math.sin((burstPhase * 1175) / 1568);
        const env = Math.min(1, slot / 0.008, (0.095 - slot) / 0.012);
        sample = (hi * 0.65 + mid * 0.35) * 0.95 * env;
      }
    }

    samples[i] = sample;
  }

  return createWavBuffer(sampleRate, samples);
}
