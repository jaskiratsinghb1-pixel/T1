# Episode 03 — "Digital Arrest" video-call scam

Faceless 9:16 Short (Hinglish). A fake "CBI officer" video-calls Verma aunty and keeps her in a "digital arrest" until she transfers her savings.
Same paper-doll storybook style as Episode 02, built on the shared kit in `lib/doll.js`.

## Status
- **Preview (first 10 s):** `deliverables/ep03-digital-arrest-preview-10s.mp4` — awaiting approval
- Full episode: not built yet (`./build.sh full` is wired up, but the shots after 10 s still need to be drawn)

## Rebuild
Requires Node 20+ and ffmpeg.

```sh
npm install                 # once, at the repo root (@napi-rs/canvas)
episodes/03-digital-arrest/build.sh preview       # -> deliverables/ep03-digital-arrest-preview-10s.mp4
episodes/03-digital-arrest/build.sh stills 30,150 # -> anim/out/f0030.png, f0150.png
```

`build.sh` renders the frames (`anim/ep03.js`), synthesises the SFX bed (`anim/sfx.js` -> `build/sfx.wav`), mixes it under
`audio/vo.wav` and loudness-normalises the mix for Shorts.

## Files
- `audio/vo.wav` — voiceover supplied for this episode (24 kHz mono, 51.4 s)
- `anim/ep03.js` — characters (Verma aunty, the fake officer), living-room set, phone/video-call screens, shots, captions
- `anim/sfx.js` — deterministic synthesised SFX (phone buzz, accept pop, cell-door clang, rewind, tag pop, card whoosh)
- `build.sh` — preview / full / stills

## Preview shot list (VO timings from word-level transcription)
| Time | VO | Picture |
|---|---|---|
| 0.0–1.3 | Video call aaya. | Aunty's POV: phone buzzing, "Unknown" caller with a police-badge photo; call accepted |
| 1.3–2.8 | Saamne police ki vardi. | Circular reveal into the video call; push in on the uniformed "officer" and his printed "HQ" banner |
| 2.8–6.3 | Aur Verma aunty apne hi ghar mein arrest ho gayi. | Wide: aunty on her sofa lit by the screen, name tag; on "arrest" cell bars slam down, room dims, clang |
| 6.3–8.2 | Ek recreation dekhiye. | Rewind (clock spins back, dusk turns to afternoon); aunty with her chai, RECREATION tag; phone buzzes on the table |
| 8.2–10.0 | "Main CBI se bol raha hoon." | Back on the call: officer lip-synced to the VO, holds up a fake CBI ID |

Planted for later beats: the tea goes cold during the call (no steam), the son's photo on the wall ("ghar walon ko batao"),
the wrinkled banner with a binder clip (the fake set), the police-badge display picture.

## Script
> Video call aaya. Saamne police ki vardi. Aur Verma aunty… apne hi ghar mein "arrest" ho gayi.
> Ek recreation dekhiye.
> "Main CBI se bol raha hoon. Aapke Aadhaar pe ek parcel pakda gaya hai — drugs ke saath."
> "Aap digital arrest mein ho. Camera band mat karna. Kisi ko batana mat."
> Ghanton tak call chalta raha. Phir aakhri baat:
> "Verification ke liye saara paisa is account mein bhejo. Baad mein wapas mil jayega."
> Na woh officer asli tha, na woh case. Bas darr asli tha.
> Chaal simple hai: darr, aur akelapan. Aap kisi se pooch hi nahi paate.
> Rule yaad rakhiye: "digital arrest" naam ki koi cheez hoti hi nahi. Police video call pe arrest nahi karti — aur paisa kabhi nahi maangti.
> Aisa call aaye? Call kaato. Ghar walon ko batao. 1930 pe report karo.
> Toh agli baar vardi video call pe dikhe… call kaato. Scam se bacho. Simple.
