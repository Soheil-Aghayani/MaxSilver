# -*- coding: utf-8 -*-
# Automatic checks before a release. No Node needed. Run from the repository folder:
#   "C:\Program Files\LibreOffice\program\python.exe" -X utf8 tools\check.py
# It reports (and exits with 1 on) real problems:
#   1. a file a page links to does not exist
#   2. the ?v= stamp differs between pages, or from the service worker VERSION
#   3. a script has a syntax error (checked by a real headless Chrome)
#   4. a data-manager-only="..." area is not defined in assets/roles.js
#   5. a JSON data file does not parse
#   6. two updates in assets/updates.js share an id
# It only warns about: long dashes in the interface texts (the owner does not want them).
import io, os, re, sys, json, glob, threading, subprocess, tempfile, http.server, socketserver, functools

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = next((p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') if os.path.isfile(p)), '')
problems, warnings = [], []


def read(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8').read()


pages = sorted(glob.glob(os.path.join(ROOT, '*.html')))
stamps = {}
scripts = set()
areas_used = {}
for pg in pages:
    name = os.path.basename(pg)
    h = io.open(pg, encoding='utf-8').read()
    for m in re.finditer(r'(?:src|href)="(\./[^"#]+)"', h):
        url = m.group(1)
        path, _, q = url.partition('?')
        if not os.path.exists(os.path.join(ROOT, path[2:])):
            problems.append('%s links to a missing file: %s' % (name, path))
        v = re.search(r'v=(\d+)', q)
        if v:
            stamps.setdefault(v.group(1), set()).add(name)
        if path.endswith('.js') and '/vendor/' not in path:
            scripts.add(path[2:])
    for m in re.finditer(r'data-manager-only="([^"]+)"', h):
        areas_used.setdefault(m.group(1), set()).add(name)

# 2. stamps
sw = read('service-worker.js')
mv = re.search(r"VERSION = 'v\d+-(\d+)'", sw)
if len(stamps) > 1:
    problems.append('different ?v= stamps on the pages: ' + ', '.join('%s (%d pages)' % (k, len(v)) for k, v in stamps.items()))
if mv and stamps and mv.group(1) not in stamps:
    problems.append('service-worker VERSION %s does not match the page stamp %s' % (mv.group(1), ', '.join(stamps)))

# 4. areas
roles = read('assets/roles.js')
defined = set(re.findall(r'^\s+(\w+):\s*\[', roles, re.M))
for a, where in sorted(areas_used.items()):
    if a not in defined:
        problems.append('area "%s" (used in %s) is not defined in assets/roles.js' % (a, ', '.join(sorted(where))))

# 5. json
for jf in glob.glob(os.path.join(ROOT, '**', '*.json'), recursive=True):
    if '.git' in jf or 'node_modules' in jf:
        continue
    try:
        json.load(io.open(jf, encoding='utf-8'))
    except Exception as e:
        problems.append('JSON does not parse: %s (%s)' % (os.path.relpath(jf, ROOT), e))

# 6. update ids
ids = re.findall(r"\{\s*id:\s*'([^']+)'", read('assets/updates.js'))
dup = sorted({i for i in ids if ids.count(i) > 1})
if dup:
    problems.append('assets/updates.js repeats ids: ' + ', '.join(dup))

# warn: long dashes in what people read
for rel in sorted(scripts) + [os.path.basename(p) for p in pages]:
    t = read(rel)
    # comments are not read by people: drop line comments and block comments first
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    if rel.endswith('.js'):
        t = '\n'.join(re.sub(r'(^|\s)//.*$', '', ln) for ln in t.split('\n'))
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    n = t.count(' \u2014 ')
    if n:
        warnings.append('%s has %d long dash(es)' % (rel, n))

# 3. syntax, by a real browser
if not CHROME:
    warnings.append('Chrome not found: script syntax was not checked')
else:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    tmp = os.path.join(ROOT, '_check_syntax.html')
    io.open(tmp, 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8><pre id=o>wait</pre><script>(async function(){var L=%s,bad=[];for(var i=0;i<L.length;i++){try{var t=await (await fetch("/"+L[i])).text();new Function(t);}catch(e){bad.push(L[i]+": "+e.message);}}document.getElementById("o").textContent="RESULT"+JSON.stringify(bad)+"END";})();</script>' % json.dumps(sorted(scripts)))
    try:
        out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--virtual-time-budget=20000', '--dump-dom', 'http://127.0.0.1:%d/_check_syntax.html' % port], capture_output=True, timeout=90).stdout.decode('utf-8', 'ignore')
        m = re.search(r'RESULT(.*?)END', out, re.S)
        if not m:
            warnings.append('the syntax check did not finish')
        else:
            for b in json.loads(m.group(1)):
                problems.append('script error: ' + b)
    finally:
        srv.shutdown()
        try:
            os.remove(tmp)
        except OSError:
            pass

print('pages: %d, scripts: %d, stamp: %s' % (len(pages), len(scripts), ', '.join(stamps) or '-'))
for w in warnings:
    print('WARN  ' + w)
for p in problems:
    print('FAIL  ' + p)
print('%d problem(s), %d warning(s)' % (len(problems), len(warnings)))
sys.exit(1 if problems else 0)
