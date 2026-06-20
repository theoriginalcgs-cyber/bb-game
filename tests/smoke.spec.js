// @ts-check
const { test, expect } = require('@playwright/test');

const GAME_URL = process.env.GAME_URL || 'https://theoriginalcgs-cyber.github.io/bb-game/';

// ── Helper: collect page errors ─────────────────────────────────────────────
function collectErrors(page) {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(`[uncaught] ${err.message}`));
    return errors;
}

// ── 1. Boot: game loads, canvas appears, no crash ───────────────────────────
test('boot — game loads without JS errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(GAME_URL);
    await page.waitForTimeout(5000); // Phaser boot + asset load

    const canvas = await page.$('canvas');
    expect(canvas, 'Phaser canvas should exist').not.toBeNull();
    await page.screenshot({ path: 'test-results/01-boot.png' });

    const fatal = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('AudioContext') &&   // expected until user gesture
        !e.includes('NotAllowedError')
    );
    expect(fatal, `Unexpected errors:\n${fatal.join('\n')}`).toHaveLength(0);
});

// ── 2. Menu: all agent cards render ─────────────────────────────────────────
test('menu — agent select screen renders', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(GAME_URL);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/02-menu.png' });

    // Verify canvas is still alive (scene didn't crash)
    const canvas = await page.$('canvas');
    expect(canvas).not.toBeNull();

    const fatal = errors.filter(e => !e.includes('favicon') && !e.includes('AudioContext'));
    expect(fatal).toHaveLength(0);
});

// ── 3. Debug mode loads extra features ──────────────────────────────────────
test('debug mode — overlay panel initialises', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(GAME_URL + '?debug=1');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-results/03-debug-mode.png' });

    const fatal = errors.filter(e => !e.includes('favicon') && !e.includes('AudioContext'));
    expect(fatal, `Debug mode caused errors:\n${fatal.join('\n')}`).toHaveLength(0);
});

// ── 4. Debug param: jump to floor 10 boss ──────────────────────────────────
test('debug param — floor skip does not crash', async ({ page }) => {
    const errors = collectErrors(page);
    // Navigate to floor 10 via URL param (after clicking to start — simulated via click)
    await page.goto(GAME_URL + '?debug=1&floor=10');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'test-results/04-floor10-skip.png' });

    const fatal = errors.filter(e => !e.includes('favicon') && !e.includes('AudioContext'));
    expect(fatal).toHaveLength(0);
});

// ── 5. No console errors after 10 seconds of idle ───────────────────────────
test('stability — no errors after 10s idle on menu', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(GAME_URL);
    await page.waitForTimeout(10_000);
    await page.screenshot({ path: 'test-results/05-idle-10s.png' });

    const fatal = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('AudioContext') &&
        !e.includes('NotAllowedError')
    );
    expect(fatal).toHaveLength(0);
});
