const MODIFIERS = [
    { id: 'blessed_start', type: 'boon',      name: 'BLESSED START',  desc: 'Begin with one extra\nrandom upgrade.', color: '#44ff88', hex: 0x44ff88, icon: '✦' },
    { id: 'loaded',        type: 'boon',      name: 'LOADED',         desc: 'Start with 400 bonus coins\nto spend in shops.',  color: '#ffd700', hex: 0xffd700, icon: '⬡' },
    { id: 'iron_skin',     type: 'boon',      name: 'IRON SKIN',      desc: '+30 max HP\nfor this entire run.', color: '#66bbff', hex: 0x66bbff, icon: '🛡' },
    { id: 'quick_hands',   type: 'boon',      name: 'QUICK HANDS',    desc: 'Attack speed is\n15% faster from the start.', color: '#ff8844', hex: 0xff8844, icon: '⚡' },
    { id: 'fragile',       type: 'curse',     name: 'FRAGILE',        desc: '-20 max HP. But gain\nan extra upgrade every 5 floors.', color: '#ff4655', hex: 0xff4655, icon: '💀' },
    { id: 'drought',       type: 'curse',     name: 'DROUGHT',        desc: 'Health drops disabled.\nCoin drops are doubled.', color: '#cc8800', hex: 0xcc8800, icon: '⚠' },
    { id: 'glass_cannon',  type: 'challenge', name: 'GLASS CANNON',   desc: '-40 max HP.\nAll damage you deal +50%.', color: '#ff6600', hex: 0xff6600, icon: '💥' },
    { id: 'speedrunner',   type: 'challenge', name: 'SPEEDRUNNER',    desc: 'Void timer is 30% faster.\nEarn 2× coins from every kill.', color: '#cc44ff', hex: 0xcc44ff, icon: '⏱' },
    { id: 'punching_bags', type: 'challenge', name: 'PUNCHING BAGS',  desc: 'Enemies have 50% more HP.\nYou deal 25% more damage.', color: '#ff8800', hex: 0xff8800, icon: '👊' },
];

const TYPE_LABEL = { boon: 'BOON', curse: 'CURSE', challenge: 'CHALLENGE' };
const TYPE_COLOR = { boon: '#44ff88', curse: '#ff4655', challenge: '#ff8800' };

export default class RunModifierScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RunModifierScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Pick 3 unique modifiers
        const pool = [...MODIFIERS];
        Phaser.Utils.Array.Shuffle(pool);
        const picks = pool.slice(0, 3);

        // Background
        this.add.rectangle(W / 2, H / 2, W, H, 0x08080f);
        this.add.rectangle(W / 2, 0, W, 3, 0xff4655).setOrigin(0.5, 0);

        this.add.text(W / 2, 50, 'CHOOSE YOUR PATH', {
            fontSize: '42px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', fontStyle: 'bold', letterSpacing: 5,
        }).setOrigin(0.5);

        this.add.text(W / 2, 100, 'Select a modifier that will shape your entire run', {
            fontSize: '14px', color: '#555555', letterSpacing: 2,
        }).setOrigin(0.5);

        // Cards
        const cardW  = 300, cardH = 360;
        const startX = W / 2 - 340;
        const cardY  = H / 2 + 30;

        picks.forEach((mod, i) => {
            const cx = startX + i * 340;
            this._makeCard(cx, cardY, cardW, cardH, mod, i + 1);
        });

        // Skip option
        const skipTxt = this.add.text(W / 2, H - 44, 'SKIP — play with no modifier', {
            fontSize: '13px', color: '#333333', letterSpacing: 2,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        skipTxt.on('pointerover', () => skipTxt.setColor('#888888'));
        skipTxt.on('pointerout',  () => skipTxt.setColor('#333333'));
        skipTxt.on('pointerdown', () => this._pick(null));

        // Keyboard 1/2/3
        this.input.keyboard.once('keydown-ONE',   () => this._pick(picks[0]));
        this.input.keyboard.once('keydown-TWO',   () => this._pick(picks[1]));
        this.input.keyboard.once('keydown-THREE', () => this._pick(picks[2]));
        this.input.keyboard.once('keydown-ESC',   () => this._pick(null));

        // Fade in
        this.cameras.main.setAlpha(0);
        this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 400, ease: 'Power2' });
    }

    _makeCard(cx, cy, w, h, mod, num) {
        const border = this.add.rectangle(cx, cy, w, h, 0x000000)
            .setStrokeStyle(2, mod.hex, 0.4).setFillStyle(0x0d0d1a);

        const typeTxt = this.add.text(cx, cy - h / 2 + 22, TYPE_LABEL[mod.type], {
            fontSize: '10px', color: TYPE_COLOR[mod.type], letterSpacing: 3, fontFamily: 'Arial',
        }).setOrigin(0.5);

        this.add.text(cx, cy - h / 2 + 58, mod.icon, { fontSize: '38px' }).setOrigin(0.5);

        this.add.text(cx, cy - h / 2 + 108, mod.name, {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: mod.color, fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5);

        this.add.rectangle(cx, cy - h / 2 + 134, w - 40, 1, 0x222233);

        this.add.text(cx, cy - h / 2 + 160, mod.desc, {
            fontSize: '14px', color: '#aaaaaa', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0);

        // Key hint
        this.add.text(cx, cy + h / 2 - 38, `Press ${num}`, {
            fontSize: '11px', color: '#333344', letterSpacing: 2,
        }).setOrigin(0.5);

        // Select button
        const btnBg = this.add.rectangle(cx, cy + h / 2 - 18, w - 20, 36, mod.hex, 0.15);
        const btnTxt = this.add.text(cx, cy + h / 2 - 18, 'SELECT', {
            fontSize: '14px', fontFamily: 'Arial Black, Arial',
            color: mod.color, letterSpacing: 4,
        }).setOrigin(0.5);

        border.setInteractive({ useHandCursor: true });
        border.on('pointerover', () => {
            border.setStrokeStyle(2, mod.hex, 1);
            btnBg.setAlpha(0.4);
            this.tweens.add({ targets: border, scaleX: 1.02, scaleY: 1.02, duration: 120 });
        });
        border.on('pointerout', () => {
            border.setStrokeStyle(2, mod.hex, 0.4);
            btnBg.setAlpha(0.15);
            this.tweens.add({ targets: border, scaleX: 1, scaleY: 1, duration: 120 });
        });
        border.on('pointerdown', () => this._pick(mod));
    }

    _pick(mod) {
        this.registry.set('runModifier', mod ? mod.id : null);
        this.cameras.main.fade(300, 0, 0, 0, false, (cam, t) => {
            if (t === 1) this.scene.start('GameScene');
        });
    }
}
