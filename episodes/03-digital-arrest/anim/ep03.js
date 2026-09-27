// Episode 03 — "Digital Arrest" video-call scam. Paper-doll storybook style (see lib/doll.js).
// Usage: node ep03.js all [seconds] | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node ep03.js 30,150,240       -> PNG stills in anim/out/
const fs = require('fs'), path = require('path');
const D = require('../../../lib/doll.js');
const { createCanvas, INK, view, clamp, lerp, lerp2, E, seg, pulse, rng, dk, shape, line, ell, arcP, rr, sup, spl, mirror, blob, text, sleeve, hand, armPose, HX, SK, trace, chip } = D;

const W = 1080, H = 1920, FPS = 30;
const C = {
  wall: '#F1E4CD', wallH: '#D9C3A0', skirt: '#FBF6EC', floor: '#C9A57E', floorLn: '#B18C64', rug: '#8E4E78', rug2: '#E7B454',
  sofa: '#5F9C97', sofa2: '#4E8783', wood: '#B9855A', woodTop: '#CC9A6E', curtain: '#E3A84A', white: '#FFFFFF',
  aSkin: '#EAB891', hair: '#3A302C', hairLt: '#6B6059', sindoor: '#D2372C', kurta: '#A8528A', dupatta: '#E9B64E', gold: '#E2B246',
  oSkin: '#C58A60', oHair: '#1F1A17', khaki: '#BA9D63', khaki2: '#9E8049', khakiLt: '#CDB57F',
  mouth: '#8C2F2A', blush: 'rgba(238,150,135,0.55)', red: '#D54B40', green: '#3FA35B', phone: '#2E2E33', navy: '#2C3A5A',
};

// ---------- voiceover envelope (drives the officer's lip sync) ----------
function loadEnv(file) {
  const b = fs.readFileSync(file); let o = 12, fmt, data;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12) };
    if (id === 'data') data = b.subarray(o + 8, o + 8 + n);
    o += 8 + n + (n & 1);
  }
  const step = fmt.ch * 2, N = data.length / step, per = fmt.sr / FPS, env = [];
  for (let f = 0; f * per < N; f++) {
    let s = 0, c = 0;
    for (let i = Math.floor(f * per); i < Math.min(N, Math.floor((f + 1) * per)); i++) { const v = data.readInt16LE(i * step) / 32768; s += v * v; c++; }
    env.push(Math.sqrt(s / Math.max(1, c)));
  }
  return env;
}
const ENV = loadEnv(path.join(__dirname, '../audio/vo.wav'));
const OFFICER_LINES = [[8.24, 9.34], [9.82, 12.5], [12.82, 16.36], [18.62, 19.66], [20.18, 23.54]];
function talk(t) {
  if (!OFFICER_LINES.some(([a, b]) => t >= a && t <= b)) return 0;
  const i = Math.floor(t * FPS), a = ((ENV[i - 1] || 0) + 2 * (ENV[i] || 0) + (ENV[i + 1] || 0)) / 4;
  return clamp((a - 0.015) * 7);
}

// ---------- small props ----------
function star5(ctx, x, y, r, fill) {
  const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; p.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  shape(ctx, p, { fill, lwk: 0.55 });
}
function clock(ctx, x, y, r, min) {
  shape(ctx, ell(x, y, r, r), { fill: C.white, hatch: '#D8CFC0', ha: 0.2, lwk: 1 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, [[x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74], [x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86]], { lwk: 0.5 }); }
  const am = min / 60 * Math.PI * 2 - Math.PI / 2, ah = min / 720 * Math.PI * 2 - Math.PI / 2;
  line(ctx, [[x, y], [x + Math.cos(ah) * r * 0.46, y + Math.sin(ah) * r * 0.46]], { lwk: 1.1 });
  line(ctx, [[x, y], [x + Math.cos(am) * r * 0.7, y + Math.sin(am) * r * 0.7]], { lwk: 0.8 });
  blob(ctx, x, y, 5, 5, INK);
}
function steam(ctx, x, y, t, a = 1) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + i / 3) % 1, x0 = x + (i - 1) * 18, pts = [];
    for (let j = 0; j <= 8; j++) { const v = j / 8; pts.push([x0 + 7 * Math.sin(v * 6 + t * 3 + i), y - 10 - v * 70 - ph * 20]); }
    ctx.globalAlpha = 0.5 * a * Math.sin(Math.PI * ph); line(ctx, pts, { col: '#FFFFFF', lwk: 0.9 });
  }
  ctx.restore();
}
function ringArcs(ctx, x, y, t, k, dir) { // "buzz" marks beside a vibrating phone
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  for (let i = 0; i < 2; i++) line(ctx, arcP(x, y, 26 + i * 22 + 4 * Math.sin(t * 30), dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7, 10), { lwk: 1.1 });
  ctx.restore();
}

// ================= VERMA AUNTY =================
// Round face, centre parting with sindoor, low bun, red bindi, gold jhumkas, plum kurta with gold buti, mustard dupatta.
const mkVA = o => ({ fx: 0, look: [0, 0.3], eyes: 'open', mouth: 'smile', brow: 0, worry: 0, sweat: 0, glow: 0, nod: 0, tilt: 0, hold: 'lap', ...o });
function vaHead(ctx, s) {
  const fx = s.fx * 12, px = fx * 0.3;
  HX(ctx, ell(-96 - s.fx * 4, 66, 46, 42), { fill: C.hair }); // bun, behind
  line(ctx, arcP(-96, 66, 26, 3.7, 5.3, 10), { col: C.hairLt, lwk: 0.6 });
  for (const sx of [-1, 1]) {
    const ex = sx * 106 - s.fx * 5;
    SK(ctx, ell(ex, 16, 18, 24), C.aSkin);
    line(ctx, arcP(ex - sx * 2, 16, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  const face = sup(0, 6, 108, 114, 2.3, 0.05);
  SK(ctx, face, C.aSkin);
  for (const sx of [-1, 1]) { // jhumkas
    const ex = sx * 106 - s.fx * 5;
    line(ctx, [[ex, 38], [ex, 48]], { lwk: 0.6 });
    shape(ctx, spl([[ex - 11, 48], [ex + 11, 48], [ex + 15, 66], [ex - 15, 66]]), { fill: C.gold, hatch: dk(C.gold), ha: 0.3, lwk: 0.7 });
    for (const dx of [-8, 0, 8]) blob(ctx, ex + dx, 71, 3, 3, C.gold);
  }
  const outer = arcP(0, 4, 124, Math.PI + 0.1, Math.PI * 2 - 0.1, 30);
  const inner = [[98, 2], [94, -40], [68, -72], [30, -86], [px, -80], [-30, -86], [-68, -72], [-94, -40], [-98, 2]];
  HX(ctx, spl([[-118, 22], ...outer, [118, 22], ...inner], true, 5), { fill: C.hair });
  line(ctx, spl([[-40, -104], [-72, -80], [-96, -36]], false), { col: '#9A918A', lwk: 1.6 }); // grey streak
  line(ctx, [[px, -82], [px - 2, -114]], { col: C.sindoor, lwk: 1 });
  for (const sx of [-1, 1]) blob(ctx, sx * 66 + fx, 36, 22, 12, C.blush);
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * 40 + fx, -38 - s.brow); ctx.rotate(sx * 0.22 * s.worry);
    shape(ctx, rr(-20, -4, 40, 9, 4), { fill: C.hair, lwk: 0.6 }); ctx.restore();
  }
  blob(ctx, fx, -34, 7, 7, C.sindoor); // bindi
  for (const sx of [-1, 1]) {
    const ex = sx * 40 + fx, ey = -2;
    if (s.eyes === 'happy') line(ctx, arcP(ex, ey + 6, 13, Math.PI + 0.35, 2 * Math.PI - 0.35, 12), { lwk: 1.25 });
    else if (s.eyes === 'blink') line(ctx, [[ex - 13, ey], [ex + 13, ey]], { lwk: 1.1 });
    else {
      const wide = s.eyes === 'wide', r = wide ? 19 : 15, pr = wide ? 4.8 : 7.5;
      shape(ctx, ell(ex, ey, r, r), { fill: C.white });
      const qx = ex + s.look[0] * (wide ? 2 : 5), qy = ey + s.look[1] * (wide ? 2 : 5);
      blob(ctx, qx, qy, pr, pr, INK); blob(ctx, qx + pr * 0.35, qy - pr * 0.4, pr * 0.32, pr * 0.32, C.white);
    }
    if (s.eyes !== 'happy') line(ctx, [[ex + sx * 13, ey - 10], [ex + sx * 21, ey - 17]], { lwk: 0.8 }); // lash
  }
  line(ctx, spl([[fx + 2, 12], [fx - 8, 30], [fx + 1, 38], [fx + 10, 34]], false), { lwk: 0.9 });
  const m = s.mouth;
  if (m === 'bigsmile') shape(ctx, spl([[-30, 62], [30, 62], [22, 84], [0, 94], [-22, 84]]).map(([x, y]) => [x + fx, y]), { fill: C.mouth });
  else if (m === 'worried') line(ctx, Array.from({ length: 11 }, (_, i) => [fx - 20 + i * 4, 76 + 3 * Math.sin(i * 1.5)]), { lwk: 0.95 });
  else if (m === 'o') shape(ctx, ell(fx, 78, 12, 15), { fill: C.mouth });
  else if (m === 'flat') line(ctx, [[fx - 16, 76], [fx + 16, 76]], { lwk: 1 });
  else line(ctx, arcP(fx, 42, 28, 0.5, Math.PI - 0.5, 14), { lwk: 1 });
  if (s.glow > 0) { // screen light on the face
    ctx.save(); ctx.beginPath(); trace(ctx, face, true); ctx.clip(); ctx.fillStyle = `rgba(150,195,255,${0.2 * s.glow})`; ctx.fillRect(-130, -130, 260, 270); ctx.restore();
  }
  if (s.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(s.sweat * 4); const y = -60 + 40 * s.sweat;
    shape(ctx, spl([[100, y - 24], [112, y + 2], [100, y + 13], [88, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
function phoneBack(ctx, x, y, glow) {
  ctx.save();
  if (glow > 0) { ctx.shadowColor = `rgba(160,200,255,${0.9 * glow})`; ctx.shadowBlur = 50; }
  shape(ctx, rr(x - 62, y - 112, 124, 224, 18), { fill: '#3A3F4A' });
  ctx.restore();
  shape(ctx, rr(x - 50, y - 100, 46, 62, 12), { fill: '#262A32', lwk: 0.6 });
  for (const dy of [-84, -54]) shape(ctx, ell(x - 27, y + dy, 11, 11), { fill: '#4E5566', lwk: 0.5 });
}
function cupHeld(ctx, x, y, t) {
  steam(ctx, x, y - 44, t);
  shape(ctx, rr(x - 42, y - 44, 84, 88, 16), { fill: C.white, hatch: '#D8CFC0', ha: 0.25 });
  shape(ctx, rr(x - 42, y - 14, 84, 18, 4), { fill: C.kurta, lwk: 0.6 });
}
function vaBody(ctx, s) {
  SK(ctx, rr(-30, -44, 60, 56, 12), C.aSkin);
  const kp = spl([[-92, -6], [0, -10], [92, -6], [140, 34], [150, 170], [158, 400], [-158, 400], [-150, 170], [-140, 34]]);
  HX(ctx, kp, { fill: C.kurta });
  ctx.save(); ctx.beginPath(); trace(ctx, kp, true); ctx.clip();
  for (let r = 0; r < 9; r++) for (let q = -4; q <= 4; q++) blob(ctx, q * 40 + (r % 2) * 20, 40 + r * 44, 4.5, 4.5, C.gold, 0.85);
  ctx.restore(); shape(ctx, kp);
  shape(ctx, [[-44, -8], [44, -8], [0, 66]], { fill: C.aSkin, stroke: false });
  line(ctx, [[-50, -8], [0, 76], [50, -8]], { lwk: 3.4 }); line(ctx, [[-50, -8], [0, 76], [50, -8]], { col: C.gold, lwk: 2.2 });
  for (const sx of [-1, 1]) {
    const band = [[-128, 4], [-70, -6], [-58, 60], [-66, 400], [-134, 400], [-142, 120]];
    HX(ctx, spl(sx > 0 ? mirror(band) : band), { fill: C.dupatta });
    line(ctx, spl([[sx * 76, 10], [sx * 68, 70], [sx * 76, 396]], false), { col: dk(C.dupatta, 0.35), lwk: 0.5 });
  }
  ctx.save(); ctx.translate(0, -18 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -118); vaHead(ctx, s); ctx.restore();
}
function vaArms(ctx, s, t) {
  const T = s.hold === 'phone' ? [[-70, 206], [70, 206]] : s.hold === 'cup' ? [[-46, 236], [46, 236]] : [[-80, 330], [80, 330]];
  const arms = [[-1, T[0]], [1, T[1]]].map(([sx, tg]) => armPose(ctx, [sx * 116, 48], tg, 132, 126, sx, 58, C.kurta, C.gold));
  if (s.hold === 'phone') phoneBack(ctx, 0, 150, s.glow);
  if (s.hold === 'cup') cupHeld(ctx, 0, 222, t);
  arms.forEach(a => hand(ctx, a, 27, C.aSkin));
}

// ================= THE FAKE OFFICER (seen only on the video call) =================
// Square jaw, stern flat lids, V brows, bushy moustache, khaki uniform and peaked cap.
function ofHead(ctx, o) {
  const fx = (o.fx || 0) * 10;
  for (const sx of [-1, 1]) { SK(ctx, ell(sx * 100, 22, 17, 24), C.oSkin); line(ctx, arcP(sx * 98, 22, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 }); }
  SK(ctx, sup(0, 10, 98, 116, 3.2, 0.12), C.oSkin);
  for (const sx of [-1, 1]) shape(ctx, rr(sx * 90 - 9, -44, 18, 44, 6), { fill: C.oHair, lwk: 0.7 });
  const r = rng(31); ctx.fillStyle = 'rgba(40,30,25,0.3)';
  for (let i = 0; i < 40; i++) { const a = 0.35 + r() * 2.44, d = 0.8 + r() * 0.15; ctx.beginPath(); ctx.arc(Math.cos(a) * 86 * d, 34 + Math.sin(a) * 84 * d, 2, 0, 7); ctx.fill(); }
  for (const sx of [-1, 1]) {
    const ex = sx * 38 + fx, ey = 12;
    if (o.blink) { line(ctx, [[ex - 14, ey], [ex + 14, ey]], { lwk: 1.1 }); continue; }
    const eye = ell(ex, ey, 15, 12), lx = (o.look ? o.look[0] : 0) * 4;
    shape(ctx, eye, { fill: C.white, stroke: false });
    blob(ctx, ex + lx, ey + 2, 6.5, 6.5, INK); blob(ctx, ex + lx + 2, ey - 1, 2, 2, C.white);
    const yi = ey - 3, yo = ey - 8; // stern lid: inner corner lower
    const lid = sx > 0 ? [[ex - 18, yi], [ex + 18, yo]] : [[ex - 18, yo], [ex + 18, yi]];
    ctx.save(); ctx.beginPath(); trace(ctx, eye, true); ctx.clip(); ctx.fillStyle = C.oSkin;
    ctx.beginPath(); ctx.moveTo(ex - 20, ey - 20); ctx.lineTo(ex + 20, ey - 20); ctx.lineTo(lid[1][0], lid[1][1]); ctx.lineTo(lid[0][0], lid[0][1]); ctx.closePath(); ctx.fill(); ctx.restore();
    shape(ctx, eye, { lwk: 0.85 }); line(ctx, lid, { lwk: 1.3 });
  }
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 40 + fx, -14 - (o.brow || 0)); ctx.rotate(-sx * 0.3); shape(ctx, rr(-28, -8, 56, 16, 8), { fill: C.oHair, lwk: 0.7 }); ctx.restore(); }
  line(ctx, spl([[fx - 4, 24], [fx - 16, 48], [fx - 4, 58], [fx + 14, 54], [fx + 16, 42]], false), { lwk: 0.95 });
  const tk = o.talk || 0;
  if (tk > 0.06) shape(ctx, ell(fx, 96 + 4 * tk, 20, 4 + 13 * tk), { fill: C.mouth });
  else line(ctx, arcP(fx, 120, 26, Math.PI + 0.6, 2 * Math.PI - 0.6, 10), { lwk: 1 });
  const half = [[0, 62], [26, 58], [50, 62], [70, 74], [66, 86], [44, 82], [20, 80], [0, 84]];
  shape(ctx, spl(half.concat(mirror(half).reverse().slice(1, -1)).map(([x, y]) => [x + fx, y])), { fill: C.oHair, hatch: '#000000', ha: 0.3 });
  // peaked cap
  HX(ctx, spl([[-112, -62], [-128, -128], [-66, -162], [66, -162], [128, -128], [112, -62]]), { fill: C.khaki });
  shape(ctx, rr(-112, -88, 224, 30, 6), { fill: '#3A3833', lwk: 0.9 });
  shape(ctx, spl([[-110, -60], [0, -48], [110, -60], [100, -40], [0, -28], [-100, -40]]), { fill: '#26241F' });
  line(ctx, arcP(-30, -40, 50, 3.6, 4.4, 8), { col: '#77736B', lwk: 0.8 });
  shape(ctx, ell(0, -118, 26, 26), { fill: C.gold, hatch: dk(C.gold), ha: 0.3, lwk: 0.8 });
  star5(ctx, 0, -118, 15, '#FFF1C2');
  if (o.glint > 0) { ctx.save(); ctx.globalAlpha = o.glint; line(ctx, [[-14, -132], [-4, -142]], { col: C.white, lwk: 1.6 }); ctx.restore(); }
}
function ofBody(ctx, o) {
  SK(ctx, rr(-36, -44, 72, 56, 12), C.oSkin);
  HX(ctx, spl([[-104, -6], [0, -12], [104, -6], [196, 40], [214, 380], [-214, 380], [-196, 40]]), { fill: C.khaki });
  for (const sx of [-1, 1]) shape(ctx, [[sx * 4, -10], [sx * 80, -14], [sx * 52, 50]], { fill: C.khakiLt, hatch: dk(C.khakiLt), ha: 0.3 });
  line(ctx, [[0, 0], [0, 380]], { lwk: 0.8 });
  for (const y of [60, 140, 220, 300]) blob(ctx, 12, y, 6, 6, '#6B5A3A');
  for (const x of [-148, 44]) { shape(ctx, rr(x, 118, 104, 112, 10), { fill: C.khaki, hatch: dk(C.khaki), ha: 0.4, lwk: 0.8 }); shape(ctx, rr(x - 4, 104, 112, 34, 10), { fill: C.khaki2, lwk: 0.8 }); }
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 150, 22); ctx.rotate(sx * 0.24); shape(ctx, rr(-46, -14, 92, 28, 12), { fill: C.khaki2, lwk: 0.8 }); star5(ctx, sx * 16, 0, 9, C.gold); ctx.restore(); }
  shape(ctx, rr(-150, 62, 104, 28, 6), { fill: '#1F1F24', lwk: 0.6 }); text(ctx, 'I. KUMAR', -98, 77, 17, C.white, 'center', 700);
  ctx.save(); ctx.translate(0, -18 + (o.nod || 0)); ctx.rotate(o.tilt || 0); ctx.translate(0, -118); ofHead(ctx, o); ctx.restore();
}

// ================= PHONE SCREENS (phone-local: screen = 504 x 1064 centred on 0,0) =================
function handset(ctx, x, y) { ctx.save(); ctx.beginPath(); ctx.arc(x, y + 10, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = C.white; ctx.stroke(); ctx.restore(); }
function camIcon(ctx, x, y) { ctx.fillStyle = C.white; ctx.beginPath(); trace(ctx, rr(x - 28, y - 18, 38, 36, 7), true); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 14, y - 7); ctx.lineTo(x + 30, y - 17); ctx.lineTo(x + 30, y + 17); ctx.lineTo(x + 14, y + 7); ctx.fill(); }
function badgeDP(ctx, x, y, r) { shape(ctx, ell(x, y, r, r), { fill: C.navy, col: C.gold, lwk: 1.1 }); shape(ctx, ell(x, y, r * 0.76, r * 0.76), { col: C.gold, lwk: 0.6 }); star5(ctx, x, y, r * 0.45, C.gold); }
function incoming(ctx, t) {
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#2E3E5C'); g.addColorStop(1, '#141C2B'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  text(ctx, '7:38', -196, -498, 28, C.white, 'left', 700);
  text(ctx, 'Incoming video call', 0, -400, 32, '#B9C4D8', 'center', 600);
  for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * 0.5; ctx.beginPath(); ctx.arc(0, -190, 112 + k * 90, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = '#8FA4C8'; ctx.stroke(); ctx.restore(); }
  badgeDP(ctx, 0, -190, 110);
  text(ctx, 'Unknown', 0, -20, 56, C.white);
  text(ctx, '+91 98XXX XX210', 0, 40, 32, '#B9C4D8', 'center', 600);
  const bob = t < 1.0 ? -16 * Math.abs(Math.sin(t * 6)) : 0, press = pulse(t, 1.0, 0.14);
  shape(ctx, ell(-140, 380, 62, 62), { fill: C.red }); handset(ctx, -140, 380);
  ctx.save(); ctx.translate(140, 380 + bob); ctx.scale(1 - 0.12 * press, 1 - 0.12 * press); shape(ctx, ell(0, 0, 62, 62), { fill: C.green }); camIcon(ctx, 0, 0); ctx.restore();
  text(ctx, 'Decline', -140, 472, 26, '#B9C4D8', 'center', 600); text(ctx, 'Accept', 140, 472, 26, '#B9C4D8', 'center', 600);
  if (t > 1.0 && t < 1.3) { const k = (t - 1.0) / 0.3; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(140, 380, 62 + k * 120, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = C.green; ctx.stroke(); ctx.restore(); }
}
function idCard(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const card = rr(-150, -95, 300, 190, 14);
  shape(ctx, card, { fill: '#FBFAF6', hatch: '#D8D2C6', ha: 0.2, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, card, true); ctx.clip(); ctx.fillStyle = C.navy; ctx.fillRect(-150, -95, 300, 50); ctx.restore();
  shape(ctx, card, { lwk: 0.9 });
  text(ctx, 'CBI', -104, -69, 36, C.white); text(ctx, 'OFFICER IDENTITY CARD', 38, -69, 17, '#DCE3F2', 'center', 700);
  shape(ctx, rr(-134, -32, 84, 106, 8), { fill: '#CFE0EE', lwk: 0.7 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-134, -32, 84, 106, 8), true); ctx.clip(); ctx.translate(-92, 44); ctx.scale(0.32, 0.32); ofBody(ctx, { talk: 0 }); ctx.restore();
  text(ctx, 'Insp. I. Kumar', -34, -16, 22, INK, 'left', 800);
  text(ctx, 'ID: CBI/CC/0921', -34, 14, 17, '#6A6F7C', 'left', 700);
  for (const yy of [38, 56]) { ctx.fillStyle = '#E2DED6'; ctx.fillRect(-34, yy, 110, 7); }
  shape(ctx, ell(112, 52, 22, 22), { fill: C.gold, hatch: dk(C.gold), ha: 0.35, lwk: 0.7 });
  ctx.restore();
}
function ofState(t) {
  const o = { talk: talk(t), blink: (t % 3.1) > 3.0, brow: 0, nod: 0, tilt: 0, look: [0, 0], glint: pulse(t, 2.05, 0.4) };
  o.nod = 3 * Math.sin(t * 2.1) + 4 * o.talk; o.tilt = 0.015 * Math.sin(t * 1.3);
  if (o.talk > 0.1) o.brow = 3 * o.talk;
  return o;
}
function videoCall(ctx, t, o, opt = {}) {
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#3A4C72'); g.addColorStop(1, '#26324D'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  shape(ctx, rr(-262, -330, 118, 560, 6), { fill: '#6B5A48', hatch: '#4A3D30', ha: 0.4, lwk: 0.7 }); // file cabinet
  ['#D9C9A6', '#C7B48E', '#E3D6B8', '#D9C9A6', '#C7B48E', '#E3D6B8', '#D9C9A6', '#C7B48E'].forEach((c, i) => shape(ctx, rr(-252, -312 + i * 64, 96, 52, 4), { fill: c, lwk: 0.5 }));
  ctx.save(); ctx.translate(-84, -404); ctx.rotate(-0.02); // the printed "HQ" banner: wrinkles and a binder clip give it away
  shape(ctx, rr(-150, -52, 300, 104, 6), { fill: '#F4F1E8', hatch: '#CFC8B8', ha: 0.3, lwk: 0.8 });
  text(ctx, 'CYBER CRIME HQ', 0, -12, 36, C.navy); text(ctx, 'INVESTIGATION CELL', 0, 26, 18, '#6A7590', 'center', 700);
  for (const [a, b, c2, d] of [[-110, -40, -64, 40], [30, -44, 76, 30], [108, -30, 132, 44]]) line(ctx, [[a, b], [c2, d]], { col: '#D2CABA', lwk: 0.5 });
  shape(ctx, rr(118, -62, 36, 22, 4), { fill: "#1E1E22", lwk: 0.5 });
  ctx.restore();
  ctx.save(); ctx.translate(0, 168); ctx.scale(1.12, 1.12); ofBody(ctx, o); ctx.restore();
  if (opt.card > 0) { // ID held up to the camera: sleeve, card, then the hand over the card's corner
    const k = E.back(clamp(opt.card)), cx = 10, cy = 272 + (1 - k) * 520, rot = lerp(-0.14, -0.06, k);
    const corner = [cx - 150 * Math.cos(rot) + 95 * Math.sin(rot) + 16, cy - 150 * Math.sin(rot) + 95 * Math.cos(rot) - 10];
    const a = sleeve(ctx, [[corner[0] - 110, corner[1] + 330], [corner[0] - 70, corner[1] + 150], corner], 92, C.khaki, C.khaki2);
    idCard(ctx, cx, cy, rot);
    hand(ctx, a, 40, C.oSkin);
  }
  const tg = ctx.createLinearGradient(0, -532, 0, -430); tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(-260, -540, 520, 110);
  const secs = Math.max(0, Math.floor(t - 1.2)); blob(ctx, -212, -494, 7, 7, C.red);
  text(ctx, `00:${String(secs).padStart(2, '0')}`, -196, -494, 26, C.white, 'left', 700); 
  // self view: Verma aunty, worried, lit by the screen
  const pip = rr(98, -456, 132, 184, 18);
  ctx.save(); ctx.beginPath(); trace(ctx, pip, true); ctx.clip(); ctx.fillStyle = C.wall; ctx.fillRect(98, -456, 132, 184);
  ctx.translate(164, -350); ctx.scale(0.5, 0.5); vaHead(ctx, mkVA({ eyes: 'open', look: [0, -0.2], worry: 1, mouth: 'worried', glow: 1, fx: 0 })); ctx.restore();
  ctx.save(); ctx.strokeStyle = C.white; ctx.lineWidth = 4; ctx.beginPath(); trace(ctx, pip, true); ctx.stroke(); ctx.restore();
  for (const [x, r, col] of [[-130, 36, 'rgba(255,255,255,0.22)'], [0, 46, C.red], [130, 36, 'rgba(255,255,255,0.22)']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 452, r, 0, 7); ctx.fill(); }
  handset(ctx, 0, 452); camIcon(ctx, 130, 452);
  ctx.fillStyle = C.white; ctx.beginPath(); trace(ctx, rr(-138, 432, 16, 30, 8), true); ctx.fill(); ctx.fillRect(-131, 464, 2, 8);
}

// ================= SETS =================
const AU = { x: 540, y: 905 };
function room(ctx, o) {
  shape(ctx, [[-400, -400], [1480, -400], [1480, 1400], [-400, 1400]], { fill: C.wall, hatch: C.wallH, ha: 0.35, stroke: false });
  shape(ctx, [[-400, 1400], [1480, 1400], [1480, 2400], [-400, 2400]], { fill: C.floor, hatch: dk(C.floor), ha: 0.4, stroke: false });
  for (const y of [1470, 1560, 1680, 1830]) line(ctx, [[-400, y], [1480, y]], { col: C.floorLn, lwk: 0.5 });
  shape(ctx, rr(-400, 1378, 1880, 24, 4), { fill: C.skirt, lwk: 0.7 });
  // window: dusk (call time) or afternoon (before the call)
  shape(ctx, rr(60, 360, 320, 520, 10), { fill: C.white, lwk: 1 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(78, 378, 284, 484, 4), true); ctx.clip();
  const g = ctx.createLinearGradient(0, 378, 0, 862);
  if (o.dusk) { g.addColorStop(0, '#8E86BE'); g.addColorStop(1, '#F2B58A'); } else { g.addColorStop(0, '#BCD8EA'); g.addColorStop(1, '#F1E6CA'); }
  ctx.fillStyle = g; ctx.fillRect(60, 360, 320, 520);
  if (o.dusk) { blob(ctx, 300, 450, 26, 26, '#FFF3D6'); blob(ctx, 312, 442, 24, 24, '#9A8EC2'); } else shape(ctx, ell(290, 460, 34, 34), { fill: '#F7D66B', lwk: 0.7 });
  for (const [bx, bw, bh] of [[80, 70, 200], [160, 54, 280], [224, 76, 170], [306, 56, 240]]) {
    const bc = o.dusk ? '#7F7BA6' : '#A9BFD0';
    shape(ctx, rr(bx, 862 - bh, bw, bh + 20, 3), { fill: bc, hatch: dk(bc), ha: 0.3, lwk: 0.6 });
    if (o.dusk) for (let wy = 862 - bh + 18; wy < 846; wy += 34) for (let wx = bx + 12; wx < bx + bw - 14; wx += 22) { ctx.fillStyle = '#F5E0A0'; ctx.fillRect(wx, wy, 11, 14); }
  }
  ctx.restore();
  shape(ctx, rr(78, 378, 284, 484, 4), { lwk: 0.9 }); line(ctx, [[220, 378], [220, 862]], { lwk: 0.9 });
  shape(ctx, rr(44, 876, 352, 26, 8), { fill: C.white, lwk: 0.9 });
  line(ctx, [[20, 340], [420, 340]], { lwk: 1.2 });
  for (const side of [0, 1]) {
    const p = [[30, 340], [118, 340], [104, 600], [126, 910], [30, 910]].map(([x, y]) => side ? [440 - x, y] : [x, y]);
    HX(ctx, spl(p), { fill: C.curtain });
    for (const fxx of [60, 88]) line(ctx, spl([[side ? 440 - fxx : fxx, 350], [side ? 440 - fxx - 6 : fxx + 6, 620], [side ? 440 - fxx : fxx, 900]], false), { col: dk(C.curtain, 0.3), lwk: 0.5 });
  }
  clock(ctx, 560, 300, 62, o.clockMin);
  // family photo: her son (pays off later in the episode)
  shape(ctx, rr(770, 400, 170, 210, 8), { fill: C.wood, hatch: dk(C.wood), ha: 0.4, lwk: 0.9 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(788, 418, 134, 174, 4), true); ctx.clip();
  ctx.fillStyle = '#DCE9EF'; ctx.fillRect(788, 418, 134, 174);
  shape(ctx, ell(855, 610, 70, 60), { fill: '#5D86B8', lwk: 0.7 });
  SK(ctx, sup(855, 506, 38, 42, 2.4, 0.05), '#E3AE86', { lwk: 0.7 });
  shape(ctx, spl([[815, 500], [818, 470], [855, 458], [892, 470], [895, 500], [880, 482], [830, 482]]), { fill: '#2B2320', lwk: 0.6 });
  blob(ctx, 842, 506, 4, 4, INK); blob(ctx, 868, 506, 4, 4, INK); line(ctx, arcP(855, 512, 14, 0.5, Math.PI - 0.5, 8), { lwk: 0.6 });
  ctx.restore(); shape(ctx, rr(788, 418, 134, 174, 4), { lwk: 0.7 });
  // floor lamp
  if (o.lamp) { const lg = ctx.createRadialGradient(990, 760, 20, 990, 760, 300); lg.addColorStop(0, 'rgba(255,214,140,0.45)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = lg; ctx.fillRect(690, 460, 600, 600); }
  line(ctx, [[990, 790], [990, 1380]], { lwk: 1.1 }); shape(ctx, ell(990, 1384, 60, 12), { fill: '#6D5A48', lwk: 0.8 });
  shape(ctx, [[930, 700], [1050, 700], [1072, 792], [908, 792]], { fill: o.lamp ? '#FBE3AE' : '#EFD9B0', hatch: '#CDB083', ha: 0.3 });
}
function sofa(ctx) {
  HX(ctx, rr(100, 930, 880, 340, 70), { fill: C.sofa });
  for (const x of [320, 540, 760]) blob(ctx, x, 1040, 6, 6, dk(C.sofa, 0.4));
  HX(ctx, rr(150, 1190, 780, 130, 34), { fill: C.sofa2 });
  for (const x of [60, 890]) HX(ctx, rr(x, 1070, 130, 290, 56), { fill: C.sofa });
  for (const [x, rot, col] of [[250, -0.14, C.curtain], [830, 0.14, C.kurta]]) {
    ctx.save(); ctx.translate(x, 1100); ctx.rotate(rot); HX(ctx, rr(-80, -72, 160, 144, 38), { fill: col }); line(ctx, [[-50, -40], [50, 40]], { col: dk(col, 0.3), lwk: 0.5 }); ctx.restore();
  }
}
function table(ctx, o, t) {
  shape(ctx, rr(40, 1560, 1000, 300, 46), { fill: C.rug, hatch: dk(C.rug), ha: 0.45 });
  shape(ctx, rr(70, 1588, 940, 244, 34), { col: C.rug2, lwk: 1.2 });
  shape(ctx, ell(540, 1612, 400, 26), { fill: 'rgba(40,20,30,0.22)', stroke: false });
  for (const x of [190, 850]) HX(ctx, rr(x, 1410, 40, 196, 8), { fill: C.wood });
  HX(ctx, rr(150, 1360, 780, 58, 6), { fill: C.wood });
  HX(ctx, rr(120, 1318, 840, 46, 14), { fill: C.woodTop });
  shape(ctx, rr(190, 1294, 190, 26, 4), { fill: '#F4F0E6', hatch: '#CFC7B6', ha: 0.3, lwk: 0.7 });
  for (const x of [215, 265, 315]) line(ctx, [[x, 1300], [x + 36, 1300]], { col: '#9D978B', lwk: 0.4 });
  if (o.cup) { // tea left to go cold during the call: no steam
    shape(ctx, ell(820, 1316, 58, 12), { fill: C.white, lwk: 0.7 });
    shape(ctx, rr(784, 1244, 72, 70, 14), { fill: C.white, hatch: '#D8CFC0', ha: 0.25 });
    shape(ctx, rr(784, 1266, 72, 14, 3), { fill: C.kurta, lwk: 0.5 });
    line(ctx, arcP(860, 1278, 18, -1.3, 1.3, 10), { lwk: 1 });
  } else shape(ctx, ell(820, 1316, 58, 12), { fill: C.white, lwk: 0.7 });
  if (o.phoneBuzz !== undefined) {
    const b = o.phoneBuzz, jx = b > 0 ? 3 * Math.sin(t * 90) : 0;
    shape(ctx, [[412 + jx, 1318], [522 + jx, 1318], [534 + jx, 1302], [424 + jx, 1302]], { fill: C.phone });
    if (b > 0) { line(ctx, [[430 + jx, 1306], [520 + jx, 1306]], { col: '#BFE0FF', lwk: 1.2 }); ringArcs(ctx, 400, 1296, t, b, -1); ringArcs(ctx, 546, 1296, t, b, 1); }
  }
}
function bars(ctx, k) { // cage front that drops over the room on "arrest"
  if (k <= 0) return;
  ctx.save(); ctx.translate(0, lerp(-2500, 0, k));
  for (let x = 60; x <= 1030; x += 138) { HX(ctx, rr(x - 17, -300, 34, 2400, 14), { fill: '#4A443F', lwk: 1 }); line(ctx, [[x - 7, -280], [x - 7, 2080]], { col: '#7A736B', lwk: 0.7 }); }
  for (const y of [520, 1470]) HX(ctx, rr(10, y - 22, 1060, 44, 12), { fill: '#4A443F', lwk: 1 });
  ctx.restore();
}
let BG = null;
function blurredRoom() { // soft background behind the phone in POV shots
  if (BG) return BG;
  const a = createCanvas(W, H), x = a.getContext('2d');
  x.translate(540, 960); x.scale(1.5, 1.5); x.translate(-540, -760); room(x, { dusk: true, lamp: true, clockMin: 458 });
  BG = createCanvas(W, H); const y = BG.getContext('2d'); y.filter = 'blur(18px)'; y.drawImage(a, 0, 0); y.filter = 'none';
  y.fillStyle = 'rgba(40,34,60,0.18)'; y.fillRect(0, 0, W, H);
  return BG;
}

// ================= SHOTS =================
function phoneRig(ctx, t, o) { // Verma aunty's POV: the phone held in both hands
  ctx.drawImage(blurredRoom(), 0, 0);
  const z = o.z, ty = o.target + 60 * z;
  ctx.save(); ctx.translate(540 + (o.shake || 0), ty); ctx.scale(z, z); ctx.rotate(-0.02 + 0.008 * Math.sin(t * 1.3));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, C.kurta, C.gold);
  const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, C.kurta, C.gold);
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-252, -532, 504, 1064, 42), true); ctx.clip(); o.screen(ctx); ctx.restore();
  shape(ctx, rr(-252, -532, 504, 1064, 42), { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  hand(ctx, aL, 86, C.aSkin); hand(ctx, aR, 86, C.aSkin);
  if (o.buzz > 0) { ringArcs(ctx, -300, -470, t, o.buzz, -1); ringArcs(ctx, 300, -470, t, o.buzz, 1); }
  ctx.restore();
}
const BUZZ = t => (t < 0.42 || (t > 0.55 && t < 0.97)) ? 1 : 0;
function shotCall(ctx, t) { // 0 - 2.8: incoming call, accepted, the "officer" appears
  const k = seg(t, 1.34, 2.7, E.io);
  phoneRig(ctx, t, {
    z: 1 + 0.02 * t + 0.3 * k, target: lerp(840, 790, k), buzz: t < 1.0 ? BUZZ(t) : 0, shake: t < 1.0 && BUZZ(t) ? 4 * Math.sin(t * 95) : 0,
    screen: c => {
      if (t < 1.36) incoming(c, t);
      const r = seg(t, 1.08, 1.36, E.io) * 1300;
      if (r > 0) { c.save(); c.beginPath(); c.arc(140, 380, r, 0, 7); c.clip(); videoCall(c, t, ofState(t)); c.restore(); }
    },
  });
}
function vaCall(t) { // on the call, dusk
  const s = mkVA({ hold: 'phone', glow: 1, look: [0, 0.7], eyes: 'open', worry: 1, mouth: 'worried', brow: 4 });
  s.nod = 2 * Math.sin(t * 2); s.tilt = 0.01 * Math.sin(t * 1.4);
  if ((t % 3.3) > 3.2) s.eyes = 'blink';
  if (t > 5.04) { s.eyes = 'wide'; s.mouth = 'o'; s.brow = 10; s.sweat = seg(t, 5.2, 6.0, x => x); s.nod = -6 * pulse(t, 5.04, 0.2) + 2 * Math.sin(t * 40) * (1 - seg(t, 5.04, 5.5)); s.look = [0, 0]; }
  return s;
}
function drawRoomScene(ctx, cam, o, t) {
  view.z = cam.z;
  ctx.save(); ctx.translate(W / 2 + (cam.jx || 0), H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  room(ctx, o); sofa(ctx);
  if (o.dim > 0) { ctx.fillStyle = `rgba(28,24,48,${0.32 * o.dim})`; ctx.fillRect(-400, -400, 1880, 2800); }
  ctx.save(); ctx.translate(AU.x, AU.y); vaBody(ctx, o.va); vaArms(ctx, o.va, t); ctx.restore();
  table(ctx, o, t);
  if (o.shock > 0) { // shock marks around her head
    ctx.save(); ctx.globalAlpha = o.shock;
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -0.5 : Math.PI + 0.5) + sx * (i - 1) * 0.35, r0 = 170, r1 = 205; line(ctx, [[AU.x + Math.cos(a) * r0, AU.y - 136 + Math.sin(a) * r0], [AU.x + Math.cos(a) * r1, AU.y - 136 + Math.sin(a) * r1]], { lwk: 1.2 }); }
    ctx.restore();
  }
  bars(ctx, o.bars || 0);
  ctx.restore(); view.z = 1;
}
function shotArrest(ctx, t, wt, rew) { // 2.8 - 6.3: Verma aunty on the sofa, caged in her own home
  const k = seg(t, 2.8, 6.3, x => x), hit = t > 5.04 && !rew ? Math.sin((t - 5.04) * 70) * 10 * (1 - seg(t, 5.04, 5.4)) : 0;
  const b = rew ? 1 - seg(t, 6.3, 6.6, E.io) : E.back(clamp((wt - 5.04) / 0.2));
  drawRoomScene(ctx, { z: 1.0 + 0.1 * (rew ? 1 : k), cx: 540 + 3 * Math.sin(t * 0.7), cy: 930, jx: hit }, {
    dusk: true, lamp: true, clockMin: rew ? lerp(460, 255 - 1440, seg(t, 6.3, 6.66, E.io)) : 458 + (wt - 2.8) * 0.4,
    va: vaCall(wt), cup: true, dim: wt > 5.04 ? b : 0, bars: wt > 5.04 ? b : 0, shock: rew ? 0 : pulse(t, 5.06, 0.6),
  }, t);
  const nk = popIn(t, 3.2) * (1 - seg(t, 4.85, 5.0));
  if (!rew && nk > 0.01) chip(ctx, 540, 520, 'VERMA AUNTY', nk, C.kurta, 50);
}
function rewindFX(ctx, t) {
  ctx.fillStyle = 'rgba(150,185,215,0.16)'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) { const y = (t * 2600 + i * 530) % 2000 - 40; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, y, W, 10 + 6 * (i % 2)); }
  for (const dx of [0, 58]) shape(ctx, [[150 + dx, 110], [96 + dx, 150], [150 + dx, 190]], { fill: C.white });
}
function recTag(ctx, t, t0) {
  const k = E.back(clamp((t - t0) / 0.3));
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(540, 150); ctx.scale(0.9 * k, 0.9 * k);
  shape(ctx, rr(-210, -46, 420, 92, 46), { fill: C.white });
  blob(ctx, -160, 0, 15, 15, (Math.floor(t * 2.5) % 2) ? C.red : '#F2A49E');
  text(ctx, 'RECREATION', 20, 4, 50, INK);
  ctx.restore();
}
function shotBefore(ctx, t) { // 6.66 - 8.2: the same afternoon, before the call
  const s = mkVA({ hold: 'cup', eyes: 'happy', mouth: 'smile', look: [0, 0.3] });
  s.nod = 3 * Math.sin(t * 2.2); s.tilt = 0.03 * Math.sin(t * 1.5);
  const buzz = t > 7.35 ? ((t - 7.35) % 0.5 < 0.36 ? 1 : 0) : 0;
  if (t > 7.45) { s.eyes = 'open'; s.look = [-0.5, 1]; s.brow = 6 * seg(t, 7.45, 7.6); s.mouth = 'flat'; s.tilt = -0.04; s.fx = -0.2; }
  drawRoomScene(ctx, { z: 1.06 + 0.03 * seg(t, 6.66, 8.2, x => x), cx: 540, cy: 930 }, { dusk: false, lamp: false, clockMin: 255, va: s, cup: false, phoneBuzz: buzz }, t);
  recTag(ctx, t, 6.72);
}
function shotOfficer(ctx, t) { // 8.2 - : the officer talks; ID card for "CBI"
  phoneRig(ctx, t, { z: 1.3 + 0.03 * seg(t, 8.2, 10, x => x), target: 790, screen: c => videoCall(c, t, ofState(t), { card: seg(t, 8.36, 8.62, x => x) }) });
}
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); view.z = 1;
  if (t < 2.8) shotCall(ctx, t);
  else if (t < 6.3) shotArrest(ctx, t, t, false);
  else if (t < 6.66) { shotArrest(ctx, t, lerp(6.3, 2.9, seg(t, 6.3, 6.66, E.io)), true); rewindFX(ctx, t); }
  else if (t < 8.2) shotBefore(ctx, t);
  else shotOfficer(ctx, t);
}
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));

// ================= CAPTIONS =================
// {word} = yellow keyword, <word> = red danger word
const CAPS = [
  [0.0, 1.24, 'Video call aaya.'], [1.34, 2.78, 'Saamne police ki vardi.'],
  [2.88, 3.76, 'Aur Verma aunty'], [3.78, 5.02, 'apne hi ghar mein'], [5.04, 6.3, '<arrest> ho gayi.'],
  [6.66, 8.1, 'Ek recreation dekhiye.'],
  [8.24, 9.72, '"Main {CBI} se bol raha hoon."'], [9.82, 11.3, '"Aadhaar pe ek parcel pakda gaya."'],
];
function parseCap(s) {
  const out = [], re = /\{([^}]*)\}|<([^>]*)>|([^{<]+)/g; let m;
  while ((m = re.exec(s))) out.push(m[1] != null ? [m[1], '#FFD24A'] : m[2] != null ? [m[2], '#FF7A66'] : [m[3], '#FFFFFF']);
  return out;
}
function captions(ctx, t) {
  for (const [a, b, s] of CAPS) if (t >= a && t < b) {
    const k = E.back(clamp((t - a) / 0.14));
    ctx.save(); ctx.translate(540, 1650); ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);
    ctx.font = '800 74px Baloo'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    const parts = parseCap(s), ws = parts.map(p => ctx.measureText(p[0]).width), tot = ws.reduce((x, y) => x + y, 0);
    const fit = Math.min(1, 960 / tot); ctx.scale(fit, fit);
    for (const pass of [0, 1, 2]) {
      let x = -tot / 2;
      parts.forEach((p, i) => {
        if (pass === 0) { ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(43,37,34,0.3)'; ctx.strokeText(p[0], x, 7); }
        else if (pass === 1) { ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText(p[0], x, 0); }
        else { ctx.fillStyle = p[1]; ctx.fillText(p[0], x, 0); }
        x += ws[i];
      });
    }
    ctx.restore();
  }
}

// ================= OUTPUT =================
const out = createCanvas(W, H), octx = out.getContext('2d');
function renderFrame(f) { const t = f / FPS; renderScene(octx, t); octx.setTransform(1, 0, 0, 1, 0, 0); captions(octx, t); }
const arg = process.argv[2] || 'all';
if (arg === 'all') {
  const NF = Math.round(parseFloat(process.argv[3] || '10') * FPS);
  (async () => {
    for (let f = 0; f < NF; f++) {
      renderFrame(f);
      const buf = Buffer.from(octx.getImageData(0, 0, W, H).data.buffer);
      if (!process.stdout.write(buf)) await new Promise(r => process.stdout.once('drain', r));
    }
  })();
} else {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(path.join(__dirname, 'out', `f${String(f).padStart(4, '0')}.png`), out.toBuffer('image/png')); }
}
