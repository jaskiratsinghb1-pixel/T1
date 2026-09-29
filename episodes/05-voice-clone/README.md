# Episode 05 — AI voice-clone "Papa, mujhe bachao" call

**Status:** complete.
- `deliverables/ep05-voice-clone-full.mp4` — 70.6 s, 1080×1920, 30 fps, VO + SFX + captions, FishyFiles end card from 65.9 s, about −14.2 LUFS
- `deliverables/ep05-voice-clone-preview-10s.mp4` — first 10 s

The supplied VO runs 70.2 s; the edit follows it as recorded.

## Why this one
- It hits hardest emotionally: the victim hears their own child crying for help. That makes for a very strong hook and very shareable content (every parent forwards it).
- It's current and growing in India: a few seconds of voice from Instagram reels or WhatsApp voice notes is enough to clone someone.
- It has a clear twist mid-video: the son was asleep in his hostel the whole time.
- The rule is simple and memorable: a **family code word**, and **call back on the saved number**.

## Titles / thumbnail text (pick one)
1. "Beta ki awaaz… par beta nahi tha 😨"
2. "Yeh call aapke ghar bhi aa sakti hai"
3. "Sirf 1 reel se aapki awaaz copy ho sakti hai"

## Characters (same paper-doll rules: front-facing, round hands, props held between sleeve and hand)
- **Mehta ji**: late 50s dad, round glasses, grey moustache, cardigan over a kurta.
- **Kabir**: college-age son, hoodie, headphones around his neck; shown asleep in the hostel for the twist.
- **The caller**: never shown; only a dark "Unknown" call screen and a voice waveform that glitches into robot pixels on the reveal.

## Script (Hinglish, aim for 48–52 s including the CTA; read briskly)
> **[HOOK]** "Papa, mujhe bachao!" — awaaz Kabir ki thi. Rona bhi Kabir ka tha. Par phone pe… Kabir tha hi nahi.
> Ek recreation dekhiye.
> Raat ke das baje Mehta ji ka phone bajta hai. Beta rote hue: "Papa, accident ho gaya… police le gayi."
> Phir ek aadmi line pe aata hai: "Case band karna hai toh abhi pachaas hazaar bhejo. Kisi ko bataya… toh beta andar."
> Mehta ji ne bina soche paise bhej diye.
> Aur Kabir? Woh apne hostel mein chain se so raha tha.
> Woh awaaz AI ki thi — Kabir ki Instagram reels se churaayi hui.
> **Chaal simple hai:** apno ki awaaz, aur darr.
> **Rule yaad rakhiye:** aisa call aaye, toh phone kaato, aur khud bachche ke saved number pe call karo.
> Aur ghar mein ek secret code word rakho — jo sirf family ko pata ho. Code nahi bata paaya? Toh woh apna nahi hai.
> Paise bhej diye? Turant 1930 pe call karo.
> Toh agli baar apno ki awaaz paise maange… pehle code word poocho. Scam se bacho. Simple.
> **[CTA]** Aise aur scams ki files kholne ke liye — FishyFiles ko follow karein.

### VO notes
- Hook: the first line is panicked and breathless, like the son. Then switch to the calm narrator and slow right down on "Kabir tha hi nahi".
- Read the caller's line low, cold and fast.
- Put a clear beat before "Aur Kabir?"; that's the twist.
- Say "code word" with emphasis both times.
- Last time the VO ran ~68 s against a 49 s plan; keep the pace up so this one lands near 50 s.

## Shot plan (to be timed to the VO)
1. **Hook:** black screen, a pulsing voice waveform with "Papa, mujhe bachao!"; it cuts to Mehta ji's shocked face lit by the phone.
2. **Recreation:** a rewind; Mehta ji relaxing with the TV and chai, the clock at 10:00; the phone rings, showing "Kabir ❤️"-style contact art (same name spoofed).
3. **Crying son:** close-up of Mehta ji listening; tears and an accident sketch (police siren, bike) drawn in the air as his imagination.
4. **Threat:** the voice changes to the caller; a red "₹50,000" and "KISI KO MAT BATAO" stamp; his hand trembles.
5. **Pay:** transfer screen, Send, coins fly off.
6. **Twist:** a hard cut to Kabir asleep in the hostel, headphones on, phone face-down, "z z z"; a "?!" pops up.
7. **Reveal:** Kabir's reels on a phone; his voice waveform gets sucked out of a reel into a robot/AI icon, which spits out a copy; a "NAKLI AWAAZ" stamp.
8. **CHAAL:** "APNO KI AWAAZ + DARR" cards.
9. **RULE 1:** call hangs up, then a new call to the saved contact "Kabir"; Kabir answers sleepy: "Papa? Main theek hoon."
10. **RULE 2:** a family "code word" card with a lock, the word hidden as "\*\*\*\*\*"; the caller fails ("Code?" … silence, glitch).
11. **1930:** the dialer with keypad tones.
12. **Callback:** Mehta ji gets the call again, calmly asks "Code word batao?"; the line glitches and drops; he smiles; the "SCAM SE BACHO / 1930" shield appears.
13. **FishyFiles end card** (`lib/cta.js`) over the follow line.

## Build
Requires Node 20+ and ffmpeg; `npm install` once at the repo root.
```sh
episodes/05-voice-clone/build.sh full           # -> deliverables/ep05-voice-clone-full.mp4 (~4 min)
episodes/05-voice-clone/build.sh preview        # -> first 10 s
episodes/05-voice-clone/build.sh stills 90,900  # -> anim/out/*.png
```
- `anim/ep05.js` — Mehta ji, Kabir, the AI copier, living room + hostel, phone screens, shots, captions; end card from `lib/cta.js`
- `anim/sfx.js` — synthesised SFX cues for this VO
- `audio/vo.wav` — supplied voiceover
