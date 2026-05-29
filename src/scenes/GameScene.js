import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';
import LevelGenerator from '../utils/LevelGenerator.js';
import BossMusic from '../utils/BossMusic.js';

const BOSS_TYPES = ['viper', 'blaze', 'phantom', 'titan', 'storm'];
const ROOM_W  = 1800;
const GROUND_Y = 648;

const CURSES = [
    { id: 'fragile',   label: '⚠ CURSE: FRAGILE — you take 25% more damage'    },
    { id: 'sluggish',  label: '⚠ CURSE: SLUGGISH — your movement speed is reduced' },
    { id: 'drought',   label: '⚠ CURSE: DROUGHT — health drops are disabled'   },
    { id: 'frenzy',    label: '⚠ CURSE: FRENZY — enemies move 25% faster'      },
    { id: 'fortified', label: '⚠ CURSE: FORTIFIED — enemies take 20% less damage' },
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.agentKey       = this.registry.get('selectedAgent') || 'jett';
        this.floor          = this.registry.get('floor') || 1;
        this.roomIndex      = 0;
        this.enemyCount     = 0;
        this.roomDone       = false;
        this.alive          = true;
        this.showingUpgrade = false;
        this.bossMusic      = new BossMusic();

        // Curse state
        this.activeCurse  = null;
        this._curseSave   = {};
        this.registry.set('activeCurse', null);

        // Void state
        this.voidActive   = false;
        this.voidX        = 0;
        this.voidSpeed    = 0;
        this.voidDmgTimer = 0;
        this._voidTimer   = null;

        const W      = this.scale.width;
        const H      = this.scale.height;
        const worldW = ROOM_W * 12;

        this.physics.world.setBounds(0, 0, worldW, H);
        this.cameras.main.setBounds(0, 0, worldW, H);

        this.add.tileSprite(W / 2, H / 2, worldW, H, 'bgtile').setScrollFactor(0);

        this.groundGroup   = this.physics.add.staticGroup();
        this.platformGroup = this.physics.add.staticGroup();
        this.playerBullets = this.physics.add.group({ maxSize: 30 });
        this.enemyBullets  = this.physics.add.group({ maxSize: 50 });
        this.enemyGroup    = this.physics.add.group();
        this.healthDrops   = this.physics.add.staticGroup();
        this.powerupDrops  = this.physics.add.staticGroup();
        this.doorGroup     = this.physics.add.staticGroup();
        this.toxicPools    = this.physics.add.staticGroup();
        this.bossWalls     = this.physics.add.staticGroup();
        this.viperOrbs     = this.physics.add.group();

        // Viper's Pit state
        this.viperPitActive   = false;
        this.viperPitStartHp  = 0;
        this.viperPitDecayCd  = 0;
        this._viperPitFog     = null;

        // Void overlay (world-space graphics, drawn each frame)
        this.voidGraphics = this.add.graphics();

        this.generateRoom(0);

        this.player = new Player(this, 120, 400, this.agentKey);

        this.cursors  = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        };
        this.keyZ     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyE     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.player.setControls(this.cursors, this.wasd);
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
        this.cameras.main.setDeadzone(220, 120);

        this.physics.add.collider(this.player,       this.groundGroup);
        this.physics.add.collider(this.enemyGroup,   this.groundGroup);
        this.physics.add.collider(this.playerBullets, this.groundGroup, (b) => this._ricochetOrDestroy(b));
        this.physics.add.collider(this.playerBullets, this.bossWalls,  (b) => this._ricochetOrDestroy(b));
        this.physics.add.collider(this.enemyBullets,  this.groundGroup,  (b) => b.destroy());
        this.physics.add.collider(this.player,        this.bossWalls);
        this.physics.add.collider(this.enemyGroup,    this.bossWalls);

        // One-way platforms: only collide when approaching from above.
        // The body.bottom <= body.top+4 check prevents side-collision when an
        // entity is at the same height as the platform (e.g. enemies walking past).
        this.physics.add.collider(this.player, this.platformGroup, null, (player, plat) => {
            if (player.body.velocity.y < 0) return false;
            if (this.wasd?.down?.isDown || this.cursors?.down?.isDown) return false;
            return player.body.bottom <= plat.body.top + 4;
        });
        this.physics.add.collider(this.enemyGroup, this.platformGroup, null, (enemy, plat) => {
            if (enemy.body.velocity.y < 0) return false;
            return enemy.body.bottom <= plat.body.top + 4;
        });

        this.physics.add.overlap(this.playerBullets, this.enemyGroup, (bullet, enemy) => {
            const ls    = bullet.isLifeSteal;
            const isIce = bullet.isIceOrb;
            bullet.destroy();
            enemy.hit(bullet.damage || 20, ls);
            if (isIce) enemy.applySlowEffect(3000);
        });

        this.physics.add.overlap(this.playerBullets, this.toxicPools, (bullet, pool) => {
            if (bullet.isFireball && bullet.fireballLevel >= 2) {
                bullet.destroy();
                pool.destroy();
            }
        });

        this.physics.add.overlap(this.enemyBullets, this.player, (player, bullet) => {
            const isPoisoning = bullet.poisoning;
            bullet.destroy();
            player.takeDamage(bullet.damage || 18);
            if (isPoisoning) player.applyPoison(2500);
        });

        this.physics.add.overlap(this.player, this.toxicPools, () => {
            const now = this.time.now;
            if (!this._lastPoolDmg || now - this._lastPoolDmg > 700) {
                this._lastPoolDmg = now;
                this.player.takeDamage(8);
                this.player.applyPoison(2000);
            }
        });

        this.physics.add.overlap(this.playerBullets, this.viperOrbs, (bullet, orb) => {
            // 600ms invincibility window after each hit — caps attack-speed advantage
            if (orb.iframeTil && orb.iframeTil > this.time.now) return;

            bullet.destroy();
            orb.orbHp = (orb.orbHp || 4) - 1;
            orb.iframeTil = this.time.now + 600;

            if (orb.orbHp > 0) {
                orb.setTint(0xffffff);
                this.time.delayedCall(600, () => { if (orb?.active) orb.clearTint(); });
            } else {
                if (orb.pulseTween) orb.pulseTween.stop();

                const boss = this.enemyGroup.getChildren().find(e => e.bossType === 'viper' && e.active);
                if (boss) boss.ultimateOrbsLeft = Math.max(0, (boss.ultimateOrbsLeft || 0) - 1);

                // 12% max HP heal per orb broken
                const healAmt = Math.floor(this.player.maxHp * 0.12);
                this.player.gainHp(healAmt);

                const burst = this.add.circle(orb.x, orb.y, 22, 0x44ff77, 0.9);
                this.tweens.add({ targets: burst, alpha: 0, scaleX: 4, scaleY: 4, duration: 400, onComplete: () => burst.destroy() });
                this.cameras.main.shake(180, 0.008);
                orb.destroy();
            }
        });

        this.physics.add.overlap(this.player, this.healthDrops, (player, drop) => {
            drop.destroy();
            this.player.gainHp(28);
        });

        this.physics.add.overlap(this.player, this.powerupDrops, (player, drop) => {
            const type = drop.powerupType;
            drop.destroy();
            this.player.applyPowerup(type);
        });

        this.physics.add.overlap(this.player, this.doorGroup, () => {
            if (this.roomDone && !this.showingUpgrade) this.openUpgradeScreen();
        });

        this.events.on('resume',        this.onSceneResumed,   this);
        this.events.on('spawnFireball', this.onSpawnFireball,  this);
        this.events.on('dropHealth',    this.onDropHealth,     this);
        this.events.on('dropPowerup',   this.onDropPowerup,    this);
        this.events.on('enemyDied',     this.onEnemyDied,      this);
        this.events.on('dashDamage',    this.onDashDamage,     this);
        this.events.on('spawnIceOrb',   this.onSpawnIceOrb,    this);
        this.events.on('bossKilled',    () => this.bossMusic.stop(), this);
        this.events.on('lifeStealKill', (amt) => this.player.gainHp(amt), this);
        this.events.on('hpChanged',     (hp)  => this.registry.set('playerHp', hp), this);
        this.events.on('playerDied',    this.onPlayerDied,     this);
        this.events.on('requestSpawn',  this.onSpawnRequest,   this);
        this.events.on('viperPitStart', this.onViperPitStart,  this);
        this.events.on('viperPitEnd',   this.onViperPitEnd,    this);

        this.input.on('pointerdown', (pointer) => {
            if (this.alive) this.player.shoot(this.playerBullets, pointer.worldX, pointer.worldY);
        });

        this.scene.launch('UIScene');
        this.scene.bringToTop('UIScene');

        this.time.delayedCall(50, () => {
            this.registry.set('playerHp',    this.player.hp);
            this.registry.set('playerMaxHp', this.player.maxHp);
            this.registry.set('floor',       this.floor);
            this.registry.set('agentKey',    this.agentKey);
        });
    }

    // ─── Room Generation ────────────────────────────────────────────
    generateRoom(roomIndex) {
        this.doorGroup.clear(true, true);

        const startX      = roomIndex * ROOM_W;
        const isBoss      = this.floor % 10 === 0;
        const isMiniBoss  = this.floor % 10 === 5;

        this.registry.set('bossActive', false);
        this.enemyCount = 0;

        // Reset void for this room
        this.voidActive   = false;
        this.voidX        = 0;
        this.voidDmgTimer = 0;
        this.voidGraphics.clear();
        if (this._voidTimer) { this._voidTimer.remove(); this._voidTimer = null; }

        // Roll curse for regular floors (floor > 5, not boss/mini-boss, ~30% chance)
        const curseFloor = !isBoss && !isMiniBoss && this.floor > 5;
        const curseRoll  = curseFloor && Math.random() < (0.3 + this.floor * 0.005);
        this.activeCurse = curseRoll
            ? CURSES[Phaser.Math.Between(0, CURSES.length - 1)].id
            : null;
        this.registry.set('activeCurse', this.activeCurse);

        if (isBoss) {
            const forced = this.registry.get('forceBossType');
            this.registry.set('forceBossType', null);
            this.currentBossType = forced || BOSS_TYPES[Phaser.Math.Between(0, BOSS_TYPES.length - 1)];
            LevelGenerator.generateBossRoom(
                this, this.groundGroup, this.platformGroup, roomIndex, startX, this.currentBossType
            );
            if (this.currentBossType === 'viper') this._spawnViperArena(startX);
            this.spawnBoss(startX + ROOM_W / 2, 400);

        } else if (isMiniBoss) {
            // Use normal room layout but spawn a mini-boss + 2 guards
            LevelGenerator.generate(this, this.groundGroup, this.platformGroup, roomIndex, startX, this.floor);
            this.spawnMiniBoss(startX);

        } else {
            const spawns = LevelGenerator.generate(
                this, this.groundGroup, this.platformGroup, roomIndex, startX, this.floor
            );
            spawns.forEach(({ x, y, type, isElite }) => {
                const e = new Enemy(this, x, y, type, this.floor, isElite);
                if (this.activeCurse === 'frenzy')    e.moveSpeed = Math.round(e.moveSpeed * 1.25);
                if (this.activeCurse === 'fortified') e.armorMod  = 0.8;
                this.enemyGroup.add(e);
                this.enemyCount++;
            });

            // Apply player-affecting curses now that player exists (floor > 5 guarantee)
            if (this.player) this._applyCurse(this.activeCurse);

            // Start void timer (delay decreases with floor, void speeds up)
            const delay = Math.max(14000, 28000 - this.floor * 450);
            this._voidTimer = this.time.delayedCall(delay, () => {
                if (!this.roomDone) {
                    this.voidActive = true;
                    this.voidSpeed  = 40 + this.floor * 1.5;
                    this._showVoidWarning();
                }
            });
        }

        // Announce curse
        if (this.activeCurse) {
            const label = CURSES.find(c => c.id === this.activeCurse)?.label || '';
            this.time.delayedCall(400, () => {
                const cx  = this.cameras.main.scrollX + this.scale.width / 2;
                const txt = this.add.text(cx, 340, label, {
                    fontSize: '16px', color: '#ff4444', fontStyle: 'bold',
                }).setOrigin(0.5).setScrollFactor(0);
                this.tweens.add({ targets: txt, alpha: 0, y: 300, duration: 2800, delay: 600, onComplete: () => txt.destroy() });
            });
        }

        this.roomDone = false;

        const newW = (roomIndex + 1) * ROOM_W;
        this.physics.world.setBounds(0, 0, newW, this.scale.height);
        this.cameras.main.setBounds(0, 0, newW, this.scale.height);
    }

    spawnBoss(x, y) {
        const type = this.currentBossType || 'viper';
        const boss = new Boss(this, x, y, this.floor, type);
        this.enemyGroup.add(boss);
        this.enemyCount = 1;

        this.bossMusic.play(type);

        const colors = { viper:'#cc44ff', blaze:'#ff6600', phantom:'#00e5ff', titan:'#cc8833', storm:'#ffff00' };
        const col = colors[type] || '#ff0000';
        this.cameras.main.flash(400, 180, 0, 0);

        const cx   = this.cameras.main.scrollX + this.scale.width / 2;
        const name = this.registry.get('bossName') || `BOSS — FLOOR ${this.floor}`;
        const txt  = this.add.text(cx, 200, name, {
            fontSize: '34px', color: col, fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: txt, alpha: 0, y: 160, duration: 2400, delay: 400, onComplete: () => txt.destroy() });
    }

    spawnMiniBoss(startX) {
        const cx = startX + ROOM_W / 2;
        // Spawn above ground so physics lands it correctly (scale 1.35 × 72px height = 97px)
        const mb = new Enemy(this, cx, GROUND_Y - 62, 'miniboss', this.floor, false);
        this.enemyGroup.add(mb);
        this.enemyCount++;

        this.registry.set('minibossActive', true);
        this.registry.set('minibossHp',    mb.maxHp);
        this.registry.set('minibossMaxHp', mb.maxHp);
        this.registry.set('minibossName',  `⚡ ELITE — FLOOR ${this.floor}`);

        // Two guard escorts
        const g1 = new Enemy(this, cx - 280, GROUND_Y - 38, 'guard', this.floor, false);
        const g2 = new Enemy(this, cx + 280, GROUND_Y - 38, 'guard', this.floor, false);
        this.enemyGroup.add(g1);
        this.enemyGroup.add(g2);
        this.enemyCount += 2;

        this.cameras.main.flash(300, 180, 30, 0);
        this.time.delayedCall(300, () => {
            const tx  = this.cameras.main.scrollX + this.scale.width / 2;
            const txt = this.add.text(tx, 200, `⚡ ELITE THREAT — FLOOR ${this.floor}`, {
                fontSize: '28px', color: '#ff8800', fontStyle: 'bold',
            }).setOrigin(0.5).setScrollFactor(0);
            this.tweens.add({ targets: txt, alpha: 0, y: 160, duration: 2400, delay: 400, onComplete: () => txt.destroy() });
        });
    }

    // ─── Curse helpers ───────────────────────────────────────────────
    _applyCurse(curse) {
        if (!curse || !this.player) return;
        this._curseSave = {};
        switch (curse) {
            case 'fragile':
                this._curseSave.damageReduction = this.player.damageReduction;
                this.player.damageReduction     = this.player.damageReduction * 1.25;
                break;
            case 'sluggish':
                this._curseSave.speed = this.player.speed;
                this.player.speed     = Math.round(this.player.speed * 0.8);
                break;
        }
    }

    _clearCurse() {
        if (!this.activeCurse || !this.player) return;
        if (this._curseSave.damageReduction !== undefined)
            this.player.damageReduction = this._curseSave.damageReduction;
        if (this._curseSave.speed !== undefined)
            this.player.speed = this._curseSave.speed;
        this._curseSave  = {};
        this.activeCurse = null;
        this.registry.set('activeCurse', null);
    }

    _showVoidWarning() {
        const cx  = this.cameras.main.scrollX + this.scale.width / 2;
        const txt = this.add.text(cx, 300, '⚠ VOID APPROACHING', {
            fontSize: '30px', color: '#ff0000', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: txt, alpha: 0, y: 260, duration: 2000, delay: 700, onComplete: () => txt.destroy() });
        this.cameras.main.flash(300, 150, 0, 0);
    }

    // ─── Events ─────────────────────────────────────────────────────
    onSpawnRequest(x, y, spawner) {
        const e = new Enemy(this, x, y, 'runner', this.floor, false);
        e.isSpawnedEnemy = true;
        e.parentSpawner  = spawner || null;
        this.enemyGroup.add(e);
    }

    onSpawnFireball(x, y, dir, level = 0) {
        const fb = this.playerBullets.create(x, y, 'fireball');
        if (!fb) return;
        fb.setVelocityX(dir * 520);
        fb.setGravityY(-900);
        fb.damage        = level >= 1 ? 75 : 50;
        fb.isLifeSteal   = false;
        fb.isFireball    = true;
        fb.fireballLevel = level;
        fb.setScale(level >= 1 ? 2.0 : 1.3);
        this.time.delayedCall(1800, () => { if (fb && fb.active) fb.destroy(); });
    }

    onSpawnIceOrb(x, y, dir) {
        const orb = this.playerBullets.create(x, y, 'slow_orb');
        if (!orb) return;
        orb.setVelocityX(dir * 480);
        orb.setGravityY(-900);
        orb.damage     = 15;
        orb.isIceOrb   = true;
        orb.isLifeSteal = false;
        this.time.delayedCall(2000, () => { if (orb && orb.active) orb.destroy(); });
    }

    onDashDamage(dir) {
        this.enemyGroup.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            const dx   = enemy.x - this.player.x;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (dist < 120 && (dir > 0 ? dx > 0 : dx < 0)) enemy.hit(40, false);
        });
    }

    onViperPitStart() {
        this.viperPitActive   = true;
        this.viperPitStartHp  = this.player.hp;
        this.viperPitDecayCd  = 1500;

        // Screen-space overlay — scrollFactor(0) so it covers the full viewport,
        // depth 8 so it sits above all game sprites but below the UI scene.
        const W = this.scale.width;
        const H = this.scale.height;
        const fog = this.add.graphics().setScrollFactor(0).setDepth(8);
        fog.fillStyle(0x00cc33, 1.0);
        fog.fillRect(0, 0, W, H);
        fog.setAlpha(0);

        // Fade in over 2s, then pulse gently so the player knows they're inside it
        this.tweens.add({
            targets: fog, alpha: 0.32, duration: 2000,
            onComplete: () => {
                if (!this._viperPitFog?.active) return;
                this.tweens.add({
                    targets: this._viperPitFog,
                    alpha: 0.2, duration: 1100,
                    yoyo: true, repeat: -1,
                });
            },
        });
        this._viperPitFog = fog;

        const txt = this.add.text(W / 2, 280, "VIPER'S PIT", {
            fontSize: '36px', color: '#00ff44', fontStyle: 'bold',
            stroke: '#003300', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(15);
        this.tweens.add({ targets: txt, alpha: 0, y: 240, duration: 2800, delay: 800, onComplete: () => txt.destroy() });
    }

    onViperPitEnd() {
        this.viperPitActive = false;

        // Restore HP to the snapshot value — reward for clearing the orbs fast
        if (this.player?.active && this.player.hp < this.viperPitStartHp) {
            const restored = this.viperPitStartHp - this.player.hp;
            this.player.hp = this.viperPitStartHp;
            this.events.emit('hpChanged', this.player.hp);
            this.player.floatText(`+${restored} RESTORED`, '#44ff88');
        }

        if (this._viperPitFog) {
            this.tweens.killTweensOf(this._viperPitFog);
            this.tweens.add({
                targets: this._viperPitFog, alpha: 0, duration: 1200,
                onComplete: () => { this._viperPitFog?.destroy(); this._viperPitFog = null; },
            });
        }
    }

    onDropPowerup(x, y, type) {
        const drop = this.powerupDrops.create(x, y - 10, type);
        if (!drop) return;
        drop.setImmovable(true);
        drop.powerupType = type;
        drop.refreshBody();
        this.tweens.add({ targets: drop, scaleX: 1.25, scaleY: 1.25, yoyo: true, repeat: -1, duration: 480 });
        this.time.delayedCall(12000, () => { if (drop?.active) drop.destroy(); });
    }

    _ricochetOrDestroy(bullet) {
        if (this.player.upgrades.includes('ricochet') && !bullet.bounced &&
            (bullet.body.blocked.left || bullet.body.blocked.right)) {
            bullet.bounced = true;
            bullet.origVx  = -bullet.origVx;
            bullet.setVelocity(bullet.origVx, bullet.origVy);
            bullet.setRotation(Math.atan2(bullet.origVy, bullet.origVx));
        } else {
            bullet.destroy();
        }
    }

    onDropHealth(x, y) {
        if (this.activeCurse === 'drought') return; // curse blocks drops
        const drop = this.healthDrops.create(x, y - 10, 'health_drop');
        if (!drop) return;
        drop.setImmovable(true);
        drop.refreshBody();
        this.time.delayedCall(7000, () => { if (drop && drop.active) drop.destroy(); });
    }

    onEnemyDied() {
        if (this.player.lifedrain > 0) this.player.gainHp(this.player.lifedrain);
        this.enemyCount = Math.max(0, this.enemyCount - 1);

        if (this.enemyCount <= 0 && !this.roomDone) {
            this.roomDone = true;
            this.spawnDoor();
        }
    }

    spawnDoor() {
        const doorX = (this.roomIndex + 1) * ROOM_W - 80;
        const door  = this.doorGroup.create(doorX, GROUND_Y - 48, 'door');
        door.setImmovable(true);
        door.refreshBody();
        door.setAlpha(0);
        this.tweens.add({ targets: door, alpha: 1, duration: 600 });

        const msgX = this.cameras.main.scrollX + this.scale.width / 2;
        const msg  = this.add.text(msgX, 180, '⚡ EXIT OPEN — REACH THE DOOR', {
            fontSize: '28px', color: '#ff4655', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: msg, alpha: 0, y: 140, duration: 2200, onComplete: () => msg.destroy() });
    }

    openUpgradeScreen() {
        this.showingUpgrade = true;
        const isBossFloor = this.floor % 10 === 0;
        if (isBossFloor && this.player.abilityLevel < 2) {
            this.scene.launch('AbilityUpgradeScene', {
                agentKey:     this.agentKey,
                abilityLevel: this.player.abilityLevel + 1,
            });
        } else {
            this.scene.launch('UpgradeScene', { floor: this.floor });
        }
        this.scene.pause();
    }

    onSceneResumed() {
        const abilityLevel = this.registry.get('pickedAbilityLevel');
        const upgradeId    = this.registry.get('pickedUpgrade');

        if (abilityLevel != null) {
            this.registry.set('pickedAbilityLevel', null);
            this._applyAbilityUpgrade(abilityLevel);
        } else if (upgradeId) {
            this.registry.set('pickedUpgrade', null);
            this.player.applyUpgrade(upgradeId);
            this.registry.set('playerMaxHp', this.player.maxHp);
            this.registry.set('playerHp',    this.player.hp);
        }
        this.showingUpgrade = false;
        this.advanceRoom();
    }

    _applyAbilityUpgrade(level) {
        this.player.abilityLevel = level;
        if (this.agentKey === 'jett' && level === 2 && !this.jettDaggers) {
            this.jettDaggers = [];
            for (let i = 0; i < 3; i++) {
                this.jettDaggers.push(this.add.image(this.player.x, this.player.y, 'jett_dagger'));
            }
        }
    }

    _spawnViperArena(startX) {
        const tileW = 64;
        const wallL = startX + 32;
        const wallR = startX + 1600;

        // ── Toxic domain background ──
        const viperBg = this.add.tileSprite(
            startX + ROOM_W / 2, this.scale.height / 2,
            ROOM_W, this.scale.height, 'bg_viper'
        ).setDepth(-2);
        this._viperBg = viperBg;

        // ── Ground-level toxic fog ──
        const fog = this.add.graphics().setDepth(-1);
        fog.fillStyle(0x00cc44, 0.08);
        fog.fillRect(startX, GROUND_Y - 120, ROOM_W, 120);
        fog.fillStyle(0x00aa33, 0.13);
        fog.fillRect(startX, GROUND_Y - 60, ROOM_W, 60);
        this._viperFog = fog;

        // ── Green drips on the containment walls ──
        const drips = this.add.graphics().setDepth(-1);
        drips.fillStyle(0x00bb33, 0.55);
        for (let y = 0; y < GROUND_Y; y += 70) {
            const len = 20 + ((y * 37) % 55);    // pseudo-random length per drip
            drips.fillRect(wallL - 2, y, 6, len);
            drips.fillRect(wallR - 2, y, 6, len);
        }
        this._viperDrips = drips;

        // ── Containment walls (green-tinted ground tiles) ──
        for (let y = tileW / 2; y < GROUND_Y + tileW; y += tileW) {
            for (const wx of [wallL, wallR]) {
                const w = this.bossWalls.create(wx, y, 'ground_viper');
                w.setImmovable(true);
                w.setAlpha(0.9);
                w.refreshBody();
            }
        }
    }

    advanceRoom() {
        if (!this.alive) return;
        this._clearCurse();

        // Destroy any enemies still alive from the previous room so they
        // can't follow the player or skew the next room's enemy count.
        this.enemyGroup.clear(true, true);

        this.roomIndex++;
        this.floor++;
        this.registry.set('floor', this.floor);

        this.toxicPools.clear(true, true);
        this.bossWalls.clear(true, true);
        this.viperOrbs.clear(true, true);
        this._lastPoolDmg = 0;
        if (this._viperBg)     { this._viperBg.destroy();     this._viperBg     = null; }
        if (this._viperFog)    { this._viperFog.destroy();    this._viperFog    = null; }
        if (this._viperDrips)  { this._viperDrips.destroy();  this._viperDrips  = null; }
        this.viperPitActive = false;
        if (this._viperPitFog) { this._viperPitFog.destroy(); this._viperPitFog = null; }

        const newX = this.roomIndex * ROOM_W + 120;
        this.player.setPosition(newX, 400);

        this.generateRoom(this.roomIndex);
        this.cameras.main.flash(350, 255, 255, 255);
    }

    onPlayerDied() {
        if (!this.alive) return;
        this.alive = false;
        this.bossMusic.stop();
        this.registry.set('finalFloor', this.floor);
        this.registry.set('finalAgent', this.agentKey);
        this.cameras.main.shake(400, 0.02);
        this.time.delayedCall(900, () => {
            this.scene.stop('UIScene');
            this.scene.start('GameOverScene');
        });
    }

    // ─── Update ─────────────────────────────────────────────────────
    update(time, delta) {
        if (!this.alive || !this.player.active) return;

        this.player.update(time, delta);

        if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
            const p = this.input.activePointer;
            this.player.shoot(this.playerBullets, p.worldX, p.worldY);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.keyShift)) {
            this.player.useAbility();
        }

        this.enemyGroup.getChildren().forEach((e) => {
            if (e.active) e.update(this.player, this.enemyBullets, delta);
        });

        // Void advancement
        if (this.voidActive && !this.roomDone) {
            this.voidX += this.voidSpeed * (delta / 1000);
            const roomStartX = this.roomIndex * ROOM_W;
            const voidRight  = roomStartX + this.voidX;

            this.voidGraphics.clear();
            this.voidGraphics.fillStyle(0x990000, 0.55);
            this.voidGraphics.fillRect(roomStartX, 0, this.voidX, this.scale.height);
            // Bright leading edge
            this.voidGraphics.fillStyle(0xff2222, 0.8);
            this.voidGraphics.fillRect(voidRight - 6, 0, 6, this.scale.height);

            if (this.player.x < voidRight) {
                this.voidDmgTimer += delta;
                if (this.voidDmgTimer >= 500) {
                    this.voidDmgTimer = 0;
                    this.player.takeDamage(4);
                }
            } else {
                this.voidDmgTimer = 0;
            }
        } else if (!this.voidActive) {
            this.voidGraphics.clear();
        }

        this.registry.set('abilityReady', this.player.abilityReadyPercent());
        this.registry.set('roomDone',     this.roomDone);
        this.registry.set('enemyCount',   this.enemyCount);

        if (this.player.y > this.scale.height + 50) {
            this.player.takeDamage(999);
        }

        if (this.jettDaggers && this.player.active) {
            const t = time / 600;
            this.jettDaggers.forEach((dagger, i) => {
                const angle = t + (i * Math.PI * 2 / 3);
                dagger.x = this.player.x + Math.cos(angle) * 55;
                dagger.y = this.player.y + Math.sin(angle) * 40;
                dagger.setRotation(angle);
                this.enemyBullets.getChildren().forEach(bullet => {
                    if (bullet.active &&
                        Phaser.Math.Distance.Between(dagger.x, dagger.y, bullet.x, bullet.y) < 22) {
                        bullet.destroy();
                    }
                });
            });
        }

        // Viper's Pit decay — 3% of max HP per tick, floors at 1, never kills on its own
        if (this.viperPitActive && this.player.active) {
            this.viperPitDecayCd -= delta;
            if (this.viperPitDecayCd <= 0) {
                this.viperPitDecayCd = 900;
                if (this.player.hp > 1) {
                    const decay = Math.max(1, Math.floor(this.player.maxHp * 0.03));
                    this.player.hp = Math.max(1, this.player.hp - decay);
                    this.events.emit('hpChanged', this.player.hp);
                    this.player.setTint(0x44ff44);
                    this.time.delayedCall(130, () => {
                        if (this.player?.active && !this.player.invincible) this.player.clearTint();
                    });
                }
            }
        }
    }
}
