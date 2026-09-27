// Synthesised sound-effects bed for Episode 03 (deterministic, no samples).
// Usage: node sfx.js <seconds> <out.wav>   -> 48 kHz mono 16-bit WAV, mixed under the VO by build.sh
const fs = require('fs');
const SR = 48000, DUR = parseFloat(process.argv[2] || '10'), OUT = process.argv[3] || 'sfx.wav';
const N = Math.ceil(DUR * SR), buf = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (t0, len, fn) => { const a = Math.floor(t0 * SR); for (let i = 0; i < len * SR && a + i < N; i++) if (a + i >= 0) buf[a + i] += fn(i / SR); };

function buzz(t0, dur, vol) { // phone vibration: rough 150 Hz motor with a soft attack/release
  add(t0, dur, t => { const e = Math.min(1, t / 0.02, (dur - t) / 0.03); const x = Math.sin(2 * Math.PI * 150 * t); return vol * e * (0.7 * Math.sign(x) * Math.abs(x) ** 0.5 + 0.3 * Math.sin(2 * Math.PI * 300 * t)); });
}
function pop(t0, f0, f1, vol, len = 0.08) { // UI blip / tag pop
  add(t0, len, t => { const f = f0 + (f1 - f0) * t / len; return vol * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / (len * 0.35)); });
}
function whoosh(t0, len, vol, rise = true) { // band-limited noise swell
  let lp = 0, lp2 = 0;
  add(t0, len, t => { const u = t / len, env = Math.sin(Math.PI * u) ** 2, c = 0.02 + 0.25 * (rise ? u : 1 - u); lp += c * (rnd() - lp); lp2 += 0.5 * c * (lp - lp2); return vol * env * (lp - lp2) * 6; });
}
function clang(t0, vol) { // metal gate slamming shut
  const parts = [[180, 1.2], [283, 0.9], [431, 0.7], [612, 0.5], [845, 0.35], [1130, 0.25], [1570, 0.15]];
  add(t0, 2.2, t => { let s = 0; for (const [f, a] of parts) s += a * Math.sin(2 * Math.PI * f * t + f) * Math.exp(-t * (1.6 + f / 900)); return vol * (s / 3 + 0.9 * Math.sin(2 * Math.PI * 52 * t) * Math.exp(-t * 7)); });
}
function drone(t0, len, vol) { // low tension bed
  add(t0, len, t => { const e = Math.min(1, t / 0.4, (len - t) / 0.5); return vol * e * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.5 * t + Math.sin(t * 3))); });
}
function rewind(t0, len, vol) { // tape-rewind chirps over noise
  let lp = 0;
  add(t0, len, t => { const u = t / len, env = Math.sin(Math.PI * u); lp += 0.3 * (rnd() - lp); const f = 900 + 700 * Math.sin(t * 60); return vol * env * (0.5 * lp + 0.5 * Math.sin(2 * Math.PI * f * t)); });
}

// cues, in seconds on the VO timeline
buzz(0.0, 0.42, 0.16); buzz(0.55, 0.42, 0.16);
pop(1.0, 520, 980, 0.28); whoosh(1.06, 0.34, 0.2);
pop(3.2, 700, 1100, 0.14);
clang(5.04, 0.42); drone(5.04, 1.3, 0.07);
rewind(6.28, 0.42, 0.14);
pop(6.72, 880, 660, 0.18, 0.14);
buzz(7.35, 0.36, 0.09); buzz(7.85, 0.3, 0.09);
whoosh(8.34, 0.26, 0.16);

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = peak > 0.95 ? 0.95 / peak : 1, out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2);
fs.writeFileSync(OUT, out);
