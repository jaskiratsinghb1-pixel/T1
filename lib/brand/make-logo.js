// Cut the FishyFiles mark (folder + red hook) out of its flat teal background -> lib/brand/logo.png (transparent, trimmed).
// Usage: node lib/brand/make-logo.js
const fs = require('fs'), path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
(async () => {
const img = await loadImage(path.join(__dirname, 'source/fishyfiles-logo-teal.png')); // decoding is async in @napi-rs/canvas
const w = img.width, h = img.height, c = createCanvas(w, h), x = c.getContext('2d');
x.drawImage(img, 0, 0);
const d = x.getImageData(0, 0, w, h), p = d.data;
const bg = [p[0], p[1], p[2]]; // top-left pixel is pure background
let x0 = w, y0 = h, x1 = 0, y1 = 0;
for (let i = 0; i < w * h; i++) {
  const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
  const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
  const a = Math.max(0, Math.min(1, (dist - 28) / 46)); // soft edge
  if (a > 0 && a < 1) { // un-mix the background from edge pixels so no teal fringe remains
    for (let k = 0; k < 3; k++) p[i * 4 + k] = Math.max(0, Math.min(255, (p[i * 4 + k] - bg[k] * (1 - a)) / a));
  }
  p[i * 4 + 3] = Math.round(255 * a);
  if (a > 0.5) { const px = i % w, py = (i / w) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
}
x.putImageData(d, 0, 0);
const pad = 24, tw = x1 - x0 + 2 * pad, th = y1 - y0 + 2 * pad, out = createCanvas(tw, th);
out.getContext('2d').drawImage(c, x0 - pad, y0 - pad, tw, th, 0, 0, tw, th);
fs.writeFileSync(path.join(__dirname, 'logo.png'), out.toBuffer('image/png'));
console.log('logo.png', tw, 'x', th);
})();
