#!/usr/bin/env bash
# Convierte un video propio en el fondo del hero (sin audio, loop con fundido invisible).
# Uso: bash scripts/video-hero.sh entrada.mp4 [inicio_seg=0] [duracion_seg=12]
set -euo pipefail
IN=$1; S=${2:-0}; D=${3:-12}; F=1.2
T=$(echo "$D + $F" | bc)
mkdir -p public/media/video
ffmpeg -loglevel error -y -ss "$S" -t "$T" -i "$IN" -an -filter_complex "\
  [0:v]scale=-2:1080:flags=lanczos,fps=30,format=yuv420p,split=2[x][y];\
  [x]trim=0:$D,setpts=PTS-STARTPTS,split=2[m1][m2];\
  [y]trim=$D:$T,setpts=PTS-STARTPTS[tail];\
  [m1]trim=0:$F,setpts=PTS-STARTPTS[head];\
  [m2]trim=$F:$D,setpts=PTS-STARTPTS[body];\
  [tail][head]xfade=transition=fade:duration=$F:offset=0[blend];\
  [blend][body]concat=n=2:v=1:a=0[out]" -map "[out]" \
  -c:v libx264 -preset slow -crf 26 -profile:v high -movflags +faststart public/media/video/hero.mp4
ffmpeg -loglevel error -y -i public/media/video/hero.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an public/media/video/hero.webm
ls -la public/media/video
