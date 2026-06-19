export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const W = this.scale.width;

        // Semi-transparent top bar
        this.add.rectangle(0, 0, W, 80, 0x000000, 0.5).setOrigin(0, 0);

        // HP icon + bar
        this.add.text(16, 14, '❤', { fontSize: '22px' });
        this.hpBg  = this.add.rectangle(46, 20, 210, 20, 0x333333).setOrigin(0, 0);
        this.hpFill = this.add.rectangle(46, 20, 210, 20, 0xff4655).setOrigin(0, 0);
        this.hpTxt  = this.add.text(48, 22, '', { fontSize: '13px', color: '#ffffff' });

        // Ability icon + bar
        this.add.text(16, 48, '⚡', { fontSize: '16px', color: '#00e5ff' });
        this.abBg   = this.add.rectangle(46, 52, 210, 12, 0x333333).setOrigin(0, 0);
        this.abFill = this.add.rectangle(46, 52, 0, 12, 0x00e5ff).setOrigin(0, 0);
        this.abTxt  = this.add.text(260, 50, 'E: ABILITY', { fontSize: '11px', color: '#555555' });

        // Floor counter (center)
        this.floorTxt = this.add.text(W / 2, 16, 'FLOOR 1', {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5, 0);

        // Agent name (center)
        this.agentTxt = this.add.text(W / 2, 42, '', {
            fontSize: '12px', color: '#888888', letterSpacing: 3,
        }).setOrigin(0.5, 0);

        // Enemy counter (right)
        this.enemyTxt = this.add.text(W - 16, 16, '', {
            fontSize: '14px', color: '#cccccc',
        }).setOrigin(1, 0);

        // Coin counter (right, below enemy count)
        this.coinTxt = this.add.text(W - 16, 38, '', {
            fontSize: '13px', color: '#ffd700',
        }).setOrigin(1, 0);

        // Status message
        this.statusTxt = this.add.text(W / 2, 680, '', {
            fontSize: '18px', color: '#ffcc00', fontStyle: 'bold',
        }).setOrigin(0.5);

        // Boss HP bar — just below the top HUD strip
        this.bossPanelBg  = this.add.rectangle(W / 2, 80, W, 38, 0x000000, 0.72).setOrigin(0.5, 0).setVisible(false);
        this.bossLabel    = this.add.text(W / 2, 83, '', {
            fontSize: '12px', color: '#ff4444', fontStyle: 'bold', letterSpacing: 3,
        }).setOrigin(0.5, 0).setVisible(false);
        this.bossBg       = this.add.rectangle(W / 2, 97, 600, 14, 0x330000).setOrigin(0.5, 0).setVisible(false);
        this.bossFill     = this.add.rectangle(W / 2 - 298, 97, 0, 14, 0xff2222).setOrigin(0, 0).setVisible(false);
        this.bossHpTxt    = this.add.text(W / 2, 113, '', {
            fontSize: '10px', color: '#ff8888',
        }).setOrigin(0.5, 0).setVisible(false);

        // Mini-boss HP bar — same position, orange theme
        this.minibossPanelBg  = this.add.rectangle(W / 2, 80, W, 38, 0x000000, 0.72).setOrigin(0.5, 0).setVisible(false);
        this.minibossLabel    = this.add.text(W / 2, 83, '', {
            fontSize: '12px', color: '#ff8800', fontStyle: 'bold', letterSpacing: 3,
        }).setOrigin(0.5, 0).setVisible(false);
        this.minibossBg       = this.add.rectangle(W / 2, 97, 500, 14, 0x331100).setOrigin(0.5, 0).setVisible(false);
        this.minibossFill     = this.add.rectangle(W / 2 - 248, 97, 0, 14, 0xff8800).setOrigin(0, 0).setVisible(false);
        this.minibossHpTxt    = this.add.text(W / 2, 113, '', {
            fontSize: '10px', color: '#ffaa55',
        }).setOrigin(0.5, 0).setVisible(false);

        // Curse banner (shown just below the top bar)
        this.curseBg  = this.add.rectangle(W / 2, 80, W, 22, 0x330000, 0.92).setOrigin(0.5, 0).setVisible(false);
        this.curseTxt = this.add.text(W / 2, 85, '', {
            fontSize: '12px', color: '#ff6666', fontStyle: 'bold',
        }).setOrigin(0.5, 0).setVisible(false);

        // Controls hint (fades)
        this.controlHint = this.add.text(W / 2, 710, 'WASD: Move  |  W/SPACE: Jump  |  Z/CLICK: Shoot  |  E/SHIFT: Ability', {
            fontSize: '11px', color: '#444444',
        }).setOrigin(0.5);
        this.time.delayedCall(6000, () => {
            this.tweens.add({ targets: this.controlHint, alpha: 0, duration: 1200 });
        });

        this.registry.events.on('changedata', this.refresh, this);
        this.events.once('shutdown', () => {
            this.registry.events.off('changedata', this.refresh, this);
        });
    }

    refresh() {
        const hp      = this.registry.get('playerHp')      ?? 100;
        const maxHp   = this.registry.get('playerMaxHp')   ?? 100;
        const floor   = this.registry.get('floor')         ?? 1;
        const ability = this.registry.get('abilityReady')  ?? 0;
        const agent   = this.registry.get('agentKey')      ?? 'jett';
        const enemies = this.registry.get('enemyCount')    ?? 0;
        const done    = this.registry.get('roomDone')      ?? false;
        const coins   = this.registry.get('coins')         ?? 0;

        // HP bar
        const pct = Math.max(0, hp / maxHp);
        this.hpFill.width = 210 * pct;
        const col = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        this.hpFill.setFillStyle(col);
        this.hpTxt.setText(`${Math.ceil(hp)} / ${maxHp}`);

        // Ability bar
        this.abFill.width = 210 * Math.min(1, ability);
        const abilityNames = { jett: 'DASH', phoenix: 'FIREBALL', sage: 'HEAL', reyna: 'DEVOUR' };
        const abReady = ability >= 1;
        this.abTxt.setText(`E: ${abilityNames[agent] || 'ABILITY'}${abReady ? ' ✓' : ''}`);
        this.abTxt.setColor(abReady ? '#00e5ff' : '#555555');

        // Floor
        this.floorTxt.setText(`FLOOR ${floor}`);

        // Agent
        this.agentTxt.setText(agent.toUpperCase());

        // Enemy count
        this.enemyTxt.setText(done ? '✓ ALL CLEAR' : `ENEMIES: ${enemies}`);
        this.enemyTxt.setColor(done ? '#44ff44' : '#cccccc');

        // Coins
        this.coinTxt.setText(`⬡ ${coins}`).setVisible(coins > 0);

        // Status
        this.statusTxt.setText(done ? '▶ REACH THE EXIT DOOR' : '');

        // Curse banner
        const curseLabels = {
            fragile:   '⚠ CURSE: FRAGILE — you take 25% more damage',
            sluggish:  '⚠ CURSE: SLUGGISH — movement speed reduced',
            drought:   '⚠ CURSE: DROUGHT — health drops disabled',
            frenzy:    '⚠ CURSE: FRENZY — enemies move 25% faster',
            fortified: '⚠ CURSE: FORTIFIED — enemies take 20% less damage',
        };
        const curse      = this.registry.get('activeCurse');
        const curseLabel = curse ? (curseLabels[curse] || '') : '';
        this.curseBg.setVisible(!!curseLabel);
        this.curseTxt.setVisible(!!curseLabel);
        if (curseLabel) this.curseTxt.setText(curseLabel);

        // Boss HP bar (top of screen)
        const bossActive = this.registry.get('bossActive') ?? false;
        const bossHp     = this.registry.get('bossHp')     ?? 0;
        const bossMaxHp  = this.registry.get('bossMaxHp')  ?? 1;
        const bossName   = this.registry.get('bossName')   ?? 'BOSS';

        this.bossPanelBg.setVisible(bossActive);
        this.bossLabel.setVisible(bossActive);
        this.bossBg.setVisible(bossActive);
        this.bossFill.setVisible(bossActive);
        this.bossHpTxt.setVisible(bossActive);

        if (bossActive) {
            const pct = Math.max(0, bossHp / bossMaxHp);
            this.bossFill.width = 596 * pct;
            this.bossFill.setFillStyle(pct > 0.5 ? 0xff2222 : pct > 0.25 ? 0xff6600 : 0xff0000);
            this.bossLabel.setText(bossName);
            this.bossHpTxt.setText(`${Math.ceil(bossHp)} / ${bossMaxHp}`);
        }

        // Mini-boss HP bar (top of screen, orange)
        const mbActive  = this.registry.get('minibossActive')  ?? false;
        const mbHp      = this.registry.get('minibossHp')      ?? 0;
        const mbMaxHp   = this.registry.get('minibossMaxHp')   ?? 1;
        const mbName    = this.registry.get('minibossName')    ?? 'ELITE';

        this.minibossPanelBg.setVisible(mbActive);
        this.minibossLabel.setVisible(mbActive);
        this.minibossBg.setVisible(mbActive);
        this.minibossFill.setVisible(mbActive);
        this.minibossHpTxt.setVisible(mbActive);

        if (mbActive) {
            const pct = Math.max(0, mbHp / mbMaxHp);
            this.minibossFill.width = 496 * pct;
            this.minibossFill.setFillStyle(pct > 0.5 ? 0xff8800 : pct > 0.25 ? 0xff4400 : 0xff0000);
            this.minibossLabel.setText(mbName);
            this.minibossHpTxt.setText(`${Math.ceil(mbHp)} / ${mbMaxHp}`);
        }
    }
}
