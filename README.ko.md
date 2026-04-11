<div align="center">

# Claude Inspector

**Claude Code가 API에 실제로 무엇을 보내는지 확인하세요.**

Claude Code CLI 트래픽을 실시간으로 인터셉트하는 MITM 프록시.  
모든 요청의 JSON 페이로드를 들여다보고, AI가 세션 흐름을 분석해줍니다.

[설치](#설치) · [사용법](#프록시-모드) · [AI Analysis](#ai-analysis) · [배울 것들](#배울-수-있는-것들)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/kangraemin/claude-inspector)](https://github.com/kangraemin/claude-inspector/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20x64-black)](https://github.com/kangraemin/claude-inspector/releases/latest)

[English](README.md) | **한국어**

</div>

---

<p align="center">
  <img src="public/screenshots/ko-1.png" width="100%" alt="Proxy — Anatomy 뷰" />
</p>

<p align="center">
  <img src="public/screenshots/ko-2.png" width="100%" alt="Proxy — Request 뷰 (비용 분석)" />
</p>

<p align="center">
  <img src="public/screenshots/ko-3.png" width="100%" alt="Proxy — AI Analysis 뷰" />
</p>

---

## 설치

### Homebrew (권장)

```bash
brew install --cask kangraemin/tap/claude-inspector && sleep 2 && open -a "Claude Inspector"
```

### 직접 다운로드

[Releases](https://github.com/kangraemin/claude-inspector/releases/latest) 페이지에서 `.dmg` 다운로드.

| Mac (Apple Silicon) | Mac (Intel) |
|---|---|
| [Claude-Inspector-arm64.dmg](https://github.com/kangraemin/claude-inspector/releases/latest) | [Claude-Inspector-x64.dmg](https://github.com/kangraemin/claude-inspector/releases/latest) |

### 업그레이드 / 삭제

```bash
# 업그레이드
brew update && brew upgrade --cask claude-inspector && sleep 2 && open -a "Claude Inspector"

# 삭제
brew uninstall --cask claude-inspector
```

---

## 프록시 모드

로컬 MITM 프록시로 **실제** Claude Code CLI 트래픽을 인터셉트합니다.

```
Claude Code CLI  →  Inspector (localhost:9090)  →  api.anthropic.com
```

**1.** 앱에서 **Start Proxy** 클릭  
**2.** 프록시를 통해 Claude Code 실행:

```bash
ANTHROPIC_BASE_URL=http://localhost:9090 claude
```

**3.** 모든 API 요청/응답이 실시간으로 캡처됩니다.

### 4개 탭

| 탭 | 보여주는 것 |
|-----|------------|
| **AI Analysis** | AI 세션 분석 — 흐름 요약, Mermaid 다이어그램, 인라인 채팅 |
| **Request** | 전체 JSON 요청 바디, 접이식 트리, 토큰/비용 분석 |
| **Response** | 전체 JSON 응답, tool_use 결과 |
| **Anatomy** | 감지된 메커니즘 (CLAUDE.md, Skill, MCP, Sub-agent) 칩 표시 |

---

## AI Analysis

캡처한 요청들을 선택하면 Claude (Sonnet)가 세션 흐름 전체를 분석합니다.

### 분석 결과

- **단계별 세션 요약** — 무슨 일이 어떤 순서로 일어났는지, 메커니즘 설명 포함
- **MCP 동적 로딩 체인** — ToolSearch가 스키마를 가져오는 과정, 지연 로드 흐름
- **Skill 로딩 흐름** — 슬래시 커맨드 → `<command-message>` → Skill `tool_use` 경로
- **Sub-agent 패턴** — 어느 요청이 메인인지 서브 에이전트인지, 상호 관계
- **Mermaid 플로우차트** — 내부 메커니즘 흐름 시각 다이어그램
- **클릭 가능한 참조** — 각 단계에서 해당 Request의 `tool_use`로 바로 이동

### 사용법

1. 프록시로 요청 캡처
2. **AI Analysis** 탭 클릭
3. 분석할 요청 선택 (클릭으로 토글, Shift+클릭으로 범위 선택)
4. **Analyze Session Flow** 클릭
5. Claude가 실시간 스트리밍으로 처리하는 것을 확인
6. **Request #N** 배지를 클릭하면 해당 요청의 `tool_use`로 스크롤

### 인라인 채팅

분석 완료 후 세션에 대해 Claude에게 추가 질문을 할 수 있습니다. 전체 분석 컨텍스트를 이해한 상태로 답변합니다.

### 세션 감지

메시지 내용 핑거프린팅으로 요청들을 세션별로 자동 그룹화합니다. 메인 대화, 서브 에이전트, stop hook 등 다른 세션은 사이드바에서 다른 색 테두리로 표시됩니다.

---

## 배울 수 있는 것들

아래는 **실제 캡처된 트래픽**에서 발견한 것들입니다.

### 1. CLAUDE.md는 매 요청마다 주입된다

`hello`를 입력하면 Claude Code는 메시지 앞에 **~12KB**를 자동으로 추가합니다:

| 블록 | 내용 | 크기 |
|------|------|------|
| `content[0]` | 사용 가능한 스킬 목록 | ~2KB |
| `content[1]` | CLAUDE.md + rules + memory | **~10KB** |
| `content[2]` | 실제로 입력한 내용 | 수 바이트 |

**주입 순서:** 글로벌 CLAUDE.md → 글로벌 rules → 프로젝트 CLAUDE.md → Memory

이 ~12KB 페이로드는 **매 요청마다** 재전송됩니다. 500줄짜리 CLAUDE.md는 모든 API 호출에서 조용히 토큰을 소모합니다.

### 2. MCP 도구는 지연 로드된다 — `tools[]`가 늘어나는 것을 확인하세요

빌트인 도구(27개)는 매 요청마다 전체 JSON 스키마를 전송합니다. MCP 도구는 처음에 **이름만** 존재합니다.

| 단계 | 발생하는 일 | `tools[]` 개수 |
|------|------------|---------------|
| 초기 요청 | 27개 빌트인 도구 로드 | **27** |
| 모델이 `ToolSearch("context7")` 호출 | 2개 MCP 도구 전체 스키마 반환 | **29** |
| 모델이 `ToolSearch("til")` 호출 | 6개 MCP 도구 스키마 추가 | **35** |

사용하지 않는 MCP 도구는 토큰을 소비하지 않습니다. Inspector로 모델이 필요한 도구를 발견할 때 `tools[]`가 늘어나는 것을 확인할 수 있습니다.

### 3. 이미지는 base64로 인라인 인코딩된다

Claude Code가 스크린샷이나 이미지 파일을 읽으면 **base64로 인코딩되어 JSON 본문에 직접 포함**됩니다:

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/png",
    "data": "iVBORw0KGgo..."
  }
}
```

스크린샷 하나가 요청 페이로드에 **수백 KB**를 추가할 수 있습니다.

### 4. Skill ≠ Command — 완전히 다른 주입 경로

`/something`을 입력하면 세 가지 완전히 다른 메커니즘 중 하나가 작동합니다:

| | 로컬 커맨드 | 사용자 스킬 | 어시스턴트 스킬 |
|---|---|---|---|
| **예시** | `/mcp`, `/clear` | `/commit` | `Skill("finish")` |
| **트리거** | 사용자 | 사용자 | 모델 |
| **주입** | `<local-command-stdout>` | user msg에 전체 프롬프트 | `tool_use` → `tool_result` |
| **모델에 전달** | 결과만 | 전체 프롬프트 | 전체 프롬프트 |

**커맨드**는 로컬에서 실행되어 결과만 전달합니다. **스킬**은 프롬프트 전체를 주입하며 세션이 끝날 때까지 이후 모든 요청에 남습니다.

### 5. 이전 메시지가 계속 쌓인다 — `/clear`를 자주 사용하세요

Claude Code는 매 요청마다 `messages[]` 배열 **전체**를 재전송합니다:

| 턴 수 | 대략적인 누적 전송량 |
|-------|---------------------|
| 1 | ~15KB |
| 10 | ~200KB |
| 30 | ~1MB+ |

대부분은 더 이상 필요 없는 이전 대화입니다. `/clear`를 실행하면 컨텍스트가 초기화되고 누적된 무게가 사라집니다.

### 6. 서브 에이전트는 완전히 격리된 컨텍스트에서 실행된다

Claude Code가 서브 에이전트를 생성하면(`Agent` 도구), **완전히 별도의 API 호출**이 만들어집니다:

| | 부모 API 호출 | 서브 에이전트 API 호출 |
|---|---|---|
| **`messages[]`** | 전체 대화 이력 | 작업 프롬프트만 — **부모 이력 없음** |
| **CLAUDE.md** | 포함됨 | 포함됨 (독립적으로) |
| **tools[]** | 로드된 모든 도구 | 새로운 세트 |
| **컨텍스트** | 누적됨 | 0에서 시작 |

Inspector는 부모와 서브 에이전트 호출을 모두 캡처하고, AI Analysis가 자동으로 감지해서 레이블링합니다.

---

## 개발 환경

```bash
git clone https://github.com/kangraemin/claude-inspector.git
cd claude-inspector
npm install
npm start          # 개발 모드
npm run test:unit  # 유닛 테스트
npm run test:e2e   # E2E 테스트 (Playwright)
```

## 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **Electron** | 데스크탑 셸, IPC | 네이티브 macOS 타이틀바, 코드 서명 + 공증된 DMG |
| **Vanilla JS** | 프레임워크 없음 | 전체 UI가 단일 `index.html` — 번들러 없음, React 없음 |
| **Node `http`/`https`** | MITM 프록시 | Claude Code ↔ API 트래픽 인터셉트, SSE 스트림 재조립 |
| **Mermaid.js** | 플로우차트 렌더링 | AI Analysis 메커니즘 다이어그램 |
| **claude -p** | AI 분석 엔진 | 세션 흐름 분석 + 인라인 채팅 (Claude Sonnet) |

> **프라이버시**: 모든 트래픽은 `localhost`에서만 처리됩니다. AI Analysis는 로컬에서 `claude -p` (사용자 본인의 Claude Code CLI)로 실행됩니다.

## 라이선스

MIT
