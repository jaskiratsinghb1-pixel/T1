// Video 2 opening (first 10 s) — "paper doll" storybook characters.
// Construction rules (keep consistent across episodes):
//  * front-facing, symmetric characters; head turns are a feature shift (fx), never a redraw
//  * one uniform ink line, no boil; flat fills + coloured-pencil hatch on clothes
//  * arms = thick sleeve tubes with one soft elbow (2-bone IK), hands = small skin rounds
//  * held props sit between the sleeve and the hand, so the hand always reads as gripping
//  * acting = expression swaps, nods/tilts and a few whole-arm poses with eased moves
// Usage: node v2open_doll.js all | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node v2open_doll.js 12,40,90 -> PNG stills in out_doll/ ;  node v2open_doll.js sheet -> model sheet
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
GlobalFonts.registerFromPath(__dirname + '/fonts/Baloo2.ttf', 'Baloo');

const W = 1080, H = 1920, FPS = 30, DUR = 10, NF = DUR * FPS;
const INK = '#2B2522';
const C = {
  wall: '#EFE4CF', tile: '#F7F2E8', tileLn: '#D9CDB9', wood: '#BC8A5E', woodTop: '#CFA077', woodLn: '#8E6040', floor: '#D9C5A3',
  sky: '#BFD8E6', sky2: '#F2D9BF', bld: '#9FB4C6', win: '#F5E6A8', shelf: '#C9A27C', sign: '#C95A4B', signTx: '#FBEFE3',
  sjSkin: '#F2C49E', sjSkin2: '#EBB287', vest: '#E0A13F', shirt: '#BCD3E3', shirt2: '#DDEAF2', grey: '#C4BDB3', brow: '#9D958B', stache: '#ECE8E1',
  cSkin: '#D6A07A', hood: '#4E8F8C', hood2: '#3E7775', cap: '#2F3D5B', cap2: '#243049', hair: '#3B2A22', jeans: '#354A70', shoe: '#F7F4EE',
  mouth: '#8C2F2A', tongue: '#E27D72', blush: 'rgba(238,150,135,0.55)', white: '#FFFFFF',
  box: '#EEF2F4', tag: '#F2BE4B', green: '#3FA35B', greenLt: '#E4F3E7', red: '#D54B40', star: '#FFF6D8', phone: '#2E2E33', ui: '#8E8A84',
};
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

// ---------- canvases + coloured-pencil hatch ----------
const out = createCanvas(W, H), octx = out.getContext('2d');
const PAT = new Map();
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
  const p = octx.createPattern(c, 'repeat'); PAT.set(col, p); return p;
}
const tmp = createCanvas(W, H), tctx = tmp.getContext('2d');

// ---------- line + shape primitives ----------
let CAMZ = 1;
function lw(ctx, k = 1) { const m = ctx.getTransform(); return k * 5.4 * Math.pow(CAMZ, 0.45) / Math.hypot(m.a, m.b); }
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
function star(ctx, x, y, s, fill = C.star) { // four-point sparkle
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

// ================= SHARMA JI =================
// Round bald shopkeeper: glasses, big nose, white moustache, mustard sweater vest over a blue shirt.
// Origin = neck base.
function sjHead(ctx, s) {
  const fx = s.fx * 14;
  for (const sx of [-1, 1]) {
    const ex = sx * 114 - s.fx * 6;
    SK(ctx, ell(ex, 10, 22, 27), C.sjSkin);
    line(ctx, arcP(ex - sx * 2, 10, 10, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  SK(ctx, sup(0, 0, 118, 114, 2.5, -0.06), C.sjSkin);
  line(ctx, arcP(-44, -58, 34, 3.55, 4.25, 10), { col: '#FFFFFF', lwk: 1.8 }); // dome shine
  for (const sx of [-1, 1]) { // grey tufts over the ears
    const p = [[-118, -40], [-104, -56], [-94, -40], [-98, -14], [-110, -4], [-122, -14]];
    HX(ctx, spl(sx > 0 ? mirror(p) : p), { fill: C.grey });
  }
  line(ctx, spl([[-8, -112], [-2, -132], [14, -134], [18, -122], [8, -118]], false), { lwk: 0.9 }); // the one proud hair
  for (const sx of [-1, 1]) blob(ctx, sx * 80 + fx, 36, 24, 14, C.blush);
  for (const sx of [-1, 1]) {
    const ex = sx * 44 + fx, ey = -8;
    if (s.eyes === 'happy') line(ctx, arcP(ex, ey + 6, 13, Math.PI + 0.35, Math.PI * 2 - 0.35, 12), { lwk: 1.25 });
    else if (s.eyes === 'blink') line(ctx, [[ex - 13, ey], [ex + 13, ey]], { lwk: 1.1 });
    else {
      const wide = s.eyes === 'wide', r = wide ? 19 : 15, pr = wide ? 4.8 : 8;
      shape(ctx, ell(ex, ey, r, r), { fill: C.white });
      const px = ex + s.look[0] * (wide ? 2 : 5), py = ey + s.look[1] * (wide ? 2 : 4);
      blob(ctx, px, py, pr, pr, INK); blob(ctx, px + pr * 0.35, py - pr * 0.4, pr * 0.32, pr * 0.32, '#FFFFFF');
    }
  }
  const gy = -8 + s.glassY;
  for (const sx of [-1, 1]) {
    const gx = sx * 44 + fx;
    shape(ctx, ell(gx, gy, 32, 31), { fill: 'rgba(255,255,255,0.14)', lwk: 0.85 });
    if (s.tick > 0) { ctx.save(); ctx.globalAlpha = s.tick; line(ctx, [[gx - 12, gy + 2], [gx - 4, gy + 10], [gx + 12, gy - 8]], { col: C.green, lwk: 1.1 }); ctx.restore(); }
    if (s.glint > 0) { ctx.save(); ctx.globalAlpha = s.glint; line(ctx, [[gx - 20, gy - 4], [gx - 8, gy - 18]], { col: '#FFFFFF', lwk: 1.5 }); ctx.restore(); }
    line(ctx, [[sx * 76 + fx, gy - 4], [sx * 108 - s.fx * 6, gy + 6]], { lwk: 0.8 });
  }
  line(ctx, arcP(fx, gy - 2, 12, Math.PI + 0.4, Math.PI * 2 - 0.4, 8), { lwk: 0.85 });
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 44 + fx, -58 - s.brow); ctx.rotate(-sx * 0.22 * s.worry + sx * 0.04);
    shape(ctx, rr(-24, -7, 48, 14, 7), { fill: C.brow, lwk: 0.8 }); ctx.restore();
  }
  const m = s.mouth;
  if (m === 'grin') {
    const p = spl([[-38, 70], [38, 70], [30, 94], [0, 108], [-30, 94]]).map(([x, y]) => [x + fx, y]);
    shape(ctx, p, { fill: C.mouth, stroke: false });
    ctx.save(); ctx.beginPath(); trace(ctx, p, true); ctx.clip(); blob(ctx, fx, 106, 20, 11, C.tongue); ctx.restore();
    shape(ctx, p);
  } else if (m === 'wavy') line(ctx, Array.from({ length: 13 }, (_, i) => [-26 + i * 52 / 12 + fx, 90 + 4 * Math.sin(i * 1.4)]), { lwk: 0.95 });
  else if (m === 'o') shape(ctx, ell(fx, 92, 11, 13), { fill: C.mouth });
  else line(ctx, arcP(fx, 62, 28, 0.45, Math.PI - 0.45, 14), { lwk: 1 });
  SK(ctx, ell(fx * 1.1, 26, 21, 18), C.sjSkin2);
  line(ctx, arcP(fx * 1.1 - 6, 20, 7, 3.6, 4.6, 6), { col: '#FFFFFF', lwk: 1.2 });
  const half = [[0, 46], [24, 42], [50, 46], [70, 56], [84, 50], [88, 40], [96, 46], [90, 62], [70, 74], [44, 72], [20, 68], [0, 72]];
  const st = half.concat(mirror(half).reverse().slice(1, -1)).map(([x, y]) => [x + fx, y]);
  shape(ctx, spl(st), { fill: C.stache, hatch: '#A9A197', ha: 0.35 });
  if (s.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(s.sweat * 4); const y = -62 + 34 * s.sweat;
    shape(ctx, spl([[106, y - 24], [118, y + 2], [106, y + 13], [94, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
function sjBody(ctx, s) {
  SK(ctx, rr(-32, -44, 64, 56, 12), C.sjSkin);
  ctx.save(); ctx.scale(1, 1 + 0.012 * s.breathe);
  HX(ctx, spl([[-96, -6], [0, -10], [96, -6], [148, 38], [158, 170], [168, 330], [-168, 330], [-158, 170], [-148, 38]]), { fill: C.vest });
  shape(ctx, [[-50, -8], [50, -8], [0, 88]], { fill: C.shirt, hatch: dk(C.shirt), ha: 0.4 });
  for (const sx of [-1, 1]) shape(ctx, [[sx * 52, -10], [sx * 6, 2], [sx * 30, 36]], { fill: C.shirt2 });
  line(ctx, [[-50, -8], [0, 88], [50, -8]], { lwk: 1 });
  for (let x = -140; x <= 140; x += 28) line(ctx, [[x, 250], [x, 322]], { col: dk(C.vest, 0.35), lwk: 0.55 }); // ribbed hem
  ctx.restore();
  ctx.save(); ctx.translate(0, -20 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -112); sjHead(ctx, s); ctx.restore();
}
function sjArms(ctx, s) {
  for (const [i, sx] of [[0, -1], [1, 1]]) {
    const a = armPose(ctx, [sx * 124, 46], s.hands[i], 146, 140, sx, 62, C.shirt, C.shirt2);
    hand(ctx, a, 30, C.sjSkin, s.handMode[i]);
  }
}
function sjClasp(ctx, s, rub) { // both hands together in front, rubbing
  for (const [i, sx] of [[0, -1], [1, 1]]) armPose(ctx, [sx * 124, 46], [sx * 30, 292 + (i ? -rub : rub)], 146, 140, sx, 62, C.shirt, C.shirt2);
  SK(ctx, ell(-20, 300 + rub, 32, 29), C.sjSkin);
  SK(ctx, ell(20, 296 - rub, 32, 29), C.sjSkin);
  line(ctx, arcP(20, 296 - rub, 18, 2.2, 3.4, 6), { lwk: 0.6 });
}

// ================= THE CUSTOMER =================
// Lanky young man: long face, narrow chin, cap, sly half-lidded eyes, teal hoodie, jeans, white sneakers.
function cuHead(ctx, c) {
  const fx = c.fx * 12;
  for (const sx of [-1, 1]) {
    const ex = sx * 97 - c.fx * 5;
    SK(ctx, ell(ex, 14, 19, 24), C.cSkin);
    line(ctx, arcP(ex - sx * 2, 14, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  SK(ctx, sup(0, 0, 100, 120, 2.4, 0.16), C.cSkin);
  for (const sx of [-1, 1]) shape(ctx, rr(sx * 92 - 8, -56, 16, 44, 6), { fill: C.hair, lwk: 0.8 });
  const r = rng(77); ctx.fillStyle = 'rgba(59,42,34,0.35)'; // stubble on the chin
  for (let i = 0; i < 26; i++) { const a = 0.5 + r() * 2.14, d = 0.78 + r() * 0.16; ctx.beginPath(); ctx.arc(fx * 0.5 + Math.cos(a) * 80 * d, 30 + Math.sin(a) * 82 * d, 2.1, 0, 7); ctx.fill(); }
  const dome = arcP(0, -56, 106, Math.PI, Math.PI * 2, 30).map(([x, y]) => [x, -56 + (y + 56) * 0.8]);
  HX(ctx, dome.concat([[106, -56], [-106, -56]]), { fill: C.cap });
  line(ctx, spl([[fx * 0.4, -140], [fx * 0.6, -100], [fx * 0.7, -62]], false), { lwk: 0.6, col: '#5B6887' });
  shape(ctx, ell(0, -140, 9, 6), { fill: C.cap2, lwk: 0.8 });
  ctx.save(); ctx.translate(fx * 0.9, -56); ctx.rotate(-0.07);
  HX(ctx, spl([[-114, -2], [0, -12], [114, -2], [118, 12], [0, 22], [-118, 12]]), { fill: C.cap2 }); ctx.restore();
  for (const sx of [-1, 1]) blob(ctx, sx * 60 + fx, 48, 20, 11, C.blush, 0.8);
  for (const sx of [-1, 1]) { // heavy upper lid = sly
    const ex = sx * 38 + fx, ey = 8;
    if (c.eyes === 'blink') { line(ctx, [[ex - 13, ey + 2], [ex + 13, ey + 2]], { lwk: 1.1 }); continue; }
    if (c.eyes === 'happy') { line(ctx, arcP(ex, ey + 8, 13, Math.PI + 0.35, Math.PI * 2 - 0.35, 12), { lwk: 1.25 }); continue; }
    const R = 16, eye = ell(ex, ey, R, R);
    shape(ctx, eye, { fill: C.white, stroke: false });
    const px = ex + c.look[0] * 6, py = ey + 3 + c.look[1] * 3;
    blob(ctx, px, py, 8, 8, INK); blob(ctx, px + 2.8, py - 3, 2.6, 2.6, '#FFFFFF');
    const lid = ey - 2 + sx * 2 * c.lidTilt;
    ctx.save(); ctx.beginPath(); trace(ctx, eye, true); ctx.clip(); ctx.fillStyle = C.cSkin; ctx.fillRect(ex - 20, ey - 22, 40, lid - (ey - 22)); ctx.restore();
    shape(ctx, eye, { lwk: 0.9 });
    line(ctx, [[ex - R - 2, lid - sx * 1], [ex + R + 2, lid + sx * 1]], { lwk: 1.2 });
  }
  ctx.save(); ctx.translate(-38 + fx, -20 + c.browL); ctx.rotate(0.1); shape(ctx, rr(-22, -5, 44, 10, 5), { fill: C.hair, lwk: 0.7 }); ctx.restore();
  ctx.save(); ctx.translate(38 + fx, -28 - c.browR); ctx.rotate(-0.16); shape(ctx, rr(-22, -5, 44, 10, 5), { fill: C.hair, lwk: 0.7 }); ctx.restore();
  line(ctx, spl([[6 + fx, 28], [-4 + fx, 42], [4 + fx, 52], [14 + fx, 48]], false), { lwk: 0.95 }); // nose
  if (c.mouth === 'grin') {
    const p = spl([[-30, 74], [36, 64], [28, 88], [2, 98], [-22, 90]]).map(([x, y]) => [x + fx, y]);
    shape(ctx, p, { fill: C.mouth, stroke: false });
    ctx.save(); ctx.beginPath(); trace(ctx, p, true); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-40 + fx, 60, 80, 14); ctx.restore();
    shape(ctx, p);
  } else {
    line(ctx, spl([[-24, 76], [-4, 82], [20, 76], [30, 64]], false).map(([x, y]) => [x + fx, y]), { lwk: 1 });
    line(ctx, [[27 + fx, 58], [33 + fx, 68]], { lwk: 0.7 });
  }
}
function cuBody(ctx, c) {
  for (const [i, x0] of [[0, -66], [1, 14]]) { // legs + sneakers
    const lift = c.lift[i];
    HX(ctx, rr(x0, 290, 52, 272 - lift, 8), { fill: C.jeans });
    const sx = x0 + 26 + (i ? 10 : -10), sy = 562 - lift;
    shape(ctx, spl([[sx - 42, sy + 10], [sx - 34, sy - 14], [sx + 20, sy - 16], [sx + 44, sy + 2], [sx + 40, sy + 18], [sx - 38, sy + 20]]), { fill: C.shoe });
    line(ctx, [[sx - 38, sy + 12], [sx + 40, sy + 10]], { col: C.red, lwk: 0.9 });
  }
  HX(ctx, ell(0, 4, 80, 30), { fill: C.hood2 }); // hood bunched round the neck
  SK(ctx, rr(-24, -40, 48, 50, 10), C.cSkin);
  HX(ctx, spl([[-82, -4], [0, -8], [82, -4], [114, 24], [122, 130], [118, 300], [-118, 300], [-122, 130], [-114, 24]]), { fill: C.hood });
  HX(ctx, rr(-118, 280, 236, 28, 8), { fill: C.hood2 });
  for (const sx of [-1, 1]) { line(ctx, [[sx * 20, 12], [sx * 24, 96]], { lwk: 0.7 }); shape(ctx, ell(sx * 24, 102, 5, 8), { fill: C.white, lwk: 0.6 }); }
  const pocket = () => HX(ctx, [[-80, 196], [80, 196], [98, 280], [-98, 280]], { fill: C.hood });
  if (!c.pocketed) pocket();
  ctx.save(); ctx.translate(0, -18 + c.nod); ctx.rotate(c.tilt); ctx.translate(0, -118); cuHead(ctx, c); ctx.restore();
  // arms: [0] = his right (screen left), [1] = his left (screen right)
  for (const [i, sx] of [[0, -1], [1, 1]]) {
    const a = armPose(ctx, [sx * 100, 42], c.hands[i], 124, 118, sx, 54, C.hood, C.hood2);
    const hold = c.hold[i];
    if (hold === 'pocket') continue;
    if (hold && hold.draw) hold.draw(ctx, a);
    hand(ctx, a, 27, C.cSkin);
  }
  if (c.pocketed) pocket();
}

// ================= PROPS + SET =================
const CTOP = 1170, SJ = { x: 760, y: 870, sc: 0.9 }, CU = { x: 300, y: 958, sc: 0.95 }, BW = 124, BH = 92;
function drawBox(ctx, cx, bottom) { // earbuds box at world size
  const x = cx - BW / 2, y = bottom - BH;
  shape(ctx, rr(x, y, BW, BH, 8), { fill: C.box, hatch: '#AFC0CB', ha: 0.35 });
  shape(ctx, rr(x, y + BH - 22, BW, 22, 6), { fill: '#9CC6C9', hatch: dk('#9CC6C9'), ha: 0.4 });
  for (const ox of [-18, 18]) { shape(ctx, ell(cx + ox, y + 34, 11, 14), { fill: C.white, lwk: 0.7 }); line(ctx, [[cx + ox, y + 48], [cx + ox, y + 60]], { lwk: 0.9 }); }
  ctx.save(); ctx.translate(x + 30, y + 2); ctx.rotate(-0.12);
  shape(ctx, rr(-34, -16, 72, 30, 8), { fill: C.tag, hatch: dk(C.tag), ha: 0.3, lwk: 0.8 });
  text(ctx, '\u20B98,000', 2, 0, 21, INK); ctx.restore();
}
function drawPhoneSmall(ctx, cx, cy, rot) { // held up, screen to camera
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  shape(ctx, rr(-38, -70, 76, 140, 12), { fill: C.phone });
  ctx.fillStyle = C.greenLt; ctx.fillRect(-30, -60, 60, 120);
  shape(ctx, ell(0, -14, 18, 18), { fill: C.green, lwk: 0.6 });
  line(ctx, [[-8, -14], [-2, -7], [9, -21]], { col: '#FFFFFF', lwk: 1 });
  ctx.fillStyle = '#9FCDA9'; ctx.fillRect(-20, 16, 40, 6); ctx.fillRect(-14, 28, 28, 5);
  ctx.restore();
}
function drawSet(ctx) {
  const WL = { lwk: 0.8 };
  shape(ctx, [[-700, -500], [1800, -500], [1800, 1480], [-700, 1480]], { fill: C.wall, hatch: '#D6C4A4', ha: 0.35, stroke: false });
  shape(ctx, [[-700, 1010], [1800, 1010], [1800, 1480], [-700, 1480]], { fill: C.tile, hatch: '#D8CDBA', ha: 0.25, stroke: false });
  ctx.strokeStyle = C.tileLn; ctx.lineWidth = 2.4;
  for (let x = -700; x < 1800; x += 70) { ctx.beginPath(); ctx.moveTo(x, 1010); ctx.lineTo(x, 1480); ctx.stroke(); }
  for (let y = 1010; y < 1480; y += 70) { ctx.beginPath(); ctx.moveTo(-700, y); ctx.lineTo(1800, y); ctx.stroke(); }
  line(ctx, [[-700, 1010], [1800, 1010]], WL);
  shape(ctx, [[-700, 1480], [1800, 1480], [1800, 2600], [-700, 2600]], { fill: C.floor, hatch: '#B99E78', ha: 0.4 });
  for (let x = -600; x < 1800; x += 180) line(ctx, [[x, 1480], [x - 140, 2600]], { col: '#B59872', lwk: 0.6 });
  for (const x of [330, 750]) line(ctx, [[x, 40], [x, 110]], WL);
  HX(ctx, rr(240, 110, 600, 160, 24), { fill: C.sign });
  text(ctx, 'SHARMA', 540, 174, 78, C.signTx); text(ctx, 'ELECTRONICS', 540, 232, 38, C.signTx);
  shape(ctx, rr(40, 420, 300, 400, 10), { fill: C.white, lwk: 1 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(58, 438, 264, 364, 4), true); ctx.clip();
  const g = ctx.createLinearGradient(0, 438, 0, 802); g.addColorStop(0, C.sky); g.addColorStop(1, C.sky2); ctx.fillStyle = g; ctx.fillRect(40, 420, 300, 400);
  for (const [bx, bw, bh] of [[60, 70, 190], [140, 54, 260], [204, 70, 170], [284, 50, 220]]) {
    shape(ctx, rr(bx, 802 - bh, bw, bh + 20, 3), { fill: C.bld, hatch: dk(C.bld), ha: 0.3, lwk: 0.6 });
    for (let wy = 802 - bh + 18; wy < 790; wy += 34) for (let wx = bx + 12; wx < bx + bw - 14; wx += 22) { ctx.fillStyle = C.win; ctx.fillRect(wx, wy, 11, 14); }
  }
  ctx.restore();
  shape(ctx, rr(58, 438, 264, 364, 4), { lwk: 0.9 }); line(ctx, [[190, 438], [190, 802]], { lwk: 0.9 });
  shape(ctx, rr(24, 816, 332, 26, 8), { fill: C.white, lwk: 0.9 });
  shape(ctx, ell(560, 470, 58, 58), { fill: C.white, lwk: 1 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, [[560 + Math.cos(a) * 44, 470 + Math.sin(a) * 44], [560 + Math.cos(a) * 50, 470 + Math.sin(a) * 50]], { lwk: 0.5 }); }
  line(ctx, [[560, 470], [560, 436]], { lwk: 0.9 }); line(ctx, [[560, 470], [586, 486]], { lwk: 0.9 });
  for (const [y, items] of [[640, [[680, 80, 96, '#F3C9B8'], [772, 64, 70, '#BFD8E6'], [848, 104, 84, '#F5E1A6'], [964, 76, 104, '#C9E0C3']]],
    [880, [[690, 104, 70, '#BFD8E6'], [806, 60, 100, '#F3C9B8'], [878, 90, 76, '#C9E0C3'], [980, 76, 90, '#F5E1A6']]]]) {
    for (const [x, w, h, col] of items) { shape(ctx, rr(x, y - h, w, h, 6), { fill: col, hatch: dk(col), ha: 0.35, lwk: 0.8 }); line(ctx, [[x + 14, y - h + 22], [x + w - 14, y - h + 22]], { col: dk(col, 0.4), lwk: 0.5 }); }
    HX(ctx, rr(650, y, 470, 22, 5), { fill: C.shelf, lwk: 0.8 });
  }
  shape(ctx, rr(270, 770, 48, 46, 8), { fill: C.sign, hatch: dk(C.sign), ha: 0.4, lwk: 0.8 }); // plant on the sill
  for (const [a, l] of [[-2.1, 58], [-1.57, 70], [-1.05, 58]]) {
    const b = [294, 770], tip = [b[0] + Math.cos(a) * l, b[1] + Math.sin(a) * l], m = lerp2(b, tip, 0.5);
    shape(ctx, spl([b, [m[0] + 12, m[1]], tip, [m[0] - 12, m[1]]]), { fill: '#8FB783', hatch: dk('#8FB783'), ha: 0.4, lwk: 0.7 });
  }
}
function drawCounter(ctx) {
  HX(ctx, [[400, CTOP + 20], [1400, CTOP + 20], [1400, 1480], [400, 1480]], { fill: C.wood });
  for (const y of [1270, 1370]) line(ctx, spl([[400, y], [700, y + 4], [1000, y - 3], [1400, y + 2]], false), { col: C.woodLn, lwk: 0.6 });
  HX(ctx, rr(384, CTOP - 4, 1030, 30, 8), { fill: C.woodTop });
  // UPI QR stand — the thing that should have been used
  shape(ctx, [[1000, CTOP - 4], [1010, CTOP - 112], [1082, CTOP - 112], [1092, CTOP - 4]], { fill: C.white, lwk: 0.9 });
  const r = rng(11); ctx.fillStyle = INK;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (r() > 0.45 || (i < 2 && j < 2)) ctx.fillRect(1022 + i * 8, CTOP - 100 + j * 8, 7, 7);
  text(ctx, 'UPI', 1046, CTOP - 30, 22, C.green);
}

// ================= ACTING =================
const BOX0 = 716, BOX1 = 566; // box slides from Sharma to the customer
const boxX = t => lerp(BOX0, BOX1, seg(t, 4.22, 4.6, E.io));
const toSJ = (wx, wy) => [(wx - SJ.x) / SJ.sc, (wy - SJ.y) / SJ.sc];
const toCU = (wx, wy) => [(wx - CU.x) / CU.sc, (wy - CU.y) / CU.sc];
const REST = [[-150, 316], [150, 316]];
function sjState(t, idle) {
  const s = { fx: -0.4, look: [-1, 0.2], eyes: 'open', mouth: 'smile', brow: 0, worry: 0, glassY: 0, glint: 0, tick: 0, sweat: 0,
    nod: 0, tilt: 0, breathe: Math.sin(idle * 2.2), hands: REST.map(p => p.slice()), handMode: ['flat', 'flat'], clasp: false, rub: 0 };
  if ((idle % 3.4) > 3.28) s.eyes = 'blink';
  if (t < 3.5) { // S2: the Ting — he glances at the screen and beams
    s.look = [-1, 0.8]; s.fx = -0.3;
    s.glint = pulse(t, 2.44, 0.45); s.tick = clamp((t - 2.46) / 0.15) * (1 - seg(t, 3.1, 3.4));
    if (t > 2.66) { s.mouth = 'grin'; s.look = [-0.8, 0.3]; }
    s.brow = 8 * pulse(t, 2.6, 0.5);
    s.nod = 10 * pulse(t, 2.86, 0.4);
  } else s.mouth = 'grin';
  if (t > 4.08 && t < 4.95) { // S3: slides the box across with both hands
    const bx = boxX(t), on = seg(t, 4.08, 4.22, E.io) * (1 - seg(t, 4.62, 4.8, E.io));
    const L = toSJ(bx - BW / 2 - 24, CTOP - 40), R = toSJ(bx + BW / 2 + 24, CTOP - 40);
    s.hands = [lerp2(REST[0], L, on), lerp2(REST[1], R, on)];
    if (on > 0.35) s.handMode = ['round', 'round'];
    s.look = [-1, 0.6];
  }
  s.nod += 6 * pulse(t, 4.62, 0.36);
  if (t > 5.9 && t < 7.3) { // S4: rubs his hands together, eyes shut with happiness
    s.clasp = true; s.rub = 6 * Math.sin((t - 5.9) * 16) * seg(t, 5.9, 6.1);
    s.eyes = 'happy'; s.fx = -0.15; s.nod = 7 * Math.abs(Math.sin((t - 5.9) * 5)); s.tilt = 0.03 * Math.sin((t - 5.9) * 3);
  }
  if (t > 7.3) { // S5: realisation
    s.clasp = true; s.rub = 0; s.fx = 0; s.look = [0, 0];
    s.eyes = t < 7.36 ? 'blink' : 'wide'; s.mouth = t < 7.36 ? 'smile' : 'wavy';
    const k = seg(t, 7.36, 7.5); s.brow = 12 * k; s.worry = k; s.glassY = 8 * seg(t, 7.45, 7.7); s.sweat = seg(t, 7.5, 8.1, x => x);
    s.nod = -8 * pulse(t, 7.36, 0.16);
  }
  return s;
}
const HOLD_PHONE = rot => ({ draw: (ctx, a) => { const c = [a.w[0] + Math.cos(a.dir) * 13, a.w[1] + Math.sin(a.dir) * 13]; drawPhoneSmall(ctx, c[0] + 4, c[1] - 58, rot); } });
function cuState(t, idle) {
  const c = { x: CU.x, fx: 0.45, look: [1, -0.2], eyes: 'sly', mouth: 'smirk', lidTilt: 1, browL: 0, browR: 4, nod: 0, tilt: 0.02 * Math.sin(idle * 1.5),
    lift: [0, 0], hands: [[-150, -40], [128, 264]], hold: [HOLD_PHONE(-0.1), null], pocketed: false };
  if ((idle % 3.9) > 3.8) c.eyes = 'blink';
  const dn = seg(t, 3.9, 4.28, E.io); // phone goes into the hoodie pocket
  if (dn > 0) {
    c.hands[0] = lerp2([-150, -40], [-44, 236], dn);
    c.hold[0] = dn < 0.82 ? HOLD_PHONE(lerp(-0.1, 0.4, dn)) : 'pocket';
    c.pocketed = dn >= 0.82;
  }
  const reach = seg(t, 4.58, 4.86, E.io), lift = seg(t, 4.96, 5.36, E.io); // grabs the box, lifts it to his chest
  const grip = toCU(BOX1 - BW / 2 - 12, CTOP - 46), chest = [96, 214];
  if (reach > 0) c.hands[1] = lerp2([128, 264], grip, reach);
  if (lift > 0) c.hands[1] = lerp2(grip, chest, lift);
  if (t > 4.86) {
    const off = lerp2([(BW / 2 + 12) / CU.sc, (46 - BH / 2) / CU.sc], [-64 / CU.sc, -30 / CU.sc], lift);
    c.hold[1] = { draw: (ctx, a) => { const hc = [a.w[0] + Math.cos(a.dir) * 13, a.w[1] + Math.sin(a.dir) * 13]; ctx.save(); ctx.translate(hc[0] + off[0], hc[1] + off[1]); ctx.scale(1 / CU.sc, 1 / CU.sc); drawBox(ctx, 0, BH / 2); ctx.restore(); } };
  }
  if (t > 4.9) { c.mouth = 'grin'; c.browR = 10; }
  c.look = t > 4.5 && t < 5.0 ? [1, 0.6] : [1, -0.2];
  if (t > 5.96) { // S4: shuffles out with the box, grinning back at Sharma ji
    const k = t - 5.96, ph = k * 13;
    c.x = CU.x - 440 * k; c.lift = [Math.max(0, Math.sin(ph)) * 26, Math.max(0, Math.sin(ph + Math.PI)) * 26];
    c.nod = -8 * Math.abs(Math.sin(ph)); c.tilt = 0.035 * Math.sin(ph); c.eyes = 'sly';
    c.hands[0] = [-44, 236]; c.hold[0] = 'pocket'; c.pocketed = true;
  }
  return c;
}
const custHasBox = t => t > 4.86;

function drawWorld(ctx, t, idle) {
  drawSet(ctx);
  const s = sjState(t, idle);
  ctx.save(); ctx.translate(SJ.x, SJ.y); ctx.scale(SJ.sc, SJ.sc); sjBody(ctx, s); ctx.restore();
  drawCounter(ctx);
  if (!custHasBox(t)) drawBox(ctx, boxX(t), CTOP - 4);
  ctx.save(); ctx.translate(SJ.x, SJ.y); ctx.scale(SJ.sc, SJ.sc); if (s.clasp) sjClasp(ctx, s, s.rub); else sjArms(ctx, s); ctx.restore();
  const c = cuState(t, idle);
  if (c.x > -320) { ctx.save(); ctx.translate(c.x, CU.y); ctx.scale(CU.sc, CU.sc); cuBody(ctx, c); ctx.restore(); }
}

// ================= SHOT 1: the phone, held out in both hands =================
function phoneScreen(ctx, t) {
  const k1 = seg(t, 0.05, 0.4, E.o), k2 = seg(t, 0.45, 0.8, E.o);
  text(ctx, '9:41', -196, -498, 28, INK, 'left', 700);
  ctx.fillStyle = INK; for (let i = 0; i < 3; i++) ctx.fillRect(160 + i * 14, -490 - i * 6, 9, 12 + i * 6);
  const pop = clamp((t - 1.44) / 0.28);
  ctx.save(); ctx.translate(0, -270);
  if (pop <= 0) { ctx.rotate(t * 7); ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 1.4); ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = '#DAD5CE'; ctx.stroke(); }
  else {
    const sc = E.back(pop); ctx.scale(sc, sc);
    shape(ctx, ell(0, 0, 116, 116, 60), { fill: C.green, hatch: dk(C.green, 0.2), ha: 0.3 });
    const d = seg(t, 1.66, 2.0, x => x), P = [[-50, 4], [-14, 40], [56, -36]], L1 = Math.hypot(36, 36), L2 = Math.hypot(70, 76), Ld = (L1 + L2) * d;
    if (d > 0) {
      ctx.beginPath(); ctx.moveTo(...P[0]);
      if (Ld <= L1) ctx.lineTo(P[0][0] + 36 * Ld / L1, P[0][1] + 36 * Ld / L1);
      else { ctx.lineTo(...P[1]); const q = (Ld - L1) / L2; ctx.lineTo(P[1][0] + 70 * q, P[1][1] - 76 * q); }
      ctx.lineWidth = 24; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = k1; text(ctx, 'Payment Successful', 0, -90 + 30 * (1 - k1), 50, INK);
  ctx.globalAlpha = k2; text(ctx, '\u20B98,000', 0, 20 + 30 * (1 - k2), 116, INK);
  text(ctx, 'Paid to Sharma Electronics', 0, 118, 32, C.ui, 'center', 600);
  ctx.fillStyle = '#E4E0DA'; ctx.fillRect(-200, 176, 400, 3);
  text(ctx, 'UPI Ref No. 4021 8847 1190', 0, 226, 28, C.ui, 'center', 500);
  text(ctx, '26 Sep, 7:42 PM', 0, 268, 28, C.ui, 'center', 500);
  ctx.globalAlpha = 1;
}
function shotPhone(ctx, t) {
  shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: C.wall, hatch: '#D6C4A4', ha: 0.35, stroke: false });
  for (let i = 0; i < 7; i++) { ctx.save(); ctx.globalAlpha = 0.5; shape(ctx, ell(540, 900, 380 + i * 110, 380 + i * 110, 90), { col: '#D9C9AC', lwk: 0.5 }); ctx.restore(); }
  const z = 1 + 0.04 * seg(t, 0, 2.42, x => x);
  ctx.save(); ctx.translate(540, 860); ctx.scale(z, z); ctx.rotate(-0.025 + 0.01 * Math.sin(t * 1.4));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, C.hood, C.hood2); // sleeves up from the bottom corners
  const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, C.hood, C.hood2);
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-252, -532, 504, 1064, 42), true); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.clip(); phoneScreen(ctx, t); ctx.restore();
  shape(ctx, rr(-252, -532, 504, 1064, 42), { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  hand(ctx, aL, 86, C.cSkin); hand(ctx, aR, 86, C.cSkin);
  ctx.restore();
}

// ================= EDIT =================
const CUTS = { B: 2.42, C: 3.5, D: 5.9, E: 7.04, RW: 8.0, LAND: 8.8 };
const WIDE = { z: 1.08, cx: 560, cy: 985 };
function cam(t) {
  if (t < CUTS.C) { const k = seg(t, CUTS.B, CUTS.C, x => x); return { z: 2.2 + 0.12 * k, cx: 760, cy: 820, wt: t }; }
  if (t < CUTS.D) { const k = seg(t, CUTS.C, CUTS.D, x => x); return { z: 1.22 + 0.06 * k, cx: 540, cy: 1080, wt: t }; }
  if (t < CUTS.E) return { ...WIDE, z: 1.0 + 0.02 * seg(t, CUTS.D, CUTS.E, x => x), wt: t };
  if (t < CUTS.RW) { const k = seg(t, CUTS.E, CUTS.RW, x => x); return { z: 2.25 + 0.2 * k, cx: 760, cy: 820, wt: t }; }
  if (t < CUTS.LAND) { const k = (t - CUTS.RW) / (CUTS.LAND - CUTS.RW); return { ...WIDE, wt: lerp(7.0, 3.5, E.s(k)), rew: 1 }; }
  return { ...WIDE, z: 1.0 + 0.04 * seg(t, CUTS.LAND, DUR, x => x), wt: 3.5 };
}
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (t < CUTS.B) { CAMZ = 1; shotPhone(ctx, t); return; }
  const cm = cam(t); CAMZ = cm.z;
  const jolt = t > 7.36 && t < 7.6 ? 6 * Math.sin((t - 7.36) * 90) * (1 - (t - 7.36) / 0.24) : 0;
  ctx.save(); ctx.translate(W / 2 + jolt, H / 2); ctx.scale(cm.z, cm.z); ctx.translate(-cm.cx, -cm.cy);
  drawWorld(ctx, cm.wt, t);
  const hx = SJ.x, hy = SJ.y - 130 * SJ.sc; // Sharma ji's head, world space
  if (t >= CUTS.B && t < CUTS.C) { // sparkles on the Ting
    const tg = t - CUTS.B;
    for (const [dx, dy, s0, d] of [[-150, -110, 1.1, 0], [150, -130, 0.9, 0.06], [170, 40, 1.2, 0.1], [-170, 50, 0.8, 0.14]]) star(ctx, hx + dx, hy + dy, s0 * E.back(clamp((tg - d) / 0.3)) * (1 - seg(tg, 0.7, 1.0)));
  }
  if (t > 7.36 && t < CUTS.RW) { // alarm rings on the realisation
    for (let i = 0; i < 3; i++) { const k = ((t - 7.36) * 1.6 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * 0.8; shape(ctx, ell(hx, hy, 150 + 90 * k, 150 + 90 * k, 80), { col: '#7C93B8', lwk: 0.6 }); ctx.restore(); }
  }
  ctx.restore();
  CAMZ = 1;
  if (cm.rew) {
    ctx.fillStyle = 'rgba(150,185,215,0.16)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const y = (t * 2600 + i * 530) % 2000 - 40; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, y, W, 10 + 6 * (i % 2)); }
    for (const dx of [0, 58]) shape(ctx, [[150 + dx, 110], [96 + dx, 150], [150 + dx, 190]], { fill: '#FFFFFF' });
  }
  if (t >= CUTS.LAND) {
    const k = E.back(clamp((t - 8.85) / 0.3));
    ctx.save(); ctx.translate(760, 1340); ctx.scale(0.9 * k, 0.9 * k);
    shape(ctx, rr(-210, -46, 420, 92, 46), { fill: '#FFFFFF' });
    blob(ctx, -160, 0, 15, 15, (Math.floor(t * 2.5) % 2) ? C.red : '#F2A49E');
    text(ctx, 'RECREATION', 20, 4, 50, INK);
    ctx.restore();
  }
}

// ================= CAPTIONS =================
const CAPS = [
  [0.02, 1.4, 'Payment Successful'], [1.44, 2.38, 'Hara tick.'], [2.42, 3.44, 'Ting!'],
  [3.5, 4.22, 'Aur dukaan se'], [4.24, 5.88, '\u20B98,000 ke earbuds'], [5.9, 7.02, 'chale gaye...'], [7.04, 8.0, 'muft mein.'],
  [8.8, 9.4, 'Ek recreation'], [9.4, 10.1, 'dekhiye.'],
];
function captions(ctx, t) {
  for (const [a, b, s] of CAPS) if (t >= a && t < b) {
    const k = E.back(clamp((t - a) / 0.14));
    ctx.save(); ctx.translate(540, 1640); ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);
    ctx.font = '800 74px Baloo'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(43,37,34,0.3)'; ctx.strokeText(s, 0, 7);
    ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText(s, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(s, 0, 0);
    ctx.restore();
  }
}
function renderFrame(f) {
  const t = f / FPS;
  renderScene(tctx, t);
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.drawImage(tmp, 0, 0);
  captions(octx, t);
}
function modelSheet() { // characters large with key expressions, for design review
  const c = createCanvas(2160, 1560), x = c.getContext('2d');
  x.fillStyle = C.wall; x.fillRect(0, 0, 2160, 1560); CAMZ = 1;
  const base = sjState(3.6, 0.5);
  x.save(); x.translate(300, 380); sjBody(x, base); sjArms(x, base); x.restore();
  [{ mouth: 'smile', fx: 0, look: [0, 0] }, { eyes: 'happy', mouth: 'grin', fx: 0 }, { eyes: 'wide', mouth: 'wavy', worry: 1, brow: 12, glassY: 8, sweat: 0.4, fx: 0, look: [0, 0] }]
    .forEach((o, i) => { x.save(); x.translate(820 + i * 470, 260); sjHead(x, { ...base, ...o }); x.restore(); });
  const cb = cuState(3.6, 0.5);
  x.save(); x.translate(300, 1010); x.scale(0.7, 0.7); cuBody(x, cb); x.restore();
  [{ fx: 0, look: [0, 0] }, { mouth: 'grin' }, { eyes: 'happy', mouth: 'grin', fx: 0 }]
    .forEach((o, i) => { x.save(); x.translate(820 + i * 470, 1180); cuHead(x, { ...cb, ...o }); x.restore(); });
  fs.writeFileSync(__dirname + '/out_doll/sheet.png', c.toBuffer('image/png'));
}

const arg = process.argv[2] || 'all';
if (arg === 'all') {
  (async () => {
    for (let f = 0; f < NF; f++) {
      renderFrame(f);
      const buf = Buffer.from(octx.getImageData(0, 0, W, H).data.buffer);
      if (!process.stdout.write(buf)) await new Promise(r => process.stdout.once('drain', r));
    }
  })();
} else {
  fs.mkdirSync(__dirname + '/out_doll', { recursive: true });
  if (arg === 'sheet') modelSheet();
  else for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(`${__dirname}/out_doll/f${String(f).padStart(3, '0')}.png`, out.toBuffer('image/png')); }
}
