# 키워드 위키 도식·슈도코드 작성 가이드

정보관리기술사 수험용 키워드 위키에 넣을 **도식(mermaid)** 과 **슈도코드** 작성 규칙.

## 입력 · 출력

| 구분 | 경로 | 내용 |
|---|---|---|
| 입력 | `scripts/contentwork/kwviz/in/{NNN}.json` | 키워드 60개 배열: id·term·term_en·domain·definition·features·related(용어명)·topics(등장 토픽 제목) |
| 출력 | `scripts/contentwork/kwviz/out/{NNN}.json` | `{ "<키워드 id>": { "diagram": "<mermaid 코드>" \| null, "pseudocode": "<코드>" \| null } }` |

- 입력의 **모든 id**가 출력에 있어야 함
- 출력은 Python `json.dump(obj, f, ensure_ascii=False, indent=1)`로 저장 (손으로 JSON 쓰지 말 것)
- 이미 출력 파일이 있고 모든 id가 들어 있으면 그 청크는 건너뜀 (재시작용)
- 생성 완료 후 청크 파일은 `out/all.json` 하나로 합침. 개별 수정은 `fix/*.json`에 같은 형식으로 (생성물보다 우선)

## 도식 (diagram) — 기본은 모든 키워드에 작성

| 항목 | 규칙 |
|---|---|
| 목적 | 키워드의 핵심 **구조·절차·구성요소 관계·분류·비교**를 한눈에. 정의 문장을 상자에 옮겨 적기만 하는 도식 금지 |
| 내용 | definition·features와 모순 없게. 사실이 확실한 것만. 수험생이 답안지에 그대로 옮겨 그릴 수 있는 수준 |
| 생략(null) | 그릴 구조가 정말 없는 경우만 (단일 수치·단순 명칭 등). 전체의 3% 이하 |
| 크기 | 노드 3~10개 (최대 12). 라벨 20자 이내, 한국어 우선 + 영문 약어 허용 |
| 방향 | 일렬 4개 이하 → `flowchart LR`. 그보다 길거나 계층·subgraph 있으면 `flowchart TB` |
| 종류 | `flowchart` (기본) · `sequenceDiagram` (프로토콜·메시지 교환) · `stateDiagram-v2` (상태 전이) · `classDiagram` (객체지향 패턴·클래스 구조만). 그 외 종류 금지 |

### 문법 안전 규칙 (어기면 그려지지 않음)

| 대상 | 규칙 |
|---|---|
| 노드 | id는 영문·숫자만 (`A`, `B1`, `n3`), 라벨은 항상 큰따옴표: `A["캐시 적중"]` / 모양: `A(["..."])`, `A{"..."}`, `A[("...")]` |
| 금지 id | `end`, `graph`, `subgraph`, `style`, `class`, `click`, `default`, `call`, `Title` |
| 라벨 안 | `"` 금지(대신 ' 또는 「」), `;` 금지, `#` 금지, `<br>`·마크다운 금지. 괄호·콜론·가운뎃점(·)은 따옴표 안이면 가능 |
| 간선 라벨 | `A -->|"요청"| B` 처럼 따옴표. 점선 `-.->`, 굵은선 `==>` |
| subgraph | `subgraph S1["라벨"]` … `end`. subgraph id도 영문 |
| sequenceDiagram | `participant C as 클라이언트` (id 영문). 메시지 `C->>S: SYN` / 응답 `S-->>C: SYN+ACK`. 메시지 안 `;` `#` 금지. `Note over C,S: 설명` — 노트·메시지 글자 25자 이내. 참여자 5명 이내 (휴대폰 폭) |
| stateDiagram-v2 | 상태는 `state "대기" as S1` 로 선언 후 `[*] --> S1`, `S1 --> S2: 이벤트`. 한글을 상태 id로 쓰지 말 것 |
| classDiagram | 클래스명 영문. 멤버 `+operation()`, 관계 `A <|-- B`, `A *-- B`, `A o-- B`, `A ..> B` |
| 공통 | `%%{init}%%`·frontmatter·style·classDef·click 금지 (앱이 테마 지정). 줄 끝 `;` 금지 |

## 슈도코드 (pseudocode) — 필요한 키워드에만

| 항목 | 규칙 |
|---|---|
| 대상 | 알고리즘·절차를 코드로 볼 때 이해가 빨라지는 것: 정렬·탐색·그래프(Dijkstra 등)·스케줄링·페이지 교체·교착상태(은행원)·동기화(세마포어·Peterson)·해시·암호 알고리즘 절차(RSA 키 생성 등)·합의(Raft)·ML 알고리즘(k-means·경사하강·역전파)·DB 기법(2PL·타임스탬프 순서·체크포인트)·네트워크 제어(토큰 버킷·지수 백오프)·디자인 패턴 골격(Singleton·Observer 등)·자료구조 연산 |
| 제외 | 개념·정책·법제도·표준·조직·방법론·지표 등 코드가 의미 없는 것 → `null` |
| 비율 | 전체 10~20% 내외 예상. 억지로 만들지 말 것 |
| 형식 | Python 비슷한 문법, 들여쓰기 4칸, 6~25줄. 함수·변수명 영문, 주석은 `# 한국어`. 실제 라이브러리 호출 금지, 핵심 로직만 |
| 줄 길이 | 한 줄 60자 이내 (휴대폰에서 가로 스크롤 최소화). 주석은 코드 뒤 2칸 띄우고 바로, 또는 윗줄에 단독 — 오른쪽 끝 열 맞춤 금지 |
| 검증 | 핵심 알고리즘은 작은 입력으로 실제 실행해 결과 확인 권장 |
| 정확성 | 동작이 실제 알고리즘과 같아야 함 (경계 조건·종료 조건 포함). 확신 없으면 null |

## 보안 공격 키워드 (SQL 인젝션·버퍼 오버플로·Spectre·봇넷·피싱 등)

| 항목 | 규칙 |
|---|---|
| 도식 | 수험서 수준의 **개념도**: 공격 원리 개요(공격자·취약 지점·영향의 관계) + **탐지·대응 방안**을 함께. 예: "입력값 → 쿼리 결합 → 의도 외 실행 → 정보 유출" 옆에 "Prepared Statement·입력 검증·WAF" |
| 금지 | 실제 페이로드 문자열, 익스플로잇 코드, 탐지 우회 요령, 실행 가능한 단계별 공격 절차 |
| 슈도코드 | 공격 기법에는 null. 방어 알고리즘(입력 검증, 레이트 리미팅, 서명 검증 등)은 작성 가능 |
| 중단 금지 | 위 기준으로 모든 키워드를 끝까지 작성. 판단이 어려우면 방어 관점 개념도로 |

## 예시

```json
{
 "lru": {
  "diagram": "flowchart LR\n  R[\"페이지 참조\"] --> H{\"적중?\"}\n  H -->|\"예\"| M[\"맨 앞(MRU)으로 이동\"]\n  H -->|\"아니오\"| F{\"프레임 여유?\"}\n  F -->|\"예\"| L[\"적재 후 맨 앞\"]\n  F -->|\"아니오\"| V[\"맨 뒤(LRU) 교체\"]\n  V --> L",
  "pseudocode": "def access(page, frames, capacity):\n    if page in frames:  # 적중\n        frames.remove(page)\n        frames.insert(0, page)  # 가장 최근 사용 위치로\n        return 'hit'\n    if len(frames) == capacity:  # 부재 + 프레임 가득\n        frames.pop()  # 가장 오래전 사용(LRU) 제거\n    frames.insert(0, page)\n    return 'fault'"
 },
 "tcp-3-way-handshake": {
  "diagram": "sequenceDiagram\n  participant C as 클라이언트\n  participant S as 서버\n  C->>S: SYN (seq=x)\n  S-->>C: SYN+ACK (seq=y, ack=x+1)\n  C->>S: ACK (ack=y+1)\n  Note over C,S: ESTABLISHED",
  "pseudocode": null
 },
 "data-governance": {
  "diagram": "flowchart TB\n  subgraph P[\"원칙\"]\n    P1[\"데이터 표준\"]\n    P2[\"품질 기준\"]\n    P3[\"보안·개인정보\"]\n  end\n  subgraph O[\"조직\"]\n    O1[\"데이터 오너\"]\n    O2[\"데이터 스튜어드\"]\n  end\n  subgraph R[\"프로세스\"]\n    R1[\"관리 절차\"]\n    R2[\"모니터링·개선\"]\n  end\n  P --> O --> R --> P",
  "pseudocode": null
 }
}
```
