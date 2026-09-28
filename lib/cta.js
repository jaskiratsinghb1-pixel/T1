// Channel end card (CTA): logo + wordmark + tagline + follow pill. Minimal, reused by every episode from 04 on.
// Uses lib/brand/logo.png (the channel's real logo, cut out by lib/brand/make-logo.js), otherwise a drawn placeholder mark.
// Episode use:  const { drawCTA, CTA_DUR } = require('../../../lib/cta.js');  drawCTA(ctx, t - ctaStart);
// CLI:  node lib/cta.js logo              -> lib/brand/logo-drawn.png (1024x1024, transparent)
//       node lib/cta.js all | ffmpeg ...   -> 1080x1920 30 fps preview of the card alone
const fs = require('fs'), path = require('path');
const { loadImage } = require('@napi-rs/canvas');
const { createCanvas, INK, view, shape, line, ell, rr, spl, arcP, blob, text, E, clamp, seg, star, dk } = require('./doll.js');

const BRAND = {
  name: ['Fishy', 'Files'],
  tagline: 'Har scam ki file, yahin khulti hai.',
  follow: 'Follow karein',
  teal: '#2F9189', coral: '#E8715A', folder: '#E9C57E', folderDk: '#D4A85C', paper: '#F1E4CD', paperH: '#D9C3A0',
};
const CTA_DUR = 3.6;
const W = 1080, H = 1920;

let LOGO = null;
const logoFile = path.join(__dirname, 'brand/logo.png');
// image decoding is async: renderers must `await ready` before drawing the card
const ready = fs.existsSync(logoFile) ? loadImage(logoFile).then(i => { LOGO = i; }) : Promise.resolve();

// drawn mark: a teal fish peeking out of a case file. Local box about 340 x 300, centred on 0,0.
function drawMark(ctx, t = 0) {
  shape(ctx, rr(-160, -118, 130, 56, 16), { fill: BRAND.folderDk, hatch: dk(BRAND.folderDk), ha: 0.35 });
  shape(ctx, rr(-160, -90, 320, 220, 24), { fill: BRAND.folderDk, hatch: dk(BRAND.folderDk), ha: 0.35 });
  ctx.save(); ctx.translate(14, -62); ctx.rotate(-0.32 + 0.05 * Math.sin(t * 5));
  const tailSwish = 0.18 * Math.sin(t * 9);
  ctx.save(); ctx.translate(96, 0); ctx.rotate(tailSwish);
  shape(ctx, spl([[-6, 0], [62, -52], [48, 0], [62, 52]]), { fill: BRAND.teal, hatch: dk(BRAND.teal), ha: 0.4 });
  ctx.restore();
  shape(ctx, spl([[-112, 4], [-70, -58], [10, -66], [96, -18], [100, 16], [20, 62], [-74, 52]]), { fill: BRAND.teal, hatch: dk(BRAND.teal), ha: 0.4 });
  shape(ctx, spl([[-10, -60], [30, -96], [52, -56]]), { fill: dk(BRAND.teal, 0.15) });
  shape(ctx, ell(-58, -12, 20, 20), { fill: '#FFFFFF' });
  blob(ctx, -54, -10, 10, 10, INK); blob(ctx, -50, -15, 3.4, 3.4, '#FFFFFF');
  line(ctx, arcP(-86, 18, 16, 0.2, 1.4, 8), { lwk: 0.9 });
  blob(ctx, -30, 18, 11, 7, 'rgba(238,150,135,0.6)');
  ctx.restore();
  for (const [x, y, r, d] of [[-120, -170, 10, 0], [-146, -214, 7, 0.4]]) { const b = (t * 0.6 + d) % 1; shape(ctx, ell(x, y - 30 * b, r, r), { col: BRAND.teal, lwk: 0.7 }); }
  shape(ctx, rr(-172, -26, 344, 170, 24), { fill: BRAND.folder, hatch: dk(BRAND.folder), ha: 0.35 });
  shape(ctx, rr(-60, 28, 120, 44, 8), { fill: '#FFFDF6', lwk: 0.7 });
  line(ctx, [[-40, 44], [40, 44]], { col: '#B7AC98', lwk: 0.5 }); line(ctx, [[-40, 58], [16, 58]], { col: '#B7AC98', lwk: 0.5 });
}
function drawLogo(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (LOGO) { // the real mark sits on a soft paper tile with a light shadow so it reads on any background
    const k = 300 / Math.max(LOGO.width, LOGO.height), w = LOGO.width * k, h = LOGO.height * k, t2 = 0.04 * Math.sin(t * 2.2);
    ctx.save(); ctx.rotate(t2);
    shape(ctx, ell(8, 150, 150, 18), { fill: 'rgba(60,40,30,0.16)', stroke: false });
    ctx.drawImage(LOGO, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  else drawMark(ctx, t);
  ctx.restore();
}
function wordmark(ctx, x, y, size) {
  ctx.font = `800 ${size}px Baloo`;
  const [a, b] = BRAND.name, wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x0 = x - (wa + wb) / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = INK; ctx.strokeText(a, x0, y); ctx.strokeText(b, x0 + wa, y);
  ctx.fillStyle = BRAND.teal; ctx.fillText(a, x0, y); ctx.fillStyle = '#FFFDF6'; ctx.fillText(b, x0 + wa, y);
}
function bell(ctx, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-16, 10); ctx.quadraticCurveTo(-16, -18, 0, -20); ctx.quadraticCurveTo(16, -18, 16, 10); ctx.lineTo(20, 14); ctx.lineTo(-20, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 18, 5, 0, 7); ctx.fill(); ctx.restore();
}
// t = seconds since the card started (0 .. CTA_DUR). Keeps clear of the caption band (y > 1520).
function drawCTA(ctx, t) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); view.z = 1;
  const fade = seg(t, 0, 0.25);
  ctx.globalAlpha = fade;
  shape(ctx, [[0, 0], [W, 0], [W, H], [0, H]], { fill: BRAND.paper, hatch: BRAND.paperH, ha: 0.35, stroke: false });
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.globalAlpha = 0.45 * fade; shape(ctx, ell(540, 760, 300 + i * 120, 300 + i * 120, 90), { col: '#DCCBAE', lwk: 0.5 }); ctx.restore(); }
  ctx.globalAlpha = 1;
  const lk = E.back(clamp((t - 0.12) / 0.4)), bob = 8 * Math.sin(t * 2.4);
  if (lk > 0.01) drawLogo(ctx, 540, 740 + bob, 1.35 * lk, t);
  if (lk > 0.01) for (const [x, y, s, d] of [[300, 560, 1.1, 0.35], [790, 520, 0.9, 0.42], [820, 900, 1.2, 0.5]]) star(ctx, x, y, s * E.back(clamp((t - d) / 0.3)));
  const wk = E.back(clamp((t - 0.45) / 0.3));
  if (wk > 0.01) { ctx.save(); ctx.translate(540, 1060); ctx.scale(wk, wk); wordmark(ctx, 0, 0, 124); ctx.restore(); }
  const tk = E.o(clamp((t - 0.8) / 0.35));
  if (tk > 0.01) { ctx.save(); ctx.globalAlpha = tk; text(ctx, BRAND.tagline, 540, 1188 + 24 * (1 - tk), 50, INK); ctx.restore(); }
  const fk = E.back(clamp((t - 1.2) / 0.3)), done = t > 2.2, press = 1 - 0.08 * Math.max(0, Math.sin(Math.PI * clamp((t - 2.05) / 0.2)));
  if (fk > 0.01) {
    ctx.save(); ctx.translate(540, 1352); ctx.scale(fk * press, fk * press);
    const col = done ? '#3FA35B' : BRAND.coral, label = done ? 'Following' : BRAND.follow;
    ctx.font = '800 48px Baloo'; const w = ctx.measureText(label).width + 150;
    shape(ctx, rr(-w / 2, -46, w, 92, 46), { fill: col });
    if (done) line(ctx, [[-w / 2 + 46, 0], [-w / 2 + 60, 14], [-w / 2 + 84, -14]], { col: '#FFFFFF', lwk: 1.6 });
    else bell(ctx, -w / 2 + 64, -2, 1.2, '#FFFFFF');
    text(ctx, label, 30, 4, 48, '#FFFFFF');
    ctx.restore();
  }
  ctx.restore();
}
module.exports = { BRAND, CTA_DUR, ready, drawCTA, drawLogo, drawMark, wordmark };

if (require.main === module) {
  const arg = process.argv[2] || 'all';
  if (arg === 'logo') {
    const c = createCanvas(1024, 1024), x = c.getContext('2d');
    x.translate(512, 600); x.scale(2.3, 2.3); drawMark(x, 0); // mark spans y -230..144
    fs.mkdirSync(path.join(__dirname, 'brand'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'brand/logo-drawn.png'), c.toBuffer('image/png'));
  } else {
    const c = createCanvas(W, H), x = c.getContext('2d');
    (async () => {
      await ready;
      for (let f = 0; f < Math.round(CTA_DUR * 30); f++) {
        drawCTA(x, f / 30);
        const buf = Buffer.from(x.getImageData(0, 0, W, H).data.buffer);
        if (!process.stdout.write(buf)) await new Promise(r => process.stdout.once('drain', r));
      }
    })();
  }
}
