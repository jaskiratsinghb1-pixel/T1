# Episode 02 — fake "Payment Successful" screen (storybook redesign)

Faceless 9:16 Short (Hinglish) about the fake-payment-screen scam, redrawn in the "paper doll" storybook style:
front-facing symmetric characters, one even ink line, flat fills with coloured-pencil hatching, round hands at the end of sleeve tubes.
Rendered frame by frame with Node + Canvas 2D (`@napi-rs/canvas`); no WebGL.

Source repo for the original episodes: `verdexoworks1-cyber/da1` (the voiceover/SFX mix here is taken from its `v2-fake-payment-short-full-v1.mp4`).

## Deliverables
- `deliverables/v2-fake-payment-short-full-storybook.mp4` — full Short, 54.0 s, 1080×1920, 30 fps, VO + SFX + captions
- `deliverables/v2-fake-payment-opening-10s-storybook.mp4` — the approved 10 s opening test

## Rebuild
Requires Node 20+, Python 3 and ffmpeg.

```sh
cd anim && npm install
python3 ../build/build_full.py            # regenerates anim/v2full_doll.js from v2open_doll.js + build/shots.js
node v2full_doll.js all | ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -i ../audio/v2-vo-sfx-mix.m4a \
  -map 0:v -map 1:a -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```

- `node v2full_doll.js 450,1300` writes review stills to `anim/out_full/`
- `node v2open_doll.js all` renders only the 10 s opening; `node v2open_doll.js sheet` writes the character model sheet to `anim/out_doll/sheet.png`

## Files
- `anim/v2open_doll.js` — approved opening: drawing primitives, both characters (Sharma ji, the customer), set, captions
- `build/shots.js` — the 15 shots after the opening (10.2–54 s), crowd variants, graphic devices (marker circles, stamps, bubbles, shield)
- `build/build_full.py` — splices the opening and the shots into `anim/v2full_doll.js` (checked in, so the build step is optional)
- `anim/fonts/Baloo2.ttf` — caption font, SIL Open Font License (`OFL-Baloo2.txt`)

## Character rules (reuse for new episodes)
- Characters face the camera; head turns are a small feature shift, never a redraw.
- Arms are sleeve tubes with one elbow (2-bone IK, elbow always out and down); hands are plain rounds.
- Held props sit between sleeve and hand so the hand always reads as gripping.
- Acting = expression swaps, nods, tilts and a few eased whole-arm moves.
