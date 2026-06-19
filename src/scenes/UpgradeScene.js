const ALL_UPGRADES = [
    { id: 'dmg_up',     name: 'FIREPOWER',    desc: '+6 bullet damage',                color: '#ff4655' },
    { id: 'speed_up',   name: 'SWIFT FEET',   desc: '+30 movement speed',              color: '#00e5ff' },
    { id: 'max_hp',     name: 'FORTIFY',      desc: '+25 max HP  |  restore 15 HP',    color: '#44ff88' },
    { id: 'atk_speed',  name: 'RAPID FIRE',   desc: 'Attack cooldown -60ms',           color: '#ffaa00' },
    { id: 'crit',       name: 'LETHAL',       desc: '+25% crit chance (2x damage)',    color: '#ff8800' },
    { id: 'multishot',  name: 'MULTISHOT',    desc: 'Stackable: 4th→2nd→every shot fires 3 bullets', color: '#ffff44' },
    { id: 'armor',      name: 'ARMOR',        desc: 'Take 15% less damage',            color: '#aaaaff' },
    { id: 'ability_cd', name: 'HASTE',        desc: 'Ability cooldown -15%',           color: '#40c4ff' },
    { id: 'lifedrain',  name: 'LIFEDRAIN',    desc: 'Kills restore 6 HP',              color: '#ce93d8' },
    { id: 'hp_regen',   name: 'REGENERATION', desc: 'Restore 2 HP every 2 seconds',   color: '#88ff88' },
    { id: 'ricochet',   name: 'RICOCHET',     desc: 'Bullets bounce off walls once',  color: '#ff8c00' },
    { id: 'shield',     name: 'SHIELD',       desc: 'Absorb 2 hits of damage (stackable)', color: '#4488ff' },
    { id: 'overload',   name: 'OVERLOAD',     desc: 'Every 8th bullet deals 3× damage\n(stacks reduce trigger to 4)', color: '#ff1744' },
];

export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data) {
        this.floor = data.floor || 1;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.9);

        this.add.text(W / 2, 72, 'CHOOSE AN UPGRADE', {
            fontSize: '34px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, 114, `Floor ${this.floor} cleared`, {
            fontSize: '14px', color: '#666666', letterSpacing: 2,
        }).setOrigin(0.5);

        const pool = [...ALL_UPGRADES];
        const picked = [];
        for (let i = 0; i < 3; i++) {
            const idx = Phaser.Math.Between(0, pool.length - 1);
            picked.push(pool.splice(idx, 1)[0]);
        }

        const cardW = 240;
        const cardH = 190;
        const cardY = 390;
        const gap   = 270;

        picked.forEach((upg, i) => {
            this.createCard(W / 2 + (i - 1) * gap, cardY, cardW, cardH, upg);
        });

        this.add.text(W / 2, H - 30, 'Click a card to select', {
            fontSize: '12px', color: '#333333', letterSpacing: 2,
        }).setOrigin(0.5);

        this.scene.bringToTop();
    }

    createCard(cx, cy, w, h, upg) {
        const colorInt = parseInt(upg.color.replace('#', ''), 16);
        const half     = h / 2;

        const bg = this.add.rectangle(cx, cy, w, h, 0x0d0d1a)
            .setStrokeStyle(2, 0x333355);

        this.add.text(cx, cy - half + 32, upg.name, {
            fontSize: '17px', color: upg.color, fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5);

        this.add.rectangle(cx, cy - half + 56, w - 30, 1, 0x333355);

        this.add.text(cx, cy - half + 70, upg.desc, {
            fontSize: '13px', color: '#bbbbbb', wordWrap: { width: w - 28 }, align: 'center',
        }).setOrigin(0.5, 0);

        this.add.text(cx, cy + half - 18, 'CLICK TO SELECT', {
            fontSize: '10px', color: '#444466', letterSpacing: 2,
        }).setOrigin(0.5);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setStrokeStyle(3, colorInt));
        bg.on('pointerout',  () => bg.setStrokeStyle(2, 0x333355));
        bg.on('pointerdown', () => this.pickUpgrade(upg.id));
    }

    pickUpgrade(id) {
        this.registry.set('pickedUpgrade', id);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
