import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';
import LevelGenerator from '../utils/LevelGenerator.js';
import BossMusic from '../utils/BossMusic.js';
import { StormMusic } from '../audio/StormMusic.js';
import { TitanMusic }   from '../audio/TitanMusic.js';
import { BlazeMusic }   from '../audio/BlazeMusic.js';
import { PhantomMusic } from '../audio/PhantomMusic.js';

const BOSS_TYPES = ['viper', 'blaze', 'phantom', 'titan', 'storm', 'killjoy', 'chamber', 'kayo'];
const ROOM_W  = 1440;
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

        // Coin + event state
        this.coins             = 0;
        this.eventType         = null;  // 'shop' | 'puzzle' | 'minigame'
        this._pendingUpgrades  = 0;
        this._eventRestriction = null;
        this._minigameWave     = 0;
        this._puzzleDoorReady  = false;
        this.registry.set('coins', 0);

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
        this.blazeFireZones = this.physics.add.staticGroup();
        this.bossOrbs       = this.physics.add.group();
        this.chamberTraps  = this.physics.add.staticGroup();
        this.kayoKnives    = this.physics.add.staticGroup();
        this.killjoyRods   = this.physics.add.staticGroup();

        // Kayo suppression state
        this.kayoSuppressed = false;

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
        this.cameras.main.startFollow(this.player, true, 0.4, 0.4);

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
            const ls       = bullet.isLifeSteal;
            const isIce    = bullet.isIceOrb;
            const piercing = bullet.piercing;
            let   dmg      = bullet.damage || 20;

            if (!piercing) bullet.destroy();
            else bullet.piercedCount = (bullet.piercedCount || 0) + 1;

            // Deathmark: 4× damage on next hit after a kill
            if (this.player.deathmark && this.player.deathmarkReady) {
                dmg *= 4;
                this.player.deathmarkReady = false;
                const flash = this.add.circle(enemy.x, enemy.y, 24, 0xff0044, 0.9);
                this.tweens.add({ targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 280, onComplete: () => flash.destroy() });
            }

            // Armor pierce: temporarily reduce enemy armor resistance
            const origArmor = enemy.armorMod;
            if (this.player.armorPierce > 0 && enemy.armorMod < 1) {
                enemy.armorMod = origArmor + (1 - origArmor) * this.player.armorPierce;
            }

            // Executioner: bonus damage to enemies below 40% HP
            if (this.player.executionerLevel > 0 && enemy.hp < enemy.maxHp * 0.4) {
                dmg = Math.round(dmg * (1 + this.player.executionerLevel * 0.2));
            }

            enemy.hit(dmg, ls);
            enemy.armorMod = origArmor;
            if (isIce) enemy.applySlowEffect(3000);

            // Sage Tier-1 weapon: Cryoshot slows on every hit
            if (bullet.isCryo && !isIce) enemy.applySlowEffect(1000);

            // Reyna Tier-1 weapon: Drain Round — heal 2 HP per bullet hit
            if (bullet.isDrain && this.player.active) this.player.gainHp(2);

            // Leech Shot upgrade: heal 1 HP per bullet hit
            if (bullet.isLeechShot && this.player.active) this.player.gainHp(1);

            // Phoenix Tier-1 weapon: Hot Rounds — small fire zone on hit
            if (bullet.isHotRound && enemy.active) {
                const fx = this.add.circle(enemy.x, enemy.y, 18, 0xff5722, 0.65);
                this.time.delayedCall(600, () => { if (fx?.active) fx.destroy(); });
                // Brief burn to nearby enemies
                this.enemyGroup.getChildren().forEach(e => {
                    if (!e.active || e === enemy) return;
                    if (Phaser.Math.Distance.Between(e.x, e.y, enemy.x, enemy.y) < 52) {
                        e.hit(Math.round(dmg * 0.4), false);
                    }
                });
            }

            // Explosive Tip: 30%/60% chance AoE explosion (20 dmg within 60px)
            if (this.player.explosiveLevel > 0 && enemy.active && Math.random() < this.player.explosiveLevel * 0.3) {
                const ex = enemy.x, ey = enemy.y;
                const spark = this.add.circle(ex, ey, 10, 0xff6600, 0.9);
                this.tweens.add({ targets: spark, scaleX: 5, scaleY: 5, alpha: 0, duration: 260, onComplete: () => spark.destroy() });
                this.enemyGroup.getChildren().forEach(e => {
                    if (!e.active || e === enemy) return;
                    if (Phaser.Math.Distance.Between(ex, ey, e.x, e.y) < 60) e.hit(20, false);
                });
            }

            // Chaos Rounds: 15% chance AoE explosion (30 dmg within 80px)
            if (this.player.chaosRound && enemy.active && Math.random() < 0.15) {
                const cx = enemy.x, cy = enemy.y;
                const boom = this.add.circle(cx, cy, 12, 0xff8800, 0.85);
                this.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 320, onComplete: () => boom.destroy() });
                this.enemyGroup.getChildren().forEach(e => {
                    if (!e.active || e === enemy) return;
                    if (Phaser.Math.Distance.Between(e.x, e.y, cx, cy) < 80) e.hit(30, false);
                });
            }

            // Destroy piercing bullet after hitting 3 enemies
            if (piercing && bullet.piercedCount >= 3 && bullet.active) bullet.destroy();
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

        // Blaze fire zones: burn damage (no poison)
        this.physics.add.overlap(this.player, this.blazeFireZones, () => {
            const now = this.time.now;
            if (!this._lastFireDmg || now - this._lastFireDmg > 600) {
                this._lastFireDmg = now;
                this.player.takeDamage(10 + Math.floor(this.floor / 10) * 2);
            }
        });

        // Boss orbs (Blaze cores, Storm orbs): player bullets damage them
        this.physics.add.overlap(this.playerBullets, this.bossOrbs, (bullet, orb) => {
            if (orb.iframeTil && orb.iframeTil > this.time.now) return;
            bullet.destroy();
            orb.orbHp = (orb.orbHp || 3) - 1;
            orb.iframeTil = this.time.now + 500;

            const flash = this.add.circle(orb.x, orb.y, 22, 0xffffff, 0.85);
            this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 220, onComplete: () => flash.destroy() });

            if (orb.orbHp <= 0) {
                if (orb.pulseTween) orb.pulseTween.stop();
                const boom = this.add.circle(orb.x, orb.y, 16, 0xffffff, 0.9);
                this.tweens.add({ targets: boom, alpha: 0, scaleX: 3.5, scaleY: 3.5, duration: 300, onComplete: () => boom.destroy() });
                if (orb.bossRef && orb.bossRef.active) {
                    orb.bossRef.ultOrbsLeft     = Math.max(0, (orb.bossRef.ultOrbsLeft     || 1) - 1);
                    orb.bossRef.stormUltOrbsLeft = Math.max(0, (orb.bossRef.stormUltOrbsLeft || 1) - 1);
                }
                // Storm orbs reward the player with 15% max HP on destroy
                if (orb.orbType === 'storm_orb' && this.player && this.player.active) {
                    const heal = Math.floor(this.player.maxHp * 0.15);
                    this.player.gainHp(heal);
                    const healTxt = this.add.text(orb.x, orb.y - 20, `+${heal} HP`, {
                        fontSize: '16px', fontFamily: 'Arial Black, Arial',
                        color: '#88ffcc', stroke: '#000000', strokeThickness: 3,
                    }).setOrigin(0.5).setDepth(10);
                    this.tweens.add({ targets: healTxt, y: orb.y - 70, alpha: 0, duration: 900, onComplete: () => healTxt.destroy() });
                }
                orb.destroy();
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

        // Chamber trap: slow player on contact
        this.physics.add.overlap(this.player, this.chamberTraps, (player, trap) => {
            if (trap._trapCd && trap._trapCd > this.time.now) return;
            trap._trapCd = this.time.now + 3500;
            this.player.applyTrap(3000);
        });

        // Kayo knife: suppress player ability when nearby
        this.physics.add.overlap(this.player, this.kayoKnives, (player, knife) => {
            if (knife._suppressCd && knife._suppressCd > this.time.now) return;
            knife._suppressCd = this.time.now + 4500;
            this.kayoSuppressed = true;
            this.player.floatText('SUPPRESSED!', '#80deea');
            this.time.delayedCall(4000, () => { this.kayoSuppressed = false; });
        });

        // Killjoy detainment rods: slow player on contact
        this.physics.add.overlap(this.player, this.killjoyRods, (player, rod) => {
            if (rod._rodCd && rod._rodCd > this.time.now) return;
            rod._rodCd = this.time.now + 2800;
            this.player.applyTrap(2500);
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

        this.physics.add.overlap(this.player, this.doorGroup, (player, door) => {
            if (door.used) return;
            if (this.roomDone && !this.showingUpgrade) {
                door.used = true;
                this.openUpgradeScreen();
            }
        });

        this.events.on('resume',              this.onSceneResumed,        this);
        this.events.on('spawnFireball',       this.onSpawnFireball,       this);
        this.events.on('dropHealth',          this.onDropHealth,          this);
        this.events.on('dropPowerup',         this.onDropPowerup,         this);
        this.events.on('enemyDied',           this.onEnemyDied,           this);
        this.events.on('dashDamage',          this.onDashDamage,          this);
        this.events.on('spawnIceOrb',         this.onSpawnIceOrb,         this);
        this.events.on('bossKilled',          () => {
            this.bossMusic.stop();
            if (this._stormMusic)   { this._stormMusic.stop();   this._stormMusic   = null; }
            if (this._titanMusic)   { this._titanMusic.stop();   this._titanMusic   = null; }
            if (this._blazeMusic)   { this._blazeMusic.stop();   this._blazeMusic   = null; }
            if (this._phantomMusic) { this._phantomMusic.stop(); this._phantomMusic = null; }
        }, this);
        this.events.on('lifeStealKill',       (amt) => this.player.gainHp(amt), this);
        this.events.on('hpChanged',           (hp)  => this.registry.set('playerHp', hp), this);
        this.events.on('playerDied',          this.onPlayerDied,          this);
        this.events.on('requestSpawn',        this.onSpawnRequest,        this);
        this.events.on('viperPitStart',       this.onViperPitStart,       this);
        this.events.on('viperPitEnd',         this.onViperPitEnd,         this);
        this.events.on('chamberTrapSpawn',    this.onChamberTrapSpawn,    this);
        this.events.on('kayoKnifeSpawn',      this.onKayoKnifeSpawn,      this);
        this.events.on('kayoUltStart',        this.onKayoUltStart,        this);
        this.events.on('kayoUltEnd',          this.onKayoUltEnd,          this);
        this.events.on('kayoEmpBlast',        this.onKayoEmpBlast,        this);
        this.events.on('killjoyTurretsPlaced',this.onKilljoyTurretsPlaced,this);
        this.events.on('killjoyMollyLand',    this.onKilljoyMollyLand,    this);
        this.events.on('killjoyDetainRod',    this.onKilljoyDetainRod,    this);
        this.events.on('shieldChanged', (val) => this.registry.set('playerShield', val), this);
        this.events.on('temporalFieldActive', () => {
            this.enemyGroup.getChildren().forEach(e => {
                if (e.active) e.moveSpeed = Math.round((e.moveSpeed || 80) * 0.85);
            });
        }, this);

        this.input.on('pointerdown', (pointer) => {
            if (this.alive) this.player.shoot(this.playerBullets, pointer.worldX, pointer.worldY);
        });

        this.scene.launch('UIScene');
        this.scene.bringToTop('UIScene');

        this.time.delayedCall(50, () => {
            this.registry.set('playerHp',     this.player.hp);
            this.registry.set('playerMaxHp',  this.player.maxHp);
            this.registry.set('floor',        this.floor);
            this.registry.set('agentKey',     this.agentKey);
            this.registry.set('playerShield', this.player.shieldHp ?? 0);
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
            if (this.currentBossType === 'viper')   this._spawnViperArena(startX);
            if (this.currentBossType === 'storm')   this._spawnStormArena(startX);
            if (this.currentBossType === 'titan')   this._spawnTitanArena(startX);
            if (this.currentBossType === 'phantom') this._spawnPhantomArena(startX);
            this.spawnBoss(startX + ROOM_W / 2, 400);

        } else if (isMiniBoss) {
            // Use normal room layout but spawn a mini-boss + 2 guards
            LevelGenerator.generate(this, this.groundGroup, this.platformGroup, roomIndex, startX, this.floor);
            this.spawnMiniBoss(startX);

        } else {
            // 10% chance for a random event room on floor 4+
            if (this.floor > 3 && Math.random() < 0.10) {
                LevelGenerator.generate(this, this.groundGroup, this.platformGroup, roomIndex, startX, this.floor);
                this._launchEvent(startX);
            } else {
                const spawns = LevelGenerator.generate(
                    this, this.groundGroup, this.platformGroup, roomIndex, startX, this.floor
                );
                spawns.forEach(({ x, y, type, isElite }) => {
                    const e = new Enemy(this, x, y, type, this.floor, isElite);
                    if (this.activeCurse === 'frenzy')    e.moveSpeed = Math.round(e.moveSpeed * 1.25);
                    if (this.activeCurse === 'fortified') e.armorMod  = 0.8;
                    if (this.player?.temporalField)       e.moveSpeed = Math.round(e.moveSpeed * 0.85);
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

        // Lock camera to this room only — arena feel, no wide side-scroll
        const newW = (roomIndex + 1) * ROOM_W;
        this.physics.world.setBounds(0, 0, newW, this.scale.height);
        this.cameras.main.setBounds(startX, 0, ROOM_W, this.scale.height);

        // Invisible left wall so player can't walk off the left edge
        const leftWall = this.groundGroup.create(startX - 16, this.scale.height / 2, null);
        leftWall.setVisible(false).setSize(32, this.scale.height).setImmovable(true).refreshBody();

        // Zone transition announcement
        const zone     = Math.floor((this.floor - 1) / 10);
        const prevZone = this.floor > 1 ? Math.floor((this.floor - 2) / 10) : 0;
        if (zone > 0 && zone !== prevZone) {
            const ZONE_NAMES  = ['', 'NEON DISTRICT', 'VOLCANIC DEPTHS', 'THE VOID'];
            const ZONE_COLORS = ['', '#ce93d8',       '#ff7043',         '#7c4dff'];
            const name  = ZONE_NAMES[Math.min(zone,  ZONE_NAMES.length  - 1)];
            const color = ZONE_COLORS[Math.min(zone, ZONE_COLORS.length - 1)];
            this.time.delayedCall(600, () => {
                const txt = this.add.text(this.scale.width / 2, 200, `ENTERING  ${name}`, {
                    fontSize: '26px', color, fontStyle: 'bold', letterSpacing: 5,
                }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
                this.cameras.main.flash(600, 255, 255, 255);
                this.tweens.add({ targets: txt, alpha: 0, y: 160, duration: 3200, delay: 800, onComplete: () => txt.destroy() });
            });
        } else if (this.floor > 1 && this.floor % 10 === 0 && zone === prevZone) {
            // Layout style shift within the same zone (floor 40, 50, 60 ...)
            const LAYOUT_NAMES = ['SCATTERED', 'TOWER', 'STAIRCASE'];
            const style = Math.floor(this.floor / 10) % 3;
            const label = LAYOUT_NAMES[style];
            this.time.delayedCall(600, () => {
                const txt = this.add.text(this.scale.width / 2, 200, `LAYOUT SHIFT  ·  ${label}`, {
                    fontSize: '22px', color: '#aaddff', fontStyle: 'bold', letterSpacing: 4,
                }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
                this.tweens.add({ targets: txt, alpha: 0, y: 160, duration: 2800, delay: 600, onComplete: () => txt.destroy() });
            });
        }
    }

    spawnBoss(x, y) {
        const type = this.currentBossType || 'viper';
        const boss = new Boss(this, x, y, this.floor, type);
        this.enemyGroup.add(boss);
        boss.setDepth(2); // above bgtile (0) so clouds/effects at depth 1 show correctly
        this.enemyCount = 1;

        if (type !== 'storm' && type !== 'titan' && type !== 'blaze' && type !== 'phantom') this.bossMusic.play(type);
        if (type === 'titan') {
            if (this._titanMusic) { this._titanMusic.stop(); this._titanMusic = null; }
            this._titanMusic = new TitanMusic();
            this._titanMusic.start();
        }
        if (type === 'blaze') {
            if (this._blazeMusic) { this._blazeMusic.stop(); this._blazeMusic = null; }
            this._blazeMusic = new BlazeMusic();
            this._blazeMusic.start();
        }
        if (type === 'phantom') {
            if (this._phantomMusic) { this._phantomMusic.stop(); this._phantomMusic = null; }
            this._phantomMusic = new PhantomMusic();
            this._phantomMusic.start();
        }

        const colors = { viper:'#cc44ff', blaze:'#ff6600', phantom:'#00e5ff', titan:'#cc8833', storm:'#ffff00', killjoy:'#ffee00', chamber:'#ffe082', kayo:'#80deea' };
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
        if (this.player?.temporalField) e.moveSpeed = Math.round(e.moveSpeed * 0.85);
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

    onChamberTrapSpawn(x, y) {
        const trap = this.chamberTraps.create(x, y, 'chamber_trap');
        if (!trap) return;
        trap.setImmovable(true);
        trap.refreshBody();
        // Visual pulse on the trap
        this.tweens.add({ targets: trap, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
        // Traps expire after 18s
        this.time.delayedCall(18000, () => { if (trap?.active) trap.destroy(); });
    }

    onKayoKnifeSpawn(x, y) {
        const knife = this.kayoKnives.create(x, y, 'kayo_knife');
        if (!knife) return;
        knife.setImmovable(true);
        knife.refreshBody();
        this.tweens.add({ targets: knife, alpha: 0.5, yoyo: true, repeat: -1, duration: 400 });
        // Knife expires after 5s
        this.time.delayedCall(5000, () => {
            if (knife?.active) {
                this.tweens.add({ targets: knife, alpha: 0, duration: 500, onComplete: () => knife?.destroy() });
            }
        });
    }

    onKayoUltStart() {
        this.kayoSuppressed = true;
        const W = this.scale.width;
        const txt = this.add.text(W / 2, 260, 'SUPPRESSED!', {
            fontSize: '32px', color: '#80deea', fontStyle: 'bold',
            stroke: '#003344', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(15);
        this.tweens.add({ targets: txt, alpha: 0, y: 220, duration: 2200, delay: 600, onComplete: () => txt.destroy() });
    }

    onKayoUltEnd() {
        this.kayoSuppressed = false;
    }

    onKayoEmpBlast() {
        // Temporarily halve player fire rate for 3.5 s
        if (!this.player?.active) return;
        const prev = this.player.attackCdMax;
        this.player.attackCdMax = Math.round(prev * 1.65);
        this.player.floatText('EMP DISRUPTED!', '#42a5f5');
        this.cameras.main.shake(160, 0.008);
        this.time.delayedCall(3500, () => {
            if (this.player?.active) this.player.attackCdMax = prev;
        });
    }

    onKilljoyMollyLand(x, y) {
        // Electrical AOE field that pulses damage + teal visual for 3s
        const gfx = this.add.graphics().setDepth(4);
        const dur = 3200;
        const pulseMs = 500;
        let elapsed = 0;
        const draw = (bright) => {
            gfx.clear();
            gfx.fillStyle(0x00c8a0, bright ? 0.28 : 0.14);  gfx.fillCircle(x, y, 55);
            gfx.fillStyle(0xffe033, bright ? 0.40 : 0.22);  gfx.fillCircle(x, y, 34);
            gfx.fillStyle(0x00ffcc, bright ? 0.55 : 0.30);  gfx.fillCircle(x, y, 16);
            gfx.lineStyle(2, 0xffe033, bright ? 0.9 : 0.4); gfx.strokeCircle(x, y, 55);
        };
        draw(true);

        const tick = this.time.addEvent({
            delay: pulseMs,
            repeat: Math.ceil(dur / pulseMs),
            callback: () => {
                elapsed += pulseMs;
                const bright = (elapsed / pulseMs) % 2 < 1;
                draw(bright);
                // Damage player if inside field
                if (this.player?.active) {
                    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
                    if (d < 55) {
                        this.player.takeDamage(Math.round((this.boss?.damage ?? 18) * 0.45));
                        this.player.floatText('ELECTRIC!', '#ffe033');
                    }
                }
                if (elapsed >= dur) { tick.remove(); gfx.destroy(); }
            },
        });
    }

    onKilljoyDetainRod(x, y) {
        // Draw a glowing detainment rod and add a hitbox
        const gfx = this.add.graphics().setDepth(5);
        const rodH = 72;
        // Rod body
        gfx.fillStyle(0x111a1a, 0.9);     gfx.fillRect(x - 6, y - rodH, 12, rodH);
        gfx.fillStyle(0xffe033, 0.85);    gfx.fillRect(x - 8, y - rodH, 16, 6);
        gfx.fillStyle(0xffe033, 0.85);    gfx.fillRect(x - 8, y - 6,    16, 6);
        gfx.fillStyle(0x00c8a0, 0.70);    gfx.fillRect(x - 4, y - rodH + 6, 8, rodH - 12);
        gfx.fillStyle(0x44ffe0, 1);       gfx.fillCircle(x, y - rodH / 2, 5);
        // Slow field visual
        gfx.fillStyle(0xffe033, 0.10);    gfx.fillCircle(x, y, 60);
        gfx.lineStyle(2, 0xffe033, 0.45); gfx.strokeCircle(x, y, 60);

        // Pulse tween
        this.tweens.add({ targets: gfx, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });

        // Physics hitbox for slow zone
        const rod = this.killjoyRods.create(x, y, null);
        if (rod) {
            rod.setAlpha(0);
            rod.setSize(120, 120);
            rod.setImmovable(true);
            rod.refreshBody();
        }

        // Rods expire after 6s
        this.time.delayedCall(6000, () => {
            gfx.destroy();
            if (rod?.active) rod.destroy();
        });
    }

    onKilljoyTurretsPlaced(positions) {
        positions.forEach(tp => {
            const g = this.add.graphics().setDepth(4);
            // Base platform
            g.fillStyle(0x111a1a, 0.95);  g.fillRect(tp.x - 16, tp.y - 22, 32, 22);
            // Yellow accent trim
            g.fillStyle(0xffe033, 0.9);   g.fillRect(tp.x - 16, tp.y - 22, 32, 4);
            g.fillStyle(0xffe033, 0.9);   g.fillRect(tp.x - 16, tp.y - 4,  32, 4);
            // Teal barrel
            g.fillStyle(0x00c8a0, 1);     g.fillRect(tp.x - 4,  tp.y - 18, 22, 8);
            // Core glow
            g.fillStyle(0x44ffe0, 1);     g.fillCircle(tp.x - 2, tp.y - 14, 5);

            this.tweens.add({ targets: g, alpha: 0.7, yoyo: true, repeat: -1, duration: 700 });

            if (!this._killjoyTurretGfx) this._killjoyTurretGfx = [];
            this._killjoyTurretGfx.push(g);
        });
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
        if (this.player.upgrades.includes('ricochet') && !bullet.bounced) {
            const b = bullet.body;
            if (b.blocked.left || b.blocked.right) {
                bullet.bounced = true;
                bullet.origVx  = -bullet.origVx;
                bullet.setVelocity(bullet.origVx, bullet.origVy);
                bullet.setRotation(Math.atan2(bullet.origVy, bullet.origVx));
                return;
            }
            if (b.blocked.up) {
                bullet.bounced = true;
                bullet.origVy  = -Math.abs(bullet.origVy) + 60;
                bullet.setVelocity(bullet.origVx, bullet.origVy);
                bullet.setRotation(Math.atan2(bullet.origVy, bullet.origVx));
                return;
            }
        }
        bullet.destroy();
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
        const coinAmt = (this.player.goldMagnet ? 2 : 1) * Math.max(5, Math.ceil(this.floor / 2));
        this.coins += coinAmt;
        this.registry.set('coins', this.coins);
        if (this.player.deathmark) this.player.deathmarkReady = true;
        this._checkRoomClear();
    }

    _checkRoomClear() {
        if (this.roomDone) return;

        // Puzzle: block door spawn until we're ready (event scene launched)
        if (this.eventType === 'puzzle' && !this._puzzleDoorReady) return;

        // Minigame: handle wave progression instead of normal room-clear
        if (this.eventType === 'minigame') {
            const stillAlive = this.enemyGroup.getChildren().filter(e => e.active);
            if (stillAlive.length > 0) { this.enemyCount = stillAlive.length; return; }
            this._onMinigameWaveCleared();
            return;
        }

        // Ground truth: count actually living non-spawned enemies in the group.
        // This is the authoritative check — the counter is a fast-path hint only.
        const stillAlive = this.enemyGroup.getChildren().filter(e => e.active && !e.isSpawnedEnemy);

        if (stillAlive.length > 0) {
            // Re-sync the counter in case it drifted
            this.enemyCount = stillAlive.length;
            return;
        }

        this.roomDone = true;

        // Remove arena containment walls so the player can reach the exit door
        this.bossWalls.clear(true, true);

        // Destroy any spawned runners still alive (from spawner enemies)
        this.enemyGroup.getChildren().slice().forEach(e => {
            if (e.active && e.isSpawnedEnemy) { e.cleanupHpBar(); e.destroy(); }
        });

        this.spawnDoor();
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

    _playerUpgradeState() {
        if (!this.player) return {};
        return {
            multishotLevel:   this.player.multishotLevel,
            overloadLevel:    this.player.overloadLevel,
            critChance:       this.player.critChance,
            attackCdMax:      this.player.attackCdMax,
            abilityCdMax:     this.player.abilityCdMax,
            upgrades:         [...this.player.upgrades],
            explosiveLevel:   this.player.explosiveLevel,
            executionerLevel: this.player.executionerLevel,
            critMultiplier:   this.player.critMultiplier,
            regenActive:      this.player.regenActive,
        };
    }

    openUpgradeScreen() {
        this.showingUpgrade = true;
        const isBossFloor   = this.floor % 10 === 0;

        // Puzzle event: give bonus upgrade if player beat the timer
        if (this.eventType === 'puzzle') {
            const expired = this.registry.get('puzzleExpired');
            this._pendingUpgrades = expired ? 1 : 2;
            this.registry.set('puzzleExpired', null);
            this.eventType = null;
            if (this.scene.isActive('EventScene')) this.scene.stop('EventScene');
            if (!expired) {
                const cx  = this.cameras.main.scrollX + this.scale.width / 2;
                const txt = this.add.text(cx, 260, '⚡ CHALLENGE COMPLETE — BONUS UPGRADE!', {
                    fontSize: '22px', color: '#00e5ff', fontStyle: 'bold',
                }).setOrigin(0.5).setScrollFactor(0);
                this.tweens.add({ targets: txt, alpha: 0, y: 220, duration: 2200, delay: 600, onComplete: () => txt.destroy() });
            }
        }

        if (isBossFloor && this.player.abilityLevel < 2) {
            // Show ability upgrade scene first, then regular upgrades follow in sequence
            const newLevel = this.player.abilityLevel + 1;
            this.scene.launch('AbilityUpgradeScene', { agentKey: this.agentKey, abilityLevel: newLevel });
            this.scene.pause();
        } else {
            this.scene.launch('UpgradeScene', { floor: this.floor, playerState: this._playerUpgradeState() });
            this.scene.pause();
        }
    }

    onSceneResumed() {
        const shopClosed   = this.registry.get('shopClosed');
        const casinoClosed = this.registry.get('casinoClosed');
        const abilityLevel = this.registry.get('pickedAbilityLevel');
        const upgradeId    = this.registry.get('pickedUpgrade');
        const weaponId     = this.registry.get('pickedWeapon');

        if (casinoClosed) {
            this.registry.set('casinoClosed', null);
            this.coins = this.registry.get('coins') ?? this.coins;
            this.showingUpgrade = false;
            this.roomDone = true;
            this.spawnDoor();
            return;
        }

        if (shopClosed) {
            // Shop closed — apply all queued purchases then open the door
            this.registry.set('shopClosed', null);
            this.coins = this.registry.get('coins') ?? this.coins;
            const purchases = this.registry.get('shopPurchases') || [];
            this.registry.set('shopPurchases', []);
            purchases.forEach(id => this.player.applyUpgrade(id));
            this.registry.set('playerMaxHp', this.player.maxHp);
            this.registry.set('playerHp',    this.player.hp);
            this.showingUpgrade = false;
            this.roomDone = true;
            this.spawnDoor();

        } else if (abilityLevel != null) {
            // Ability scene confirmed — apply and show regular upgrades next
            this.registry.set('pickedAbilityLevel', null);
            this._applyAbilityUpgrade(abilityLevel);
            this.scene.launch('UpgradeScene', { floor: this.floor, playerState: this._playerUpgradeState() });
            this.scene.pause();

        } else if (upgradeId) {
            // Regular upgrade picked — apply it
            this.registry.set('pickedUpgrade', null);
            this.player.applyUpgrade(upgradeId);
            this.registry.set('playerMaxHp', this.player.maxHp);
            this.registry.set('playerHp',    this.player.hp);

            // If puzzle gave a bonus pick, show another upgrade card
            if (this._pendingUpgrades > 1) {
                this._pendingUpgrades--;
                this.scene.launch('UpgradeScene', { floor: this.floor, playerState: this._playerUpgradeState() });
                this.scene.pause();
                return;
            }
            this._pendingUpgrades = 0;

            // Check if a weapon upgrade is available (boss floors only, up to tier 2)
            const isBossFloor = this.floor % 10 === 0;
            if (isBossFloor && this.player.weaponLevel < 2) {
                const newWepLevel = this.player.weaponLevel + 1;
                this.scene.launch('WeaponUpgradeScene', { agentKey: this.agentKey, weaponLevel: newWepLevel });
                this.scene.pause();
            } else {
                this.showingUpgrade = false;
                this.advanceRoom();
            }

        } else if (weaponId) {
            // Weapon upgrade confirmed
            this.registry.set('pickedWeapon', null);
            this.player.applyWeaponUpgrade(weaponId);
            this.showingUpgrade = false;
            this.advanceRoom();

        } else {
            // No registry key — spurious resume, just unblock the flag
            this.showingUpgrade = false;
        }
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
        const wallR = startX + ROOM_W - 32;

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

    _spawnStormArena(startX) {
        const tileW  = 64;
        const wallL  = startX + 32;
        const wallR  = startX + ROOM_W - 32;
        const CEIL_Y = 24;

        // ── Dark storm sky background ──
        const bg = this.add.rectangle(
            startX + ROOM_W / 2, this.scale.height / 2,
            ROOM_W, this.scale.height, 0x050510
        ).setDepth(-3);
        this._stormBg = bg;

        // ── Tint existing ground/platform tiles to storm color ──
        this.groundGroup.getChildren().forEach(tile => {
            if (tile.x >= startX && tile.x < startX + ROOM_W) tile.setTint(0x1a1a3a);
        });
        this.platformGroup.getChildren().forEach(tile => {
            if (tile.x >= startX && tile.x < startX + ROOM_W) tile.setTint(0x2244aa);
        });

        // ── Left & right containment walls ──
        for (let y = tileW / 2; y < GROUND_Y + tileW; y += tileW) {
            for (const wx of [wallL, wallR]) {
                const w = this.bossWalls.create(wx, y, 'ground_void');
                w.setImmovable(true);
                w.setTint(0x2255ff);
                w.setAlpha(0.85);
                w.refreshBody();
            }
        }

        // ── Invisible ceiling (for bullet bounce) ──
        for (let x = wallL; x <= wallR; x += tileW) {
            const c = this.bossWalls.create(x, CEIL_Y, 'ground_void');
            c.setImmovable(true);
            c.setAlpha(0);
            c.refreshBody();
        }

        // ── Visual ceiling border — thin blue line ──
        const ceilGfx = this.add.graphics().setDepth(-1);
        ceilGfx.fillStyle(0x4477ff, 0.65);
        ceilGfx.fillRect(wallL - 16, 0, ROOM_W - 32, 6);
        this._stormCeilGfx = ceilGfx;

        // ── Ambient lightning flicker ──
        const ambientGfx = this.add.graphics().setDepth(-2);
        this._stormAmbientGfx = ambientGfx;
        this._stormFlickerLoop(ambientGfx, startX);

        // ── Rain particles ──
        if (this._stormRain) { this._stormRain.destroy(); this._stormRain = null; }
        this._stormRain = this.add.particles(0, -20, 'raindrop', {
            x:        { min: startX, max: startX + ROOM_W },
            y:        0,
            speedX:   { min: -55, max: -20 },
            speedY:   { min: 420, max: 680 },
            lifespan: { min: 1100, max: 1800 },
            alpha:    { min: 0.20, max: 0.55 },
            scale:    { min: 0.7,  max: 1.4  },
            quantity: 4,
            frequency: 18,
            gravityY:  0,
            rotate:    { min: -8, max: 8 },
        }).setDepth(5);

        // ── Storm boss music ──
        if (this._stormMusic) { this._stormMusic.stop(); this._stormMusic = null; }
        this._stormMusic = new StormMusic();
        this._stormMusic.start();
    }

    _spawnTitanArena(startX) {
        const GY   = GROUND_Y;
        const cx   = startX + ROOM_W / 2;
        const bg   = this.add.graphics().setDepth(-3);

        // Dark stone base
        bg.fillStyle(0x100e0a);
        bg.fillRect(startX, 0, ROOM_W, GY);
        bg.fillStyle(0x0c0a07, 0.45);
        for (let x = startX; x < startX + ROOM_W; x += 200) bg.fillRect(x, 0, 100, GY);

        // fillPoints helper — coords relative to cx
        const FP = (coords, col, a = 1) => {
            bg.fillStyle(col, a);
            const pts = [];
            for (let i = 0; i < coords.length; i += 2) pts.push({ x: cx + coords[i], y: coords[i + 1] });
            bg.fillPoints(pts, true);
        };

        // GIANT HEAD (looms from above, mostly off-screen at top)
        FP([-300,-100, -190,-155, -110,-135, -55,-175, 0,-195, 55,-175, 110,-135, 190,-155, 300,-100,
            345,-38, 370,76, 348,215, 268,290, 150,330, 0,348, -150,330, -268,290, -348,215, -370,76, -345,-38], 0x1e1410);
        // Lit top-left facet
        FP([-300,-100, -150,-155, 0,-195, 0,0, -110,40, -268,-38, -345,-38], 0x2e2018);
        FP([-200,-120, -70,-175, 0,-195, 0,-76, -95,-38, -228,-78], 0x3c2c1c);
        // Right shadow
        FP([300,-100, 370,72, 348,215, 268,290, 0,0, 0,-195, 76,-175], 0x120c08);
        // Head cracks
        bg.fillStyle(0x0a0804);
        bg.fillRect(cx - 196, -100, 8, 390); bg.fillRect(cx + 188, -100, 8, 390);
        bg.fillRect(cx - 76, -100, 6, 368);  bg.fillRect(cx + 70, -100, 6, 368);
        bg.fillStyle(0xcc3300, 0.28);
        bg.fillRect(cx - 192, -80, 4, 350); bg.fillRect(cx + 192, -80, 4, 350);

        // LEFT EYE SOCKET — large glowing lava eye
        FP([-272,22, -196,-18, -116,-18, -76,22, -76,98, -116,138, -196,138, -272,98], 0x090604);
        FP([-262,28, -200,-10, -120,-10, -84,28, -84,92, -120,130, -200,130, -262,92], 0x540a00);
        FP([-250,34, -204,-2,  -124,-2,  -92,34, -92,86, -124,122, -204,122, -250,86], 0x991800);
        FP([-238,40, -208,6,   -128,6,   -100,40,-100,80,-128,114, -208,114, -238,80], 0xcc2c00);
        FP([-226,46, -212,14,  -132,14,  -108,46,-108,74,-132,106, -212,106, -226,74], 0xff5000);
        bg.fillStyle(0xff8c00, 0.72); bg.fillRect(cx - 218, 50, 108, 22);
        bg.fillStyle(0xffcc44, 0.62); bg.fillRect(cx - 210, 54, 92, 12);
        bg.fillStyle(0xffffa0, 0.52); bg.fillRect(cx - 198, 56, 68, 6);

        // RIGHT EYE (mirror)
        FP([76,22, 116,-18, 196,-18, 272,22, 272,98, 196,138, 116,138, 76,98], 0x090604);
        FP([84,28, 120,-10, 200,-10, 262,28, 262,92, 200,130, 120,130, 84,92], 0x540a00);
        FP([92,34, 124,-2,  204,-2,  250,34, 250,86, 204,122, 124,122, 92,86], 0x991800);
        FP([100,40,128,6,   208,6,   238,40, 238,80, 208,114, 128,114, 100,80], 0xcc2c00);
        FP([108,46,132,14,  212,14,  226,46, 226,74, 212,106, 132,106, 108,74], 0xff5000);
        bg.fillStyle(0xff8c00, 0.72); bg.fillRect(cx + 110, 50, 108, 22);
        bg.fillStyle(0xffcc44, 0.62); bg.fillRect(cx + 118, 54, 92, 12);
        bg.fillStyle(0xffffa0, 0.52); bg.fillRect(cx + 130, 56, 68, 6);

        // NOSE
        FP([-48,176, -18,158, 0,148, 18,158, 48,176, 38,228, 0,238, -38,228], 0x1a1008);
        bg.fillStyle(0x0a0604);
        bg.fillRect(cx - 38, 184, 30, 44); bg.fillRect(cx + 8, 184, 30, 44);

        // MOUTH (cavern maw)
        FP([-292,278,-176,248,-96,264,-48,244,0,238,48,244,96,264,176,248,292,278,312,340,0,368,-312,340], 0x060402);
        bg.fillStyle(0x6b0000, 0.6); bg.fillRect(cx - 252, 294, 504, 58);
        // Stone teeth
        bg.fillStyle(0x2e2018);
        for (let i = -4; i <= 4; i++) bg.fillRect(cx + i * 54 - 20, 250, 40, 52);
        bg.fillStyle(0x4a3828);
        for (let i = -4; i <= 4; i++) bg.fillRect(cx + i * 54 - 20, 250, 16, 44);
        bg.fillStyle(0x0a0604);
        for (let i = -3; i <= 4; i++) bg.fillRect(cx + i * 54 - 22, 250, 4, 48);

        // BODY beneath face
        FP([-370,334,-272,316,0,334,272,316,370,334,392,514,356,616,0,GY,-356,616,-392,514], 0x1a1208);
        FP([-272,316,-174,326,0,334,174,326,272,316,252,434,0,454,-252,434], 0x261a10);
        bg.fillStyle(0x0a0604);
        bg.fillRect(cx - 194, 346, 10, GY - 346); bg.fillRect(cx + 184, 346, 10, GY - 346);
        bg.fillRect(cx - 76, 386, 8, GY - 386);   bg.fillRect(cx + 68, 386, 8, GY - 386);
        bg.fillRect(cx - 354, 478, 708, 10);
        bg.fillStyle(0xff4400, 0.25);
        bg.fillRect(cx - 190, 366, 5, GY - 366); bg.fillRect(cx + 189, 366, 5, GY - 366);
        bg.fillStyle(0xff3300, 0.2); bg.fillRect(cx - 354, 482, 708, 5);

        // LEFT FIST at ground level
        const fy = GY - 230;
        FP([-680,fy, -538,fy-58, -438,fy-18, -398,fy+82, -398,GY, -700,GY], 0x1a1008);
        FP([-672,fy+5,-542,fy-50,-442,fy-10,-406,fy+90,-406,GY-2,-694,GY-2], 0x2e2018);
        FP([-596,fy-2,-538,fy-48,-458,fy-12,-458,fy+82,-596,fy+82], 0x3e2e20);
        bg.fillStyle(0x4a3828);
        for (let k = 0; k < 4; k++) {
            bg.fillRect(cx - 658 + k * 54, fy - 62, 42, 58);
            bg.fillStyle(0x5e4a38);
            bg.fillRect(cx - 656 + k * 54, fy - 60, 16, 48);
            bg.fillStyle(0x4a3828);
        }
        bg.fillStyle(0xcc3300, 0.32);
        bg.fillRect(cx - 638, fy - 18, 5, GY - fy + 18); bg.fillRect(cx - 578, fy - 28, 5, GY - fy + 28);
        bg.fillRect(cx - 518, fy - 28, 5, GY - fy + 28); bg.fillRect(cx - 458, fy - 18, 5, GY - fy + 18);

        // RIGHT FIST (mirror)
        FP([398,fy+82, 438,fy-18, 538,fy-58, 680,fy, 700,GY, 398,GY], 0x1a1008);
        FP([406,fy+90, 442,fy-10, 542,fy-50, 672,fy+5, 694,GY-2, 406,GY-2], 0x2e2018);
        FP([458,fy-12, 538,fy-48, 596,fy-2, 596,fy+82, 458,fy+82], 0x3e2e20);
        bg.fillStyle(0x4a3828);
        for (let k = 0; k < 4; k++) {
            bg.fillRect(cx + 418 + k * 54, fy - 62, 42, 58);
            bg.fillStyle(0x5e4a38);
            bg.fillRect(cx + 420 + k * 54, fy - 60, 16, 48);
            bg.fillStyle(0x4a3828);
        }
        bg.fillStyle(0xcc3300, 0.32);
        bg.fillRect(cx + 456, fy - 18, 5, GY - fy + 18); bg.fillRect(cx + 516, fy - 28, 5, GY - fy + 28);
        bg.fillRect(cx + 576, fy - 28, 5, GY - fy + 28); bg.fillRect(cx + 636, fy - 18, 5, GY - fy + 18);

        // Ground lava fissures
        bg.fillStyle(0x2a1008);
        bg.fillRect(startX, GY - 18, ROOM_W, 18);
        bg.fillStyle(0xff4400, 0.2);
        for (let x = startX + 80; x < startX + ROOM_W - 80; x += 140) {
            bg.fillRect(x, GY - 12, 70, 7);
            bg.fillStyle(0xff8800, 0.13);
            bg.fillRect(x + 12, GY - 8, 46, 3);
            bg.fillStyle(0xff4400, 0.2);
        }

        // Tint ground/platform tiles
        this.groundGroup.getChildren().forEach(t => {
            if (t.x >= startX && t.x < startX + ROOM_W) t.setTint(0x2a1e14);
        });
        this.platformGroup.getChildren().forEach(t => {
            if (t.x >= startX && t.x < startX + ROOM_W) t.setTint(0x3e2e20);
        });

        // Containment walls (invisible)
        const tileW = 64;
        const wallL = startX + 32;
        const wallR = startX + ROOM_W - 32;
        for (let y = tileW / 2; y < GY + tileW; y += tileW) {
            for (const wx of [wallL, wallR]) {
                const w = this.bossWalls.create(wx, y, 'ground_void');
                w.setImmovable(true);
                w.setAlpha(0);
                w.refreshBody();
            }
        }

        this._titanBg = bg;
    }

    _spawnPhantomArena(startX) {
        const GY = GROUND_Y;
        const cx = startX + ROOM_W / 2;
        const bg = this.add.graphics().setDepth(-3);

        // Near-void background
        bg.fillStyle(0x02000a);
        bg.fillRect(startX, 0, ROOM_W, GY);
        // Upper deep purple haze
        bg.fillStyle(0x08001a, 0.70);
        bg.fillRect(startX, 0, ROOM_W, GY * 0.65);

        // Central void vortex — concentric dark circles
        const vortexY = GY * 0.38;
        [[320, 0x060015, 0.60], [240, 0x0c0028, 0.50], [170, 0x140040, 0.40],
         [110, 0x1e0060, 0.30], [65,  0x280080, 0.20]].forEach(([r, col, a]) => {
            bg.fillStyle(col, a); bg.fillCircle(cx, vortexY, r);
        });

        // Spectral energy rings (faint outline rings around the vortex)
        [380, 320, 250, 185].forEach((r, i) => {
            bg.lineStyle(1.5, 0x00c8ee, 0.04 + i * 0.015);
            bg.strokeCircle(cx, vortexY, r);
        });

        // Floating spectral orbs scattered in the background
        [
            [cx - 520, 100, 20], [cx + 460, 140, 16], [cx - 320, 260, 26],
            [cx + 380, 220, 18], [cx - 200,  70, 12], [cx + 300,  80, 22],
            [cx - 580, 380, 22], [cx + 520, 360, 18], [cx -  80, 480, 14],
            [cx + 200, 500, 16], [cx - 420, 480, 20], [cx + 420, 440, 24],
        ].forEach(([ox, oy, r]) => {
            bg.fillStyle(0x004466, 0.10); bg.fillCircle(ox, oy, r + 8);
            bg.fillStyle(0x009aaa, 0.16); bg.fillCircle(ox, oy, r);
            bg.fillStyle(0x00c8ee, 0.22); bg.fillCircle(ox, oy, r * 0.55);
            bg.fillStyle(0x66eeff, 0.35); bg.fillCircle(ox, oy, r * 0.25);
        });

        // Faint aurora-like vertical streaks in upper area
        for (let i = 0; i < 10; i++) {
            const sx = startX + i * (ROOM_W / 10) + 30;
            const w  = 18 + Math.abs(Math.sin(i * 1.618)) * 28;
            bg.fillStyle(0x180040, 0.12);
            bg.fillRect(sx - w / 2, 0, w, GY * 0.52);
        }

        // Ghostly silhouette impressions (faint humanoid shapes in the deep background)
        [[cx - 500, 120], [cx + 420, 160], [cx - 210, 300], [cx + 280, 270]].forEach(([gx, gy]) => {
            bg.fillStyle(0x0a0020, 0.20);
            bg.fillEllipse(gx, gy, 24, 66);
            bg.fillStyle(0x0a0020, 0.16);
            bg.fillCircle(gx, gy - 42, 13);
        });

        // Void ground treatment
        bg.fillStyle(0x050012);
        bg.fillRect(startX, GY - 24, ROOM_W, 24);
        // Spectral cracks in the ground
        bg.fillStyle(0x00c8ee, 0.14);
        for (let x = startX + 60; x < startX + ROOM_W - 60; x += 110) {
            bg.fillRect(x, GY - 14, 55, 3);
            bg.fillStyle(0x44e8ff, 0.18);
            bg.fillRect(x + 8, GY - 10, 38, 2);
            bg.fillStyle(0x00c8ee, 0.14);
        }

        // Tint tiles to deep void colours
        this.groundGroup.getChildren().forEach(t => {
            if (t.x >= startX && t.x < startX + ROOM_W) t.setTint(0x080018);
        });
        this.platformGroup.getChildren().forEach(t => {
            if (t.x >= startX && t.x < startX + ROOM_W) t.setTint(0x100030);
        });

        // Invisible containment walls
        const tileW = 64;
        const wallL = startX + 32;
        const wallR = startX + ROOM_W - 32;
        for (let y = tileW / 2; y < GY + tileW; y += tileW) {
            for (const wx of [wallL, wallR]) {
                const w = this.bossWalls.create(wx, y, 'ground_void');
                w.setImmovable(true);
                w.setAlpha(0);
                w.refreshBody();
            }
        }

        this._phantomBg = bg;
    }

    _stormFlickerLoop(gfx, startX) {
        if (!gfx || !gfx.active) return;
        gfx.clear();
        // Draw 2-3 faint jagged lightning streaks in the background
        const count = Phaser.Math.Between(1, 3);
        for (let i = 0; i < count; i++) {
            const lx  = startX + Phaser.Math.Between(100, ROOM_W - 100);
            let   ly  = 0;
            gfx.lineStyle(1.5, 0x4466ff, 0.3);
            gfx.beginPath();
            gfx.moveTo(lx, ly);
            while (ly < GROUND_Y) {
                ly += Phaser.Math.Between(30, 80);
                const jitter = Phaser.Math.Between(-60, 60);
                gfx.lineTo(lx + jitter, ly);
            }
            gfx.strokePath();
        }
        const delay = Phaser.Math.Between(1200, 3500);
        this.time.delayedCall(delay, () => this._stormFlickerLoop(gfx, startX));
    }

    // ─── Random Event System ────────────────────────────────────────
    _launchEvent(startX) {
        const TYPES = ['shop', 'puzzle', 'minigame', 'casino'];
        this.eventType = TYPES[Phaser.Math.Between(0, 3)];

        if (this.eventType === 'shop') {
            this._showEventBanner('⬡ SHOP UNLOCKED', 'Spend your coins on upgrades', '#ffd700');
            this.time.delayedCall(1800, () => {
                this.registry.set('shopClosed',   null);
                this.registry.set('shopPurchases', []);
                this.scene.launch('ShopScene', { floor: this.floor, coins: this.coins });
                this.scene.pause();
            });

        } else if (this.eventType === 'puzzle') {
            this._puzzleDoorReady = false;
            this.registry.set('puzzleExpired', false);
            this._showEventBanner('⏱ PLATFORMING CHALLENGE', 'Reach the exit in time for a BONUS UPGRADE!', '#00e5ff');
            // Brief delay so player sees the banner, then launch countdown overlay + allow door
            this.time.delayedCall(2000, () => {
                this.scene.launch('EventScene', { type: 'puzzle', floor: this.floor });
                this._puzzleDoorReady = true;
                this._checkRoomClear(); // now with 0 enemies the door will spawn
            });

        } else if (this.eventType === 'minigame') {
            const RESTRICTIONS = ['no_jump', 'speed_demon', 'time_limit'];
            this._eventRestriction = RESTRICTIONS[Phaser.Math.Between(0, 2)];
            this._minigameWave     = 0;
            this.registry.set('minigameWave',   0);
            this.registry.set('minigameFailed', false);

            if (this._eventRestriction === 'no_jump' && this.player) {
                this.player.jumpLocked = true;
            }

            const RESTRICTION_NAMES = { no_jump: 'NO JUMPING', speed_demon: 'ENEMIES ARE FASTER', time_limit: '45-SECOND LIMIT' };
            const label = RESTRICTION_NAMES[this._eventRestriction] || 'CHALLENGE';
            this._showEventBanner(`⚔ MINIGAME — ${label}`, 'Survive 3 waves for a UNIQUE REWARD', '#ffaa00');
            this.time.delayedCall(2200, () => {
                this.scene.launch('EventScene', { type: 'minigame', restriction: this._eventRestriction, floor: this.floor });
                this._spawnMinigameWave(startX);
            });

        } else if (this.eventType === 'casino') {
            this._showEventBanner("🎰 CAMMY'S CASINO", 'Gamble your coins — spin to win!', '#ffd700');
            this.time.delayedCall(1800, () => {
                this.registry.set('casinoClosed', null);
                this.scene.launch('CasinoScene', { floor: this.floor, coins: this.coins });
                this.scene.pause();
            });
        }
    }

    _spawnMinigameWave(startX) {
        this._minigameWave++;
        this.registry.set('minigameWave', this._minigameWave);
        this.enemyCount = 0;

        const waveSizes = [0, 6, 9, 12];
        const count     = waveSizes[Math.min(this._minigameWave, 3)];

        for (let i = 0; i < count; i++) {
            const x    = startX + Phaser.Math.Between(300, ROOM_W - 200);
            const type = LevelGenerator.pickEnemyType(this.roomIndex, this._minigameWave, this.floor);
            const e    = new Enemy(this, x, GROUND_Y - 38, type, this.floor, false);
            if (this._eventRestriction === 'speed_demon') e.moveSpeed = Math.round(e.moveSpeed * 2);
            if (this.player?.temporalField)               e.moveSpeed = Math.round(e.moveSpeed * 0.85);
            this.enemyGroup.add(e);
            this.enemyCount++;
        }

        const cx  = this.cameras.main.scrollX + this.scale.width / 2;
        const txt = this.add.text(cx, 290, `WAVE ${this._minigameWave} / 3`, {
            fontSize: '30px', color: '#ffaa00', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: txt, alpha: 0, y: 250, duration: 1800, delay: 500, onComplete: () => txt.destroy() });
    }

    _onMinigameWaveCleared() {
        // Check time-limit failure
        if (this.registry.get('minigameFailed')) {
            this._completeMinigame(false);
            return;
        }

        if (this._minigameWave >= 3) {
            this._completeMinigame(true);
        } else {
            const startX = this.roomIndex * ROOM_W;
            this.time.delayedCall(1400, () => this._spawnMinigameWave(startX));
        }
    }

    _completeMinigame(success) {
        if (this.scene.isActive('EventScene')) this.scene.stop('EventScene');
        if (this.player) this.player.jumpLocked = false;
        this._eventRestriction = null;
        this.eventType         = null;
        this.registry.set('minigameFailed', false);

        if (success) {
            // Grant unique challenge upgrade immediately
            const REWARDS = ['challenge_rampage', 'challenge_vitality', 'challenge_blitz'];
            const reward  = REWARDS[Phaser.Math.Between(0, 2)];
            this.player.applyUpgrade(reward);
            this.registry.set('playerMaxHp', this.player.maxHp);
            this.registry.set('playerHp',    this.player.hp);

            const cx  = this.cameras.main.scrollX + this.scale.width / 2;
            const txt = this.add.text(cx, 260, '✓ CHALLENGE COMPLETE — UNIQUE UPGRADE GRANTED!', {
                fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
            }).setOrigin(0.5).setScrollFactor(0);
            this.tweens.add({ targets: txt, alpha: 0, y: 220, duration: 2500, delay: 800, onComplete: () => txt.destroy() });
        }

        // Open door so player can leave
        this.roomDone = true;
        this.bossWalls.clear(true, true);
        this.spawnDoor();
    }

    _showEventBanner(title, subtitle, color) {
        const cx = this.cameras.main.scrollX + this.scale.width / 2;

        const titleTxt = this.add.text(cx, 260, title, {
            fontSize: '28px', color, fontStyle: 'bold', letterSpacing: 4,
        }).setOrigin(0.5).setScrollFactor(0);

        const subTxt = this.add.text(cx, 300, subtitle, {
            fontSize: '14px', color: '#aaaaaa',
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({ targets: [titleTxt, subTxt], alpha: 0, y: '-=40', duration: 2200, delay: 1400,
            onComplete: () => { titleTxt.destroy(); subTxt.destroy(); } });
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
        if (this._stormBg)         { this._stormBg.destroy();         this._stormBg         = null; }
        if (this._stormCeilGfx)    { this._stormCeilGfx.destroy();    this._stormCeilGfx    = null; }
        if (this._stormAmbientGfx) { this._stormAmbientGfx.destroy(); this._stormAmbientGfx = null; }
        if (this._stormMusic)      { this._stormMusic.stop();          this._stormMusic      = null; }
        if (this._stormRain)       { this._stormRain.destroy();        this._stormRain       = null; }
        if (this._titanBg)         { this._titanBg.destroy();          this._titanBg         = null; }
        if (this._titanMusic)      { this._titanMusic.stop();          this._titanMusic      = null; }
        if (this._blazeMusic)      { this._blazeMusic.stop();          this._blazeMusic      = null; }
        if (this._phantomBg)       { this._phantomBg.destroy();        this._phantomBg       = null; }
        if (this._phantomMusic)    { this._phantomMusic.stop();        this._phantomMusic    = null; }
        this.viperOrbs.clear(true, true);
        this.blazeFireZones.clear(true, true);
        this.bossOrbs.clear(true, true);
        this.chamberTraps.clear(true, true);
        this.kayoKnives.clear(true, true);
        this.killjoyRods.clear(true, true);
        this.kayoSuppressed    = false;
        this.eventType         = null;
        this._eventRestriction = null;
        this._pendingUpgrades  = 0;
        this._puzzleDoorReady  = false;
        this._minigameWave     = 0;
        if (this.player) {
            this.player.jumpLocked = false;
            if (this.player.maxShieldHp > 0) {
                this.player.shieldHp = this.player.maxShieldHp;
                this.events.emit('shieldChanged', this.player.shieldHp);
            }
            if (this.player.lastStandAvailable) this.player.lastStandUsed = false;
        }
        if (this.scene.isActive('EventScene')) this.scene.stop('EventScene');
        this.registry.set('minigameFailed', false);
        this.registry.set('puzzleExpired',  false);
        if (this._killjoyTurretGfx) {
            this._killjoyTurretGfx.forEach(g => g?.destroy());
            this._killjoyTurretGfx = null;
        }
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
        if (this._stormMusic) { this._stormMusic.stop(); this._stormMusic = null; }
        if (this._titanMusic) { this._titanMusic.stop(); this._titanMusic = null; }
        if (this._blazeMusic)   { this._blazeMusic.stop();   this._blazeMusic   = null; }
        if (this._phantomMusic) { this._phantomMusic.stop(); this._phantomMusic = null; }
        if (this._titanBg)      { this._titanBg.destroy();   this._titanBg      = null; }
        if (this._phantomBg)    { this._phantomBg.destroy(); this._phantomBg    = null; }
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
            if (!this.kayoSuppressed) this.player.useAbility();
            else this.player.floatText('SUPPRESSED', '#80deea');
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

        // Minigame time-limit failure check
        if (this.eventType === 'minigame' && this.registry.get('minigameFailed')) {
            this.registry.set('minigameFailed', false);
            this._completeMinigame(false);
        }

        // Periodic safety check: catch any enemy that died silently (no kill() call)
        if (!this.roomDone && Math.floor(time / 1000) !== this._lastClearCheck) {
            this._lastClearCheck = Math.floor(time / 1000);
            this._checkRoomClear();
        }

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
