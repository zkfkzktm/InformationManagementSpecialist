# 정보관리기술사

정보관리기술사 기출 토픽 랜덤 출제 + 모범답안(1교시형·서술형) + 키워드 위키 웹앱. 모바일·PC 브라우저.

## 사용하는 라이브러리

| 이름 | 하는 일 | 쓰는 곳 |
|---|---|---|
| Vite + React + TypeScript | 앱 빌드·UI | `src/` |
| Tailwind CSS 4 | 스타일 | `src/index.css` |
| react-router-dom (HashRouter) | 화면 이동. GitHub Pages 호환 | `src/App.tsx` |
| react-markdown + remark-gfm | 답안 Markdown 렌더 | `src/components/AnswerView.tsx` |
| mermaid (지연 로딩) | 구성도 렌더 | `src/components/Mermaid.tsx` |
| 브라우저 인쇄 (라이브러리 없음) | 토픽 답안 PDF 저장 | `src/components/PdfMenu.tsx`, `PrintSheet.tsx`, `index.css`의 `@media print` |
| @supabase/supabase-js | Google 로그인 + 진도 동기화 | `src/lib/supabase.ts`, `progress.ts` |

## 폴더 구조

| 경로 | 역할 |
|---|---|
| `public/data/questions.json` | 기출 문항 1,829개 (63~139회) |
| `public/data/topics.json` | 토픽 1,238개 메타 + 키워드 id (시작 시 로딩) |
| `public/data/answers/{도메인}.json` | 답안 본문 (해당 도메인 토픽을 열 때 로딩) |
| `public/data/keywords.json` | 키워드 7,260개 인덱스: id·한글·영문 (시작 시 로딩) |
| `public/data/kw/{첫글자}.json` | 키워드 위키 본문 (위키를 열 때 로딩) |
| `public/data/domains.json` | 도메인 8개 |
| `scripts/parse_questions.py` | 기출 PDF/HWP → questions.json |
| `scripts/merge_topics.py` | 문항별 토픽 추출 결과 → topics.json |
| `scripts/build_content.py` | 답안·키워드 생성물 병합 → topics·answers·keywords·kw 분할 저장 |
| `scripts/find_orphans.py` | 답안 링크 중 위키 설명이 없는 키워드 찾기 |
| `scripts/content/{도메인}.json` | 도메인별 답안 묶음 (생성물) |
| `scripts/content/{도메인}/{토픽id}.json` | 토픽별 답안 — 있으면 묶음보다 우선 (수정용) |
| `supabase/schema.sql` | 진도 테이블 + RLS |

## 실행

```bash
npm install
cp .env.example .env     # Supabase 값 입력 (없으면 로컬 저장 전용)
npm run dev
```

## 배포 (GitHub Pages)

| # | 절차 |
|---|---|
| 1 | 레포 Settings → Pages → Source: GitHub Actions |
| 2 | Settings → Secrets → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 |
| 3 | 레포 루트의 `deploy-workflow.yml`을 `.github/workflows/deploy.yml`로 이동 |
| 4 | main 푸시 → 자동 빌드·배포 |

## Supabase 설정

| # | 절차 |
|---|---|
| 1 | 프로젝트 생성 → SQL Editor에서 `supabase/schema.sql` 실행 |
| 2 | Authentication → Providers → Google 활성화 (GCP OAuth 클라이언트 ID/Secret) |
| 3 | Authentication → URL Configuration → Site URL·Redirect URLs에 배포 주소 등록 |
| 4 | Project Settings → API → URL·anon key를 `.env`/GitHub Secrets에 입력 |

## 데이터 재생성

| 단계 | 명령 | 입력 → 출력 |
|---|---|---|
| 기출 파싱 | `python3 scripts/parse_questions.py <기출 폴더>` | PDF/HWP → `questions.json` (99·101·102·105·107회는 `scripts/manual/` 수기 전사 사용) |
| 토픽 병합 | `python3 scripts/merge_topics.py` | `scripts/topicwork/topics*.json` + `scripts/merge_rules.json` → `topics.json` |
| 답안 병합 | `python3 scripts/build_content.py` | `scripts/content/*.json`, `scripts/contentwork/keywords-*.json`, `scripts/keyword_rules.json` → `public/data/` |

## 예정된 막힘

| 증상 | 원인 | 대처 |
|---|---|---|
| Google 로그인 후 빈 화면 | Supabase Redirect URL 미등록 | URL Configuration에 `https://<user>.github.io/<repo>/` 추가 |
| 구성도가 코드로 보임 | mermaid 문법 오류 | 해당 토픽 `scripts/content/` 파일 수정 후 `build_content.py` |
| 답안 불러오기 실패 | 네트워크 끊김 | 토픽 다시 열기 (도메인 묶음 1회만 받음) |
| PDF에 주소·날짜가 찍힘 | 브라우저 인쇄 머리글·바닥글 | 인쇄 창 → 설정 더보기 → 머리글과 바닥글 해제 |
