const HS_KEY = 'bb_highscores';

function loadScores() {
    try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; }
    catch { return []; }
}

function saveScore(entry) {
    const scores = loadScores();
    scores.push(entry);
    scores.sort((a, b) => b.floor - a.floor || b.kills - a.kills);
    localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, 5)));
    return scores;
}

function fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        const floor = this.registry.get('finalFloor') || 1;
        const agent = (this.registry.get('finalAgent') || 'jett').toUpperCase();
        const stats = this.registry.get('runStats') || {};
        const kills       = stats.kills       || 0;
        const damage      = stats.damageDealt || 0;
        const bosses      = stats.bossesKilled|| 0;
        const coins       = stats.coinsEarned || 0;
        const runTime     = stats.runTime     || 0;

        // Save + get high scores
        const scores = saveScore({ floor, agent, kills, damage, bosses, time: runTime, date: Date.now() });
        const bestFloor = scores[0]?.floor || floor;
        const isNewBest = scores[0]?.date === scores.find(s => s.floor === floor && s.agent === agent && Math.abs(s.time - runTime) < 2)?.date;

        // Background
        this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a0f);

        // Top red bar
        this.add.rectangle(W / 2, 0, W, 4, 0xff4655).setOrigin(0.5, 0);

        // YOU DIED
        this.add.text(W / 2, 48, 'YOU DIED', {
            fontSize: '72px', fontFamily: 'Arial Black, Arial',
            color: '#ff4655', fontStyle: 'bold',
        }).setOrigin(0.5, 0);

        // Agent + floor line
        this.add.text(W / 2, 134, `${agent}  ·  FLOOR ${floor}`, {
            fontSize: '22px', fontFamily: 'Arial', color: '#888888', letterSpacing: 4,
        }).setOrigin(0.5);

        if (isNewBest && scores.length > 1) {
            this.add.text(W / 2, 162, '★  NEW BEST RUN  ★', {
                fontSize: '14px', fontFamily: 'Arial Black, Arial',
                color: '#ffd700', letterSpacing: 3,
            }).setOrigin(0.5);
        }

        // Divider
        this.add.rectangle(W / 2, 185, 680, 2, 0x333333);

        // Stats grid
        const statItems = [
            { label: 'FLOOR REACHED',  value: `${floor}`,                color: '#ffffff' },
            { label: 'ENEMIES KILLED', value: `${kills}`,                color: '#ff8844' },
            { label: 'DAMAGE DEALT',   value: `${damage.toLocaleString()}`, color: '#ff4655' },
            { label: 'BOSSES KILLED',  value: `${bosses}`,               color: '#cc44ff' },
            { label: 'COINS EARNED',   value: `${coins}`,                color: '#ffd700' },
            { label: 'RUN TIME',       value: fmt(runTime),              color: '#44ddff' },
        ];

        const cols = 3;
        const cellW = 420 / cols;
        const startX = W / 2 - 210 + cellW / 2;
        const startY = 220;

        statItems.forEach((s, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * cellW;
            const cy = startY + row * 90;

            this.add.rectangle(cx, cy, cellW - 12, 78, 0x151520).setOrigin(0.5);
            this.add.text(cx, cy - 14, s.label, {
                fontSize: '10px', fontFamily: 'Arial', color: '#555555', letterSpacing: 2,
            }).setOrigin(0.5);
            this.add.text(cx, cy + 10, s.value, {
                fontSize: '26px', fontFamily: 'Arial Black, Arial',
                color: s.color, fontStyle: 'bold',
            }).setOrigin(0.5);
        });

        // High scores panel
        this.add.rectangle(W / 2, 425, 680, 2, 0x333333);
        this.add.text(W / 2, 440, 'BEST RUNS', {
            fontSize: '12px', fontFamily: 'Arial', color: '#444444', letterSpacing: 4,
        }).setOrigin(0.5);

        scores.slice(0, 5).forEach((s, i) => {
            const y = 462 + i * 22;
            const isThis = i === 0 && isNewBest;
            const col = isThis ? '#ffd700' : '#444444';
            const rank = ['1ST', '2ND', '3RD', '4TH', '5TH'][i];
            this.add.text(W / 2 - 310, y, rank, { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
            this.add.text(W / 2 - 270, y, s.agent, { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
            this.add.text(W / 2 - 180, y, `Floor ${s.floor}`, { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
            this.add.text(W / 2 - 80, y,  `${s.kills} kills`, { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
            this.add.text(W / 2 + 30, y,  fmt(s.time || 0), { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
            this.add.text(W / 2 + 130, y, new Date(s.date).toLocaleDateString(), { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(0, 0.5);
        });

        // Buttons
        this.add.rectangle(W / 2, 590, 680, 2, 0x333333);
        this._makeButton(W / 2 - 140, 630, 'TRY AGAIN', 0xff4655, 0xcc2233, () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });
        this._makeButton(W / 2 + 140, 630, 'MAIN MENU', 0x1a1a2e, 0x2a2a44, () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });

        this.add.text(W / 2, 668, 'R — restart  ·  M — menu', {
            fontSize: '12px', color: '#333333', fontFamily: 'Arial',
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-R', () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });
        this.input.keyboard.once('keydown-M', () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });

        // Fade in
        this.cameras.main.setAlpha(0);
        this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 600, ease: 'Power2' });
    }

    _makeButton(x, y, label, color, hoverColor, callback) {
        const bg = this.add.rectangle(x, y, 220, 48, color);
        const txt = this.add.text(x, y, label, {
            fontSize: '18px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 3,
        }).setOrigin(0.5);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover',  () => bg.setFillStyle(hoverColor));
        bg.on('pointerout',   () => bg.setFillStyle(color));
        bg.on('pointerdown',  callback);
    }
}
