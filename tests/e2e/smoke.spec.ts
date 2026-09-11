import { expect, test, type Page } from '@playwright/test';

interface AudioProbe {
  context: string;
  transport: string;
  seconds: number;
  bpm: number;
  meter: string;
  mode: string;
  act: number;
  bars: number;
  steps: number;
}

declare global {
  interface Window {
    __drunkenRobot?: { readonly activeScene: string | null; readonly audio: AudioProbe };
  }
}

/** Console errors that are expected in a headless run without a user gesture before load. */
const ALLOWED = [/AudioContext/i, /GPU stall/i];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !ALLOWED.some((re) => re.test(m.text()))) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

async function startRun(page: Page): Promise<void> {
  await page.goto('/?seed=1&test=1');
  await page.waitForSelector('canvas');
  await expect
    .poll(() => page.evaluate(() => window.__drunkenRobot?.activeScene), { timeout: 15_000 })
    .toBe('TitleScene');
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 640, y: 360 } });
  await expect
    .poll(() => page.evaluate(() => window.__drunkenRobot?.activeScene), { timeout: 10_000 })
    .toBe('StreetScene');
}

test('boots, starts a run, plays music, and pauses without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await startRun(page);

  // Play for a few seconds with some input
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await page.waitForTimeout(4000);

  const audio = await page.evaluate(() => window.__drunkenRobot!.audio);
  expect(audio.context).toBe('running');
  expect(audio.transport).toBe('started');
  expect(audio.bars).toBeGreaterThanOrEqual(2);
  expect(audio.act).toBe(1);
  expect(audio.meter).toBe('4/4');

  // Pause freezes the clock; resume continues it
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  const paused = await page.evaluate(() => window.__drunkenRobot!.audio);
  expect(paused.transport).toBe('paused');
  await page.waitForTimeout(500);
  const stillPaused = await page.evaluate(() => window.__drunkenRobot!.audio);
  expect(stillPaused.seconds).toBeCloseTo(paused.seconds, 1);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => window.__drunkenRobot!.audio)).transport).toBe('started');

  expect(errors).toEqual([]);
});

test('restart from the pause menu returns to act 1 on the same seed', async ({ page }) => {
  const errors = collectErrors(page);
  await startRun(page);
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyR');
  await expect
    .poll(() => page.evaluate(() => window.__drunkenRobot?.activeScene), { timeout: 5_000 })
    .toBe('StreetScene');
  await page.waitForTimeout(1500);
  const audio = await page.evaluate(() => window.__drunkenRobot!.audio);
  expect(audio.transport).toBe('started');
  expect(audio.act).toBe(1);
  expect(errors).toEqual([]);
});

test('the debug dashboard mounts cleanly', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1&test=1');
  await page.waitForSelector('#debug-dashboard');
  await expect(page.locator('#debug-dashboard .channel-strip')).toHaveCount(6);
  await expect(page.locator('#debug-dashboard [data-meter]')).toHaveCount(6);
  await expect(page.locator('#debug-dashboard [data-scale]')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('touch devices get the rotate prompt in portrait and touch guides in landscape', async ({ browser }) => {
  const portrait = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const p1 = await portrait.newPage();
  await p1.goto('/?test=1');
  await expect(p1.locator('#rotate-overlay')).toBeVisible();
  await portrait.close();

  const landscape = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const p2 = await landscape.newPage();
  const errors = collectErrors(p2);
  await p2.goto('/?seed=2&test=1');
  await expect(p2.locator('#rotate-overlay')).toBeHidden();
  await p2.waitForSelector('canvas');
  await expect
    .poll(() => p2.evaluate(() => window.__drunkenRobot?.activeScene), { timeout: 15_000 })
    .toBe('TitleScene');
  const box = (await p2.locator('canvas').first().boundingBox())!;
  await p2.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() => p2.evaluate(() => window.__drunkenRobot?.activeScene), { timeout: 10_000 })
    .toBe('StreetScene');
  expect(errors).toEqual([]);
  await landscape.close();
});
