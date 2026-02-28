# Claude Inspector

Claude Code의 5가지 프롬프트 증강 메커니즘이 실제로 어떤 API 페이로드를 생성하는지 **시뮬레이션**하고, Claude Code CLI의 실제 트래픽을 **프록시로 가로채** 실시간 분석하는 Electron 데스크탑 앱.

## 두 가지 모드

### Simulator Mode

5가지 프롬프트 메커니즘의 API 페이로드를 직접 구성하고 Claude에 전송해 볼 수 있습니다.

| 메커니즘 | 주입 위치 | 활성화 방식 | 직접 전송 |
|---|---|---|---|
| **CLAUDE.md** | `messages[].content` → `<system-reminder>` | 자동 (파일 존재 시) | ✅ |
| **Output Style** | `system[]` 추가 블록 | `/output-style` 명령 | ✅ |
| **Slash Command** | `messages[].content` → `<command-message>` | 사용자 명시적 호출 | ✅ |
| **Skill** | `tool_result` (Skill `tool_use` 후) | 모델이 자율 결정 | 🔍 Inspect Only |
| **Sub-Agent** | 격리된 별도 API 호출 | Task 도구 위임 | 🔍 Inspect Only |

**주요 기능:**
- 왼쪽 Configuration 패널에서 값 입력 → 오른쪽 Payload 패널에 실시간 JSON 반영
- **Send to Claude** — Anthropic API Key를 입력하면 실제 API 호출 후 응답 확인
- **Export** — 구성한 페이로드를 cURL / Python / TypeScript 코드로 내보내기
- **History** — 세션 내 최근 10개 요청 히스토리 저장 및 복원
- 모델 선택 (Sonnet 4.6 / Opus 4.6 / Haiku 4.5)

### Proxy Mode

Claude Code CLI의 실제 API 트래픽을 MITM 프록시로 인터셉트하여 실시간 시각화합니다.

```
Claude Code CLI  →  Claude Inspector (localhost:9090)  →  api.anthropic.com
```

**주요 기능:**
- **Messages** 탭 — `messages[]` 배열을 역할별(system/user/assistant/tool)로 펼쳐 보기, 검색 (Cmd+F), 필터링
- **Request / Response** 탭 — raw JSON 페이로드 전체 확인
- **Analysis** 탭 — 캡처된 요청에서 5가지 메커니즘 자동 감지 및 설명 표시
- SSE 스트리밍 응답 자동 파싱 및 재조립

**사용법:**
1. Proxy Mode에서 포트 설정 후 **Start Proxy** 클릭
2. 표시된 명령어를 복사하여 별도 터미널에서 Claude Code 실행:
   ```bash
   ANTHROPIC_BASE_URL=http://localhost:9090 claude
   ```
3. Claude Code 사용 → Inspector에 실시간으로 요청/응답 캡처

## 설치 및 실행

```bash
git clone https://github.com/kangraemin/claude-inspector.git
cd claude-inspector
npm install
npm start          # Electron 데스크탑 앱
npm run dev        # 개발 모드 (logging 포함)
```

### 배포용 빌드

```bash
npm run dist       # release/ 폴더에 .dmg / .exe 생성
npm run dist:mac   # macOS (arm64 + x64)
npm run dist:win   # Windows (NSIS)
```

## 기술 스택

- **Electron** — 크로스 플랫폼 데스크탑 (macOS hiddenInset 타이틀바)
- **@anthropic-ai/sdk** — Anthropic API 호출 (main process IPC)
- **Vanilla JS** — 프레임워크 없음, 빌드 스텝 없음
- **highlight.js** + **marked** — JSON 하이라이팅 & 마크다운 렌더링
- **Node http/https** — MITM 프록시 서버

## 참고

이 프로젝트는 [Reverse Engineering Claude Code](https://) 아티클을 기반으로 구현했습니다.
