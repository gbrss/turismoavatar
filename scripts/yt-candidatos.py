# Descarga videos del canal vía espejos públicos (Cobalt / Invidious / Piped) y corta tramos candidatos para el hero.
import json, subprocess, urllib.request, urllib.parse, os, sys, random
OUT = 'migration/hero-video'; os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36', 'Accept': 'application/json'}
VIDEOS = {'WzfrMOR4XJk': [60, 200, 400], 'ieE0XLv0mW4': [5], 'Bk-u5Fe__eI': [0], 'B__VK6fS8u8': [20]}
log = []
def get(url, data=None, headers=None, timeout=40):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers={**UA, **(headers or {}), **({'Content-Type': 'application/json'} if data else {})})
    return urllib.request.urlopen(req, timeout=timeout)
def ok_video(path):
    return os.path.exists(path) and os.path.getsize(path) > 200_000 and subprocess.run(['ffprobe', '-v', 'error', path]).returncode == 0
def download(url, path):
    subprocess.run(['curl', '-sfL', '--max-time', '300', '-A', UA['User-Agent'], '-o', path, url])
    return ok_video(path)

def via_cobalt(vid, path):
    try:
        insts = json.load(get('https://instances.cobalt.best/api/instances.json'))
    except Exception as e:
        log.append(f'cobalt lista: {e}'); insts = []
    cands = [i for i in insts if i.get('online') and (i.get('services') or {}).get('youtube')]
    cands.sort(key=lambda i: -(i.get('score') or 0))
    for i in cands[:12]:
        api = f"{i.get('protocol','https')}://{i['api']}/"
        try:
            r = json.load(get(api, {'url': f'https://www.youtube.com/watch?v={vid}', 'videoQuality': '1080', 'downloadMode': 'mute', 'youtubeVideoCodec': 'h264'}, timeout=60))
            if r.get('url') and download(r['url'], path):
                log.append(f'{vid}: cobalt {api}'); return True
            log.append(f'{vid}: cobalt {api} → {r.get("status")} {r.get("error")}')
        except Exception as e:
            log.append(f'{vid}: cobalt {api} → {e}')
    return False

def via_invidious(vid, path):
    try:
        insts = json.load(get('https://api.invidious.io/instances.json?sort_by=health'))
        hosts = [h[1]['uri'] for h in insts if h[1].get('type') == 'https' and h[1].get('api')]
    except Exception as e:
        log.append(f'invidious lista: {e}'); hosts = []
    for h in hosts[:12]:
        try:
            d = json.load(get(f'{h}/api/v1/videos/{vid}?local=true'))
            streams = [f for f in d.get('adaptiveFormats', []) if 'video/mp4' in f.get('type', '') and 'avc1' in f.get('type', '')]
            streams.sort(key=lambda f: int((f.get('resolution') or '0p')[:-1] or 0), reverse=True)
            for f in streams:
                if int((f.get('resolution') or '0p')[:-1] or 0) > 1080: continue
                url = f['url'] if f['url'].startswith('http') else h + f['url']
                if download(url, path):
                    log.append(f'{vid}: invidious {h} {f.get("resolution")}'); return True
            for f in d.get('formatStreams', []):
                url = f['url'] if f['url'].startswith('http') else h + f['url']
                if download(url, path):
                    log.append(f'{vid}: invidious {h} {f.get("resolution")} (con audio)'); return True
        except Exception as e:
            log.append(f'{vid}: invidious {h} → {e}')
    return False

def via_piped(vid, path):
    try:
        insts = json.load(get('https://piped-instances.kavin.rocks/'))
        apis = [i['api_url'] for i in insts]
    except Exception as e:
        log.append(f'piped lista: {e}'); apis = ['https://pipedapi.kavin.rocks']
    for api in apis[:12]:
        try:
            d = json.load(get(f'{api}/streams/{vid}'))
            vs = [s for s in d.get('videoStreams', []) if s.get('videoOnly') and 'mp4' in s.get('mimeType', '') and (s.get('height') or 0) <= 1080]
            vs.sort(key=lambda s: s.get('height') or 0, reverse=True)
            for s in vs[:2]:
                if download(s['url'], path):
                    log.append(f'{vid}: piped {api} {s.get("height")}p'); return True
        except Exception as e:
            log.append(f'{vid}: piped {api} → {e}')
    return False

for vid, starts in VIDEOS.items():
    src = f'/tmp/{vid}.mp4'
    if not (via_cobalt(vid, src) or via_invidious(vid, src) or via_piped(vid, src)):
        log.append(f'✗ {vid} no descargado'); continue
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip() or 0)
    res = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', src], capture_output=True, text=True).stdout.strip()
    log.append(f'{vid}: {dur:.0f}s {res}')
    # Hoja de miniaturas cada ~10 s para elegir
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-vf', f"fps=1/{max(2, int(dur/48))},scale=240:-2,drawtext=text='%{{pts\\:hms}}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x8", '-frames:v', '1', '-q:v', '4', f'{OUT}/{vid}-hoja.jpg'])
    for s in starts:
        if s >= dur: continue
        d = min(16, dur - s)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(s), '-t', str(d), '-i', src, '-an', '-vf', 'scale=-2:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', f'{OUT}/{vid}-{s}.mp4'])
open(f'{OUT}/descarga.txt', 'w').write('\n'.join(log) + '\n')
print('\n'.join(log))
