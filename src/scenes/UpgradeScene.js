const ALL_UPGRADES = [
    { id: 'dmg_up',      name: 'FIREPOWER',      desc: '+6 bullet damage (stackable)',                   color: '#ff4655' },
    { id: 'speed_up',    name: 'SWIFT FEET',      desc: '+30 movement speed (stackable)',                 color: '#00e5ff' },
    { id: 'max_hp',      name: 'FORTIFY',         desc: '+25 max HP  |  restore 15 HP',                  color: '#44ff88' },
    { id: 'atk_speed',   name: 'RAPID FIRE',      desc: 'Attack cooldown −60ms (min 80ms)',              color: '#ffaa00' },
    { id: 'crit',        name: 'LETHAL',          desc: '+25% crit chance — 2× damage (cap 80%)',        color: '#ff8800' },
    { id: 'multishot',   name: 'MULTISHOT',       desc: 'Every 4th→2nd→every shot fires 3 bullets',     color: '#ffff44' },
    { id: 'armor',       name: 'ARMOR',           desc: 'Take 15% less damage (stackable)',              color: '#aaaaff' },
    { id: 'ability_cd',  name: 'HASTE',           desc: 'Ability cooldown −15% (min 500ms)',             color: '#40c4ff' },
    { id: 'lifedrain',   name: 'LIFEDRAIN',       desc: 'Kills restore 6 HP (stackable)',                color: '#ce93d8' },
    { id: 'hp_regen',    name: 'REGENERATION',    desc: 'Restore 2 HP every 2 seconds',                  color: '#88ff88' },
    { id: 'ricochet',    name: 'RICOCHET',        desc: 'Bullets bounce off walls once',                 color: '#ff8c00' },
    { id: 'shield',      name: 'SHIELD',          desc: '+2 shield (absorbs hits, regens each floor)',   color: '#4488ff' },
    { id: 'overload',    name: 'OVERLOAD',        desc: 'Every 8th bullet deals 3× damage\n(stack: 8→6→4 shot trigger)', color: '#ff1744' },
    { id: 'pierce',      name: 'PENETRATE',       desc: 'Bullets pierce through all enemies (up to 3 hits)', color: '#00ffcc' },
    { id: 'explosive',   name: 'EXPLOSIVE TIP',   desc: '30% chance each bullet explodes\n(60px AoE, 20 dmg) — stack to 60%', color: '#ff6600' },
    { id: 'leech_shot',  name: 'LEECH SHOT',      desc: 'Every bullet hit restores 1 HP',               color: '#ff69b4' },
    { id: 'executioner', name: 'EXECUTIONER',     desc: '+20% damage to enemies below 40% HP\n(stack: +40%)', color: '#9c27b0' },
    { id: 'counter',     name: 'COUNTER STRIKE',  desc: 'After taking damage: +60% dmg for 3s',         color: '#e91e63' },
    { id: 'last_stand',  name: 'LAST STAND',      desc: 'Once per floor: survive a lethal hit\n(+2s invincibility)', color: '#ffd700' },
    { id: 'double_tap',  name: 'DOUBLE TAP',      desc: 'Every 5th shot instantly fires a 2nd bullet',  color: '#00bcd4' },
    { id: 'crit_dmg',   name: 'KILLING BLOW',    desc: 'Crit damage +0.5× (starts 2×, stacks to 4×)', color: '#ffe033' },
];

function isUpgradeCapped(id, ps) {
    if (!ps) return false;
    switch (id) {
        case 'multishot':    return (ps.multishotLevel   || 0) >= 3;
        case 'overload':     return (ps.overloadLevel    || 0) >= 3;
        case 'crit':         return (ps.critChance       || 0) >= 0.8;
        case 'atk_speed':    return (ps.attackCdMax      || 999) <= 80;
        case 'ability_cd':   return (ps.abilityCdMax     || 999) <= 500;
        case 'hp_regen':     return !!ps.regenActive;
        case 'ricochet':     return (ps.upgrades || []).includes('ricochet');
        case 'pierce':       return (ps.upgrades || []).includes('pierce');
        case 'leech_shot':   return (ps.upgrades || []).includes('leech_shot');
        case 'counter':      return (ps.upgrades || []).includes('counter');
        case 'last_stand':   return (ps.upgrades || []).includes('last_stand');
        case 'double_tap':   return (ps.upgrades || []).includes('double_tap');
        case 'explosive':    return (ps.explosiveLevel   || 0) >= 2;
        case 'executioner':  return (ps.executionerLevel || 0) >= 2;
        case 'crit_dmg':     return (ps.critMultiplier   || 2.0) >= 4.0;
        default:             return false;
    }
}

export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data) {
        this.floor = data.floor || 1;
        this.playerState = data.playerState || {};
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

        const ps = this.playerState;
        const pool = ALL_UPGRADES.filter(u => !isUpgradeCapped(u.id, ps));
        const picked = [];
        const available = [...pool];
        for (let i = 0; i < Math.min(3, available.length); i++) {
            const idx = Phaser.Math.Between(0, available.length - 1);
            picked.push(available.splice(idx, 1)[0]);
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
