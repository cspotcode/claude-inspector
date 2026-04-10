/**
 * E2E tests for Claude Inspector (Electron) — Proxy mode only
 *
 * Run: npm run test:e2e
 * 앱이 실행 중이면 먼저 종료: pkill -x "Electron"
 */
import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(__dirname, '../..');

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [ROOT],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  // 온보딩 모달이 클릭을 막지 않도록 닫기
  await page.evaluate(() => {
    localStorage.setItem('ci-onboarded', '1');
    const modal = document.getElementById('onboardModal');
    if (modal) modal.style.display = 'none';
  });
});

test.afterAll(async () => {
  await app.close();
});

// ─── 기본 UI ─────────────────────────────────────────────────────────────────

test('앱 타이틀 확인', async () => {
  await expect(page).toHaveTitle('Claude Inspector');
});

// ─── 프록시 ──────────────────────────────────────────────────────────────────

test('프록시 시작 버튼 존재', async () => {
  await expect(page.locator('#proxyStartBtn')).toBeVisible();
});

// ─── 프록시 리스너 중복 방지 / UI Freeze 방지 ─────────────────────────────────

test('toggleProxy 시작 분기에 offProxy 선행 호출 코드 존재 (리스너 누적 방지)', () => {
  // contextBridge frozen 제약으로 런타임 mock 불가 → 소스 코드 정적 검증
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

  // else { ... } 블록 내에서 onProxyRequest 등록 전에 offProxy()가 있는지 확인
  // "else {" 이후 첫 번째 offProxy 호출이 onProxyRequest보다 앞에 있어야 함
  const elseIdx = html.indexOf('// 기존 리스너 먼저 정리 후 새 리스너 등록 (누적 방지)');
  const offProxyIdx = html.indexOf('window.electronAPI.offProxy();', elseIdx);
  const onProxyRequestIdx = html.indexOf('window.electronAPI.onProxyRequest(', elseIdx);

  expect(elseIdx).toBeGreaterThan(-1); // 주석 존재
  expect(offProxyIdx).toBeGreaterThan(-1); // offProxy 호출 존재
  expect(onProxyRequestIdx).toBeGreaterThan(-1); // onProxyRequest 등록 존재
  // offProxy가 onProxyRequest보다 먼저 나와야 함
  expect(offProxyIdx).toBeLessThan(onProxyRequestIdx);
});

test('반복 토글 후 UI 반응성 (500ms 이내)', async () => {
  const btn = page.locator('#proxyStartBtn');
  await expect(btn).toBeVisible();

  // 버튼이 비활성화 → 활성화되는 시간 측정
  const start = Date.now();
  await btn.click();
  // 버튼이 다시 enabled 되길 기다림 (최대 500ms)
  await expect(btn).not.toBeDisabled({ timeout: 500 });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(500);
});

test('연속 IPC 이벤트 시 proxyList debounce 동작', async () => {
  // renderer에서 직접 debouncedRenderProxyList 3회 연속 호출 후
  // renderProxyList 실제 실행 횟수가 1~2회인지 확인
  const renderCount = await page.evaluate(async () => {
    let count = 0;
    // @ts-ignore
    const origRender = window.renderProxyList;
    if (!origRender) return -1; // 함수 없으면 스킵

    // @ts-ignore
    window.renderProxyList = () => { count++; origRender(); };

    // 10ms 간격으로 3회 연속 호출
    // @ts-ignore
    if (typeof debouncedRenderProxyList === 'function') {
      // @ts-ignore
      debouncedRenderProxyList();
      await new Promise(r => setTimeout(r, 10));
      // @ts-ignore
      debouncedRenderProxyList();
      await new Promise(r => setTimeout(r, 10));
      // @ts-ignore
      debouncedRenderProxyList();
      // debounce 타이머 소진 대기 (50ms + 여유)
      await new Promise(r => setTimeout(r, 100));
    }

    // @ts-ignore
    window.renderProxyList = origRender;
    return count;
  });

  // debouncedRenderProxyList가 없으면 -1 반환 → 스킵
  if (renderCount === -1) return;
  // debounce로 인해 1회만 실행되어야 함
  expect(renderCount).toBeLessThanOrEqual(2);
  expect(renderCount).toBeGreaterThan(0);
});

// ─── 언어 전환 ───────────────────────────────────────────────────────────────

test('언어 전환 버튼 클릭 → 로케일 변경', async () => {
  const btn = page.locator('#langToggleBtn');
  const beforeText = await btn.innerText();
  await btn.click();
  const afterText = await btn.innerText();
  expect(afterText).not.toBe(beforeText);
  // 원상복구
  await btn.click();
});

// ─── 프록시 UI 요소 ─────────────────────────────────────────────────────────

test('#proxyStartBtn ID 명확화 확인', async () => {
  await expect(page.locator('#proxyStartBtn')).toHaveCount(1);
});

// ─── 프록시 상세 탭 버튼 ────────────────────────────────────────────────────

for (const dtab of ['aiflow', 'request', 'response', 'analysis']) {
  test(`프록시 상세 탭 버튼: ${dtab}`, async () => {
    await expect(page.locator(`.dtab[data-dtab="${dtab}"]`)).toHaveCount(1);
  });
}

// ─── offProxy 안전성 ─────────────────────────────────────────────────────────

test('모든 offProxy 호출이 안전하게 보호됨 (guard 또는 optional chaining)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

  // toggleProxy 내부: electronAPI guard가 try 블록 전에 존재 (early return)
  const toggleProxyMatch = html.match(/async function toggleProxy\(\)[\s\S]*?if \(!window\.electronAPI\) return;[\s\S]*?try\s*\{/);
  expect(toggleProxyMatch).not.toBeNull();

  // 페이지 로드 sync: optional chaining 사용
  const syncBlock = html.match(/프록시 상태 동기화[\s\S]*?\}\)\(\)/);
  expect(syncBlock).not.toBeNull();
  // offProxy in sync block should use optional chaining
  const syncOffProxy = syncBlock![0].match(/electronAPI\?\.offProxy\?\.\(\)/);
  expect(syncOffProxy).not.toBeNull();
});

test('프록시 토글 시 pageerror 없음', async () => {
  const pageErrors: string[] = [];
  const handler = (err: Error) => pageErrors.push(err.message);
  page.on('pageerror', handler);

  try {
    const btn = page.locator('#proxyStartBtn');
    await btn.click();
    await expect(btn).not.toBeDisabled({ timeout: 5000 });
    await page.waitForTimeout(300);

    // stop
    await btn.click();
    await expect(btn).not.toBeDisabled({ timeout: 5000 });
    await page.waitForTimeout(300);

    const offProxyErrors = pageErrors.filter(e => e.includes('offProxy') || e.includes('electronAPI'));
    expect(offProxyErrors).toHaveLength(0);
  } finally {
    page.removeListener('pageerror', handler);
  }
});

test('AI Flow 탭 클릭 → aiflow 컨텐츠 영역 표시', async () => {
  await page.locator('.dtab[data-dtab="aiflow"]').click();
  // 캡처 없으면 안내 메시지(aiflow-status) 표시
  await expect(page.locator('.aiflow-status')).toBeVisible({ timeout: 5000 });
});

// ─── Export/Import ──────────────────────────────────────────────────────────

test('Save/Load 버튼이 panel-header에 존재', async () => {
  const buttons = page.locator('.proxy-list .panel-header .copy-small');
  const texts = await buttons.allInnerTexts();
  expect(texts).toContain('Save');
  expect(texts).toContain('Load');
});

test('config-footer에 Export/Import 버튼 없음', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  // config-footer 영역에 exportCaptures/importCaptures onclick이 없어야 함
  const footerMatch = html.match(/class="config-footer"[\s\S]*?<\/div>/);
  if (footerMatch) {
    expect(footerMatch[0]).not.toContain('exportCaptures');
    expect(footerMatch[0]).not.toContain('importCaptures');
  }
});

test('buildCaptureSummaries diff — 중복 tool은 두 번째 request에서 생략', async () => {
  const summaries = await page.evaluate(() => {
    // @ts-ignore
    proxyCaptures = [
      // newest-first (unshift 방식)
      { id: '2', sessionId: 's1', body: { model: 'claude-sonnet-4-6', messages: [
        { role: 'assistant', content: [{ type: 'tool_use', name: 'Read' }, { type: 'tool_use', name: 'Edit' }] }
      ] }, response: null },
      { id: '1', sessionId: 's1', body: { model: 'claude-sonnet-4-6', messages: [
        { role: 'assistant', content: [{ type: 'tool_use', name: 'Read' }] }
      ] }, response: null },
    ];
    // @ts-ignore
    aiflowSelectedIds = new Set();
    // @ts-ignore
    return buildCaptureSummaries();
  });
  // oldest(id=1) → reqNum=1, tools=['Read'] 전체
  // newest(id=2) → reqNum=2, tools=['Edit'] (Read는 이미 있으므로 생략)
  const req1 = summaries.find((s: any) => s.request_num === 1);
  const req2 = summaries.find((s: any) => s.request_num === 2);
  expect(req1?.tools).toContain('Read');
  expect(req2?.tools).toContain('Edit');
  expect(req2?.tools).not.toContain('Read');  // diff: 중복 생략
});

test('importCaptures 함수 Array.isArray 검증 포함', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  expect(html).toContain('async function importCaptures()');
  expect(html).toContain('Array.isArray(imported)');
  expect(html).toContain("throw new Error('Invalid format')");
});

test('buildAiFlowSystemContext에 captures 원본 데이터 포함', async () => {
  const result = await page.evaluate(() => {
    // @ts-ignore
    proxyCaptures = [{
      id: 'test-1',
      body: { model: 'claude-sonnet-4-6', messages: [] },
      response: { body: { content: [], usage: { input_tokens: 100, output_tokens: 50 } } }
    }];
    // @ts-ignore
    aiflowResult = {
      steps: [{ num: 1, title: 'Test Step', body: 'test body content' }],
      summary: 'test summary'
    };
    // @ts-ignore
    aiflowSelectedIds = new Set();
    // @ts-ignore
    return buildAiFlowSystemContext();
  });
  expect(result).toContain('Raw capture data for detailed questions:');
  expect(result).toContain('claude-sonnet-4-6');
  expect(result).toContain('Test Step');
});

// ─── 자동 업데이트 UI ────────────────────────────────────────────────────────

test('update-available IPC → 뱃지에 버전 + 다운로드 중 표시', async () => {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', { version: '9.9.9' });
  });
  const badge = page.locator('#updateBadge');
  await expect(badge).toBeVisible({ timeout: 3000 });
  await expect(badge).toContainText('9.9.9');
});

test('update-progress IPC → 뱃지에 퍼센트 표시', async () => {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-progress', { percent: 42 });
  });
  const badge = page.locator('#updateBadge');
  await expect(badge).toContainText('42%', { timeout: 3000 });
});

test('update-downloaded IPC → 뱃지에 재시작 안내 + onclick 등록', async () => {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-downloaded', { version: '9.9.9' });
  });
  const badge = page.locator('#updateBadge');
  await expect(badge).toContainText('재시작', { timeout: 3000 });
  await expect(badge).toContainText('9.9.9');

  const hasOnclick = await page.evaluate(() => {
    const el = document.getElementById('updateBadge') as HTMLButtonElement;
    return typeof el?.onclick === 'function';
  });
  expect(hasOnclick).toBe(true);
});

test('update-downloaded 후 뱃지 클릭 시 update-install IPC 호출', async () => {
  // ipcRenderer.invoke('update-install') 호출 여부를 패치로 확인
  const invoked = await page.evaluate(async () => {
    let called = false;
    const orig = (window as any).electronAPI.installUpdate;
    (window as any).electronAPI.installUpdate = async () => { called = true; };
    document.getElementById('updateBadge')?.click();
    await new Promise(r => setTimeout(r, 100));
    (window as any).electronAPI.installUpdate = orig;
    return called;
  });
  expect(invoked).toBe(true);
});

test('프록시 시작→정지 전체 사이클 정상 동작', async () => {
  const btn = page.locator('#proxyStartBtn');
  const portInput = page.locator('#proxyPort');

  // 시작
  await btn.click();
  await expect(btn).not.toBeDisabled({ timeout: 5000 });

  // 포트 값 존재 확인
  const port = await portInput.inputValue();
  expect(Number(port)).toBeGreaterThan(0);

  // 정지
  await btn.click();
  await expect(btn).not.toBeDisabled({ timeout: 5000 });
});
