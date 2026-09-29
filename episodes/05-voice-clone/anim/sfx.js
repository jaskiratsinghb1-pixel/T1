// Synthesised sound-effects bed for Episode 05 (deterministic, no samples).
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

// cues, in seconds on the Episode 05 VO timeline (anything past the render length is dropped)
drone(0.0, 2.7, 0.06); for (let i = 0; i < 4; i++) tone(0.2 + i * 0.6, 0.18, 880, 860, 0.03);
thud(2.7, 0.3);
scribble(6.6, 0.4, 0.14); scribble(7.1, 0.3, 0.16); tone(7.4, 0.5, 600, 180, 0.1); scribble(7.6, 0.3, 0.18); thud(7.95, 0.42);
rewind(8.88, 0.42, 0.14); pop(9.0, 880, 660, 0.18, 0.14);
pop(11.3, 700, 1000, 0.14); for (let x = 11.4; x < 11.9; x += 0.1) tick(x, 0.14); pop(12.18, 600, 900, 0.14);
for (const x of [12.8, 13.3]) buzz(x, 0.34, 0.12);
pop(15.34, 900, 1300, 0.12); for (let i = 0; i < 6; i++) tone(17.7 + i * 0.24, 0.22, i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.035);
drone(19.16, 6.0, 0.06); thud(21.88, 0.36); thud(23.14, 0.42);
pop(26.14, 1000, 1000, 0.16, 0.05); whoosh(26.8, 0.8, 0.14); chime(26.8, 0.12, 1175);
pop(27.4, 500, 900, 0.16); pop(28.66, 700, 1000, 0.12);
pop(31.92, 300, 600, 0.16, 0.12); whoosh(34.1, 1.6, 0.1); pop(34.6, 800, 1100, 0.12); thud(35.3, 0.4);
pop(36.4, 700, 1100, 0.14); pop(38.12, 500, 800, 0.16); pop(39.24, 900, 1200, 0.1); pop(39.82, 500, 800, 0.16);
pop(40.8, 700, 1100, 0.14); pop(43.5, 1000, 1000, 0.14, 0.05); tone(43.55, 0.14, 620, 620, 0.1); tone(43.72, 0.22, 460, 460, 0.1);
for (const x of [45.0, 45.7]) tone(x, 0.45, 425, 425, 0.05); pop(45.36, 700, 1000, 0.12); pop(46.5, 700, 1000, 0.12);
pop(47.66, 600, 900, 0.14); for (let i = 0; i < 5; i++) pop(48.3 + i * 0.16, 1200, 1200, 0.1, 0.04); chime(50.4, 0.1, 1320);
whoosh(51.4, 0.4, 0.12); pop(51.62, 700, 1000, 0.12); scribble(52.4, 0.35, 0.16); scribble(52.85, 0.3, 0.18); thud(53.32, 0.42);
pop(54.3, 700, 1000, 0.12);
dtmf(56.56, 697, 1209, 0.12); dtmf(56.72, 852, 1477, 0.12); dtmf(56.88, 697, 1477, 0.12); dtmf(57.04, 941, 1336, 0.12); chime(57.8, 0.1, 880);
for (const x of [58.9, 59.4]) buzz(x, 0.34, 0.09); pop(59.1, 700, 1000, 0.12); pop(61.46, 700, 1000, 0.12);
scribble(62.5, 0.25, 0.14); tone(62.8, 0.14, 620, 620, 0.1); tone(62.96, 0.22, 460, 460, 0.1);
whoosh(63.3, 0.5, 0.14); chime(63.5, 0.14, 1047); chime(64.94, 0.2, 1568);
whoosh(65.8, 0.4, 0.12); pop(66.0, 600, 900, 0.14); pop(66.4, 700, 1000, 0.12); pop(68.05, 1000, 1000, 0.14, 0.05); chime(68.15, 0.14, 1319);

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = peak > 0.95 ? 0.95 / peak : 1, out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), 44 + i * 2);
fs.writeFileSync(OUT, out);
