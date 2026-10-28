"""topics1~6.json(문항별 토픽 추출) → public/data/topics.json.
읽는 순서: norm → union-find 병합 → canonical 선택 → 출력.
같은 한글명 또는 같은 영문명이면 동일 토픽. 도메인은 다수결, 제목은 최빈값.
"""
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
rows = []
for i in range(1, 7):
    rows += json.loads((ROOT / "topicwork" / f"topics{i}.json").read_text(encoding="utf-8"))
questions = json.loads((ROOT.parent / "public/data/questions.json").read_text(encoding="utf-8"))
qids = {q["id"] for q in questions}
assert len(rows) == len(questions), (len(rows), len(questions))

GENERIC_EN = {"", "n/a", "none", "-", "etc"}


def norm_ko(title: str) -> str:
    t = re.sub(r"\([^)]*\)", "", title)          # 괄호 제거
    t = re.sub(r"[\s·\-_/,.'\"‘’“”]+", "", t).lower()
    return t


def norm_en(en: str) -> str:
    t = re.sub(r"\([^)]*\)", "", en)
    t = re.sub(r"[^a-z0-9+#]+", "", t.lower())
    return t


# union-find
parent = list(range(len(rows)))


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra


rules = json.loads((ROOT / "merge_rules.json").read_text(encoding="utf-8"))
NO_KO = set(rules["no_merge_ko"])
by_ko, by_en = {}, {}
for i, r in enumerate(rows):
    k = norm_ko(r["title"])
    if k and k not in NO_KO:
        if k in by_ko:
            union(by_ko[k], i)
        else:
            by_ko[k] = i
    e = norm_en(r.get("title_en", ""))
    if e and e not in GENERIC_EN and len(e) >= 3:
        if e in by_en:
            union(by_en[e], i)
        else:
            by_en[e] = i

# 수동 병합 규칙 (제목 문자열 기준)
title_idx = defaultdict(list)
for i, r in enumerate(rows):
    title_idx[r["title"]].append(i)
for a, b in rules["merge"]:
    if not title_idx.get(a) or not title_idx.get(b):
        print("merge rule miss:", a if not title_idx.get(a) else b)
        continue
    union(title_idx[a][0], title_idx[b][0])

groups = defaultdict(list)
for i in range(len(rows)):
    groups[find(i)].append(i)

topics = []
for members in groups.values():
    rs = [rows[i] for i in members]
    title = Counter(r["title"] for r in rs).most_common(1)[0][0]
    ens = [r["title_en"] for r in rs if r.get("title_en")]
    title_en = Counter(ens).most_common(1)[0][0] if ens else ""
    domain = Counter(r["domain"] for r in rs).most_common(1)[0][0]
    aliases = sorted({r["title"] for r in rs} - {title})
    tid = "t-" + hashlib.sha1((norm_ko(title) + "|" + norm_en(title_en)).encode()).hexdigest()[:8]
    topics.append({
        "id": tid, "title": title, "title_en": title_en, "domain": domain,
        "aliases": aliases,
        "question_ids": sorted((r["id"] for r in rs), key=lambda s: (-int(s.split("-")[0][1:]), s)),
        "subs": sorted({r["sub"] for r in rs if r.get("sub")}),
    })

# id 충돌 검사
ids = Counter(t["id"] for t in topics)
assert max(ids.values()) == 1, [k for k, v in ids.items() if v > 1]
assert all(q in qids for t in topics for q in t["question_ids"])

topics.sort(key=lambda t: (-len(t["question_ids"]), t["title"]))
out = ROOT.parent / "public/data/topics.json"
out.write_text(json.dumps(topics, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(ROOT / "out" / "topics.pretty.json").write_text(json.dumps(topics, ensure_ascii=False, indent=1), encoding="utf-8")

print("topics", len(topics), "questions", sum(len(t["question_ids"]) for t in topics))
print("domain", Counter(t["domain"] for t in topics))
print("multi-question topics", sum(1 for t in topics if len(t["question_ids"]) > 1))
print("with aliases", sum(1 for t in topics if t["aliases"]))
