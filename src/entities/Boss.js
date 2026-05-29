const GROUND_Y = 648;
const ROOM_W   = 1440;

const BOSS_TEXTURES = {
    viper:   { key: 'boss_viper',   bw: 60, bh: 88, bo: [10,8], bullet: 'boss_bullet',         name: 'VIPER'   },
    blaze:   { key: 'boss_blaze',   bw: 58, bh: 88, bo: [10,8], bullet: 'boss_bullet_blaze',   name: 'BLAZE'   },
    phantom: { key: 'boss_phantom', bw: 56, bh: 88, bo: [10,8], bullet: 'boss_bullet_phantom', name: 'PHANTOM' },
    titan:   { key: 'boss_titan',   bw: 60, bh: 88, bo: [14,4], bullet: 'boss_bullet_titan',   name: 'TITAN'   },
    storm:   { key: 'boss_storm',   bw: 58, bh: 88, bo: [15,4], bullet: 'boss_bullet_storm',   name: 'STORM'   },
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
                const tints = { viper: 0xff3333, blaze: 0xffffff, phantom: 0x00ffff, titan: 0xff6600, storm: 0xffffff };
                this.setTint(tints[this.bossType]);
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

        // Clean up Viper's ultimate state if she dies mid-ultimate
        if (this.bossType === 'viper') {
            if (this.scene.viperOrbs) this.scene.viperOrbs.clear(true, true);
            if (this.inUltimate) this.scene.events.emit('viperPitEnd');
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
