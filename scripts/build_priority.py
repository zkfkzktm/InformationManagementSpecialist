"""대표 토픽(우선 학습) 선정: public/data/questions.json + topics.json → public/data/priority.json

등급
- S 필수: 서로 다른 회차 3회 이상 출제 + 최근 30회차 안에 출제
- A 중요: 2회 출제 + 최근 20회차 안에 출제, 또는 3회 이상이지만 30회차 넘게 안 나온 고전 토픽
- T 최신: 1회 출제, 최근 6회차(약 2년) 안에 처음 나온 토픽

등급 안 순서 = 점수 내림차순. 점수 = Σ(문항별 최근성 가중치 × 교시 가중치)
- 최근성: 0.5 ** ((마지막 회차 - 출제 회차) / 20)  → 20회차(약 7년) 전 출제는 절반
- 교시: 1교시 1.0, 2~4교시(서술형) 1.3

수동 조정: scripts/priority_rules.json  {"S": [토픽id], "A": [...], "T": [...], "exclude": [...]}
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "public" / "data"
HALF_LIFE = 20
LONG_WEIGHT = 1.3
S_MIN, S_RECENT = 3, 30
A_RECENT = 20
T_RECENT = 6

questions = {q["id"]: q for q in json.loads((DATA / "questions.json").read_text(encoding="utf-8"))}
topics = json.loads((DATA / "topics.json").read_text(encoding="utf-8"))
last_round = max(q["round"] for q in questions.values())
rounds = sorted({q["round"] for q in questions.values()})

rules_path = ROOT / "priority_rules.json"
rules = json.loads(rules_path.read_text(encoding="utf-8")) if rules_path.exists() else {}
forced = {tid: tier for tier in ("S", "A", "T") for tid in rules.get(tier, [])}
excluded = set(rules.get("exclude", []))


def score(qs):
    return sum(0.5 ** ((last_round - q["round"]) / HALF_LIFE) * (1.0 if q["session"] == 1 else LONG_WEIGHT) for q in qs)


tiers = {"S": [], "A": [], "T": []}
for t in topics:
    if t["id"] in excluded:
        continue
    qs = [questions[i] for i in t["question_ids"] if i in questions]
    if not qs:
        continue
    n = len({q["round"] for q in qs})  # 같은 회차 중복은 1회
    last = max(q["round"] for q in qs)
    tier = forced.get(t["id"])
    if not tier:
        if n >= S_MIN and last > last_round - S_RECENT:
            tier = "S"
        elif (n == 2 and last > last_round - A_RECENT) or n >= S_MIN:
            tier = "A"
        elif n == 1 and last > last_round - T_RECENT:
            tier = "T"
    if tier:
        tiers[tier].append((round(score(qs), 3), last, t["title"], t["id"]))

out = {
    "last_round": last_round,
    "rounds": len(rounds),
    "questions": len(questions),
    "tiers": {k: [x[3] for x in sorted(v, key=lambda x: (-x[0], -x[1], x[2]))] for k, v in tiers.items()},
}
(DATA / "priority.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"priority: 필수 {len(tiers['S'])}, 중요 {len(tiers['A'])}, 최신 {len(tiers['T'])} (기준 {last_round}회)")
