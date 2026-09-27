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

function thud(t0, vol) { // stamp / landing
  add(t0, 0.5, t => vol * (Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 9) + 0.5 * rnd() * Math.exp(-t * 40)));
}
function chime(t0, vol, f = 1320) { add(t0, 1.4, t => vol * Math.exp(-t * 3) * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t)) / 1.75); }
function tick(t0, vol) { add(t0, 0.03, t => vol * rnd() * Math.exp(-t * 250)); }
function tone(t0, len, f0, f1, vol) { add(t0, len, t => { const e = Math.min(1, t / 0.01, (len - t) / 0.03); return vol * e * Math.sin(2 * Math.PI * (f0 + (f1 - f0) * t / len / 2) * t); }); }
function dtmf(t0, a, b, vol, len = 0.1) { add(t0, len, t => { const e = Math.min(1, t / 0.005, (len - t) / 0.01); return vol * e * (Math.sin(2 * Math.PI * a * t) + Math.sin(2 * Math.PI * b * t)) / 2; }); }
function scribble(t0, len, vol) { let lp = 0; add(t0, len, t => { lp += 0.35 * (rnd() - lp); return vol * lp * (0.6 + 0.4 * Math.sin(t * 150)) * Math.min(1, (len - t) / 0.04); }); }

// full episode (cues past the render length are simply dropped by add())
whoosh(9.82, 0.3, 0.18); thud(10.12, 0.3);
thud(10.84, 0.4);
pop(11.6, 600, 900, 0.18); pop(11.66, 700, 1000, 0.16); pop(11.72, 800, 1100, 0.16);
for (let i = 0; i < 4; i++) tone(11.62 + i * 0.26, 0.22, i % 2 ? 620 : 820, i % 2 ? 620 : 820, 0.05);
thud(13.1, 0.4);
pop(14.2, 1200, 1200, 0.12, 0.06); pop(14.32, 1200, 1200, 0.12, 0.06);
scribble(15.8, 0.34, 0.2);
for (let x = 16.62; x < 18.4; x += 0.09) tick(x, 0.2);
drone(18.5, 1.6, 0.08); whoosh(18.5, 0.6, 0.12);
for (let x = 21.0; x < 21.66; x += 0.05) tick(x, 0.14);
pop(22.05, 500, 700, 0.2); whoosh(22.1, 0.9, 0.14); chime(22.5, 0.18, 1175); tone(23.1, 0.6, 420, 200, 0.12);
whoosh(23.7, 0.6, 0.18); scribble(24.1, 0.22, 0.26); thud(24.46, 0.4); thud(25.62, 0.34);
drone(25.92, 2.3, 0.06);
pop(28.46, 700, 1100, 0.14); pop(29.62, 500, 800, 0.16); pop(30.3, 900, 1200, 0.1); pop(30.54, 500, 800, 0.16);
scribble(31.6, 0.6, 0.06); scribble(32.6, 0.25, 0.2);
pop(33.4, 700, 1100, 0.14); pop(34.68, 600, 900, 0.12); pop(38.0, 600, 900, 0.12); pop(40.06, 600, 900, 0.12);
scribble(37.3, 0.45, 0.2); scribble(39.3, 0.45, 0.2); scribble(41.1, 0.45, 0.2);
for (const x of [41.7, 42.25, 42.8]) buzz(x, 0.4, 0.13);
tone(42.96, 0.12, 700, 700, 0.12); tone(43.1, 0.2, 520, 520, 0.12);
chime(43.62, 0.14, 988);
dtmf(44.96, 697, 1209, 0.12); dtmf(45.08, 852, 1477, 0.12); dtmf(45.2, 697, 1477, 0.12); dtmf(45.32, 941, 1336, 0.12);
chime(45.9, 0.1, 880);
for (let x = 46.7; x < 48.6; x += 0.6) buzz(x, 0.4, 0.07);
tone(48.64, 0.12, 700, 700, 0.12); tone(48.78, 0.2, 520, 520, 0.12);
whoosh(49.6, 0.5, 0.14); chime(49.72, 0.14, 1047); chime(50.82, 0.2, 1568);

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = peak > 0.95 ? 0.95 / peak : 1, out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2);
fs.writeFileSync(OUT, out);
