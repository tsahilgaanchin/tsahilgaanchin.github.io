#!/usr/bin/env python3
"""
build.py — Bundles the split source (index.html + style.css + js/*.js + manifest/icons)
into a single self-contained circuit-sim.html file.

Why: opening index.html directly via Android content:// URIs (file managers, "Open with")
cannot load sibling files (style.css, js/*.js) via relative paths. The bundled single file
has everything inlined, so it works everywhere: double-click on desktop, open via any
Android file manager, or "Add to Home screen" as an app.

Usage:
    python3 build.py
Produces: ../circuit-sim.html (one level up from this script)
"""
import base64, json, os

HERE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(HERE, path), encoding='utf-8') as f:
        return f.read()

def read_bin(path):
    with open(os.path.join(HERE, path), 'rb') as f:
        return f.read()

def build():
    html = read('index.html')
    body_start = html.index('<body>') + len('<body>')
    body_end = html.index('<script src=')
    body_markup = html[body_start:body_end].strip('\n')

    css = read('style.css')

    order = ['dom', 'state', 'simulate', 'render', 'check', 'storage', 'templates', 'events', 'main']
    js_parts = []
    for name in order:
        content = read(f'js/{name}.js')
        lines = content.split('\n')
        if lines[0].startswith('//'):
            lines = lines[1:]
        while lines and lines[0].strip() == '':
            lines = lines[1:]
        js_parts.append(f'  // ===== {name}.js =====\n' + '\n'.join(lines).rstrip())
    js_bundle = '(function(){\n' + '\n\n'.join(js_parts) + '\n})();'

    icon192_b64 = base64.b64encode(read_bin('icon-192.png')).decode()
    icon512_b64 = base64.b64encode(read_bin('icon-512.png')).decode()
    manifest = json.loads(read('manifest.json'))
    manifest['icons'] = [
        {**manifest['icons'][0], 'src': f'data:image/png;base64,{icon192_b64}'},
        {**manifest['icons'][1], 'src': f'data:image/png;base64,{icon512_b64}'},
    ]
    manifest_b64 = base64.b64encode(json.dumps(manifest, ensure_ascii=False).encode('utf-8')).decode()

    final = f'''<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="manifest" href="data:application/manifest+json;base64,{manifest_b64}">
<link rel="icon" type="image/png" href="data:image/png;base64,{icon192_b64}">
<link rel="apple-touch-icon" href="data:image/png;base64,{icon192_b64}">
<meta name="theme-color" content="#262A31">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Хэлхээ Сим">
<title>Хэлхээ угсрах симулятор</title>
<style>
{css}
</style>
</head>
<body>

{body_markup}

<script>
{js_bundle}
</script>
</body>
</html>
'''
    out_path = os.path.join(HERE, '..', 'circuit-sim.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(final)
    print(f"Built {out_path} ({len(final)} chars)")

if __name__ == '__main__':
    build()
