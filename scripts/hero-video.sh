#!/usr/bin/env bash
# Genera el video de fondo del hero a partir de los videos de YouTube del canal.
#  mode=preview → hojas de miniaturas (cada 8 s, con tiempo) en migration/hero-video/
#  mode=cut     → corta {id,start,duration}, quita audio y funde el final con el inicio (loop invisible)
set -euo pipefail
CFG=scripts/hero-video.json
MODE=$(jq -r .mode $CFG)
OUT=migration/hero-video
mkdir -p $OUT public/media/video /tmp/yt
dl() {
  yt-dlp -q --no-warnings -f "bv*[height<=1080][ext=mp4]/bv*[height<=1080]/b" -o "/tmp/yt/$1.%(ext)s" "https://www.youtube.com/watch?v=$1" \
    || yt-dlp -q --no-warnings --extractor-args "youtube:player_client=tv,ios,web_safari" -f "bv*[height<=1080]/b" -o "/tmp/yt/$1.%(ext)s" "https://www.youtube.com/watch?v=$1"
  ls /tmp/yt/$1.* | head -1
}
if [ "$MODE" = preview ]; then
  for id in $(jq -r '.ids[]' $CFG); do
    f=$(dl $id) || { echo "✗ $id" >> $OUT/errores.txt; continue; }
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1)
    res=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$f")
    echo "$id ${dur}s $res" >> $OUT/videos.txt
    ffmpeg -loglevel error -y -i "$f" -vf "fps=1/8,scale=320:-2,drawtext=text='%{pts\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x8" -frames:v 1 -q:v 4 "$OUT/$id.jpg"
  done
else
  id=$(jq -r .id $CFG); S=$(jq -r .start $CFG); D=$(jq -r .duration $CFG); F=$(jq -r '.fade // 1.2' $CFG)
  f=$(dl $id)
  T=$(echo "$D + $F" | bc)
  ffmpeg -loglevel error -y -ss "$S" -t "$T" -i "$f" -an -filter_complex "\
    [0:v]scale=-2:720,fps=30,format=yuv420p,split=2[x][y];\
    [x]trim=0:$D,setpts=PTS-STARTPTS,split=2[m1][m2];\
    [y]trim=$D:$T,setpts=PTS-STARTPTS[tail];\
    [m1]trim=0:$F,setpts=PTS-STARTPTS[head];\
    [m2]trim=$F:$D,setpts=PTS-STARTPTS[body];\
    [tail][head]xfade=transition=fade:duration=$F:offset=0[blend];\
    [blend][body]concat=n=2:v=1:a=0[out]" -map "[out]" \
    -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart public/media/video/hero.mp4
  ffmpeg -loglevel error -y -i public/media/video/hero.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -an public/media/video/hero.webm
  ffmpeg -loglevel error -y -i public/media/video/hero.mp4 -frames:v 1 -q:v 3 src/assets/media/video/hero-poster.jpg 2>/dev/null || { mkdir -p src/assets/media/video; ffmpeg -loglevel error -y -i public/media/video/hero.mp4 -frames:v 1 -q:v 3 src/assets/media/video/hero-poster.jpg; }
  ls -la public/media/video >> $OUT/resultado.txt
fi
