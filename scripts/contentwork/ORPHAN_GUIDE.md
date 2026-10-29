# 키워드 위키 보충 생성 가이드

입력: `contentwork/orphans/batchN.json` — `[{id, labels[], topics[]}]`
- `id`: 답안에서 이미 링크로 쓰인 키워드 id (**절대 바꾸지 말 것**)
- `labels`: 답안에 표시된 문구, `topics`: 이 키워드가 등장한 토픽

출력: `contentwork/kw/orphan-batchN.json` — 입력과 같은 개수·순서의 배열

```json
{"id":"입력 id 그대로","term":"한글 용어(약어)","term_en":"영문 정식 명칭","definition":"1~2문장 정의","features":["핵심 특징 3~4개, 각 한 줄"],"related":["관련 키워드 id 0~4개"]}
```

| 규칙 | 내용 |
|---|---|
| 정확성 | 정보관리기술사 수준. 불확실한 수치·연도·조항은 생략 |
| 문체 | 명사형 종결, 짧게 |
| related | `contentwork/keyword_index.txt`를 grep해서 실제 있는 id 또는 이 배치 안의 id만. 파일 전체 Read 금지 |
| 저장 | 40개 단위로 나눠 작성해도 되지만 최종 파일은 하나. 임시 파일은 /tmp/{배치명}/ 에만 |

검증(python3 한 번): 유효 JSON, 개수 일치, 모든 id가 입력과 동일, definition·features 비어있지 않음. 결과만 2줄 보고.
