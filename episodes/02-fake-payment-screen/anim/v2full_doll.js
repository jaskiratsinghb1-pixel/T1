// Video 2 full episode (54 s) — "paper doll" storybook characters. Opening (0-10.2 s) = approved v2open_doll.js.
// Construction rules (keep consistent across episodes):
//  * front-facing, symmetric characters; head turns are a feature shift (fx), never a redraw
//  * one uniform ink line, no boil; flat fills + coloured-pencil hatch on clothes
//  * arms = thick sleeve tubes with one soft elbow (2-bone IK), hands = small skin rounds
//  * held props sit between the sleeve and the hand, so the hand always reads as gripping
//  * acting = expression swaps, nods/tilts and a few whole-arm poses with eased moves
// Usage: node v2full_doll.js all | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node v2full_doll.js 12,40,90 -> PNG stills in out_full/
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
GlobalFonts.registerFromPath(__dirname + '/fonts/Baloo2.ttf', 'Baloo');

const W = 1080, H = 1920, FPS = 30, DUR = 54, NF = DUR * FPS;
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
let CAMZ = 1, HIDE_SIGN = false;
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
  else if (m === 'flat') line(ctx, [[-22 + fx, 90], [22 + fx, 90]], { lwk: 1 });
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
  const fx = c.fx * 12, P = { ...C, ...(c.pal || {}) };
  for (const sx of [-1, 1]) {
    const ex = sx * 97 - c.fx * 5;
    SK(ctx, ell(ex, 14, 19, 24), P.cSkin);
    line(ctx, arcP(ex - sx * 2, 14, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  SK(ctx, sup(0, 0, 100, 120, 2.4, 0.16), P.cSkin);
  for (const sx of [-1, 1]) shape(ctx, rr(sx * 92 - 8, -56, 16, 44, 6), { fill: P.hair, lwk: 0.8 });
  if (c.stubble !== false) { const r = rng(77); ctx.fillStyle = 'rgba(59,42,34,0.35)'; // stubble on the chin
  for (let i = 0; i < 26; i++) { const a = 0.5 + r() * 2.14, d = 0.78 + r() * 0.16; ctx.beginPath(); ctx.arc(fx * 0.5 + Math.cos(a) * 80 * d, 30 + Math.sin(a) * 82 * d, 2.1, 0, 7); ctx.fill(); } }
  if (c.cap !== false) {
  const dome = arcP(0, -56, 106, Math.PI, Math.PI * 2, 30).map(([x, y]) => [x, -56 + (y + 56) * 0.8]);
  HX(ctx, dome.concat([[106, -56], [-106, -56]]), { fill: P.cap });
  line(ctx, spl([[fx * 0.4, -140], [fx * 0.6, -100], [fx * 0.7, -62]], false), { lwk: 0.6, col: '#5B6887' });
  shape(ctx, ell(0, -140, 9, 6), { fill: P.cap2, lwk: 0.8 });
  ctx.save(); ctx.translate(fx * 0.9, -56); ctx.rotate(-0.07);
  HX(ctx, spl([[-114, -2], [0, -12], [114, -2], [118, 12], [0, 22], [-118, 12]]), { fill: P.cap2 }); ctx.restore();
  } else {
    const top = arcP(0, -34, 104, Math.PI, Math.PI * 2, 30).map(([x, y]) => [x, -34 + (y + 34) * 0.95]);
    HX(ctx, top.concat([[102, -20], [70, -44], [34, -34], [0, -48], [-34, -36], [-70, -46], [-102, -20]]), { fill: P.hair });
  }
  for (const sx of [-1, 1]) blob(ctx, sx * 60 + fx, 48, 20, 11, C.blush, 0.8);
  for (const sx of [-1, 1]) { // sly = heavy upper lid; open; wide = shocked
    const ex = sx * 38 + fx, ey = 8;
    if (c.eyes === 'blink') { line(ctx, [[ex - 13, ey + 2], [ex + 13, ey + 2]], { lwk: 1.1 }); continue; }
    if (c.eyes === 'happy') { line(ctx, arcP(ex, ey + 8, 13, Math.PI + 0.35, Math.PI * 2 - 0.35, 12), { lwk: 1.25 }); continue; }
    const wide = c.eyes === 'wide', sly = c.eyes === 'sly', R = wide ? 19 : 16, pr = wide ? 5 : 8, eye = ell(ex, ey, R, R);
    shape(ctx, eye, { fill: C.white, stroke: false });
    const px = ex + c.look[0] * (wide ? 2 : 6), py = ey + (sly ? 3 : 0) + c.look[1] * 3;
    blob(ctx, px, py, pr, pr, INK); blob(ctx, px + pr * 0.35, py - pr * 0.4, pr * 0.33, pr * 0.33, '#FFFFFF');
    if (sly) {
      const lid = ey - 2 + sx * 2 * c.lidTilt;
      ctx.save(); ctx.beginPath(); trace(ctx, eye, true); ctx.clip(); ctx.fillStyle = P.cSkin; ctx.fillRect(ex - 20, ey - 22, 40, lid - (ey - 22)); ctx.restore();
      shape(ctx, eye, { lwk: 0.9 });
      line(ctx, [[ex - R - 2, lid - sx * 1], [ex + R + 2, lid + sx * 1]], { lwk: 1.2 });
    } else shape(ctx, eye, { lwk: 0.9 });
  }
  const bl = c.eyes === 'wide' ? -0.22 : c.eyes === 'sly' ? 0.1 : 0.03, br = c.eyes === 'wide' ? 0.22 : c.eyes === 'sly' ? -0.16 : -0.03;
  ctx.save(); ctx.translate(-38 + fx, -20 + c.browL); ctx.rotate(bl); shape(ctx, rr(-22, -5, 44, 10, 5), { fill: P.hair, lwk: 0.7 }); ctx.restore();
  ctx.save(); ctx.translate(38 + fx, -28 - c.browR); ctx.rotate(br); shape(ctx, rr(-22, -5, 44, 10, 5), { fill: P.hair, lwk: 0.7 }); ctx.restore();
  line(ctx, spl([[6 + fx, 28], [-4 + fx, 42], [4 + fx, 52], [14 + fx, 48]], false), { lwk: 0.95 }); // nose
  if (c.mouth === 'smile') line(ctx, arcP(fx, 50, 32, 0.5, Math.PI - 0.5, 14), { lwk: 1 });
  else if (c.mouth === 'flat') line(ctx, [[-20 + fx, 80], [20 + fx, 80]], { lwk: 1 });
  else if (c.mouth === 'o') shape(ctx, ell(fx, 84, 12, 16), { fill: C.mouth });
  else if (c.mouth === 'grin') {
    const p = spl([[-30, 74], [36, 64], [28, 88], [2, 98], [-22, 90]]).map(([x, y]) => [x + fx, y]);
    shape(ctx, p, { fill: C.mouth, stroke: false });
    ctx.save(); ctx.beginPath(); trace(ctx, p, true); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-40 + fx, 60, 80, 14); ctx.restore();
    shape(ctx, p);
  } else {
    line(ctx, spl([[-24, 76], [-4, 82], [20, 76], [30, 64]], false).map(([x, y]) => [x + fx, y]), { lwk: 1 });
    line(ctx, [[27 + fx, 58], [33 + fx, 68]], { lwk: 0.7 });
  }
  if (c.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(c.sweat * 4); const y = -50 + 34 * c.sweat;
    shape(ctx, spl([[104, y - 24], [116, y + 2], [104, y + 13], [92, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
function cuBody(ctx, c) {
  const P = { ...C, ...(c.pal || {}) };
  for (const [i, x0] of [[0, -66], [1, 14]]) { // legs + sneakers
    const lift = c.lift[i];
    HX(ctx, rr(x0, 290, 52, 272 - lift, 8), { fill: P.jeans });
    const sx = x0 + 26 + (i ? 10 : -10), sy = 562 - lift;
    shape(ctx, spl([[sx - 42, sy + 10], [sx - 34, sy - 14], [sx + 20, sy - 16], [sx + 44, sy + 2], [sx + 40, sy + 18], [sx - 38, sy + 20]]), { fill: C.shoe });
    line(ctx, [[sx - 38, sy + 12], [sx + 40, sy + 10]], { col: C.red, lwk: 0.9 });
  }
  HX(ctx, ell(0, 4, 80, 30), { fill: P.hood2 }); // hood bunched round the neck
  SK(ctx, rr(-24, -40, 48, 50, 10), P.cSkin);
  HX(ctx, spl([[-82, -4], [0, -8], [82, -4], [114, 24], [122, 130], [118, 300], [-118, 300], [-122, 130], [-114, 24]]), { fill: P.hood });
  HX(ctx, rr(-118, 280, 236, 28, 8), { fill: P.hood2 });
  for (const sx of [-1, 1]) { line(ctx, [[sx * 20, 12], [sx * 24, 96]], { lwk: 0.7 }); shape(ctx, ell(sx * 24, 102, 5, 8), { fill: C.white, lwk: 0.6 }); }
  const pocket = () => HX(ctx, [[-80, 196], [80, 196], [98, 280], [-98, 280]], { fill: P.hood });
  if (!c.pocketed) pocket();
  ctx.save(); ctx.translate(0, -18 + c.nod); ctx.rotate(c.tilt); ctx.translate(0, -118); cuHead(ctx, c); ctx.restore();
  // arms: [0] = his right (screen left), [1] = his left (screen right)
  for (const [i, sx] of [[0, -1], [1, 1]]) {
    const a = armPose(ctx, [sx * 100, 42], c.hands[i], 124, 118, sx, 54, P.hood, P.hood2);
    const hold = c.hold[i];
    if (hold === 'pocket') continue;
    if (hold && hold.draw) hold.draw(ctx, a);
    hand(ctx, a, 27, P.cSkin);
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
  let HS = HIDE_SIGN;
  if (!HS) for (const x of [330, 750]) line(ctx, [[x, 40], [x, 110]], WL);
  if (!HS) { HX(ctx, rr(240, 110, 600, 160, 24), { fill: C.sign });
  text(ctx, 'SHARMA', 540, 174, 78, C.signTx); text(ctx, 'ELECTRONICS', 540, 232, 38, C.signTx); }
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
function bigPhone(ctx, t, o) { // phone held out in both hands, filling the frame
  shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: C.wall, hatch: '#D6C4A4', ha: 0.35, stroke: false });
  for (let i = 0; i < 7; i++) { ctx.save(); ctx.globalAlpha = 0.5; shape(ctx, ell(540, 900, 380 + i * 110, 380 + i * 110, 90), { col: '#D9C9AC', lwk: 0.5 }); ctx.restore(); }
  ctx.save(); ctx.translate(540, 860); ctx.scale(o.z ?? 1, o.z ?? 1); ctx.rotate(-0.025 + 0.01 * Math.sin(t * 1.4));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, o.sleeve, o.sleeve2);
  const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, o.sleeve, o.sleeve2);
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-252, -532, 504, 1064, 42), true); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.clip(); o.screen(ctx); if (o.over) o.over(ctx); ctx.restore();
  shape(ctx, rr(-252, -532, 504, 1064, 42), { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  hand(ctx, aL, 86, o.skin); hand(ctx, aR, 86, o.skin);
  if (o.top) o.top(ctx);
  ctx.restore();
  if (o.screenOver) o.screenOver(ctx);
}
const HOODIE = { sleeve: C.hood, sleeve2: C.hood2, skin: C.cSkin }, SHIRT = { sleeve: C.shirt, sleeve2: C.shirt2, skin: C.sjSkin };
function shotPhone(ctx, t) { bigPhone(ctx, t, { ...HOODIE, z: 1 + 0.04 * seg(t, 0, 2.42, x => x), screen: c => phoneScreen(c, t) }); }

// ================= EDIT =================
const CUTS = { B: 2.42, C: 3.5, D: 5.9, E: 7.04, RW: 8.0, LAND: 8.8 };
const WIDE = { z: 1.08, cx: 560, cy: 985 };
function cam(t) {
  if (t < CUTS.C) { const k = seg(t, CUTS.B, CUTS.C, x => x); return { z: 2.2 + 0.12 * k, cx: 760, cy: 820, wt: t }; }
  if (t < CUTS.D) { const k = seg(t, CUTS.C, CUTS.D, x => x); return { z: 1.22 + 0.06 * k, cx: 540, cy: 1080, wt: t }; }
  if (t < CUTS.E) return { ...WIDE, z: 1.0 + 0.02 * seg(t, CUTS.D, CUTS.E, x => x), wt: t };
  if (t < CUTS.RW) { const k = seg(t, CUTS.E, CUTS.RW, x => x); return { z: 2.25 + 0.2 * k, cx: 760, cy: 820, wt: t }; }
  if (t < CUTS.LAND) { const k = (t - CUTS.RW) / (CUTS.LAND - CUTS.RW); return { ...WIDE, wt: lerp(7.0, 3.5, E.s(k)), rew: 1 }; }
  return { ...WIDE, z: 1.0 + 0.04 * seg(t, CUTS.LAND, 10.2, x => x), wt: 3.5 };
}
function renderOpen(ctx, t) {
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
  [8.8, 9.4, 'Ek recreation'], [9.4, 10.2, 'dekhiye.'],
  [10.4, 11.95, 'Sharma ji ki mobile shop.'], [11.98, 12.95, 'Shaam ka rush.'],
  [13.15, 13.95, 'Ek customer'], [13.98, 14.98, 'earbuds uthata hai,'], [15.05, 16.5, 'QR scan karta hai,'],
  [16.55, 17.85, 'screen dikhata hai:'], [17.88, 19.1, '"Ho gaya bhaiya."'],
  [19.2, 20.7, 'Tick asli lagta hai.'], [20.72, 21.4, 'Amount,'], [21.42, 22.25, 'transaction ID,'], [22.28, 23.3, 'sab kuch.'],
  [23.38, 24.5, 'Par woh screen'], [24.52, 26.3, 'ek nakli app ki thi.'], [26.4, 28.1, 'Paisa kabhi chala hi nahi.'],
  [28.3, 29.8, 'Chaal simple hai:'], [29.85, 31.4, 'bheed aur jaldi.'], [31.45, 32.2, 'Check karne ka time'], [32.22, 33.55, 'hi nahi milta.'],
  [33.72, 35.3, 'Rule yaad rakhiye:'], [35.32, 36.3, 'customer ki screen'], [36.32, 37.8, 'proof nahi hai.'],
  [37.86, 39.45, 'Proof sirf ek:'], [39.48, 40.5, 'aapke apne phone pe'], [40.52, 41.6, 'bank ka message.'],
  [41.62, 43.25, 'Paisa dikhe,'], [43.27, 44.9, 'tab saaman do.'],
  [45.1, 46.0, 'Toh agli baar koi'], [46.02, 47.15, 'screen dikhaye,'], [47.18, 48.55, '"Ho gaya bhaiya"...'],
  [48.6, 49.5, 'Toh bank message'], [49.52, 50.8, 'check karo.'], [50.85, 51.75, 'Scam se bacho.'], [51.78, 54.1, 'Simple.'],
];
function captions(ctx, t) {
  for (const [a, b, s] of CAPS) if (t >= a && t < b) {
    const k = E.back(clamp((t - a) / 0.14));
    ctx.save(); ctx.translate(540, 1640); ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);
    ctx.font = '800 74px Baloo'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const fit = Math.min(1, 940 / ctx.measureText(s).width); ctx.scale(fit, fit);
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
// ================= FULL EPISODE: shots after the opening =================
const PAL = {
  A: { hood: '#C9695A', hood2: '#A9523F', cSkin: '#EDC19C', jeans: '#4C556B', hair: '#4A3226' },
  B: { hood: '#7D6FAE', hood2: '#62558F', cSkin: '#B9805C', cap: '#B8483C', cap2: '#933A30' },
  D: { hood: '#6E9A5B', hood2: '#577D47', cSkin: '#D7A47E', hair: '#1E1A18', jeans: '#5B4A3E' },
  H: { hood: '#E3B04B', hood2: '#C69235', cSkin: '#E6B48C', jeans: '#3F5C4E', hair: '#2E2420' },
};
const PEN = '#E0522F';
function mkSJ(t, o = {}) {
  return { fx: -0.4, look: [-1, 0.2], eyes: (t % 3.4) > 3.28 ? 'blink' : 'open', mouth: 'smile', brow: 0, worry: 0, glassY: 0, glint: 0, tick: 0, sweat: 0,
    nod: 0, tilt: 0, breathe: Math.sin(t * 2.2), hands: REST.map(p => p.slice()), handMode: ['flat', 'flat'], clasp: false, rub: 0, phone: 'none', phoneK: 0, ...o };
}
function mkCu(t, o = {}) {
  const c = { x: CU.x, fx: 0.45, look: [1, -0.2], eyes: 'sly', mouth: 'smirk', lidTilt: 1, browL: 0, browR: 4, nod: 0, tilt: 0.02 * Math.sin(t * 1.5 + (o.x || 0) * 0.02),
    lift: [0, 0], hands: [[-44, 236], [128, 264]], hold: ['pocket', null], pocketed: true, cap: true, stubble: true, sweat: 0, ...o };
  c.sc = o.sc ?? CU.sc; c.y = o.y ?? 1500 - 570 * c.sc;
  if ((c.eyes === 'sly' || c.eyes === 'open') && ((t + (o.blinkOff || 0)) % 3.9) > 3.8) c.eyes = 'blink';
  return c;
}
function crowd(t, n) {
  return [
    mkCu(t, { x: 50, sc: 0.84, pal: PAL.A, cap: false, eyes: 'open', mouth: 'flat', stubble: false, browR: 0, fx: 0.5, blinkOff: 1.3 }),
    mkCu(t, { x: 175, sc: 0.8, pal: PAL.B, eyes: 'open', mouth: 'flat', stubble: false, browR: 0, fx: 0.5, blinkOff: 2.1 }),
    mkCu(t, { x: 300, sc: 0.88, pal: PAL.D, cap: false, eyes: 'open', mouth: 'flat', stubble: false, browR: 0, fx: 0.5, blinkOff: 0.6 }),
  ].slice(0, n);
}
function cuPhoneUp(c, k) {
  c.hands[0] = lerp2([-44, 236], [-150, -40], k);
  if (k > 0.2) { c.hold[0] = HOLD_PHONE(lerp(0.4, -0.1, k)); c.pocketed = false; }
}
function holdBox(c, off) {
  c.hold[1] = { draw: (ctx, a) => { const hc = [a.w[0] + Math.cos(a.dir) * 13, a.w[1] + Math.sin(a.dir) * 13]; ctx.save(); ctx.translate(hc[0] + off[0], hc[1] + off[1]); ctx.scale(1 / c.sc, 1 / c.sc); drawBox(ctx, 0, BH / 2); ctx.restore(); } };
}
const boxOff = (c, lift) => lerp2([(BW / 2 + 12) / c.sc, (46 - BH / 2) / c.sc], [-64 / c.sc, -30 / c.sc], lift);
const gripAt = (c, bx) => [(bx - BW / 2 - 12 - c.x) / c.sc, (CTOP - 46 - c.y) / c.sc];
function grab(c, t, r0, r1, l0, l1, bx) { // true once the customer holds the box
  const reach = seg(t, r0, r1, E.io), lift = seg(t, l0, l1, E.io), grip = gripAt(c, bx);
  if (reach > 0) c.hands[1] = lerp2([128, 264], grip, reach);
  if (lift > 0) c.hands[1] = lerp2(grip, [96, 214], lift);
  if (t > r1) { holdBox(c, boxOff(c, lift)); return true; }
  return false;
}
function carryBox(c) { c.hands[1] = [96, 214]; holdBox(c, boxOff(c, 1)); }
function putBack(c, t, l0, l1, r0, bx) {
  const grip = gripAt(c, bx), lift = 1 - seg(t, l0, l1, E.io);
  if (t < r0) { c.hands[1] = lerp2(grip, [96, 214], lift); holdBox(c, boxOff(c, lift)); return true; }
  c.hands[1] = lerp2(grip, [128, 264], seg(t, r0, r0 + 0.3, E.io)); return false;
}
function sjSlide(s, t, t0, bx0, bx1) { // both hands push the box across; returns box x
  const bx = lerp(bx0, bx1, seg(t, t0 + 0.14, t0 + 0.52, E.io));
  if (t > t0 && t < t0 + 0.87) {
    const on = seg(t, t0, t0 + 0.14, E.io) * (1 - seg(t, t0 + 0.54, t0 + 0.72, E.io));
    s.hands = [lerp2(REST[0], toSJ(bx - BW / 2 - 24, CTOP - 40), on), lerp2(REST[1], toSJ(bx + BW / 2 + 24, CTOP - 40), on)];
    if (on > 0.35) s.handMode = ['round', 'round'];
    s.look = [-1, 0.6];
  }
  return bx;
}
function miniPhone(ctx, x, y, mode) { // Sharma ji's own phone, screen to camera
  ctx.save(); ctx.translate(x, y);
  shape(ctx, rr(-50, -90, 100, 180, 14), { fill: C.phone });
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-42, -78, 84, 156);
  if (mode === 'credit') {
    shape(ctx, rr(-36, -56, 72, 66, 10), { fill: C.greenLt, col: C.green, lwk: 0.6 });
    shape(ctx, ell(0, -36, 12, 12), { fill: C.green, lwk: 0.5 }); text(ctx, '\u20B9', 0, -35, 16, '#FFFFFF');
    text(ctx, '+8,000', 0, -8, 18, C.green);
  } else {
    shape(ctx, rr(-20, -48, 40, 28, 4), { fill: '#EFECE6', col: '#B8B2A9', lwk: 0.5 });
    line(ctx, [[-20, -48], [0, -32], [20, -48]], { col: '#B8B2A9', lwk: 0.5 });
  }
  ctx.fillStyle = '#E7E3DC'; ctx.fillRect(-30, 26, 60, 7); ctx.fillRect(-30, 42, 44, 7);
  ctx.restore();
}
function sjPhone(ctx, s) { // phoneK 0 = hands resting on the counter, 1 = phone held at the chest
  const k = s.phoneK, L = lerp2(REST[0], [-60, 236], k), R = lerp2(REST[1], [60, 236], k);
  const aL = armPose(ctx, [-124, 46], L, 146, 140, -1, 62, C.shirt, C.shirt2);
  const aR = armPose(ctx, [124, 46], R, 146, 140, 1, 62, C.shirt, C.shirt2);
  miniPhone(ctx, (L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 64, s.phone);
  hand(ctx, aL, 30, C.sjSkin); hand(ctx, aR, 30, C.sjSkin);
}
const phoneLie = (ctx, x, y) => shape(ctx, [[x - 46, y], [x + 40, y], [x + 50, y - 12], [x - 36, y - 12]], { fill: C.phone });
function drawShop(ctx, o, idle) {
  drawSet(ctx);
  const s = o.s;
  ctx.save(); ctx.translate(SJ.x, SJ.y); ctx.scale(SJ.sc, SJ.sc); sjBody(ctx, s); ctx.restore();
  drawCounter(ctx);
  if (o.phoneLie) phoneLie(ctx, 952, CTOP - 4);
  for (const bx of o.boxes || []) drawBox(ctx, bx, CTOP - 4);
  ctx.save(); ctx.translate(SJ.x, SJ.y); ctx.scale(SJ.sc, SJ.sc);
  if (s.phoneK > 0) sjPhone(ctx, s); else if (s.clasp) sjClasp(ctx, s, s.rub); else sjArms(ctx, s);
  ctx.restore();
  for (const c of o.custs || []) { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.sc, c.sc); cuBody(ctx, c); ctx.restore(); }
}
const toS = (cm, wx, wy) => [W / 2 + (wx - cm.cx) * cm.z, H / 2 + (wy - cm.cy) * cm.z];
const headTop = c => [c.x, c.y - (136 + 150) * c.sc];
function worldShot(ctx, t, cm, o, screenFn) {
  CAMZ = cm.z; HIDE_SIGN = o.noSign !== false; // only the establishing wide shows the sign
  ctx.save(); ctx.translate(W / 2 + (cm.jx || 0), H / 2); ctx.scale(cm.z, cm.z); ctx.translate(-cm.cx, -cm.cy);
  drawShop(ctx, o, t);
  ctx.restore(); CAMZ = 1; HIDE_SIGN = false;
  if (screenFn) screenFn(ctx);
}

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
function stopwatch(ctx, x, y, r, t, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(0.1 * Math.sin(t * 30));
  shape(ctx, rr(-16, -r - 30, 32, 28, 6), { fill: C.red });
  shape(ctx, ell(0, 0, r, r), { fill: '#FFFFFF' });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, [[Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76], [Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88]], { lwk: 0.6 }); }
  const a = t * 9 - Math.PI / 2; line(ctx, [[0, 0], [Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68]], { col: C.red, lwk: 1.3 });
  shape(ctx, ell(0, 0, 8, 8), { fill: INK });
  ctx.restore();
}
function shield(ctx, x, y, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k * 0.9, k * 0.9);
  const P = spl([[-250, -250], [0, -290], [250, -250], [240, 40], [170, 190], [0, 290], [-170, 190], [-240, 40]]);
  shape(ctx, P, { fill: '#8DB67E', hatch: dk('#8DB67E', 0.3), ha: 0.5, lwk: 1.3 });
  shape(ctx, P.map(([a, b]) => [a * 0.88, b * 0.88 - 6]), { col: '#E3F0DC', lwk: 0.8 });
  shape(ctx, ell(0, -160, 54, 54), { fill: '#FFFFFF', col: '#E3F0DC', lwk: 0.8 });
  line(ctx, [[-24, -160], [-6, -140], [26, -180]], { col: C.green, lwk: 2 });
  text(ctx, 'SCAM SE', 0, -46, 76, '#F6FBF2'); text(ctx, 'BACHO', 0, 50, 110, '#F6FBF2');
  text(ctx, 'Bank SMS = asli proof', 0, 150, 40, '#F6FBF2', 'center', 700);
  ctx.restore();
}
function coin(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, ell(0, 0, 46, 46), { fill: C.tag, hatch: dk(C.tag), ha: 0.35 });
  shape(ctx, ell(0, 0, 34, 34), { col: dk(C.tag, 0.35), lwk: 0.6 });
  text(ctx, '\u20B9', 0, 4, 50, dk(C.tag, 0.5));
  ctx.restore();
}
function starsAround(ctx, pts, k) { for (const [x, y, s] of pts) star(ctx, x, y, s * k); }
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));
const popWin = (t, t0, t1) => popIn(t, t0) * (1 - seg(t, t1, t1 + 0.12));

// ---------- phone screens (phone-local coords, screen = 504 x 1064) ----------
function statusBar(ctx, time) {
  text(ctx, time, -196, -498, 28, INK, 'left', 700);
  ctx.fillStyle = INK; for (let i = 0; i < 3; i++) ctx.fillRect(160 + i * 14, -490 - i * 6, 9, 12 + i * 6);
}
function fakeApp(ctx, t, press) {
  ctx.fillStyle = '#F5F2FB'; ctx.fillRect(-260, -540, 520, 1080);
  ctx.fillStyle = '#6B5CA5'; ctx.fillRect(-260, -540, 520, 170);
  text(ctx, 'Receipt Maker', -206, -440, 46, '#FFFFFF', 'left');
  shape(ctx, rr(126, -464, 86, 44, 12), { fill: C.tag, lwk: 0.6 }); text(ctx, 'PRO', 169, -441, 26, INK);
  for (const [lab, val, y] of [['Amount', '\u20B9 8000', -300], ['Paid to', 'Sharma Electronics', -160], ['UTR / Ref No.', '4021 8847 1190', -20]]) {
    text(ctx, lab, -210, y - 14, 28, '#8A83A6', 'left', 700);
    shape(ctx, rr(-215, y + 10, 430, 74, 16), { fill: '#FFFFFF', col: '#C9C2E0', lwk: 0.6 });
    text(ctx, val, -190, y + 48, 36, INK, 'left', 700);
  }
  text(ctx, 'Sound: "Ting"', -210, 150, 30, '#8A83A6', 'left', 700);
  shape(ctx, rr(110, 126, 100, 50, 25), { fill: C.green, lwk: 0.6 }); shape(ctx, ell(185, 151, 19, 19), { fill: '#FFFFFF', lwk: 0.5 });
  const s = 1 - 0.07 * press;
  ctx.save(); ctx.translate(0, 330); ctx.scale(s, s);
  shape(ctx, rr(-200, -58, 400, 116, 58), { fill: C.green }); text(ctx, 'Show Success', 0, 4, 44, '#FFFFFF');
  ctx.restore();
  if (t > 24.9 && t < 25.5) { ctx.save(); ctx.globalAlpha = 1 - (t - 24.9) / 0.6; ctx.beginPath(); ctx.arc(0, 330, (t - 24.9) * 700, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = C.green; ctx.stroke(); ctx.restore(); }
}
function msgScreen(ctx, arrive) {
  statusBar(ctx, '7:43');
  text(ctx, 'Messages', -210, -410, 58, INK, 'left');
  shape(ctx, rr(-215, -350, 430, 64, 32), { fill: '#F0EEEA', stroke: false });
  text(ctx, 'Search', -170, -318, 28, '#A8A39C', 'left', 600);
  if (arrive <= 0) {
    shape(ctx, rr(-80, -90, 160, 110, 12), { fill: '#F0EEEA', col: '#B8B2A9', lwk: 0.8 });
    line(ctx, [[-80, -90], [0, -30], [80, -90]], { col: '#B8B2A9', lwk: 0.8 });
    text(ctx, 'No new messages', 0, 90, 36, C.ui, 'center', 600);
    return;
  }
  const y = lerp(-760, -150, E.back(arrive));
  shape(ctx, rr(-225, y - 92, 450, 190, 32), { fill: C.greenLt, col: C.green, lwk: 1.1 });
  shape(ctx, ell(-160, y, 44, 44), { fill: C.green }); text(ctx, '\u20B9', -160, y + 3, 46, '#FFFFFF');
  text(ctx, 'Bank Alert', -96, y - 42, 34, INK, 'left');
  text(ctx, '\u20B98,000 credited', -96, y + 6, 38, C.green, 'left');
  text(ctx, 'A/c XX4821 \u00B7 UPI', -96, y + 50, 25, C.ui, 'left', 600);
}
function qrGrid(ctx, x, y, n, m, seed) {
  const r = rng(seed), fin = (i, j) => (i < 7 && j < 7) || (i >= n - 7 && j < 7) || (i < 7 && j >= n - 7);
  ctx.fillStyle = INK;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!fin(i, j) && r() > 0.52) ctx.fillRect(x + i * m, y + j * m, m + 0.5, m + 0.5);
  for (const [i, j] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    ctx.fillStyle = INK; ctx.fillRect(x + i * m, y + j * m, 7 * m, 7 * m);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + (i + 1) * m, y + (j + 1) * m, 5 * m, 5 * m);
    ctx.fillStyle = INK; ctx.fillRect(x + (i + 2) * m, y + (j + 2) * m, 3 * m, 3 * m);
  }
}
const wallBG = ctx => shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: C.wall, hatch: '#D6C4A4', ha: 0.35, stroke: false });

// ---------- shots ----------
function shot6(ctx, t) { // Sharma ji ki mobile shop. Shaam ka rush.
  const cm = { z: lerp(1.0, 1.05, seg(t, 10.2, 12.95, x => x)), cx: 480, cy: 985 };
  const s = mkSJ(t);
  if (t > 11.95) { const w = Math.sin((t - 11.95) * 10); s.fx = 0.5 * Math.sign(w) * Math.min(1, Math.abs(w) * 2.5); s.look = [s.fx * 2, 0.2]; s.sweat = 0.6 * seg(t, 12.1, 12.9, x => x); s.mouth = 'flat'; }
  const cs = crowd(t, 2); cs.forEach((c, i) => { c.nod = 3 * Math.sin(t * 5 + i * 2); });
  worldShot(ctx, t, cm, { s, custs: [...cs, mkCu(t)], boxes: [BOX1], noSign: false }, x => {
    const [px, py] = toS(cm, SJ.x, 530); chip(x, px, py, 'SHARMA JI', popIn(t, 10.5), C.sign, 52);
  });
}
function shot7(ctx, t) { // Ek customer earbuds uthata hai
  const cm = { z: lerp(1.35, 1.42, seg(t, 12.95, 15, x => x)), cx: 470, cy: 1000 };
  const s = mkSJ(t, { look: [-1, 0.3] }), c = mkCu(t);
  const has = grab(c, t, 13.5, 13.78, 13.95, 14.4, BOX1);
  if (t > 13.9) { c.mouth = 'grin'; c.browR = 10; }
  c.look = t > 13.3 && t < 14.0 ? [1, 0.6] : [1, -0.2];
  worldShot(ctx, t, cm, { s, custs: [...crowd(t, 2), c], boxes: has ? [] : [BOX1] });
}
function shotQR(ctx, t) { // QR scan karta hai
  wallBG(ctx);
  HX(ctx, [[-20, 1330], [1100, 1330], [1100, 1940], [-20, 1940]], { fill: C.wood });
  HX(ctx, rr(-20, 1300, 1120, 50, 10), { fill: C.woodTop });
  const z = 1 + 0.03 * seg(t, 15.0, 16.5, x => x);
  ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-540, -960);
  shape(ctx, [[372, 1310], [404, 520], [740, 520], [772, 1310]], { fill: '#FFFFFF', hatch: '#D8D2C8', ha: 0.2 });
  shape(ctx, rr(422, 560, 300, 70, 14), { fill: C.green }); text(ctx, 'SCAN & PAY', 572, 597, 36, '#FFFFFF');
  qrGrid(ctx, 433, 660, 21, 13.3, 99);
  text(ctx, 'Sharma Electronics', 572, 996, 30, INK, 'center', 700); text(ctx, 'UPI', 572, 1056, 44, C.green);
  const scanning = t > 15.4 && t < 16.05, ok = t >= 16.05;
  if (ok) shape(ctx, rr(420, 648, 304, 304, 10), { col: C.green, lwk: 1.8 });
  if (scanning) {
    const u = (t - 15.4) / 0.65, yy = 660 + 279 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = C.green; ctx.fillRect(426, yy - 18, 292, 36); ctx.globalAlpha = 1; ctx.fillRect(426, yy - 3, 292, 6); ctx.restore();
  }
  ctx.restore();
  const e = seg(t, 15.0, 15.35, E.o), px = lerp(-260, 190, e), py = 800;
  if (scanning) { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(px + 90, py - 60); ctx.lineTo(433, 660); ctx.lineTo(433, 939); ctx.closePath(); ctx.fill(); ctx.restore(); }
  const a = sleeve(ctx, [[px - 380, 1700], [px - 230, 1250], [px - 30, py + 170]], 130, C.hood, C.hood2);
  ctx.save(); ctx.translate(px, py); ctx.rotate(0.1);
  shape(ctx, rr(-95, -180, 190, 360, 28), { fill: '#3A3A42' }); shape(ctx, rr(-72, -162, 66, 66, 16), { fill: '#2A2A30' }); shape(ctx, ell(-39, -129, 17, 17), { fill: '#5A5A66' });
  ctx.restore();
  hand(ctx, a, 62, C.cSkin);
  if (ok) starsAround(ctx, [[392, 630, 1.1], [760, 690, 0.9], [748, 960, 1.2]], popIn(t, 16.05, 0.25) * (1 - seg(t, 16.35, 16.5)));
}
function shot9(ctx, t) { // screen dikhata hai: "Ho gaya bhaiya."
  const cm = { z: 1.45 + 0.05 * seg(t, 16.5, 19.15, x => x), cx: 470, cy: 900 };
  const s = mkSJ(t, { look: [-1, 0.5] });
  if (t > 18.15) { s.mouth = 'grin'; s.nod = 8 * pulse(t, 18.2, 0.4); }
  const c = mkCu(t); carryBox(c); cuPhoneUp(c, seg(t, 16.55, 16.9, E.io));
  if (t > 17.85) { c.mouth = 'grin'; c.nod = 6 * pulse(t, 17.9, 0.3); }
  worldShot(ctx, t, cm, { s, custs: [...crowd(t, 2), c] }, x => {
    const [bx, by] = toS(cm, c.x + 60, c.y - 136 * c.sc - 240); bubble(x, bx + 80, by, 'Ho gaya bhaiya!', popIn(t, 17.88, 0.25), [-90, 95], 54);
  });
}
function shot10(ctx, t) { // Tick asli lagta hai. Amount, transaction ID, sab kuch.
  bigPhone(ctx, t, { ...HOODIE, z: 1 + 0.03 * seg(t, 19.15, 23.3, x => x), screen: c => phoneScreen(c, 3.3), over: c => {
    const w = 11 + 5 * pulse(t, 22.3, 0.4);
    penEllipse(c, 0, -270, 150, 150, seg(t, 19.35, 19.8, E.o), 1, PEN, w);
    penEllipse(c, 0, 24, 212, 82, seg(t, 20.75, 21.15, E.o), 2, PEN, w);
    penPath(c, [[-214, 254], [214, 248]], seg(t, 21.45, 21.8, E.o), PEN, w);
  }, screenOver: c => starsAround(c, [[170, 470, 1.2], [910, 540, 1.0], [900, 1250, 1.3], [180, 1300, 0.9]], popIn(t, 22.3, 0.3) * (1 - seg(t, 22.9, 23.2))) });
}
function shot11(ctx, t) { // Par woh screen ek nakli app ki thi.
  const k = seg(t, 23.45, 23.95, E.io), press = pulse(t, 24.9, 0.22);
  bigPhone(ctx, t, { ...HOODIE, screen: c => {
    fakeApp(c, t, press);
    if (k < 1) { c.save(); c.translate(0, -1100 * k); c.fillStyle = '#FFFFFF'; c.fillRect(-260, -540, 520, 1080); phoneScreen(c, 3.3); c.restore(); }
  }, top: c => stamp(c, 0, -110, 'NAKLI APP', clamp((t - 25.1) / 0.14), C.red, -0.14) });
}
function noSmsPhone(ctx) {
  shape(ctx, rr(-38, -70, 76, 140, 12), { fill: C.phone });
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-30, -60, 60, 120);
  shape(ctx, rr(-16, -26, 32, 22, 3), { fill: '#EFECE6', col: '#B8B2A9', lwk: 0.5 });
  line(ctx, [[-16, -26], [0, -14], [16, -26]], { col: '#B8B2A9', lwk: 0.5 });
  ctx.fillStyle = '#E7E3DC'; ctx.fillRect(-20, 12, 40, 6); ctx.fillRect(-20, 26, 28, 6);
}
function shotCoin(ctx, t) { // Paisa kabhi chala hi nahi.
  wallBG(ctx);
  ctx.save(); ctx.translate(280, 930); ctx.rotate(-0.06); ctx.scale(3, 3); drawPhoneSmall(ctx, 0, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(800, 930); ctx.rotate(0.06); ctx.scale(3, 3); noSmsPhone(ctx); ctx.restore();
  chip(ctx, 280, 1220, 'Customer', 1, INK, 40); chip(ctx, 800, 1220, 'Sharma ji', 1, INK, 40);
  const P0 = [360, 640], P1 = [540, 360], P2 = [720, 640];
  const Q = u => [(1 - u) ** 2 * P0[0] + 2 * u * (1 - u) * P1[0] + u * u * P2[0], (1 - u) ** 2 * P0[1] + 2 * u * (1 - u) * P1[1] + u * u * P2[1]];
  const dk2 = seg(t, 26.4, 26.7, x => x);
  ctx.save(); ctx.strokeStyle = '#8C8174'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 24; i += 2) { if (i / 24 > dk2) break; const a = Q(i / 24), b = Q((i + 1) / 24); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  ctx.restore();
  if (dk2 >= 1) line(ctx, [[698, 606], [720, 640], [684, 646]], { col: '#8C8174', lwk: 1.1 });
  const u = 0.5 * seg(t, 26.55, 27.05, E.o), p = Q(u), wob = t > 27.05 ? 7 * Math.sin((t - 27.05) * 40) * (1 - seg(t, 27.05, 27.4)) : 0;
  const fade = 1 - seg(t, 27.6, 27.9);
  if (t > 26.55 && fade > 0) {
    coin(ctx, p[0] + wob, p[1], 1.5, fade);
    ctx.save(); ctx.globalAlpha = fade;
    penPath(ctx, [[p[0] - 72, p[1] - 72], [p[0] + 72, p[1] + 72]], seg(t, 27.28, 27.4, E.o), C.red, 16);
    penPath(ctx, [[p[0] + 72, p[1] - 72], [p[0] - 72, p[1] + 72]], seg(t, 27.36, 27.48, E.o), C.red, 16);
    ctx.restore();
  }
  bubble(ctx, 870, 560, '?', popIn(t, 27.45, 0.25), [-30, 80], 60);
}
function shot13(ctx, t) { // CHAAL: bheed aur jaldi. Check karne ka time hi nahi milta.
  const push = seg(t, 31.45, 31.95, E.io);
  const cm = { z: lerp(1.0, 1.9, push), cx: lerp(480, 760, push), cy: lerp(985, 830, push) };
  const s = mkSJ(t, { mouth: 'flat' });
  const w = Math.sin((t - 28.2) * 8); s.fx = 0.5 * Math.sign(w) * Math.min(1, Math.abs(w) * 2.5); s.look = [s.fx * 2, 0.2];
  s.sweat = 0.9 * clamp((t - 29.5) / 2.5);
  if (t > 31.45) { s.fx = 0; s.look = [Math.sin(t * 14) > 0 ? -1 : 1, 0.2]; s.worry = 0.6; s.brow = 6; s.mouth = 'wavy'; }
  const cs = crowd(t, 3); cs.forEach((c, i) => { c.nod = 4 * Math.sin(t * 7 + i * 2); });
  cuPhoneUp(cs[1], 1);
  worldShot(ctx, t, cm, { s, custs: cs, boxes: [BOX0], noSign: true }, x => {
    chip(x, 540, 170, 'CHAAL', popIn(t, 28.3), C.red, 64);
    for (const [c, str, t0, t1, up] of [[cs[0], 'Bhaiya, jaldi!', 29.9, 30.3, 0], [cs[1], 'Mera bhi dekho!', 30.42, 30.8, 110], [cs[2], 'Kitne ka hai?', 30.92, 31.45, 0]]) {
      const [hx, hy] = toS(cm, ...headTop(c)); bubble(x, Math.max(250, hx + 150), hy - 90 - up, str, popWin(t, t0, t1), [-120, 80 + up], 44);
    }
    const [sx, sy] = toS(cm, SJ.x + 200, SJ.y - 330); stopwatch(x, sx, sy, 90, t, popIn(t, 31.7, 0.3));
  });
}
function shot14a(ctx, t) { // Rule yaad rakhiye:
  const cm = { z: 1.9 + 0.08 * seg(t, 33.6, 35.3, x => x), cx: 760, cy: 830 };
  const s = mkSJ(t, { fx: 0, look: [0, 0], clasp: true, brow: 5 * pulse(t, 34.3, 0.5) });
  s.glint = pulse(t, 34.35, 0.45); s.nod = 6 * pulse(t, 34.3, 0.4);
  worldShot(ctx, t, cm, { s, boxes: [BOX0], noSign: true }, x => chip(x, 540, 300, 'RULE', popIn(t, 33.75), C.green, 70));
}
function shot14b(ctx, t) { // customer ki screen proof nahi hai.
  bigPhone(ctx, t, { ...HOODIE, screen: c => phoneScreen(c, 3.3), over: c => {
    penPath(c, [[-230, -480], [230, 480]], seg(t, 36.3, 36.55, E.o), C.red, 30);
    penPath(c, [[230, -480], [-230, 480]], seg(t, 36.5, 36.75, E.o), C.red, 30);
  }, top: c => stamp(c, 0, -40, 'PROOF NAHI', clamp((t - 36.95) / 0.14), C.red, -0.12) });
}
function shot15(ctx, t) { // Proof sirf ek: aapke apne phone pe bank ka message.
  const arrive = seg(t, 39.95, 40.35, x => x);
  bigPhone(ctx, t, { ...SHIRT, z: 1 + 0.03 * seg(t, 37.85, 41.62, x => x), screen: c => msgScreen(c, arrive),
    over: c => penEllipse(c, 0, -150, 262, 124, seg(t, 40.9, 41.3, E.o), 5, C.green, 12),
    screenOver: c => { chip(c, 540, 170, 'ASLI PROOF', popIn(t, 38.0), C.green, 60); starsAround(c, [[200, 520, 1.1], [880, 480, 1.2], [900, 820, 0.9]], popIn(t, 40.35, 0.3) * (1 - seg(t, 41.2, 41.5))); } });
}
function shot16(ctx, t) { // Paisa dikhe, tab saaman do.
  const cm = { z: 1.25, cx: 560, cy: 1030 };
  const s = mkSJ(t);
  s.phoneK = 1 - seg(t, 42.85, 43.1, E.io); if (s.phoneK < 0.05) s.phoneK = 0;
  s.phone = t > 41.95 ? 'credit' : 'none';
  s.look = t < 42.4 ? [-0.2, 1] : [-1, 0.3]; s.fx = t < 42.4 ? -0.1 : -0.4;
  if (t > 42.3 && t < 42.9) { s.eyes = 'happy'; s.mouth = 'grin'; s.nod = 8 * pulse(t, 42.35, 0.45); } else if (t > 42.9) s.mouth = 'grin';
  const bx = sjSlide(s, t, 43.25, BOX0, BOX1);
  const h = mkCu(t, { pal: PAL.H, cap: false, eyes: 'open', mouth: 'smile', stubble: false, browR: 0, blinkOff: 1.7 });
  const has = grab(h, t, 43.85, 44.1, 44.2, 44.6, BOX1);
  if (t > 44.1) { h.eyes = 'happy'; h.mouth = 'grin'; }
  worldShot(ctx, t, cm, { s, custs: [h], boxes: has ? [] : [bx], phoneLie: s.phoneK === 0 }, x => {
    const [px, py] = toS(cm, SJ.x, SJ.y + 172 * SJ.sc);
    starsAround(x, [[px - 120, py - 90, 0.9], [px + 120, py - 110, 1.1], [px + 110, py + 70, 0.8]], popIn(t, 41.95, 0.25) * (1 - seg(t, 42.7, 42.9)));
  });
}
function shot17(ctx, t) { // Toh agli baar koi screen dikhaye, "Ho gaya bhaiya"...
  const cm = { z: 1.5 + 0.06 * seg(t, 44.95, 48.55, x => x), cx: 450, cy: 900 };
  const s = mkSJ(t, { look: [-1, 0.4] }), c = mkCu(t); carryBox(c); cuPhoneUp(c, 1);
  if (t > 47.2) { c.mouth = 'grin'; c.nod = 6 * pulse(t, 47.22, 0.3); }
  worldShot(ctx, t, cm, { s, custs: [c] }, x => {
    chip(x, 540, 170, 'AGLI BAAR', popIn(t, 45.15), C.cap, 56);
    const [bx, by] = toS(cm, c.x + 60, c.y - 136 * c.sc - 240); bubble(x, bx + 80, by, 'Ho gaya bhaiya!', popIn(t, 47.2, 0.25), [-90, 95], 54);
  });
}
function shot18(ctx, t) { // Toh bank message check karo.
  const cm = { z: 1.18, cx: 540, cy: 1060 };
  const s = mkSJ(t); s.phoneK = seg(t, 48.6, 48.9, E.io); if (s.phoneK < 0.05) s.phoneK = 0; s.phone = 'none';
  s.look = t < 49.45 ? [-0.2, 1] : [-1, 0.2]; s.fx = t < 49.45 ? -0.1 : -0.45;
  if (t > 49.45) { s.brow = 8; s.mouth = 'flat'; }
  const c = mkCu(t); cuPhoneUp(c, 1);
  const has = putBack(c, t, 50.05, 50.35, 50.4, BOX1);
  if (t > 49.8) { c.eyes = 'wide'; c.mouth = 'o'; c.browL = -10; c.browR = 8; c.sweat = seg(t, 49.9, 50.6, x => x); c.fx = 0.3; }
  worldShot(ctx, t, cm, { s, custs: [c], boxes: has ? [] : [BOX1], phoneLie: s.phoneK === 0 }, x => {
    const [qx, qy] = toS(cm, SJ.x, SJ.y - 300); bubble(x, qx + 20, qy, 'SMS kahan hai?', popIn(t, 49.5, 0.25), [-60, 80], 44);
  });
}
function shot19(ctx, t) { // Scam se bacho. Simple.
  const cm = { z: 1.55, cx: 760, cy: 760 };
  const s = mkSJ(t, { fx: 0, look: [0, 0], clasp: true, mouth: 'grin' });
  if (t > 51.8) { s.eyes = 'happy'; s.glint = pulse(t, 51.85, 0.5); s.nod = 8 * pulse(t, 51.8, 0.45); }
  worldShot(ctx, t, cm, { s, boxes: [BOX0], noSign: true }, x => {
    shield(x, 540, 470, popIn(t, 50.9, 0.35) * 0.86);
    starsAround(x, [[230, 240, 1.2], [850, 210, 1.0], [870, 600, 1.3], [210, 620, 0.9]], popIn(t, 51.8, 0.3));
  });
}
const SHOTS = [[10.2, shot6], [12.95, shot7], [15.0, shotQR], [16.5, shot9], [19.15, shot10], [23.3, shot11], [26.35, shotCoin], [28.2, shot13],
  [33.6, shot14a], [35.3, shot14b], [37.85, shot15], [41.62, shot16], [44.95, shot17], [48.55, shot18], [50.85, shot19]];
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (t < 10.2) return renderOpen(ctx, t);
  let fn = SHOTS[0][1]; for (const [a, f] of SHOTS) if (t >= a) fn = f;
  CAMZ = 1; fn(ctx, t); ctx.setTransform(1, 0, 0, 1, 0, 0); CAMZ = 1;
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
  fs.mkdirSync(__dirname + '/out_full', { recursive: true });
  for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(`${__dirname}/out_full/f${String(f).padStart(4, '0')}.png`, out.toBuffer('image/png')); }
}
