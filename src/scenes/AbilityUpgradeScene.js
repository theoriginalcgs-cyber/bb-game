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
        this._confirmed   = false;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Dark overlay fades in
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(0);
        this.tweens.add({ targets: overlay, alpha: 0.92, duration: 300, ease: 'Sine.easeIn' });

        const upgrades = ABILITY_UPGRADES[this.agentKey] || [];
        const upg      = upgrades.find(u => u.level === this.abilityLevel);

        if (!upg) { this._confirm(); return; }

        const colorInt  = parseInt(upg.color.replace('#', ''), 16);
        const tierLabel = this.abilityLevel === 1 ? 'NEW UNLOCK' : 'UPGRADE';

        // Header
        const header = this.add.text(W / 2, 55, 'ABILITY UPGRADE', {
            fontSize: '34px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        const sub = this.add.text(W / 2, 100, 'Boss defeated — your power grows', {
            fontSize: '14px', color: '#666666', letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        // Agent portrait
        const portrait = this.add.image(W / 2, 215, `agent_${this.agentKey}`)
            .setScale(0).setDepth(1);

        // Tier badge
        const badge = this.add.text(W / 2, 308, `${tierLabel}  ·  TIER ${this.abilityLevel}`, {
            fontSize: '11px', color: upg.color, letterSpacing: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(1);

        // Card container — starts scaled to 0, animates in
        const cardW = 420, cardH = 200, cardY = 466;

        const cardBg   = this.add.rectangle(W / 2, cardY, cardW, cardH, 0x080814).setDepth(1);
        const cardBorder = this.add.rectangle(W / 2, cardY, cardW, cardH, 0x000000)
            .setStrokeStyle(2, colorInt).setFillStyle(0x000000, 0).setDepth(2);

        const tagTxt  = this.add.text(W / 2, cardY - 82, upg.tag, {
            fontSize: '11px', color: '#555577', letterSpacing: 3,
        }).setOrigin(0.5).setDepth(3);

        const nameTxt = this.add.text(W / 2, cardY - 60, upg.name, {
            fontSize: '24px', color: upg.color, fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5).setDepth(3);

        this.add.rectangle(W / 2, cardY - 34, cardW - 40, 1, 0x333355).setDepth(3);

        const descTxt = this.add.text(W / 2, cardY - 22, upg.desc, {
            fontSize: '14px', color: '#cccccc', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0).setDepth(3);

        // Group card elements for unified scale animation
        const cardParts = [cardBg, cardBorder, tagTxt, nameTxt, descTxt];
        cardParts.forEach(p => p.setScale(0.5).setAlpha(0));

        // Confirm button
        const btnY = cardY + cardH / 2 + 46;
        const btn  = this.add.rectangle(W / 2, btnY, 220, 46, colorInt).setDepth(1).setScale(0).setAlpha(0);
        const btnTxt = this.add.text(W / 2, btnY, 'UNLOCK', {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 4,
        }).setOrigin(0.5).setDepth(2).setScale(0).setAlpha(0);

        // ── Entrance sequence ──────────────────────────────────────────────
        // 1. Header fades in
        this.tweens.add({ targets: [header, sub], alpha: 1, duration: 250, delay: 100 });

        // 2. Portrait pops in with slight overshoot
        this.tweens.add({
            targets: portrait, scale: 2.8, alpha: 1,
            duration: 380, delay: 200, ease: 'Back.easeOut',
        });

        // 3. Badge fades in
        this.tweens.add({ targets: badge, alpha: 1, duration: 250, delay: 350 });

        // 4. Card scales up with bounce
        this.tweens.add({
            targets: cardParts, scale: 1, alpha: 1,
            duration: 420, delay: 420, ease: 'Back.easeOut',
        });

        // 5. Button appears last
        this.tweens.add({
            targets: [btn, btnTxt], scale: 1, alpha: 1,
            duration: 300, delay: 700, ease: 'Back.easeOut',
            onComplete: () => {
                // Subtle glow pulse on card border
                this.tweens.add({
                    targets: cardBorder, alpha: 0.55, yoyo: true,
                    duration: 900, repeat: -1, ease: 'Sine.easeInOut',
                });

                // Enable input only after animation completes
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
        this.registry.set('pickedAbilityLevel', this.abilityLevel);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
