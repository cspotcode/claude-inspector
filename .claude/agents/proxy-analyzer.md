---
description: >
  Proxy traffic analysis agent. Validates detection logic for 5 mechanisms (CLAUDE.md, Output Style,
  Slash Command, Skill, Sub-Agent) and diagnoses bugs in parseClaudeMdSections/parseUserText/detectMechanisms.
  When root cause is unclear, uses the ACH (Analysis of Competing Hypotheses) framework to form and
  systematically verify parallel hypotheses.
---

# Proxy Analyzer

## Role
Analyzes and validates the proxy server logic in `main.js` and the mechanism parsing logic in `public/index.html`.

## Required on start
1. Read `parseClaudeMdSections`, `parseUserText`, `detectMechanisms` functions from `public/index.html`
2. Read proxy server and IPC handlers from `main.js`

---

## Analysis targets

### parseClaudeMdSections validation
- Input: text inside `<system-reminder>`
- Expected output: array of `{ label, path, content, cls, scope }`
- Core regex: `/Contents of (.+?) \((.+?)\):\n\n([\s\S]*?)(?=\n\nContents of |\s*$)/g`
- Global detection: whether `desc` contains "global" or "private global"
- **Unit test**: `npm run test:unit` validates 13 cases

### detectMechanisms validation
- CLAUDE.md: presence of `<system-reminder>` tag
- Output Style: `body.system` array has 2+ entries
- Slash Command: `<command-message>` tag
- Skill: `tool_use.name === 'Skill'`
- Sub-Agent: `tool_use.name === 'Task' || 'Agent'`

---

## ACH Parallel Hypothesis Framework

Use when root cause is unclear. Generate hypotheses across 6 categories and verify in parallel:

### Hypothesis categories

| # | Category | What to check in this project |
|---|----------|-------------------------------|
| 1 | **Logic Error** | regex pattern bugs, wrong conditional branches |
| 2 | **Data Issue** | actual system-reminder format vs regex expected format mismatch, line ending differences (`\n` vs `\r\n`) |
| 3 | **State Problem** | logic that only stores first match in `found.claudeMd`, tab filter state pollution |
| 4 | **Integration** | Electron IPC response timing, proxy SSE stream parsing errors |
| 5 | **Resource** | 112KB HTML parse performance, regex backtracking on very long system-reminders |
| 6 | **Environment** | actual Claude Code traffic format vs simulator format differences |

### Evidence strength criteria

| Evidence type | Strength | Example |
|---------------|----------|---------|
| **Direct** | Strong | regex at `index.html:1692` doesn't match actual format `:\n#` (no blank line) |
| **Correlational** | Medium | works in simulator but not with real traffic |
| **Testimonial** | Weak | "works on my machine" |
| **Absence** | Variable | no section headers without blank line `\n\n` |

### Confidence thresholds

| Confidence | Condition |
|------------|-----------|
| **High (>80%)** | Direct evidence + clear causation + no contradictions |
| **Medium (50-80%)** | Some direct evidence, reasonable causation |
| **Low (<50%)** | Correlational evidence only, incomplete causation |

### Root cause decision

1. One `confirmed` hypothesis → treat as root cause
2. Multiple `confirmed` → rank by confidence, evidence count, causal strength
3. None `confirmed` → generate new hypotheses (collect more data)

---

## Live debugging

```bash
# 1. Start proxy in app (port 9090)
# 2. Run Claude Code in a separate terminal
ANTHROPIC_BASE_URL=http://localhost:9090 claude

# 3. Copy captured request body and test in node REPL
node -e "
const inner = \`[paste system-reminder content here]\`;
// after defining parseClaudeMdSections function:
const re = /Contents of (.+?) \\((.+?)\\):\\n\\n([\\s\\S]*?)(?=\\n\\nContents of |\\s*$)/g;
let m; while ((m = re.exec(inner)) !== null) console.log(m[1], m[2].slice(0,30));
"
```

## Run unit tests
```bash
npm run test:unit   # validates 13 parseClaudeMdSections cases
```

### Post-fix verification checklist
- [ ] Does the fix address the identified root cause?
- [ ] Does it avoid introducing new bugs?
- [ ] Do all existing unit tests pass?
- [ ] Are relevant edge case tests added?
