# Storybook scam-awareness Shorts

Faceless 9:16 YouTube Shorts for an Indian audience, animated frame by frame in Node + Canvas 2D (`@napi-rs/canvas`).

- `lib/doll.js` — shared paper-doll drawing kit (ink line, pencil hatch, sleeve arms + round hands, captions devices) and the Baloo 2 font (OFL)
- `episodes/02-fake-payment-screen/` — fake "Payment Successful" screen (complete)
- `episodes/03-digital-arrest/` — "digital arrest" video-call scam (complete)
- `episodes/04-challan-apk/` — fake e-challan APK (complete, with the FishyFiles end card)
- `lib/cta.js` — FishyFiles end card (logo, tagline, follow pill), appended to every episode from 04; `lib/brand/` holds the logo

Setup: Node 20+, ffmpeg, then `npm install` at the repo root. Each episode folder has its own README and build command.
