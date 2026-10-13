"""Stores every product image of assets/catalog.json inside the repository, shrunk for the web.

The catalog used to hotlink the brands' own sites, where some uploads are 5 MB print-size PNGs and cards stayed blank for
a long time. This script downloads each remote image once, scales it to 640 px on the longest side, saves it as WebP under
assets/products/ and points the catalog at the local copy. The original address is kept in "imgOrig".

Run it again after tools/build_catalog.py regenerates the catalog (new items get localised, existing files are reused):

    python tools/localize_images.py
"""
import hashlib
import io
import json
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets" / "catalog.json"
OUT = ROOT / "assets" / "products"
MAX_SIDE = 640
QUALITY = 80


def local_name(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12] + ".webp"


def fetch(url):
    parts = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((parts.scheme, parts.netloc, urllib.parse.quote(parts.path, safe="/%"), parts.query, ""))
    request = urllib.request.Request(safe, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def shrink(data, dest):
    image = Image.open(io.BytesIO(data))
    image.load()
    has_alpha = image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info
    image = image.convert("RGBA" if has_alpha else "RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    image.save(dest, "WEBP", quality=QUALITY, method=6)


def localise(url):
    dest = OUT / local_name(url)
    if dest.exists():
        return url, True, "cached"
    try:
        shrink(fetch(url), dest)
        return url, True, "ok"
    except Exception as error:  # keep going; the card falls back to the placeholder
        return url, False, str(error)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    remote = sorted({item["img"] for item in catalog["items"] if item.get("img", "").startswith("http")})
    print("remote images:", len(remote))
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = {url: (ok, note) for url, ok, note in pool.map(localise, remote)}
    failed = [url for url, (ok, _) in results.items() if not ok]
    for item in catalog["items"]:
        url = item.get("img", "")
        if url in results and results[url][0]:
            item["imgOrig"] = url
            item["img"] = "./assets/products/" + local_name(url)
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(f.stat().st_size for f in OUT.glob("*.webp"))
    print("localised:", len(remote) - len(failed), "failed:", len(failed), "folder: %.1f MB" % (total / 1048576))
    for url in failed:
        print("  FAILED", url, "-", results[url][1])
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
