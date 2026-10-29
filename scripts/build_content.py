"""content/{DOMAIN}/{topic}.json + contentwork/keywords-*.json → public/data/topics.json(answers 병합), keywords.json.
읽는 순서: load_keywords(중복 병합) → attach_answers → backlinks → 검증 → 저장.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT.parent / "public" / "data"
LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")

topics = json.loads((DATA / "topics.json").read_text(encoding="utf-8"))
by_id = {t["id"]: t for t in topics}

# 1. 키워드 병합: 같은 id → 긴 definition 유지, features/related 합집합
kw: dict[str, dict] = {}
for f in sorted(list((ROOT / "contentwork").glob("keywords-*.json")) + list((ROOT / "contentwork" / "kw").glob("*.json"))):
    for k in json.loads(f.read_text(encoding="utf-8")):
        kid = k["id"].strip().lower()
        cur = kw.get(kid)
        if not cur:
            kw[kid] = {"id": kid, "term": k["term"], "term_en": k.get("term_en", ""),
                       "definition": k["definition"], "features": list(k.get("features", [])),
                       "related": [r.lower() for r in k.get("related", [])], "topic_ids": []}
        else:
            if len(k["definition"]) > len(cur["definition"]):
                cur["definition"] = k["definition"]
                cur["term"], cur["term_en"] = k["term"], k.get("term_en", cur["term_en"])
            for ft in k.get("features", []):
                if ft not in cur["features"]:
                    cur["features"].append(ft)
            for r in k.get("related", []):
                if r.lower() not in cur["related"]:
                    cur["related"].append(r.lower())

# 1b. 동의어 통합: 영문명 또는 한글명이 같은 키워드 → id 하나로. 짧은 id 우선, 링크도 치환
def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9가-힣]+", "", (s or "").lower())

alias: dict[str, str] = {}
groups: dict[str, list[str]] = defaultdict(list)
for k in kw.values():
    for key in (("en:" + norm(k["term_en"])) if norm(k["term_en"]) else None, "ko:" + norm(k["term"])):
        if key and len(key) > 4:
            groups[key].append(k["id"])
rules = json.loads((ROOT / "keyword_rules.json").read_text(encoding="utf-8"))
NO_MERGE = {frozenset(p) for p in rules["no_merge"]}
parent = {k: k for k in kw}
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
for ids in groups.values():
    for other in ids[1:]:
        if frozenset((ids[0], other)) in NO_MERGE:
            continue
        ra, rb = find(ids[0]), find(other)
        if ra != rb:
            parent[rb] = ra
for a, b in rules["merge"].items():
    if a in kw and b in kw:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
clusters: dict[str, list[str]] = defaultdict(list)
for k in kw:
    clusters[find(k)].append(k)
for members in clusters.values():
    if len(members) < 2:
        continue
    forced = [m for m in members if m in rules["merge"].values()]
    canon = forced[0] if forced else min(members, key=lambda i: (len(i), i))
    base = kw[canon]
    for m in members:
        if m == canon:
            continue
        alias[m] = canon
        other = kw.pop(m)
        if len(other["definition"]) > len(base["definition"]):
            base["definition"] = other["definition"]
        for ft in other["features"]:
            if ft not in base["features"]:
                base["features"].append(ft)
        for r in other["related"]:
            if r not in base["related"]:
                base["related"].append(r)
for k in kw.values():
    k["related"] = [alias.get(r, r) for r in k["related"]]
for kid, term in rules["term_fix"].items():
    if kid in kw:
        kw[kid]["term"] = term
print(f"keyword aliases merged: {len(alias)}")
(ROOT / "contentwork" / "keyword_aliases.json").write_text(json.dumps(alias, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")

def rewrite_links(md: str) -> str:
    return re.sub(r"\[\[([^\]|]+)(\|[^\]]*)?\]\]",
                  lambda m: f"[[{alias.get(m.group(1).strip().lower(), m.group(1).strip().lower())}{m.group(2) or ''}]]", md)

# 2. 답안 부착
missing_links = defaultdict(set)
n_attached = 0
contents: dict[str, dict] = {}
for f in sorted((ROOT / "content").glob("*.json")):          # 도메인 묶음 파일
    for c in json.loads(f.read_text(encoding="utf-8")):
        contents[c["id"]] = c
for f in sorted((ROOT / "content").glob("*/*.json")):        # 토픽별 파일이 있으면 우선
    c = json.loads(f.read_text(encoding="utf-8"))
    contents[c["id"]] = c
for c in contents.values():
    t = by_id.get(c["id"])
    if not t:
        print("unknown topic", c["id"])
        continue
    t["answers"] = {k: rewrite_links(v) for k, v in c["answers"].items() if v}
    linked = set()
    for md in t["answers"].values():
        linked |= {m.lower() for m in LINK_RE.findall(md)}
    for kid in linked:
        if kid not in kw:
            missing_links[kid].add(t["title"])
    t["keywords"] = sorted(linked & kw.keys())
    n_attached += 1

# 3. 역링크 + related 정리(존재하는 id만, 자기 자신 제외)
for t in topics:
    for kid in t.get("keywords", []):
        kw[kid]["topic_ids"].append(t["id"])
for k in kw.values():
    k["related"] = [r for r in dict.fromkeys(k["related"]) if r in kw and r != k["id"]][:12]
    k["features"] = k["features"][:8]

# 4. 저장
(DATA / "topics.json").write_text(json.dumps(topics, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
keywords = sorted(kw.values(), key=lambda k: k["id"])
(DATA / "keywords.json").write_text(json.dumps(keywords, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print(f"topics with answers: {n_attached}, keywords: {len(keywords)}")
if missing_links:
    print(f"links without keyword entry: {len(missing_links)}")
    for kid, ts in sorted(missing_links.items())[:40]:
        print("  ", kid, "<-", ", ".join(sorted(ts))[:80])
    if "--strict" in sys.argv:
        sys.exit(1)


# 5. 지연 로딩용 분할: 목록·인덱스는 가볍게, 답안·위키 본문은 필요할 때만
def split_for_app():
    import shutil
    ans_dir = DATA / "answers"; kw_dir = DATA / "kw"
    for d in (ans_dir, kw_dir):
        shutil.rmtree(d, ignore_errors=True); d.mkdir()
    by_domain: dict[str, dict] = defaultdict(dict)
    meta = []
    for t in topics:
        a = t.get("answers")
        if a:
            by_domain[t["domain"]][t["id"]] = a
        m = {k: v for k, v in t.items() if k not in ("answers", "subs")}
        m["has_answer"] = bool(a)
        meta.append(m)
    for dom, ans in by_domain.items():
        (ans_dir / f"{dom}.json").write_text(json.dumps(ans, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "topics.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    index = [{"id": k["id"], "term": k["term"], "term_en": k["term_en"]} for k in keywords]
    (DATA / "keywords.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    shards: dict[str, dict] = defaultdict(dict)
    for k in keywords:
        shards[kw_shard(k["id"])][k["id"]] = {f: k[f] for f in ("definition", "features", "related")}
    for s, body in shards.items():
        (kw_dir / f"{s}.json").write_text(json.dumps(body, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"split: answers {len(by_domain)} files, keyword shards {len(shards)}")


def kw_shard(kid: str) -> str:
    c = kid[:1]
    return c if c.isalpha() else "0"


split_for_app()
