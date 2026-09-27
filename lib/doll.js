// Shared "paper doll" storybook drawing kit (Canvas 2D), extracted from the approved Episode 02 renderer.
// Rules: one even ink line with a slight hand wobble, flat fills + coloured-pencil hatch, sleeve-tube arms
// with one elbow (elbow always out and down), plain round hands, props held between sleeve and hand.
// view.z = current camera zoom; line weight grows gently with zoom so close-ups stay crisp.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
GlobalFonts.registerFromPath(path.join(__dirname, 'fonts/Baloo2.ttf'), 'Baloo');

const INK = '#2B2522';
const PEN = '#E0522F';
const view = { z: 1 };
const PATCTX = createCanvas(4, 4).getContext('2d');
const PAT = new Map();
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const lerp2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const E = {
  s: k => k * k * (3 - 2 * k), o: k => 1 - (1 - k) ** 3, i: k => k * k * k,
  io: k => k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2,
  back: k => { const c = 1.6; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
const seg = (t, a, b, e = E.s) => e(clamp((t - a) / (b - a)));
const pulse = (t, a, d) => (t > a && t < a + d) ? Math.sin(Math.PI * (t - a) / d) : 0;
function h1(n) { n |= 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16; return (n >>> 0) / 4294967295 * 2 - 1; }
function vn(seed, x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(seed * 7919 + i), h1(seed * 7919 + i + 1), u); }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const shash = s => { let h = 7; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
function mix(a, b, k) {
  const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}
const dk = (c, k = 0.3) => mix(c, '#3A2418', k);


function pat(col) { // diagonal pencil strokes in `col`, plus a few paper-white strokes
  if (PAT.has(col)) return PAT.get(col);
  const S = 220, c = createCanvas(S, S), x = c.getContext('2d'), r = rng(shash(col));
  x.lineCap = 'round';
  const put = (px, py, L, w, st, a) => {
    x.strokeStyle = st; x.globalAlpha = a; x.lineWidth = w;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + L * 0.5, py + oy - L * 0.87); x.stroke(); }
  };
  for (let i = 0; i < 300; i++) put(r() * S, r() * S, 14 + r() * 34, 1.2 + r() * 1.5, col, 0.3 + r() * 0.5);
  for (let i = 0; i < 70; i++) put(r() * S, r() * S, 10 + r() * 24, 1 + r(), '#FFFFFF', 0.18 + r() * 0.2);
  const p = PATCTX.createPattern(c, 'repeat'); PAT.set(col, p); return p;
}

// ---------- line + shape primitives ----------
function lw(ctx, k = 1) { const m = ctx.getTransform(); return k * 5.4 * Math.pow(view.z, 0.45) / Math.hypot(m.a, m.b); }
function resample(p, closed, step) {
  const o = [], n = p.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const a = p[i], b = p[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let j = 0; j < k; j++) o.push(lerp2(a, b, j / k)); }
  if (!closed) o.push(p[n - 1]);
  return o;
}
function jit(p, seed, amp) {
  let s = 0;
  return p.map((q, i) => { if (i) s += Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]); return [q[0] + amp * vn(seed, s / 70), q[1] + amp * vn(seed + 7, s / 70)]; });
}
function trace(ctx, p, closed) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (closed) ctx.closePath(); }
const autoSeed = p => h1(Math.round(p[0][0]) * 73 + Math.round(p[0][1]) * 131 + p.length * 7) * 1e5 | 0;
// o: {fill, hatch (colour), ha (hatch alpha), stroke:false, lwk, closed:false, col}
function shape(ctx, p, o = {}) {
  const closed = o.closed !== false;
  if (o.fill && closed) {
    ctx.beginPath(); trace(ctx, p, true); ctx.fillStyle = o.fill; ctx.fill();
    if (o.hatch) { ctx.save(); ctx.clip(); ctx.globalAlpha = o.ha ?? 0.5; ctx.fillStyle = pat(o.hatch); ctx.fillRect(-5000, -5000, 10000, 10000); ctx.restore(); }
  }
  if (o.stroke !== false) {
    const L = lw(ctx, o.lwk ?? 1);
    const q = jit(resample(p, closed, 6), o.seed ?? autoSeed(p), L * 0.3);
    ctx.beginPath(); trace(ctx, q, closed); ctx.lineWidth = L; ctx.strokeStyle = o.col || INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
}
const line = (ctx, p, o = {}) => shape(ctx, p, { ...o, closed: false });
const ell = (x, y, rx, ry, n = 44) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
const arcP = (x, y, r, a0, a1, n = 20) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); const o = [];
  for (const [cx, cy, a0] of [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]])
    for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return o;
}
// rounded-square head; jaw > 0 narrows the chin, < 0 makes jowls
function sup(x, y, rx, ry, n, jaw = 0, N = 64) {
  return Array.from({ length: N }, (_, i) => {
    const a = i / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    let px = Math.sign(c) * Math.abs(c) ** (2 / n) * rx; const py = Math.sign(s) * Math.abs(s) ** (2 / n) * ry;
    if (s > 0) px *= 1 - jaw * s * s;
    return [x + px, y + py];
  });
}
function spl(pts, closed = true, step = 6) { // Catmull-Rom through the points
  const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)], o = [], m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = a => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
      o.push([f(0), f(1)]);
    }
  }
  if (!closed) o.push(pts[n - 1]);
  return o;
}
const mirror = p => p.map(([x, y]) => [-x, y]);
function blob(ctx, x, y, rx, ry, col, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.restore(); }
function text(ctx, s, x, y, size, col = INK, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px Baloo`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function star(ctx, x, y, s, fill = '#FFF6D8') { // four-point sparkle
  if (s <= 0.02) return;
  const p = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 0.28 : 1; p.push([x + Math.cos(a) * r * 30 * s, y + Math.sin(a) * r * 30 * s]); }
  shape(ctx, spl(p, true, 3), { fill, lwk: 0.7 });
}

// ---------- arms ----------
// elbow picked to point out and down, so arms never fold in toward the body
function ik(sh, t, l1, l2, sx) {
  const dx = t[0] - sh[0], dy = t[1] - sh[1], d = Math.hypot(dx, dy), dd = clamp(d, Math.abs(l1 - l2) + 1, l1 + l2 - 0.5);
  const a = Math.atan2(dy, dx), A = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
  const c = [a + A, a - A].map(b => [sh[0] + l1 * Math.cos(b), sh[1] + l1 * Math.sin(b)]);
  const score = e => sx * e[0] + 0.6 * e[1];
  return [score(c[0]) > score(c[1]) ? c[0] : c[1], [sh[0] + Math.cos(a) * dd, sh[1] + Math.sin(a) * dd]];
}
function sleeve(ctx, pts, w, fill, cuff) {
  const q = spl(pts, false, 5), L = lw(ctx);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); trace(ctx, q, false);
  ctx.strokeStyle = INK; ctx.lineWidth = w + 2 * L; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = pat(dk(fill, 0.28)); ctx.stroke(); ctx.globalAlpha = 1;
  if (cuff) { // a darker band just above the wrist
    const n = q.length, a = q[Math.max(0, n - 9)], b = q[n - 1];
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 2 * L; ctx.stroke(); ctx.strokeStyle = cuff; ctx.lineWidth = w; ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.strokeStyle = pat(dk(cuff, 0.3)); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  const n = q.length, p = q[Math.max(0, n - 4)], e = q[n - 1];
  return { w: e, dir: Math.atan2(e[1] - p[1], e[0] - p[0]) };
}
// simple round hand at the end of the sleeve; 'flat' = resting on a surface
function hand(ctx, arm, r, skin, mode = 'round') {
  const c = [arm.w[0] + Math.cos(arm.dir) * r * 0.5, arm.w[1] + Math.sin(arm.dir) * r * 0.5];
  if (mode === 'flat') shape(ctx, rr(c[0] - r * 1.15, c[1] - r * 0.7, r * 2.3, r * 1.45, r * 0.7), { fill: skin, hatch: dk(skin, 0.25), ha: 0.14 });
  else shape(ctx, ell(c[0], c[1], r, r * 0.95), { fill: skin, hatch: dk(skin, 0.25), ha: 0.14 });
  return c;
}
function armPose(ctx, sh, target, l1, l2, sx, w, fill, cuff) {
  const [e, wr] = ik(sh, target, l1, l2, sx);
  return sleeve(ctx, [sh, e, wr], w, fill, cuff);
}
const HX = (ctx, p, o) => shape(ctx, p, { hatch: dk(o.fill, 0.28), ha: 0.5, ...o }); // hatched clothing fill
const SK = (ctx, p, fill, o = {}) => shape(ctx, p, { fill, hatch: dk(fill, 0.25), ha: 0.14, ...o });


// ---------- graphic devices ----------
function bubble(ctx, x, y, str, k, tail = [-50, 80], size = 46) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.font = `800 ${size}px Baloo`; const w = ctx.measureText(str).width + 60, h = size + 44;
  const body = rr(-w / 2, -h / 2, w, h, h / 2), tl = [[tail[0] * 0.25 - 20, h / 2 - 6], tail, [tail[0] * 0.25 + 20, h / 2 - 6]];
  shape(ctx, tl, { fill: '#FFFFFF' }); shape(ctx, body, { fill: '#FFFFFF' }); shape(ctx, tl, { fill: '#FFFFFF', stroke: false });
  text(ctx, str, 0, 3, size, INK);
  ctx.restore();
}
function chip(ctx, x, y, str, k, col, size = 60) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.font = `800 ${size}px Baloo`; const w = ctx.measureText(str).width + size * 1.3, h = size * 1.6;
  shape(ctx, rr(-w / 2, -h / 2, w, h, h / 2), { fill: '#FFFFFF', col, lwk: 1.5 });
  text(ctx, str, 0, size * 0.06, size, col);
  ctx.restore();
}
function stamp(ctx, x, y, str, k, col, rot) {
  if (k <= 0) return;
  const e = E.o(clamp(k)), sc = lerp(1.8, 1, e);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 1.5);
  ctx.font = '800 76px Baloo'; const w = ctx.measureText(str).width + 76;
  shape(ctx, rr(-w / 2, -62, w, 124, 18), { fill: 'rgba(255,255,255,0.88)', col, lwk: 1.8 });
  shape(ctx, rr(-w / 2 + 13, -49, w - 26, 98, 12), { col, lwk: 0.8 });
  text(ctx, str, 0, 5, 76, col);
  ctx.restore();
}
function penPath(ctx, pts, k, col = PEN, w = 11) { // marker stroke that draws on with k
  if (k <= 0) return;
  const p = resample(pts, false, 4), d = [0];
  for (let i = 1; i < p.length; i++) d.push(d[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const lim = d[d.length - 1] * k;
  ctx.save(); ctx.beginPath(); ctx.moveTo(...p[0]);
  for (let i = 1; i < p.length && d[i] <= lim; i++) ctx.lineTo(...p[i]);
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.92; ctx.stroke(); ctx.restore();
}
function penEllipse(ctx, cx, cy, rx, ry, k, seed, col = PEN, w = 11) {
  const pts = [];
  for (let i = 0; i <= 64; i++) { const a = -2.4 + i / 64 * (Math.PI * 2 + 0.7), r = 1 + 0.035 * Math.sin(a * 3 + seed) + 0.04 * i / 64; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  penPath(ctx, pts, k, col, w);
}
function starsAround(ctx, pts, k) { for (const [x, y, s] of pts) star(ctx, x, y, s * k); }
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));
const popWin = (t, t0, t1) => popIn(t, t0) * (1 - seg(t, t1, t1 + 0.12));


module.exports = { createCanvas, INK, view, PAT, E, HX, SK, arcP, armPose, autoSeed, blob, bubble, chip, clamp, dk, ell, h1, hand, ik, jit, lerp, lerp2, line, lw, mirror, mix, pat, penEllipse, penPath, popIn, popWin, pulse, resample, rng, rr, seg, shape, shash, sleeve, spl, stamp, star, starsAround, sup, text, trace, vn };
