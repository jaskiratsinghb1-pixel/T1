// Episode 05 — AI voice-clone "Papa, mujhe bachao" call. Paper-doll storybook style (lib/doll.js), FishyFiles end card (lib/cta.js).
// Hand rule: characters only ever show two hands; phone taps are made by the right hand leaving the phone as a pointing fist.
// Usage: node ep05.js all [seconds] | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - ...
//        node ep05.js 30,150,240       -> PNG stills in anim/out/
const fs = require('fs'), path = require('path');
const D = require('../../../lib/doll.js');
const { drawCTA, ready: ctaReady } = require('../../../lib/cta.js');
const { createCanvas, INK, view, clamp, lerp, lerp2, E, seg, pulse, rng, dk, mix, shape, line, ell, arcP, rr, sup, spl, mirror, blob, text, sleeve, hand, armPose, HX, SK, trace, chip, stamp, penPath, penEllipse, star, starsAround, bubble } = D;

const W = 1080, H = 1920, FPS = 30;
const CTA_AT = 65.9;
const C = {
  wall: '#EFE2CC', wallH: '#D8C29E', skirt: '#FBF6EC', floor: '#C9A57E', floorLn: '#B18C64', rug: '#3F6E8C', rug2: '#E7B454',
  sofa: '#9A5B4F', sofa2: '#84493F', wood: '#B9855A', woodTop: '#CC9A6E', curtain: '#6E9A8A', white: '#FFFFFF',
  mSkin: '#DDA77E', grey: '#BDB6AC', greyDk: '#8F887E', stache: '#9E978D', kurta: '#F2EDE2', cardi: '#C7923E', cardiDk: '#A97A30',
  kSkin: '#E2AE84', kHair: '#2A211D', hood: '#4E6FA8', hoodDk: '#3D5A8E', phones: '#2E2E33',
  mouth: '#8C2F2A', tongue: '#E27D72', blush: 'rgba(238,150,135,0.55)',
  red: '#D54B40', green: '#3FA35B', greenLt: '#E4F3E7', navy: '#2C3A5A', gold: '#E2B246', phone: '#2E2E33', ui: '#8E8A84', bank: '#2F5BA8',
  hostel: '#DCE3EC', hostelH: '#B8C4D4', blanket: '#C9695A', blanket2: '#F1D27A', pillow: '#F7F1E6',
};
const popIn = (t, t0, d = 0.28) => E.back(clamp((t - t0) / d));

// ---------- voiceover envelope (drives the call waveforms) ----------
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
const level = t => { const i = Math.floor(t * FPS); return clamp((((ENV[i - 1] || 0) + 2 * (ENV[i] || 0) + (ENV[i + 1] || 0)) / 4 - 0.01) * 6); };

// ---------- shared bits ----------
function ringArcs(ctx, x, y, t, k, dir) { // "buzz" marks beside a vibrating phone
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  for (let i = 0; i < 2; i++) line(ctx, arcP(x, y, 26 + i * 22 + 4 * Math.sin(t * 30), dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7, 10), { lwk: 1.1 });
  ctx.restore();
}
function handset(ctx, x, y) { ctx.save(); ctx.beginPath(); ctx.arc(x, y + 10, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = C.white; ctx.stroke(); ctx.restore(); }
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
  ctx.font = '800 60px Baloo'; const fit = Math.min(1, (w - 40) / ctx.measureText(head).width);
  ctx.save(); ctx.translate(0, -h / 2 + 58); ctx.scale(fit, fit); text(ctx, head, 0, 0, 60, C.white); ctx.restore();
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
function inr(n) { const s = String(n); if (s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); }
function waveform(ctx, x, y, w, h, t, col, n = 26, amp = 1) { // voice bars driven by the VO
  const lv = level(t) * amp, bw = w / n;
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const f = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + t * 9) * Math.sin(i * 0.6 + t * 4.3)), bh = Math.max(8, h * lv * f);
    ctx.beginPath(); trace(ctx, rr(x - w / 2 + i * bw + bw * 0.2, y - bh / 2, bw * 0.6, bh, bw * 0.3), true); ctx.fill();
  }
}

// ================= MEHTA JI =================
// Late-50s dad: round face, receding grey hair, round glasses, bushy grey moustache, mustard cardigan over an off-white kurta.
const mkMJ = o => ({ fx: 0, look: [0, 0.3], eyes: 'open', mouth: 'smile', brow: 0, worry: 0, sweat: 0, glow: 0, nod: 0, tilt: 0, hold: 'lap', glint: 0, ...o });
function mjHead(ctx, s) {
  const fx = s.fx * 12;
  for (const sx of [-1, 1]) {
    const ex = sx * 104 - s.fx * 5;
    SK(ctx, ell(ex, 16, 18, 25), C.mSkin);
    line(ctx, arcP(ex - sx * 2, 16, 9, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 });
  }
  const face = sup(0, 6, 104, 110, 2.2, 0.02);
  SK(ctx, face, C.mSkin);
  // receding grey hair: side tufts joined by a thin crown, with a shiny forehead
  for (const sx of [-1, 1]) HX(ctx, spl([[sx * 104, 4], [sx * 110, -44], [sx * 92, -86], [sx * 60, -104], [sx * 52, -88], [sx * 78, -64], [sx * 90, -30], [sx * 94, 0]].map(([x, y]) => [x, y])), { fill: C.grey });
  line(ctx, spl([[-60, -104], [-20, -114], [20, -114], [60, -104]], false), { col: C.grey, lwk: 3.4 });
  line(ctx, arcP(-30, -62, 26, 3.6, 4.4, 8), { col: '#FFFFFF', lwk: 1.6, alpha: 0.7 });
  for (const sx of [-1, 1]) blob(ctx, sx * 64 + fx, 44, 20, 11, C.blush);
  for (const sx of [-1, 1]) { // bushy grey brows
    ctx.save(); ctx.translate(sx * 40 + fx, -30 - s.brow); ctx.rotate(sx * 0.26 * s.worry);
    shape(ctx, rr(-24, -7, 48, 14, 7), { fill: C.greyDk, lwk: 0.6 }); ctx.restore();
  }
  for (const sx of [-1, 1]) {
    const ex = sx * 40 + fx, ey = 4, e = s.eyes;
    if (e === 'happy') line(ctx, arcP(ex, ey + 6, 12, Math.PI + 0.35, 2 * Math.PI - 0.35, 12), { lwk: 1.25 });
    else if (e === 'blink') line(ctx, [[ex - 12, ey], [ex + 12, ey]], { lwk: 1.1 });
    else if (e === 'shut') line(ctx, arcP(ex, ey - 6, 12, 0.4, Math.PI - 0.4, 12), { lwk: 1.2 });
    else {
      const wide = e === 'wide', R = wide ? 17 : 13, pr = wide ? 4.4 : 6.8;
      shape(ctx, ell(ex, ey, R, R), { fill: C.white });
      const qx = ex + s.look[0] * (wide ? 2 : 4), qy = ey + s.look[1] * (wide ? 2 : 4);
      blob(ctx, qx, qy, pr, pr, INK); blob(ctx, qx + pr * 0.35, qy - pr * 0.4, pr * 0.32, pr * 0.32, C.white);
    }
  }
  // round glasses
  for (const sx of [-1, 1]) shape(ctx, ell(sx * 40 + fx, 4, 28, 26), { fill: 'rgba(255,255,255,0.14)', lwk: 0.9 });
  line(ctx, arcP(fx, 2, 12, Math.PI + 0.45, 2 * Math.PI - 0.45, 8), { lwk: 0.9 });
  for (const sx of [-1, 1]) line(ctx, [[sx * 68 + fx, 0], [sx * 100 - s.fx * 5, 8]], { lwk: 0.8 });
  if (s.glint > 0) { ctx.save(); ctx.globalAlpha = s.glint; for (const sx of [-1, 1]) line(ctx, [[sx * 40 + fx - 16, -6], [sx * 40 + fx - 6, -16]], { col: '#FFFFFF', lwk: 1.5 }); ctx.restore(); }
  line(ctx, spl([[fx + 3, 22], [fx - 8, 40], [fx + 1, 48], [fx + 10, 44]], false), { lwk: 0.9 });
  // mouth under the moustache
  const m = s.mouth;
  if (m === 'grin') { const M = spl([[-30, 70], [30, 70], [22, 90], [0, 98], [-22, 90]]).map(([x, y]) => [x + fx, y]); shape(ctx, M, { fill: C.mouth }); }
  else if (m === 'o') shape(ctx, ell(fx, 86, 11, 14), { fill: C.mouth });
  else if (m === 'worried') line(ctx, Array.from({ length: 11 }, (_, i) => [fx - 20 + i * 4, 88 + 3 * Math.sin(i * 1.5)]), { lwk: 0.95 });
  else if (m === 'flat') line(ctx, [[fx - 16, 86], [fx + 16, 86]], { lwk: 1 });
  else line(ctx, arcP(fx, 58, 26, 0.55, Math.PI - 0.55, 14), { lwk: 1 });
  const half = [[0, 56], [22, 52], [44, 56], [60, 68], [54, 80], [34, 76], [16, 74], [0, 78]];
  shape(ctx, spl(half.concat(mirror(half).reverse().slice(1, -1)).map(([x, y]) => [x + fx, y])), { fill: C.stache, hatch: dk(C.stache, 0.3), ha: 0.35 });
  if (s.glow > 0) { ctx.save(); ctx.beginPath(); trace(ctx, face, true); ctx.clip(); ctx.fillStyle = `rgba(150,195,255,${0.2 * s.glow})`; ctx.fillRect(-130, -130, 260, 270); ctx.restore(); }
  if (s.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(s.sweat * 4); const y = -52 + 40 * s.sweat;
    shape(ctx, spl([[98, y - 24], [110, y + 2], [98, y + 13], [86, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
function mjBody(ctx, s) {
  SK(ctx, rr(-28, -44, 56, 56, 12), C.mSkin);
  const T = spl([[-94, -8], [0, -12], [94, -8], [134, 26], [146, 200], [152, 420], [-152, 420], [-146, 200], [-134, 26]]);
  HX(ctx, T, { fill: C.cardi });
  shape(ctx, [[-40, -10], [40, -10], [34, 420], [-34, 420]], { fill: C.kurta, hatch: '#D9D2C4', ha: 0.25 }); // kurta showing through the open cardigan
  shape(ctx, rr(-30, -20, 60, 22, 8), { fill: C.kurta, lwk: 0.8 }); // mandarin collar
  line(ctx, [[0, 2], [0, 150]], { col: '#CFC7B8', lwk: 0.7 }); for (const y of [30, 70, 110]) blob(ctx, 0, y, 4, 4, '#B9B0A0');
  for (const sx of [-1, 1]) line(ctx, spl([[sx * 40, -8], [sx * 36, 200], [sx * 34, 420]], false), { lwk: 1 });
  for (const y of [120, 200, 280]) blob(ctx, 50, y, 6, 6, C.cardiDk);
  ctx.save(); ctx.translate(0, -18 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -118); mjHead(ctx, s); ctx.restore();
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
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + i / 3) % 1, x0 = x + (i - 1) * 18, pts = [];
    for (let j = 0; j <= 8; j++) { const v = j / 8; pts.push([x0 + 7 * Math.sin(v * 6 + t * 3 + i), y - 54 - v * 70 - ph * 20]); }
    ctx.globalAlpha = 0.5 * Math.sin(Math.PI * ph); line(ctx, pts, { col: '#FFFFFF', lwk: 0.9 });
  }
  ctx.restore();
  shape(ctx, rr(x - 42, y - 44, 84, 88, 16), { fill: C.white, hatch: '#D8CFC0', ha: 0.25 });
  shape(ctx, rr(x - 42, y - 14, 84, 18, 4), { fill: C.cardi, lwk: 0.6 });
}
function mjArms(ctx, s, t) {
  const T = s.hold === 'phone' ? [[-56, 222], [56, 222]] : s.hold === 'cup' ? [[-44, 238], [44, 238]] : [[-96, 330], [96, 330]];
  const arms = [[-1, T[0]], [1, T[1]]].map(([sx, tg]) => {
    const sh = [sx * 102, 40], d = Math.hypot(tg[0] - sh[0], tg[1] - sh[1]);
    return armPose(ctx, sh, tg, d * 0.56, d * 0.54, sx, 56, C.cardi, C.kurta); // reach-derived lengths keep the arms close to the body
  });
  if (s.hold === 'phone') { ctx.save(); ctx.translate(0, 176); ctx.scale(0.78, 0.78); phoneBack(ctx, 0, 0, s.glow); ctx.restore(); }
  if (s.hold === 'cup') cupHeld(ctx, 0, 222, t);
  arms.forEach(a => hand(ctx, a, 27, C.mSkin));
  if (s.buzz > 0 && s.hold === 'phone') { ringArcs(ctx, -76, 120, t, s.buzz, -1); ringArcs(ctx, 76, 120, t, s.buzz, 1); }
}

// ================= KABIR =================
// College-age son: round face, messy dark hair, blue hoodie, headphones.
const mkKB = o => ({ look: [0, 0.2], eyes: 'open', mouth: 'smile', brow: 0, nod: 0, tilt: 0, phones: 'neck', messy: 0, ...o });
function kbHead(ctx, s) {
  for (const sx of [-1, 1]) { SK(ctx, ell(sx * 100, 14, 17, 23), C.kSkin); line(ctx, arcP(sx * 98, 14, 8, sx > 0 ? -1.3 : Math.PI - 1.3, sx > 0 ? 1.3 : Math.PI + 1.3, 10), { lwk: 0.7 }); }
  SK(ctx, sup(0, 4, 100, 106, 2.15, 0.06), C.kSkin);
  const mess = s.messy;
  HX(ctx, spl([[-104, 2], [-112, -48], [-92, -98], [-50, -124], [-10, -132 - 16 * mess], [30, -120], [60, -134 - 20 * mess], [96, -92], [110, -42], [106, 2], [98, -30], [70, -48], [30, -40], [0, -58], [-30, -46], [-62, -54], [-86, -40], [-98, -20]], true, 5), { fill: C.kHair });
  if (mess > 0) line(ctx, spl([[20, -128], [34, -160], [50, -150]], false), { col: C.kHair, lwk: 2.4 });
  for (const sx of [-1, 1]) blob(ctx, sx * 60, 42, 20, 11, C.blush);
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 38, -24 - s.brow); ctx.rotate(-sx * 0.06); shape(ctx, rr(-20, -5, 40, 10, 5), { fill: C.kHair, lwk: 0.6 }); ctx.restore(); }
  for (const sx of [-1, 1]) {
    const ex = sx * 38, ey = 6, e = s.eyes;
    if (e === 'sleep') line(ctx, arcP(ex, ey - 6, 12, 0.4, Math.PI - 0.4, 12), { lwk: 1.2 });
    else if (e === 'happy') line(ctx, arcP(ex, ey + 6, 12, Math.PI + 0.35, 2 * Math.PI - 0.35, 12), { lwk: 1.25 });
    else if (e === 'drowsy') { // half-open, just woken up
      shape(ctx, ell(ex, ey, 14, 14), { fill: C.white, stroke: false }); blob(ctx, ex, ey + 5, 6.5, 6.5, INK);
      ctx.save(); ctx.beginPath(); trace(ctx, ell(ex, ey, 14, 14), true); ctx.clip(); ctx.fillStyle = C.kSkin; ctx.fillRect(ex - 16, ey - 16, 32, 16); ctx.restore();
      shape(ctx, ell(ex, ey, 14, 14), { lwk: 0.9 }); line(ctx, [[ex - 16, ey], [ex + 16, ey]], { lwk: 1.2 });
    } else { shape(ctx, ell(ex, ey, 15, 15), { fill: C.white }); blob(ctx, ex + s.look[0] * 5, ey + s.look[1] * 4, 7.5, 7.5, INK); blob(ctx, ex + s.look[0] * 5 + 2.6, ey + s.look[1] * 4 - 3, 2.4, 2.4, C.white); }
  }
  line(ctx, spl([[3, 22], [-7, 38], [1, 45], [9, 42]], false), { lwk: 0.9 });
  if (s.mouth === 'grin') { const M = spl([[-32, 62], [32, 62], [24, 84], [0, 94], [-24, 84]]); shape(ctx, M, { fill: C.mouth, stroke: false }); ctx.save(); ctx.beginPath(); trace(ctx, M, true); ctx.clip(); ctx.fillStyle = C.white; ctx.fillRect(-40, 56, 80, 12); ctx.restore(); shape(ctx, M); }
  else if (s.mouth === 'sleep') shape(ctx, ell(0, 76, 7, 8), { fill: C.mouth });
  else if (s.mouth === 'yawn') shape(ctx, ell(0, 76, 14, 18), { fill: C.mouth });
  else line(ctx, arcP(0, 46, 28, 0.5, Math.PI - 0.5, 14), { lwk: 1 });
  if (s.phones === 'head') { // headphones worn over the hair
    line(ctx, arcP(0, -10, 118, Math.PI + 0.2, 2 * Math.PI - 0.2, 24), { col: C.phones, lwk: 3.6 });
    for (const sx of [-1, 1]) shape(ctx, rr(sx * 108 - 22, -10, 44, 64, 18), { fill: C.phones });
  }
}
function kbBody(ctx, s) {
  SK(ctx, rr(-28, -44, 56, 56, 12), C.kSkin);
  if (s.phones === 'neck') { line(ctx, arcP(0, -10, 66, 0.25, Math.PI - 0.25, 16), { col: C.phones, lwk: 3.2 }); for (const sx of [-1, 1]) shape(ctx, rr(sx * 62 - 20, 2, 40, 48, 16), { fill: C.phones }); }
  const T = spl([[-94, -8], [0, -12], [94, -8], [134, 26], [146, 200], [152, 420], [-152, 420], [-146, 200], [-134, 26]]);
  HX(ctx, T, { fill: C.hood });
  HX(ctx, spl([[-80, -6], [-40, -30], [40, -30], [80, -6], [40, 20], [-40, 20]]), { fill: C.hoodDk }); // hood bunched at the neck
  for (const sx of [-1, 1]) { line(ctx, [[sx * 18, 16], [sx * 22, 110]], { lwk: 0.8 }); blob(ctx, sx * 22, 116, 6, 8, '#EEF3F8'); }
  shape(ctx, [[-70, 250], [70, 250], [86, 330], [-86, 330]], { fill: C.hood, hatch: dk(C.hood, 0.28), ha: 0.5 });
  ctx.save(); ctx.translate(0, -18 + s.nod); ctx.rotate(s.tilt); ctx.translate(0, -114); kbHead(ctx, s); ctx.restore();
}

// ================= THE AI VOICE COPIER =================
function robot(ctx, x, y, s, t, mood = 'grin') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  line(ctx, [[0, -118], [0, -150]], { lwk: 1.2 }); shape(ctx, ell(0, -160, 14, 14), { fill: (Math.floor(t * 4) % 2) ? C.red : '#F2A49E' });
  HX(ctx, rr(-120, -118, 240, 210, 44), { fill: '#9AA6B8' });
  shape(ctx, rr(-92, -80, 184, 120, 26), { fill: '#243044', lwk: 0.9 });
  for (const sx of [-1, 1]) {
    if (mood === 'grin') { ctx.save(); ctx.translate(sx * 40, -30); ctx.rotate(sx * 0.2); shape(ctx, rr(-22, -8, 44, 16, 8), { fill: '#FF6B5B', stroke: false }); ctx.restore(); }
    else shape(ctx, rr(sx * 40 - 16, -44, 32, 28, 8), { fill: '#7FE3FF', stroke: false });
  }
  ctx.fillStyle = '#7FE3FF'; const lv = level(t);
  for (let i = 0; i < 7; i++) { const bh = 6 + 22 * lv * Math.abs(Math.sin(i * 1.3 + t * 12)); ctx.fillRect(-48 + i * 14, 10 - bh / 2, 8, bh); }
  for (const sx of [-1, 1]) shape(ctx, rr(sx * 132 - 14, -40, 28, 60, 10), { fill: '#7E8AA0' });
  ctx.restore();
}

// ================= SETS =================
const AU = { x: 540, y: 905 };
function clock(ctx, x, y, r, min) {
  shape(ctx, ell(x, y, r, r), { fill: C.white, hatch: '#D8CFC0', ha: 0.2, lwk: 1 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, [[x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74], [x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86]], { lwk: 0.5 }); }
  const am = min / 60 * Math.PI * 2 - Math.PI / 2, ah = min / 720 * Math.PI * 2 - Math.PI / 2;
  line(ctx, [[x, y], [x + Math.cos(ah) * r * 0.46, y + Math.sin(ah) * r * 0.46]], { lwk: 1.1 });
  line(ctx, [[x, y], [x + Math.cos(am) * r * 0.7, y + Math.sin(am) * r * 0.7]], { lwk: 0.8 });
  blob(ctx, x, y, 5, 5, INK);
}
function nightSky(ctx, x, y, w, h, stars = true) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#1E2446'); g.addColorStop(1, '#3B3F6E'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  blob(ctx, x + w - 80, y + 90, 30, 30, '#FFF3D6'); blob(ctx, x + w - 68, y + 80, 28, 28, '#2A3160');
  if (stars) for (const [a, b] of [[40, 60], [120, 110], [190, 50], [70, 170]]) blob(ctx, x + a, y + b, 3, 3, '#FFF3D6');
  for (const [bx, bw, bh] of [[10, 70, 190], [90, 56, 270], [156, 80, 160], [246, 60, 230]]) {
    shape(ctx, rr(x + bx, y + h - bh, bw, bh + 20, 3), { fill: '#343863', hatch: '#23264A', ha: 0.3, lwk: 0.6 });
    for (let wy = y + h - bh + 18; wy < y + h - 16; wy += 34) for (let wx = x + bx + 12; wx < x + bx + bw - 14; wx += 22) { ctx.fillStyle = '#F5E0A0'; ctx.fillRect(wx, wy, 11, 14); }
  }
}
function photoKabir(ctx, x, y, s) { // framed photo of Kabir on the wall
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, rr(-85, -105, 170, 210, 8), { fill: C.wood, hatch: dk(C.wood), ha: 0.4, lwk: 0.9 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-67, -87, 134, 174, 4), true); ctx.clip();
  ctx.fillStyle = '#DCE9EF'; ctx.fillRect(-67, -87, 134, 174);
  ctx.translate(0, 40); ctx.scale(0.34, 0.34); kbBody(ctx, mkKB({ mouth: 'grin', phones: 'neck' })); ctx.restore();
  shape(ctx, rr(-67, -87, 134, 174, 4), { lwk: 0.7 });
  ctx.restore();
}
function livingRoom(ctx, o) {
  shape(ctx, [[-400, -400], [1480, -400], [1480, 1400], [-400, 1400]], { fill: C.wall, hatch: C.wallH, ha: 0.35, stroke: false });
  shape(ctx, [[-400, 1400], [1480, 1400], [1480, 2400], [-400, 2400]], { fill: C.floor, hatch: dk(C.floor), ha: 0.4, stroke: false });
  for (const y of [1470, 1560, 1680, 1830]) line(ctx, [[-400, y], [1480, y]], { col: C.floorLn, lwk: 0.5 });
  shape(ctx, rr(-400, 1378, 1880, 24, 4), { fill: C.skirt, lwk: 0.7 });
  shape(ctx, rr(60, 360, 320, 520, 10), { fill: C.white, lwk: 1 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(78, 378, 284, 484, 4), true); ctx.clip(); nightSky(ctx, 78, 378, 284, 484); ctx.restore();
  shape(ctx, rr(78, 378, 284, 484, 4), { lwk: 0.9 }); line(ctx, [[220, 378], [220, 862]], { lwk: 0.9 });
  shape(ctx, rr(44, 876, 352, 26, 8), { fill: C.white, lwk: 0.9 });
  line(ctx, [[20, 340], [420, 340]], { lwk: 1.2 });
  for (const side of [0, 1]) {
    const p = [[30, 340], [118, 340], [104, 600], [126, 910], [30, 910]].map(([x, y]) => side ? [440 - x, y] : [x, y]);
    HX(ctx, spl(p), { fill: C.curtain });
    for (const fxx of [60, 88]) line(ctx, spl([[side ? 440 - fxx : fxx, 350], [side ? 440 - fxx - 6 : fxx + 6, 620], [side ? 440 - fxx : fxx, 900]], false), { col: dk(C.curtain, 0.3), lwk: 0.5 });
  }
  clock(ctx, 560, 300, 62, o.clockMin ?? 600);
  photoKabir(ctx, 855, 505, 1);
  if (o.photoX) { penPath(ctx, [[790, 422], [920, 588]], o.photoX, C.red, 13); }
  // floor lamp, lit
  const lg = ctx.createRadialGradient(990, 760, 20, 990, 760, 320); lg.addColorStop(0, 'rgba(255,214,140,0.45)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = lg; ctx.fillRect(670, 440, 640, 640);
  line(ctx, [[990, 790], [990, 1380]], { lwk: 1.1 }); shape(ctx, ell(990, 1384, 60, 12), { fill: '#6D5A48', lwk: 0.8 });
  shape(ctx, [[930, 700], [1050, 700], [1072, 792], [908, 792]], { fill: '#FBE3AE', hatch: '#CDB083', ha: 0.3 });
}
function sofa(ctx) {
  shape(ctx, ell(540, 1392, 480, 24), { fill: 'rgba(40,20,30,0.2)', stroke: false });
  HX(ctx, rr(100, 930, 880, 340, 70), { fill: C.sofa });
  for (const x of [320, 540, 760]) blob(ctx, x, 1040, 6, 6, dk(C.sofa, 0.4));
  HX(ctx, rr(150, 1190, 780, 130, 34), { fill: C.sofa2 });
  for (const x of [60, 890]) HX(ctx, rr(x, 1070, 130, 290, 56), { fill: C.sofa });
  for (const [x, rot, col] of [[250, -0.14, C.rug2], [830, 0.14, C.curtain]]) {
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
  shape(ctx, rr(190, 1294, 190, 26, 4), { fill: '#F4F0E6', hatch: '#CFC7B6', ha: 0.3, lwk: 0.7 }); // newspaper
  for (const x of [215, 265, 315]) line(ctx, [[x, 1300], [x + 36, 1300]], { col: '#9D978B', lwk: 0.4 });
  shape(ctx, ell(820, 1316, 58, 12), { fill: C.white, lwk: 0.7 });
  if (o.cupOnTable) { shape(ctx, rr(784, 1244, 72, 70, 14), { fill: C.white, hatch: '#D8CFC0', ha: 0.25 }); shape(ctx, rr(784, 1266, 72, 14, 3), { fill: C.cardi, lwk: 0.5 }); line(ctx, arcP(860, 1278, 18, -1.3, 1.3, 10), { lwk: 1 }); }
  if (o.phoneBuzz !== undefined) {
    const b = o.phoneBuzz, jx = b > 0 ? 3 * Math.sin(t * 90) : 0;
    shape(ctx, [[412 + jx, 1318], [522 + jx, 1318], [534 + jx, 1302], [424 + jx, 1302]], { fill: C.phone });
    if (b > 0) { line(ctx, [[430 + jx, 1306], [520 + jx, 1306]], { col: '#BFE0FF', lwk: 1.2 }); ringArcs(ctx, 400, 1296, t, b, -1); ringArcs(ctx, 546, 1296, t, b, 1); }
  }
}
function hostelRoom(ctx) {
  shape(ctx, [[-400, -400], [1480, -400], [1480, 1500], [-400, 1500]], { fill: C.hostel, hatch: C.hostelH, ha: 0.35, stroke: false });
  shape(ctx, [[-400, 1500], [1480, 1500], [1480, 2400], [-400, 2400]], { fill: '#9C8C7A', hatch: '#7E6F5F', ha: 0.4, stroke: false });
  shape(ctx, rr(660, 330, 330, 480, 10), { fill: C.white, lwk: 1 });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(678, 348, 294, 444, 4), true); ctx.clip(); nightSky(ctx, 678, 348, 294, 444); ctx.restore();
  shape(ctx, rr(678, 348, 294, 444, 4), { lwk: 0.9 }); line(ctx, [[825, 348], [825, 792]], { lwk: 0.9 });
  // pennant + sticky notes + guitar poster: a student's wall
  shape(ctx, [[110, 300], [380, 330], [110, 400]], { fill: '#E3B04B', hatch: dk('#E3B04B'), ha: 0.35 }); text(ctx, 'HOSTEL B', 200, 348, 30, INK);
  for (const [x, y, c, r] of [[140, 470, '#F6E27A', -0.1], [230, 490, '#F2A49E', 0.08], [320, 462, '#A9D8C0', -0.05]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); shape(ctx, rr(-36, -36, 72, 72, 4), { fill: c, lwk: 0.7 }); line(ctx, [[-20, -8], [20, -8]], { col: '#8C7F6C', lwk: 0.5 }); line(ctx, [[-20, 8], [10, 8]], { col: '#8C7F6C', lwk: 0.5 }); ctx.restore(); }
  clock(ctx, 540, 250, 50, 850);
}
function hostelBed(ctx, o) { // Kabir asleep: headboard, pillow, head, blanket; phone face-down on the side table
  HX(ctx, rr(140, 820, 800, 420, 40), { fill: '#6F7C8E' });
  HX(ctx, rr(170, 850, 740, 300, 30), { fill: '#8795A8' });
  shape(ctx, rr(300, 960, 480, 180, 70), { fill: C.pillow, hatch: '#D9D1C2', ha: 0.3 });
  HX(ctx, rr(880, 1080, 190, 300, 10), { fill: C.woodTop }); shape(ctx, rr(870, 1070, 210, 24, 6), { fill: C.wood, lwk: 0.8 });
  shape(ctx, [[910, 1070], [1010, 1070], [1022, 1054], [922, 1054]], { fill: C.phone });
  ctx.save(); ctx.translate(560, 990); ctx.rotate(0.22); kbHead(ctx, o.kb); ctx.restore();
  const z = (o.t * 0.7) % 1;
  for (let i = 0; i < 3; i++) { const k = (z + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * k); text(ctx, 'z', 720 + 30 * i + 20 * k, 820 - 60 * i - 50 * k, 40 + i * 12, '#5D6FA8'); ctx.restore(); }
  const B = spl([[80, 1180], [540, 1150], [1000, 1180], [1020, 1700], [60, 1700]]);
  shape(ctx, B, { fill: C.blanket, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, B, true); ctx.clip(); for (let y = 1230; y < 1700; y += 90) { ctx.fillStyle = C.blanket2; ctx.fillRect(0, y, 1100, 18); } ctx.restore();
  shape(ctx, B, { hatch: dk(C.blanket, 0.3), ha: 0.35, fill: 'rgba(0,0,0,0)' });
  shape(ctx, rr(80, 1164, 940, 40, 20), { fill: '#F6EBDD', lwk: 0.9 });
}

// ================= PHONE POV (Mehta ji's hands) =================
const RIG = { sl: C.cardi, sl2: C.kurta, skin: C.mSkin };
function gripThumb(ctx, p, ang) { ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); shape(ctx, rr(-14, -34, 128, 68, 34), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 }); ctx.restore(); }
function pointerHand(ctx, tip, ang) { // fist with one rounded pointing finger; tip = fingertip
  ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  sleeve(ctx, [[40, 900], [30, 600], [14, 300]], 150, RIG.sl, RIG.sl2);
  shape(ctx, spl([[-80, 190], [-60, 132], [0, 118], [70, 136], [96, 200], [80, 270], [10, 292], [-60, 268]]), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-28, 0, 56, 176, 28), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-104, 170, 110, 56, 28), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 });
  ctx.restore();
}
let BG = null;
function blurredRoom() {
  if (BG) return BG;
  const a = createCanvas(W, H), x = a.getContext('2d');
  x.translate(540, 960); x.scale(1.5, 1.5); x.translate(-540, -700); livingRoom(x, { clockMin: 600 });
  x.getImageData(0, 0, 1, 1);
  BG = createCanvas(W, H); const y = BG.getContext('2d');
  y.fillStyle = C.wall; y.fillRect(0, 0, W, H);
  y.filter = 'blur(18px)'; y.drawImage(a, -60, -60, W + 120, H + 120); y.filter = 'none';
  y.fillStyle = 'rgba(30,26,50,0.22)'; y.fillRect(0, 0, W, H); y.getImageData(0, 0, 1, 1);
  return BG;
}
function phoneRig(ctx, t, o) { // two hands only: both grip, or the left grips while the right points and taps
  ctx.drawImage(blurredRoom(), 0, 0);
  if (o.dark) { ctx.fillStyle = `rgba(16,18,40,${o.dark})`; ctx.fillRect(0, 0, W, H); }
  const z = o.z, ty = o.target + 60 * z, one = !!o.point;
  ctx.save(); ctx.translate(540 + (o.shake || 0), ty); ctx.scale(z, z); ctx.rotate((one ? -0.05 : -0.02) + 0.008 * Math.sin(t * 1.3));
  const aL = sleeve(ctx, [[-470, 1150], [-420, 760], [-300, 470]], 170, RIG.sl, RIG.sl2);
  const palm = a => [a.w[0] + Math.cos(a.dir) * 40, a.w[1] + Math.sin(a.dir) * 40], pL = palm(aL);
  let pR = null;
  if (!one) { const aR = sleeve(ctx, [[470, 1150], [430, 720], [300, 400]], 170, RIG.sl, RIG.sl2); pR = palm(aR); }
  shape(ctx, ell(pL[0], pL[1], 96, 90), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 });
  if (pR) shape(ctx, ell(pR[0], pR[1], 96, 90), { fill: RIG.skin, hatch: dk(RIG.skin, 0.25), ha: 0.14 });
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  const scr = rr(-252, -532, 504, 1064, 42);
  ctx.save(); ctx.beginPath(); trace(ctx, scr, true); ctx.clip(); o.screen(ctx);
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-252, -532); ctx.lineTo(60, -532); ctx.lineTo(-252, 60); ctx.closePath(); ctx.fill();
  ctx.restore();
  shape(ctx, scr, { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  gripThumb(ctx, pL, -1.3); if (pR) gripThumb(ctx, pR, -Math.PI + 1.3);
  if (o.buzz > 0) { ringArcs(ctx, -300, -470, t, o.buzz, -1); ringArcs(ctx, 300, -470, t, o.buzz, 1); }
  if (one) { const rest = [250, 470], k = o.point.k, tip = [lerp(rest[0], o.point.tgt[0], k), lerp(rest[1], o.point.tgt[1], k) - 30 * Math.sin(Math.PI * k)]; pointerHand(ctx, tip, -0.42 + 0.1 * k); }
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
const fmt = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
// ---------- call screens (phone-local: 504 x 1064 centred on 0,0) ----------
function avatar(ctx, y, r, who, t, g = 0) { // who: kabir | robot | unknown; g = glitch amount 0..1
  ctx.save(); ctx.beginPath(); ctx.arc(0, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = who === 'unknown' ? '#3A3F4A' : '#DCE9EF'; ctx.fillRect(-r, y - r, 2 * r, 2 * r);
  if (who === 'kabir' || (who === 'robot' && g < 1)) { ctx.save(); ctx.translate(0, y + r * 0.35); ctx.scale(r / 250, r / 250); kbBody(ctx, mkKB({ mouth: 'grin' })); ctx.restore(); }
  if (who === 'robot') { ctx.save(); ctx.globalAlpha = clamp(g * 1.4); ctx.fillStyle = '#1E2536'; ctx.fillRect(-r, y - r, 2 * r, 2 * r); robot(ctx, 0, y + r * 0.12, r / 190, t); ctx.restore(); }
  if (who === 'unknown') text(ctx, '?', 0, y + 6, r * 1.1, '#9AA3B4');
  ctx.restore();
  if (g > 0 && g < 1) { // glitch slices: shift horizontal bands of the avatar
    const r2 = rng(Math.floor(t * 20));
    for (let i = 0; i < 6; i++) { const yy = y - r + r2() * 2 * r, hh = 8 + r2() * 20; ctx.fillStyle = r2() > 0.5 ? 'rgba(255,90,90,0.55)' : 'rgba(90,220,255,0.55)'; ctx.fillRect(-r - 10 + (r2() - 0.5) * 60, yy, 2 * r + 20, hh); }
  }
  shape(ctx, ell(0, y, r, r), { col: '#FFFFFF', lwk: 1 });
}
function callScreen(ctx, t, o) { // o: {who, name, status, g, incoming, wave, waveCol, endK}
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, o.red ? '#4A2530' : '#2E3E5C'); g.addColorStop(1, o.red ? '#1E1016' : '#141C2B'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  statusBar(ctx, '10:00', '#FFFFFF');
  if (o.incoming) for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * 0.5; ctx.beginPath(); ctx.arc(0, -250, 122 + k * 90, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = '#8FA4C8'; ctx.stroke(); ctx.restore(); }
  avatar(ctx, -250, 120, o.who, t, o.g || 0);
  let name = o.name;
  if (o.g > 0 && o.g < 1 && Math.floor(t * 12) % 3 === 0) name = 'K@#!R'; // name flickers while the fake breaks
  text(ctx, name, 0, -76, 56, '#FFFFFF');
  text(ctx, o.status, 0, -18, 30, '#B9C4D8', 'center', 600);
  if (o.wave) waveform(ctx, 0, 130, 360, 150, t, o.waveCol || '#7FC8FF', 26, 1.2);
  if (o.incoming) {
    shape(ctx, ell(-140, 400, 62, 62), { fill: C.red }); handset(ctx, -140, 400);
    const bob = -14 * Math.abs(Math.sin(t * 6)); ctx.save(); ctx.translate(140, 400 + bob); shape(ctx, ell(0, 0, 62, 62), { fill: C.green }); handset(ctx, 0, 0); ctx.restore();
    text(ctx, 'Decline', -140, 492, 26, '#B9C4D8', 'center', 600); text(ctx, 'Accept', 140, 492, 26, '#B9C4D8', 'center', 600);
  } else {
    for (const [x, lab] of [[-150, 'mute'], [150, 'speaker']]) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x, 330, 50, 0, 7); ctx.fill(); text(ctx, lab, x, 400, 22, '#B9C4D8', 'center', 600); }
    const p = 1 - 0.1 * (o.endK || 0); ctx.save(); ctx.translate(0, 440); ctx.scale(p, p); shape(ctx, ell(0, 0, 62, 62), { fill: C.red, stroke: false }); handset(ctx, 0, 0); ctx.restore();
  }
}
function transferScreen(ctx, t) { // 25.3-27.3
  ctx.fillStyle = '#F4F6FA'; ctx.fillRect(-260, -540, 520, 1080);
  if (t < 26.8) {
    ctx.fillStyle = C.bank; ctx.fillRect(-260, -540, 520, 170); statusBar(ctx, '10:04', '#FFFFFF');
    text(ctx, 'Send Money', -206, -440, 46, C.white, 'left');
    shape(ctx, rr(-215, -330, 430, 150, 24), { fill: C.white, col: '#D5DCE8', lwk: 0.7 });
    shape(ctx, ell(-146, -255, 44, 44), { fill: '#3A3F4A', lwk: 0.7 }); text(ctx, '?', -146, -250, 48, '#9AA3B4');
    text(ctx, 'Unknown UPI', -84, -280, 34, INK, 'left', 800); text(ctx, 'settle.case@upi', -84, -234, 24, C.ui, 'left', 600);
    text(ctx, 'Amount', -210, -120, 28, C.ui, 'left', 700);
    text(ctx, '\u20B9 50,000', 0, -30, 90, INK);
    const press = pulse(t, 26.1, 0.14), s = 1 - 0.08 * press;
    ctx.save(); ctx.translate(0, 330); ctx.scale(s, s); shape(ctx, rr(-205, -56, 410, 112, 56), { fill: C.green }); text(ctx, 'Send \u20B950,000', 0, 4, 40, C.white); ctx.restore();
    ripple(ctx, 0, 330, t, 26.14, 'rgba(63,163,91,0.7)');
    return;
  }
  const pk = E.back(clamp((t - 26.8) / 0.3));
  ctx.save(); ctx.translate(0, -160); ctx.scale(pk, pk); shape(ctx, ell(0, 0, 100, 100), { fill: C.green }); line(ctx, [[-44, 2], [-12, 34], [48, -30]], { col: C.white, lwk: 3 }); ctx.restore();
  text(ctx, 'Money sent', 0, 10, 50, INK); text(ctx, '\u20B9 50,000', 0, 90, 64, INK);
}
function reelsScreen(ctx, t, hi) { // Kabir's public profile: the source of the stolen voice
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-260, -540, 520, 1080); statusBar(ctx, '');
  ctx.save(); ctx.beginPath(); ctx.arc(-160, -400, 56, 0, 7); ctx.clip(); ctx.fillStyle = '#DCE9EF'; ctx.fillRect(-220, -460, 120, 120); ctx.translate(-160, -380); ctx.scale(0.24, 0.24); kbBody(ctx, mkKB({ mouth: 'grin' })); ctx.restore();
  shape(ctx, ell(-160, -400, 56, 56), { col: '#E1306C', lwk: 1.2 });
  text(ctx, 'kabir.vibes', -84, -424, 34, INK, 'left', 800); text(ctx, '48 reels \u00B7 Public', -84, -384, 24, C.ui, 'left', 600);
  for (let i = 0; i < 9; i++) {
    const cx = -168 + (i % 3) * 168, cy = -200 + Math.floor(i / 3) * 236, R = rr(cx - 80, cy - 112, 160, 224, 10);
    ctx.save(); ctx.beginPath(); trace(ctx, R, true); ctx.clip();
    ctx.fillStyle = ['#F3C9B8', '#BFD8E6', '#F5E1A6', '#C9E0C3', '#D7C6E8', '#F3C9B8', '#BFD8E6', '#F5E1A6', '#C9E0C3'][i]; ctx.fillRect(cx - 80, cy - 112, 160, 224);
    ctx.translate(cx, cy + 60); ctx.scale(0.3, 0.3); kbBody(ctx, mkKB({ mouth: i % 2 ? 'grin' : 'smile', phones: i % 3 ? 'neck' : 'head' })); ctx.restore();
    shape(ctx, R, { col: i === hi ? C.red : '#FFFFFF', lwk: i === hi ? 1.6 : 0.6 });
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(cx - 60, cy + 84); ctx.lineTo(cx - 60, cy + 104); ctx.lineTo(cx - 44, cy + 94); ctx.fill();
  }
}
function kabirVideo(ctx, t) { // Kabir picks up, sleepy
  const g = ctx.createLinearGradient(0, -532, 0, 532); g.addColorStop(0, '#2B3150'); g.addColorStop(1, '#1B2038'); ctx.fillStyle = g; ctx.fillRect(-260, -540, 520, 1080);
  const lg = ctx.createRadialGradient(0, 40, 40, 0, 40, 380); lg.addColorStop(0, 'rgba(160,200,255,0.35)'); lg.addColorStop(1, 'rgba(160,200,255,0)'); ctx.fillStyle = lg; ctx.fillRect(-260, -540, 520, 1080);
  const s = mkKB({ eyes: t > 46.9 ? 'drowsy' : 'sleep', mouth: t > 46.6 && t < 46.95 ? 'yawn' : 'smile', messy: 1, phones: 'neck', nod: 4 * Math.sin(t * 2), tilt: 0.05 });
  ctx.save(); ctx.translate(0, 190); ctx.scale(1.12, 1.12); kbBody(ctx, s); ctx.restore();
  shape(ctx, rr(-120, -470, 240, 46, 23), { fill: 'rgba(0,0,0,0.35)', stroke: false }); text(ctx, 'Kabir (Beta)', 0, -446, 28, '#FFFFFF');
  statusBar(ctx, '10:06', '#FFFFFF');
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, 452, 46, 0, 7); ctx.fill(); handset(ctx, 0, 452);
}
function dialer(ctx, t) { // 54.2-58.9: 1930
  ctx.fillStyle = '#F7F7F9'; ctx.fillRect(-260, -540, 520, 1080); statusBar(ctx, '10:09');
  const times = [56.56, 56.72, 56.88, 57.04], n = times.filter(x => t >= x).length, digits = '1930';
  text(ctx, digits.slice(0, n), 0, -380, 116, INK);
  const lk = popIn(t, 57.2, 0.3); if (lk > 0.01) { ctx.save(); ctx.translate(0, -290); ctx.scale(lk, lk); text(ctx, 'Cyber Crime Helpline', 0, 0, 32, C.green); ctx.restore(); }
  const keys = '123456789*0#';
  for (let i = 0; i < 12; i++) {
    const x = [-150, 0, 150][i % 3], y = -170 + 140 * Math.floor(i / 3), d = digits.indexOf(keys[i]);
    const hot = d >= 0 && t >= times[d] && t < times[d] + 0.15;
    ctx.fillStyle = hot ? '#CFE3F5' : '#E9E9EE'; ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.fill();
    text(ctx, keys[i], x, y + 3, 54, INK, 'center', 700);
  }
  const pk = 1 + 0.12 * pulse(t, 57.8, 0.3);
  ctx.save(); ctx.translate(0, 420); ctx.scale(pk, pk); ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(0, 0, 64, 0, 7); ctx.fill(); handset(ctx, 0, -4); ctx.restore();
  if (t > 57.8) { const k = ((t - 57.8) * 1.5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(0, 420, 64 + k * 90, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = C.green; ctx.stroke(); ctx.restore(); }
}

// ================= SCENES =================
function roomScene(ctx, cam, o, t) {
  view.z = cam.z;
  ctx.save(); ctx.translate(W / 2 + (cam.jx || 0), H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  livingRoom(ctx, o); sofa(ctx);
  if (o.dim > 0) { ctx.fillStyle = `rgba(28,24,48,${0.32 * o.dim})`; ctx.fillRect(-400, -400, 1880, 2800); }
  ctx.save(); ctx.translate(AU.x, AU.y); mjBody(ctx, o.mj); mjArms(ctx, o.mj, t); ctx.restore();
  table(ctx, o, t);
  if (o.extra) o.extra(ctx);
  ctx.restore(); view.z = 1;
}
const mjCall = (t, o = {}) => { const s = mkMJ({ hold: 'phone', glow: 1, look: [0, 0.8], worry: 1, mouth: 'worried', brow: 5, ...o }); s.nod = 2 * Math.sin(t * 2) + (o.nod || 0); if ((t % 3.3) > 3.2 && s.eyes === 'open') s.eyes = 'blink'; return s; };
function thought(ctx, x, y, k, t, siren) { // worry cloud: the accident he imagines
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  for (const [dx, dy, r] of [[-150, 190, 16], [-120, 150, 24]]) shape(ctx, ell(dx, dy, r, r), { fill: '#FFFFFF' });
  const cl = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; cl.push([Math.cos(a) * (190 + 18 * Math.sin(i * 2.3)), Math.sin(a) * (120 + 12 * Math.cos(i * 1.7))]); }
  shape(ctx, spl(cl), { fill: '#FFFFFF' });
  ctx.save(); ctx.rotate(0.35); // tipped-over scooter
  shape(ctx, ell(-60, 40, 26, 26), { fill: INK }); shape(ctx, ell(60, 40, 26, 26), { fill: INK });
  shape(ctx, spl([[-80, 20], [-40, -30], [30, -34], [80, 0], [80, 30], [-40, 30]]), { fill: '#4FA3A0' });
  line(ctx, [[-40, -30], [-56, -70], [-80, -74]], { lwk: 1.1 });
  ctx.restore();
  for (const [dx, dy] of [[-120, -40], [110, -60], [120, 50]]) line(ctx, [[dx - 12, dy - 12], [dx + 12, dy + 12]], { lwk: 1 }), line(ctx, [[dx + 12, dy - 12], [dx - 12, dy + 12]], { lwk: 1 });
  if (siren > 0) { // police light, flashing red / blue
    ctx.save(); ctx.globalAlpha = siren; const on = Math.floor(t * 6) % 2;
    shape(ctx, rr(96, -110, 70, 40, 12), { fill: on ? C.red : '#3E7FD0' });
    const gl = ctx.createRadialGradient(131, -90, 5, 131, -90, 90); gl.addColorStop(0, on ? 'rgba(213,75,64,0.6)' : 'rgba(62,127,208,0.6)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(40, -180, 180, 180);
    ctx.restore();
  }
  ctx.restore();
}
function coinFly(ctx, t, t0) {
  for (let i = 0; i < 10; i++) {
    const r = rng(i * 13 + 5), d = i * 0.06, u = clamp((t - t0 - d) / 0.7); if (u <= 0 || u >= 1) continue;
    const dx = (r() - 0.5) * 700, x = 540 + dx * E.o(u), y = lerp(760, -140, E.i(u)) - 120 * Math.sin(Math.PI * u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * (r() - 0.5) * 6);
    shape(ctx, ell(0, 0, 36, 36), { fill: C.gold, hatch: dk(C.gold), ha: 0.35 }); text(ctx, '\u20B9', 0, 3, 40, dk(C.gold, 0.5));
    ctx.restore();
  }
}
function floatPhone(ctx, x, y, s, rot, screen) { // phone on its own (no hands) for explainer shots
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  shape(ctx, rr(-266, -546, 560, 1120, 64), { fill: 'rgba(60,40,30,0.18)', stroke: false });
  shape(ctx, rr(-280, -560, 560, 1120, 64), { fill: C.phone });
  ctx.save(); ctx.beginPath(); trace(ctx, rr(-252, -532, 504, 1064, 42), true); ctx.clip(); screen(ctx); ctx.restore();
  shape(ctx, rr(-252, -532, 504, 1064, 42), { lwk: 0.6 });
  ctx.fillStyle = '#55555C'; ctx.fillRect(-60, -548, 120, 12);
  ctx.restore();
}

// ================= SHOTS =================
function shotHook(ctx, t) { // 0-2.7: "Papa, mujhe bachao!"
  const sh = 5 * Math.sin(t * 70) * level(t);
  phoneRig(ctx, t, { z: 1.2 + 0.05 * t, target: 800, dark: 0.35, shake: sh, vig: 0.9,
    screen: c => callScreen(c, t, { who: 'kabir', name: 'Kabir', status: fmt(t + 3), wave: true, waveCol: '#FF8A7A', red: true }) });
}
function shotFace(ctx, t) { // 2.7-6.0: Mehta ji hears his son crying
  const mj = mjCall(t, { eyes: 'wide', mouth: 'o', brow: 12, sweat: seg(t, 3.0, 4.2, x => x), look: [0, 0.2] });
  mj.nod = 3 * Math.sin(t * 30) * (1 - seg(t, 2.7, 3.3));
  roomScene(ctx, { z: 2.1 + 0.12 * seg(t, 2.7, 6.0, x => x), cx: 540, cy: 760 }, { mj, clockMin: 601, dim: 0.35 }, t);
  vignette(ctx, 0.5);
}
function shotGlitch(ctx, t) { // 6.0-8.9: "Par phone pe Kabir tha hi nahi."
  const g = seg(t, 6.6, 7.9, x => x);
  phoneRig(ctx, t, { z: 1.25 + 0.06 * seg(t, 6.0, 8.9, x => x), target: 790, dark: 0.35, vig: 0.9, shake: g > 0 && g < 1 ? 6 * Math.sin(t * 90) : 0,
    screen: c => callScreen(c, t, { who: 'robot', g, name: g >= 1 ? 'UNKNOWN' : 'Kabir', status: g >= 1 ? 'AI voice' : fmt(t + 3), wave: true, waveCol: g > 0.5 ? '#FF5A4A' : '#FF8A7A', red: true }),
    after: c => { const k = clamp((t - 7.95) / 0.14); if (k > 0) stamp(c, 540, 1380, 'KABIR NAHI THA', k, C.red, -0.1); } });
}
function shotBefore(ctx, t, wt) { // 8.9-11.0: recreation, 9:58 pm, chai
  const mj = mkMJ({ hold: 'cup', eyes: 'happy', mouth: 'smile' }); mj.nod = 3 * Math.sin(t * 2.2); mj.tilt = 0.03 * Math.sin(t * 1.5);
  roomScene(ctx, { z: 1.06, cx: 540, cy: 930 }, { mj, clockMin: 598, phoneBuzz: 0, dim: 0.15 }, wt ?? t);
  recTag(ctx, t, 9.0);
}
function shotRing(ctx, t) { // 11.0-13.95: "Raat ke 10 baje Mehta ji ka phone bajta hai"
  const buzz = t > 12.8 ? (((t - 12.8) % 0.5) < 0.34 ? 1 : 0) : 0;
  const mj = mkMJ({ hold: 'cup', eyes: 'open', mouth: 'smile', look: [0, 0.3] });
  mj.nod = 3 * Math.sin(t * 2.2);
  if (t > 12.9) { mj.look = [-0.5, 1]; mj.fx = -0.2; mj.mouth = 'flat'; mj.brow = 4; }
  roomScene(ctx, { z: 1.06 + 0.04 * seg(t, 11.0, 13.95, x => x), cx: 540, cy: 930 }, { mj, clockMin: lerp(598, 600, seg(t, 11.4, 11.9, E.io)), phoneBuzz: buzz, dim: 0.15 }, t);
  const tk = popIn(t, 11.3, 0.3); if (tk > 0.01) chip(ctx, 540, 250, 'RAAT 10 BAJE', tk, C.navy, 54);
  const nk = popIn(t, 12.18, 0.3); if (nk > 0.01) chip(ctx, 540, 1180, 'MEHTA JI', nk, C.cardiDk, 50);
}
function shotListen(ctx, t) { // 13.95-19.15: "Papa, accident ho gaya... police le gayi."
  const mj = mjCall(t, { eyes: t > 16.3 ? 'wide' : 'open', mouth: t > 16.3 ? 'o' : 'worried', brow: t > 16.3 ? 12 : 6, sweat: seg(t, 16.5, 17.8, x => x) });
  roomScene(ctx, { z: 1.45, cx: 470, cy: 880 }, { mj, clockMin: 601, dim: 0.3 }, t);
  thought(ctx, 800, 460, popIn(t, 15.34, 0.35), t, seg(t, 17.6, 17.8));
}
function shotDemand(ctx, t) { // 19.15-25.3: the "officer" takes over: 50,000, tell no one
  phoneRig(ctx, t, { z: 1.25, target: 790, dark: 0.3, vig: 0.6,
    screen: c => callScreen(c, t, { who: 'unknown', name: 'Unknown', status: 'Police?', wave: true, waveCol: '#FF5A4A', red: true }),
    after: c => {
      const ak = popIn(t, 21.88, 0.3); if (ak > 0.01) { c.save(); c.translate(540, 520); c.scale(ak, ak); shape(c, rr(-230, -70, 460, 140, 36), { fill: '#FDECEA', col: C.red, lwk: 1.5 }); text(c, '\u20B950,000', 0, 6, 86, C.red); c.restore(); }
      const k = clamp((t - 23.14) / 0.14); if (k > 0) stamp(c, 540, 1330, 'KISI KO MAT BATAO', k, C.red, -0.08);
    } });
}
function shotPay(ctx, t) { // 25.3-27.3: he sends it without thinking
  phoneRig(ctx, t, { z: 1.25, target: 790, screen: c => transferScreen(c, t), point: { tgt: [0, 330], k: tapK(t, 26.14) }, after: c => coinFly(c, t, 26.8) });
}
function shotHostel(ctx, t) { // 27.3-31.2: "Aur Kabir? Woh hostel mein chain se so raha tha."
  const kb = mkKB({ eyes: 'sleep', mouth: 'sleep', phones: 'head' });
  view.z = 1.0 + 0.05 * seg(t, 27.3, 31.2, x => x);
  ctx.save(); ctx.translate(540, 960); ctx.scale(view.z, view.z); ctx.translate(-560, -980);
  hostelRoom(ctx); hostelBed(ctx, { kb, t });
  ctx.fillStyle = 'rgba(14,16,38,0.35)'; ctx.fillRect(-400, -400, 1880, 2800);
  const g = ctx.createRadialGradient(560, 990, 60, 560, 990, 520); g.addColorStop(0, 'rgba(255,236,190,0.22)'); g.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, 400, 1100, 1200);
  ctx.restore(); view.z = 1;
  const qk = popIn(t, 27.4, 0.3) * (1 - seg(t, 28.6, 28.8)); if (qk > 0.01) { ctx.save(); ctx.translate(540, 520); ctx.scale(qk, qk); text(ctx, '?!', 0, 0, 200, '#FFD24A'); ctx.restore(); }
  const nk = popIn(t, 28.66, 0.3); if (nk > 0.01) chip(ctx, 540, 330, 'KABIR: HOSTEL MEIN, SO RAHA', nk, C.hood, 44);
}
function shotAI(ctx, t) { // 31.2-36.35: the voice was AI, copied from his reels
  paperBG(ctx);
  floatPhone(ctx, 320, 1000, 0.84, -0.05, c => reelsScreen(c, t, 4));
  const rk = popIn(t, 31.9, 0.35); if (rk > 0.01) robot(ctx, 790, 760, 1.2 * rk, t, 'grin');
  if (t > 34.1) { // the voice travels from the highlighted reel into the robot
    const P0 = [330, 990], P1 = [580, 660], P2 = [700, 760];
    for (let i = 0; i < 9; i++) {
      const u = ((t - 34.1) * 0.9 + i / 9) % 1, x = (1 - u) ** 2 * P0[0] + 2 * u * (1 - u) * P1[0] + u * u * P2[0], y = (1 - u) ** 2 * P0[1] + 2 * u * (1 - u) * P1[1] + u * u * P2[1];
      ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * u); ctx.fillStyle = C.red; const h2 = 14 + 26 * Math.abs(Math.sin(i * 1.7 + t * 8)); ctx.beginPath(); trace(ctx, rr(x - 6, y - h2 / 2, 12, h2, 6), true); ctx.fill(); ctx.restore();
    }
  }
  if (t > 34.6) { const k = popIn(t, 34.6, 0.3); ctx.save(); ctx.translate(790, 1060); ctx.scale(k, k); shape(ctx, rr(-170, -50, 340, 100, 50), { fill: '#FFFFFF', col: C.red, lwk: 1.2 }); waveform(ctx, 0, 0, 260, 70, t, C.red, 16, 1.4); ctx.restore(); }
  chip(ctx, 540, 300, 'AI AWAAZ', popIn(t, 31.92, 0.3), C.red, 64);
  const sk = clamp((t - 35.3) / 0.14); if (sk > 0) stamp(ctx, 560, 1400, 'CHURAAYI HUI', sk, C.red, -0.1);
}
function shotChaal(ctx, t) { // 36.35-40.75
  paperBG(ctx);
  const mv = seg(t, 37.6, 37.9, E.io);
  card(ctx, 290, 1010, 400, 560, -0.06, popIn(t, 38.12, 0.32), 'APNO KI AWAAZ', C.hood, c => {
    c.save(); c.scale(0.85, 0.85); kbHead(c, mkKB({ mouth: 'grin' })); c.restore();
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { c.save(); c.globalAlpha = 0.8; line(c, arcP(sx * 60, 0, 120 + i * 24, sx > 0 ? -0.5 : Math.PI - 0.5, sx > 0 ? 0.5 : Math.PI + 0.5, 10), { col: C.hood, lwk: 1.1 }); c.restore(); }
  });
  const pk = popIn(t, 39.24, 0.25); if (pk > 0.01) { ctx.save(); ctx.translate(540, 1010); ctx.scale(pk, pk); text(ctx, '+', 0, 0, 120, INK); ctx.restore(); }
  card(ctx, 790, 1010, 400, 560, 0.05, popIn(t, 39.82, 0.32), 'DARR', C.red, c => {
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = (sx > 0 ? -0.4 : Math.PI + 0.4) + sx * (i - 1) * 0.4; line(c, [[Math.cos(a) * 140, -10 + Math.sin(a) * 140], [Math.cos(a) * 172, -10 + Math.sin(a) * 172]], { lwk: 1.2 }); }
    c.save(); c.scale(0.85, 0.85); mjHead(c, mkMJ({ eyes: 'wide', mouth: 'o', worry: 1, brow: 10, sweat: 0.5 })); c.restore();
  });
  chip(ctx, 540, lerp(1000, 420, mv), 'CHAAL', popIn(t, 36.4) * lerp(1.6, 1, mv), C.red, 70);
}
function shotRuleCut(ctx, t) { // 40.75-44.85: "Rule yaad rakhiye. Aisa call aaye, toh phone kaato."
  const ended = t > 43.62;
  phoneRig(ctx, t, { z: 1.2, target: 800, point: { tgt: [0, 440], k: tapK(t, 43.5) },
    screen: c => {
      if (!ended) callScreen(c, t, { who: 'unknown', name: 'Unknown', status: 'Papa\u2026 bachao\u2026', wave: true, waveCol: '#FF5A4A', red: true, endK: pulse(t, 43.45, 0.16) });
      else { c.fillStyle = '#141C2B'; c.fillRect(-260, -540, 520, 1080); shape(c, ell(0, -80, 80, 80), { fill: C.red }); handset(c, 0, -80); text(c, 'Call ended', 0, 60, 48, '#FFFFFF'); }
      ripple(c, 0, 440, t, 43.5);
    },
    after: c => chip(c, 540, 250, 'RULE', popIn(t, 40.8), C.green, 70) });
}
function shotRuleCall(ctx, t) { // 44.85-47.4: "...khud bachche ke saved number pe call karo."
  const pick = t > 46.3;
  phoneRig(ctx, t, { z: 1.2, target: 800,
    screen: c => pick ? kabirVideo(c, t) : callScreen(c, t, { who: 'kabir', name: 'Kabir (Beta)', status: 'Calling saved contact\u2026', wave: false }),
    after: c => {
      const tk = popIn(t, 45.36, 0.3) * (1 - seg(t, 46.2, 46.35)); if (tk > 0.01) chip(c, 540, 250, 'SAVED NUMBER', tk, C.green, 56);
      bubble(c, 540, 330, 'Papa? Main theek hoon.', popIn(t, 46.5, 0.25), [-40, 90], 46);
    } });
}
function codeCard(ctx, x, y, s, t, k) { // family code word, kept secret
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  shape(ctx, rr(-300, -230, 600, 460, 30), { fill: 'rgba(60,40,30,0.18)', stroke: false });
  const R = rr(-310, -240, 600, 460, 30);
  shape(ctx, R, { fill: '#FFFDF7', hatch: '#E4DCCC', ha: 0.2, stroke: false });
  ctx.save(); ctx.beginPath(); trace(ctx, R, true); ctx.clip(); ctx.fillStyle = C.green; ctx.fillRect(-310, -240, 600, 110); ctx.restore(); shape(ctx, R);
  text(ctx, 'FAMILY CODE WORD', -10, -184, 50, '#FFFFFF');
  shape(ctx, rr(-60, -90, 100, 80, 14), { fill: C.gold, lwk: 1 }); ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-10, -90, 30, Math.PI, 0); ctx.stroke(); ctx.restore(); blob(ctx, -10, -52, 9, 9, INK);
  const n = Math.floor(clamp((t - 48.3) / 0.8) * 5);
  for (let i = 0; i < 5; i++) { shape(ctx, rr(-230 + i * 88, 20, 70, 84, 12), { fill: '#EEF1F4', lwk: 0.8 }); if (i < n) text(ctx, '*', -195 + i * 88, 70, 70, INK); }
  const fk = popIn(t, 50.4, 0.3); if (fk > 0.01) { ctx.save(); ctx.globalAlpha = clamp(fk); text(ctx, 'Sirf family ko pata', -10, 170, 40, C.green); ctx.restore(); }
  ctx.restore();
}
function shotCode(ctx, t) { // 47.4-54.15: code word; the fake can't answer
  paperBG(ctx);
  const up = seg(t, 51.4, 51.8, E.io);
  codeCard(ctx, 540, lerp(960, 470, up), lerp(1.2, 0.8, up), t, popIn(t, 47.66, 0.35));
  if (t > 51.4) {
    const pk = E.o(clamp((t - 51.4) / 0.4)), g = seg(t, 52.4, 53.2, x => x);
    floatPhone(ctx, 540, lerp(2400, 1260, pk), 0.56, 0.03, c => callScreen(c, t, { who: 'robot', g, name: g >= 1 ? 'UNKNOWN' : 'Kabir', status: 'Code word?', wave: true, waveCol: '#FF5A4A', red: true }));
    bubble(ctx, 780, 900, 'Code?', popIn(t, 51.62, 0.25) * (1 - seg(t, 53.2, 53.4)), [-60, 80], 50);
    const sk = clamp((t - 53.32) / 0.14); if (sk > 0) stamp(ctx, 540, 1300, 'APNA NAHI HAI', sk, C.red, -0.1);
  }
}
function dialTarget(t) { // fingertip visits 1, 9, 3, 0 then the call button, in time with the tones
  const keys = [[56.56, [-150, -170]], [56.72, [150, 110]], [56.88, [150, -170]], [57.04, [0, 250]], [57.8, [0, 420]]];
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, p] = keys[i - 1], [b, q] = keys[i], k = E.io(clamp((t - a) / Math.min(0.12, b - a))); return lerp2(p, q, k); }
  return keys[keys.length - 1][1];
}
function shotHelp(ctx, t) { // 54.15-58.9
  const k = seg(t, 56.1, 56.45, E.o) * (1 - seg(t, 58.1, 58.5, E.io));
  phoneRig(ctx, t, { z: 1.15, target: 810, screen: c => dialer(c, t), point: k > 0 ? { tgt: dialTarget(t), k } : null,
    after: c => { const kk = popIn(t, 54.3, 0.3) * (1 - seg(t, 56.1, 56.3)); if (kk > 0.01) chip(c, 540, 300, 'PAISE BHEJ DIYE?', kk, C.red, 56); } });
}
function shotNextTime(ctx, t) { // 58.9-65.9: the call comes again; this time he asks for the code word
  const buzz = t > 58.9 && t < 59.9 ? (((t - 58.9) % 0.5) < 0.34 ? 1 : 0) : 0;
  const mj = mkMJ({ hold: 'phone', glow: 0.8, buzz, eyes: 'open', mouth: 'flat', look: [0, 0.8], brow: 6 });
  mj.nod = 2 * Math.sin(t * 2);
  if (t > 60.3) { mj.look = [0, 0]; mj.brow = 2; mj.mouth = 'smile'; mj.glint = pulse(t, 60.4, 0.5); }
  if (t > 63.0) { mj.eyes = 'happy'; mj.mouth = 'grin'; mj.nod = 7 * pulse(t, 64.94, 0.5) + 2 * Math.sin(t * 2); }
  const push = seg(t, 63.2, 63.8, E.io);
  roomScene(ctx, { z: lerp(1.1, 1.25, push), cx: 540, cy: lerp(930, 900, push) }, { mj, clockMin: 780, dim: 0.15,
    extra: c => { const k = popIn(t, 62.8, 0.25) * (1 - seg(t, 63.4, 63.6)); if (k > 0.01) { c.save(); c.translate(700, 1030); c.scale(k, k); shape(c, ell(0, 0, 52, 52), { fill: C.red }); handset(c, 0, 0); c.restore(); } } }, t);
  const ak = popIn(t, 59.1, 0.3) * (1 - seg(t, 62.9, 63.1)); if (ak > 0.01) chip(ctx, 540, 230, 'AGLI BAAR', ak, C.navy, 56);
  bubble(ctx, 690, 520, 'Code word batao?', popIn(t, 61.46, 0.25) * (1 - seg(t, 62.8, 63.0)), [-110, 90], 48);
  shield(ctx, 540, 420, popIn(t, 63.5, 0.35) * 0.78);
  if (t > 64.94) starsAround(ctx, [[210, 300, 1.2], [870, 280, 1.0], [890, 640, 1.3], [190, 620, 0.9]], popIn(t, 64.94, 0.3));
}

// ================= EDIT =================
const SHOTS = [[0, shotHook], [2.7, shotFace], [6.0, shotGlitch], [8.9, shotBefore], [11.0, shotRing], [13.95, shotListen], [19.15, shotDemand], [25.3, shotPay],
  [27.3, shotHostel], [31.2, shotAI], [36.35, shotChaal], [40.75, shotRuleCut], [44.85, shotRuleCall], [47.4, shotCode], [54.15, shotHelp], [58.9, shotNextTime]];
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); view.z = 1;
  ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H); // never let a previous frame show through
  if (t >= CTA_AT) { drawCTA(ctx, t - CTA_AT); return; }
  let i = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= SHOTS[j][0]) i = j;
  const c0 = SHOTS[i][0], p = i ? 1 + 0.035 * (1 - E.o(clamp((t - c0) / 0.45))) : 1; // each cut lands with a small settling push
  ctx.translate(540, 960); ctx.scale(p, p); ctx.translate(-540, -960);
  if (t >= 8.9 && t < 9.3) { shotFace(ctx, lerp(5.9, 3.0, seg(t, 8.9, 9.3, E.io))); ctx.setTransform(1, 0, 0, 1, 0, 0); rewindFX(ctx, t); return; }
  SHOTS[i][1](ctx, t);
}

// ================= CAPTIONS =================
// {word} = yellow keyword, <word> = red danger word
const CAPS = [
  [0.0, 2.6, '"<Papa, mujhe bachao!>"'], [2.7, 4.2, 'Awaaz {Kabir} ki thi.'], [4.32, 5.95, 'Rona bhi Kabir ka tha.'],
  [6.02, 7.6, 'Par phone pe Kabir\u2026'], [7.7, 8.85, '<tha hi nahi.>'], [8.92, 10.9, 'Ek recreation dekhiye.'],
  [11.02, 12.1, 'Raat ke 10 baje'], [12.18, 13.9, 'Mehta ji ka phone bajta hai.'], [13.96, 15.3, 'Beta rote hue:'],
  [15.34, 17.6, '"Papa, <accident> ho gaya\u2026'], [17.68, 19.1, 'police le gayi."'],
  [19.16, 20.75, 'Phir ek aadmi line pe aata hai:'], [20.82, 21.8, '"Case band karna hai'], [21.88, 23.05, 'toh abhi <\u20B950,000> bhejo.'],
  [23.14, 25.3, 'Kisi ko bataya\u2026 toh beta andar."'], [25.36, 27.3, 'Mehta ji ne bina soche paise bhej diye.'],
  [27.32, 28.6, 'Aur Kabir?'], [28.66, 31.2, 'Woh hostel mein chain se so raha tha.'],
  [31.24, 33.6, 'Woh awaaz <AI> ki thi \u2014'], [33.64, 36.3, 'Kabir ki {Instagram reels} se churaayi hui.'],
  [36.38, 38.05, 'Chaal simple hai:'], [38.12, 40.7, '{apno ki awaaz}, aur {darr}.'],
  [40.8, 42.2, '{Rule} yaad rakhiye:'], [42.26, 44.8, 'aisa call aaye, toh {phone kaato}.'], [44.88, 47.35, 'Aur khud bachche ke {saved number} pe call karo.'],
  [47.42, 49.8, 'Aur ghar mein ek secret {code word} rakho,'], [49.88, 51.55, 'jo sirf family ko pata ho.'], [51.62, 53.2, 'Code nahi bata paaya?'], [53.32, 54.1, '<Toh woh apna nahi hai.>'],
  [54.16, 56.1, 'Paise bhej diye?'], [56.16, 58.85, 'Turant {1930} pe call karo.'],
  [58.92, 61.4, 'Toh agli baar apno ki awaaz paise maange\u2026'], [61.46, 63.4, 'pehle {code word} poocho.'], [63.5, 64.9, 'Scam se bacho.'], [64.94, 65.9, '{Simple.}'],
  [66.02, 68.1, 'Aise aur scams ki files kholne ke liye'], [68.14, 70.6, '{FishyFiles} ko follow karein.'],
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
    await ctaReady;
    for (let f = 0; f < NF; f++) {
      renderFrame(f);
      const buf = Buffer.from(octx.getImageData(0, 0, W, H).data.buffer);
      if (!process.stdout.write(buf)) await new Promise(r => process.stdout.once('drain', r));
    }
  })();
} else {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  ctaReady.then(() => { for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(path.join(__dirname, 'out', `f${String(f).padStart(4, '0')}.png`), out.toBuffer('image/png')); } });
}
