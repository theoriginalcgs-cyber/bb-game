// @ts-check
const { defineConfig } = require('@playwright/test');

const GAME_URL = process.env.GAME_URL || 'https://theoriginalcgs-cyber.github.io/bb-game/';

module.exports = defineConfig({
    testDir: './tests',
    timeout: 60_000,
    retries: 1,
    use: {
        headless: true,
        baseURL: GAME_URL,
        viewport: { width: 1440, height: 720 },
        // Capture video + screenshot on failure
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    reporter: [['html', { open: 'never' }], ['list']],
});
