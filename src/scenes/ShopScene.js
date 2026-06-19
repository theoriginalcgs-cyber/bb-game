// Standard items (available alongside shop-exclusives)
const STANDARD_POOL = [
    { id: 'dmg_up',    name: 'FIREPOWER',    desc: '+6 bullet damage',              color: '#ff4655', basePrice: 300 },
    { id: 'speed_up',  name: 'SWIFT FEET',   desc: '+30 movement speed',            color: '#00e5ff', basePrice: 250 },
    { id: 'max_hp',    name: 'FORTIFY',      desc: '+25 max HP  |  restore 15 HP',  color: '#44ff88', basePrice: 270 },
    { id: 'atk_speed', name: 'RAPID FIRE',   desc: 'Attack cooldown -60ms',         color: '#ffaa00', basePrice: 320 },
    { id: 'full_heal', name: 'FULL RESTORE', desc: 'Restore ALL HP instantly',      color: '#00ff88', basePrice: 400 },
];

// Shop-exclusive items — only available here
const EXCLUSIVE_POOL = [
    { id: 'shop_second_wind', name: 'SECOND WIND',    desc: 'Once per run: survive a lethal hit with 1 HP instead of dying',           color: '#00ffcc', basePrice: 700, exclusive: true },
    { id: 'shop_glass_cannon',name: 'GLASS CANNON',   desc: '+40% damage dealt, but take 30% more damage from all sources',            color: '#ff6644', basePrice: 550, exclusive: true },
    { id: 'shop_berserker',   name: 'BERSERKER',      desc: 'Below 30% HP: attack speed doubles and damage +25%',                      color: '#ff2200', basePrice: 620, exclusive: true },
    { id: 'shop_chaos_rounds',name: 'CHAOS ROUNDS',   desc: '15% chance on hit: explosion dealing 30 AoE damage to nearby enemies',    color: '#ff8800', basePrice: 580, exclusive: true },
    { id: 'shop_gold_magnet', name: 'GOLD MAGNET',    desc: 'Kills drop double coins for the rest of the run',                         color: '#ffd700', basePrice: 480, exclusive: true },
    { id: 'shop_armor_pierce',name: 'ARMOR PIERCE',   desc: 'Bullets ignore 50% of enemy armor — shreds armored and elite enemies',    color: '#cc88ff', basePrice: 600, exclusive: true },
    { id: 'shop_temporal',    name: 'TEMPORAL FIELD', desc: 'All enemies move 15% slower permanently for the rest of the run',         color: '#44ddff', basePrice: 650, exclusive: true },
    { id: 'shop_deathmark',   name: 'DEATHMARK',      desc: 'After each kill, your next bullet deals 4× damage',                       color: '#ff0044', basePrice: 680, exclusive: true },
];

const REROLL_BASE = 100;

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    init(data) {
        this.floor    = data.floor    || 1;
        this.coins    = data.coins    || 0;
        this._rerolls = 0;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.93);

        // Header
        this.add.text(W / 2, 48, '⬡  SHOP', {
            fontSize: '36px', color: '#ffd700', fontStyle: 'bold', letterSpacing: 8,
        }).setOrigin(0.5);

        this.add.text(W / 2, 92, 'Spend coins earned from kills', {
            fontSize: '13px', color: '#666666', letterSpacing: 2,
        }).setOrigin(0.5);

        this.coinTxt = this.add.text(W / 2, 124, `⬡  ${this.coins}  coins`, {
            fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
        }).setOrigin(0.5);

        this._cardContainer = null;
        this._drawCards();

        // Reroll button
        this.rerollBtn = this.add.text(W / 2 - 90, H - 58, '', {
            fontSize: '14px', color: '#aaaaaa', fontStyle: 'bold',
            backgroundColor: '#111122', padding: { x: 14, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this._updateRerollBtn();
        this.rerollBtn.on('pointerover', () => this.rerollBtn.setColor('#ffffff'));
        this.rerollBtn.on('pointerout',  () => this.rerollBtn.setColor('#aaaaaa'));
        this.rerollBtn.on('pointerdown', () => this._reroll());

        // Leave button
        const leave = this.add.text(W / 2 + 110, H - 58, '✓  LEAVE SHOP', {
            fontSize: '14px', color: '#44ff88', fontStyle: 'bold',
            backgroundColor: '#0a2a0a', padding: { x: 14, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        leave.on('pointerover', () => leave.setColor('#88ffbb'));
        leave.on('pointerout',  () => leave.setColor('#44ff88'));
        leave.on('pointerdown', () => this._close());

        this.input.keyboard.on('keydown-ESC', () => this._close());

        this.scene.bringToTop();
    }

    _pickItems() {
        const purchased = this.registry.get('shopPurchases') || [];
        const items = [];

        // Always include one shop-exclusive (filter already-bought ones)
        const availableExclusive = EXCLUSIVE_POOL.filter(e => !purchased.includes(e.id));
        if (availableExclusive.length > 0) {
            const pool = [...availableExclusive];
            const idx  = Phaser.Math.Between(0, pool.length - 1);
            const item = { ...pool[idx] };
            item.price = Math.round(item.basePrice * (1 + this.floor * 0.05));
            items.push(item);
        }

        // Fill remaining 2 slots with standard items
        const stdPool = [...STANDARD_POOL];
        while (items.length < 3 && stdPool.length > 0) {
            const idx  = Phaser.Math.Between(0, stdPool.length - 1);
            const item = { ...stdPool.splice(idx, 1)[0] };
            item.price = Math.round(item.basePrice * (1 + this.floor * 0.05));
            items.push(item);
        }

        return items;
    }

    _drawCards() {
        if (this._cardContainer) this._cardContainer.destroy();
        this._cardContainer = this.add.container(0, 0);

        const W     = this.scale.width;
        const items = this._pickItems();
        const cardW = 260;
        const cardH = 210;
        const cardY = 360;
        const gap   = 290;

        items.forEach((item, i) => {
            const cx       = W / 2 + (i - 1) * gap;
            const colorInt = parseInt(item.color.replace('#', ''), 16);
            const canAfford = this.coins >= item.price;

            const bg = this.add.rectangle(cx, cardY, cardW, cardH, 0x0d0d1a)
                .setStrokeStyle(2, canAfford ? 0x333355 : 0x1a1a1a);

            const nameTxt = this.add.text(cx, cardY - 74, item.name, {
                fontSize: '16px', color: item.color, fontStyle: 'bold', letterSpacing: 2,
            }).setOrigin(0.5).setAlpha(canAfford ? 1 : 0.35);

            this.add.rectangle(cx, cardY - 52, cardW - 30, 1, 0x222244)
                .setAlpha(canAfford ? 1 : 0.3);

            const descTxt = this.add.text(cx, cardY - 38, item.desc, {
                fontSize: '12px', color: '#aaaaaa', wordWrap: { width: cardW - 28 }, align: 'center',
            }).setOrigin(0.5, 0).setAlpha(canAfford ? 1 : 0.35);

            const priceTxt = this.add.text(cx, cardY + 62, `⬡  ${item.price}`, {
                fontSize: '20px', color: canAfford ? '#ffd700' : '#555533', fontStyle: 'bold',
            }).setOrigin(0.5);

            const btnTxt = this.add.text(cx, cardY + 90, canAfford ? 'BUY' : 'CANNOT AFFORD', {
                fontSize: '11px', color: canAfford ? '#444466' : '#443322', letterSpacing: 2,
            }).setOrigin(0.5);

            this._cardContainer.add([bg, nameTxt, descTxt, priceTxt, btnTxt]);

            if (canAfford) {
                bg.setInteractive({ useHandCursor: true });
                bg.on('pointerover', () => bg.setStrokeStyle(3, colorInt));
                bg.on('pointerout',  () => bg.setStrokeStyle(2, 0x333355));
                bg.on('pointerdown', () => {
                    if (this.coins < item.price) return;
                    this.coins -= item.price;
                    this.registry.set('coins', this.coins);
                    this.coinTxt.setText(`⬡  ${this.coins}  coins`);

                    // Queue purchase for GameScene to apply on resume
                    const prev = this.registry.get('shopPurchases') || [];
                    this.registry.set('shopPurchases', [...prev, item.id]);

                    bg.setFillStyle(0x0a2a0a).removeInteractive();
                    bg.setStrokeStyle(2, 0x44aa44);
                    priceTxt.setText('✓ BOUGHT').setColor('#44ff88').setFontSize('14px');
                    btnTxt.setVisible(false);
                    nameTxt.setAlpha(1);
                    descTxt.setAlpha(1);

                    const flash = this.add.text(cx, cardY - 110, 'UPGRADE QUEUED', {
                        fontSize: '13px', color: '#44ff88', fontStyle: 'bold',
                    }).setOrigin(0.5);
                    this._cardContainer.add(flash);
                    this.tweens.add({ targets: flash, alpha: 0, y: cardY - 140, duration: 1000, onComplete: () => flash.destroy() });

                    this._updateRerollBtn();
                });
            }
        });
    }

    _reroll() {
        const cost = REROLL_BASE * (this._rerolls + 1);
        if (this.coins < cost) {
            this.rerollBtn.setColor('#ff4444');
            this.time.delayedCall(400, () => this.rerollBtn.setColor('#aaaaaa'));
            return;
        }
        this.coins -= cost;
        this.registry.set('coins', this.coins);
        this.coinTxt.setText(`⬡  ${this.coins}  coins`);
        this._rerolls++;
        this._updateRerollBtn();
        this._drawCards();
    }

    _updateRerollBtn() {
        const cost = REROLL_BASE * (this._rerolls + 1);
        const can  = this.coins >= cost;
        this.rerollBtn.setText(`↺  REROLL  (⬡ ${cost})`);
        this.rerollBtn.setColor(can ? '#aaaaaa' : '#443333');
    }

    _close() {
        this.registry.set('shopClosed', true);
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
