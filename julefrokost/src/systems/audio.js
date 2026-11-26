// Lydeffekter lavet direkte med WebAudio, så der ikke skal hentes lydfiler.
// Musik er ikke med endnu. Lyd kan først starte efter første tryk (krav i alle mobilbrowsere).

import * as Save from './save.js';

let ctx = null;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (e) { /* ingen lyd */ }
}

export function isMuted() { return !!Save.load().mute; }
export function toggleMute() { const s = Save.load(); s.mute = !s.mute; Save.persist(); return s.mute; }

function tone(type, f0, f1, dur, vol = 0.12, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.15, delay = 0) {
  const t = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(ctx.destination);
  src.start(t);
}

const SFX = {
  jump: () => tone('square', 320, 640, 0.14, 0.08),
  slide: () => noise(0.18, 0.08),
  swing: () => { noise(0.08, 0.1); tone('triangle', 500, 180, 0.1, 0.08); },
  hit: () => { noise(0.12, 0.16); tone('square', 220, 90, 0.14, 0.1); },
  beer: () => { tone('square', 880, 880, 0.06, 0.07); tone('square', 1320, 1320, 0.09, 0.07, 0.06); },
  heart: () => { tone('triangle', 660, 660, 0.08, 0.1); tone('triangle', 990, 990, 0.14, 0.1, 0.08); },
  shot: () => { tone('sawtooth', 200, 900, 0.3, 0.08); },
  hurt: () => { tone('sawtooth', 300, 70, 0.3, 0.12); noise(0.1, 0.1); },
  flag: () => [523, 659, 784].forEach((f, i) => tone('square', f, f, 0.1, 0.08, i * 0.09)),
  quiz: () => [784, 988].forEach((f, i) => tone('triangle', f, f, 0.1, 0.1, i * 0.1)),
  right: () => [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.11, 0.08, i * 0.09)),
  wrong: () => { tone('sawtooth', 160, 110, 0.35, 0.1); },
  super: () => { noise(0.3, 0.18); tone('square', 110, 880, 0.35, 0.1); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, 0.13, 0.08, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f, 0.2, 0.1, i * 0.16)),
  click: () => tone('square', 660, 660, 0.05, 0.06),
  boss: () => { tone('sawtooth', 90, 60, 0.5, 0.14); },
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || isMuted()) return;
  try { SFX[name]?.(); } catch (e) { /* ignorer */ }
}
