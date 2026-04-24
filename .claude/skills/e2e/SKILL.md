---
name: e2e
description: Run e2e and unit tests for Claude Inspector. Use after code changes to verify regressions.
user-invocable: true
---

## Running Claude Inspector Tests

### Unit tests (parsing logic)
```bash
npm run test:unit
```
- `parseClaudeMdSections` — parses CLAUDE.md system-reminder sections
- `parseUserText` — detects injected blocks in user messages
- `detectMechanisms` — detection logic for 5 mechanisms

### E2E tests (Electron UI)
```bash
npm run test:e2e
# headed mode (show browser)
npm run test:e2e -- --headed
# specific test only
npm run test:e2e -- --grep "tab click"
# debug mode (step-by-step)
npm run test:e2e -- --debug
```
- If the app is running, kill it first: `pkill -x "Electron"`

### Run all tests
```bash
npm test
```

## Current state
- Branch: !`git branch --show-current`
- Changed files: !`git diff --name-only HEAD 2>/dev/null | head -10`

---

## Playwright Key Patterns

### Selector priority
```typescript
// ✅ Preferred: role, label, data-testid order
page.getByRole('button', { name: 'Start Proxy' })
page.getByLabel('API Key')
page.locator('[data-testid="proxy-toggle"]')
page.locator('[data-m="claude-md"]')  // this project's convention

// ❌ Forbidden: CSS classes, nth-child
page.locator('.btn.active')
page.locator('div > span:nth-child(2)')
```

### Wait strategy
```typescript
// ❌ Forbidden: fixed timeouts
await page.waitForTimeout(3000);

// ✅ Preferred: state/element-based
await page.waitForLoadState('domcontentloaded');
await expect(page.locator('[data-m="claude-md"]')).toHaveClass(/active/);
await expect(page.getByText('Copied!')).toBeVisible();
```

### Page Object Model (for complex tests)
```typescript
// tests/e2e/pages/MechanismPage.ts
export class MechanismPage {
  constructor(private page: Page) {}

  tab(name: string) {
    return this.page.locator(`[data-m="${name}"]`);
  }

  async switchTo(name: string) {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveClass(/active/);
  }
}
```

### Network/IPC mocking (proxy tests)
```typescript
// Mocking Anthropic API responses
await page.route('**/api.anthropic.com/**', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'msg_test', content: [{ type: 'text', text: 'ok' }] }),
  });
});
```

### Collecting traces on failure
```typescript
// Add to playwright.config.ts
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

---

## Handling Test Failures

| Cause | Fix |
|-------|-----|
| App already running | `pkill -x "Electron"` |
| Port conflict | `lsof -ti:9090 \| xargs kill` |
| Selector not found | Run with `--headed` to inspect visually |
| Timeout | Change `waitForTimeout` → `waitForLoadState` |
| Unit test mismatch | Sync `public/index.html` functions with `tests/unit/parse.test.mjs` expectations |

---

## Test Pyramid

```
      /E2E\         ← app launch, tab switching, proxy control
     /──────\
    /Unit    \      ← parseClaudeMdSections, detectMechanisms
   /──────────\
```

E2E covers core workflows only. Parsing logic edge cases go in unit tests.
