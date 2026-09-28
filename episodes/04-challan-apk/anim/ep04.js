// Episode 04 — fake e-challan APK. Paper-doll storybook style (lib/doll.js), FishyFiles end card (lib/cta.js).
// Usage: node ep04.js all [seconds] | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node ep04.js 30,150,240       -> PNG stills in anim/out/
const fs = require('fs'), path = require('path');
const D = require('../../../lib/doll.js');
const { drawCTA } = require('../../../lib/cta.js');
const { createCanvas, INK, view, clamp, lerp, lerp2, E, seg, pulse, rng, dk, mix, shape, line, ell, arcP, rr, sup, spl, blob, text, sleeve, hand, armPose, HX, SK, trace, chip, stamp, penPath, penEllipse, star, starsAround } = D;

const W = 1080, H = 1920, FPS = 30;
const CTA_AT = 64.2;
const C = {
  wall: '#DCE6E4', wallH: '#B9CAC6', floor: '#C9A57E', wood: '#B9855A', woodTop: '#CC9A6E', woodDk: '#9A6B45', white: '#FFFFFF',
  skin: '#E2AE84', hair: '#2A211D', tee: '#E27B55', teeDk: '#C4623F', stripe: '#F6EBDD', jeans: '#3E5378',
  helmet: '#D54B40', visor: '#2F3440', mouth: '#8C2F2A', tongue: '#E27D72', blush: 'rgba(238,150,135,0.55)',
  red: '#D54B40', green: '#3FA35B', greenLt: '#E4F3E7', navy: '#2C3A5A', gold: '#E2B246', phone: '#2E2E33', ui: '#8E8A84',
  wa: '#1F7A6C', waBg: '#ECE5DA', blanket: '#6E8FC4', blanket2: '#F1D27A', pillow: '#F7F1E6', bank: '#2F5BA8',
};
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));

// ---------- shared bits ----------
function star5(ctx, x, y, r, fill) {
  const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; p.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  shape(ctx, p, { fill, lwk: 0.55 });
}
function ringArcs(ctx, x, y, t, k, dir) { // "buzz" marks beside a vibrating phone
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  for (let i = 0; i < 2; i++) line(ctx, arcP(x, y, 26 + i * 22 + 4 * Math.sin(t * 30), dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7, 10), { lwk: 1.1 });
  ctx.restore();
}
function handset(ctx, x, y) { ctx.save(); ctx.beginPath(); ctx.arc(x, y + 10, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = C.white; ctx.stroke(); ctx.restore(); }
function wheelIcon(ctx, x, y, r, col) { // steering wheel: the fake app's "official" mark
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, 7); ctx.fillStyle = col; ctx.fill();
  for (const a of [Math.PI / 2, Math.PI * 7 / 6, -Math.PI / 6]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  ctx.restore();
}
function badgeDP(ctx, x, y, r) { shape(ctx, ell(x, y, r, r), { fill: C.navy, col: C.gold, lwk: 1.1 }); shape(ctx, ell(x, y, r * 0.76, r * 0.76), { col: C.gold, lwk: 0.6 }); wheelIcon(ctx, x, y, r * 0.42, C.gold); }
function appIcon(ctx, x, y, s) { // "RTO Challan" app icon
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, rr(-60, -60, 120, 120, 30), { fill: C.navy, col: INK, lwk: 0.9 });
  shape(ctx, rr(-60, 24, 120, 36, 0).map(([a, b]) => [a, Math.min(b, 60)]), { fill: C.gold, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-60, -60, 120, 120, 30), true); ctx.clip(); ctx.fillStyle = C.gold; ctx.fillRect(-60, 30, 120, 30); ctx.restore();
  shape(ctx, rr(-60, -60, 120, 120, 30), { lwk: 0.9 });
  wheelIcon(ctx, 0, -8, 28, C.white);
  ctx.restore();
}
function apkIcon(ctx, x, y, s) { // document with a folded corner and an APK badge
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, [[-52, -66], [26, -66], [52, -40], [52, 66], [-52, 66]], { fill: '#FFFFFF', hatch: '#D6D2CA', ha: 0.2 });
  shape(ctx, [[26, -66], [26, -40], [52, -40]], { fill: '#DAD5CC', lwk: 0.7 });
  shape(ctx, rr(-40, 10, 80, 38, 10), { fill: '#3DAA6A', lwk: 0.7 }); text(ctx, 'APK', 0, 30, 26, '#FFFFFF');
  for (const yy of [-38, -22]) { ctx.fillStyle = '#DAD5CC'; ctx.fillRect(-36, yy, 50, 7); }
  ctx.restore();
}
function vignette(ctx, a) {
  const g = ctx.createRadialGradient(540, 900, 520, 540, 960, 1250);
  g.addColorStop(0, 'rgba(40,24,20,0)'); g.addColorStop(1, `rgba(40,24,20,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
const paperBG = ctx => shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: '#F1E4CD', hatch: '#D9C3A0', ha: 0.35, stroke: false });
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
function stopwatch(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.08 * Math.sin(t * 30));
  shape(ctx, rr(-16, -r - 30, 32, 28, 6), { fill: C.red });
  shape(ctx, ell(0, 0, r, r), { fill: '#FFFFFF' });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, [[Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76], [Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88]], { lwk: 0.6 }); }
  const a = t * 9 - Math.PI / 2; line(ctx, [[0, 0], [Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68]], { col: C.red, lwk: 1.3 });
  blob(ctx, 0, 0, 8, 8, INK);
  ctx.restore();
}
function inr(n) { const s = String(n); if (s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); }

// ================= ROHAN =================
// Mid-20s rider: round face, tall quiff, thick brows, light stubble, coral long-sleeve tee with a cream chest stripe.
const mkRo = o => ({ fx: 0, look: [0, 0.3], eyes: 'open', mouth: 'smile', brow: 0, worry: 0, raise: 0, sweat: 0, glow: 0, nod: 0, tilt: 0, hold: 'desk', ...o });
function roHead(ctx, s) {
  const fx = s.fx * 12;
  for (const sx of [-1, 1]) {
    const ex = sx * 104 - s.fx * 5;
    SK(ctx, ell(ex, 14, 18, 25), C.skin);
    line(ctx, arcP(ex - sx * 2, 14, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  const face = sup(0, 6, 104, 112, 2.4, 0.08);
  SK(ctx, face, C.skin);
  const r = rng(41); ctx.fillStyle = 'rgba(42,33,29,0.22)'; // light stubble
  for (let i = 0; i < 34; i++) { const a = 0.45 + r() * 2.25, d = 0.8 + r() * 0.14; ctx.beginPath(); ctx.arc(fx * 0.5 + Math.cos(a) * 88 * d, 22 + Math.sin(a) * 88 * d, 1.9, 0, 7); ctx.fill(); }
  HX(ctx, spl([[-110, 6], [-116, -52], [-90, -104], [-40, -128], [10, -140], [52, -168], [96, -150], [104, -112], [112, -60], [110, 6], [98, -34], [62, -58], [24, -46], [-16, -62], [-60, -52], [-96, -26]], true, 5), { fill: C.hair });
  line(ctx, spl([[18, -128], [52, -154], [86, -142]], false), { col: '#5A4A42', lwk: 0.8 });
  for (const sx of [-1, 1]) blob(ctx, sx * 64 + fx, 42, 21, 12, C.blush);
  for (const sx of [-1, 1]) { // brows: worry tilts both, raise lifts one (the smirk)
    const up = s.brow + (sx > 0 ? s.raise * 10 : 0);
    ctx.save(); ctx.translate(sx * 40 + fx, -30 - up); ctx.rotate(sx * 0.24 * s.worry - (sx > 0 ? s.raise * 0.15 : 0));
    shape(ctx, rr(-25, -7, 50, 14, 7), { fill: C.hair, lwk: 0.6 }); ctx.restore();
  }
  for (const sx of [-1, 1]) {
    const ex = sx * 40 + fx, ey = 4, e = s.eyes;
    if (e === 'happy') line(ctx, arcP(ex, ey + 6, 13, Math.PI + 0.35, 2 * Math.PI - 0.35, 12), { lwk: 1.25 });
    else if (e === 'sleep') line(ctx, arcP(ex, ey - 6, 13, 0.4, Math.PI - 0.4, 12), { lwk: 1.2 });
    else if (e === 'blink') line(ctx, [[ex - 13, ey], [ex + 13, ey]], { lwk: 1.1 });
    else {
      const wide = e === 'wide', R = wide ? 19 : 15, pr = wide ? 4.8 : 7.5, eye = ell(ex, ey, R, R);
      shape(ctx, eye, { fill: C.white, stroke: false });
      const qx = ex + s.look[0] * (wide ? 2 : 5), qy = ey + s.look[1] * (wide ? 2 : 5) + (e === 'sly' ? 3 : 0);
      blob(ctx, qx, qy, pr, pr, INK); blob(ctx, qx + pr * 0.35, qy - pr * 0.4, pr * 0.32, pr * 0.32, C.white);
      if (e === 'sly') { // lowered lids: knowing look
        ctx.save(); ctx.beginPath(); trace(ctx, eye, true); ctx.clip(); ctx.fillStyle = C.skin; ctx.fillRect(ex - 20, ey - 22, 40, 20); ctx.restore();
        shape(ctx, eye, { lwk: 0.9 }); line(ctx, [[ex - 17, ey - 2], [ex + 17, ey - 2]], { lwk: 1.2 });
      } else shape(ctx, eye, { lwk: 0.9 });
    }
  }
  line(ctx, spl([[fx + 2, 20], [fx - 9, 38], [fx + 1, 46], [fx + 11, 42]], false), { lwk: 0.9 });
  const m = s.mouth;
  if (m === 'grin') {
    const M = spl([[-34, 62], [34, 62], [26, 86], [0, 96], [-26, 86]]).map(([x, y]) => [x + fx, y]);
    shape(ctx, M, { fill: C.mouth, stroke: false });
    ctx.save(); ctx.beginPath(); trace(ctx, M, true); ctx.clip(); ctx.fillStyle = C.white; ctx.fillRect(-40 + fx, 56, 80, 12); blob(ctx, fx, 94, 18, 9, C.tongue); ctx.restore();
    shape(ctx, M);
  } else if (m === 'o') shape(ctx, ell(fx, 80, 13, 16), { fill: C.mouth });
  else if (m === 'worried') line(ctx, Array.from({ length: 11 }, (_, i) => [fx - 20 + i * 4, 78 + 3 * Math.sin(i * 1.5)]), { lwk: 0.95 });
  else if (m === 'flat') line(ctx, [[fx - 18, 78], [fx + 18, 78]], { lwk: 1 });
  else if (m === 'smirk') line(ctx, spl([[fx - 22, 78], [fx + 2, 80], [fx + 20, 72], [fx + 28, 62]], false), { lwk: 1 });
  else if (m === 'sleep') shape(ctx, ell(fx, 80, 7, 8), { fill: C.mouth });
  else line(ctx, arcP(fx, 46, 30, 0.5, Math.PI - 0.5, 14), { lwk: 1 });
  if (s.glow > 0) { ctx.save(); ctx.beginPath(); trace(ctx, face, true); ctx.clip(); ctx.fillStyle = `rgba(150,195,255,${0.22 * s.glow})`; ctx.fillRect(-130, -130, 260, 270); ctx.restore(); }
  if (s.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(s.sweat * 4); const y = -56 + 40 * s.sweat;
    shape(ctx, spl([[98, y - 24], [110, y + 2], [98, y + 13], [86, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
function roBody(ctx, s) {
  SK(ctx, rr(-30, -44, 60, 56, 12), C.skin);
  const T = spl([[-100, -6], [0, -12], [100, -6], [176, 40], [188, 420], [-188, 420], [-176, 40]]);
  HX(ctx, T, { fill: C.tee });
  ctx.save(); ctx.beginPath(); trace(ctx, T, true); ctx.clip(); ctx.fillStyle = C.stripe; ctx.fillRect(-200, 150, 400, 34); ctx.restore();
  shape(ctx, T);
  line(ctx, [[-190, 150], [190, 150]], { lwk: 0.6 }); line(ctx, [[-190, 184], [190, 184]], { lwk: 0.6 });
  line(ctx, arcP(0, -30, 46, 0.35, Math.PI - 0.35, 12), { lwk: 1.1 });
  ctx.save(); ctx.translate(0, -18 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -118); roHead(ctx, s); ctx.restore();
}
function helmet(ctx, x, y, s) { // full-face scooter helmet, visor to camera
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  HX(ctx, spl([[-92, 60], [-100, -10], [-70, -76], [0, -98], [70, -76], [100, -10], [92, 60], [60, 76], [-60, 76]]), { fill: C.helmet });
  shape(ctx, spl([[-72, -20], [0, -34], [72, -20], [64, 24], [0, 34], [-64, 24]]), { fill: C.visor });
  line(ctx, [[-44, -14], [-10, -22]], { col: 'rgba(255,255,255,0.6)', lwk: 1.4 });
  line(ctx, spl([[-20, -94], [0, -60], [0, -40]], false), { col: '#F6EBDD', lwk: 1.8 });
  ctx.restore();
}
function phoneBack(ctx, x, y, glow) {
  ctx.save();
  if (glow > 0) { ctx.shadowColor = `rgba(160,200,255,${0.9 * glow})`; ctx.shadowBlur = 50; }
  shape(ctx, rr(x - 62, y - 112, 124, 224, 18), { fill: '#3A3F4A' });
  ctx.restore();
  shape(ctx, rr(x - 50, y - 100, 46, 62, 12), { fill: '#262A32', lwk: 0.6 });
  for (const dy of [-84, -54]) shape(ctx, ell(x - 27, y + dy, 11, 11), { fill: '#4E5566', lwk: 0.5 });
}
function roArms(ctx, s, t) {
  const T = s.hold === 'phone' ? [[-72, 206], [72, 206]] : s.hold === 'helmet' ? [[-104, 250], [104, 250]] : [[-150, 404], [150, 404]];
  const arms = [[-1, T[0]], [1, T[1]]].map(([sx, tg]) => armPose(ctx, [sx * 118, 48], tg, ...(s.hold === 'desk' ? [190, 180] : [138, 130]), sx, 60, C.tee, C.teeDk)); // shorter reach when holding something at the chest, so elbows stay close
  if (s.hold === 'phone') phoneBack(ctx, 0, 150, s.glow);
  if (s.hold === 'helmet') helmet(ctx, 0, 200, 1.05);
  arms.forEach(a => hand(ctx, a, 28, C.skin, s.hold === 'desk' ? 'flat' : undefined));
  if (s.buzz > 0 && s.hold === 'phone') { ringArcs(ctx, -80, 60, t, s.buzz, -1); ringArcs(ctx, 80, 60, t, s.buzz, 1); }
}

// ================= SETS =================
const RO = { x: 540, y: 880 }, DESK = 1300;
function sky(ctx, x, y, w, h, tod) { // tod: day | night | morning
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (tod === 'night') { g.addColorStop(0, '#1E2446'); g.addColorStop(1, '#3B3F6E'); }
  else if (tod === 'morning') { g.addColorStop(0, '#F6C9A0'); g.addColorStop(1, '#FBE9C8'); }
  else { g.addColorStop(0, '#BCD8EA'); g.addColorStop(1, '#EAF1E4'); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (tod === 'night') { blob(ctx, x + w - 70, y + 80, 30, 30, '#FFF3D6'); blob(ctx, x + w - 58, y + 70, 28, 28, '#2A3160'); for (const [a, b] of [[40, 60], [120, 110], [190, 50]]) blob(ctx, x + a, y + b, 3, 3, '#FFF3D6'); }
  else if (tod === 'morning') shape(ctx, ell(x + w - 80, y + h - 150, 40, 40), { fill: '#F8D36A', lwk: 0.7 });
  else shape(ctx, ell(x + w - 80, y + 90, 36, 36), { fill: '#F7D66B', lwk: 0.7 });
  const bc = tod === 'night' ? '#343863' : tod === 'morning' ? '#D9B7A4' : '#A9BFD0';
  for (const [bx, bw, bh] of [[10, 70, 190], [90, 56, 270], [156, 80, 160], [246, 60, 230]]) {
    shape(ctx, rr(x + bx, y + h - bh, bw, bh + 20, 3), { fill: bc, hatch: dk(bc), ha: 0.3, lwk: 0.6 });
    if (tod === 'night') for (let wy = y + h - bh + 18; wy < y + h - 16; wy += 34) for (let wx = x + bx + 12; wx < x + bx + bw - 14; wx += 22) { ctx.fillStyle = '#F5E0A0'; ctx.fillRect(wx, wy, 11, 14); }
  }
}
function room(ctx, o) {
  shape(ctx, [[-400, -400], [1480, -400], [1480, 1500], [-400, 1500]], { fill: C.wall, hatch: C.wallH, ha: 0.35, stroke: false });
  shape(ctx, [[-400, 1500], [1480, 1500], [1480, 2400], [-400, 2400]], { fill: C.floor, hatch: dk(C.floor), ha: 0.4, stroke: false });
  // window (right)
  shape(ctx, rr(660, 330, 330, 480, 10), { fill: C.white, lwk: 1 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(678, 348, 294, 444, 4), true); ctx.clip(); sky(ctx, 678, 348, 294, 444, o.tod); if (o.inWindow) o.inWindow(ctx); ctx.restore();
  shape(ctx, rr(678, 348, 294, 444, 4), { lwk: 0.9 }); line(ctx, [[825, 348], [825, 792]], { lwk: 0.9 });
  shape(ctx, rr(640, 804, 370, 26, 8), { fill: C.white, lwk: 0.9 });
  // shelf (left) with the helmet when he isn't holding it
  shape(ctx, rr(70, 600, 330, 26, 6), { fill: C.woodTop, hatch: dk(C.woodTop), ha: 0.35, lwk: 0.9 });
  for (const [x, w, h, c] of [[90, 30, 110, '#D96B5B'], [124, 24, 96, '#5D86B8'], [152, 34, 120, '#E3B04B']]) shape(ctx, rr(x, 600 - h, w, h, 4), { fill: c, lwk: 0.6 });
  if (o.helmetOnShelf) helmet(ctx, 300, 530, 0.7);
  // scooter poster
  shape(ctx, rr(110, 250, 230, 250, 8), { fill: '#F6EBDD', hatch: '#D9C8AE', ha: 0.3, lwk: 0.9 });
  shape(ctx, ell(165, 440, 26, 26), { fill: INK, lwk: 0.6 }); shape(ctx, ell(285, 440, 26, 26), { fill: INK, lwk: 0.6 });
  shape(ctx, spl([[150, 420], [180, 360], [240, 350], [300, 380], [300, 424], [200, 430]]), { fill: '#4FA3A0', lwk: 0.7 });
  line(ctx, [[180, 362], [168, 320], [150, 314]], { lwk: 1 });
  text(ctx, 'RIDE SAFE', 225, 285, 30, C.red);
  // wall clock
  shape(ctx, ell(540, 250, 56, 56), { fill: C.white, hatch: '#D8CFC0', ha: 0.2, lwk: 1 });
  const mn = o.clockMin ?? 450, am = mn / 60 * Math.PI * 2 - Math.PI / 2, ah = mn / 720 * Math.PI * 2 - Math.PI / 2;
  line(ctx, [[540, 250], [540 + Math.cos(ah) * 26, 250 + Math.sin(ah) * 26]], { lwk: 1.1 }); line(ctx, [[540, 250], [540 + Math.cos(am) * 40, 250 + Math.sin(am) * 40]], { lwk: 0.8 });
  blob(ctx, 540, 250, 5, 5, INK);
}
function desk(ctx, o) {
  shape(ctx, ell(540, DESK + 30, 520, 26), { fill: 'rgba(40,20,30,0.18)', stroke: false });
  HX(ctx, rr(60, DESK + 20, 960, 400, 10), { fill: C.wood });
  for (const x of [380, 700]) line(ctx, [[x, DESK + 50], [x, DESK + 380]], { col: C.woodDk, lwk: 0.6 });
  for (const x of [220, 540, 860]) shape(ctx, rr(x - 30, DESK + 150, 60, 14, 7), { fill: '#E3C9A0', lwk: 0.6 });
  HX(ctx, rr(40, DESK - 6, 1000, 34, 10), { fill: C.woodTop });
  // keys + mug
  shape(ctx, ell(250, DESK - 10, 16, 16), { col: '#8E8A84', lwk: 1.2 }); shape(ctx, rr(262, DESK - 22, 40, 16, 5), { fill: '#C9C4BC', lwk: 0.6 }); shape(ctx, rr(200, DESK - 40, 34, 30, 6), { fill: C.red, lwk: 0.6 });
  shape(ctx, rr(820, DESK - 76, 72, 72, 14), { fill: C.white, hatch: '#D8CFC0', ha: 0.25 }); shape(ctx, rr(820, DESK - 52, 72, 14, 3), { fill: C.tee, lwk: 0.5 });
  line(ctx, arcP(896, DESK - 42, 18, -1.3, 1.3, 10), { lwk: 1 });
  if (o.helmetOnDesk) helmet(ctx, 380, DESK - 80, 0.85);
  if (o.phoneOnDesk) shape(ctx, [[600, DESK - 4], [700, DESK - 4], [712, DESK - 18], [612, DESK - 18]], { fill: C.phone });
}
function bed(ctx, o) { // front view: headboard, pillow, blanket; Rohan either asleep (head only) or sitting up
  HX(ctx, rr(140, 820, 800, 420, 40), { fill: C.woodDk });
  HX(ctx, rr(170, 850, 740, 300, 30), { fill: C.wood });
  shape(ctx, rr(300, 960, 480, 180, 70), { fill: C.pillow, hatch: '#D9D1C2', ha: 0.3 });
  // side table + phone
  HX(ctx, rr(880, 1080, 190, 300, 10), { fill: C.woodTop }); shape(ctx, rr(870, 1070, 210, 24, 6), { fill: C.wood, lwk: 0.8 });
  shape(ctx, [[910, 1070], [1010, 1070], [1022, 1054], [922, 1054]], { fill: C.phone });
  if (o.phoneGlow) { const g = ctx.createRadialGradient(966, 1062, 5, 966, 1062, 110); g.addColorStop(0, `rgba(170,215,255,${0.55 * o.phoneGlow})`); g.addColorStop(1, 'rgba(170,215,255,0)'); ctx.fillStyle = g; ctx.fillRect(850, 950, 240, 240); }
  if (o.sleep) {
    ctx.save(); ctx.translate(560, 990); ctx.rotate(0.22); roHead(ctx, o.ro); ctx.restore();
    const z = (o.t * 0.7) % 1;
    for (let i = 0; i < 3; i++) { const k = (z + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * k); text(ctx, 'z', 700 + 30 * i + 20 * k, 820 - 60 * i - 50 * k, 40 + i * 12, '#5D6FA8'); ctx.restore(); }
  } else if (o.ro) { ctx.save(); ctx.translate(540, 900); roBody(ctx, o.ro); roArms(ctx, o.ro, o.t); ctx.restore(); }
  const B = spl([[80, 1180], [540, 1150], [1000, 1180], [1020, 1700], [60, 1700]]);
  shape(ctx, B, { fill: C.blanket, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, B, true); ctx.clip(); for (let y = 1230; y < 1700; y += 90) { ctx.fillStyle = C.blanket2; ctx.fillRect(0, y, 1100, 18); } ctx.restore();
  shape(ctx, B, { hatch: dk(C.blanket, 0.3), ha: 0.35, fill: 'rgba(0,0,0,0)' });
  shape(ctx, rr(80, 1164, 940, 40, 20), { fill: '#F6EBDD', lwk: 0.9 });
}
function scammerShadow(ctx, t, k) { // grinning shadow outside the window, catching OTPs
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  const bx = 830, by = 700 + 10 * Math.sin(t * 2);
  shape(ctx, spl([[bx - 110, by + 140], [bx - 90, by - 30], [bx - 50, by - 120], [bx, by - 140], [bx + 50, by - 120], [bx + 90, by - 30], [bx + 110, by + 140]]), { fill: '#141733', stroke: false });
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(bx + sx * 30, by - 54); ctx.rotate(sx * 0.3); shape(ctx, ell(0, 0, 16, 9), { fill: '#FFE9A8', stroke: false }); ctx.restore(); }
  shape(ctx, spl([[bx - 44, by - 12], [bx + 44, by - 12], [bx + 30, by + 14], [bx, by + 22], [bx - 30, by + 14]]), { fill: '#FFFFFF', stroke: false });
  ctx.fillStyle = '#141733'; for (const dx of [-22, 0, 22]) ctx.fillRect(bx + dx - 1.5, by - 12, 3, 30);
  ctx.restore();
}
function otpBubble(ctx, x, y, s, a, code) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, rr(-86, -30, 172, 60, 18), { fill: '#DFF5E6', col: C.green, lwk: 0.9 });
  shape(ctx, [[-60, 28], [-78, 50], [-40, 28]], { fill: '#DFF5E6', col: C.green, lwk: 0.9 });
  shape(ctx, rr(-84, -28, 168, 56, 16), { fill: '#DFF5E6', stroke: false });
  text(ctx, 'OTP ' + code, 0, 2, 32, '#2C7A48');
  ctx.restore();
}

// ================= PHONE POV =================
function thumb(ctx, p, ang, skin) {
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
  shape(ctx, rr(-20, -30, 150, 60, 30), { fill: skin, hatch: dk(skin, 0.25), ha: 0.14 });
  shape(ctx, rr(94, -19, 30, 38, 13), { fill: mix(skin, '#FFFFFF', 0.45), lwk: 0.6 });
  line(ctx, [[58, -18], [62, 0], [58, 18]], { col: dk(skin, 0.35), lwk: 0.6 });
  ctx.restore();
}
function finger(ctx, x, y, k) { // index finger tapping from below-right
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x + 40 * (1 - k), y + 420 * (1 - k)); ctx.rotate(-0.35);
  sleeve(ctx, [[60, 760], [40, 480], [10, 200]], 150, C.tee, C.teeDk);
  shape(ctx, rr(-70, 120, 150, 170, 60), { fill: C.skin, hatch: dk(C.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-28, -10, 58, 170, 29), { fill: C.skin, hatch: dk(C.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-16, 0, 34, 36, 13), { fill: mix(C.skin, '#FFFFFF', 0.45), lwk: 0.6 });
  ctx.restore();
}
let BG = null;
function blurredRoom() {
  if (BG) return BG;
  const a = createCanvas(W, H), x = a.getContext('2d');
  x.translate(540, 960); x.scale(1.5, 1.5); x.translate(-540, -700); room(x, { tod: 'day', clockMin: 450 });
  x.getImageData(0, 0, 1, 1);
  BG = createCanvas(W, H); const y = BG.getContext('2d');
  y.fillStyle = C.wall; y.fillRect(0, 0, W, H);
  y.filter = 'blur(18px)'; y.drawImage(a, -60, -60, W + 120, H + 120); y.filter = 'none';
  y.fillStyle = 'rgba(40,50,70,0.12)'; y.fillRect(0, 0, W, H); y.getImageData(0, 0, 1, 1);
  return BG;
}
function phoneRig(ctx, t, o) { // Rohan's POV: phone in both hands
  ctx.drawImage(blurredRoom(), 0, 0);
  if (o.dark) { ctx.fillStyle = `rgba(16,18,40,${o.dark})`; ctx.fillRect(0, 0, W, H); }
  const z = o.z, ty = o.target + 60 * z;
  ctx.save(); ctx.translate(540 + (o.shake || 0), ty); ctx.scale(z, z); ctx.rotate(-0.02 + 0.008 * Math.sin(t * 1.3));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, C.tee, C.teeDk);
  const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, C.tee, C.teeDk);
  const palm = a => [a.w[0] + Math.cos(a.dir) * 40, a.w[1] + Math.sin(a.dir) * 40], pL = palm(aL), pR = palm(aR);
  for (const p of [pL, pR]) shape(ctx, ell(p[0], p[1], 92, 86), { fill: C.skin, hatch: dk(C.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  const scr = rr(-252, -532, 504, 1064, 42);
  ctx.save(); ctx.beginPath(); trace(ctx, scr, true); ctx.clip(); o.screen(ctx);
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-252, -532); ctx.lineTo(60, -532); ctx.lineTo(-252, 60); ctx.closePath(); ctx.fill();
  ctx.restore();
  shape(ctx, scr, { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  thumb(ctx, pL, -1.35, C.skin); thumb(ctx, pR, -Math.PI + 1.35, C.skin);
  if (o.buzz > 0) { ringArcs(ctx, -300, -470, t, o.buzz, -1); ringArcs(ctx, 300, -470, t, o.buzz, 1); }
  if (o.tap) finger(ctx, o.tap[0], o.tap[1], o.tap[2]);
  if (o.top) o.top(ctx);
  ctx.restore();
  if (o.vig > 0) vignette(ctx, 0.5 * o.vig);
  if (o.after) o.after(ctx);
}
const tapK = (t, t0) => seg(t, t0 - 0.35, t0 - 0.05, E.o) * (1 - seg(t, t0 + 0.25, t0 + 0.55, E.io)); // finger in, tap, out
function ripple(ctx, x, y, t, t0, col = 'rgba(255,255,255,0.8)') {
  if (t < t0 || t > t0 + 0.4) return;
  const k = (t - t0) / 0.4; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(x, y, 30 + k * 130, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
}
function statusBar(ctx, time, col = INK) {
  text(ctx, time, -196, -498, 28, col, 'left', 700);
  ctx.fillStyle = col; for (let i = 0; i < 3; i++) ctx.fillRect(160 + i * 14, -490 - i * 6, 9, 12 + i * 6);
}
function notif(ctx, y, k, icon, title, body, col) { // lock-screen notification card sliding down
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(0, y - 60 * (1 - k)); ctx.globalAlpha = clamp(k * 1.4);
  shape(ctx, rr(-230, -64, 460, 128, 28), { fill: 'rgba(255,255,255,0.94)', lwk: 0.7 });
  shape(ctx, ell(-176, -8, 34, 34), { fill: col, lwk: 0.6 }); icon(ctx, -176, -8, '#FFFFFF');
  text(ctx, title, -128, -30, 28, INK, 'left', 800);
  text(ctx, body, -128, 12, 25, '#5E5A55', 'left', 600);
  ctx.restore();
}
const icoChallan = (ctx, x, y) => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 12, y - 16, 24, 32); ctx.fillStyle = C.red; ctx.fillRect(x - 8, y - 10, 16, 4); ctx.fillRect(x - 8, y, 12, 4); };
const icoBank = (ctx, x, y, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 18, y - 4); ctx.lineTo(x, y - 18); ctx.lineTo(x + 18, y - 4); ctx.fill(); for (const dx of [-12, -2, 8]) ctx.fillRect(x + dx, y - 2, 5, 14); ctx.fillRect(x - 18, y + 12, 36, 4); };
function wallpaper(ctx, tod) {
  const g = ctx.createLinearGradient(0, -532, 0, 532);
  if (tod === 'morning') { g.addColorStop(0, '#F3B98F'); g.addColorStop(1, '#8A7BB4'); } else { g.addColorStop(0, '#6FA7C9'); g.addColorStop(1, '#2E4A72'); }
  ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  for (const [x, y, r] of [[-120, 300, 160], [150, 420, 200]]) blob(ctx, x, y, r, r * 0.6, 'rgba(255,255,255,0.08)');
}
function hookScreen(ctx, t) { // 0-4.4: the ₹500 challan, then ₹4 lakh gone
  wallpaper(ctx, 'day'); statusBar(ctx, '', '#FFFFFF');
  text(ctx, '7:41', 0, -330, 150, '#FFFFFF', 'center', 700); text(ctx, 'Monday, 12 May', 0, -230, 32, '#EAF1F7', 'center', 600);
  notif(ctx, -80, popIn(t, 0.05, 0.3), icoChallan, 'e-Challan  \u00B7  now', 'Traffic challan \u20B9500 pending', C.red);
  for (let i = 0; i < 5; i++) notif(ctx, 70 + i * 26, popIn(t, 2.9 + i * 0.1, 0.22), icoBank, 'Bank  \u00B7  now', 'Debited \u20B980,000.00 A/c XX4821', C.bank);
  const k = popIn(t, 3.04, 0.3);
  if (k > 0.01) { ctx.save(); ctx.translate(0, 330); ctx.scale(k, k); shape(ctx, rr(-220, -70, 440, 140, 30), { fill: '#FDECEA', col: C.red, lwk: 1.4 }); text(ctx, '\u2212 \u20B94,00,000', 0, 6, 70, C.red); ctx.restore(); }
}
function waHeader(ctx) {
  ctx.fillStyle = C.wa; ctx.fillRect(-260, -540, 520, 160);
  statusBar(ctx, '6:12', '#FFFFFF');
  line(ctx, [[-222, -436], [-236, -422], [-222, -408]], { col: '#FFFFFF', lwk: 1.3 });
  badgeDP(ctx, -168, -422, 34);
  text(ctx, 'RTO Traffic Dept', -120, -440, 32, '#FFFFFF', 'left', 800);
  text(ctx, 'online', -120, -404, 22, '#CFE8E2', 'left', 600);
}
function chatBG(ctx) {
  ctx.fillStyle = C.waBg; ctx.fillRect(-260, -540, 520, 1080);
  ctx.save(); ctx.globalAlpha = 0.18; const r = rng(7);
  for (let i = 0; i < 26; i++) { const x = -240 + r() * 480, y = -380 + r() * 880; ctx.strokeStyle = '#8C7F6C'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8 + r() * 10, 0, 5); ctx.stroke(); }
  ctx.restore();
}
function waChat(ctx, t) { // 6.4-15.9
  chatBG(ctx); waHeader(ctx);
  shape(ctx, rr(-60, -350, 120, 36, 18), { fill: '#D9EEF6', stroke: false }); text(ctx, 'TODAY', 0, -332, 20, '#4E6E80', 'center', 700);
  if (t > 6.5 && t < 8.14) { // typing dots
    shape(ctx, rr(-224, -290, 120, 60, 22), { fill: '#FFFFFF', lwk: 0.6 });
    for (let i = 0; i < 3; i++) blob(ctx, -194 + i * 30, -260 + 5 * Math.sin(t * 12 - i), 8, 8, '#9A948C');
  }
  const mk = popIn(t, 8.14, 0.3);
  if (mk > 0.01) {
    ctx.save(); ctx.translate(-224, -290); ctx.scale(mk, mk);
    shape(ctx, rr(0, 0, 420, 300, 24), { fill: '#FFFFFF', lwk: 0.7 });
    text(ctx, 'e-CHALLAN NOTICE', 26, 40, 26, C.red, 'left', 800);
    [['Aapka traffic challan', 8.4], ['\u20B9500 pending hai.', 9.06], ['Abhi bharein, warna', 9.98]].forEach(([s, a], i) => { ctx.save(); ctx.globalAlpha = seg(t, a - 0.1, a + 0.15); text(ctx, s, 26, 92 + i * 44, 30, INK, 'left', 700); ctx.restore(); });
    const sh = t > 10.96 && t < 11.6 ? 5 * Math.sin((t - 10.96) * 60) : 0;
    ctx.save(); ctx.globalAlpha = seg(t, 10.9, 11.1); text(ctx, 'LICENCE CANCEL.', 26 + sh, 230, 34, C.red, 'left', 800); ctx.restore();
    text(ctx, '6:12 PM', 400, 280, 18, C.ui, 'right', 600);
    ctx.restore();
  }
  const fk = popIn(t, 12.9, 0.3);
  if (fk > 0.01) {
    ctx.save(); ctx.translate(-224, 40); ctx.scale(fk, fk);
    shape(ctx, rr(0, 0, 420, 170, 24), { fill: '#FFFFFF', lwk: 0.7 });
    shape(ctx, rr(16, 16, 388, 104, 16), { fill: '#F2EEE8', stroke: false });
    apkIcon(ctx, 70, 68, 0.62);
    text(ctx, 'RTO_Challan.apk', 118, 52, 30, INK, 'left', 800);
    text(ctx, '4.2 MB \u00B7 APK', 118, 90, 22, C.ui, 'left', 600);
    text(ctx, 'Download karke challan bharein', 20, 146, 22, '#5E5A55', 'left', 600);
    ctx.restore();
  }
  penEllipse(ctx, 0, 92, 128, 44, seg(t, 14.6, 15.0, E.o), 3, C.red, 9);
  ctx.fillStyle = '#F6F3EE'; ctx.fillRect(-260, 440, 520, 100); shape(ctx, rr(-230, 460, 380, 60, 30), { fill: '#FFFFFF', lwk: 0.6 }); text(ctx, 'Message', -200, 491, 26, '#A8A39C', 'left', 600);
  shape(ctx, ell(206, 490, 32, 32), { fill: C.wa, stroke: false });
}
function installScreen(ctx, t) { // 15.9-18.4
  chatBG(ctx); waHeader(ctx); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-260, -540, 520, 1080);
  const up = E.o(clamp((t - 15.92) / 0.3));
  ctx.save(); ctx.translate(0, 520 * (1 - up));
  shape(ctx, rr(-252, 20, 504, 560, 36), { fill: '#FFFFFF', lwk: 0.7 });
  appIcon(ctx, 0, 120, 0.8); text(ctx, 'RTO Challan', 0, 206, 38, INK);
  const prog = seg(t, 17.02, 17.75, x => x);
  if (t < 17.02) {
    text(ctx, 'Do you want to install', 0, 270, 28, '#5E5A55', 'center', 600); text(ctx, 'this app?', 0, 306, 28, '#5E5A55', 'center', 600);
    text(ctx, 'Cancel', -110, 420, 32, C.bank, 'center', 700);
    const p = 1 - 0.08 * pulse(t, 16.9, 0.16); ctx.save(); ctx.translate(110, 420); ctx.scale(p, p); shape(ctx, rr(-90, -36, 180, 72, 36), { fill: C.bank, stroke: false }); text(ctx, 'Install', 0, 2, 32, '#FFFFFF'); ctx.restore();
  } else if (t < 17.8) {
    text(ctx, 'Installing\u2026', 0, 290, 30, '#5E5A55', 'center', 700);
    shape(ctx, rr(-180, 350, 360, 20, 10), { fill: '#E8E5E0', stroke: false }); shape(ctx, rr(-180, 350, Math.max(20, 360 * prog), 20, 10), { fill: C.bank, stroke: false });
  } else {
    const k = popIn(t, 17.8, 0.25); ctx.save(); ctx.translate(0, 290); ctx.scale(k, k); shape(ctx, ell(0, 0, 30, 30), { fill: C.green, lwk: 0.6 }); line(ctx, [[-12, 0], [-3, 9], [13, -9]], { col: '#FFFFFF', lwk: 1.4 }); ctx.restore();
    text(ctx, 'App installed', 0, 356, 30, INK, 'center', 700);
    shape(ctx, rr(-90, 400, 180, 72, 36), { fill: C.bank, stroke: false }); text(ctx, 'Open', 0, 437, 32, '#FFFFFF');
  }
  ctx.restore();
  ripple(ctx, 110, 420, t, 16.96, 'rgba(47,91,168,0.7)');
}
function fakeSplash(ctx) {
  ctx.fillStyle = '#F4F6FA'; ctx.fillRect(-260, -540, 520, 1080);
  ctx.fillStyle = C.navy; ctx.fillRect(-260, -540, 520, 300);
  badgeDP(ctx, 0, -370, 80); text(ctx, 'e-Challan Portal', 0, -262, 36, '#FFFFFF');
  for (let i = 0; i < 4; i++) shape(ctx, rr(-210, -160 + i * 110, 420, 80, 16), { fill: '#FFFFFF', col: '#D5DCE8', lwk: 0.6 });
}
function permScreen(ctx, t) { // 18.4-23.5
  fakeSplash(ctx); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-260, -540, 520, 1080);
  const k = popIn(t, 18.9, 0.3); if (k <= 0.01) return;
  ctx.save(); ctx.scale(k, k);
  shape(ctx, rr(-230, -300, 460, 560, 36), { fill: '#F7F4F0', lwk: 0.7 });
  shape(ctx, ell(0, -220, 40, 40), { fill: '#E4ECF8', lwk: 0.6 }); shape(ctx, rr(-22, -236, 44, 32, 6), { fill: C.bank, stroke: false }); shape(ctx, [[-10, -204], [-2, -204], [-14, -194]], { fill: C.bank, stroke: false });
  text(ctx, 'Allow RTO Challan to', 0, -140, 30, INK, 'center', 800);
  const hk = seg(t, 20.3, 20.6);
  if (hk > 0) { ctx.save(); ctx.globalAlpha = hk; shape(ctx, rr(-212, -118, 424, 50, 12), { fill: '#FDE2DD', stroke: false }); ctx.restore(); }
  text(ctx, 'send and view SMS messages?', 0, -93, 30, hk > 0.5 ? C.red : INK, 'center', 800);
  const p = 1 - 0.07 * pulse(t, 22.14, 0.16);
  ctx.save(); ctx.translate(0, 20); ctx.scale(p, p); shape(ctx, rr(-190, -44, 380, 88, 44), { fill: t > 22.2 ? '#C9DAF4' : '#E4ECF8', stroke: false }); text(ctx, 'Allow', 0, 2, 34, C.bank); ctx.restore();
  shape(ctx, rr(-190, 116, 380, 88, 44), { fill: '#E9E6E1', stroke: false }); text(ctx, "Don't allow", 0, 162, 34, '#5E5A55');
  ripple(ctx, 0, 20, t, 22.18, 'rgba(47,91,168,0.7)');
  ctx.restore();
}
function debitScreen(ctx, t) { // 28.4-31.7
  wallpaper(ctx, 'morning');
  text(ctx, '7:02', 0, -380, 140, '#FFFFFF', 'center', 700); text(ctx, 'Tuesday, 13 May', 0, -286, 30, '#FFF3E6', 'center', 600);
  const amts = ['49,999', '49,999', '50,000', '50,000', '50,000', '50,001'], times = [29.1, 29.5, 29.85, 30.1, 30.35, 30.6];
  times.forEach((a, i) => notif(ctx, -170 + i * 104, popIn(t, a, 0.22), icoBank, 'Bank  \u00B7  2:' + (10 + i * 7) + ' AM', 'Debited \u20B9' + amts[i] + '.00 via UPI', C.bank));
  const bk = popIn(t, 29.1, 0.3), cnt = Math.round(lerp(0, 400000, seg(t, 29.1, 31.6, x => x)) / 1000) * 1000;
  if (bk > 0.01) { ctx.save(); ctx.translate(0, 450); ctx.scale(bk, bk); shape(ctx, rr(-220, -52, 440, 104, 26), { fill: '#FDECEA', col: C.red, lwk: 1.2 }); text(ctx, '\u2212 \u20B9' + inr(cnt), 0, 4, 52, C.red); ctx.restore(); }
}
function settingsScreen(ctx, t) { // 49.6-53.3
  ctx.fillStyle = '#F7F7F9'; ctx.fillRect(-260, -540, 520, 1080); statusBar(ctx, '10:05');
  text(ctx, 'App info', -200, -420, 48, INK, 'left', 800);
  const shrink = seg(t, 52.35, 52.8, E.i);
  if (shrink < 1) { ctx.save(); ctx.translate(0, -270); ctx.scale(1 - shrink, 1 - shrink); ctx.rotate(shrink * 1.4); appIcon(ctx, 0, 0, 1.0); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = 1 - shrink; text(ctx, 'RTO Challan', 0, -170, 38, INK); ctx.restore();
  const hot = t > 50.45 && t < 51.9;
  shape(ctx, rr(-220, -110, 440, 110, 20), { fill: '#FFFFFF', col: hot ? C.red : '#E2E0DC', lwk: hot ? 1.4 : 0.6 });
  text(ctx, 'Permissions', -196, -74, 28, INK, 'left', 800); text(ctx, 'SMS: Allowed', -196, -36, 26, C.red, 'left', 700);
  const off = seg(t, 51.7, 51.9);
  shape(ctx, rr(110, -76, 90, 46, 23), { fill: mix(C.red, '#C9C6C0', off), stroke: false }); shape(ctx, ell(lerp(177, 133, off), -53, 19, 19), { fill: '#FFFFFF', lwk: 0.5 });
  const p = 1 - 0.07 * pulse(t, 52.06, 0.16);
  ctx.save(); ctx.translate(0, 110); ctx.scale(p, p); shape(ctx, rr(-200, -44, 400, 88, 44), { fill: C.red, stroke: false }); text(ctx, 'Uninstall', 0, 2, 34, '#FFFFFF'); ctx.restore();
  ripple(ctx, 0, 110, t, 52.1);
  if (t > 52.7) { const k = popIn(t, 52.7, 0.25); ctx.save(); ctx.translate(0, 300); ctx.scale(k, k); shape(ctx, rr(-180, -40, 360, 80, 40), { fill: C.greenLt, col: C.green, lwk: 1 }); text(ctx, 'App uninstalled', 0, 3, 32, C.green); ctx.restore(); }
}
function dialer(ctx, t) { // 53.3-58.5
  if (t > 56.8) { // then the bank
    const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#2F5BA8'); g.addColorStop(1, '#1D3A70'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
    statusBar(ctx, '10:08', '#FFFFFF');
    const k = popIn(t, 56.84, 0.3); ctx.save(); ctx.translate(0, -220); ctx.scale(k, k); shape(ctx, ell(0, 0, 96, 96), { fill: '#FFFFFF', lwk: 0.8 }); ctx.scale(2.6, 2.6); icoBank(ctx, 0, 0, C.bank); ctx.restore();
    text(ctx, 'Bank Helpline', 0, -60, 50, '#FFFFFF'); text(ctx, 'Calling\u2026', 0, 0, 32, '#CFE0F7', 'center', 600);
    const ck = popIn(t, 57.5, 0.3); if (ck > 0.01) { ctx.save(); ctx.translate(0, 140); ctx.scale(ck, ck); shape(ctx, rr(-210, -45, 420, 90, 45), { fill: 'rgba(255,255,255,0.16)', col: '#FFFFFF', lwk: 0.8 }); text(ctx, 'Card + UPI block', 0, 2, 34, '#FFFFFF'); ctx.restore(); }
    shape(ctx, ell(0, 420, 60, 60), { fill: C.red, stroke: false }); handset(ctx, 0, 416);
    return;
  }
  ctx.fillStyle = '#F7F7F9'; ctx.fillRect(-260, -540, 520, 1080); statusBar(ctx, '10:07');
  const times = [55.24, 55.36, 55.48, 55.6], n = times.filter(x => t >= x).length, digits = '1930';
  text(ctx, digits.slice(0, n), 0, -380, 116, INK);
  const lk = popIn(t, 55.7, 0.3); if (lk > 0.01) { ctx.save(); ctx.translate(0, -290); ctx.scale(lk, lk); text(ctx, 'Cyber Crime Helpline', 0, 0, 32, C.green); ctx.restore(); }
  const keys = '123456789*0#';
  for (let i = 0; i < 12; i++) {
    const x = [-150, 0, 150][i % 3], y = -170 + 140 * Math.floor(i / 3), d = digits.indexOf(keys[i]);
    const hot = d >= 0 && t >= times[d] && t < times[d] + 0.15;
    ctx.fillStyle = hot ? '#CFE3F5' : '#E9E9EE'; ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.fill();
    text(ctx, keys[i], x, y + 3, 54, INK, 'center', 700);
  }
  const pk = 1 + 0.12 * pulse(t, 56.0, 0.3);
  ctx.save(); ctx.translate(0, 420); ctx.scale(pk, pk); ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(0, 0, 64, 0, 7); ctx.fill(); handset(ctx, 0, -4); ctx.restore();
  if (t > 56.0) { const k = ((t - 56.0) * 1.5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(0, 420, 64 + k * 90, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = C.green; ctx.stroke(); ctx.restore(); }
}

// ================= SCENES =================
function worldCam(ctx, cam, draw) {
  view.z = cam.z;
  ctx.save(); ctx.translate(W / 2 + (cam.jx || 0), H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  draw(ctx); ctx.restore(); view.z = 1;
}
function deskScene(ctx, cam, o, t) {
  worldCam(ctx, cam, c => {
    room(c, { tod: o.tod || 'day', clockMin: o.clockMin, helmetOnShelf: o.helmetOnShelf });
    c.save(); c.translate(RO.x, RO.y); roBody(c, o.ro); c.restore();
    desk(c, o);
    c.save(); c.translate(RO.x, RO.y); roArms(c, o.ro, t); c.restore();
    if (o.extra) o.extra(c);
  });
}
function bedScene(ctx, cam, o, t) {
  worldCam(ctx, cam, c => {
    room(c, { tod: o.tod, clockMin: o.clockMin });
    bed(c, { ...o, t });
    if (o.dim > 0) { c.fillStyle = `rgba(14,16,38,${o.dim})`; c.fillRect(-400, -400, 1880, 2800); }
    if (o.night) {
      c.save(); c.beginPath(); trace(c, rr(678, 348, 294, 444, 4), true); c.clip(); scammerShadow(c, t, o.shadow || 0); c.restore();
      const g = c.createRadialGradient(966, 1062, 5, 966, 1062, 160); g.addColorStop(0, 'rgba(170,215,255,0.5)'); g.addColorStop(1, 'rgba(170,215,255,0)'); c.fillStyle = g; c.fillRect(800, 900, 330, 330);
    }
    if (o.extra) o.extra(c);
  });
}
const rohanPhone = (t, o = {}) => { const s = mkRo({ hold: 'phone', glow: 0.8, look: [0, 0.8], ...o }); s.nod = 2 * Math.sin(t * 2) + (o.nod || 0); if ((t % 3.4) > 3.28 && s.eyes === 'open') s.eyes = 'blink'; return s; };

// ================= SHOTS =================
function shotHook(ctx, t) { // 0-4.4
  const hit = t > 3.04 && t < 3.4 ? 7 * Math.sin((t - 3.04) * 70) : 0;
  phoneRig(ctx, t, { z: 1.12 + 0.03 * t + 0.1 * seg(t, 2.9, 3.3, E.o), target: 820, buzz: t < 0.5 ? 1 : 0, shake: hit + (t < 0.5 ? 4 * Math.sin(t * 95) : 0), screen: c => hookScreen(c, t), vig: seg(t, 3.0, 3.4) * 0.8 });
}
function shotHome(ctx, t) { // 4.76-6.4: recreation, he walks in with the helmet
  const ro = mkRo({ hold: 'helmet', eyes: (t % 3) > 2.88 ? 'blink' : 'open', mouth: 'smile', look: [0, 0.2] }); ro.nod = 3 * Math.sin(t * 2.4);
  deskScene(ctx, { z: 1.0, cx: 540, cy: 960 }, { ro, clockMin: 372, phoneOnDesk: false }, t);
  recTag(ctx, t, 4.9);
}
function shotBuzz(ctx, t) { // 6.4-8.0: the message arrives
  const b = t < 7.5 ? ((t - 6.45) % 0.5 < 0.35 ? 1 : 0) : 0;
  const ro = rohanPhone(t, { buzz: b, eyes: 'open', mouth: t > 7.2 ? 'o' : 'smile', brow: t > 7.2 ? 6 : 0 });
  deskScene(ctx, { z: 1.35, cx: 540, cy: 900 }, { ro, clockMin: 372, helmetOnDesk: true }, t);
}
function shotChat(ctx, t) { // 8.0-15.9
  phoneRig(ctx, t, { z: 1.22 + 0.1 * seg(t, 8.0, 15.9, x => x), target: 790, screen: c => waChat(c, t), shake: t > 10.96 && t < 11.3 ? 4 * Math.sin(t * 90) : 0 });
}
function shotInstall(ctx, t) { // 15.9-18.4
  phoneRig(ctx, t, { z: 1.25, target: 790, screen: c => installScreen(c, t), tap: [112, 440, tapK(t, 16.96)] });
}
function shotPerm(ctx, t) { // 18.4-23.5
  const k = seg(t, 18.4, 22.0, E.io);
  phoneRig(ctx, t, { z: lerp(1.25, 1.5, k), target: lerp(790, 740, k), screen: c => permScreen(c, t), tap: [0, 40, tapK(t, 22.18)], vig: seg(t, 21.4, 22.1) * 0.7 });
}
function shotNight(ctx, t) { // 23.5-28.4
  const ro = mkRo({ eyes: 'sleep', mouth: 'sleep', look: [0, 0] });
  bedScene(ctx, { z: 1.0 + 0.04 * seg(t, 23.5, 28.4, x => x), cx: 560, cy: 980 }, { tod: 'night', clockMin: 140, sleep: true, ro, dim: 0.42, night: true, shadow: seg(t, 25.4, 26.0),
    extra: c => { // OTP bubbles drift from the phone out through the window
      if (t < 25.6) return;
      for (let i = 0; i < 7; i++) {
        const u = (t - 25.6 - i * 0.38) / 1.6; if (u <= 0 || u >= 1) continue;
        const x = lerp(966, 820, u) + 40 * Math.sin(u * 5 + i), y = lerp(1030, 640, u) - 80 * Math.sin(Math.PI * u);
        otpBubble(c, x, y, lerp(0.6, 1.0, Math.sin(Math.PI * u)), Math.min(1, Math.sin(Math.PI * u) * 2.2), ['4821', '7730', '1954', '6602', '3317', '9048', '2265'][i]);
      }
    } }, t);
}
function shotDebit(ctx, t) { // 28.4-31.7
  const lastN = [29.1, 29.5, 29.85, 30.1, 30.35, 30.6].filter(a => t > a).pop(), hit = lastN && t - lastN < 0.2 ? 5 * Math.sin((t - lastN) * 80) : 0;
  phoneRig(ctx, t, { z: 1.18, target: 800, screen: c => debitScreen(c, t), shake: hit });
}
function shotShock(ctx, t) { // 31.7-33.6
  const ro = rohanPhone(t, { eyes: 'wide', mouth: 'o', brow: 12, worry: 1, sweat: seg(t, 31.8, 32.6, x => x), look: [0, 0] });
  ro.nod = -8 * pulse(t, 31.78, 0.2) + 2 * Math.sin(t * 40) * (1 - seg(t, 31.78, 32.3));
  bedScene(ctx, { z: 1.25, cx: 540, cy: 900, jx: t > 31.78 && t < 32.1 ? 8 * Math.sin((t - 31.78) * 70) : 0 }, { tod: 'morning', clockMin: 422, ro, dim: 0 }, t);
  const k = clamp((t - 32.6) / 0.14); if (k > 0) stamp(ctx, 540, 1350, '\u20B94 LAKH SAAF', k, C.red, -0.1);
}
function challanSlip(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  shape(ctx, rr(-150, -200, 300, 400, 14), { fill: '#FFFDF6', hatch: '#DCD3C2', ha: 0.2 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-150, -200, 300, 400, 14), true); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(-150, -200, 300, 70); ctx.restore();
  shape(ctx, rr(-150, -200, 300, 400, 14));
  text(ctx, 'e-CHALLAN', 0, -164, 40, '#FFFFFF');
  for (const yy of [-90, -54, -18]) { ctx.fillStyle = '#E2DCD0'; ctx.fillRect(-110, yy, 220, 12); }
  text(ctx, '\u20B9500', 0, 60, 90, C.red);
  text(ctx, 'Pay now!', 0, 140, 34, INK);
  ctx.restore();
}
function shotChaal(ctx, t) { // 33.6-40.5
  paperBG(ctx);
  const mv = seg(t, 34.8, 35.1, E.io);
  ctx.save(); const out = seg(t, 36.95, 37.25, E.i);
  ctx.translate(0, -1400 * out);
  card(ctx, 290, 1000, 400, 560, -0.06, popIn(t, 35.06, 0.32), 'DARR', C.red, c => {
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -0.4 : Math.PI + 0.4) + sx * (i - 1) * 0.4; line(c, [[Math.cos(a) * 140, -10 + Math.sin(a) * 140], [Math.cos(a) * 172, -10 + Math.sin(a) * 172]], { lwk: 1.2 }); }
    c.save(); c.scale(0.9, 0.9); roHead(c, mkRo({ eyes: 'wide', mouth: 'o', worry: 1, brow: 10, sweat: 0.5 })); c.restore();
  });
  const pk = popIn(t, 35.6, 0.25); if (pk > 0.01) { ctx.save(); ctx.translate(540, 1000); ctx.scale(pk, pk); text(ctx, '+', 0, 0, 120, INK); ctx.restore(); }
  card(ctx, 790, 1000, 400, 560, 0.05, popIn(t, 35.96, 0.32), 'JALDI', C.navy, c => stopwatch(c, 0, 0, 120, t));
  ctx.restore();
  if (t > 37.1) { // the challan becomes a file, the file becomes an app (with horns)
    const a = E.back(clamp((t - 37.16) / 0.3)), f1 = seg(t, 38.5, 38.75, E.io), f2 = seg(t, 39.2, 39.45, E.io);
    const flip = t < 38.625 ? 1 - f1 * 2 : t < 38.75 ? (f1 - 0.5) * 2 : t < 39.325 ? 1 - f2 * 2 : (f2 - 0.5) * 2;
    ctx.save(); ctx.translate(540, 1000); ctx.scale(Math.max(0.02, Math.abs(flip)) * a, a);
    if (t < 38.625) challanSlip(ctx, 0, 0, 1.1, 0);
    else if (t < 39.325) apkIcon(ctx, 0, 0, 3.2);
    else {
      appIcon(ctx, 0, 0, 3.0);
      const h = popIn(t, 39.9, 0.25);
      if (h > 0.01) for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 120, -185); ctx.scale(h, h); shape(ctx, spl([[-26, 20], [sx * 6, -50], [26, 20]]), { fill: C.red }); ctx.restore(); }
    }
    ctx.restore();
    if (t > 39.35) starsAround(ctx, [[280, 760, 1.2], [800, 740, 1.0], [820, 1240, 1.3], [260, 1250, 0.9]], popIn(t, 39.35, 0.3) * (1 - seg(t, 40.0, 40.3)));
  }
  chip(ctx, 540, lerp(1000, 420, mv), 'CHAAL', popIn(t, 33.72) * lerp(1.6, 1, mv), C.red, 70);
}
function browserPill(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, rr(-230, -44, 460, 88, 44), { fill: '#FFFFFF', col: C.green, lwk: 1.1 });
  shape(ctx, rr(-196, -14, 24, 22, 4), { fill: C.green, stroke: false }); ctx.strokeStyle = C.green; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-184, -16, 9, Math.PI, 0); ctx.stroke();
  text(ctx, 'parivahan.gov.in', 20, 3, 38, INK, 'center', 800);
  ctx.restore();
}
function shotRule(ctx, t) { // 40.5-49.6
  paperBG(ctx);
  const mv = seg(t, 41.6, 41.9, E.io), bk = popIn(t, 41.7, 0.35);
  if (bk > 0.01) {
    ctx.save(); ctx.translate(540, 1030); ctx.scale(bk, bk); ctx.translate(-540, -1030);
    shape(ctx, rr(126, 556, 860, 960, 30), { fill: 'rgba(60,40,30,0.18)', stroke: false });
    const B = rr(110, 540, 860, 960, 30);
    shape(ctx, B, { fill: '#FFFDF7', hatch: '#E4DCCC', ha: 0.2, stroke: false });
    ctx.save(); ctx.beginPath(); trace(ctx, B, true); ctx.clip(); ctx.lineWidth = 3;
    ctx.strokeStyle = '#CFE0EC'; for (let y = 650; y < 1500; y += 86) { ctx.beginPath(); ctx.moveTo(110, y); ctx.lineTo(970, y); ctx.stroke(); }
    ctx.strokeStyle = '#F0B3AA'; ctx.beginPath(); ctx.moveTo(210, 540); ctx.lineTo(210, 1500); ctx.stroke(); ctx.restore();
    shape(ctx, B);
    ctx.save(); ctx.translate(540, 544); ctx.rotate(-0.04); shape(ctx, rr(-80, -22, 160, 44, 4), { fill: 'rgba(240,226,180,0.85)', lwk: 0.5 }); ctx.restore();
    // row 1: the fake route, struck out
    const k1 = popIn(t, 41.96, 0.3);
    if (k1 > 0.01) {
      ctx.save(); ctx.translate(300, 790); ctx.scale(k1, k1); shape(ctx, ell(0, 0, 76, 76), { fill: '#EEF1F4', lwk: 1 }); apkIcon(ctx, 0, 0, 0.8); ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp(k1); text(ctx, 'WhatsApp pe', 410, 760, 48, INK, 'left'); text(ctx, 'APK challan', 410, 820, 48, INK, 'left'); ctx.restore();
      penPath(ctx, [[400, 792], [720, 786]], seg(t, 44.4, 44.7, E.o), C.red, 11);
      penPath(ctx, [[248, 738], [352, 842]], seg(t, 44.5, 44.65, E.o), C.red, 14); penPath(ctx, [[352, 738], [248, 842]], seg(t, 44.6, 44.75, E.o), C.red, 14);
    }
    // row 2: the only real place
    const k2 = popIn(t, 45.4, 0.3);
    if (k2 > 0.01) {
      ctx.save(); ctx.globalAlpha = clamp(k2); text(ctx, 'Challan check karna hai?', 540, 1010, 46, INK); ctx.restore();
      const kp = popIn(t, 47.42, 0.3); if (kp > 0.01) browserPill(ctx, 540, 1150, kp);
      penEllipse(ctx, 540, 1150, 280, 72, seg(t, 47.8, 48.2, E.o), 4, C.green, 10);
      const kt = popIn(t, 48.4, 0.3); if (kt > 0.01) { ctx.save(); ctx.translate(540, 1330); ctx.scale(kt, kt); shape(ctx, rr(-200, -46, 400, 92, 46), { fill: C.greenLt, col: C.green, lwk: 1.1 }); text(ctx, 'Website ya app', 0, 3, 40, C.green); ctx.restore(); }
    }
    ctx.restore();
  }
  chip(ctx, 540, lerp(1000, 360, mv), 'RULE', popIn(t, 40.64) * lerp(1.6, 1, mv), C.green, 70);
}
function shotUninstall(ctx, t) { // 49.6-53.3
  const tp = t < 51.95 ? [150, -40, tapK(t, 51.72)] : [0, 125, tapK(t, 52.08)];
  phoneRig(ctx, t, { z: 1.2, target: 800, screen: c => settingsScreen(c, t), tap: tp });
}
function shotOops(ctx, t) { // 53.3-55.1: "Galti ho gayi?"
  const ro = rohanPhone(t, { eyes: 'open', mouth: 'worried', worry: 1, brow: 6, look: [0, 0.8], sweat: seg(t, 53.4, 54.4, x => x) });
  deskScene(ctx, { z: 1.4, cx: 540, cy: 860 }, { ro, clockMin: 605, helmetOnShelf: true }, t);
}
function shotHelp(ctx, t) { // 55.1-58.5
  phoneRig(ctx, t, { z: 1.15, target: 810, screen: c => dialer(c, t) });
}
function shotNextTime(ctx, t) { // 58.5-64.2
  const b = t > 58.6 && t < 59.5 ? ((t - 58.6) % 0.45 < 0.3 ? 1 : 0) : 0;
  const ro = rohanPhone(t, { buzz: b, eyes: 'open', mouth: 'flat', look: [0, 0.8] });
  if (t > 59.7) { ro.eyes = 'sly'; ro.mouth = 'smirk'; ro.raise = 1; ro.look = [0.3, 0.2]; ro.fx = 0.1; }
  if (t > 61.88) { ro.eyes = 'open'; ro.mouth = 'grin'; ro.raise = 0; ro.look = [0, 0]; ro.fx = 0; }
  if (t > 63.2) { ro.eyes = 'happy'; ro.nod = 7 * pulse(t, 63.24, 0.5); }
  const push = seg(t, 61.7, 62.3, E.io);
  deskScene(ctx, { z: lerp(1.08, 1.22, push), cx: 540, cy: lerp(940, 900, push) }, { ro, clockMin: 380, helmetOnDesk: true }, t);
  // the same file arrives again; this time it gets crossed out
  const fk = popIn(t, 58.8, 0.3) * (1 - seg(t, 61.2, 61.5));
  if (fk > 0.01) {
    ctx.save(); ctx.translate(815, 500); ctx.scale(fk * 0.82, fk * 0.82);
    shape(ctx, rr(-190, -70, 380, 140, 26), { fill: '#FFFFFF', lwk: 0.9 }); shape(ctx, [[-150, 66], [-176, 100], [-110, 66]], { fill: '#FFFFFF', lwk: 0.9 }); shape(ctx, rr(-186, -66, 372, 132, 24), { fill: '#FFFFFF', stroke: false });
    apkIcon(ctx, -130, 0, 0.62); text(ctx, 'RTO_Challan.apk', 20, -12, 30, INK, 'center', 800); text(ctx, 'from: RTO Traffic Dept', 20, 26, 22, C.ui, 'center', 600);
    penPath(ctx, [[-170, -56], [170, 56]], seg(t, 60.24, 60.45, E.o), C.red, 16); penPath(ctx, [[170, -56], [-170, 56]], seg(t, 60.36, 60.57, E.o), C.red, 16);
    ctx.restore();
  }
  const dk2 = popIn(t, 60.5, 0.25) * (1 - seg(t, 61.5, 61.7)); if (dk2 > 0.01) chip(ctx, 815, 640, 'MAT KHOLO', dk2, C.red, 46);
  shield(ctx, 540, 420, popIn(t, 61.9, 0.35) * 0.78);
  if (t > 63.24) starsAround(ctx, [[210, 300, 1.2], [870, 280, 1.0], [890, 640, 1.3], [190, 620, 0.9]], popIn(t, 63.24, 0.3));
}

// ================= EDIT =================
const SHOTS = [[0, shotHook], [4.76, shotHome], [6.4, shotBuzz], [8.0, shotChat], [15.9, shotInstall], [18.4, shotPerm], [23.5, shotNight],
  [28.4, shotDebit], [31.7, shotShock], [33.6, shotChaal], [40.5, shotRule], [49.6, shotUninstall], [53.3, shotOops], [55.1, shotHelp], [58.5, shotNextTime]];
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); view.z = 1;
  ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H); // never let a previous frame show through
  if (t >= CTA_AT) { drawCTA(ctx, t - CTA_AT); return; }
  let i = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= SHOTS[j][0]) i = j;
  const c0 = SHOTS[i][0], p = i ? 1 + 0.035 * (1 - E.o(clamp((t - c0) / 0.45))) : 1; // each cut lands with a small settling push
  ctx.translate(540, 960); ctx.scale(p, p); ctx.translate(-540, -960);
  if (t >= 4.4 && t < 4.76) { shotHook(ctx, lerp(4.4, 0.2, seg(t, 4.4, 4.76, E.io))); ctx.setTransform(1, 0, 0, 1, 0, 0); rewindFX(ctx, t); return; }
  SHOTS[i][1](ctx, t);
}

// ================= CAPTIONS =================
// {word} = yellow keyword, <word> = red danger word
const CAPS = [
  [0.0, 1.45, '<\u20B9500> ka challan aaya\u2026'], [1.52, 3.0, 'aur Rohan ke account se'], [3.04, 4.35, '<\u20B94 lakh> chale gaye.'],
  [4.46, 6.3, 'Ek recreation dekhiye.'], [6.54, 7.95, 'WhatsApp pe message:'],
  [8.16, 9.9, '"Aapka traffic challan pending hai.'], [9.98, 12.2, 'Abhi bharein, warna <licence cancel>."'],
  [12.32, 13.08, 'Saath mein ek file \u2014'], [13.1, 15.85, '{RTO Challan dot APK}'],
  [16.0, 18.3, 'Jaldi-jaldi mein Rohan ne install kar diya.'],
  [18.48, 20.3, 'App ne ek permission maangi \u2014'], [20.38, 21.85, '<SMS> padhne ki.'], [21.9, 23.45, 'Usne "{Allow}" daba diya.'],
  [23.62, 24.76, 'Us raat phone chup tha\u2026'], [24.78, 26.28, 'par har {OTP}'], [26.3, 28.35, 'chupchaap scammer tak ja raha tha.'],
  [28.48, 29.9, 'Subah \u2014'], [29.92, 31.7, 'ek ke baad ek debit message.'], [31.78, 33.6, '<\u20B94 lakh> saaf.'],
  [33.72, 35.0, 'Chaal simple hai:'], [35.06, 37.0, '{darr} aur {jaldi}.'], [37.16, 38.48, 'Challan ka darr,'], [38.52, 40.5, 'aur ek file jo app ban jaati hai.'],
  [40.64, 41.9, '{Rule} yaad rakhiye:'], [41.96, 43.4, 'Challan kabhi WhatsApp pe'], [43.44, 45.3, '<APK file> ke saath nahi aata.'],
  [45.38, 47.0, 'Challan check karna hai?'], [47.06, 49.7, 'Sirf official {Parivahan} website ya app pe.'],
  [49.84, 51.34, 'Aur jo app SMS padhne ki'], [51.38, 53.35, 'permission maange \u2014 {turant hatao}.'],
  [53.44, 55.15, 'Galti ho gayi?'], [55.24, 56.78, '{1930} pe call karo,'], [56.84, 58.6, 'aur bank ko turant batao.'],
  [58.72, 60.2, 'Toh agli baar challan ki file aaye\u2026'], [60.24, 61.8, '{mat kholo.}'], [61.88, 63.2, 'Scam se bacho.'], [63.24, 64.3, '{Simple.}'],
  [64.36, 66.2, 'Aise aur scams ki files kholne ke liye'], [66.26, 69, '{FishyFiles} ko follow karein.'],
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
