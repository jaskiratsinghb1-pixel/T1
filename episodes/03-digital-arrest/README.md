# Episode 03 — "Digital Arrest" video-call scam

Faceless 9:16 Short (Hinglish). A fake "CBI officer" video-calls Verma aunty and keeps her in a "digital arrest" until she transfers her savings.
Same paper-doll storybook style as Episode 02, built on the shared kit in `lib/doll.js`.

## Status
- **Full episode:** `deliverables/ep03-digital-arrest-full.mp4` — 52.4 s, 1080×1920, 30 fps, VO + SFX, about −14.5 LUFS
- **Preview (first 10 s):** `deliverables/ep03-digital-arrest-preview-10s.mp4` — same source, cut at 10 s

## Rebuild
Requires Node 20+ and ffmpeg.

```sh
npm install                 # once, at the repo root (@napi-rs/canvas)
episodes/03-digital-arrest/build.sh full          # -> deliverables/ep03-digital-arrest-full.mp4 (~4 min)
episodes/03-digital-arrest/build.sh preview       # -> deliverables/ep03-digital-arrest-preview-10s.mp4
episodes/03-digital-arrest/build.sh stills 30,150 # -> anim/out/f0030.png, f0150.png
```

`build.sh` renders the frames (`anim/ep03.js`), synthesises the SFX bed (`anim/sfx.js` -> `build/sfx.wav`), mixes it under
`audio/vo.wav`, then compresses, limits and two-pass loudness-normalises the mix for Shorts.

## Files
- `audio/vo.wav` — voiceover supplied for this episode (24 kHz mono, 51.4 s)
- `anim/ep03.js` — characters (Verma aunty, the fake officer), living-room set, phone/video-call screens, shots, captions
- `anim/sfx.js` — deterministic synthesised SFX (phone buzz, accept pop, cell-door clang, rewind, tag pop, card whoosh)
- `build.sh` — preview / full / stills

## Shot list (VO timings from word-level transcription)
| Time | VO | Picture |
|---|---|---|
| 0.0–2.8 | Video call aaya. Saamne police ki vardi. | Aunty's POV: buzzing phone, "Unknown" caller with a police-badge photo; accepted; push in on the "officer" |
| 2.8–6.3 | Aur Verma aunty apne hi ghar mein arrest ho gayi. | Aunty on her sofa lit by the screen; on "arrest" cell bars slam down, room dims, clang |
| 6.3–8.2 | Ek recreation dekhiye. | Rewind to the afternoon: chai, RECREATION tag, phone buzzing on the table |
| 8.2–9.8 | "Main CBI se bol raha hoon." | Back on the call: lip-synced officer holds up a fake CBI ID |
| 9.8–12.7 | "Aadhaar pe ek parcel pakda gaya. Drugs ke saath." | Evidence parcel drops in, her Aadhaar card slides out, SEIZED stamp; flaps burst open, pouches fly out |
| 12.7–15.4 | "Aap digital arrest mein ho. Camera band mat karna." | DIGITAL ARREST stamp on the call; her self-view turns red with CAMERA ON |
| 15.4–16.6 | "Kisi ko batana mat." | She looks at her son's photo; a red marker crosses it out |
| 16.6–18.5 | Ghanton tak call chalta raha. | Time-lapse: clock spins, dusk to night, she droops; call timer races to 03:47:xx |
| 18.5–20.1 | Phir aakhri baat: | Slow push in, the officer leans toward the camera, vignette |
| 20.1–23.7 | "Verification ke liye saara paisa… wapas mil jayega." | Transfer screen: amount rolls to ₹18,40,000, Send, coins fly off, "Balance: ₹215" |
| 23.7–25.9 | Na woh officer asli tha, na woh case. | Pull back from the call: a damp room, taped banner falls, ring light, lungi under the uniform; NAKLI OFFICER / NAKLI CASE |
| 25.9–28.3 | Bas darr asli tha. | Aunty alone in the dark, spotlight, cold tea |
| 28.3–33.3 | Chaal simple hai: darr aur akelapan. Aap kisi se pooch hi nahi paate. | Phone-as-bait on a fish hook; DARR + AKELAPAN cards; dashed line to the son's photo gets cut |
| 33.3–41.7 | Rule yaad rakhiye… | Notebook board: "Digital arrest", "Video call pe arrest", "Paise ki maang" each struck out on the words |
| 41.7–46.6 | Aisa call aaye? Call kaato. Ghar walon ko batao. 1930 pe report karo. | Same caller rings, she declines; video call with her son; dialing 1930 (DTMF tones) |
| 46.6–52.4 | Toh agli baar… call kaato. Scam se bacho. Simple. | Afternoon again: phone buzzes, she declines with a knowing look, chai stays hot; SCAM SE BACHO / 1930 shield |

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
