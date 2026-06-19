const GROUND_Y = 648;
const ROOM_W   = 1440;

const BOSS_TEXTURES = {
    viper:   { key: 'boss_viper',   bw: 60, bh: 88, bo: [10,8], bullet: 'boss_bullet',          name: 'VIPER'   },
    blaze:   { key: 'boss_blaze',   bw: 58, bh: 88, bo: [10,8], bullet: 'boss_bullet_blaze',    name: 'BLAZE'   },
    phantom: { key: 'boss_phantom', bw: 56, bh: 88, bo: [10,8], bullet: 'boss_bullet_phantom',  name: 'PHANTOM' },
    titan:   { key: 'boss_titan',   bw: 60, bh: 88, bo: [14,4], bullet: 'boss_bullet_titan',    name: 'TITAN'   },
    storm:   { key: 'boss_storm',   bw: 58, bh: 88, bo: [15,4], bullet: 'boss_bullet_storm',    name: 'STORM'   },
    killjoy: { key: 'boss_killjoy', bw: 56, bh: 88, bo: [16,8], bullet: 'boss_bullet_killjoy',  name: 'KILLJOY' },
    chamber: { key: 'boss_chamber', bw: 56, bh: 88, bo: [16,8], bullet: 'boss_bullet_chamber',  name: 'CHAMBER' },
    kayo:    { key: 'boss_kayo',    bw: 58, bh: 88, bo: [15,8], bullet: 'boss_bullet_kayo',     name: 'KAY/O'   },
};

export default class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, floor, type = 'viper') {
        const cfg = BOSS_TEXTURES[type];
        super(scene, x, y, cfg.key);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(cfg.bw, cfg.bh);
        this.body.setOffset(cfg.bo[0], cfg.bo[1]);

        this.bossType = type;
        this.bulletKey = cfg.bullet;

        const tier = Math.floor(floor / 10);
        this.tier  = tier;

        this.maxHp       = 900 + tier * 600;
        this.hp          = this.maxHp;
        this.phase       = 1;
        this.moveSpeed   = 82 + tier * 9;
        this.damage      = 26 + tier * 5;
        this.attackCdMax = Math.max(1100, 2100 - tier * 200);
        this.attackCd    = Math.round(this.attackCdMax * 0.6);
        this.chargeCdMax = Math.max(3500, 6000 - tier * 450);
        this.chargeCd    = Math.round(this.chargeCdMax * 0.5);

        // Shared flags
        this.isCharging  = false;
        this.chargeTimer = 0;

        // VIPER-specific
        this.poolCdMax        = 5000;
        this.poolCd           = 800;
        this.ultimateCdMax    = 30000;
        this.ultimateCd       = 5000;
        this.inUltimate       = false;
        this.ultimateOrbsLeft = 0;
        this.ultimateHealTimer = 0;
        this.pitSprayCd       = 0;
        this.pitRainCd        = 0;

        // PHANTOM-specific
        this.teleportCdMax = 5500;
        this.teleportCd    = 2000;
        this.phasing       = false;
        this.phaseTimer    = 0;

        // TITAN-specific
        this.slamCdMax  = 5000;
        this.slamCd     = 2500;
        this.armorActive = false;

        // STORM-specific
        this.pulseCdMax = 3500;
        this.pulseCd    = 1500;

        // KILLJOY-specific
        this.turretPositions  = [];  // [{x,y}] populated on first update
        this.turretFireCdMax  = this.phase === 2 ? 700 : 950;
        this.turretFireCd     = 1200;
        this.lockdownCdMax    = 9000;
        this.lockdownCd       = 9000;
        this.smgBurstTimer    = 0;
        this.smgBurstCount    = 0;

        // CHAMBER-specific
        this.sniperWarnCdMax  = 3200;
        this.sniperWarnCd     = 2000;
        this.sniperFiring     = false;
        this.sniperLine       = null;
        this.chamberTrapCdMax = 8000;
        this.chamberTrapCd    = 4000;
        this.chamberAnchorL   = null;
        this.chamberAnchorR   = null;

        // KAYO-specific
        this.kayoKnifeCdMax   = 5500;
        this.kayoKnifeCd      = 3000;
        this.kayoFlashCdMax   = 7000;
        this.kayoFlashCd      = 4000;
        this.kayoFragCdMax    = 4500;
        this.kayoFragCd       = 2000;
        this.kayoUltActive    = false;
        this.kayoUltTimer     = 0;

        scene.registry.set('bossActive', true);
        scene.registry.set('bossHp',     this.hp);
        scene.registry.set('bossMaxHp',  this.maxHp);
        scene.registry.set('bossName',   `${cfg.name} — FLOOR ${floor}`);
    }

    update(player, enemyBullets, delta) {
        if (!this.active || !player || !player.active) return;

        this.attackCd = Math.max(0, this.attackCd - delta);
        this.chargeCd = Math.max(0, this.chargeCd - delta);

        this._checkPhase2();

        switch (this.bossType) {
            case 'viper':   this._updateViper(player, enemyBullets, delta); break;
            case 'blaze':   this._updateBlaze(player, enemyBullets, delta); break;
            case 'phantom': this._updatePhantom(player, enemyBullets, delta); break;
            case 'titan':   this._updateTitan(player, enemyBullets, delta); break;
            case 'storm':   this._updateStorm(player, enemyBullets, delta); break;
            case 'killjoy': this._updateKilljoy(player, enemyBullets, delta); break;
            case 'chamber': this._updateChamber(player, enemyBullets, delta); break;
            case 'kayo':    this._updateKayo(player, enemyBullets, delta); break;
        }

        this.setFlipX(player.x < this.x);
        this.scene.registry.set('bossHp', this.hp);
    }

    _checkPhase2() {
        if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
            this.phase        = 2;
            this.moveSpeed   += 65;
            this.attackCdMax  = Math.max(900, this.attackCdMax - 450);
            this.damage      += 8;
            this.scene.cameras.main.shake(500, 0.016);
            this.showOverlayText('ENRAGED!', '#ff0000', 40);

            switch (this.bossType) {
                case 'viper':   this.setTint(0x00ff44); break;
                case 'blaze':   this.setTint(0xffffff); break;
                case 'phantom': this.setAlpha(0.7); this.setTint(0x00ffff); break;
                case 'titan':
                    this.armorActive = false;
                    this.setTint(0xff6600);
                    break;
                case 'storm':   this.setTint(0xffffff); break;
                case 'killjoy':
                    this.turretFireCdMax = Math.max(400, this.turretFireCdMax - 250);
                    this.lockdownCdMax   = Math.max(5000, this.lockdownCdMax - 2000);
                    this.setTint(0xffff00);
                    break;
                case 'chamber':
                    this.sniperWarnCdMax = Math.max(1800, this.sniperWarnCdMax - 600);
                    this.setTint(0xffe082);
                    break;
                case 'kayo':
                    this.kayoKnifeCdMax = Math.max(3000, this.kayoKnifeCdMax - 1200);
                    this.kayoFlashCdMax = Math.max(4000, this.kayoFlashCdMax - 1500);
                    this.setTint(0x80deea);
                    break;
            }
        }

        // Viper-only phase 3 at 25% HP
        if (this.bossType === 'viper' && this.phase === 2 && this.hp <= this.maxHp * 0.25) {
            this.phase        = 3;
            this.moveSpeed   += 40;
            this.attackCdMax  = Math.max(700, this.attackCdMax - 200);
            this.poolCdMax    = Math.max(1500, Math.round(this.poolCdMax * 0.5));
            this.setTint(0x00ffaa);
            this.scene.cameras.main.shake(700, 0.024);
            this.showOverlayText('ENRAGED!', '#00ffaa', 34);

            // Immediately burst 3 pools across the arena
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 280, () => {
                    if (this.active) this._spawnToxicPool();
                });
            }
        }
    }

    // ─── VIPER ──────────────────────────────────────────────────
    _updateViper(player, enemyBullets, delta) {
        // Tick ultimate cooldown
        this.ultimateCd = Math.max(0, this.ultimateCd - delta);

        // Trigger ultimate when available and below 85% HP
        if (!this.inUltimate && this.ultimateCd <= 0 && this.hp < this.maxHp * 0.85) {
            this._viperStartUltimate();
            return;
        }

        // During ultimate: move to center, heal, wait for orbs
        if (this.inUltimate) {
            this._updateViperUltimate(player, enemyBullets, delta);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.poolCd = Math.max(0, this.poolCd - delta);
        if (this.poolCd <= 0) {
            this.poolCd = this.phase >= 3 ? this.poolCdMax * 0.4 : this.phase === 2 ? this.poolCdMax * 0.55 : this.poolCdMax;
            this._spawnToxicPool();
        }

        if (this.isCharging) {
            this.chargeTimer -= delta;
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.setVelocityX(0);
                if (this.phase >= 3) this.setTint(0x00ffaa);
                else if (this.phase === 2) this.setTint(0x00ff44);
                else this.clearTint();
            }
            return;
        }

        // Preferred range: 280-420px — retreats if player rushes in
        if (dist < 280) {
            this.setVelocityX(-dir * this.moveSpeed * 1.1);
        } else if (dist > 420) {
            this.setVelocityX(dir * this.moveSpeed * 0.8);
        } else {
            this.setVelocityX(0);
        }

        if (this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const shots = this.phase >= 3 ? 4 : this.phase === 2 ? 3 : 2;
            this._viperFirePoison(player, enemyBullets, shots);
        }

        if (this.chargeCd <= 0 && dist > 480) {
            this.chargeCd    = this.chargeCdMax;
            this.isCharging  = true;
            this.chargeTimer = 500;
            this.setVelocityX(dir * 540);
            this.setTint(0x00ff44);
        }
    }

    _viperStartUltimate() {
        this.inUltimate       = true;
        this.ultimateOrbsLeft = 4;
        this.ultimateCd       = this.ultimateCdMax;
        this.ultimateHealTimer = 0;
        this.pitSprayCd       = 2200;  // first spray after 2.2s
        this.pitRainCd        = 1600;  // first rain after 1.6s
        this.isCharging       = false;
        this.setVelocityX(0);

        this.scene.cameras.main.flash(500, 0, 180, 0);
        this.setTint(0x00ff88);
        this.showOverlayText("VIPER'S PIT!", '#00ff88', 38);

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance('Welcome to my world!');
            u.pitch = 0.9;
            u.rate  = 0.88;
            const voices = window.speechSynthesis.getVoices();
            const female = voices.find(v => /female|zira|susan|hazel|samantha|victoria|karen|moira/i.test(v.name))
                        || voices.find(v => v.name.toLowerCase().includes('female'))
                        || voices[0];
            if (female) u.voice = female;
            window.speechSynthesis.speak(u);
        }

        this._spawnUltimateOrbs();
        this.scene.events.emit('viperPitStart');
    }

    _spawnUltimateOrbs() {
        const orbGroup   = this.scene.viperOrbs;
        if (!orbGroup) return;
        const roomStartX = this.scene.roomIndex * ROOM_W;

        const positions = [
            { x: roomStartX + 160,             y: GROUND_Y - 50  },  // ground L
            { x: roomStartX + ROOM_W - 180,    y: GROUND_Y - 50  },  // ground R
            { x: roomStartX + 340,             y: GROUND_Y - 260 },  // elevated L
            { x: roomStartX + ROOM_W - 380,    y: GROUND_Y - 260 },  // elevated R
        ];

        positions.forEach(pos => {
            const orb = orbGroup.create(pos.x, pos.y, 'viper_orb');
            if (!orb) return;
            orb.body.allowGravity = false;
            orb.setImmovable(true);
            orb.orbHp = 3 + this.tier;  // floor 10 = 4 hits, floor 20 = 5, etc.

            const tween = this.scene.tweens.add({
                targets: orb, scaleX: 1.25, scaleY: 1.25,
                duration: 500, yoyo: true, repeat: -1,
            });
            orb.pulseTween = tween;
        });
    }

    _updateViperUltimate(player, enemyBullets, delta) {
        // Glide toward arena center
        const roomStartX = this.scene.roomIndex * ROOM_W;
        const centerX    = roomStartX + ROOM_W / 2;
        const dx         = centerX - this.x;
        this.setVelocityX(Math.abs(dx) > 8 ? Math.sign(dx) * 110 : 0);

        // Slow heal
        this.ultimateHealTimer += delta;
        if (this.ultimateHealTimer >= 500) {
            this.ultimateHealTimer = 0;
            this.hp = Math.min(this.maxHp, this.hp + 5);
            this.scene.registry.set('bossHp', this.hp);
        }

        // Keep spawning pools
        this.poolCd = Math.max(0, this.poolCd - delta);
        if (this.poolCd <= 0) {
            this.poolCd = 2200;
            this._spawnToxicPool();
        }

        // Radial spray — slower and weaker than normal shots
        this.pitSprayCd = Math.max(0, this.pitSprayCd - delta);
        if (this.pitSprayCd <= 0) {
            this.pitSprayCd = this.phase >= 3 ? 2600 : 3800;
            this._viperPitSpray(enemyBullets);
        }

        // Falling acid drops — low speed, light damage, forces movement
        this.pitRainCd = Math.max(0, this.pitRainCd - delta);
        if (this.pitRainCd <= 0) {
            this.pitRainCd = this.phase >= 3 ? 2000 : 3000;
            this._viperPitRain(player, enemyBullets);
        }

        // Exit when all orbs destroyed
        if (this.ultimateOrbsLeft <= 0) this._viperEndUltimate();
    }

    _viperPitSpray(bullets) {
        // 8 bullets in a ring — half the speed and damage of normal shots
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2;
            const bullet = bullets.create(this.x, this.y - 20, this.bulletKey);
            if (!bullet) continue;
            bullet.setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180);
            bullet.setGravityY(-900);
            bullet.damage    = 8;
            bullet.poisoning = false;
            bullet.setTint(0x44ff55);
            this.scene.time.delayedCall(3000, () => { if (bullet?.active) bullet.destroy(); });
        }
    }

    _viperPitRain(player, bullets) {
        // 2-3 drops falling from above toward the player — slow and unthreatening alone
        const count = this.phase >= 3 ? 3 : 2;
        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * 500, () => {
                if (!this.active || !this.inUltimate) return;
                const x      = player.x + Phaser.Math.Between(-180, 180);
                const bullet = bullets.create(x, 10, this.bulletKey);
                if (!bullet) return;
                bullet.setVelocityX(0);
                bullet.setVelocityY(280);   // slow fall — easier to dodge than normal shots
                bullet.setGravityY(-900);   // cancel world gravity for constant speed
                bullet.damage    = 10;
                bullet.poisoning = false;
                bullet.setTint(0x44ff55);
                this.scene.time.delayedCall(2800, () => { if (bullet?.active) bullet.destroy(); });
            });
        }
    }

    _viperEndUltimate() {
        this.inUltimate        = false;
        this.ultimateHealTimer = 0;

        this.scene.events.emit('viperPitEnd');
        this.scene.cameras.main.flash(500, 255, 80, 0);
        this.showOverlayText('VULNERABLE!', '#ff4444', 34);

        if (this.phase >= 3) this.setTint(0x00ffaa);
        else if (this.phase === 2) this.setTint(0x00ff44);
        else this.clearTint();
    }

    _viperFirePoison(player, bullets, count) {
        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
        const spread    = 0.26;
        const dmg       = (this.phase === 2 ? 16 : 12) + this.tier * 3;

        for (let i = 0; i < count; i++) {
            const angle  = baseAngle + (i - Math.floor(count / 2)) * spread;
            const bullet = bullets.create(this.x, this.y - 20, this.bulletKey);
            if (!bullet) continue;
            bullet.setVelocity(Math.cos(angle) * 340, Math.sin(angle) * 340);
            bullet.setGravityY(-900);
            bullet.damage    = dmg;
            bullet.poisoning = true;
            bullet.setTint(0x44ff55);
            this.scene.time.delayedCall(2500, () => { if (bullet?.active) bullet.destroy(); });
        }
    }

    _spawnToxicPool() {
        const pools = this.scene.toxicPools;
        if (!pools || pools.getChildren().length >= 14) return;

        const roomStartX = this.scene.roomIndex * ROOM_W;
        const targetX    = Phaser.Math.Between(roomStartX + 150, roomStartX + ROOM_W - 150);
        const landY      = GROUND_Y - 10;

        // ── Lobbed projectile arc ────────────────────────────────
        const startX  = this.x;
        const startY  = this.y - 30;
        const peakLift = 200;                          // how high the arc rises
        const duration = Phaser.Math.Between(750, 1000);

        const proj = this.scene.add.image(startX, startY, 'viper_orb').setScale(0.5);

        // Faint landing marker so the player gets a fair warning
        const marker = this.scene.add.ellipse(targetX, landY + 4, 70, 18, 0x00ff44, 0.35);
        this.scene.tweens.add({
            targets: marker, alpha: 0.6, scaleX: 1.2,
            duration: 280, yoyo: true, repeat: -1,
        });

        this.scene.tweens.add({
            targets:  proj,
            x:        targetX,
            duration: duration,
            ease:     'Linear',
            onUpdate: (tween) => {
                const t = tween.progress;
                proj.y   = startY + (landY - startY) * t - peakLift * 4 * t * (1 - t);
                proj.angle += 4;          // gentle spin during flight
            },
            onComplete: () => {
                proj.destroy();
                marker.destroy();

                // Splash burst on impact
                const splash = this.scene.add.circle(targetX, landY, 18, 0x44ff77, 0.85);
                this.scene.tweens.add({
                    targets: splash, alpha: 0, scaleX: 3.5, scaleY: 1.5,
                    duration: 380, onComplete: () => splash.destroy(),
                });

                // Create the pool
                const pool = pools.create(targetX, landY, 'toxic_pool');
                if (!pool) return;
                pool.setOrigin(0.5, 0.5);
                pool.refreshBody();
                pool.setAlpha(0);
                this.scene.tweens.add({ targets: pool, alpha: 0.85, duration: 300 });

                // Expire after 12 seconds
                this.scene.time.delayedCall(12000, () => {
                    if (pool?.active) {
                        this.scene.tweens.add({
                            targets: pool, alpha: 0, duration: 1000,
                            onComplete: () => { if (pool?.active) pool.destroy(); },
                        });
                    }
                });
            },
        });
    }

    // ─── BLAZE ──────────────────────────────────────────────────
    _updateBlaze(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        if (this.isCharging) {
            this.chargeTimer -= delta;
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.setVelocityX(0);
                if (this.phase === 2) this.setTint(0xffffff); else this.clearTint();
            }
            if (dist < 80) player.takeDamage(this.damage + 10);
            return;
        }

        // Chase player
        if (dist > 70) {
            this.setVelocityX(dir * this.moveSpeed);
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
                this.setTint(0xffffff);
                this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
            }
        }

        // Fire rain: drop fireballs from above player
        if (this.chargeCd <= 0) {
            this.chargeCd = this.chargeCdMax;
            const count = this.phase === 2 ? 3 : 2;
            for (let i = 0; i < count; i++) {
                this.scene.time.delayedCall(i * 350, () => {
                    if (!this.active) return;
                    const fx = player.x + Phaser.Math.Between(-60, 60);
                    const b  = enemyBullets.create(fx, this.scene.scale.height - 680, 'boss_bullet_blaze');
                    if (!b) return;
                    b.setVelocity(0, 420);
                    b.setGravityY(-900);
                    b.damage = this.damage;
                    this.scene.time.delayedCall(2200, () => { if (b?.active) b.destroy(); });
                });
            }
        }

        // Horizontal lunge when far
        if (dist > 300 && this.attackCd <= 0) {
            this.attackCd    = this.attackCdMax;
            this.isCharging  = true;
            this.chargeTimer = 500;
            this.setVelocityX(dir * 620);
            this.setTint(0xff8f00);
        }
    }

    // ─── PHANTOM ────────────────────────────────────────────────
    _updatePhantom(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.teleportCd = Math.max(0, this.teleportCd - delta);
        this.phaseTimer = Math.max(0, this.phaseTimer - delta);

        // Phasing (brief invincibility)
        if (this.phasing && this.phaseTimer <= 0) {
            this.phasing = false;
            this.setAlpha(this.phase === 2 ? 0.7 : 1);
        }

        // Teleport
        if (this.teleportCd <= 0) {
            this.teleportCd = this.phase === 2 ? this.teleportCdMax * 0.6 : this.teleportCdMax;
            this._phantomTeleport(player);
            return;
        }

        // Chase and slash
        if (dist > 80) {
            this.setVelocityX(dir * this.moveSpeed);
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
                // Phase out briefly after melee
                this.phasing    = true;
                this.phaseTimer = 600;
                this.setAlpha(0.3);
            }
        }

        // Ghost orb volley
        if (dist > 160 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.phase === 2 ? 3 : 2;
            this.fireBurst(player, enemyBullets, count);
        }
    }

    _phantomTeleport(player) {
        // Pick a spot away from player
        const roomStartX = this.scene.roomIndex * ROOM_W;
        const offsets = [-380, -240, 240, 380];
        const chosen  = offsets[Phaser.Math.Between(0, offsets.length - 1)];
        const newX    = Phaser.Math.Clamp(player.x + chosen, roomStartX + 80, roomStartX + ROOM_W - 80);

        this.setAlpha(0);
        this.scene.time.delayedCall(320, () => {
            if (!this.active) return;
            this.setPosition(newX, this.y);
            this.setVelocityX(0);
            this.setAlpha(this.phase === 2 ? 0.7 : 1);
            this.showOverlayText('!', '#00e5ff', 28);
        });
    }

    // ─── TITAN ──────────────────────────────────────────────────
    _updateTitan(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.slamCd = Math.max(0, this.slamCd - delta);

        // Phase 1 armor (50% damage reduction until this.armorActive ends at phase 2)
        if (this.phase === 1 && !this.armorActive && this.hp > this.maxHp * 0.5) {
            this.armorActive = true;
        }

        // Slow but relentless chase
        this.setVelocityX(dir * this.moveSpeed * 0.75);

        // Close stomp
        if (dist < 90 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            player.takeDamage(this.damage);
            this.scene.cameras.main.shake(200, 0.012);
        }

        // Boulder throw at medium range
        if (dist > 200 && dist < 600 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            this._titanBoulder(player, enemyBullets);
        }

        // Ground slam shockwave
        if (this.slamCd <= 0) {
            this.slamCd = this.phase === 2 ? this.slamCdMax * 0.65 : this.slamCdMax;
            this._titanSlam(player, enemyBullets);
        }
    }

    _titanBoulder(player, enemyBullets) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
        const spd   = 320;
        const b     = enemyBullets.create(this.x, this.y - 20, 'boss_bullet_titan');
        if (!b) return;
        b.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        b.setGravityY(-900);
        b.damage = this.damage + 8;
        b.setScale(1.4);
        this.scene.time.delayedCall(3000, () => { if (b?.active) b.destroy(); });
    }

    _titanSlam(player, enemyBullets) {
        this.setVelocityX(0);
        this.setTint(0xffcc00);
        this.scene.cameras.main.shake(300, 0.018);

        for (const dir of [-1, 1]) {
            const sw = enemyBullets.create(this.x, this.y + 20, 'boss_shockwave');
            if (!sw) continue;
            sw.setVelocityX(dir * 460);
            sw.setGravityY(-900);
            sw.damage = this.damage - 4;
            this.scene.time.delayedCall(1600, () => { if (sw?.active) sw.destroy(); });
        }

        this.scene.time.delayedCall(300, () => {
            if (!this.active) return;
            if (this.phase === 2) this.setTint(0xff6600); else this.clearTint();
        });
    }

    // ─── STORM ──────────────────────────────────────────────────
    _updateStorm(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.pulseCd = Math.max(0, this.pulseCd - delta);

        if (this.isCharging) {
            this.chargeTimer -= delta;
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.setVelocityX(0);
                if (this.phase === 2) this.setTint(0xffffff); else this.clearTint();
            }
            return;
        }

        // Fast erratic movement
        const spd = this.phase === 2 ? this.moveSpeed * 1.35 : this.moveSpeed;
        this.setVelocityX(dir * spd);

        // Spread shot
        if (this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.phase === 2 ? 5 : 3;
            this.fireBurst(player, enemyBullets, count);
        }

        // Electric pulse: deal damage when close
        if (this.pulseCd <= 0) {
            this.pulseCd = this.phase === 2 ? this.pulseCdMax * 0.6 : this.pulseCdMax;
            if (dist < 130) {
                player.takeDamage(this.damage - 6);
                this.scene.cameras.main.flash(150, 255, 255, 0);
            }
            this.setTint(0xffffff);
            this.scene.time.delayedCall(180, () => { if (this.active) this.clearTint(); });
        }

        // Lightning dash
        if (this.chargeCd <= 0 && dist > 200) {
            this.chargeCd    = this.chargeCdMax;
            this.isCharging  = true;
            this.chargeTimer = 340;
            this.setVelocityX(dir * 720);
            this.setTint(0xffffff);
        }
    }

    // ─── KILLJOY ────────────────────────────────────────────────
    _updateKilljoy(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        // Set up turret positions once
        if (this.turretPositions.length === 0) {
            const rx = this.scene.roomIndex * ROOM_W;
            this.turretPositions = [
                { x: rx + 180, y: GROUND_Y - 24 },
                { x: rx + ROOM_W - 180, y: GROUND_Y - 24 },
            ];
            this.scene.events.emit('killjoyTurretsPlaced', this.turretPositions);
        }

        this.lockdownCd    = Math.max(0, this.lockdownCd - delta);
        this.turretFireCd  = Math.max(0, this.turretFireCd - delta);

        // Keep some distance — Killjoy is a backline fighter
        if (dist < 320) {
            this.setVelocityX(-dir * this.moveSpeed * 0.9);
        } else if (dist > 500) {
            this.setVelocityX(dir * this.moveSpeed * 0.6);
        } else {
            this.setVelocityX(0);
        }

        // SMG burst (5 rapid bullets)
        if (this.attackCd <= 0 && dist < 600) {
            this.attackCd = this.attackCdMax;
            this._killjoySmgBurst(player, enemyBullets);
        }

        // Turret fire from fixed positions
        if (this.turretFireCd <= 0) {
            this.turretFireCd = this.turretFireCdMax;
            this._killjoyTurretFire(player, enemyBullets);
        }

        // Lockdown pulse — ring of bullets
        if (this.lockdownCd <= 0) {
            this.lockdownCd = this.lockdownCdMax;
            this._killjoyLockdown(enemyBullets);
        }
    }

    _killjoySmgBurst(player, bullets) {
        const count = this.phase === 2 ? 5 : 3;
        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                if (!this.active) return;
                const angle  = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
                const spread = (Math.random() - 0.5) * 0.18;
                const b      = bullets.create(this.x, this.y - 20, this.bulletKey);
                if (!b) return;
                b.setVelocity(Math.cos(angle + spread) * 420, Math.sin(angle + spread) * 420);
                b.setGravityY(-900);
                b.damage = Math.round(this.damage * 0.7);
                this.scene.time.delayedCall(2000, () => { if (b?.active) b.destroy(); });
            });
        }
    }

    _killjoyTurretFire(player, bullets) {
        const fireRate = this.phase === 2 ? 2 : 1;
        this.turretPositions.forEach(tp => {
            for (let f = 0; f < fireRate; f++) {
                this.scene.time.delayedCall(f * 200, () => {
                    if (!this.active) return;
                    const angle = Phaser.Math.Angle.Between(tp.x, tp.y, player.x, player.y);
                    const b     = bullets.create(tp.x, tp.y, this.bulletKey);
                    if (!b) return;
                    b.setVelocity(Math.cos(angle) * 360, Math.sin(angle) * 360);
                    b.setGravityY(-900);
                    b.damage = Math.round(this.damage * 0.6);
                    b.setTint(0xffee00);
                    this.scene.time.delayedCall(2200, () => { if (b?.active) b.destroy(); });
                });
            }
        });
    }

    _killjoyLockdown(bullets) {
        this.showOverlayText('LOCKDOWN!', '#ffee00', 32);
        this.scene.cameras.main.flash(200, 255, 238, 0);
        const count = 14;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const b     = bullets.create(this.x, this.y - 20, this.bulletKey);
            if (!b) continue;
            b.setVelocity(Math.cos(angle) * 240, Math.sin(angle) * 240);
            b.setGravityY(-900);
            b.damage = Math.round(this.damage * 0.8);
            b.setTint(0xffee00);
            this.scene.time.delayedCall(2800, () => { if (b?.active) b.destroy(); });
        }
    }

    // ─── CHAMBER ────────────────────────────────────────────────
    _updateChamber(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.sniperWarnCd  = Math.max(0, this.sniperWarnCd - delta);
        this.chamberTrapCd = Math.max(0, this.chamberTrapCd - delta);
        this.teleportCd    = Math.max(0, this.teleportCd - delta);

        // Don't move while sniper warning is active
        if (this.sniperFiring) {
            this.setVelocityX(0);
            return;
        }

        // Prefers long range
        if (dist < 350) {
            this.setVelocityX(-dir * this.moveSpeed * 0.95);
        } else if (dist > 600) {
            this.setVelocityX(dir * this.moveSpeed * 0.5);
        } else {
            this.setVelocityX(0);
        }

        // Melee fallback if cornered
        if (dist < 70 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            player.takeDamage(this.damage);
        }

        // Telegraphed sniper shot
        if (this.sniperWarnCd <= 0 && !this.sniperFiring) {
            this.sniperWarnCd = this.sniperWarnCdMax;
            this._chamberSnipeWarning(player, enemyBullets);
        }

        // Place traps periodically
        if (this.chamberTrapCd <= 0) {
            this.chamberTrapCd = this.chamberTrapCdMax;
            this._chamberPlaceTraps();
        }

        // Phase 2: teleport + double shot
        if (this.phase === 2 && this.teleportCd <= 0) {
            this.teleportCd = this.teleportCdMax * 0.8;
            this._chamberTeleport(player, enemyBullets);
        }
    }

    _chamberSnipeWarning(player, bullets) {
        this.sniperFiring = true;
        this.setVelocityX(0);

        // Draw red laser line from boss to player
        const line = this.scene.add.graphics();
        line.lineStyle(2, 0xff2222, 0.7);
        line.beginPath();
        line.moveTo(this.x, this.y - 20);
        line.lineTo(player.x, player.y);
        line.strokePath();
        this.sniperLine = line;
        this.showOverlayText('!', '#ff2222', 32);

        // Pulse the laser line
        this.scene.tweens.add({ targets: line, alpha: 0.3, yoyo: true, duration: 200, repeat: 3 });

        // Fire high-damage shot after 900ms
        this.scene.time.delayedCall(900, () => {
            if (!this.active) return;
            if (this.sniperLine) { this.sniperLine.destroy(); this.sniperLine = null; }
            this.sniperFiring = false;

            const shots = this.phase === 2 ? 2 : 1;
            for (let i = 0; i < shots; i++) {
                this.scene.time.delayedCall(i * 150, () => {
                    if (!this.active) return;
                    const angle = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
                    const b     = bullets.create(this.x, this.y - 20, this.bulletKey);
                    if (!b) return;
                    b.setVelocity(Math.cos(angle) * 440, Math.sin(angle) * 440);
                    b.setGravityY(-900);
                    b.damage = Math.round(this.damage * 1.8);
                    b.setScale(1.3);
                    this.scene.time.delayedCall(3000, () => { if (b?.active) b.destroy(); });
                });
            }
        });
    }

    _chamberPlaceTraps() {
        const rx = this.scene.roomIndex * ROOM_W;
        const positions = [
            rx + Phaser.Math.Between(200, 500),
            rx + Phaser.Math.Between(900, 1200),
        ];
        positions.forEach(tx => {
            this.scene.events.emit('chamberTrapSpawn', tx, GROUND_Y - 8);
        });
    }

    _chamberTeleport(player, bullets) {
        const rx      = this.scene.roomIndex * ROOM_W;
        const offsets = [-420, -280, 280, 420];
        const chosen  = offsets[Phaser.Math.Between(0, offsets.length - 1)];
        const newX    = Phaser.Math.Clamp(player.x + chosen, rx + 80, rx + ROOM_W - 80);

        this.scene.cameras.main.flash(160, 255, 224, 130);
        this.setAlpha(0);
        this.scene.time.delayedCall(280, () => {
            if (!this.active) return;
            this.setPosition(newX, this.y);
            this.setVelocityX(0);
            this.setAlpha(1);
            this.showOverlayText('RENDEZ-VOUS', '#ffe082', 26);
            // Immediately fire after teleport
            this._chamberSnipeWarning(player, bullets);
        });
    }

    // ─── KAYO ───────────────────────────────────────────────────
    _updateKayo(player, enemyBullets, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.kayoKnifeCd = Math.max(0, this.kayoKnifeCd - delta);
        this.kayoFlashCd = Math.max(0, this.kayoFlashCd - delta);
        this.kayoFragCd  = Math.max(0, this.kayoFragCd  - delta);

        // Ultimate timer
        if (this.kayoUltActive) {
            this.kayoUltTimer -= delta;
            if (this.kayoUltTimer <= 0) {
                this.kayoUltActive = false;
                this.scene.events.emit('kayoUltEnd');
                if (this.phase === 2) this.setTint(0x80deea); else this.clearTint();
            }
        }

        // Aggressive chase
        const spd = this.kayoUltActive ? this.moveSpeed * 1.3 : this.moveSpeed;
        if (dist > 70) {
            this.setVelocityX(dir * spd);
            if (this.body.blocked.down && dist > 200) {
                const blockedHoriz = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                if (blockedHoriz) { this.setVelocityY(-720); }
            }
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
            }
        }

        // Burst fire at range
        if (dist > 120 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.kayoUltActive ? 5 : (this.phase === 2 ? 4 : 3);
            this.fireBurst(player, enemyBullets, count);
        }

        // Suppression knife
        if (this.kayoKnifeCd <= 0) {
            this.kayoKnifeCd = this.kayoKnifeCdMax;
            this._kayoThrowKnife(player);
        }

        // FLASH/drive — screen flash then instant burst
        if (this.kayoFlashCd <= 0) {
            this.kayoFlashCd = this.kayoFlashCdMax;
            this._kayoFlash(player, enemyBullets);
        }

        // Frag grenade
        if (this.kayoFragCd <= 0) {
            this.kayoFragCd = this.kayoFragCdMax;
            this._kayoFrag(player, enemyBullets);
        }

        // Phase 2 ultimate trigger (replaces chargeCd)
        if (this.phase === 2 && this.chargeCd <= 0 && !this.kayoUltActive) {
            this.chargeCd    = this.chargeCdMax;
            this.kayoUltActive = true;
            this.kayoUltTimer  = 6000;
            this.scene.events.emit('kayoUltStart');
            this.setTint(0xffffff);
            this.showOverlayText('ZERO/POINT!', '#80deea', 34);
            this.scene.cameras.main.flash(400, 0, 200, 255);
        }
    }

    _kayoThrowKnife(player) {
        const dir   = player.x > this.x ? 1 : -1;
        const landX = this.x + dir * Phaser.Math.Between(180, 340);
        this.scene.events.emit('kayoKnifeSpawn', landX, GROUND_Y - 8);
        this.showOverlayText('NULL/CMD', '#80deea', 24);
    }

    _kayoFlash(player, bullets) {
        this.scene.cameras.main.flash(180, 255, 255, 255);
        this.scene.time.delayedCall(180, () => {
            if (!this.active) return;
            const count = this.phase === 2 ? 5 : 4;
            this.fireBurst(player, bullets, count);
        });
    }

    _kayoFrag(player, bullets) {
        const dir   = player.x > this.x ? 1 : -1;
        const b     = bullets.create(this.x, this.y - 20, this.bulletKey);
        if (!b) return;
        b.setVelocity(dir * 360, -320);
        b.setGravityY(-900);
        b.damage  = 0;
        b._fragBounced = false;
        b.setTint(0x80deea);

        // On ground bounce: destroy and spawn 3 radial bullets
        const checkBounce = this.scene.time.addEvent({
            delay: 50, repeat: 60,
            callback: () => {
                if (!b?.active) { checkBounce.remove(); return; }
                if (b.body?.blocked.down && !b._fragBounced) {
                    b._fragBounced = true;
                    const bx = b.x, by = b.y;
                    b.destroy();
                    checkBounce.remove();
                    for (let i = 0; i < 3; i++) {
                        const a  = Phaser.Math.Angle.Between(bx, by, player.x, player.y) + (i - 1) * 0.4;
                        const nb = bullets.create(bx, by, this.bulletKey);
                        if (!nb) continue;
                        nb.setVelocity(Math.cos(a) * 380, Math.sin(a) * 380);
                        nb.setGravityY(-900);
                        nb.damage = Math.round(this.damage * 0.9);
                        nb.setTint(0x80deea);
                        this.scene.time.delayedCall(1800, () => { if (nb?.active) nb.destroy(); });
                    }
                }
            },
        });

        this.scene.time.delayedCall(3000, () => { if (b?.active) b.destroy(); });
    }

    // ─── SHARED ─────────────────────────────────────────────────
    fireBurst(player, bullets, count) {
        const baseAngle  = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
        const spread     = this.bossType === 'storm' ? 0.28 : 0.22;
        const bulletDmg  = (this.phase === 2 ? 22 : 16) + this.tier * 4;

        for (let i = 0; i < count; i++) {
            const angle  = baseAngle + (i - Math.floor(count / 2)) * spread;
            const bullet = bullets.create(this.x, this.y - 20, this.bulletKey);
            if (!bullet) continue;
            bullet.setVelocity(Math.cos(angle) * 360, Math.sin(angle) * 360);
            bullet.setGravityY(-900);
            bullet.damage = bulletDmg;
            this.scene.time.delayedCall(2500, () => { if (bullet?.active) bullet.destroy(); });
        }
    }

    showOverlayText(msg, color, fontSize = 28) {
        const cx  = this.scene.cameras.main.scrollX + this.scene.scale.width / 2;
        const txt = this.scene.add.text(cx, 250, msg, {
            fontSize: `${fontSize}px`, color, fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0);
        this.scene.tweens.add({ targets: txt, alpha: 0, y: 210, duration: 1600, onComplete: () => txt.destroy() });
    }

    hit(amount, isLifeSteal = false) {
        // Viper is invincible during her ultimate
        if (this.bossType === 'viper' && this.inUltimate) return;

        // TITAN armor in phase 1
        const effective = (this.bossType === 'titan' && this.armorActive) ? Math.ceil(amount * 0.5) : amount;
        this.hp = Math.max(0, this.hp - effective);

        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (!this.active) return;
            if (this.phase === 2) {
                const tints = { viper: 0xff3333, blaze: 0xffffff, phantom: 0x00ffff, titan: 0xff6600, storm: 0xffffff, killjoy: 0xffff00, chamber: 0xffe082, kayo: 0x80deea };
                this.setTint(tints[this.bossType] ?? 0xffffff);
            } else {
                this.clearTint();
            }
        });

        this.scene.registry.set('bossHp', this.hp);

        const label = effective < amount ? `${effective}(armor)` : `-${effective}`;
        const txt = this.scene.add.text(
            this.x + Phaser.Math.Between(-22, 22), this.y - 48,
            label, { fontSize: '18px', color: '#ff8888', fontStyle: 'bold' }
        ).setOrigin(0.5);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 650, onComplete: () => txt.destroy() });

        if (this.hp <= 0) this.kill(isLifeSteal);
    }

    kill(isLifeSteal) {
        if (!this.active) return;

        // Mark inactive immediately so _checkRoomClear() doesn't count this boss
        // as still alive when enemyDied fires below
        this.setActive(false);
        this.setVisible(false);

        // Clean up Chamber's laser line if active
        if (this.bossType === 'chamber' && this.sniperLine) {
            this.sniperLine.destroy();
            this.sniperLine = null;
        }

        // End Kayo ultimate if active mid-fight
        if (this.bossType === 'kayo' && this.kayoUltActive) {
            this.scene.events.emit('kayoUltEnd');
        }

        // Clean up Viper's ultimate state if she dies mid-ultimate
        if (this.bossType === 'viper') {
            if (this.scene.viperOrbs) {
                this.scene.viperOrbs.getChildren().forEach(orb => {
                    if (orb.pulseTween) orb.pulseTween.stop();
                });
                this.scene.viperOrbs.clear(true, true);
            }
            if (this.scene.viperPitActive) this.scene.events.emit('viperPitEnd');
        }

        this.scene.registry.set('bossActive', false);

        if (isLifeSteal) this.scene.events.emit('lifeStealKill', 40);

        this.scene.events.emit('dropHealth', this.x,       this.y);
        this.scene.events.emit('dropHealth', this.x - 100, this.y);
        this.scene.events.emit('dropHealth', this.x + 100, this.y);
        this.scene.events.emit('enemyDied');
        this.scene.events.emit('bossKilled');

        this.scene.cameras.main.flash(700, 255, 200, 0);
        this.destroy();
    }
}
