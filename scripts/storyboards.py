# Descarga los storyboards (miniaturas de la línea de tiempo) de videos de YouTube para elegir un tramo.
import json, re, sys, urllib.request, os
ids = json.load(open('scripts/hero-video.json'))['ids']
os.makedirs('migration/hero-video', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36', 'Accept-Language': 'es-CL,es;q=0.9'}
log = []
for vid in ids:
    try:
        html = urllib.request.urlopen(urllib.request.Request(f'https://www.youtube.com/watch?v={vid}', headers=UA), timeout=30).read().decode('utf8', 'ignore')
        spec = re.search(r'"playerStoryboardSpecRenderer":\{"spec":"([^"]+)"', html)
        dur = re.search(r'"lengthSeconds":"(\d+)"', html)
        if not spec: log.append(f'{vid} sin storyboard'); continue
        parts = spec.group(1).replace('\\u0026', '&').split('|')
        base = parts[0]
        L = len(parts) - 2  # nivel de mayor resolución
        w, h, count, cols, rows, interval, name, sigh = parts[-1].split('#')
        per = int(cols) * int(rows)
        sheets = (int(count) + per - 1) // per
        for n in range(min(sheets, 12)):
            url = base.replace('$L', str(L)).replace('$N', name.replace('$M', str(n))) + f'&sigh={sigh}'
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
            open(f'migration/hero-video/{vid}_sb{n:02d}.jpg', 'wb').write(data)
        log.append(f'{vid} dur={dur.group(1) if dur else "?"}s frames={count} {w}x{h} grid={cols}x{rows} interval_ms={interval} sheets={sheets}')
    except Exception as e:
        log.append(f'{vid} error {e}')
open('migration/hero-video/storyboards.txt', 'w').write('\n'.join(log) + '\n')
print('\n'.join(log))
