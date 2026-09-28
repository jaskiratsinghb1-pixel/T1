// Synthesised sound-effects bed for Episode 04 (deterministic, no samples).
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

function thud(t0, vol) { // stamp / landing
  add(t0, 0.5, t => vol * (Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 9) + 0.5 * rnd() * Math.exp(-t * 40)));
}
function chime(t0, vol, f = 1320) { add(t0, 1.4, t => vol * Math.exp(-t * 3) * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t)) / 1.75); }
function tick(t0, vol) { add(t0, 0.03, t => vol * rnd() * Math.exp(-t * 250)); }
function tone(t0, len, f0, f1, vol) { add(t0, len, t => { const e = Math.min(1, t / 0.01, (len - t) / 0.03); return vol * e * Math.sin(2 * Math.PI * (f0 + (f1 - f0) * t / len / 2) * t); }); }
function dtmf(t0, a, b, vol, len = 0.1) { add(t0, len, t => { const e = Math.min(1, t / 0.005, (len - t) / 0.01); return vol * e * (Math.sin(2 * Math.PI * a * t) + Math.sin(2 * Math.PI * b * t)) / 2; }); }
function scribble(t0, len, vol) { let lp = 0; add(t0, len, t => { lp += 0.35 * (rnd() - lp); return vol * lp * (0.6 + 0.4 * Math.sin(t * 150)) * Math.min(1, (len - t) / 0.04); }); }

// cues, in seconds on the Episode 04 VO timeline (anything past the render length is dropped)
buzz(0.0, 0.45, 0.15); pop(0.08, 700, 1000, 0.16);
for (let i = 0; i < 5; i++) pop(2.9 + i * 0.1, 900, 1200, 0.1, 0.05);
thud(3.04, 0.42); drone(3.04, 1.3, 0.07);
rewind(4.38, 0.4, 0.14); pop(4.9, 880, 660, 0.18, 0.14);
buzz(6.45, 0.35, 0.1); buzz(6.95, 0.35, 0.1);
pop(8.14, 800, 1100, 0.14); tone(10.96, 0.3, 300, 220, 0.1);
pop(12.9, 600, 900, 0.16); scribble(14.6, 0.4, 0.18);
pop(16.96, 1000, 1000, 0.14, 0.05); for (let x = 17.05; x < 17.75; x += 0.07) tick(x, 0.1); chime(17.8, 0.12, 1175);
pop(18.9, 700, 1000, 0.12); pop(22.18, 1000, 1000, 0.18, 0.05); drone(22.2, 1.3, 0.07);
drone(23.5, 4.9, 0.05); for (let i = 0; i < 7; i++) pop(25.6 + i * 0.38, 1400, 1800, 0.07, 0.06);
[29.1, 29.5, 29.85, 30.1, 30.35, 30.6].forEach(x => { buzz(x, 0.18, 0.08); pop(x, 900, 700, 0.1, 0.06); });
thud(31.78, 0.35); thud(32.6, 0.42);
pop(33.72, 700, 1100, 0.14); pop(35.06, 500, 800, 0.16); pop(35.6, 900, 1200, 0.1); pop(35.96, 500, 800, 0.16);
whoosh(36.95, 0.35, 0.16); pop(37.16, 600, 900, 0.14); whoosh(38.5, 0.25, 0.12); whoosh(39.2, 0.25, 0.12); pop(39.9, 300, 200, 0.16, 0.12);
pop(40.64, 700, 1100, 0.14); pop(41.96, 600, 900, 0.12); scribble(44.4, 0.4, 0.2); pop(45.4, 600, 900, 0.12); pop(47.42, 800, 1200, 0.12); scribble(47.8, 0.4, 0.12); chime(48.4, 0.12, 1320);
pop(51.72, 1000, 1000, 0.12, 0.05); tone(51.75, 0.12, 600, 400, 0.08); pop(52.1, 1000, 1000, 0.16, 0.05); whoosh(52.35, 0.45, 0.14); chime(52.7, 0.12, 988);
dtmf(55.24, 697, 1209, 0.12); dtmf(55.36, 852, 1477, 0.12); dtmf(55.48, 697, 1477, 0.12); dtmf(55.6, 941, 1336, 0.12);
chime(56.0, 0.1, 880); pop(56.84, 600, 900, 0.14);
buzz(58.6, 0.3, 0.08); buzz(59.05, 0.3, 0.08); pop(58.8, 800, 1100, 0.12); scribble(60.24, 0.35, 0.22);
whoosh(61.7, 0.5, 0.14); chime(61.9, 0.14, 1047); chime(63.24, 0.2, 1568);
whoosh(64.2, 0.4, 0.12); pop(64.35, 600, 900, 0.14); pop(64.7, 700, 1000, 0.12); pop(66.25, 1000, 1000, 0.14, 0.05); chime(66.4, 0.14, 1319);

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = peak > 0.95 ? 0.95 / peak : 1, out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2);
fs.writeFileSync(OUT, out);
