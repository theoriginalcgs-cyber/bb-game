const ABILITY_UPGRADES = {
    jett: [
        {
            level: 1, name: 'COMBAT DASH', tag: 'MOBILITY',
            desc: 'Dashing through enemies deals 40 damage\nto all targets in your path.\nJett is invincible for the dash duration.',
            color: '#4fc3f7',
        },
        {
            level: 2, name: 'DAGGER ORBIT', tag: 'PASSIVE',
            desc: '3 blades orbit you permanently,\nautomatically intercepting\nenemy projectiles.',
            color: '#4fc3f7',
        },
    ],
    phoenix: [
        {
            level: 1, name: 'ENHANCED FIREBALL', tag: 'ABILITY',
            desc: 'Fireball grows 60% larger\nand deals 75 damage (was 50).',
            color: '#ff7043',
        },
        {
            level: 2, name: 'PURGE FIRE', tag: 'ABILITY',
            desc: 'Fireball now destroys\ntoxic ground hazards on contact.',
            color: '#ff7043',
        },
    ],
    sage: [
        {
            level: 1, name: 'ICE ORB', tag: 'ABILITY',
            desc: 'Ability now also throws an ice orb\nthat slows enemy movement and\nattack speed for 3 seconds.',
            color: '#66bb6a',
        },
        {
            level: 2, name: 'ICE SHIELD', tag: 'ABILITY',
            desc: 'Ice orb use also grants Sage\n2 shield HP that absorb damage.',
            color: '#66bb6a',
        },
    ],
    reyna: [
        {
            level: 1, name: 'FEEDING FRENZY', tag: 'ABILITY',
            desc: 'Devour now also grants\n50% faster attack speed\nfor the full devour duration.',
            color: '#ce93d8',
        },
        {
            level: 2, name: 'EMPRESS', tag: 'ABILITY',
            desc: 'Devour also grants +60 movement\nspeed and 1.5 seconds\nof full invincibility.',
            color: '#ce93d8',
        },
    ],
};

export default class AbilityUpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AbilityUpgradeScene' });
    }

    init(data) {
        this.agentKey     = data.agentKey     || 'jett';
        this.abilityLevel = data.abilityLevel || 1;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88);

        this.add.text(W / 2, 60, 'ABILITY UPGRADE', {
            fontSize: '34px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, 104, 'Boss defeated — your power grows', {
            fontSize: '14px', color: '#666666', letterSpacing: 2,
        }).setOrigin(0.5);

        const upgrades = ABILITY_UPGRADES[this.agentKey] || [];
        const upg      = upgrades.find(u => u.level === this.abilityLevel);

        if (!upg) { this._confirm(); return; }

        const colorInt = parseInt(upg.color.replace('#', ''), 16);

        // Agent portrait
        this.add.image(W / 2, 220, `agent_${this.agentKey}`).setScale(2.8);

        // Tier badge
        this.add.text(W / 2, 310, `TIER ${this.abilityLevel} UNLOCK`, {
            fontSize: '11px', color: upg.color, letterSpacing: 4,
        }).setOrigin(0.5);

        // Card
        const cardW = 380, cardH = 200, cardY = 460;
        this.add.rectangle(W / 2, cardY, cardW, cardH, 0x0a0a1a).setStrokeStyle(2, colorInt);

        this.add.text(W / 2, cardY - 80, upg.tag, {
            fontSize: '11px', color: '#555577', letterSpacing: 3,
        }).setOrigin(0.5);

        this.add.text(W / 2, cardY - 58, upg.name, {
            fontSize: '22px', color: upg.color, fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5);

        this.add.rectangle(W / 2, cardY - 34, cardW - 40, 1, 0x333355);

        this.add.text(W / 2, cardY - 22, upg.desc, {
            fontSize: '14px', color: '#cccccc', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0);

        // Confirm button
        const btnY = cardY + cardH / 2 + 44;
        const btn  = this.add.rectangle(W / 2, btnY, 220, 46, colorInt);
        this.add.text(W / 2, btnY, 'UNLOCK', {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 4,
        }).setOrigin(0.5);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setAlpha(0.75));
        btn.on('pointerout',  () => btn.setAlpha(1));
        btn.on('pointerdown', () => this._confirm());

        this.scene.bringToTop();
    }

    _confirm() {
        this.registry.set('pickedAbilityLevel', this.abilityLevel);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
