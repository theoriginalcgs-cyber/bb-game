export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        const floor = this.registry.get('finalFloor') || 1;
        const agent = (this.registry.get('finalAgent') || 'jett').toUpperCase();

        // Dark overlay
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88);

        // Red line accents
        this.add.rectangle(W / 2, 240, W, 3, 0xff4655);
        this.add.rectangle(W / 2, 360, W, 3, 0xff4655);

        // YOU DIED
        this.add.text(W / 2, 160, 'YOU DIED', {
            fontSize: '88px', fontFamily: 'Arial Black, Arial',
            color: '#ff4655', fontStyle: 'bold',
        }).setOrigin(0.5);

        // Stats
        this.add.text(W / 2, 300, `AGENT: ${agent}`, {
            fontSize: '22px', fontFamily: 'Arial', color: '#888888', letterSpacing: 3,
        }).setOrigin(0.5);

        this.add.text(W / 2, 330, `REACHED FLOOR: ${floor}`, {
            fontSize: '28px', fontFamily: 'Arial Black, Arial', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        // Try again button
        this.makeButton(W / 2, 430, 'TRY AGAIN', 0xff4655, 0xcc2233, () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });

        // Main menu button
        this.makeButton(W / 2, 510, 'MAIN MENU', 0x2a2a2a, 0x444444, () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });

        // Best floor hint
        this.add.text(W / 2, 590, 'Press R to restart quickly', {
            fontSize: '14px', color: '#444444',
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-R', () => {
            this.registry.set('floor', 1);
            this.scene.start('MenuScene');
        });
    }

    makeButton(x, y, label, color, hoverColor, callback) {
        const W = this.scale.width;
        const bg = this.add.rectangle(x, y, 260, 52, color);
        const txt = this.add.text(x, y, label, {
            fontSize: '21px', fontFamily: 'Arial Black, Arial',
            color: '#ffffff', letterSpacing: 4,
        }).setOrigin(0.5);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover',  () => bg.setFillStyle(hoverColor));
        bg.on('pointerout',   () => bg.setFillStyle(color));
        bg.on('pointerdown',  callback);
    }
}
