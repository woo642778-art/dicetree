# Progress: Random Dice 2 V4 IPA 데이터 완성 및 추천 경로 업그레이드

- Status: completed
- Milestone: 6/6 (100%)
- Updated: 2026-08-16T06:14:15
- Current work: 정적 IPA 재추출/semantic diff, 효과 텍스트 정규화, 선행 구매 경로 적용·취소, DPS 기준선, IPA 기반 덱 연구소 구현 완료. Python 15, Vitest 135, production build, Playwright 17 pass/3 intentional skip 및 데스크톱·모바일 스크린샷 검수 통과.

## Log
- 2026-08-16T05:51:49 | 1/6 | IPA SHA-256 일치 및 재추출 성공. 커밋 데이터와 semantic diff 0건. 결함 재현: 트리 설명 368개가 Unity rich-text/placeholder 포함, 추천은 노드 선택만 수행, 경로 적용/전체 취소 없음, 55개 중 45개는 기본공격 DPS 계산 가능하나 47개는 특수 메커니즘 때문에 실전 DPS가 비어 있음. IPA에는 최신 메타/랭킹 덱 기록 없음.
- 2026-08-16T05:56:37 | 2/6 | Unity rich text, mechanic tags, placeholders, raw valueType/source IDs를 사용자 문구로 정규화. Passive/rune 현재값과 랭크 증가값을 IPA 테이블에서 채우고 테스트 통과.
- 2026-08-16T05:56:37 | 3/6 | 선행 노드 전체를 위상 순서로 계산하는 route planner 구현. 경로 총비용/재화 부족/가상 적용/개별 취소/전체 계획 취소 추가. 추천 marginal simulation도 전체 경로를 적용하도록 수정.
- 2026-08-16T06:12:46 | 4/6 | DPS 빈칸 보강 완료. 실전 공식 미복원 시 검증 기본공격, LvAdd/UpAdd 예상, 트리 제외 기준선을 구분해 누적 피해와 처치시간까지 표시. 미검증 특수효과는 계속 제외.
- 2026-08-16T06:12:46 | 5/6 | 55개 IPA 주사위 설명과 기본 스탯 기반 덱 연구소 구현. 딜러/서포트/균형 및 무과금형/소과금형/고투자형 프리셋 제공. IPA에 랭킹/사용률이 없어 라이브 메타 미검증을 명시하고 현재 유행 덱으로 허위 표시하지 않음.
- 2026-08-16T06:14:15 | 6/6 | 정적 IPA 재추출/semantic diff, 효과 텍스트 정규화, 선행 구매 경로 적용·취소, DPS 기준선, IPA 기반 덱 연구소 구현 완료. Python 15, Vitest 135, production build, Playwright 17 pass/3 intentional skip 및 데스크톱·모바일 스크린샷 검수 통과.
