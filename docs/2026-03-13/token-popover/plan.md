# 토큰 배지 클릭 시 비용 계산 팝오버

## 변경 파일별 상세
### `public/index.html`

#### 1. CSS: 팝오버 스타일 + 배지 cursor (라인 665)
- **변경 이유**: 네이티브 tooltip → 클릭 팝오버로 전환. cursor:pointer + hover 효과 + 팝오버 스타일 추가.
- **Before**:
```css
.proxy-token-pill {
  padding: 6px 12px; font-size: 11px; color: var(--dim);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
  display: flex; gap: 8px; align-items: center;
}
```
- **After**: `position: relative` 추가 + `.proxy-token-pill[data-cost]` cursor/hover + `.token-popover` 스타일

#### 2. JS: title → data-cost (라인 3046-3062)
- **변경 이유**: title 속성 제거, 계산 데이터를 JSON으로 data-cost에 저장
- **Before**: `title="${tooltip}"` 속성
- **After**: `data-cost='${popData}'` 속성

#### 3. JS: 전역 클릭 핸들러 추가
- **변경 이유**: 배지 클릭 시 팝오버 생성, 바깥 클릭 시 닫힘, 복사 버튼
- **영향 범위**: 토큰 배지만

## 검증
- `pkill -x "Electron" 2>/dev/null; npm start &`
- 배지 클릭 → 팝오버, 복사 → 클립보드, 바깥 클릭 → 닫힘
