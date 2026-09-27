// Episode 03 — "Digital Arrest" video-call scam. Paper-doll storybook style (see lib/doll.js).
// Usage: node ep03.js all [seconds] | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node ep03.js 30,150,240       -> PNG stills in anim/out/
const fs = require('fs'), path = require('path');
const D = require('../../../lib/doll.js');
const { createCanvas, INK, view, clamp, lerp, lerp2, E, seg, pulse, rng, dk, shape, line, ell, arcP, rr, sup, spl, mirror, blob, text, sleeve, hand, armPose, HX, SK, trace, chip, mix, stamp, penPath, starsAround } = D;

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
    else if (s.eyes === 'tired') { // heavy half-closed lids after hours on the call
      shape(ctx, ell(ex, ey, 15, 15), { fill: C.white, stroke: false });
      blob(ctx, ex + s.look[0] * 4, ey + 5, 7, 7, INK);
      ctx.save(); ctx.beginPath(); trace(ctx, ell(ex, ey, 15, 15), true); ctx.clip(); ctx.fillStyle = C.aSkin; ctx.fillRect(ex - 18, ey - 18, 36, 18); ctx.restore();
      shape(ctx, ell(ex, ey, 15, 15), { lwk: 0.9 }); line(ctx, [[ex - 17, ey], [ex + 17, ey]], { lwk: 1.2 });
      line(ctx, arcP(ex, ey + 6, 16, 0.5, Math.PI - 0.5, 8), { col: 'rgba(120,80,110,0.5)', lwk: 0.6 });
    }
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
  if (o.dusk) { const n = o.night || 0; g.addColorStop(0, mix('#8E86BE', '#2A2D58', n)); g.addColorStop(1, mix('#F2B58A', '#56487E', n)); } else { g.addColorStop(0, '#BCD8EA'); g.addColorStop(1, '#F1E6CA'); }
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
  shape(ctx, ell(540, 1392, 480, 24), { fill: 'rgba(40,20,30,0.2)', stroke: false }); // contact shadow
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
  for (let x = AU.x + 69 - 138 * 4; x <= 1100; x += 138) /* a gap frames her face */ { HX(ctx, rr(x - 17, -300, 34, 2400, 14), { fill: '#4A443F', lwk: 1 }); line(ctx, [[x - 7, -280], [x - 7, 2080]], { col: '#7A736B', lwk: 0.7 }); }
  for (const y of [520, 1470]) HX(ctx, rr(10, y - 22, 1060, 44, 12), { fill: '#4A443F', lwk: 1 });
  ctx.restore();
}
let BG = null;
function blurredRoom() { // soft background behind the phone in POV shots
  if (BG) return BG;
  const a = createCanvas(W, H), x = a.getContext('2d');
  x.translate(540, 960); x.scale(1.5, 1.5); x.translate(-540, -760); room(x, { dusk: true, lamp: true, clockMin: 458 });
  BG = createCanvas(W, H); const y = BG.getContext('2d');
  y.fillStyle = C.wall; y.fillRect(0, 0, W, H); // opaque base: the blur fades the edges to transparent
  y.filter = 'blur(18px)'; y.drawImage(a, -60, -60, W + 120, H + 120); y.filter = 'none';
  y.fillStyle = 'rgba(40,34,60,0.18)'; y.fillRect(0, 0, W, H);
  return BG;
}

// ================= SHOTS =================
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
  if (o.spot > 0) spotlight(ctx, o.spot);
  if (o.extra) o.extra(ctx);
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
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));

// ================= PREMIUM PASS: phone grip, call UI, paper finish =================
function thumb(ctx, p, ang, skin) { // thumb lying along the phone's edge, nail toward the tip
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
  shape(ctx, rr(-20, -30, 150, 60, 30), { fill: skin, hatch: dk(skin, 0.25), ha: 0.14 });
  shape(ctx, rr(94, -19, 30, 38, 13), { fill: mix(skin, '#FFFFFF', 0.45), lwk: 0.6 });
  line(ctx, [[58, -18], [62, 0], [58, 18]], { col: dk(skin, 0.35), lwk: 0.6 });
  ctx.restore();
}
function vignette(ctx, a) {
  const g = ctx.createRadialGradient(540, 900, 520, 540, 960, 1250);
  g.addColorStop(0, 'rgba(40,24,20,0)'); g.addColorStop(1, `rgba(40,24,20,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function phoneRig(ctx, t, o) { // Verma aunty's POV: phone held in both hands (palms behind, thumbs on the edges)
  ctx.drawImage(blurredRoom(), 0, 0);
  const z = o.z, ty = o.target + 60 * z;
  ctx.save(); ctx.translate(540 + (o.shake || 0), ty); ctx.scale(z, z); ctx.rotate(-0.02 + 0.008 * Math.sin(t * 1.3));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, C.kurta, C.gold);
  const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, C.kurta, C.gold);
  const palm = a => [a.w[0] + Math.cos(a.dir) * 40, a.w[1] + Math.sin(a.dir) * 40], pL = palm(aL), pR = palm(aR);
  for (const p of [pL, pR]) shape(ctx, ell(p[0], p[1], 92, 86), { fill: C.aSkin, hatch: dk(C.aSkin, 0.25), ha: 0.14 });
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  const scr = rr(-252, -532, 504, 1064, 42);
  ctx.save(); ctx.beginPath(); trace(ctx, scr, true); ctx.clip(); o.screen(ctx);
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-252, -532); ctx.lineTo(60, -532); ctx.lineTo(-252, 60); ctx.closePath(); ctx.fill();
  ctx.restore();
  shape(ctx, scr, { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  thumb(ctx, pL, -1.35, C.aSkin); thumb(ctx, pR, -Math.PI + 1.35, C.aSkin);
  if (o.buzz > 0) { ringArcs(ctx, -300, -470, t, o.buzz, -1); ringArcs(ctx, 300, -470, t, o.buzz, 1); }
  if (o.top) o.top(ctx);
  ctx.restore();
  if (o.vig > 0) vignette(ctx, 0.55 * o.vig);
  if (o.after) o.after(ctx);
}
const fmtTimer = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60, p = n => String(n).padStart(2, '0'); return h ? `${p(h)}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`; };
const HOURS = 3 * 3600 + 47 * 60;
const callTime = t => t < 16.6 ? t - 1.2 : t < 18.5 ? lerp(15.4, HOURS, seg(t, 16.6, 18.4, E.io)) : HOURS + (t - 18.5);
function callButtons(ctx) {
  for (const [x, r, col] of [[-130, 36, 'rgba(255,255,255,0.22)'], [0, 46, C.red], [130, 36, 'rgba(255,255,255,0.22)']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 452, r, 0, 7); ctx.fill(); }
  handset(ctx, 0, 452); camIcon(ctx, 130, 452);
  ctx.fillStyle = C.white; ctx.beginPath(); trace(ctx, rr(-138, 432, 16, 30, 8), true); ctx.fill(); ctx.fillRect(-131, 464, 2, 8);
}
function callUI(ctx, t, timer, pipVA, pipK = 0) {
  const tg = ctx.createLinearGradient(0, -532, 0, -430); tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(-260, -540, 520, 110);
  blob(ctx, -212, -494, 7, 7, C.red); text(ctx, timer, -196, -494, 26, C.white, 'left', 700);
  const pip = rr(98, -456, 132, 184, 18);
  ctx.save(); ctx.beginPath(); trace(ctx, pip, true); ctx.clip(); ctx.fillStyle = C.wall; ctx.fillRect(98, -456, 132, 184);
  ctx.translate(164, -350); ctx.scale(0.5, 0.5); vaHead(ctx, pipVA); ctx.restore();
  ctx.save(); ctx.strokeStyle = pipK > 0 ? C.red : C.white; ctx.lineWidth = 4 + 5 * clamp(pipK); ctx.beginPath(); trace(ctx, pip, true); ctx.stroke(); ctx.restore();
  if (pipK > 0) {
    const k = E.back(clamp(pipK)); ctx.save(); ctx.translate(164, -240); ctx.scale(k, k);
    shape(ctx, rr(-92, -22, 184, 44, 22), { fill: C.red, lwk: 0.6 }); if (Math.floor(t * 3) % 2) blob(ctx, -68, 0, 7, 7, C.white);
    text(ctx, 'CAMERA ON', 12, 1, 24, C.white); ctx.restore();
  }
  callButtons(ctx);
}
function videoCall(ctx, t, o, opt = {}) {
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#3A4C72'); g.addColorStop(1, '#26324D'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  shape(ctx, rr(-262, -330, 118, 560, 6), { fill: '#6B5A48', hatch: '#4A3D30', ha: 0.4, lwk: 0.7 }); // file cabinet
  ['#D9C9A6', '#C7B48E', '#E3D6B8', '#D9C9A6', '#C7B48E', '#E3D6B8', '#D9C9A6', '#C7B48E'].forEach((c, i) => shape(ctx, rr(-252, -312 + i * 64, 96, 52, 4), { fill: c, lwk: 0.5 }));
  ctx.save(); ctx.translate(-84, -404); ctx.rotate(-0.02); // the printed "HQ" banner: wrinkles and a binder clip give it away
  shape(ctx, rr(-150, -52, 300, 104, 6), { fill: '#F4F1E8', hatch: '#CFC8B8', ha: 0.3, lwk: 0.8 });
  text(ctx, 'CYBER CRIME HQ', 0, -12, 36, C.navy); text(ctx, 'INVESTIGATION CELL', 0, 26, 18, '#6A7590', 'center', 700);
  for (const [a, b, c2, d] of [[-110, -40, -64, 40], [30, -44, 76, 30], [108, -30, 132, 44]]) line(ctx, [[a, b], [c2, d]], { col: '#D2CABA', lwk: 0.5 });
  shape(ctx, rr(118, -62, 36, 22, 4), { fill: '#1E1E22', lwk: 0.5 });
  ctx.restore();
  const lean = opt.lean || 0, sc = 1.12 + 0.3 * lean;
  ctx.save(); ctx.translate(0, 168 + 60 * lean); ctx.scale(sc, sc); ofBody(ctx, o); ctx.restore();
  if (opt.card > 0) { // ID held up to the camera: sleeve, card, then the hand over the card's corner
    const k = E.back(clamp(opt.card)), cx = 10, cy = 272 + (1 - k) * 520, rot = lerp(-0.14, -0.06, k);
    const corner = [cx - 150 * Math.cos(rot) + 95 * Math.sin(rot) + 16, cy - 150 * Math.sin(rot) + 95 * Math.cos(rot) - 10];
    const a = sleeve(ctx, [[corner[0] - 110, corner[1] + 330], [corner[0] - 70, corner[1] + 150], corner], 92, C.khaki, C.khaki2);
    idCard(ctx, cx, cy, rot);
    hand(ctx, a, 40, C.oSkin);
  }
  callUI(ctx, t, fmtTimer(callTime(t)), mkVA({ eyes: t > 16.6 && t < 20.2 ? 'tired' : 'open', look: [0, -0.2], worry: 1, mouth: 'worried', glow: 1 }), opt.pip || 0);
}
function incoming(ctx, t, mode = 'accept') {
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#2E3E5C'); g.addColorStop(1, '#141C2B'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  const acc = mode === 'accept', tp = acc ? 1.0 : 42.96;
  text(ctx, acc ? '7:38' : '4:15', -196, -498, 28, C.white, 'left', 700);
  text(ctx, 'Incoming video call', 0, -400, 32, '#B9C4D8', 'center', 600);
  for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * 0.5; ctx.beginPath(); ctx.arc(0, -190, 112 + k * 90, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = '#8FA4C8'; ctx.stroke(); ctx.restore(); }
  badgeDP(ctx, 0, -190, 110);
  text(ctx, 'Unknown', 0, -20, 56, C.white);
  text(ctx, '+91 98XXX XX210', 0, 40, 32, '#B9C4D8', 'center', 600);
  const bob = t < tp ? -16 * Math.abs(Math.sin(t * 6)) : 0, press = pulse(t, tp, 0.14);
  ctx.save(); ctx.translate(-140, 380 + (acc ? 0 : bob)); ctx.scale(1 - (acc ? 0 : 0.12 * press), 1 - (acc ? 0 : 0.12 * press)); shape(ctx, ell(0, 0, 62, 62), { fill: C.red }); handset(ctx, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(140, 380 + (acc ? bob : 0)); ctx.scale(1 - (acc ? 0.12 * press : 0), 1 - (acc ? 0.12 * press : 0)); shape(ctx, ell(0, 0, 62, 62), { fill: C.green }); camIcon(ctx, 0, 0); ctx.restore();
  text(ctx, 'Decline', -140, 472, 26, '#B9C4D8', 'center', 600); text(ctx, 'Accept', 140, 472, 26, '#B9C4D8', 'center', 600);
  if (t > tp && t < tp + 0.3) { const k = (t - tp) / 0.3; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(acc ? 140 : -140, 380, 62 + k * 120, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = acc ? C.green : C.red; ctx.stroke(); ctx.restore(); }
}
let GRAIN = null;
function paperGrain() { // static warm paper tooth, multiplied over every frame
  if (GRAIN) return GRAIN;
  const w = 540, h = 960, c = createCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), r = rng(99);
  for (let i = 0; i < w * h; i++) { const v = 238 + Math.floor(r() * 17); img.data[i * 4] = v; img.data[i * 4 + 1] = v - 2; img.data[i * 4 + 2] = v - 6; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(150,120,90,0.14)'; x.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) { const px = r() * w, py = r() * h, a = r() * Math.PI, l = 6 + r() * 14; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  GRAIN = createCanvas(W, H); const g = GRAIN.getContext('2d'); g.drawImage(c, 0, 0, W, H); g.getImageData(0, 0, 1, 1);
  return GRAIN;
}
function finish(ctx) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperGrain(), 0, 0); ctx.restore();
  vignette(ctx, 0.16);
}
function spotlight(ctx, k) { // world space: darkness closing in around Verma aunty
  const g = ctx.createRadialGradient(AU.x, AU.y + 60, 220, AU.x, AU.y + 60, 640);
  g.addColorStop(0, 'rgba(18,14,34,0)'); g.addColorStop(1, `rgba(18,14,34,${0.8 * k})`);
  ctx.fillStyle = g; ctx.fillRect(-400, -400, 1880, 2800);
}

// ================= FULL EPISODE: props + screens =================
const vaOnCall = t => { const s = mkVA({ hold: 'phone', glow: 1, look: [0, 0.7], eyes: 'open', worry: 1, mouth: 'worried', brow: 4 }); s.nod = 2 * Math.sin(t * 2); s.tilt = 0.01 * Math.sin(t * 1.4); if ((t % 3.3) > 3.2) s.eyes = 'blink'; return s; };
const paperBG = ctx => shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: C.wall, hatch: C.wallH, ha: 0.35, stroke: false });
function timerPill(ctx, x, y, str, k) { // fixed-advance digits so the pill doesn't jitter as the time changes
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  shape(ctx, rr(-250, -46, 500, 92, 46), { fill: '#FFFFFF', col: C.navy, lwk: 1.5 });
  blob(ctx, -204, 0, 11, 11, C.red); text(ctx, 'CALL', -120, 3, 46, C.navy);
  [...str].forEach((ch, i) => text(ctx, ch, -30 + i * 30, 3, 50, C.navy));
  ctx.restore();
}
function coinFly(ctx, t, t0) {
  for (let i = 0; i < 12; i++) {
    const r = rng(i * 13 + 5), d = i * 0.06, u = clamp((t - t0 - d) / 0.75); if (u <= 0 || u >= 1) continue;
    const dx = (r() - 0.5) * 760, x = 540 + dx * E.o(u), y = lerp(760, -140, E.i(u)) - 120 * Math.sin(Math.PI * u), spin = (r() - 0.5) * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * spin);
    shape(ctx, ell(0, 0, 36, 36), { fill: C.gold, hatch: dk(C.gold), ha: 0.35 }); text(ctx, '\u20B9', 0, 3, 40, dk(C.gold, 0.5));
    ctx.restore();
  }
}
function aadhaarCard(ctx, x, y, rot, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  const R = rr(-200, -125, 400, 250, 18);
  shape(ctx, rr(-190, -113, 400, 250, 18), { fill: 'rgba(10,10,20,0.3)', stroke: false });
  shape(ctx, R, { fill: '#FFFFFF', hatch: '#DDD6C8', ha: 0.2, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, R, true); ctx.clip();
  ctx.fillStyle = '#F29A38'; ctx.fillRect(-200, -125, 400, 26); ctx.fillStyle = '#3FA35B'; ctx.fillRect(-200, -91, 400, 12);
  ctx.restore(); shape(ctx, R);
  text(ctx, 'AADHAAR', 50, -52, 34, INK);
  const ph = rr(-176, -60, 110, 136, 10);
  shape(ctx, ph, { fill: '#E8EEF3', lwk: 0.7 });
  ctx.save(); ctx.beginPath(); trace(ctx, ph, true); ctx.clip(); ctx.translate(-121, 26); ctx.scale(0.42, 0.42); vaHead(ctx, mkVA({ mouth: 'flat' })); ctx.restore();
  text(ctx, 'S. Verma', -44, -4, 26, INK, 'left', 800);
  ctx.fillStyle = '#E2DED6'; ctx.fillRect(-44, 22, 150, 8); ctx.fillRect(-44, 40, 110, 8);
  text(ctx, 'XXXX XXXX 4821', 34, 96, 30, INK, 'center', 800);
  ctx.restore();
}
function pouch(ctx, x, y, rot, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const P = spl([[-50, -60], [50, -60], [56, 40], [44, 66], [-44, 66], [-56, 40]]);
  shape(ctx, P, { fill: '#F4F4F2', hatch: '#C9C9C4', ha: 0.35 });
  ctx.save(); ctx.beginPath(); trace(ctx, P, true); ctx.clip(); const r = rng(Math.round(x));
  for (let i = 0; i < 16; i++) blob(ctx, -36 + r() * 72, -6 + r() * 64, 5, 5, '#DCD8EA');
  ctx.restore(); shape(ctx, P);
  shape(ctx, rr(-54, -68, 108, 18, 6), { fill: C.red, lwk: 0.7 });
  ctx.restore();
}
function inr(n) { const s = String(n); if (s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); }
function transferScreen(ctx, t) {
  ctx.fillStyle = '#F4F6FA'; ctx.fillRect(-260, -540, 520, 1080);
  if (t < 22.5) {
    ctx.fillStyle = '#2F5BA8'; ctx.fillRect(-260, -540, 520, 170);
    text(ctx, 'Send Money', -206, -440, 46, C.white, 'left');
    shape(ctx, rr(-215, -330, 430, 150, 24), { fill: C.white, col: '#D5DCE8', lwk: 0.7 });
    badgeDP(ctx, -146, -255, 44);
    text(ctx, 'Verification A/c', -84, -280, 34, INK, 'left', 800);
    text(ctx, 'Safe Custody \u00B7 XXXX 7781', -84, -234, 24, '#8E8A84', 'left', 600);
    const k = seg(t, 21.0, 21.66, E.o), val = Math.round(1840000 * k / 1000) * 1000;
    text(ctx, 'Amount', -210, -120, 28, '#8E8A84', 'left', 700);
    text(ctx, '\u20B9 ' + inr(val), 0, -30, 86, INK);
    ctx.fillStyle = '#D5DCE8'; ctx.fillRect(-200, 30, 400, 4);
    text(ctx, 'Balance: \u20B9 18,40,215', 0, 84, 30, '#8E8A84', 'center', 600);
    if (k >= 1) { shape(ctx, rr(-150, 140, 300, 56, 28), { fill: '#FDECEA', col: C.red, lwk: 0.8 }); text(ctx, 'Saari savings', 0, 170, 28, C.red); }
    const press = pulse(t, 22.05, 0.14), s = 1 - 0.08 * press;
    ctx.save(); ctx.translate(0, 360); ctx.scale(s, s); shape(ctx, rr(-205, -56, 410, 112, 56), { fill: C.green }); text(ctx, 'Send \u20B9 18,40,000', 0, 4, 38, C.white); ctx.restore();
    if (t > 22.15) { ctx.fillStyle = 'rgba(244,246,250,0.92)'; ctx.fillRect(-260, -540, 520, 1080); ctx.save(); ctx.translate(0, -60); ctx.rotate(t * 9); ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 1.4); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = '#2F5BA8'; ctx.stroke(); ctx.restore(); text(ctx, 'Sending\u2026', 0, 60, 38, '#2F5BA8'); }
    return;
  }
  const pk = E.back(clamp((t - 22.5) / 0.3));
  ctx.save(); ctx.translate(0, -230); ctx.scale(pk, pk); shape(ctx, ell(0, 0, 100, 100), { fill: C.green }); line(ctx, [[-44, 2], [-12, 34], [48, -30]], { col: C.white, lwk: 3 }); ctx.restore();
  text(ctx, 'Money sent', 0, -60, 50, INK);
  text(ctx, '\u20B9 18,40,000', 0, 20, 64, INK);
  text(ctx, 'to Verification A/c', 0, 84, 28, '#8E8A84', 'center', 600);
  const bk = popIn(t, 23.1, 0.3);
  if (bk > 0.01) { ctx.save(); ctx.translate(0, 250); ctx.scale(bk, bk); shape(ctx, rr(-200, -52, 400, 104, 26), { fill: '#FDECEA', col: C.red, lwk: 1 }); text(ctx, 'Balance: \u20B9 215', 0, 3, 42, C.red); ctx.restore(); }
}
const SON = { skin: '#E3AE86', hair: '#2B2320', shirt: '#5D86B8' };
function sonHead(ctx, s) {
  for (const sx of [-1, 1]) { SK(ctx, ell(sx * 100, 14, 18, 24), SON.skin); line(ctx, arcP(sx * 98, 14, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 }); }
  SK(ctx, sup(0, 6, 100, 112, 2.5, 0.1), SON.skin);
  HX(ctx, spl([[-104, 4], [-112, -56], [-76, -110], [-10, -130], [60, -122], [104, -76], [106, 4], [94, -40], [52, -64], [20, -52], [-20, -70], [-70, -60], [-96, -30]]), { fill: SON.hair });
  for (const sx of [-1, 1]) blob(ctx, sx * 62, 40, 20, 11, C.blush);
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 38, -26 - s.brow); ctx.rotate(-sx * 0.08); shape(ctx, rr(-22, -5, 44, 10, 5), { fill: SON.hair, lwk: 0.6 }); ctx.restore(); }
  for (const sx of [-1, 1]) {
    const ex = sx * 38, ey = 4;
    if (s.eyes === 'happy') line(ctx, arcP(ex, ey + 6, 13, Math.PI + 0.35, 2 * Math.PI - 0.35, 12), { lwk: 1.25 });
    else { shape(ctx, ell(ex, ey, 15, 15), { fill: C.white }); blob(ctx, ex, ey + 2, 7.5, 7.5, INK); blob(ctx, ex + 2.6, ey - 1, 2.4, 2.4, C.white); }
  }
  line(ctx, spl([[2, 20], [-8, 38], [2, 46], [12, 42]], false), { lwk: 0.9 });
  const M = spl([[-34, 62], [34, 62], [26, 86], [0, 96], [-26, 86]]);
  shape(ctx, M, { fill: C.mouth, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, M, true); ctx.clip(); ctx.fillStyle = C.white; ctx.fillRect(-40, 56, 80, 12); ctx.restore();
  shape(ctx, M);
}
function sonBody(ctx, s) {
  SK(ctx, rr(-32, -44, 64, 56, 12), SON.skin);
  HX(ctx, spl([[-100, -6], [0, -12], [100, -6], [190, 40], [206, 380], [-206, 380], [-190, 40]]), { fill: SON.shirt });
  for (const sx of [-1, 1]) shape(ctx, [[sx * 4, -10], [sx * 74, -16], [sx * 46, 44]], { fill: '#EEF3F8' });
  line(ctx, [[0, 30], [0, 380]], { lwk: 0.8 }); for (const y of [80, 160, 240, 320]) blob(ctx, 10, y, 5, 5, '#F4F4F4');
  ctx.save(); ctx.translate(0, -18 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -118); sonHead(ctx, s); ctx.restore();
}
function sonCall(ctx, t) {
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#F7E6C8'); g.addColorStop(1, '#E6C293'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  shape(ctx, rr(-232, -380, 170, 230, 10), { fill: '#8FC0D4', hatch: dk('#8FC0D4'), ha: 0.3, lwk: 0.8 });
  line(ctx, [[-222, -190], [-180, -260], [-150, -220], [-110, -290], [-72, -190]], { lwk: 0.7 });
  shape(ctx, rr(110, -160, 150, 360, 8), { fill: C.wood, hatch: dk(C.wood), ha: 0.4, lwk: 0.8 });
  [['#D96B5B', 30], ['#5D86B8', 22], ['#E3B04B', 34], ['#6E9A5B', 26]].forEach(([c, w], i) => shape(ctx, rr(124 + i * 34, -140, w, 90, 4), { fill: c, lwk: 0.5 }));
  const s = { eyes: (t % 2.9) > 2.78 ? 'happy' : 'open', brow: 4, nod: 3 * Math.sin(t * 3), tilt: 0.02 * Math.sin(t * 2) };
  ctx.save(); ctx.translate(0, 168); ctx.scale(1.12, 1.12); sonBody(ctx, s); ctx.restore();
  callUI(ctx, t, fmtTimer(t - 43.6), mkVA({ eyes: 'happy', mouth: 'smile' }), 0);
  shape(ctx, rr(-110, -470, 220, 46, 23), { fill: 'rgba(0,0,0,0.35)', stroke: false }); text(ctx, 'Rahul (Beta)', 0, -446, 28, C.white);
}
function dialer(ctx, t) {
  ctx.fillStyle = '#F7F7F9'; ctx.fillRect(-260, -540, 520, 1080);
  const times = [44.96, 45.08, 45.2, 45.32], n = times.filter(x => t >= x).length, digits = '1930';
  text(ctx, digits.slice(0, n), 0, -380, 116, INK);
  const lk = popIn(t, 45.45, 0.3); if (lk > 0.01) { ctx.save(); ctx.translate(0, -290); ctx.scale(lk, lk); text(ctx, 'Cyber Crime Helpline', 0, 0, 32, C.green); ctx.restore(); }
  const keys = '123456789*0#';
  for (let i = 0; i < 12; i++) {
    const x = [-150, 0, 150][i % 3], y = -170 + 140 * Math.floor(i / 3), d = digits.indexOf(keys[i]);
    const hot = d >= 0 && t >= times[d] && t < times[d] + 0.15;
    ctx.fillStyle = hot ? '#CFE3F5' : '#E9E9EE'; ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.fill();
    text(ctx, keys[i], x, y + 3, 54, INK, 'center', 700);
  }
  const pk = 1 + 0.12 * pulse(t, 45.9, 0.3);
  ctx.save(); ctx.translate(0, 420); ctx.scale(pk, pk); ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(0, 0, 64, 0, 7); ctx.fill(); handset(ctx, 0, -4); ctx.restore();
  if (t > 45.9) { const k = ((t - 45.9) * 1.5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(0, 420, 64 + k * 90, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = C.green; ctx.stroke(); ctx.restore(); }
}
function card(ctx, x, y, w, h, rot, k, head, col, draw) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  shape(ctx, rr(-w / 2 + 12, -h / 2 + 16, w, h, 22), { fill: 'rgba(60,40,30,0.2)', stroke: false });
  const R = rr(-w / 2, -h / 2, w, h, 22);
  shape(ctx, R, { fill: '#FFFDF7', hatch: '#E4DCCC', ha: 0.2, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, R, true); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, 110); ctx.restore();
  shape(ctx, R);
  text(ctx, head, 0, -h / 2 + 58, 60, C.white);
  ctx.save(); ctx.translate(0, 50); draw(ctx); ctx.restore();
  ctx.save(); ctx.translate(0, -h / 2 - 4); ctx.rotate(-0.05); shape(ctx, rr(-70, -20, 140, 40, 4), { fill: 'rgba(240,226,180,0.85)', lwk: 0.5 }); ctx.restore();
  ctx.restore();
}
function shield(ctx, x, y, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k * 0.9, k * 0.9);
  const P = spl([[-250, -250], [0, -290], [250, -250], [240, 40], [170, 190], [0, 290], [-170, 190], [-240, 40]]);
  shape(ctx, P, { fill: '#8DB67E', hatch: dk('#8DB67E', 0.3), ha: 0.5, lwk: 1.3 });
  shape(ctx, P.map(([a, b]) => [a * 0.88, b * 0.88 - 6]), { col: '#E3F0DC', lwk: 0.8 });
  shape(ctx, ell(0, -165, 54, 54), { fill: C.white, col: '#E3F0DC', lwk: 0.8 });
  line(ctx, [[-24, -165], [-6, -145], [26, -185]], { col: C.green, lwk: 2 });
  text(ctx, 'SCAM SE', 0, -50, 76, '#F6FBF2'); text(ctx, 'BACHO', 0, 46, 110, '#F6FBF2');
  text(ctx, 'Helpline: 1930', 0, 150, 42, '#F6FBF2', 'center', 800);
  ctx.restore();
}
function icoCuffs(ctx, x, y) { for (const dx of [-24, 24]) shape(ctx, ell(x + dx, y + 6, 22, 22), { col: '#5E6472', lwk: 1.6 }); line(ctx, [[x - 4, y - 14], [x + 4, y - 14]], { col: '#5E6472', lwk: 1.6 }); }
function icoCam(ctx, x, y) { shape(ctx, rr(x - 38, y - 24, 52, 48, 10), { fill: '#5E6472', lwk: 0.6 }); shape(ctx, [[x + 16, y - 10], [x + 38, y - 22], [x + 38, y + 22], [x + 16, y + 10]], { fill: '#5E6472', lwk: 0.6 }); }
function icoCoin(ctx, x, y) { shape(ctx, ell(x, y, 32, 32), { fill: C.gold, hatch: dk(C.gold), ha: 0.35, lwk: 0.8 }); text(ctx, '\u20B9', x, y + 3, 36, dk(C.gold, 0.5)); }
function lungiLegs(ctx) { // under the table: checked lungi and rubber chappals
  const L = rr(-150, 0, 300, 230, 20);
  shape(ctx, L, { fill: '#4F7FB8', stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, L, true); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = -150; x < 150; x += 44) ctx.fillRect(x, 0, 14, 230); for (let y = 0; y < 230; y += 44) ctx.fillRect(-150, y, 300, 14);
  ctx.restore(); shape(ctx, L);
  for (const sx of [-1, 1]) {
    SK(ctx, rr(sx * 70 - 26, 214, 52, 56, 20), C.oSkin);
    shape(ctx, spl([[sx * 70 - 48, 268], [sx * 70 + 48, 268], [sx * 70 + 42, 290], [sx * 70 - 42, 290]]), { fill: '#3E7FD0' });
    line(ctx, [[sx * 70 - 20, 244], [sx * 70, 268], [sx * 70 + 20, 244]], { col: '#3E7FD0', lwk: 1.6 });
  }
}
// ================= FULL EPISODE: shots from 9.82 s =================
function shotParcel(ctx, t) { // "Aadhaar pe ek parcel pakda gaya. Drugs ke saath."
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3C4A6B'); g.addColorStop(1, '#232C44'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  shape(ctx, [[-40, 1180], [1120, 1180], [1120, 2000], [-40, 2000]], { fill: '#8D9AAE', hatch: '#6B7890', ha: 0.4 });
  const lg = ctx.createRadialGradient(540, 980, 60, 540, 1000, 700); lg.addColorStop(0, 'rgba(255,236,190,0.5)'); lg.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 300, W, 1400);
  if (t > 11.58) for (let i = 0; i < 3; i++) { const k = ((t - 11.58) * 1.4 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * 0.6; shape(ctx, ell(540, 980, 330 + 280 * k, 330 + 280 * k, 80), { col: C.red, lwk: 1.3 }); ctx.restore(); }
  const drop = E.back(clamp((t - 9.84) / 0.3)), op = E.back(clamp((t - 11.58) / 0.25));
  ctx.save(); ctx.translate(540, 1000 + lerp(-600, 0, drop)); ctx.scale(1.25, 1.25);
  shape(ctx, ell(0, 196, 330, 30), { fill: 'rgba(10,10,20,0.35)', stroke: false });
  if (op > 0) for (const sx of [-1, 1]) shape(ctx, [[sx * 20, -120], [sx * 290, -120], [sx * (290 + 50 * op), -120 - 130 * op], [sx * (20 + 20 * op), -120 - 150 * op]], { fill: '#C99A62', hatch: '#9C7446', ha: 0.4 });
  shape(ctx, rr(-290, -120, 580, 310, 10), { fill: '#D6A76D', hatch: '#A77B48', ha: 0.45 });
  if (op <= 0) { shape(ctx, rr(-296, -150, 592, 38, 8), { fill: '#C99A62', hatch: '#9C7446', ha: 0.4 }); shape(ctx, rr(-40, -150, 80, 150, 4), { fill: 'rgba(214,204,176,0.85)', lwk: 0.6 }); }
  shape(ctx, rr(-240, -64, 310, 206, 10), { fill: '#FFFFFF', hatch: '#DDDDDD', ha: 0.2, lwk: 0.9 });
  text(ctx, 'EXPRESS PARCEL', -85, -34, 26, INK);
  ctx.fillStyle = INK; for (let i = 0; i < 26; i++) ctx.fillRect(-214 + i * 9.6, -6, i % 3 ? 4 : 6, 54);
  text(ctx, 'ID: AADHAAR \u2026 4821', -85, 98, 24, C.red, 'center', 800);
  for (const dx of [150, 214]) { line(ctx, [[dx, 120], [dx, 30]], { lwk: 1.2 }); line(ctx, [[dx - 18, 52], [dx, 30], [dx + 18, 52]], { lwk: 1.2 }); }
  ctx.restore();
  if (op > 0) [[-20, -360, -0.3, 0], [120, -450, 0.15, 0.06], [250, -330, 0.4, 0.12]].forEach(([dx, dy, r, d]) => { const k = E.o(clamp((t - 11.6 - d) / 0.35)); if (k > 0) pouch(ctx, 540 + dx * k, 880 + dy * k, r * k, 0.6 + 0.7 * k); });
  const ak = E.o(clamp((t - 9.98) / 0.35));
  aadhaarCard(ctx, lerp(540, 270, ak), lerp(1000, 430, ak), -0.1, popIn(t, 9.98, 0.3) * 0.8);
  stamp(ctx, 560, 1070, 'SEIZED', clamp((t - 10.84) / 0.14), C.red, -0.14);
}
function shotOrders(ctx, t) { // "Aap digital arrest mein ho. Camera band mat karna."
  phoneRig(ctx, t, { z: 1.3 + 0.03 * seg(t, 12.72, 15.4, x => x), target: 790,
    screen: c => videoCall(c, t, ofState(t), { pip: t > 14.2 ? clamp((t - 14.2) / 0.25) : 0 }),
    top: c => { const k = clamp((t - 13.1) / 0.14); if (k > 0) { c.save(); c.translate(0, 300); c.scale(0.72, 0.72); stamp(c, 0, 0, 'DIGITAL ARREST', k, C.red, -0.12); c.restore(); } } });
}
function shotSecret(ctx, t) { // "Kisi ko batana mat." — she looks at her son's photo; it gets crossed out
  const va = vaOnCall(t); va.look = [1, -0.7]; va.fx = 0.35;
  drawRoomScene(ctx, { z: 1.55, cx: 700, cy: 690 }, { dusk: true, lamp: true, night: 0.1, clockMin: 470, va, cup: true, dim: 0.25,
    extra: c => { penPath(c, [[790, 432], [920, 578]], seg(t, 15.8, 15.98, E.o), C.red, 13); penPath(c, [[920, 432], [790, 578]], seg(t, 15.94, 16.12, E.o), C.red, 13); } }, t);
}
function shotHours(ctx, t) { // "Ghanton tak call chalta raha." — time-lapse into night
  const k = seg(t, 16.6, 18.4, E.io), va = vaOnCall(t);
  if (t > 17.2) { va.eyes = 'tired'; va.nod = 8; va.tilt = 0.04; va.mouth = 'flat'; }
  drawRoomScene(ctx, { z: 1.0 + 0.04 * seg(t, 16.6, 18.5, x => x), cx: 540, cy: 930 }, { dusk: true, lamp: true, night: k, clockMin: 458 + 227 * k, va, cup: true, dim: 0.2 + 0.5 * k }, t);
  timerPill(ctx, 540, 380, fmtTimer(callTime(t)), popIn(t, 16.72));
}
function shotLastWord(ctx, t) { // "Phir aakhri baat:" — push in, he leans toward the camera
  const k = seg(t, 18.5, 19.4, E.io);
  phoneRig(ctx, t, { z: lerp(1.3, 1.75, k), target: lerp(790, 667, k), vig: seg(t, 18.5, 19.2), screen: c => videoCall(c, t, ofState(t), { lean: seg(t, 18.6, 19.3, E.io) }) });
}
function shotTransfer(ctx, t) { // "Verification ke liye saara paisa is account mein bhejo..."
  phoneRig(ctx, t, { z: 1.3, target: 790, screen: c => transferScreen(c, t), after: c => coinFly(c, t, 22.1) });
}
function shotStage(ctx, t) { // "Na woh officer asli tha, na woh case." — pull back from the call to the real set
  const pull = seg(t, 23.7, 24.45, E.io), z = lerp(2.3, 1.0, pull), cy = lerp(850, 960, pull);
  view.z = z; ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-540, -cy);
  shape(ctx, [[-300, -400], [1380, -400], [1380, 1500], [-300, 1500]], { fill: '#A9B79F', hatch: '#7F8E76', ha: 0.4, stroke: false });
  for (const [x, y, r] of [[170, 900, 120], [930, 420, 90], [880, 1240, 140]]) blob(ctx, x, y, r, r * 0.7, 'rgba(90,100,70,0.22)');
  line(ctx, [[980, 700], [950, 780], [990, 840], [960, 930]], { col: '#6F7C66', lwk: 0.8 });
  shape(ctx, [[-300, 1500], [1380, 1500], [1380, 2400], [-300, 2400]], { fill: '#7E7468', hatch: '#5E564C', ha: 0.4 });
  const tl = ctx.createRadialGradient(540, 180, 20, 540, 180, 520); tl.addColorStop(0, 'rgba(240,255,235,0.35)'); tl.addColorStop(1, 'rgba(240,255,235,0)'); ctx.fillStyle = tl; ctx.fillRect(0, -300, 1080, 1000);
  shape(ctx, rr(300, 160, 480, 26, 12), { fill: '#F8F6E6', lwk: 0.8 });
  // the "HQ" banner: the right tape gives way and it swings down
  const fall = t < 24.1 ? 0 : E.o(clamp((t - 24.1) / 0.5)), swing = t > 24.6 ? 0.07 * Math.sin((t - 24.6) * 9) * Math.exp(-(t - 24.6) * 3) : 0;
  ctx.save(); ctx.translate(240, 372); ctx.rotate(0.62 * fall + swing);
  shape(ctx, rr(0, 0, 600, 190, 6), { fill: '#F4F1E8', hatch: '#CFC8B8', ha: 0.3, lwk: 0.9 });
  text(ctx, 'CYBER CRIME HQ', 300, 80, 70, C.navy); text(ctx, 'INVESTIGATION CELL', 300, 146, 32, '#6A7590', 'center', 700);
  for (const [a, b, c2, d] of [[90, 30, 150, 170], [330, 20, 380, 160], [500, 40, 540, 180]]) line(ctx, [[a, b], [c2, d]], { col: '#D2CABA', lwk: 0.6 });
  ctx.restore();
  for (const [x, r] of [[240, -0.4], [840, 0.35]]) { ctx.save(); ctx.translate(x, 372); ctx.rotate(r); shape(ctx, rr(-34, -14, 68, 28, 3), { fill: 'rgba(236,222,176,0.9)', lwk: 0.5 }); ctx.restore(); }
  // ring light + phone on a tripod: the "camera"
  line(ctx, [[960, 700], [960, 1500]], { lwk: 1.2 }); for (const dx of [-60, 60]) line(ctx, [[960, 1380], [960 + dx, 1500]], { lwk: 1.2 });
  ctx.save(); ctx.shadowColor = 'rgba(255,255,240,0.9)'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(960, 640, 90, 0, 7); ctx.lineWidth = 22; ctx.strokeStyle = '#FFFFF4'; ctx.stroke(); ctx.restore();
  shape(ctx, ell(960, 640, 101, 101), { lwk: 0.7 }); shape(ctx, ell(960, 640, 79, 79), { lwk: 0.7 });
  shape(ctx, rr(935, 590, 50, 96, 8), { fill: C.phone });
  // the "officer": uniform on top, lungi below the table
  ctx.save(); ctx.translate(540, 1330); ctx.scale(1.15, 1.15); lungiLegs(ctx); ctx.restore();
  ctx.save(); ctx.translate(540, 1010); ctx.scale(1.15, 1.15);
  ofBody(ctx, { talk: 0, blink: (t % 2.7) > 2.6, look: [t > 24.1 ? -0.8 : 0.4, 0], nod: 2 * Math.sin(t * 2), tilt: t > 24.1 ? -0.04 : 0 }); ctx.restore();
  HX(ctx, rr(150, 1296, 780, 44, 10), { fill: '#D9543F' });
  for (const x of [190, 860]) HX(ctx, rr(x, 1340, 30, 200, 6), { fill: '#C4472F' });
  shape(ctx, rr(214, 1244, 230, 56, 6), { fill: '#E8C27A', hatch: dk('#E8C27A'), ha: 0.35, lwk: 0.8 }); shape(ctx, rr(234, 1230, 80, 20, 4), { fill: '#E8C27A', lwk: 0.6 });
  text(ctx, 'CASE FILE', 329, 1274, 26, '#6B4E24');
  shape(ctx, [[742, 1296], [790, 1296], [796, 1216], [736, 1216]], { fill: 'rgba(214,170,110,0.85)', lwk: 0.7 });
  ctx.restore(); view.z = 1;
  stamp(ctx, 540, 640, 'NAKLI OFFICER', clamp((t - 24.46) / 0.14), C.red, -0.1);
  const ck = clamp((t - 25.62) / 0.14); if (ck > 0) { ctx.save(); ctx.translate(340, 1180); ctx.scale(0.65, 0.65); stamp(ctx, 0, 0, 'NAKLI CASE', ck, C.red, 0.08); ctx.restore(); }
}
function shotFear(ctx, t) { // "Bas darr asli tha." — alone in the dark
  const va = mkVA({ hold: 'phone', glow: 0.5, eyes: 'open', look: [0, 0.9], worry: 1, mouth: 'worried', brow: 6 });
  va.nod = 6 + 1.5 * Math.sin(t * 1.6); if ((t % 3.3) > 3.2) va.eyes = 'blink';
  drawRoomScene(ctx, { z: lerp(1.3, 1.5, seg(t, 25.92, 28.3, x => x)), cx: 540, cy: 850 }, { dusk: true, lamp: false, night: 1, clockMin: 700, va, cup: true, dim: 0.75, spot: 0.85 }, t);
}
function shotChaal(ctx, t) { // "Chaal simple hai: darr aur akelapan."
  paperBG(ctx);
  // the trick as a picture: a phone with a police badge dangling as bait on a fish hook
  const drop = E.back(clamp((t - 28.3) / 0.45)), up = seg(t, 29.4, 29.75, E.io);
  if (up < 1) {
    ctx.save(); ctx.translate(540, lerp(-900, 0, drop) - 1000 * up); ctx.rotate(0.1 * Math.sin((t - 28.3) * 2.6));
    line(ctx, [[0, -60], [0, 700]], { lwk: 0.9 });
    ctx.save(); ctx.translate(-40, 890); ctx.rotate(0.12); ctx.scale(1.3, 1.3);
    shape(ctx, rr(-80, -40, 160, 280, 22), { fill: C.phone });
    ctx.fillStyle = '#1E2A44'; ctx.beginPath(); trace(ctx, rr(-66, -26, 132, 252, 14), true); ctx.fill();
    badgeDP(ctx, 0, 70, 44); text(ctx, 'POLICE', 0, 150, 26, C.white);
    ctx.restore();
    line(ctx, [[0, 700], [0, 850], ...arcP(-40, 850, 40, 0, Math.PI, 12), [-80, 812]], { lwk: 1.4, col: '#5E6472' });
    line(ctx, [[-80, 812], [-66, 828]], { lwk: 1.4, col: '#5E6472' });
    ctx.restore();
  }
  const mv = seg(t, 29.3, 29.6, E.io); // label lands big under the hook, then makes room for the cards
  chip(ctx, 540, lerp(1360, 470, mv), 'CHAAL', popIn(t, 28.46) * lerp(1.5, 1, mv), C.red, 70);
  card(ctx, 290, 1020, 400, 560, -0.06, popIn(t, 29.62, 0.32), 'DARR', C.red, c => {
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -0.4 : Math.PI + 0.4) + sx * (i - 1) * 0.4; line(c, [[Math.cos(a) * 140, -10 + Math.sin(a) * 140], [Math.cos(a) * 172, -10 + Math.sin(a) * 172]], { lwk: 1.2 }); }
    c.save(); c.scale(0.9, 0.9); vaHead(c, mkVA({ eyes: 'wide', mouth: 'o', worry: 1, brow: 10, sweat: 0.5 })); c.restore();
  });
  const pk = popIn(t, 30.3, 0.25); if (pk > 0.01) { ctx.save(); ctx.translate(540, 1020); ctx.scale(pk, pk); text(ctx, '+', 0, 0, 120, INK); ctx.restore(); }
  card(ctx, 790, 1020, 400, 560, 0.05, popIn(t, 30.54, 0.32), 'AKELAPAN', C.navy, c => {
    const B = rr(-170, -150, 340, 330, 20);
    c.save(); c.beginPath(); trace(c, B, true); c.clip(); c.fillStyle = '#2B2944'; c.fillRect(-170, -150, 340, 330);
    const lg = c.createRadialGradient(0, 10, 30, 0, 10, 200); lg.addColorStop(0, 'rgba(255,230,170,0.55)'); lg.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = lg; c.fillRect(-170, -150, 340, 330);
    c.translate(0, 20); c.scale(0.78, 0.78); vaHead(c, mkVA({ eyes: 'open', look: [0, 0.9], worry: 1, mouth: 'worried', brow: 6 })); c.restore();
    shape(c, B, { lwk: 0.8 });
  });
}
function shotAlone(ctx, t) { // "Aap kisi se pooch hi nahi paate."
  const va = mkVA({ hold: 'phone', glow: 0.6, eyes: 'open', look: [0.9, -0.6], fx: 0.3, worry: 1, mouth: 'worried', brow: 4 });
  va.nod = 2 * Math.sin(t * 1.8);
  drawRoomScene(ctx, { z: 1.0, cx: 540, cy: 900 }, { dusk: true, lamp: false, night: 1, clockMin: 700, va, cup: true, dim: 0.7, spot: 1,
    extra: c => {
      const p0 = [630, 700], p1 = [800, 560], k = seg(t, 31.6, 32.3, x => x);
      if (k > 0) { c.save(); c.setLineDash([18, 14]); c.lineCap = 'round'; c.lineWidth = 6; c.strokeStyle = '#FFE9A8'; c.beginPath(); c.moveTo(...p0); c.lineTo(...lerp2(p0, p1, k)); c.stroke(); c.restore(); }
      const m = lerp2(p0, p1, 0.5);
      penPath(c, [[m[0] - 30, m[1] - 30], [m[0] + 30, m[1] + 30]], seg(t, 32.6, 32.75, E.o), C.red, 12);
      penPath(c, [[m[0] + 30, m[1] - 30], [m[0] - 30, m[1] + 30]], seg(t, 32.7, 32.85, E.o), C.red, 12);
    } }, t);
}
function shotRule(ctx, t) { // "Rule yaad rakhiye..." — three struck-out myths
  paperBG(ctx);
  const mv = seg(t, 34.2, 34.5, E.io), bk = popIn(t, 34.25, 0.35);
  if (bk > 0.01) {
  ctx.save(); ctx.translate(540, 1020); ctx.scale(bk, bk); ctx.translate(-540, -1020);
  shape(ctx, rr(126, 546, 860, 980, 30), { fill: 'rgba(60,40,30,0.18)', stroke: false });
  const B = rr(110, 530, 860, 980, 30);
  shape(ctx, B, { fill: '#FFFDF7', hatch: '#E4DCCC', ha: 0.2, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, B, true); ctx.clip(); ctx.lineWidth = 3;
  ctx.strokeStyle = '#CFE0EC'; for (let y = 640; y < 1500; y += 86) { ctx.beginPath(); ctx.moveTo(110, y); ctx.lineTo(970, y); ctx.stroke(); }
  ctx.strokeStyle = '#F0B3AA'; ctx.beginPath(); ctx.moveTo(210, 530); ctx.lineTo(210, 1510); ctx.stroke(); ctx.restore();
  shape(ctx, B);
  ctx.save(); ctx.translate(540, 534); ctx.rotate(-0.04); shape(ctx, rr(-80, -22, 160, 44, 4), { fill: 'rgba(240,226,180,0.85)', lwk: 0.5 }); ctx.restore();
  [[34.68, 37.3, 'Digital arrest', icoCuffs], [38.0, 39.3, 'Video call pe arrest', icoCam], [40.06, 41.1, 'Paise ki maang', icoCoin]].forEach(([a, x, str, ico], i) => {
    const y = 760 + i * 260, k = popIn(t, a, 0.3); if (k <= 0.01) return;
    ctx.save(); ctx.translate(300, y); ctx.scale(k, k); shape(ctx, ell(0, 0, 70, 70), { fill: '#EEF1F4', lwk: 1 }); ico(ctx, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k); text(ctx, str, 400, y, 54, INK, 'left'); ctx.restore();
    ctx.font = '800 54px Baloo'; const w = ctx.measureText(str).width;
    penPath(ctx, [[392, y + 4], [404 + w, y - 4]], seg(t, x, x + 0.3, E.o), C.red, 10);
    penPath(ctx, [[252, y - 48], [348, y + 48]], seg(t, x + 0.1, x + 0.25, E.o), C.red, 14);
    penPath(ctx, [[348, y - 48], [252, y + 48]], seg(t, x + 0.2, x + 0.35, E.o), C.red, 14);
  });
  ctx.restore();
  }
  chip(ctx, 540, lerp(900, 330, mv), 'RULE', popIn(t, 33.4) * lerp(1.6, 1, mv), C.green, 70);
}
function shotDecline(ctx, t) { // "Aisa call aaye? Call kaato."
  const ringing = t < 42.96, b = ringing ? BUZZ((t - 41.7) % 1.1) : 0;
  phoneRig(ctx, t, { z: 1.05, target: 820, buzz: b, shake: b ? 4 * Math.sin(t * 95) : 0, screen: c => {
    incoming(c, t, 'decline');
    const e = seg(t, 43.12, 43.3);
    if (e > 0) { c.save(); c.globalAlpha = e; c.fillStyle = '#141C2B'; c.fillRect(-260, -540, 520, 1080); shape(c, ell(0, -80, 80, 80), { fill: C.red }); handset(c, 0, -80); text(c, 'Call declined', 0, 60, 48, C.white); c.restore(); }
  } });
}
function shotFamily(ctx, t) { // "Ghar walon ko batao."
  phoneRig(ctx, t, { z: 1.2, target: 800, screen: c => sonCall(c, t), after: c => starsAround(c, [[170, 420, 1.1], [910, 480, 0.9], [900, 900, 1.2]], popIn(t, 43.8, 0.3) * (1 - seg(t, 44.5, 44.8))) });
}
function shotHelpline(ctx, t) { // "1930 pe report karo."
  phoneRig(ctx, t, { z: 1.15, target: 810, screen: c => dialer(c, t) });
}
function shotNextTime(ctx, t) { // "Toh agli baar vardi video call pe dikhe... call kaato. Scam se bacho. Simple."
  const push = seg(t, 49.6, 50.3, E.io);
  const va = mkVA({ hold: 'cup', eyes: 'open', look: [-0.5, 1], brow: 7, mouth: 'flat', fx: -0.2, tilt: -0.03 });
  va.nod = 2 * Math.sin(t * 2);
  if (t > 48.8) { va.eyes = 'happy'; va.mouth = 'smile'; va.look = [0, 0]; va.fx = 0; va.brow = 0; }
  if (t > 49.7) { va.mouth = 'bigsmile'; va.nod = 6 * pulse(t, 50.82, 0.5) + 2 * Math.sin(t * 2); va.tilt = 0.03 * Math.sin(t * 1.6); }
  const ring = t > 46.7 && t < 48.64, buzz = ring ? (((t - 46.7) % 0.6) < 0.4 ? 1 : 0) : 0;
  drawRoomScene(ctx, { z: lerp(1.06, 1.28, push), cx: 540, cy: lerp(930, 860, push) }, { dusk: false, lamp: false, clockMin: 262, va, cup: false, phoneBuzz: buzz,
    extra: c => {
      const k = popIn(t, 48.64, 0.25) * (1 - seg(t, 49.4, 49.6));
      if (k > 0.01) { c.save(); c.translate(350, 1252); c.scale(k, k); shape(c, ell(0, 0, 52, 52), { fill: C.red }); handset(c, 0, 0); c.restore(); }
      if (t > 48.64 && t < 48.95) { const r = (t - 48.64) / 0.31; c.save(); c.globalAlpha = 1 - r; c.beginPath(); c.arc(350, 1252, 52 + r * 90, 0, 7); c.lineWidth = 6; c.strokeStyle = C.red; c.stroke(); c.restore(); }
    } }, t);
  const ck = popIn(t, 46.8) * (1 - seg(t, 49.4, 49.6)); if (ck > 0.01) chip(ctx, 540, 250, 'AGLI BAAR', ck, C.navy, 56);
  shield(ctx, 540, 410, popIn(t, 49.72, 0.35) * 0.8);
  if (t > 50.82) starsAround(ctx, [[210, 300, 1.2], [870, 280, 1.0], [890, 640, 1.3], [190, 620, 0.9]], popIn(t, 50.82, 0.3));
}

// ================= EDIT =================
const CUTS = [2.8, 6.66, 8.2, 9.82, 12.72, 15.4, 16.6, 18.5, 20.1, 23.7, 25.92, 28.3, 31.4, 33.3, 41.7, 43.6, 44.9, 46.6];
const SHOTS = [[9.82, shotParcel], [12.72, shotOrders], [15.4, shotSecret], [16.6, shotHours], [18.5, shotLastWord], [20.1, shotTransfer], [23.7, shotStage],
  [25.92, shotFear], [28.3, shotChaal], [31.4, shotAlone], [33.3, shotRule], [41.7, shotDecline], [43.6, shotFamily], [44.9, shotHelpline], [46.6, shotNextTime]];
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); view.z = 1;
  ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H); // never let a previous frame show through
  let c0 = -9; for (const c of CUTS) if (t >= c) c0 = c;
  const p = 1 + 0.035 * (1 - E.o(clamp((t - c0) / 0.45))); // each cut lands with a small settling push
  ctx.translate(540, 960); ctx.scale(p, p); ctx.translate(-540, -960);
  if (t < 2.8) shotCall(ctx, t);
  else if (t < 6.3) shotArrest(ctx, t, t, false);
  else if (t < 6.66) { shotArrest(ctx, t, lerp(6.3, 2.9, seg(t, 6.3, 6.66, E.io)), true); rewindFX(ctx, t); }
  else if (t < 8.2) shotBefore(ctx, t);
  else if (t < 9.82) shotOfficer(ctx, t);
  else { let fn = SHOTS[0][1]; for (const [a, f] of SHOTS) if (t >= a) fn = f; fn(ctx, t); }
}

// ================= CAPTIONS =================
// {word} = yellow keyword, <word> = red danger word
const CAPS = [
  [0.0, 1.24, 'Video call aaya.'], [1.34, 2.78, 'Saamne police ki vardi.'],
  [2.88, 3.76, 'Aur Verma aunty'], [3.78, 5.02, 'apne hi ghar mein'], [5.04, 6.3, '<arrest> ho gayi.'],
  [6.66, 8.1, 'Ek recreation dekhiye.'],
  [8.24, 9.72, '"Main {CBI} se bol raha hoon.'], [9.82, 11.45, '{Aadhaar} pe ek parcel pakda gaya,'], [11.58, 12.7, '<drugs> ke saath."'],
  [12.82, 14.12, '"Aap {digital arrest} mein ho.'], [14.2, 15.36, 'Camera band mat karna.'], [15.42, 16.55, 'Kisi ko batana mat."'],
  [16.74, 18.4, 'Ghanton tak call chalta raha.'], [18.62, 20.0, 'Phir aakhri baat:'],
  [20.18, 21.0, '"Verification ke liye'], [21.0, 21.66, 'saara <paisa>'], [21.66, 22.5, 'is account mein bhejo.'], [22.58, 23.7, 'Baad mein wapas mil jayega."'],
  [23.82, 25.2, 'Na woh officer asli tha,'], [25.3, 25.92, 'na woh case.'], [25.92, 28.3, 'Bas {darr} asli tha.'],
  [28.46, 29.55, 'Chaal simple hai:'], [29.62, 31.3, '{darr} aur {akelapan}.'], [31.48, 33.25, 'Aap kisi se pooch hi nahi paate.'],
  [33.4, 34.6, '{Rule} yaad rakhiye:'], [34.68, 36.0, '"{Digital arrest}" naam ki'], [36.0, 37.9, 'koi cheez hoti hi <nahi>.'],
  [38.0, 39.9, 'Police video call pe arrest nahi karti,'], [40.06, 41.8, 'aur <paisa> kabhi nahi maangti.'],
  [41.94, 42.9, 'Aisa call aaye?'], [42.96, 43.7, '{Call kaato.}'], [43.78, 44.9, 'Ghar walon ko batao.'], [44.96, 46.55, '{1930} pe report karo.'],
  [46.72, 47.56, 'Toh agli baar vardi'], [47.56, 48.55, 'video call pe dikhe\u2026'], [48.64, 49.6, '{call kaato.}'],
  [49.7, 50.75, 'Scam se bacho.'], [50.82, 52.4, '{Simple.}'],
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
    ctx.font = '800 76px Baloo'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    const toks = []; for (const [str, col] of parseCap(s)) for (const w of str.split(/(\s+)/)) if (w) toks.push([w, col]);
    const sp = ctx.measureText(' ').width + 12; // wider word gaps: the thick outline otherwise closes them up
    const ws = toks.map(([w]) => /^\s+$/.test(w) ? sp : ctx.measureText(w).width), tot = ws.reduce((x, y) => x + y, 0);
    const fit = Math.min(1, 960 / tot); ctx.scale(fit, fit);
    for (const pass of [0, 1, 2]) {
      let x = -tot / 2;
      toks.forEach(([w, col], i) => {
        if (!/^\s+$/.test(w)) {
          if (pass === 0) { ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(43,37,34,0.3)'; ctx.strokeText(w, x, 7); }
          else if (pass === 1) { ctx.lineWidth = 13; ctx.strokeStyle = INK; ctx.strokeText(w, x, 0); }
          else { ctx.fillStyle = col; ctx.fillText(w, x, 0); }
        }
        x += ws[i];
      });
    }
    ctx.restore();
  }
}

// ================= OUTPUT =================
const out = createCanvas(W, H), octx = out.getContext('2d');
function renderFrame(f) { const t = f / FPS; renderScene(octx, t); octx.setTransform(1, 0, 0, 1, 0, 0); finish(octx); captions(octx, t); }
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
