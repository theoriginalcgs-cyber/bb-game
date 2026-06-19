const SYMBOLS = [
    { char: '7',  color: '#ff4655', weight: 1 },
    { char: '★',  color: '#ffd700', weight: 2 },
    { char: '◆',  color: '#00e5ff', weight: 3 },
    { char: '♥',  color: '#ff88aa', weight: 3 },
    { char: '⚡', color: '#ffff44', weight: 3 },
    { char: '☘',  color: '#44ff88', weight: 4 },
    { char: '☠',  color: '#aaaaaa', weight: 2 },
];

const POOL = [];
SYMBOLS.forEach(s => { for (let i = 0; i < s.weight; i++) POOL.push(s); });

const PAYOUTS = {
    '7-7-7':     { mult: 6,    label: '7  7  7     J A C K P O T !',      color: '#ff4655' },
    '★-★-★':    { mult: 4,    label: '★  ★  ★     TRIPLE STAR!',          color: '#ffd700' },
    '◆-◆-◆':    { mult: 3,    label: '◆  ◆  ◆     TRIPLE DIAMOND!',       color: '#00e5ff' },
    '♥-♥-♥':    { mult: 2.5,  label: '♥  ♥  ♥     TRIPLE HEART!',         color: '#ff88aa' },
    '⚡-⚡-⚡': { mult: 2,    label: '⚡ ⚡ ⚡   TRIPLE BOLT!',            color: '#ffff44' },
    '☘-☘-☘':   { mult: 1.75, label: '☘  ☘  ☘     TRIPLE CLOVER!',        color: '#44ff88' },
    '☠-☠-☠':   { mult: -1,   label: '☠  ☠  ☠     JACKPOT LOSS — ALL IN!', color: '#ff0000' },
};

export default class CasinoScene extends Phaser.Scene {
    constructor() { super({ key: 'CasinoScene' }); }

    init(data) {
        this.floor       = data.floor  ?? 1;
        this.coins       = data.coins  ?? 0;
        this._bet        = Math.min(20, Math.max(1, this.coins));
        this._spinning   = false;
        this._lights     = [];
        this._typedBet   = String(this._bet);
        this._typingMode = false;
    }

    create() {
        const W  = this.scale.width;
        const H  = this.scale.height;
        const cx = W / 2;

        // ── Background ──────────────────────────────────────────────
        this.add.rectangle(cx, H / 2, W, H, 0x07070f);
        this._makeStars();

        // Subtle vignette
        const vig = this.add.graphics();
        vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.7, 0.7, 0, 0);
        vig.fillRect(0, 0, W, H);

        // ── Title ───────────────────────────────────────────────────
        // Glow layers
        for (const [ox, oy, col, al] of [[0,0,'#550022',0.5],[3,3,'#aa0044',0.3]]) {
            this.add.text(cx + ox, 46 + oy, "CAMMY'S CASINO", {
                fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: col, fontStyle: 'bold',
            }).setOrigin(0.5).setAlpha(al);
        }
        this.add.text(cx, 46, "CAMMY'S CASINO", {
            fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
            color: '#ffd700', fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(cx, 96, 'The house always wins... probably.', {
            fontSize: '13px', fontFamily: 'Arial, sans-serif',
            color: '#886622', letterSpacing: 2,
        }).setOrigin(0.5);

        // ── Machine ──────────────────────────────────────────────────
        const MX = cx, MY = 305, MW = 760, MH = 210;

        // Shadow
        const sg = this.add.graphics();
        sg.fillStyle(0x000000, 0.6);
        sg.fillRoundedRect(MX - MW / 2 + 8, MY - MH / 2 + 8, MW, MH, 18);

        // Body
        const mg = this.add.graphics();
        mg.fillStyle(0x10102a, 1);
        mg.fillRoundedRect(MX - MW / 2, MY - MH / 2, MW, MH, 18);

        // Gold outer border
        mg.lineStyle(5, 0xffd700, 1);
        mg.strokeRoundedRect(MX - MW / 2, MY - MH / 2, MW, MH, 18);

        // Inner accent
        mg.lineStyle(1, 0x665500, 0.6);
        mg.strokeRoundedRect(MX - MW / 2 + 10, MY - MH / 2 + 10, MW - 20, MH - 20, 12);

        // Reel separator lines
        const dg = this.add.graphics();
        dg.lineStyle(2, 0x2a2a4a, 1);
        dg.lineBetween(MX - 125, MY - MH / 2 + 18, MX - 125, MY + MH / 2 - 18);
        dg.lineBetween(MX + 125, MY - MH / 2 + 18, MX + 125, MY + MH / 2 - 18);

        // Payline (center red stripe)
        const pg = this.add.graphics();
        pg.lineStyle(2, 0xff3333, 0.7);
        pg.lineBetween(MX - MW / 2 + 22, MY, MX + MW / 2 - 22, MY);
        this.add.text(MX - MW / 2 + 14, MY, '▶', { fontSize: '11px', color: '#ff3333' }).setOrigin(0, 0.5);
        this.add.text(MX + MW / 2 - 14, MY, '◀', { fontSize: '11px', color: '#ff3333' }).setOrigin(1, 0.5);

        // Border lights
        this._makeBorderLights(MX, MY, MW, MH);

        // ── Reels ───────────────────────────────────────────────────
        this._reels = [];
        [MX - 230, MX, MX + 230].forEach((rx, i) => {
            // Reel window
            const rg = this.add.graphics();
            rg.fillStyle(0x04040e, 1);
            rg.fillRoundedRect(rx - 88, MY - MH / 2 + 14, 176, MH - 28, 6);
            rg.lineStyle(1, 0x222244, 1);
            rg.strokeRoundedRect(rx - 88, MY - MH / 2 + 14, 176, MH - 28, 6);

            // Motion blur (above/below, hidden at rest)
            const topBlur = this.add.text(rx, MY - 56, '', {
                fontSize: '44px', fontFamily: 'Arial, sans-serif', color: '#222244',
            }).setOrigin(0.5).setAlpha(0).setDepth(3);

            const botBlur = this.add.text(rx, MY + 56, '', {
                fontSize: '44px', fontFamily: 'Arial, sans-serif', color: '#222244',
            }).setOrigin(0.5).setAlpha(0).setDepth(3);

            // Main symbol
            const startSym = SYMBOLS[Phaser.Math.Between(0, SYMBOLS.length - 1)];
            const mainTxt = this.add.text(rx, MY, startSym.char, {
                fontSize: '88px', fontFamily: 'Arial, sans-serif',
                color: startSym.color, fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(3);

            this._reels.push({ mainTxt, topBlur, botBlur });
        });

        // ── Coin display ─────────────────────────────────────────────
        this.coinDisplay = this.add.text(cx, 134, `⬡  ${this.coins}  COINS`, {
            fontSize: '22px', fontFamily: 'Arial Black, sans-serif',
            color: '#ffd700', fontStyle: 'bold',
        }).setOrigin(0.5);

        // ── Bet row ──────────────────────────────────────────────────
        const betY = MY + MH / 2 + 40;

        this.add.text(MX - 290, betY, 'BET:', {
            fontSize: '13px', color: '#666666', letterSpacing: 3,
        }).setOrigin(0, 0.5);

        this._mkBtn(MX - 220, betY, '-50',   () => this._adjustBet(-50));
        this._mkBtn(MX - 170, betY, '-10',   () => this._adjustBet(-10));
        this._mkBtn(MX - 120, betY, '-1',    () => this._adjustBet(-1));

        this.betTxt = this.add.text(MX, betY, `${this._bet}`, {
            fontSize: '22px', fontFamily: 'Arial Black, sans-serif',
            color: '#ffffff', fontStyle: 'bold',
            backgroundColor: '#0d0d22', padding: { x: 24, y: 6 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.betTxt.on('pointerdown', () => this._startTyping());

        this._mkBtn(MX + 80,  betY, '+1',    () => this._adjustBet(1));
        this._mkBtn(MX + 130, betY, '+10',   () => this._adjustBet(10));
        this._mkBtn(MX + 180, betY, '+50',   () => this._adjustBet(50));
        this._mkBtn(MX + 236, betY, 'ALL IN',() => this._setBetMax());

        // Typing hint
        this.typingHint = this.add.text(MX, betY + 22, '', {
            fontSize: '10px', color: '#555588',
        }).setOrigin(0.5);

        // ── Spin button ──────────────────────────────────────────────
        const spinY = betY + 62;
        this.spinBtn = this.add.text(MX, spinY, '🎰   PULL THE LEVER', {
            fontSize: '20px', fontFamily: 'Arial Black, sans-serif',
            color: '#111111', fontStyle: 'bold',
            backgroundColor: '#ffd700', padding: { x: 38, y: 14 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.spinBtn.on('pointerover', () => { if (!this._spinning) this.spinBtn.setBackgroundColor('#ffe555'); });
        this.spinBtn.on('pointerout',  () => { if (!this._spinning) this.spinBtn.setBackgroundColor('#ffd700'); });
        this.spinBtn.on('pointerdown', () => this._spin());

        // ── Result text ───────────────────────────────────────────────
        this.resultTxt = this.add.text(MX, MY - MH / 2 - 28, '', {
            fontSize: '22px', fontFamily: 'Arial Black, sans-serif',
            color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(10);

        // ── Pay table ─────────────────────────────────────────────────
        this._drawPayTable(88, 168);

        // ── Leave button ──────────────────────────────────────────────
        const leaveBtn = this.add.text(W - 22, H - 22, '✓  LEAVE CASINO', {
            fontSize: '13px', color: '#555555',
            backgroundColor: '#090910', padding: { x: 12, y: 7 },
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
        leaveBtn.on('pointerover', () => leaveBtn.setColor('#aaaaaa'));
        leaveBtn.on('pointerout',  () => leaveBtn.setColor('#555555'));
        leaveBtn.on('pointerdown', () => this._close());

        // ── Keyboard ─────────────────────────────────────────────────
        this.input.keyboard.on('keydown', e => this._onKey(e));

        this._animateLights();
        this.scene.bringToTop();
    }

    // ── Stars ──────────────────────────────────────────────────────────
    _makeStars() {
        const g = this.add.graphics();
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, 1280);
            const y = Phaser.Math.Between(0, 720);
            const r = Math.random() < 0.15 ? 2 : 1;
            g.fillStyle(0xffffff, 0.15 + Math.random() * 0.35);
            g.fillCircle(x, y, r);
        }
        // Twinkling effect on a few stars
        for (let i = 0; i < 12; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 1280),
                Phaser.Math.Between(0, 200),
                1.5, 0xffd700, 0.6
            );
            this.tweens.add({
                targets: star, alpha: 0.1,
                duration: 800 + Math.random() * 1200,
                yoyo: true, repeat: -1,
                delay: Math.random() * 2000,
                ease: 'Sine.easeInOut',
            });
        }
    }

    // ── Border lights ──────────────────────────────────────────────────
    _makeBorderLights(MX, MY, MW, MH) {
        const colors = [0xff0044, 0xffd700, 0x00e5ff, 0xff8800, 0x44ff88, 0xcc44ff];
        const sp = 28;

        const addLight = (x, y) => {
            const col = colors[Phaser.Math.Between(0, colors.length - 1)];
            const c = this.add.circle(x, y, 5, col, 1);
            this._lights.push(c);
        };

        for (let x = MX - MW / 2 + 14; x <= MX + MW / 2 - 14; x += sp) {
            addLight(x, MY - MH / 2 - 10);
            addLight(x, MY + MH / 2 + 10);
        }
        for (let y = MY - MH / 2 + 14; y <= MY + MH / 2 - 14; y += sp) {
            addLight(MX - MW / 2 - 10, y);
            addLight(MX + MW / 2 + 10, y);
        }
    }

    _animateLights() {
        let tick = 0;
        this.time.addEvent({
            delay: 180, loop: true,
            callback: () => {
                tick++;
                this._lights.forEach((l, i) => l.setAlpha((i + tick) % 2 === 0 ? 1 : 0.18));
            },
        });
    }

    // ── Pay table ──────────────────────────────────────────────────────
    _drawPayTable(x, y) {
        this.add.text(x, y, 'PAY TABLE', {
            fontSize: '10px', color: '#886600', letterSpacing: 3, fontStyle: 'bold',
        }).setOrigin(0.5);

        const rows = [
            ['7 7 7',    '×6',     '#ff4655'],
            ['★ ★ ★',   '×4',     '#ffd700'],
            ['◆ ◆ ◆',   '×3',     '#00e5ff'],
            ['♥ ♥ ♥',   '×2.5',   '#ff88aa'],
            ['⚡⚡⚡',  '×2',     '#ffff44'],
            ['☘ ☘ ☘',  '×1.75',  '#44ff88'],
            ['Any pair', '×1.25',  '#888888'],
            ['No match', '×0',     '#444444'],
            ['☠ ☠ ☠',  'LOSE ALL','#ff3333'],
        ];
        rows.forEach(([sym, pay, col], i) => {
            const ry = y + 20 + i * 24;
            this.add.text(x - 52, ry, sym, { fontSize: '11px', color: col }).setOrigin(0, 0.5);
            this.add.text(x + 46, ry, pay, { fontSize: '11px', color: col, fontStyle: 'bold' }).setOrigin(1, 0.5);
        });
    }

    // ── Bet helpers ────────────────────────────────────────────────────
    _mkBtn(x, y, label, cb) {
        const btn = this.add.text(x, y, label, {
            fontSize: '11px', color: '#888888',
            backgroundColor: '#0e0e22', padding: { x: 8, y: 5 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout',  () => btn.setColor('#888888'));
        btn.on('pointerdown', cb);
        return btn;
    }

    _adjustBet(delta) {
        if (this._spinning) return;
        this._typingMode = false;
        this._bet = Phaser.Math.Clamp(this._bet + delta, 1, Math.max(1, this.coins));
        this._typedBet = String(this._bet);
        this.betTxt.setText(`${this._bet}`).setColor('#ffffff');
        this.typingHint.setText('');
    }

    _setBetMax() {
        if (this._spinning) return;
        this._bet = Math.max(1, this.coins);
        this._typedBet = String(this._bet);
        this.betTxt.setText(`${this._bet}`).setColor('#ffd700');
        this.typingHint.setText('');
    }

    _startTyping() {
        if (this._spinning) return;
        this._typingMode = true;
        this._typedBet   = '';
        this.betTxt.setText('|').setColor('#aaddff');
        this.typingHint.setText('Type amount  •  ENTER to confirm');
    }

    _onKey(e) {
        if (this._spinning) return;
        if (e.key === 'Escape') { this._close(); return; }
        if (e.key === 'Enter' && !this._spinning) {
            if (this._typingMode) {
                const parsed = parseInt(this._typedBet, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    this._bet = Phaser.Math.Clamp(parsed, 1, Math.max(1, this.coins));
                }
                this._typingMode = false;
                this.betTxt.setText(`${this._bet}`).setColor('#ffffff');
                this.typingHint.setText('');
            } else {
                this._spin();
            }
            return;
        }
        if (!this._typingMode) return;
        if (e.key === 'Backspace') {
            this._typedBet = this._typedBet.slice(0, -1);
        } else if (/^[0-9]$/.test(e.key)) {
            this._typedBet += e.key;
        }
        this.betTxt.setText((this._typedBet || '') + '|').setColor('#aaddff');
    }

    // ── Spin ───────────────────────────────────────────────────────────
    _spin() {
        if (this._spinning || this._bet < 1 || this.coins < 1) return;
        const bet = Math.min(this._bet, this.coins);

        this._spinning = true;
        this._typingMode = false;
        this.typingHint.setText('');
        this.spinBtn.setBackgroundColor('#887700').removeInteractive();
        this.resultTxt.setText('');

        // Deduct bet
        this.coins -= bet;
        this.registry.set('coins', this.coins);
        this.coinDisplay.setText(`⬡  ${this.coins}  COINS`);

        // Determine results now (revealed sequentially)
        const results = [this._pick(), this._pick(), this._pick()];

        // Spin each reel, stopping left→right
        this._reels.forEach((reel, i) => {
            this._animateReel(reel, results[i], i, i === 2, bet, results);
        });
    }

    _pick() {
        return POOL[Phaser.Math.Between(0, POOL.length - 1)];
    }

    _animateReel(reel, finalSym, index, isLast, bet, allResults) {
        const stopDelay = 900 + index * 550;  // reel 0 stops first, reel 2 last
        let counter = 0;

        // Fast phase
        const fastTimer = this.time.addEvent({
            delay: 55, loop: true,
            callback: () => {
                const s = POOL[counter % POOL.length];
                counter++;
                reel.mainTxt.setText(s.char).setColor(s.color).setAlpha(0.88);
                reel.topBlur.setText(POOL[(counter + 3) % POOL.length].char).setAlpha(0.35);
                reel.botBlur.setText(POOL[(counter + 6) % POOL.length].char).setAlpha(0.35);
            },
        });

        // Slow phase (400ms before stop)
        this.time.delayedCall(stopDelay - 400, () => {
            fastTimer.remove();
            const slowTimer = this.time.addEvent({
                delay: 140, loop: true,
                callback: () => {
                    const s = POOL[counter % POOL.length];
                    counter++;
                    reel.mainTxt.setText(s.char).setColor(s.color);
                    reel.topBlur.setText(POOL[(counter + 2) % POOL.length].char).setAlpha(0.2);
                    reel.botBlur.setText(POOL[(counter + 4) % POOL.length].char).setAlpha(0.2);
                },
            });

            // Land
            this.time.delayedCall(400, () => {
                slowTimer.remove();
                reel.topBlur.setAlpha(0);
                reel.botBlur.setAlpha(0);
                reel.mainTxt.setText(finalSym.char).setColor(finalSym.color).setAlpha(1);

                // Thud bounce
                this.tweens.add({
                    targets: reel.mainTxt,
                    scaleX: 1.35, scaleY: 1.35,
                    duration: 90, yoyo: true, ease: 'Cubic.easeOut',
                });

                if (isLast) {
                    this.time.delayedCall(350, () => this._resolve(bet, allResults));
                }
            });
        });
    }

    // ── Resolve ────────────────────────────────────────────────────────
    _resolve(bet, results) {
        const key = results.map(r => r.char).join('-');
        let payout = PAYOUTS[key] ?? null;

        if (!payout) {
            const chars = results.map(r => r.char);
            const pair = chars[0] === chars[1] || chars[1] === chars[2] || chars[0] === chars[2];
            if (pair) payout = { mult: 1.25, label: 'PAIR!  Small win!', color: '#aaaaaa' };
        }

        if (!payout) {
            payout = { mult: 0, label: 'No match.  Better luck next time!', color: '#444466' };
        }

        // ── Skull jackpot ──────────────────────────────────────────
        if (payout.mult === -1) {
            const lost = this.coins;
            this.coins = 0;
            this.registry.set('coins', 0);
            this.coinDisplay.setText('⬡  0  COINS');
            this.betTxt.setText('0').setColor('#ff4444');
            this.resultTxt.setText(payout.label).setColor(payout.color);

            this.cameras.main.shake(700, 0.022);
            this.cameras.main.flash(500, 200, 0, 0);
            this._spawnParticles(false, false, 18);

            // Ominous red pulse on machine
            const pulse = this.add.rectangle(640, 305, 760, 210, 0xff0000, 0).setDepth(20);
            this.tweens.add({ targets: pulse, alpha: 0.18, duration: 180, yoyo: true, repeat: 3 });

            this.spinBtn.setAlpha(0.3).setText('OUT OF COINS');
            this._spinning = false;
            this._bet = 0;
            return;
        }

        // ── Normal payout ──────────────────────────────────────────
        const winCoins = Math.round(bet * payout.mult);
        this.coins += winCoins;
        this.registry.set('coins', this.coins);
        this.coinDisplay.setText(`⬡  ${this.coins}  COINS`);

        const profit = winCoins - bet;
        this.resultTxt.setText(payout.label).setColor(payout.color);

        if (profit > 0) {
            this._spawnParticles(true, payout.mult >= 4, payout.mult >= 4 ? 24 : 10);
            if (payout.mult >= 6) {
                // 7-7-7 jackpot
                this.cameras.main.flash(400, 255, 215, 0);
                this.cameras.main.shake(300, 0.01);
                this._jackpotFlash();
            } else if (payout.mult >= 3) {
                this.cameras.main.flash(250, 200, 160, 0, false, null, this);
            }
        }

        // Re-clamp bet
        this._bet = Phaser.Math.Clamp(this._bet, 1, Math.max(1, this.coins));
        this._typedBet = String(this._bet);
        this.betTxt.setText(`${this._bet}`).setColor('#ffffff');

        this._spinning = false;
        if (this.coins > 0) {
            this.spinBtn
                .setText('🎰   PULL THE LEVER')
                .setBackgroundColor('#ffd700')
                .setInteractive({ useHandCursor: true });
        } else {
            this.spinBtn.setAlpha(0.3).setText('OUT OF COINS');
        }
    }

    // ── Particles ──────────────────────────────────────────────────────
    _spawnParticles(isWin, isBig, count) {
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 35, () => {
                const x   = 640 + Phaser.Math.Between(-320, 320);
                const y   = 420;
                const txt = this.add.text(x, y, isWin ? '⬡' : '✕', {
                    fontSize: isBig ? '26px' : '16px',
                    color: isWin ? '#ffd700' : '#ff2222',
                }).setOrigin(0.5).setDepth(20);

                this.tweens.add({
                    targets: txt,
                    y: isWin ? y - Phaser.Math.Between(140, 260) : y + 80,
                    x: x + Phaser.Math.Between(-60, 60),
                    alpha: 0,
                    scaleX: isBig ? 1.8 : 1,
                    scaleY: isBig ? 1.8 : 1,
                    duration: 700 + Math.random() * 400,
                    ease: 'Quad.easeOut',
                    onComplete: () => txt.destroy(),
                });
            });
        }
    }

    _jackpotFlash() {
        // Rapidly cycle reel tints
        const colors = [0xff4655, 0xffd700, 0x00e5ff, 0x44ff88];
        let ci = 0;
        const t = this.time.addEvent({
            delay: 80, repeat: 16,
            callback: () => {
                this._reels.forEach(r => r.mainTxt.setTint(colors[ci % colors.length]));
                ci++;
            },
        });
        this.time.delayedCall(1400, () => this._reels.forEach(r => r.mainTxt.clearTint()));
    }

    // ── Close ──────────────────────────────────────────────────────────
    _close() {
        this.registry.set('casinoClosed', true);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
