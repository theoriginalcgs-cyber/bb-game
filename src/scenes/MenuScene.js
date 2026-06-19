export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedIndex = 0;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Background grid
        this.add.rectangle(W / 2, H / 2, W, H, 0x0f1923);
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1a2a3a, 0.4);
        for (let x = 0; x < W; x += 64) grid.lineBetween(x, 0, x, H);
        for (let y = 0; y < H; y += 64) grid.lineBetween(0, y, W, y);

        // Red accent line
        this.add.rectangle(W / 2, 148, W, 3, 0xff4655);

        // Title
        this.add.text(W / 2, 60, 'VALORANT', {
            fontSize: '68px', fontFamily: 'Arial Black, Arial',
            color: '#ff4655', fontStyle: 'bold', letterSpacing: 14,
        }).setOrigin(0.5);

        this.add.text(W / 2, 126, 'R O G U E L I T E', {
            fontSize: '22px', fontFamily: 'Arial',
            color: '#ffffff', letterSpacing: 10,
        }).setOrigin(0.5);

        this.add.text(W / 2, 180, 'SELECT YOUR AGENT', {
            fontSize: '15px', fontFamily: 'Arial',
            color: '#888888', letterSpacing: 5,
        }).setOrigin(0.5);

        // Agent data
        this.agents = [
            {
                key: 'jett', name: 'JETT', role: 'Duelist',
                ability: 'E — DASH', color: '#4fc3f7',
                desc: 'Fastest agent.\nDouble jump + forward dash.\nBest for aggressive plays.',
                hp: 5, spd: 5, dmg: 3,
            },
            {
                key: 'phoenix', name: 'PHOENIX', role: 'Duelist',
                ability: 'E — FIREBALL', color: '#ff7043',
                desc: 'Explosive damage.\nThrows a powerful fireball\nthat melts through enemies.',
                hp: 4, spd: 3, dmg: 5,
            },
            {
                key: 'sage', name: 'SAGE', role: 'Sentinel',
                ability: 'E — HEAL', color: '#66bb6a',
                desc: 'Highest survivability.\nExtra health pool and\non-demand healing.',
                hp: 5, spd: 2, dmg: 3,
            },
            {
                key: 'reyna', name: 'REYNA', role: 'Duelist',
                ability: 'E — DEVOUR', color: '#ce93d8',
                desc: 'Life-stealing predator.\nKilling enemies restores\nyour health on ability.',
                hp: 3, spd: 4, dmg: 4,
            },
        ];

        // Cards
        const cardW = 160;
        const cardH = 200;
        const gap = 28;
        const totalW = this.agents.length * (cardW + gap) - gap;
        const startX = (W - totalW) / 2 + cardW / 2;
        const cardY = 360;

        this.cards = [];
        this.highlightBorder = this.add.graphics();

        this.agents.forEach((agent, i) => {
            const x = startX + i * (cardW + gap);
            const container = this.add.container(x, cardY);

            const bg = this.add.image(0, 0, `card_${agent.key}`);
            const agentImg = this.add.image(0, -20, `agent_${agent.key}`).setScale(1.6);
            const nameTxt = this.add.text(0, 76, agent.name, {
                fontSize: '17px', fontFamily: 'Arial Black, Arial',
                color: agent.color, fontStyle: 'bold',
            }).setOrigin(0.5);
            const roleTxt = this.add.text(0, 96, agent.role.toUpperCase(), {
                fontSize: '10px', fontFamily: 'Arial', color: '#666666', letterSpacing: 2,
            }).setOrigin(0.5);

            container.add([bg, agentImg, nameTxt, roleTxt]);
            container.setSize(cardW, cardH);
            container.setInteractive({ useHandCursor: true });

            container.on('pointerover', () => {
                if (this.selectedIndex !== i) container.setScale(1.05);
            });
            container.on('pointerout', () => {
                if (this.selectedIndex !== i) container.setScale(1);
            });
            container.on('pointerdown', () => this.selectAgent(i));

            this.cards.push({ container, x, y: cardY, agent });
        });

        // Info panel
        const panelY = 520;
        this.infoName = this.add.text(W / 2, panelY - 36, '', {
            fontSize: '26px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.infoAbility = this.add.text(W / 2, panelY - 6, '', {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffcc00', letterSpacing: 2,
        }).setOrigin(0.5);
        this.infoDesc = this.add.text(W / 2, panelY + 28, '', {
            fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa', align: 'center', lineSpacing: 4,
        }).setOrigin(0.5);

        // Stat bars
        this.statBars = this.createStatBars(W / 2, panelY + 90);

        // Start button
        const btnY = 668;
        const btnBg = this.add.rectangle(W / 2, btnY, 240, 48, 0xff4655);
        this.add.text(W / 2, btnY, 'START RUN', {
            fontSize: '20px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 4,
        }).setOrigin(0.5);
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerover', () => btnBg.setFillStyle(0xcc2233));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xff4655));
        btnBg.on('pointerdown', () => this.startGame());

        // Debug: quick casino test button
        const testBtn = this.add.text(W / 2, 700, "[ TEST: CAMMY'S CASINO ]", {
            fontSize: '11px', fontFamily: 'Arial', color: '#886600', letterSpacing: 1,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        testBtn.on('pointerover', () => testBtn.setColor('#ffd700'));
        testBtn.on('pointerout',  () => testBtn.setColor('#886600'));
        testBtn.on('pointerdown', () => this.startCasinoTest());

        // Boss test dropdown
        this._bossDropOpen = false;
        const bossToggle = this.add.text(W / 2, 716, '[ TEST BOSS ▾ ]', {
            fontSize: '11px', fontFamily: 'Arial', color: '#555588', letterSpacing: 1,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        bossToggle.on('pointerover', () => bossToggle.setColor('#8888ff'));
        bossToggle.on('pointerout',  () => bossToggle.setColor(this._bossDropOpen ? '#8888ff' : '#555588'));

        const bossList   = ['viper','blaze','phantom','titan','storm','killjoy','chamber','kayo'];
        const bossLabels = ['VIPER','BLAZE','PHANTOM','TITAN','STORM','KILLJOY','CHAMBER','KAY/O'];
        const dropItems  = [];
        // Drop opens UPWARD from the toggle button so nothing goes off screen
        const rowH       = 20;
        const listH      = bossLabels.length * rowH + 8;
        const dropBg     = this.add.rectangle(W / 2, 716 - listH / 2 - 4, 160, listH, 0x111122, 0.94)
            .setVisible(false).setDepth(10);

        bossLabels.forEach((label, i) => {
            // i=0 nearest toggle, increasing upward
            const itemY = 716 - 12 - i * rowH;
            const item = this.add.text(W / 2, itemY, label, {
                fontSize: '11px', fontFamily: 'Arial', color: '#8888cc', letterSpacing: 1,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(11);
            item.on('pointerover', () => item.setColor('#ffffff'));
            item.on('pointerout',  () => item.setColor('#8888cc'));
            item.on('pointerdown', () => this.startBossTest(bossList[i]));
            dropItems.push(item);
        });

        const toggleDrop = () => {
            this._bossDropOpen = !this._bossDropOpen;
            bossToggle.setText(this._bossDropOpen ? '[ TEST BOSS ▾ ]' : '[ TEST BOSS ▴ ]');
            bossToggle.setColor(this._bossDropOpen ? '#8888ff' : '#555588');
            dropBg.setVisible(this._bossDropOpen);
            dropItems.forEach(it => it.setVisible(this._bossDropOpen));
        };
        bossToggle.on('pointerdown', toggleDrop);

        // Controls hint
        this.add.text(W / 2, 732, 'WASD/ARROWS: Move   SPACE: Jump   Z/CLICK: Shoot   E/SHIFT: Ability', {
            fontSize: '11px', fontFamily: 'Arial', color: '#444444',
        }).setOrigin(0.5);

        this.selectAgent(0);
    }

    createStatBars(cx, y) {
        const stats = ['HP', 'SPD', 'DMG'];
        const bars = {};
        const barW = 100;
        const spacing = 110;
        const startX = cx - spacing;

        stats.forEach((stat, i) => {
            const x = startX + i * spacing;
            this.add.text(x, y, stat, {
                fontSize: '11px', fontFamily: 'Arial', color: '#666666', letterSpacing: 1,
            }).setOrigin(0.5, 0);
            this.add.rectangle(x, y + 20, barW, 8, 0x222222).setOrigin(0.5, 0);
            const bar = this.add.rectangle(x - barW / 2, y + 20, 0, 8, 0xffffff).setOrigin(0, 0);
            bars[stat.toLowerCase()] = { bar, maxW: barW };
        });

        return bars;
    }

    selectAgent(index) {
        this.selectedIndex = index;
        const { container, x, y, agent } = this.cards[index];

        this.cards.forEach(c => c.container.setScale(1));
        container.setScale(1.1);

        // Highlight border
        this.highlightBorder.clear();
        const col = parseInt(agent.color.replace('#', ''), 16);
        this.highlightBorder.lineStyle(3, col, 1);
        this.highlightBorder.strokeRect(x - 87, y - 107, 174, 214);

        // Info
        this.infoName.setText(agent.name).setColor(agent.color);
        this.infoAbility.setText(agent.ability);
        this.infoDesc.setText(agent.desc);

        // Stat bars
        const colors = { hp: 0xff4655, spd: 0x4fc3f7, dmg: 0xffcc00 };
        Object.entries({ hp: agent.hp, spd: agent.spd, dmg: agent.dmg }).forEach(([key, val]) => {
            const { bar, maxW } = this.statBars[key];
            bar.width = (val / 5) * maxW;
            bar.setFillStyle(colors[key]);
        });
    }

    startGame() {
        this.registry.set('selectedAgent', this.agents[this.selectedIndex].key);
        this.registry.set('floor', 1);
        this.scene.start('GameScene');
    }

    startCasinoTest() {
        this.registry.set('coins', 500);
        this.scene.launch('CasinoScene', { floor: 1, coins: 500 });
    }

    startBossTest(bossType) {
        this.registry.set('selectedAgent', this.agents[this.selectedIndex].key);
        this.registry.set('floor', 10);
        this.registry.set('coins', 200);
        this.registry.set('forceBossType', bossType);
        this.scene.start('GameScene');
    }
}
