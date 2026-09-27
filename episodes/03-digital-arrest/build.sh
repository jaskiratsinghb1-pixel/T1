#!/usr/bin/env bash
# Build Episode 03. Requires Node 20+ and ffmpeg; run `npm install` once at the repo root.
#   ./build.sh preview        -> deliverables/ep03-digital-arrest-preview-10s.mp4 (first 10 s)
#   ./build.sh full           -> deliverables/ep03-digital-arrest-full.mp4
#   ./build.sh stills 30,150  -> anim/out/f0030.png ...
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-preview}"
if [ "$MODE" = stills ]; then node anim/ep03.js "${2:?frame list}"; exit 0; fi
case "$MODE" in
  preview) DUR=10; OUT=deliverables/ep03-digital-arrest-preview-10s.mp4 ;;
  full)    DUR=52.4; OUT=deliverables/ep03-digital-arrest-full.mp4 ;;
  *) echo "usage: $0 preview|full|stills <frames>" >&2; exit 1 ;;
esac
mkdir -p deliverables build
node anim/sfx.js "$DUR" build/sfx.wav
FADE=$(awk "BEGIN{print $DUR-0.3}")
node anim/ep03.js all "$DUR" | ffmpeg -y -loglevel error \
  -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -i audio/vo.wav -i build/sfx.wav \
  -filter_complex "[1:a]aresample=48000,apad[v];[2:a]apad[s];[v][s]amix=inputs=2:duration=first:normalize=0,atrim=0:$DUR,afade=t=out:st=$FADE:d=0.3[a]" \
  -map 0:v -map "[a]" -t "$DUR" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a pcm_s16le build/raw.mov
# gentle compression + limiting, then two-pass linear loudness normalisation to ~-14 LUFS / -1.5 dBTP
PRE="acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,alimiter=limit=0.7:level=false"
LN="loudnorm=I=-14:TP=-1.5:LRA=20"
M=$(ffmpeg -hide_banner -i build/raw.mov -af "$PRE,$LN:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
ffmpeg -y -loglevel error -i build/raw.mov -c:v copy \
  -af "$PRE,$LN:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "wrote $OUT"
