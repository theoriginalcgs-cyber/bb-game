const RESTRICTION_LABELS = {
    no_jump:     'NO JUMPING',
    speed_demon: 'ENEMIES ARE FASTER',
    time_limit:  '45-SECOND LIMIT',
};
const RESTRICTION_COLORS = {
    no_jump:     '#ff6b6b',
    speed_demon: '#ff8c00',
    time_limit:  '#ffcc00',
};
const RESTRICTION_HINTS = {
    no_jump:     'Your jump key is disabled for this challenge',
    speed_demon: 'All enemies move at 2× speed',
    time_limit:  'Clear all 3 waves before the timer hits zero',
};

export default class EventScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EventScene' });
    }

    init(data) {
        this.type        = data.type;
        this.restriction = data.restriction || null;
        this.floor       = data.floor || 1;
        this._timerEvent = null;
    }

    create() {
        const W = this.scale.width;

        if (this.type === 'puzzle') {
            this._createPuzzleUI(W);
        } else {
            this._createMinigameUI(W);
        }

        this.scene.bringToTop();
    }

    // ─── Puzzle UI ──────────────────────────────────────────────────────────
    _createPuzzleUI(W) {
        const bg = this.add.rectangle(W / 2, 112, W, 86, 0x000000, 0.84).setOrigin(0.5);

        this.add.text(W / 2, 88, '⏱  PLATFORMING CHALLENGE', {
            fontSize: '22px', color: '#00e5ff', fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, 118, 'Reach the exit before time runs out for a  BONUS UPGRADE', {
            fontSize: '12px', color: '#888888',
        }).setOrigin(0.5);

        this.timerTxt = this.add.text(W / 2, 144, '30', {
            fontSize: '18px', color: '#ffcc00', fontStyle: 'bold',
        }).setOrigin(0.5);

        this._seconds    = 30;
        this._timerEvent = this.time.addEvent({
            delay: 1000, repeat: 30,
            callback: () => {
                this._seconds--;
                if (this._seconds <= 0) {
                    this._puzzleTimeout();
                    return;
                }
                this.timerTxt.setText(`${this._seconds}`);
                if (this._seconds <= 10) this.timerTxt.setColor('#ff4444');
            },
        });
    }

    _puzzleTimeout() {
        this._timerEvent?.remove();
        this._timerEvent = null;
        this.registry.set('puzzleExpired', true);
        this.timerTxt.setText("TIME'S UP").setColor('#ff2222').setFontSize('16px');
        this.time.delayedCall(1800, () => { if (this.scene.isActive()) this.scene.stop(); });
    }

    // ─── Minigame UI ────────────────────────────────────────────────────────
    _createMinigameUI(W) {
        this.add.rectangle(W / 2, 120, W, 96, 0x000000, 0.84).setOrigin(0.5);

        const label = RESTRICTION_LABELS[this.restriction] || 'CHALLENGE';
        const color = RESTRICTION_COLORS[this.restriction] || '#ffffff';
        const hint  = RESTRICTION_HINTS[this.restriction]  || '';

        this.add.text(W / 2, 88, `⚔  MINIGAME — ${label}`, {
            fontSize: '20px', color, fontStyle: 'bold', letterSpacing: 3,
        }).setOrigin(0.5);

        this.add.text(W / 2, 116, hint, {
            fontSize: '11px', color: '#777777',
        }).setOrigin(0.5);

        this.waveTxt = this.add.text(W / 2, 140, 'WAVE  1 / 3', {
            fontSize: '14px', color: '#aaaaaa', fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5);

        this.add.text(W / 2, 158, 'Clear all waves for a  UNIQUE REWARD', {
            fontSize: '10px', color: '#555555',
        }).setOrigin(0.5);

        // Time-limit countdown
        if (this.restriction === 'time_limit') {
            this.timeTxt = this.add.text(W - 16, 96, '45s', {
                fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
            }).setOrigin(1, 0.5);

            this._seconds    = 45;
            this._timerEvent = this.time.addEvent({
                delay: 1000, repeat: 45,
                callback: () => {
                    this._seconds--;
                    if (this._seconds <= 0) {
                        this.registry.set('minigameFailed', true);
                        this.timeTxt.setText('0s').setColor('#ff2222');
                        this._timerEvent?.remove();
                        return;
                    }
                    this.timeTxt.setText(`${this._seconds}s`);
                    if (this._seconds <= 10) this.timeTxt.setColor('#ff4444');
                },
            });
        }

        // Watch for wave updates from GameScene via registry
        this._onWaveChange = (_, val) => {
            if (val > 0 && this.waveTxt) this.waveTxt.setText(`WAVE  ${val} / 3`);
        };
        this.registry.events.on('changedata-minigameWave', this._onWaveChange, this);
    }

    shutdown() {
        this._timerEvent?.remove();
        this._timerEvent = null;
        if (this._onWaveChange) {
            this.registry.events.off('changedata-minigameWave', this._onWaveChange, this);
        }
    }
}
