# Claude Code가 API에 실제로 뭘 보내는지 보여주는 macOS 앱을 만들었습니다

MITM 프록시로 트래픽을 직접 까보니 몰랐던 것들이 나왔습니다.

**`hello` 한 마디에 12KB가 붙어 나간다**
- `content[0]` 스킬 목록 ~2KB, `content[1]` CLAUDE.md ~10KB, `content[2]` 실제 입력 몇 바이트
- CLAUDE.md 500줄이면 매 요청마다 통째로 전송. CLAUDE.md를 간결하게 유지해야 하는 이유

**대화가 쌓일수록 매 요청이 눈덩이처럼 커진다**
- `messages[]` 전체를 매 요청마다 재전송 — 1턴 15KB, 10턴 200KB, 30턴 1MB+
- 그 안에 12KB CLAUDE.md가 매 턴마다 반복. `/clear`를 자주 쳐야 하는 이유

**MCP 툴은 필요할 때만 로딩된다**
- 처음엔 빌트인 27개만, `ToolSearch` 호출마다 스키마가 추가됨
- 안 쓰는 MCP는 실제로 토큰 소비 없음 — 눈으로 확인 가능

**스킬과 로컬 커맨드는 완전히 다른 경로로 주입된다**
- `/commit` 같은 스킬은 프롬프트 전체가 user 메시지에 삽입, 세션 끝날 때까지 따라다님
- `/clear` 같은 로컬 커맨드는 실행 결과만 전달

**서브에이전트는 완전히 격리된 컨텍스트로 실행된다**
- 부모 대화 이력이 전혀 없는 새로운 API 호출
- Inspector에서 부모/서브에이전트 두 호출을 나란히 비교 가능

**이미지 첨부 한 장이 수백 KB를 추가한다**
- 스크린샷을 첨부하면 base64 인코딩되어 JSON 바디에 인라인 삽입
- 이미지가 요청을 얼마나 키우는지 실시간으로 확인 가능

---

```bash
brew install --cask kangraemin/tap/claude-inspector
```

GitHub: https://github.com/kangraemin/claude-inspector

아직 macOS 전용이고 초기 버전입니다. 피드백 환영합니다.
