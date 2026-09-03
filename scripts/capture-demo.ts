// Deterministic judge-demo rehearsal against the production-built artifact.
// This never calls SerpApi or Perfect Corp: ?mode=demo and route guards make
// any accidental live request fail the capture.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright-core';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const capturePort = process.env.CAPTURE_PORT || '18787';
const baseUrl = `http://127.0.0.1:${capturePort}`;
const screenshotDir = path.join(repo, 'docs', 'screenshots');

async function waitForServer(server: ReturnType<typeof spawn>, serverErrors: string[]): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`production server exited during startup: ${serverErrors.join(' | ')}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('production server did not become healthy within five seconds');
}

async function verifyProductionRouting(): Promise<void> {
  const missingApi = await fetch(`${baseUrl}/api/not-a-real-route`);
  const contentType = missingApi.headers.get('content-type') ?? '';
  if (missingApi.status !== 404 || !contentType.includes('application/json')) {
    throw new Error(
      `unknown API route must be a JSON 404, received ${missingApi.status} ${contentType}`,
    );
  }
}

async function verifyBaselineFailureBlocksOutcome(browser: Browser): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/demo/comparison-bundle', async (route) => {
    const response = await route.fetch();
    const bundle = (await response.json()) as {
      lost: { render: Record<string, unknown> };
    };
    bundle.lost.render = {
      ...bundle.lost.render,
      providerStatus: 'failed',
      imageUrl: null,
      completedAt: new Date(0).toISOString(),
      error: 'controlled end-to-end baseline failure',
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(bundle),
    });
  });

  try {
    await page.goto(`${baseUrl}/?mode=demo`, { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /Urban Decay Vice Lipstick — Backtalk/i })
      .click();
    await page.getByRole('button', { name: 'Find living replacements' }).click();
    await page.getByText('SERPAPI: FIXTURE').waitFor();
    const rows = page.locator('.candidate-row');
    await rows.nth(0).getByRole('button', { name: 'Try on-face' }).click();
    await rows.nth(1).getByRole('button', { name: 'Try on-face' }).click();
    await rows.nth(2).getByRole('button', { name: 'Try on-face' }).click();
    await page.getByRole('button', { name: 'Compare 3 on-face' }).click();
    await page
      .getByRole('heading', { name: 'Lost-shade baseline failed. Comparison is blocked.' })
      .waitFor();

    if ((await page.locator('.decision-panel').count()) !== 0) {
      throw new Error('candidate decision panel unlocked after lost-shade baseline failure');
    }
    if ((await page.locator('.verdict-card').count()) !== 0) {
      throw new Error('outcome unlocked after lost-shade baseline failure');
    }
    if (errors.length > 0) {
      throw new Error(`baseline-failure browser errors: ${errors.join(' | ')}`);
    }
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const server = spawn(path.join(repo, 'node_modules', '.bin', 'tsx'), ['server/index.ts'], {
    cwd: repo,
    env: { ...process.env, NODE_ENV: 'production', PORT: capturePort },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const serverErrors: string[] = [];
  server.stderr.on('data', (chunk) => serverErrors.push(String(chunk)));

  try {
    await waitForServer(server, serverErrors);
    await verifyProductionRouting();
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const browserErrors: string[] = [];
      const forbiddenRequests: string[] = [];
      const externalImageRequests: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
      });
      page.on('pageerror', (error) => browserErrors.push(error.message));
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (request.resourceType() === 'image' && url.origin !== new URL(baseUrl).origin) {
          externalImageRequests.push(request.url());
        }
        if (url.pathname === '/api/search' && url.searchParams.get('mode') !== 'fixture') {
          forbiddenRequests.push(request.url());
        }
        if (url.pathname === '/api/vto' || url.pathname === '/api/shade-estimate') {
          forbiddenRequests.push(request.url());
        }
      });

      await page.goto(`${baseUrl}/?mode=demo`, { waitUntil: 'networkidle' });
      // Judge screenshots are evidence stills, not motion proof. Freeze CSS timing
      // so the same fixture state produces byte-stable PNGs across rehearsals;
      // the real app retains its shade/reveal motion for the recorded demo.
      await page.addStyleTag({
        content:
          '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.shade-bridge-wipe{display:none!important}',
      });
      await page.getByText('Demo recording armed').waitFor();
      await page.screenshot({ path: path.join(screenshotDir, 'judge-demo-opening.png') });
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.screenshot({ path: path.join(screenshotDir, 'judge-devpost-thumbnail.png') });
      await page.setViewportSize({ width: 1440, height: 900 });

      await page
        .getByRole('button', { name: /Urban Decay Vice Lipstick — Backtalk/i })
        .click();
      await page.getByRole('button', { name: 'Find living replacements' }).click();
      await page.getByText('SERPAPI: FIXTURE').waitFor();
      const remoteFixtureThumbnails = await page.locator('.candidate-row img[src^="http"]').count();
      if (remoteFixtureThumbnails > 0) {
        throw new Error(
          `fixture hunt rendered ${remoteFixtureThumbnails} remote product thumbnails`,
        );
      }
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.locator('[aria-labelledby="act2-title"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshotDir, 'judge-devpost-hunt.png') });
      await page.setViewportSize({ width: 1440, height: 900 });

      const candidateRows = page.locator('.candidate-row');
      await candidateRows.nth(0).getByRole('button', { name: 'Try on-face' }).click();
      await candidateRows.nth(1).getByRole('button', { name: 'Try on-face' }).click();
      await candidateRows.nth(2).getByRole('button', { name: 'Try on-face' }).click();
      await page.getByRole('button', { name: 'Compare 3 on-face' }).click();
      await page.getByRole('heading', { name: 'Resolve every shortlisted candidate.' }).waitFor();

      if ((await page.locator('.verdict-card').count()) !== 0) {
        throw new Error('outcome appeared before explicit candidate decisions');
      }
      const usableSwatches = page.locator('.swatch:not([disabled])');
      if ((await usableSwatches.count()) !== 2) {
        throw new Error('expected exactly two fixture candidates above the shade-evidence threshold');
      }
      if ((await page.locator('.render-cell').first().locator('img').count()) !== 1) {
        throw new Error('lost-shade baseline render is missing');
      }
      await page.getByText('System excluded', { exact: true }).waitFor();
      await page
        .locator('.decision-row-excluded')
        .getByText(/2.5% usable shade coverage is below/)
        .waitFor();

      // Reject the candidate CIE76 would rank first, then prefer the other one.
      // The final state proves human input—not the metric—controls the outcome.
      await usableSwatches.nth(0).click();
      await page
        .getByRole('button', { name: 'Reject visual fit for Anastasia Beverly Hills Lip Velvet' })
        .click();
      await usableSwatches.nth(1).click();
      await page
        .getByRole('button', {
          name: 'Accept visual fit for NYX Professional Makeup Fat Matte Lipstick',
        })
        .click();
      await page
        .getByRole('button', { name: 'Prefer NYX Professional Makeup Fat Matte Lipstick' })
        .click();
      await page.getByText(/3 of 3 candidates resolved · 1 system excluded/).waitFor();
      await page.getByRole('heading', { name: 'No actionable lead yet.' }).waitFor();
      await page
        .getByText(/Your visual preference is NYX Professional Makeup Fat Matte Lipstick/)
        .waitFor();
      await page.getByText('CIE76 did not choose this preference.').waitFor();
      await page
        .getByText(/Still needed: validated per-run evidence manifest.*exact variant/)
        .waitFor();
      if ((await page.locator('.actionable-link').count()) !== 0) {
        throw new Error('actionable observed-offer branch unlocked with incomplete evidence');
      }

      const fixtureBadges = await page.locator('.badge-fixture').count();
      if (fixtureBadges < 3) {
        throw new Error(`expected at least three visible FIXTURE badges, found ${fixtureBadges}`);
      }
      if (forbiddenRequests.length > 0) {
        throw new Error(`demo capture attempted live provider requests: ${forbiddenRequests.join(', ')}`);
      }
      if (browserErrors.length > 0) {
        throw new Error(`browser console errors: ${browserErrors.join(' | ')}`);
      }
      if (externalImageRequests.length > 0) {
        throw new Error(
          `demo capture requested non-local image assets: ${externalImageRequests.join(', ')}`,
        );
      }
      await page.getByText('The proof boundary is explicit.').waitFor();

      await page.evaluate(() => {
        document.body.style.zoom = '0.62';
      });
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.locator('[aria-labelledby="act3-title"]').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 80));
      await page.screenshot({ path: path.join(screenshotDir, 'judge-devpost-verdict.png') });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('[aria-labelledby="act3-title"]').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -16));
      await page.screenshot({ path: path.join(screenshotDir, 'judge-demo-verdict.png') });

      await page.evaluate(() => {
        document.body.style.zoom = '';
        window.scrollTo(0, 0);
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(100);
      await page.locator('.verdict-card').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) throw new Error(`mobile layout overflows horizontally by ${overflow}px`);
      await page.locator('.verdict-card').screenshot({
        path: path.join(screenshotDir, 'judge-demo-mobile-verdict.png'),
      });

      await verifyBaselineFailureBlocksOutcome(browser);

      console.log(
        '[capture:demo] PASS — production artifact, required successful baseline, all 3 candidates resolved (1 system exclusion + 2 human decisions), human preference overrides CIE76, incomplete provenance blocks the actionable branch, 3+ fixture badges, zero live provider or non-local image requests, zero browser errors',
      );
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null) return resolve();
      server.once('exit', () => resolve());
      setTimeout(resolve, 1_000);
    });
  }

  if (serverErrors.length > 0) {
    const material = serverErrors.filter((line) => !line.includes('ExperimentalWarning'));
    if (material.length > 0) throw new Error(`production server stderr: ${material.join(' | ')}`);
  }
}

await main();
