# Episode 06 — "Like karo, paise kamao" task scam (Telegram)

**Status:** concept + script. Waiting for the voiceover; then a 10 s preview, then the full episode with the FishyFiles end card.

## Why this one
- One of the biggest scams in India right now, and it hits young people and homemakers who wouldn't fall for a "police" call.
- The arc is gripping: the victim actually *earns* money first (₹150, ₹300, ₹1,200 land in the account), so the trap feels real. Then the "VIP task" needs a deposit, the dashboard shows lakhs of fake profit, and withdrawal is "blocked" until she pays more.
- A counter going up and up, then down to zero, is a very strong visual.
- The rule is simple: **no real job asks you to pay first.**

## Titles / thumbnail text (pick one)
1. "Videos like karke ₹1 lakh kamaaye… phir ₹6 lakh gaye 😳"
2. "Yeh 'part-time job' aapko barbaad kar degi"
3. "Pehle paise milenge… phir sab chala jayega"

## Characters (same paper-doll rules: front-facing, round hands, max two hands, taps by the pointing fist)
- **Priya**: mid-20s, ponytail, big round glasses, teal kurti; works from her room at a laptop and phone.
- **"HR Riya"**: never shown as a person; only a Telegram profile with a stock "smiling HR" avatar and a fake blue tick.

## Script (Hinglish; kept short on purpose so the read lands near 50 s with the CTA)
> **[HOOK]** Pehle din: ₹150. Doosre din: ₹1,200. Teesre din… ₹6 lakh gaye.
> Ek recreation dekhiye.
> Priya ko WhatsApp aaya: "Part-time job. Bas YouTube videos like karo, har like pe ₹50."
> Usne teen videos like kiye… aur sach mein ₹150 aa gaye.
> Phir Telegram group. "VIP task" — ₹1,000 lagao, ₹1,300 pao. Paise phir aaye.
> Bharosa ho gaya. Is baar ₹50,000 lagaye. Screen pe profit dikha — ₹1 lakh!
> Par nikaalne gayi toh: "Account freeze hai. Unlock ke liye ₹2 lakh aur bharo."
> Woh bharti gayi… aur ek din group hi gayab.
> **Chaal simple hai:** pehle chhota inaam, phir bada laalach.
> **Rule yaad rakhiye:** koi asli naukri pehle paise nahi maangti. Paise maange? Toh woh naukri nahi, jaal hai.
> Aur screen pe dikhta profit, profit nahi hota.
> Phas gaye? Turant 1930 pe call karo.
> Toh agli baar "like karo, paise kamao" aaye… block karo. Scam se bacho. Simple.
> **[CTA]** Aise aur scams ki files kholne ke liye — FishyFiles ko follow karein.

### VO notes
- Hook: speed up across the three days, then drop hard on "₹6 lakh gaye".
- Read "aur sach mein ₹150 aa gaye" pleasantly surprised; the audience should believe it too.
- Read the "Account freeze hai…" line cold and robotic.
- Pause before "aur ek din group hi gayab."
- Brisk overall; aim for about 50 s.

## Shot plan (to be timed to the VO)
1. **Hook:** three calendar cards flip ("Day 1 / Day 2 / Day 3") with a green balance counter climbing, then a red crash to "−₹6,00,000" with a thud.
2. **Recreation:** rewind; Priya at her desk with her laptop and chai; her phone buzzes.
3. **Offer:** WhatsApp "Part-time job 💼 ₹50 per like" bubble; her eyes light up.
4. **First payout:** a phone close-up with a video thumbnail and a heart tap (pointing fist) ×3; a green "₹150 credited" pops in, with coins and her happy face.
5. **Telegram:** a group with the "HR Riya ✓" avatar, member count "4,812", fake screenshots of other people's payouts scrolling; a "VIP TASK ₹1,000 → ₹1,300" card; paid, returned.
6. **Big deposit:** a transfer of ₹50,000; the dashboard counter races to "Profit ₹1,00,000"; sparkles, Priya grinning.
7. **Withdraw:** she taps Withdraw; a red "ACCOUNT FROZEN, pay ₹2,00,000 to unlock" modal; her face drops.
8. **Spiral:** a stack of transfer receipts piles up; then the group screen reads "This group no longer exists"; "GAYAB" stamp; her balance is at zero.
9. **CHAAL:** a "CHHOTA INAAM → BADA LAALACH" card pair (a small coin as bait on a hook, then a big money bag in a trap).
10. **RULE:** a notebook board: "Pehle paise do" struck out; "Screen profit ≠ asli paisa"; a job-offer card turning into a net ("JAAL").
11. **1930:** the dialer with keypad tones.
12. **Callback:** the same WhatsApp offer arrives; Priya smirks and taps Block, then Report; the "SCAM SE BACHO / 1930" shield appears.
13. **FishyFiles end card** (`lib/cta.js`) over the follow line.

## Build
Same pipeline as Episodes 04–05 (`build.sh preview|full|stills`, `lib/doll.js`, `lib/cta.js`); added once the VO arrives.
