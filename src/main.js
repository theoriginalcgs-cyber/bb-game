import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#0f1923',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false,
        },
    },
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, UpgradeScene],
};

new Phaser.Game(config);
