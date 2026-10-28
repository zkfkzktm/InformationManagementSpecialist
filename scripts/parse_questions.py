"""기출 PDF/HWP → questions.json 변환.
읽는 순서: extract_text → split_sessions → parse_questions → main.
산출물은 scripts/out/questions.raw.json, 이후 fix_questions.py로 보정.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "/mnt/user-data/uploads/정보관리기술사/정보관리기술사_기출문제")
OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)

# 머리말·꼬리말 제거 패턴
NOISE = [
    r"국가\s*기술\s*자격", r"기술사\s*제\s*\d+\s*회", r"^\s*기술사\s*$",
    r"^\s*분\s+정보", r"^\s*야\s+", r"▶", r"채점기준", r"청렴", r"합격을\s*기원",
    r"공익신고", r"^\s*정보관리기술사\s*$", r"^\s*정보통신\s+정보관리기술사\s*$",
    r"^\s*<표>\s*$", r"^\s*\d{4}\s*년도", r"^\s*분야\s*:", r"시험시간",
    r"^\s*\d\s*[-–]\s*\d\s*$",          # 꼬리말 1-1
    r"^\s*제\s*\d\s*교\s*[시사]\s*$",     # 교시 머리말(단독)
    r"국가기술 자격검정", r"국가가술자격", r"기술사\s*시험문제",
]
NOISE_RE = [re.compile(p) for p in NOISE]
SELECT_RE = re.compile(r"[※훌혔]?\s*(다음|총)\s*.*문제\s*중?\s*\d+\s*문제를?\s*선택")
SESSION_HDR_RE = re.compile(r"제\s*(\d)\s*교\s*[시사]")
FOOTER_RE = re.compile(r"^\s*(\d)\s*[-–]\s*(\d)\s*$")
# 문항 시작: "1." / "10 " / OCR 오류 "1l." "l1."
QNUM_RE = re.compile(r"^\s*([0-9lIO]{1,2})\s*[.．]\s*(.*)$")
QNUM_NODOT_RE = re.compile(r"^\s*([0-9lI]{1,2})\s{2,}(\S.*)$")


def extract_text(path: Path) -> str:
    """PDF/HWP → 텍스트. 반환 : 전체 문자열"""
    if path.suffix.lower() == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(path), "-"],
                              capture_output=True, text=True).stdout
    if path.suffix.lower() == ".hwp":
        out = subprocess.run(["hwp5txt", str(path)],
                             capture_output=True, text=True).stdout
        if out.strip():
            return out
        # HWP 3.0 → LibreOffice 폴백
        tmp = OUT / "hwp3"; tmp.mkdir(exist_ok=True)
        subprocess.run(["soffice", "--headless", "--convert-to",
                        "txt:Text (encoded):UTF8", "--outdir", str(tmp), str(path)],
                       capture_output=True, timeout=180)
        txt = tmp / (path.stem + ".txt")
        return txt.read_text(encoding="utf-8-sig") if txt.exists() else ""
    return ""


def ocr_digits(s: str) -> int:
    return int(s.replace("l", "1").replace("I", "1").replace("O", "0"))


def parse_round(text: str, rnd: int):
    """텍스트 → 문항 목록. 교시는 ※선택 문구·교시 머리말·번호 리셋으로 판정."""
    questions = []
    explicit = bool(SESSION_HDR_RE.search(text)) or len(SELECT_RE.findall(text)) >= 4
    session = 0
    cur = None          # {"number", "lines"}
    last_num = 0

    def flush():
        nonlocal cur
        if cur and cur["lines"]:
            body = " ".join(l.strip() for l in cur["lines"])
            body = re.sub(r"\s+", " ", body).strip()
            questions.append({"round": rnd, "session": session,
                              "number": cur["number"], "text": body})
        cur = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        m = SESSION_HDR_RE.search(line)
        if m and ("기술사" in line or len(line.strip()) < 30):
            # 머리말의 교시 표기 → 신뢰
            s = int(m.group(1))
            if s != session:
                flush(); session = s; last_num = 0
            continue
        if SELECT_RE.search(line):
            flush()
            if last_num != 0 or session == 0:
                session += 1
            last_num = 0
            continue
        if any(p.search(line) for p in NOISE_RE):
            continue
        indent = len(line) - len(line.lstrip())
        m = (QNUM_RE.match(line) or QNUM_NODOT_RE.match(line)) if indent <= 3 else None
        if m:
            try:
                n = ocr_digits(m.group(1))
            except ValueError:
                n = -1
            reset = (n == 1 and last_num >= 6 and not explicit)
            if n == last_num + 1 or reset:
                flush()
                if reset:
                    session += 1
                if session == 0:
                    session = 1
                cur = {"number": n, "lines": [m.group(2)]}
                last_num = n
                continue
        if cur is not None:
            cur["lines"].append(line)
    flush()
    return questions


def clean_text(t: str) -> str:
    """OCR·레이아웃 잔재 정리. 반환 : 정규화된 문항 텍스트"""
    t = t.replace("，", ",").replace("．", ".").replace("“", '"').replace("”", '"')
    t = t.replace("‘", "'").replace("’", "'").replace("–", "-")
    t = re.sub(r"\s+([,.)])", r"\1", t)        # 괄호·쉼표 앞 공백
    t = re.sub(r"\(\s+", "(", t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s*-\s*$", "", t)              # OCR 끝 하이픈
    return t.strip()


def main():
    all_q = []
    report = []
    files = sorted(SRC.glob("제*회_정보관리기술사.*"),
                   key=lambda p: int(re.search(r"제(\d+)회", p.name).group(1)))
    for f in files:
        rnd = int(re.search(r"제(\d+)회", f.name).group(1))
        manual = Path(__file__).parent / "manual" / f"r{rnd}.txt"   # 수기 전사 우선
        text = manual.read_text(encoding="utf-8") if manual.exists() else extract_text(f)
        if len(text.strip()) < 100:
            report.append((rnd, "NO_TEXT", {}))
            continue
        qs = parse_round(text, rnd)
        counts = {}
        for q in qs:
            counts[q["session"]] = counts.get(q["session"], 0) + 1
        ok = counts.get(1) == 13 and all(counts.get(s) == 6 for s in (2, 3, 4))
        report.append((rnd, "OK" if ok else "CHECK", counts))
        all_q.extend(qs)
    fixes = json.loads((Path(__file__).parent / "fixes.json").read_text(encoding="utf-8"))
    all_q.extend(fixes.get("add", []))
    all_q.sort(key=lambda q: (q["round"], q["session"], q["number"]))
    for q in all_q:
        q["id"] = f"r{q['round']}-s{q['session']}-q{q['number']:02d}"
        q["text"] = clean_text(fixes["replace"].get(q["id"], q["text"]))
    (OUT / "questions.raw.json").write_text(
        json.dumps(all_q, ensure_ascii=False, indent=1), encoding="utf-8")
    final = Path(__file__).parent.parent / "public" / "data" / "questions.json"
    final.parent.mkdir(parents=True, exist_ok=True)
    final.write_text(json.dumps(all_q, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for rnd, status, counts in report:
        print(f"{rnd:>4} {status:6} {counts}")
    print(f"total {len(all_q)}")


if __name__ == "__main__":
    main()
