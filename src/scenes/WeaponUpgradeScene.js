const WEAPON_UPGRADES = {
    jett: [
        {
            level: 1, name: 'WINDSLASH', tag: 'WEAPON',
            desc: 'Every 5th bullet pierces through\nall enemies in its path.',
            color: '#4fc3f7',
        },
        {
            level: 2, name: 'TWIN BLADES', tag: 'WEAPON',
            desc: 'Each shot fires 2 simultaneous\nbullets in a tight spread.',
            color: '#4fc3f7',
        },
    ],
    phoenix: [
        {
            level: 1, name: 'HOT ROUNDS', tag: 'WEAPON',
            desc: 'Bullets explode on hit, dealing\n40% damage to nearby enemies.',
            color: '#ff7043',
        },
        {
            level: 2, name: 'OVERHEAT', tag: 'WEAPON',
            desc: 'Bullets during Run It Back\ndeal 40% increased damage.',
            color: '#ff7043',
        },
    ],
    sage: [
        {
            level: 1, name: 'CRYOSHOT', tag: 'WEAPON',
            desc: 'All bullets slow enemies\non hit for 1 second.',
            color: '#66bb6a',
        },
        {
            level: 2, name: 'BARRIER SHOT', tag: 'WEAPON',
            desc: 'Every 6th bullet grants\n+1 shield HP.',
            color: '#66bb6a',
        },
    ],
    reyna: [
        {
            level: 1, name: 'DRAIN ROUND', tag: 'WEAPON',
            desc: 'Every bullet hit restores\n2 HP to Reyna.',
            color: '#ce93d8',
        },
        {
            level: 2, name: 'EMPRESS MODE', tag: 'WEAPON',
            desc: 'During Devour, bullets deal\n40% increased damage.',
            color: '#ce93d8',
        },
    ],
};

export default class WeaponUpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WeaponUpgradeScene' });
    }

    init(data) {
        this.agentKey    = data.agentKey    || 'jett';
        this.weaponLevel = data.weaponLevel || 1;
        this._confirmed  = false;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(0);
        this.tweens.add({ targets: overlay, alpha: 0.92, duration: 300, ease: 'Sine.easeIn' });

        const upgrades = WEAPON_UPGRADES[this.agentKey] || [];
        const upg      = upgrades.find(u => u.level === this.weaponLevel);

        if (!upg) { this._confirm(); return; }

        const colorInt  = parseInt(upg.color.replace('#', ''), 16);

        // Header
        const header = this.add.text(W / 2, 55, 'WEAPON UPGRADE', {
            fontSize: '34px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        const sub = this.add.text(W / 2, 100, 'Boss defeated — your weapon evolves', {
            fontSize: '14px', color: '#666666', letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        // Agent portrait
        const portrait = this.add.image(W / 2, 215, `agent_${this.agentKey}`)
            .setScale(0).setDepth(1);

        // Badge
        const badge = this.add.text(W / 2, 308, `WEAPON TIER ${this.weaponLevel}`, {
            fontSize: '11px', color: upg.color, letterSpacing: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        // Card
        const cardW = 420, cardH = 180, cardY = 460;
        const cardBg     = this.add.rectangle(W / 2, cardY, cardW, cardH, 0x0c0808).setDepth(1);
        const cardBorder = this.add.rectangle(W / 2, cardY, cardW, cardH, 0x000000)
            .setStrokeStyle(2, colorInt).setFillStyle(0x000000, 0).setDepth(2);

        const tagTxt  = this.add.text(W / 2, cardY - 75, upg.tag, {
            fontSize: '11px', color: '#556655', letterSpacing: 3,
        }).setOrigin(0.5).setDepth(3);

        const nameTxt = this.add.text(W / 2, cardY - 54, upg.name, {
            fontSize: '24px', color: upg.color, fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5).setDepth(3);

        this.add.rectangle(W / 2, cardY - 30, cardW - 40, 1, 0x335533).setDepth(3);

        const descTxt = this.add.text(W / 2, cardY - 18, upg.desc, {
            fontSize: '14px', color: '#cccccc', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0).setDepth(3);

        const cardParts = [cardBg, cardBorder, tagTxt, nameTxt, descTxt];
        cardParts.forEach(p => p.setScale(0.5).setAlpha(0));

        // Confirm button
        const btnY   = cardY + cardH / 2 + 46;
        const btn    = this.add.rectangle(W / 2, btnY, 220, 46, colorInt).setDepth(1).setScale(0).setAlpha(0);
        const btnTxt = this.add.text(W / 2, btnY, 'EQUIP', {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 4,
        }).setOrigin(0.5).setDepth(2).setScale(0).setAlpha(0);

        // Entrance sequence
        this.tweens.add({ targets: [header, sub], alpha: 1, duration: 250, delay: 100 });
        this.tweens.add({ targets: portrait, scale: 2.8, alpha: 1, duration: 380, delay: 200, ease: 'Back.easeOut' });
        this.tweens.add({ targets: badge, alpha: 1, duration: 250, delay: 350 });
        this.tweens.add({ targets: cardParts, scale: 1, alpha: 1, duration: 420, delay: 420, ease: 'Back.easeOut' });
        this.tweens.add({
            targets: [btn, btnTxt], scale: 1, alpha: 1,
            duration: 300, delay: 700, ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: cardBorder, alpha: 0.5, yoyo: true, duration: 900, repeat: -1, ease: 'Sine.easeInOut' });
                btn.setInteractive({ useHandCursor: true });
                btn.on('pointerover', () => btn.setAlpha(0.75));
                btn.on('pointerout',  () => btn.setAlpha(1));
                btn.on('pointerdown', () => this._confirm());
                this.input.keyboard.once('keydown', () => this._confirm());
            },
        });

        this.scene.bringToTop();
    }

    _confirm() {
        if (this._confirmed) return;
        this._confirmed = true;
        this.registry.set('pickedWeapon', `weapon_tier_${this.weaponLevel}`);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
