# Generates da1/work/anim/v2full_doll.js from the approved opening (v2open_doll.js) + shots.js
import re, os
ANIM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'anim') + '/'
s = open(ANIM + 'v2open_doll.js').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:80], s.count(a)); s = s.replace(a, b)

rep("// Video 2 opening (first 10 s) — \"paper doll\" storybook characters.", "// Video 2 full episode (54 s) — \"paper doll\" storybook characters. Opening (0-10.2 s) = approved v2open_doll.js.")
rep("node v2open_doll.js all", "node v2full_doll.js all")
rep("node v2open_doll.js 12,40,90 -> PNG stills in out_doll/ ;  node v2open_doll.js sheet -> model sheet", "node v2full_doll.js 12,40,90 -> PNG stills in out_full/")
rep("const W = 1080, H = 1920, FPS = 30, DUR = 10,", "const W = 1080, H = 1920, FPS = 30, DUR = 54,")
rep("seg(t, CUTS.LAND, DUR, x => x)", "seg(t, CUTS.LAND, 10.2, x => x)")
rep("function renderScene(ctx, t) {", "function renderOpen(ctx, t) {")
rep("  for (const x of [330, 750]) line(ctx, [[x, 40], [x, 110]], WL);", "  let HS = HIDE_SIGN;\n  if (!HS) for (const x of [330, 750]) line(ctx, [[x, 40], [x, 110]], WL);")
rep("  HX(ctx, rr(240, 110, 600, 160, 24), { fill: C.sign });\n  text(ctx, 'SHARMA', 540, 174, 78, C.signTx); text(ctx, 'ELECTRONICS', 540, 232, 38, C.signTx);", "  if (!HS) { HX(ctx, rr(240, 110, 600, 160, 24), { fill: C.sign });\n  text(ctx, 'SHARMA', 540, 174, 78, C.signTx); text(ctx, 'ELECTRONICS', 540, 232, 38, C.signTx); }")
rep("let CAMZ = 1;", "let CAMZ = 1, HIDE_SIGN = false;")
rep("  else if (m === 'o') shape(ctx, ell(fx, 92, 11, 13), { fill: C.mouth });", "  else if (m === 'flat') line(ctx, [[-22 + fx, 90], [22 + fx, 90]], { lwk: 1 });\n  else if (m === 'o') shape(ctx, ell(fx, 92, 11, 13), { fill: C.mouth });")

# ---- customer head: palette, cap/hair, eye modes, mouths, sweat ----
a = s.index("function cuHead(ctx, c) {"); b = s.index("function cuBody(ctx, c) {"); e = s.index("// ================= PROPS + SET")
H, B = s[a:b], s[b:e]
def hrep(x, y):
    global H
    assert H.count(x) == 1, x[:60]; H = H.replace(x, y)
hrep("const fx = c.fx * 12;", "const fx = c.fx * 12, P = { ...C, ...(c.pal || {}) };")
H = H.replace("C.cSkin", "P.cSkin").replace("C.hair", "P.hair").replace("C.cap", "P.cap")
hrep("  const r = rng(77);", "  if (c.stubble !== false) { const r = rng(77);")
H, n = re.subn(r"(  for \(let i = 0; i < 26; i\+\+\).*?ctx\.fill\(\); \})\n", r"\1 }\n", H, count=1); assert n == 1
ca = H.index("  const dome = arcP(0, -56"); cb = H.index("fill: P.cap2 }); ctx.restore();") + len("fill: P.cap2 }); ctx.restore();")
H = H[:ca] + "  if (c.cap !== false) {\n" + H[ca:cb] + """
  } else {
    const top = arcP(0, -34, 104, Math.PI, Math.PI * 2, 30).map(([x, y]) => [x, -34 + (y + 34) * 0.95]);
    HX(ctx, top.concat([[102, -20], [70, -44], [34, -34], [0, -48], [-34, -36], [-70, -46], [-102, -20]]), { fill: P.hair });
  }""" + H[cb:]
ea = H.index("  for (const sx of [-1, 1]) { // heavy upper lid = sly"); eb = H.index("  ctx.save(); ctx.translate(-38 + fx, -20 + c.browL);")
H = H[:ea] + """  for (const sx of [-1, 1]) { // sly = heavy upper lid; open; wide = shocked
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
""" + H[eb:]
hrep("ctx.translate(-38 + fx, -20 + c.browL); ctx.rotate(0.1);", "ctx.translate(-38 + fx, -20 + c.browL); ctx.rotate(bl);")
hrep("ctx.translate(38 + fx, -28 - c.browR); ctx.rotate(-0.16);", "ctx.translate(38 + fx, -28 - c.browR); ctx.rotate(br);")
hrep("  if (c.mouth === 'grin') {", """  if (c.mouth === 'smile') line(ctx, arcP(fx, 50, 32, 0.5, Math.PI - 0.5, 14), { lwk: 1 });
  else if (c.mouth === 'flat') line(ctx, [[-20 + fx, 80], [20 + fx, 80]], { lwk: 1 });
  else if (c.mouth === 'o') shape(ctx, ell(fx, 84, 12, 16), { fill: C.mouth });
  else if (c.mouth === 'grin') {""")
H = H.rstrip(); assert H.endswith('}'); H = H[:-1] + """  if (c.sweat > 0) {
    ctx.save(); ctx.globalAlpha = clamp(c.sweat * 4); const y = -50 + 34 * c.sweat;
    shape(ctx, spl([[104, y - 24], [116, y + 2], [104, y + 13], [92, y + 2]]), { fill: '#CFEAF7', lwk: 0.8 }); ctx.restore();
  }
}
"""
assert B.count("function cuBody(ctx, c) {") == 1
B = B.replace("function cuBody(ctx, c) {", "function cuBody(ctx, c) {\n  const P = { ...C, ...(c.pal || {}) };").replace("C.hood", "P.hood").replace("C.jeans", "P.jeans").replace("C.cSkin", "P.cSkin")
s = s[:a] + H + B + s[e:]

# ---- the big-phone insert becomes reusable ----
pa = s.index("function shotPhone(ctx, t) {"); pb = s.index("// ================= EDIT =================")
s = s[:pa] + """function bigPhone(ctx, t, o) { // phone held out in both hands, filling the frame
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

""" + s[pb:]

# ---- captions for the whole episode, auto-fit to width ----
ca = s.index("const CAPS = ["); cb = s.index("function captions(ctx, t) {")
s = s[:ca] + """const CAPS = [
  [0.02, 1.4, 'Payment Successful'], [1.44, 2.38, 'Hara tick.'], [2.42, 3.44, 'Ting!'],
  [3.5, 4.22, 'Aur dukaan se'], [4.24, 5.88, '\\u20B98,000 ke earbuds'], [5.9, 7.02, 'chale gaye...'], [7.04, 8.0, 'muft mein.'],
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
""" + s[cb:]
rep("ctx.font = '800 74px Baloo'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';",
    "ctx.font = '800 74px Baloo'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';\n    const fit = Math.min(1, 940 / ctx.measureText(s).width); ctx.scale(fit, fit);")

# shots go before the entry point (the render loop starts synchronously); model sheet stays in v2open_doll.js
ma = s.index("function modelSheet() {"); mb = s.index("const arg = process.argv[2]")
s = s[:ma] + open(os.path.join(os.path.dirname(__file__), 'shots.js')).read() + "\n" + s[mb:]
rep("  fs.mkdirSync(__dirname + '/out_doll', { recursive: true });\n  if (arg === 'sheet') modelSheet();\n  else for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(`${__dirname}/out_doll/f${String(f).padStart(3, '0')}.png`, out.toBuffer('image/png')); }",
    "  fs.mkdirSync(__dirname + '/out_full', { recursive: true });\n  for (const f of arg.split(',').map(Number)) { renderFrame(f); fs.writeFileSync(`${__dirname}/out_full/f${String(f).padStart(4, '0')}.png`, out.toBuffer('image/png')); }")
open(ANIM + 'v2full_doll.js', 'w').write(s)
print('ok', len(s))
