# Rebuilds assets/catalog.json from the product-knowledge database (04_Product_Catalog/catalog.db).
# Usage:  python tools/build_catalog.py <catalog.db> assets/catalog.json <report.txt>
# Notes:  unverified machine classifications/normalisations are marked as such in the UI; no prices are exported.
import sqlite3, sys, json, re, html, collections
db, out, report = sys.argv[1], sys.argv[2], sys.argv[3]
con = sqlite3.connect("file:" + db + "?mode=ro", uri=True); con.row_factory = sqlite3.Row
cur = con.cursor()
latest = cur.execute("select max(rule_version) from attribute_normalizations").fetchone()[0]
labels = {r["source_key"]: r["source_label"] for r in cur.execute("select source_key, source_label from source_instances")}
sectors = {r["category_id"]: r["category_name"] for r in cur.execute("select category_id, category_name from sector_categories where category_id != 'SECTOR-ROOT'")}
attrs = collections.defaultdict(list)
q = """select ao.record_version_id rv, an.canonical_name_fa name, an.normalized_value val, an.normalized_unit unit, an.status status
       from attribute_normalizations an join attribute_observations ao on ao.attribute_observation_id = an.attribute_observation_id
       where an.rule_version = ? and an.canonical_name_fa is not null"""
for r in cur.execute(q, (latest,)):
    if r["status"] == "نیازمند بازبینی مقدار":   # value not trustworthy, leave it out
        continue
    attrs[r["rv"]].append((r["name"], r["val"], r["unit"]))

def clean(text, limit=260):
    if not text: return ""
    t = re.sub(r"<[^>]+>", " ", str(text)); t = html.unescape(t)
    t = t.replace("\\r\\n", " ").replace("\\n", " ").replace("\r", " ").replace("\n", " ")
    t = re.sub(r"\s+", " ", t).strip()
    return (t[:limit].rsplit(" ", 1)[0] + "…") if len(t) > limit else t

def field(mf, *headers):
    for f in mf:
        if f.get("header") in headers and f.get("value") not in (None, "", []):
            return str(f["value"])
    return ""

def https(u):
    u = (u or "").strip().split(",")[0].split(" ")[0].strip()
    if u.startswith("http://"): u = "https://" + u[7:]
    return u if u.startswith("https://") else ""

KEEP = ["برند", "مدل", "توان مصرفی", "برق: ولتاژ/فرکانس", "ظرفیت یا اندازه (نیازمند تفکیک)", "نوع سوخت", "نوع انرژی", "جنس", "رنگ", "کشور سازنده"]
DIM = {"طول": "l", "عرض": "w", "ارتفاع یا عمق": "h"}
items = []
rows = cur.execute("""select sr.source_key sk, sr.source_record_id sid, sr.source_identifier_raw ident, rv.record_version_id rvid, rv.name_raw name, rv.category_raw cat,
                      rv.description_raw descr, rv.mapped_fields_json mf, rc.group_name grp, rc.category_name cat2, rc.sectors_json sec
                      from source_records sr join record_versions rv on rv.source_record_id = sr.source_record_id
                      left join record_classifications rc on rc.source_record_id = sr.source_record_id order by sr.source_key, rv.source_row_number""").fetchall()
for r in rows:
    try: mf = json.loads(r["mf"])
    except Exception: mf = []
    name = (r["name"] or field(mf, "نام", "نام محصول")).strip()
    if not name: continue
    code = field(mf, "کد کالا")
    img = https(field(mf, "تصاویر", "تصویر اصلی URL"))
    url = https(field(mf, "لینک محصول"))
    short = clean(field(mf, "توضیح کوتاه"), 200)
    desc = clean(r["descr"] or field(mf, "توضیحات"), 260)
    specs = {}; dims = {}; weight = None
    for n, v, u in attrs.get(r["rvid"], []):
        if n in DIM and u == "mm":
            try: dims[DIM[n]] = round(float(v) / 10, 1)
            except Exception: pass
        elif n == "وزن" and u == "kg":
            try: weight = round(float(v), 1)
            except Exception: pass
        elif n == "کد محصول" and not code:
            code = str(v)
        elif n in KEEP and n not in specs:
            val = str(v).strip()
            if val and len(val) <= 60:
                specs[n] = (val + (" " + u if u else "")).strip()
    if "برند" not in specs: specs.pop("مدل", None) if False else None
    try: sec = [sectors[s] for s in json.loads(r["sec"] or "[]") if s in sectors]
    except Exception: sec = []
    items.append({
        "id": r["sk"] + ":" + str(r["ident"] or r["sid"]), "src": r["sk"], "name": name, "code": code,
        "grp": r["grp"] or "", "cat": r["cat2"] or "", "sec": sec,
        "img": img, "url": url, "desc": short or desc,
        "dims": dims or None, "wt": weight, "specs": [[k, specs[k]] for k in KEEP if k in specs]
    })
out_obj = {"generated": "2026-10-13", "note": "دسته‌بندی صنفی و مشخصات نرمال‌شده ماشینی و تأییدنشده‌اند.", "sources": [{"key": k, "label": v} for k, v in labels.items()],
           "groups": sorted({i["grp"] for i in items if i["grp"]}), "sectors": sorted(sectors.values()), "items": items}
with open(out, "w", encoding="utf-8") as f: json.dump(out_obj, f, ensure_ascii=False, separators=(",", ":"))
with open(report, "w", encoding="utf-8") as f:
    f.write(f"rule_version={latest}\nitems={len(items)}\n")
    f.write("per source: " + str(collections.Counter(i['src'] for i in items)) + "\n")
    f.write("with img: %d, with url: %d, with code: %d, with dims: %d, with weight: %d, with specs>0: %d\n" % (sum(1 for i in items if i['img']), sum(1 for i in items if i['url']), sum(1 for i in items if i['code']), sum(1 for i in items if i['dims']), sum(1 for i in items if i['wt']), sum(1 for i in items if i['specs'])))
    f.write("groups: %s\n" % out_obj['groups'])
    f.write("sample: " + json.dumps(items[0], ensure_ascii=False)[:700] + "\n")
    f.write("sample torbo: " + json.dumps(next(i for i in items if i['src']=='torbo-max'), ensure_ascii=False)[:700] + "\n")