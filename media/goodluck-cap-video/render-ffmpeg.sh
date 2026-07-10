#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
ASSET_DIR="$SCRIPT_DIR/assets"
OUTPUT=${1:-"$SCRIPT_DIR/goodluck-cap-promo.mp4"}

PYTHON="/Users/yangyichen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$PYTHON" "$SCRIPT_DIR/generate_overlays.py" "$ASSET_DIR"

ffmpeg -y \
  -i "$ASSET_DIR/cap-front-pair.jpeg" \
  -i "$ASSET_DIR/cap-side.jpeg" \
  -i "$ASSET_DIR/cap-back.png" \
  -i "$ASSET_DIR/cap-model-front.png" \
  -i "$ASSET_DIR/cap-model-side.png" \
  -i "$ASSET_DIR/cap-model-back.png" \
  -i "$ASSET_DIR/cap-front.jpeg" \
  -i "$ASSET_DIR/overlay-1.png" \
  -i "$ASSET_DIR/overlay-2.png" \
  -i "$ASSET_DIR/overlay-3.png" \
  -i "$ASSET_DIR/overlay-4.png" \
  -i "$ASSET_DIR/overlay-5.png" \
  -i "$ASSET_DIR/overlay-6.png" \
  -i "$ASSET_DIR/overlay-7.png" \
  -filter_complex "
    [0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.00045,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+70':d=78:s=1280x720:fps=30[base0];[base0][7:v]overlay=0:0:format=auto,format=yuv420p[s0];
    [1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0005,1.04)':x='iw/2-(iw/zoom/2)-40':y='ih/2-(ih/zoom/2)+80':d=78:s=1280x720:fps=30[base1];[base1][8:v]overlay=0:0:format=auto,format=yuv420p[s1];
    [2:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xeceef2,zoompan=z='min(zoom+0.0004,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=78:s=1280x720:fps=30[base2];[base2][9:v]overlay=0:0:format=auto,format=yuv420p[s2];
    [3:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.00045,1.035)':x='iw/2-(iw/zoom/2)+35':y='ih/2-(ih/zoom/2)':d=78:s=1280x720:fps=30[base3];[base3][10:v]overlay=0:0:format=auto,format=yuv420p[s3];
    [4:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0005,1.04)':x='iw/2-(iw/zoom/2)-28':y='ih/2-(ih/zoom/2)':d=78:s=1280x720:fps=30[base4];[base4][11:v]overlay=0:0:format=auto,format=yuv420p[s4];
    [5:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.00045,1.035)':x='iw/2-(iw/zoom/2)+20':y='ih/2-(ih/zoom/2)':d=78:s=1280x720:fps=30[base5];[base5][12:v]overlay=0:0:format=auto,format=yuv420p[s5];
    [6:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.00045,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+75':d=78:s=1280x720:fps=30[base6];[base6][13:v]overlay=0:0:format=auto,format=yuv420p[s6];
    [s0][s1]xfade=transition=wipeleft:duration=0.4:offset=2.2[x1];
    [x1][s2]xfade=transition=fade:duration=0.4:offset=4.4[x2];
    [x2][s3]xfade=transition=wiperight:duration=0.4:offset=6.6[x3];
    [x3][s4]xfade=transition=fade:duration=0.4:offset=8.8[x4];
    [x4][s5]xfade=transition=wipeleft:duration=0.4:offset=11.0[x5];
    [x5][s6]xfade=transition=fade:duration=0.4:offset=13.2,fade=t=out:st=15.3:d=0.5[outv]
  " \
  -map "[outv]" \
  -an \
  -c:v libx264 \
  -preset medium \
  -crf 22 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "$OUTPUT"

echo "$OUTPUT"
