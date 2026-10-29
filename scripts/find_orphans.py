"""답안 링크 중 키워드 정의가 없는 id 수집 → contentwork/orphans/batchN.json (보충 생성용).
읽는 순서: 정의된 id 수집 → 답안 링크 스캔 → 묶음 저장.
"""
import json, re, glob
from collections import defaultdict
from pathlib import Path
ROOT = Path(__file__).parent
LINK = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
defined = set()
for f in list(ROOT.glob("contentwork/keywords-*.json")) + list(ROOT.glob("contentwork/kw/*.json")):
    for k in json.loads(f.read_text(encoding="utf-8")):
        defined.add(k["id"].strip().lower())
alias = json.loads((ROOT / "contentwork/keyword_aliases.json").read_text(encoding="utf-8"))
defined |= set(alias)
need = defaultdict(lambda: {"labels": set(), "topics": set()})
titles = {t["id"]: t["title"] for t in json.loads((ROOT.parent / "public/data/topics.json").read_text(encoding="utf-8"))}
for f in ROOT.glob("content/*/*.json"):
    c = json.loads(f.read_text(encoding="utf-8"))
    for md in c["answers"].values():
        for kid, label in LINK.findall(md):
            kid = kid.strip().lower()
            if kid not in defined:
                need[kid]["labels"].add((label or kid).strip())
                need[kid]["topics"].add(titles.get(c["id"], c["id"]))
items = [{"id": k, "labels": sorted(v["labels"])[:3], "topics": sorted(v["topics"])[:3]} for k, v in sorted(need.items())]
out = ROOT / "contentwork/orphans"; out.mkdir(exist_ok=True)
for old in out.glob("batch*.json"): old.unlink()
size = 120
for i in range(0, len(items), size):
    (out / f"batch{i//size+1}.json").write_text(json.dumps(items[i:i+size], ensure_ascii=False, indent=0), encoding="utf-8")
print("orphan ids:", len(items), "batches:", (len(items) + size - 1) // size)
