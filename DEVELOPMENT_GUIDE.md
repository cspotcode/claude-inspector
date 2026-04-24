# Claude Inspector — Development Guide

## Project Overview

An **Electron desktop app** that visualizes and tests the JSON payloads that Claude Code's 5 prompt
mechanisms (CLAUDE.md, Output Style, Slash Command, Skill, Sub-Agent) actually send to the Anthropic API.

**Target users**: Developers who want to understand Claude Code's internal behavior

## Architecture

```text
main.js         Electron main process — BrowserWindow creation, IPC handlers
preload.js      contextBridge — exposes window.electronAPI
public/
  index.html    Single-file frontend (inline CSS + Vanilla JS)
package.json    Electron + electron-builder config
```

### IPC Channels

| Channel          | Direction        | Role               |
|------------------|------------------|--------------------|
| `send-to-claude` | renderer → main  | Anthropic API call |

## Tech Stack

- **Electron 33** — desktop app
- **@anthropic-ai/sdk** — API calls (main process only)
- **Vanilla JS** — no framework, no build step
- **highlight.js (CDN)** — JSON syntax highlighting
- **marked.js (CDN)** — Markdown rendering

## Current Features

- 5 mechanism tabs (each with live API payload preview)
- CLAUDE.md / Output Style / Slash Command: send directly to API
- Skill: Simulate Effect (simplified version for real-world testing)
- Sub-Agent: Run Sub-Agent (delegation prompt standalone execution)
- API Key saved to localStorage
- Flow diagrams (Skill, Sub-Agent behavior visualization)

## Development Rules

- **Electron Only** — server.ts deleted, no web fallback code
- Keep `public/index.html` as a single file (no external .js/.css files)
- When adding IPC: update `ipcMain.handle` in main.js AND `contextBridge` in preload.js together
- UI style: maintain VS Code Dark+ theme (CSS variables --bg, --surface, --blue, etc.)
- Commits: use HEREDOC (`~/.claude/rules/git-rules.md`)

## Build / Run

```bash
npm start          # dev run
npm run dev        # dev run + logging
npm run dist       # production build → release/
```

## Completed Features (2026-02-28)

### ✅ P0 Done

- Removed server.ts, eliminated all web fallback code
- Live KB + token count display (header size-pill)
- File open dialog (Electron dialog IPC)
- Markdown response rendering (marked.js CDN + MD toggle button)

### ✅ P1 Done

- Export tab — cURL / Python / TypeScript snippet generation
- Request history panel (last 10 in session, click to restore)
- Live KB + ~token display

### ✅ UX Bug Fixes

- macOS window drag (`-webkit-app-region: drag`)
- Traffic light button overlap (`body.darwin .header { padding-left: 76px }`)

---

## Next: Proxy Mode (the real inspector)

### Overview

The current app is a "simulator" — it constructs and sends payloads directly.
**Goal**: Intercept and visualize actual API traffic from the Claude Code CLI in real time.

### How it works

```text
Claude Code CLI → localhost:9090 (proxy) → Anthropic API
                        ↓
                  Displayed live in Inspector UI
```

Claude Code supports the `ANTHROPIC_BASE_URL` environment variable:

```bash
ANTHROPIC_BASE_URL=http://localhost:9090 claude
```

### Implementation plan

#### Additions to main.js

```js
// HTTP proxy server (node:http)
const proxyServer = http.createServer(async (req, res) => {
  // 1. Collect request body
  // 2. Send to renderer via IPC (live display)
  // 3. Forward to real Anthropic API
  // 4. Capture response and send via IPC
  // 5. Return response to client
});
proxyServer.listen(9090);
```

#### New IPC channels

| Channel          | Direction        | Role                      |
|------------------|------------------|---------------------------|
| `proxy-request`  | main → renderer  | captured request payload  |
| `proxy-response` | main → renderer  | captured response         |
| `proxy-start`    | renderer → main  | start proxy server        |
| `proxy-stop`     | renderer → main  | stop proxy server         |

#### UI additions

- Add **Proxy tab** (or separate mode)
- Proxy ON/OFF toggle + port setting
- Captured request list (live stream)
- Click to view payload detail
- Copy button for `ANTHROPIC_BASE_URL=http://localhost:9090 claude`

### Technical considerations

- Implement proxy server with `node:http` (no external dependencies needed)
- HTTPS: Anthropic API uses HTTPS, but proxy accepts HTTP and forwards internally via SDK
- Streaming responses: use Anthropic SDK's streaming support
- Port conflicts: if 9090 is in use, auto-try next available port

---

## Rules (summary)

- **Electron Only** — no web fallback code
- Keep `public/index.html` as a single file (no external .js/.css files)
- When adding IPC: update `ipcMain.handle` in main.js AND `contextBridge` in preload.js together
- UI style: maintain VS Code Dark+ theme (CSS variables --bg, --surface, --blue, etc.)
- Commits: use HEREDOC (`~/.claude/rules/git-rules.md`)
