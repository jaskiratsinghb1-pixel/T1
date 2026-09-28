# Episode 04 — fake e-challan APK ("RTO Challan.apk")

**Status:** complete.
- `deliverables/ep04-challan-apk-full.mp4` — 68.6 s, 1080×1920, 30 fps, VO + SFX + captions, FishyFiles end card from 64.2 s, about −14.6 LUFS
- `deliverables/ep04-challan-apk-preview-10s.mp4` — first 10 s

Character pass (v2): Rohan redrawn in the reference proportions (round head, simple hair cap, V-neck, arms that follow the reach so they hug the body); phone close-ups use only two caricature hands — both grip, or the left grips while the right fist points and taps; real FishyFiles logo on the end card.

The supplied VO runs 68.0 s (longer than the 46–49 s planned); the edit follows it as recorded.

## Why this one
- Very common right now: a WhatsApp/SMS "traffic challan pending" message with an `.apk` attached. Installing it gives the scammer SMS access, so every OTP goes to them.
- Anyone with a scooter or car can relate to it, and the fear of a cancelled licence makes a strong hook.
- It shows well on screen: a harmless-looking file turns into an app, one "Allow" tap, then OTPs quietly flying out overnight and debit messages stacking up in the morning.
- The rule is simple and actionable: challans are paid only on the official Parivahan site/app, never through a file on WhatsApp.

## Characters
- **Rohan** — mid-20s delivery-app rider / office-goer, helmet always nearby, scooter keys on a lanyard. New character in the same paper-doll style (front-facing, round hands, props held between sleeve and hand).
- **The scammer** — never shown as a person; only as the "RTO" profile picture and a grinning shadow behind the OTP stream (keeps the focus on the trick).

## Script (Hinglish, target 46–49 s including the CTA line)
> **[HOOK]** ₹500 ka challan aaya… aur Rohan ke account se ₹4 lakh chale gaye.
> Ek recreation dekhiye.
> WhatsApp pe message: "Aapka traffic challan pending hai. Abhi bharein, warna licence cancel." Saath mein ek file — *RTO Challan dot APK*.
> Jaldi-jaldi mein Rohan ne install kar diya. App ne ek permission maangi — SMS padhne ki. Usne "Allow" daba diya.
> Us raat phone chup tha… par har OTP chupchaap scammer tak ja raha tha.
> Subah — ek ke baad ek debit message. ₹4 lakh saaf.
> **Chaal simple hai:** darr aur jaldi. Challan ka darr, aur ek file jo app ban jaati hai.
> **Rule yaad rakhiye:** challan kabhi WhatsApp pe APK file ke saath nahi aata. Challan check karna hai? Sirf official Parivahan website ya app pe.
> Aur jo app SMS padhne ki permission maange — usse turant hatao.
> Galti ho gayi? 1930 pe call karo, aur bank ko turant batao.
> Toh agli baar challan ki file aaye… mat kholo. Scam se bacho. Simple.
> **[CTA]** Aise aur scams ki files kholne ke liye — FishyFiles ko follow karein.

### VO notes
- Hook: say "₹500" lightly, then pause and drop the voice on "₹4 lakh".
- Read the WhatsApp message in a flat, robotic "official" voice.
- Slow down on "har OTP chupchaap scammer tak ja raha tha".
- CTA line warm and upbeat; it plays over the end card (about 3.6 s).
- Same narrator as Episodes 02–03.

## Shot plan (to be timed to the VO)
1. **Hook:** a ₹500 challan notification pops up; a counter beside it jumps to "−₹4,00,000" with a thud.
2. **Recreation:** rewind; Rohan parks his scooter and takes his helmet off, and his phone buzzes.
3. **Message:** WhatsApp chat from "RTO Traffic Dept" (badge profile picture) with a file bubble `RTO_Challan.apk`; a red "licence cancel" line shakes.
4. **Install:** the file turns into an app icon (fake government emblem); permission dialog "Allow this app to read your SMS?"; his thumb taps **Allow**; the camera pushes in on his face.
5. **Night:** dark bedroom, phone face-down on the side table; OTP bubbles float out of it through the window towards a grinning shadow.
6. **Morning:** debit SMS notifications stack up and the balance counts down; Rohan's shocked face with the helmet in his lap.
7. **CHAAL:** "DARR + JALDI" cards, then the APK file unfolds into an app like origami.
8. **RULE:** notebook board — "WhatsApp pe APK challan" struck out; a green tick on the official Parivahan site (shown as a generic browser with a gov.in address, no copied logos).
9. **Fix:** Settings → Apps → the fake app → Uninstall; the permission toggle flips off.
10. **1930:** dialer with keypad tones, then a bank call.
11. **Callback:** Rohan gets the same message again, smirks and deletes it; a "SCAM SE BACHO / 1930" shield appears.
12. **CTA end card** (`lib/cta.js`, 3.6 s): FishyFiles logo, wordmark, tagline "Har scam ki file, yahin khulti hai.", Follow pill → Following.

## Build
Requires Node 20+ and ffmpeg; `npm install` once at the repo root.
```sh
episodes/04-challan-apk/build.sh full           # -> deliverables/ep04-challan-apk-full.mp4 (~3.5 min)
episodes/04-challan-apk/build.sh preview        # -> first 10 s
episodes/04-challan-apk/build.sh stills 90,900  # -> anim/out/*.png
```
- `anim/ep04.js` — Rohan, sets, phone screens, shots, captions; the end card comes from `lib/cta.js`
- `anim/sfx.js` — synthesised SFX cues for this VO
- `audio/vo.wav` — supplied voiceover
