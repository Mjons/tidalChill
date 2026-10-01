#!/usr/bin/env python3
"""Builds ../trailer.html: the real sim (index.html) + director + player UI (+ optional audio) in ONE file."""
import base64, os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
s = open(os.path.join(root, 'index.html'), encoding='utf-8').read()

pre = """<script>
// trailer mode: fixed sim size, manual stepping, seeded randomness
window.TL_SIZE={w:670,h:1490};window.TL_Q='?wall&manual&chaos=0&toasts=0&px=134&pan=0.5';
(()=>{let a=1;window.TLseed=n=>{a=n|0;};Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
</script>"""
css = """<script src="https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.js"></script>
<style>
#stage,#hud,#toast,#evp{display:none!important}
#tr{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px;background:#05070f;color:#f6ecd9;font:14px "Pixelify Sans",ui-monospace,monospace;z-index:100}
#out{height:calc(100vh - 120px);max-width:calc(100vw - 24px);aspect-ratio:9/16;object-fit:contain;image-rendering:auto;box-shadow:0 0 0 2px rgba(255,236,210,.15)}
#tbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center}
#tbar button,#tbar select,#save{font:12px Silkscreen,ui-monospace,monospace;text-transform:uppercase;color:#f6ecd9;background:rgba(255,236,210,.08);border:0;padding:9px 12px;cursor:pointer;box-shadow:0 0 0 2px rgba(255,236,210,.24);text-decoration:none}
#exp{color:#1a1020!important;background:#ffb36b!important}
#pw{width:min(420px,80vw);height:6px;background:rgba(255,236,210,.12)}#bar{height:100%;width:0;background:#ffb36b}
#st{font-size:12px;opacity:.8;min-height:16px;text-align:center}
</style>"""
ui = """<div id="tr"><canvas id="out"></canvas>
<div id="tbar"><button id="play">&#9654; Preview</button><button id="stop">&#9632; Stop</button>
<select id="fps"><option value="30" selected>30 fps</option><option value="60">60 fps</option></select>
<button id="exp">Export MP4</button><a id="save" hidden>Save again</a></div>
<div id="pw"><div id="bar"></div></div><div id="st">Loading...</div></div>"""
audio = ''
for name, mime in (('mix.ogg', 'audio/ogg'), ('mix.webm', 'audio/webm'), ('mix.mp3', 'audio/mpeg')):
    p = os.path.join(here, 'audio', name)
    if os.path.exists(p):
        audio = '<script>window.TRAILER_AUDIO={mime:"%s",data:"%s"};</script>' % (mime, base64.b64encode(open(p, 'rb').read()).decode())
        break
director = open(os.path.join(here, 'director.js'), encoding='utf-8').read()
uijs = open(os.path.join(here, 'ui.js'), encoding='utf-8').read()

s = re.sub(r'<title>.*?</title>', '<title>Tidal Chill Trailer</title>', s, 1)
s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + pre + css, 1)
s = s + ui + audio + '<script>' + director + '</script><script>' + uijs + '</script>'
open(os.path.join(root, 'trailer.html'), 'w', encoding='utf-8').write(s)
print('trailer.html', len(s) // 1024, 'KB', '(with audio)' if audio else '(no audio)')
