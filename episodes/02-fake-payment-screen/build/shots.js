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
