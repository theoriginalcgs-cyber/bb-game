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

        this.maxHp       = 1500 + floor * 400;                     // scales per floor (floor 10 → 5500)
        this.hp          = this.maxHp;
        this.phase       = 1;
        this.moveSpeed   = 90 + tier * 12;
        this.damage      = 20 + floor * 2;                         // floor 10 → 40, floor 20 → 60
        this.attackCdMax = Math.max(1000, 2000 - tier * 150);
        this.attackCd    = Math.round(this.attackCdMax * 0.6);
        this.chargeCdMax = Math.max(3200, 5800 - tier * 420);
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

        // BLAZE-specific (extended)
        this.blazeUltActive  = false;
        this.blazeUltCdMax   = Math.max(10000, 24000 - tier * 3000);
        this.blazeUltCd      = 6000;
        this.blazeUltTimer   = 0;
        this.blazeUltAngle   = 0;
        this.blazeSpiralTimer = 0;
        this.blazeFireCdMax  = Math.max(2800, 5500 - tier * 430);
        this.blazeFireCd     = 2000;
        this.blazeNovaCdMax  = Math.max(5000, 9000 - tier * 600);
        this.blazeNovaCd     = 5000;
        this.ultOrbsLeft     = 0;  // shared for blaze/storm ultimates

        // PHANTOM-specific (extended)
        this.phantomUltActive   = false;
        this.phantomUltCdMax    = Math.max(10000, 26000 - tier * 3000);
        this.phantomUltCd       = 7000;
        this.phantomVanishCdMax = Math.max(3500, 6000 - tier * 400);
        this.phantomVanishCd    = 3000;
        this.phantomVanishing   = false;

        // TITAN-specific (extended)
        this.titanUltActive      = false;
        this.titanUltCdMax       = Math.max(12000, 28000 - tier * 3000);
        this.titanUltCd          = 8000;
        this.titanLeapCdMax      = Math.max(5000, 9000 - tier * 700);
        this.titanLeapCd         = 4000;
        this.titanIsLeaping      = false;
        this.titanRockRainCd     = 5000;
        this.titanRockRainCdMax  = Math.max(5500, 9000 - tier * 800);
        this.titanSweepCd        = 8000;
        this.titanSweepCdMax     = Math.max(5500, 11000 - tier * 900);
        this.titanSweeping       = false;
        this._titanSweepFist     = null;
        this._titanSweepX        = 0;

        // STORM-specific (extended)
        this.stormUltActive   = false;
        this.stormUltCdMax    = Math.max(10000, 24000 - tier * 3000);
        this.stormUltCd       = 5000;
        this.stormUltOrbsLeft = 0;
        this.stormLightCdMax  = Math.max(2000, 4500 - tier * 400);
        this.stormLightCd     = 2000;
        this.stormSurgeCdMax    = Math.max(6000, 10000 - tier * 600);
        this.stormSurgeCd       = 6000;
        this.stormAerialCdMax   = Math.max(5500, 9000 - tier * 600);
        this.stormAerialCd      = 6000;
        this.stormOrbAngle      = 0;
        this._stormFlying     = false;
        this._stormWanderX    = 0;
        this._stormWanderY    = 200;
        this._stormWanderCd   = 0;
        this._stormCloudGfx   = null;
        this._lastPlayer      = null;

        scene.registry.set('bossActive', true);
        scene.registry.set('bossHp',     this.hp);
        scene.registry.set('bossMaxHp',  this.maxHp);
        scene.registry.set('bossName',   `${cfg.name} — FLOOR ${floor}`);
    }

    update(player, enemyBullets, delta) {
        if (!this.active || !player || !player.active) return;

        this._lastPlayer = player;

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
            this.moveSpeed   += 70;
            this.attackCdMax  = Math.max(900, this.attackCdMax - 420);
            this.damage      += Math.max(10, Math.round(this.damage * 0.22));
            this.scene.cameras.main.shake(500, 0.016);
            this.showOverlayText('ENRAGED!', '#ff0000', 40);

            switch (this.bossType) {
                case 'viper':   this.setTint(0x00ff44); break;
                case 'blaze':
                    this.blazeFireCdMax  = Math.max(2000, this.blazeFireCdMax  - 900);
                    this.blazeNovaCdMax  = Math.max(4000, this.blazeNovaCdMax  - 1500);
                    this.setTint(0xff2200);
                    break;
                case 'phantom':
                    this.phantomVanishCdMax = Math.max(2500, this.phantomVanishCdMax - 1000);
                    this.teleportCdMax      = Math.max(2000, this.teleportCdMax      - 1000);
                    this.setAlpha(0.4);
                    this.setTint(0x00ffff);
                    break;
                case 'titan':
                    this.armorActive        = false;
                    this.titanLeapCdMax     = Math.max(4000, this.titanLeapCdMax - 1500);
                    this.slamCdMax          = Math.max(2500, this.slamCdMax - 1000);
                    this.titanRockRainCdMax = Math.max(4000, this.titanRockRainCdMax - 1500);
                    this.titanSweepCdMax    = Math.max(4000, this.titanSweepCdMax - 1500);
                    this.setTint(0xff6600);
                    // Armor shatter: camera flash + 8-directional shockwave burst
                    this.scene.cameras.main.flash(600, 255, 80, 0);
                    this.scene.cameras.main.shake(700, 0.03);
                    this.showOverlayText('ARMOR SHATTERED!', '#ff6600', 36);
                    {
                        const dirs8 = [0, 45, 90, 135, 180, 225, 270, 315];
                        dirs8.forEach(deg => {
                            const rad = Phaser.Math.DegToRad(deg);
                            const sw  = this.scene.enemyBullets.create(this.x, this.y, 'boss_shockwave');
                            if (!sw) return;
                            sw.setVelocity(Math.cos(rad) * 420, Math.sin(rad) * 420);
                            sw.setGravityY(-900);
                            sw.setScale(1.4);
                            sw.damage = this.damage + 4;
                            this.scene.time.delayedCall(1600, () => { if (sw?.active) sw.destroy(); });
                        });
                    }
                    // Immediately throw 4 boulders and trigger rock rain
                    if (this._lastPlayer) {
                        for (let i = 0; i < 4; i++) {
                            this.scene.time.delayedCall(i * 380, () => {
                                if (this.active && this._lastPlayer) this._titanBoulder(this._lastPlayer, this.scene.enemyBullets);
                            });
                        }
                        this.scene.time.delayedCall(1200, () => {
                            if (this.active && this._lastPlayer) this._titanRockRain(this._lastPlayer, this.scene.enemyBullets, 5);
                        });
                    }
                    break;
                case 'storm':
                    this.stormLightCdMax  = Math.max(1500, this.stormLightCdMax  - 700);
                    this.stormSurgeCdMax  = Math.max(4000, this.stormSurgeCdMax  - 2000);
                    this.stormAerialCdMax = Math.max(4000, this.stormAerialCdMax - 1500);
                    this.pulseCdMax       = Math.max(1500, this.pulseCdMax       - 800);
                    this.setTint(0xffffff);
                    this.showOverlayText('AERIAL ASSAULT!', '#ffffff', 32);
                    break;
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

        // Blaze phase 3 at 25%
        if (this.bossType === 'blaze' && this.phase === 2 && this.hp <= this.maxHp * 0.25) {
            this.phase = 3;
            this.blazeNovaCdMax  = Math.max(3000, this.blazeNovaCdMax  - 1000);
            this.blazeFireCdMax  = Math.max(1500, this.blazeFireCdMax  - 600);
            this.setTint(0xff0000);
            this.scene.cameras.main.shake(700, 0.022);
            this.showOverlayText('EVERYTHING BURNS!', '#ff0000', 34);
            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance('Everything burns!');
                u.pitch = 0.7; u.rate = 0.85;
                window.speechSynthesis.speak(u);
            }
            for (let i = 0; i < 4; i++) {
                this.scene.time.delayedCall(i * 320, () => {
                    if (this.active && this._lastPlayer) this._blazeLobFireZone(this._lastPlayer);
                });
            }
        }

        // Phantom phase 3 at 25% — near invisible
        if (this.bossType === 'phantom' && this.phase === 2 && this.hp <= this.maxHp * 0.25) {
            this.phase = 3;
            this.phantomVanishCdMax = Math.max(2000, this.phantomVanishCdMax - 600);
            this.scene.cameras.main.shake(500, 0.016);
            this.showOverlayText('YOU CANNOT SEE ME!', '#00ffff', 30);
            this._applyPhantomAlpha();
        }

        // Storm phase 3 at 25%
        if (this.bossType === 'storm' && this.phase === 2 && this.hp <= this.maxHp * 0.25) {
            this.phase = 3;
            this.stormLightCdMax = Math.max(1200, this.stormLightCdMax - 500);
            this.stormSurgeCdMax = Math.max(3000, this.stormSurgeCdMax - 1000);
            this.scene.cameras.main.shake(600, 0.02);
            this.showOverlayText('THE STORM CONSUMES ALL!', '#ffffff', 30);
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
        const dmg       = Math.round(this.damage * (this.phase >= 2 ? 0.55 : 0.42));

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
        // Ultimate check
        this.blazeUltCd = Math.max(0, this.blazeUltCd - delta);
        if (!this.blazeUltActive && this.blazeUltCd <= 0 && this.hp < this.maxHp * 0.85) {
            this._blazeStartUltimate(enemyBullets);
            return;
        }
        if (this.blazeUltActive) {
            this._updateBlazeUltimate(player, enemyBullets, delta);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.blazeFireCd = Math.max(0, this.blazeFireCd - delta);
        this.blazeNovaCd = Math.max(0, this.blazeNovaCd - delta);

        // Fire zone lob (always active pressure)
        if (this.blazeFireCd <= 0) {
            this.blazeFireCd = this.blazeFireCdMax;
            const count = this.phase >= 2 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                this.scene.time.delayedCall(i * 700, () => {
                    if (this.active && !this.blazeUltActive) this._blazeLobFireZone(player);
                });
            }
        }

        // Phase 2+: fire nova ring
        if (this.phase >= 2 && this.blazeNovaCd <= 0) {
            this.blazeNovaCd = this.blazeNovaCdMax;
            this._blazeNova(enemyBullets);
        }

        if (this.isCharging) {
            this.chargeTimer -= delta;
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.setVelocityX(0);
                this._applyBlazePhaseColor();
            }
            if (dist < 65) player.takeDamage(this.damage + 8);
            return;
        }

        // Preferred range 220-360px — kite like Viper
        if (dist < 220) {
            this.setVelocityX(-dir * this.moveSpeed * 1.1);
        } else if (dist > 360) {
            this.setVelocityX(dir * this.moveSpeed);
        } else {
            this.setVelocityX(0);
        }

        // Melee when very close
        if (dist < 75 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            player.takeDamage(this.damage);
        }

        // Spread shot at range
        if (dist >= 180 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.phase >= 2 ? 3 : 2;
            this.fireBurst(player, enemyBullets, count);
        }

        // Fire charge when far
        if (dist > 380 && this.chargeCd <= 0) {
            this.chargeCd    = this.chargeCdMax;
            this.isCharging  = true;
            this.chargeTimer = 520;
            this.setVelocityX(dir * 640);
            this.setTint(0xff6600);
            // Leave fire patches along path
            const patchCount = this.phase >= 2 ? 5 : 3;
            for (let i = 0; i < patchCount; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    if (this.active) this._blazeSmallFirePatch(this.x, GROUND_Y - 8);
                });
            }
        }
    }

    _blazeStartUltimate(enemyBullets) {
        this.blazeUltActive  = true;
        this.ultOrbsLeft     = 3 + this.tier;
        this.blazeUltCd      = this.blazeUltCdMax;
        this.blazeUltTimer   = 0;
        this.blazeUltAngle   = 0;
        this.blazeSpiralTimer = 0;
        this.isCharging      = false;
        this.setVelocityX(0);

        this.scene.cameras.main.flash(600, 255, 80, 0);
        this.setTint(0xff4400);
        this.showOverlayText('HELLFIRE BARRAGE!', '#ff6600', 38);

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance("You think you can outrun fire?");
            u.pitch = 0.8; u.rate = 0.9;
            window.speechSynthesis.speak(u);
        }

        this._blazeSpawnUltCores();
    }

    _blazeSpawnUltCores() {
        const orbs = this.scene.bossOrbs;
        if (!orbs) return;
        const rx = this.scene.roomIndex * ROOM_W;
        const positions = [
            { x: rx + 200,          y: GROUND_Y - 50  },
            { x: rx + ROOM_W - 200, y: GROUND_Y - 50  },
            { x: rx + ROOM_W / 2,   y: GROUND_Y - 280 },
            { x: rx + ROOM_W / 2 - 220, y: GROUND_Y - 170 },
        ];
        const count = Math.min(3 + this.tier, positions.length);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const orb = orbs.create(pos.x, pos.y, 'viper_orb');
            if (!orb) continue;
            orb.setTint(0xff5500);
            orb.body.allowGravity = false;
            orb.setImmovable(true);
            orb.orbHp   = 3 + this.tier;
            orb.bossRef = this;
            orb.orbType = 'blaze_core';
            orb.pulseTween = this.scene.tweens.add({
                targets: orb, scaleX: 1.25, scaleY: 1.25, duration: 380, yoyo: true, repeat: -1,
            });
        }
    }

    _updateBlazeUltimate(player, enemyBullets, delta) {
        // Glide to arena center
        const rx = this.scene.roomIndex * ROOM_W;
        const cx = rx + ROOM_W / 2;
        const dx = cx - this.x;
        this.setVelocityX(Math.abs(dx) > 8 ? Math.sign(dx) * 120 : 0);

        // Slow heal
        this.blazeUltTimer += delta;
        if (this.blazeUltTimer >= 400) {
            this.blazeUltTimer = 0;
            const healTotal = (0.10 + this.tier * 0.03) * this.maxHp;
            this.hp = Math.min(this.maxHp, this.hp + healTotal / 25);
            this.scene.registry.set('bossHp', this.hp);
        }

        // Rotating spiral of fire bullets
        this.blazeUltAngle += delta * 0.0012;
        this.blazeSpiralTimer -= delta;
        if (this.blazeSpiralTimer <= 0) {
            this.blazeSpiralTimer = Math.max(180, 300 - this.tier * 20);
            const arms = 4;
            for (let arm = 0; arm < arms; arm++) {
                const angle = this.blazeUltAngle + (arm / arms) * Math.PI * 2;
                const b = enemyBullets.create(this.x, this.y - 20, this.bulletKey);
                if (!b) continue;
                b.setTint(0xff4400);
                b.setVelocity(Math.cos(angle) * 290, Math.sin(angle) * 290);
                b.setGravityY(-900);
                b.damage = Math.round(this.damage * 0.65);
                this.scene.time.delayedCall(2200, () => { if (b?.active) b.destroy(); });
            }
        }

        if (this.ultOrbsLeft <= 0) this._blazeEndUltimate();
    }

    _blazeEndUltimate() {
        this.blazeUltActive = false;
        this.scene.cameras.main.flash(500, 255, 100, 0);
        this.showOverlayText('VULNERABLE!', '#ff4444', 34);
        this._applyBlazePhaseColor();
        if (this.scene.bossOrbs) {
            this.scene.bossOrbs.getChildren()
                .filter(o => o.orbType === 'blaze_core' && o.active)
                .forEach(o => { if (o.pulseTween) o.pulseTween.stop(); o.destroy(); });
        }
    }

    _blazeLobFireZone(player) {
        const zones = this.scene.blazeFireZones;
        if (!zones || zones.getChildren().length >= 12) return;

        const rx      = this.scene.roomIndex * ROOM_W;
        const targetX = Phaser.Math.Clamp(
            player.x + Phaser.Math.Between(-160, 160),
            rx + 100, rx + ROOM_W - 100
        );
        const landY   = GROUND_Y - 10;
        const startX  = this.x, startY = this.y - 30;
        const duration = 720;

        // Warning marker
        const marker = this.scene.add.ellipse(targetX, landY + 4, 80, 20, 0xff4400, 0.35);
        this.scene.tweens.add({ targets: marker, alpha: 0.72, scaleX: 1.15, duration: 240, yoyo: true, repeat: -1 });

        // Arc projectile
        const proj = this.scene.add.image(startX, startY, 'boss_bullet_blaze').setScale(0.85);
        this.scene.tweens.add({
            targets: proj, x: targetX, duration, ease: 'Linear',
            onUpdate: (tween) => {
                const t = tween.progress;
                proj.y = startY + (landY - startY) * t - 190 * 4 * t * (1 - t);
                proj.angle += 6;
            },
            onComplete: () => {
                proj.destroy(); marker.destroy();
                const splash = this.scene.add.circle(targetX, landY, 14, 0xff5500, 0.9);
                this.scene.tweens.add({ targets: splash, alpha: 0, scaleX: 4, scaleY: 2, duration: 300, onComplete: () => splash.destroy() });

                const zone = zones.create(targetX, landY, 'toxic_pool');
                if (!zone) return;
                zone.setTint(0xff4400);
                zone.setOrigin(0.5, 0.5);
                zone.refreshBody();
                zone.setAlpha(0);
                this.scene.tweens.add({ targets: zone, alpha: 0.82, duration: 300 });
                this.scene.time.delayedCall(8000, () => {
                    if (zone?.active) {
                        this.scene.tweens.add({ targets: zone, alpha: 0, duration: 700,
                            onComplete: () => { if (zone?.active) zone.destroy(); } });
                    }
                });
            },
        });
    }

    _blazeSmallFirePatch(x, y) {
        const zones = this.scene.blazeFireZones;
        if (!zones || zones.getChildren().length >= 18) return;
        const zone = zones.create(x, y, 'toxic_pool');
        if (!zone) return;
        zone.setTint(0xff6600);
        zone.setScale(0.55);
        zone.setOrigin(0.5, 0.5);
        zone.refreshBody();
        zone.setAlpha(0.65);
        this.scene.time.delayedCall(3200, () => { if (zone?.active) zone.destroy(); });
    }

    _blazeNova(enemyBullets) {
        this.showOverlayText('NOVA!', '#ff4400', 26);
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const b = enemyBullets.create(this.x, this.y - 20, this.bulletKey);
            if (!b) continue;
            b.setTint(0xff4400);
            b.setVelocity(Math.cos(angle) * 310, Math.sin(angle) * 310);
            b.setGravityY(-900);
            b.damage = Math.round(this.damage * 0.82);
            this.scene.time.delayedCall(2200, () => { if (b?.active) b.destroy(); });
        }
    }

    _applyBlazePhaseColor() {
        if (this.phase >= 3) this.setTint(0xff0000);
        else if (this.phase >= 2) this.setTint(0xff2200);
        else this.clearTint();
    }

    // ─── PHANTOM ────────────────────────────────────────────────
    _updatePhantom(player, enemyBullets, delta) {
        // Ultimate check
        this.phantomUltCd = Math.max(0, this.phantomUltCd - delta);
        if (!this.phantomUltActive && this.phantomUltCd <= 0 && this.hp < this.maxHp * 0.85) {
            this._phantomStartUltimate(player, enemyBullets);
            return;
        }
        if (this.phantomUltActive) {
            this._updatePhantomUltimate(delta);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.phantomVanishCd = Math.max(0, this.phantomVanishCd - delta);
        this.phaseTimer      = Math.max(0, this.phaseTimer - delta);
        this.teleportCd      = Math.max(0, this.teleportCd - delta);

        // Phasing recovery
        if (this.phasing && this.phaseTimer <= 0) {
            this.phasing = false;
            this._applyPhantomAlpha();
        }

        // Vanish + reposition + fire from hidden
        if (this.phantomVanishCd <= 0 && !this.phantomVanishing && !this.phasing) {
            this.phantomVanishCd = this.phase >= 2 ? this.phantomVanishCdMax * 0.6 : this.phantomVanishCdMax;
            this._phantomVanish(player, enemyBullets);
            return;
        }
        if (this.phantomVanishing) return;

        // Phase 2: decoy rush on chargeCd
        if (this.phase >= 2 && this.chargeCd <= 0) {
            this.chargeCd = this.chargeCdMax;
            this._phantomSpawnDecoys(player);
        }

        // Phase 2+: haunt bullets from screen edges
        if (this.phase >= 2 && this.teleportCd <= 0) {
            this.teleportCd = this.teleportCdMax;
            this._phantomHaunt(player, enemyBullets);
        }

        // Chase
        if (dist > 90) {
            this.setVelocityX(dir * this.moveSpeed);
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0 && !this.phasing) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
                this.phasing    = true;
                this.phaseTimer = 700;
                this.setAlpha(0.2);
            }
        }

        // Ghost orb volley at range
        if (dist > 180 && dist < 500 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.phase >= 2 ? 3 : 2;
            this.fireBurst(player, enemyBullets, count);
        }
    }

    _phantomVanish(player, enemyBullets) {
        this.phantomVanishing = true;
        this.setAlpha(0);

        const rx      = this.scene.roomIndex * ROOM_W;
        const offsets = [-420, -280, -160, 160, 280, 420];
        const chosen  = offsets[Phaser.Math.Between(0, offsets.length - 1)];
        const newX    = Phaser.Math.Clamp(player.x + chosen, rx + 80, rx + ROOM_W - 80);

        this.scene.time.delayedCall(280, () => {
            if (!this.active) return;
            this.setPosition(newX, this.y);
            this.setVelocityX(0);
        });

        // Fire from hidden position
        this.scene.time.delayedCall(520, () => {
            if (!this.active || this.phantomUltActive) return;
            const count = this.phase >= 2 ? 3 : 2;
            this.fireBurst(player, enemyBullets, count);
        });

        // Reappear
        this.scene.time.delayedCall(1100, () => {
            if (!this.active) return;
            this.phantomVanishing = false;
            this._applyPhantomAlpha();
            this.showOverlayText('!', '#00e5ff', 28);
        });
    }

    _phantomSpawnDecoys(player) {
        const rx = this.scene.roomIndex * ROOM_W;
        for (let i = 0; i < 2; i++) {
            const offsetX = (i === 0 ? -1 : 1) * Phaser.Math.Between(160, 360);
            const decoyX  = Phaser.Math.Clamp(this.x + offsetX, rx + 80, rx + ROOM_W - 80);
            const decoy   = this.scene.add.image(decoyX, this.y, 'boss_phantom');
            decoy.setAlpha(this.phase >= 3 ? 0.2 : 0.45);
            decoy.setTint(0x00ffff);
            decoy.setFlipX(player.x < decoyX);

            const dir   = player.x > decoyX ? 1 : -1;
            const speed = this.moveSpeed * 1.5;
            let elapsed = 0;
            const ticker = this.scene.time.addEvent({
                delay: 16, repeat: 125,
                callback: () => {
                    if (!decoy.active) { ticker.remove(); return; }
                    decoy.x += dir * speed * 0.016;
                    elapsed += 16;
                    if (Math.abs(decoy.x - player.x) < 55 && player.active) {
                        player.takeDamage(this.damage - 10);
                        ticker.remove();
                        this.scene.tweens.add({ targets: decoy, alpha: 0, duration: 200, onComplete: () => decoy.destroy() });
                    }
                },
            });
            this.scene.time.delayedCall(2000, () => {
                if (decoy.active) {
                    ticker.remove();
                    this.scene.tweens.add({ targets: decoy, alpha: 0, duration: 300, onComplete: () => decoy.destroy() });
                }
            });
        }
    }

    _phantomHaunt(player, enemyBullets) {
        const rx       = this.scene.roomIndex * ROOM_W;
        const fromLeft = Math.random() < 0.5;
        const startX   = fromLeft ? rx + 20 : rx + ROOM_W - 20;
        const startY   = Phaser.Math.Between(GROUND_Y - 360, GROUND_Y - 80);
        const b        = enemyBullets.create(startX, startY, this.bulletKey);
        if (!b) return;
        b.setTint(0x00e5ff);
        b.setAlpha(0.75);
        const angle = Phaser.Math.Angle.Between(startX, startY, player.x, player.y);
        b.setVelocity(Math.cos(angle) * 270, Math.sin(angle) * 270);
        b.setGravityY(-900);
        b.damage = Math.round(this.damage * 0.72);
        this.scene.time.delayedCall(3000, () => { if (b?.active) b.destroy(); });
    }

    _phantomStartUltimate(player, enemyBullets) {
        this.phantomUltActive = true;
        this.phantomUltCd     = this.phantomUltCdMax;
        this.phantomVanishing = false;
        this.setVelocityX(0);
        this.setAlpha(0);

        this.scene.cameras.main.flash(400, 0, 200, 200);
        this.showOverlayText('SPECTRAL STORM!', '#00e5ff', 38);

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance("You cannot touch what isn't there");
            u.pitch = 1.1; u.rate = 0.85;
            window.speechSynthesis.speak(u);
        }

        // 5 copies fly across the screen at different heights, firing as they go
        const rx = this.scene.roomIndex * ROOM_W;
        for (let i = 0; i < 5; i++) {
            const fromLeft = i % 2 === 0;
            const startX   = fromLeft ? rx + 10 : rx + ROOM_W - 10;
            const endX     = fromLeft ? rx + ROOM_W - 10 : rx + 10;
            const copyY    = GROUND_Y - 80 - i * 70;
            const copy     = this.scene.add.image(startX, copyY, 'boss_phantom');
            copy.setAlpha(this.phase >= 3 ? 0.25 : 0.55);
            copy.setTint(0x00ffff);
            copy.setFlipX(!fromLeft);

            this.scene.tweens.add({
                targets: copy, x: endX, duration: 900 + i * 100, ease: 'Linear',
                onUpdate: () => {
                    if (!player.active) return;
                    if (Math.abs(copy.x - player.x) < 48 && Math.abs(copy.y - player.y) < 60) {
                        player.takeDamage(this.damage - 6);
                    }
                    // Fire at player when copy is near player X
                    if (!copy._fired && Math.abs(copy.x - player.x) < 100) {
                        copy._fired = true;
                        const b = enemyBullets.create(copy.x, copy.y, this.bulletKey);
                        if (b) {
                            const a = Phaser.Math.Angle.Between(copy.x, copy.y, player.x, player.y);
                            b.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
                            b.setGravityY(-900);
                            b.damage = Math.round(this.damage * 0.6);
                            b.setTint(0x00ffff);
                            this.scene.time.delayedCall(2000, () => { if (b?.active) b.destroy(); });
                        }
                    }
                },
                onComplete: () => copy.destroy(),
            });
        }

        // Boss repositions hidden
        const bossNewX = Phaser.Math.Clamp(
            player.x + (Math.random() < 0.5 ? 240 : -240),
            rx + 80, rx + ROOM_W - 80
        );
        this.scene.time.delayedCall(400, () => {
            if (!this.active) return;
            this.setPosition(bossNewX, GROUND_Y - 44);
            this.setAlpha(0.18); // barely visible
        });

        // Heal during window
        const healTotal   = (0.08 + this.tier * 0.025) * this.maxHp;
        const healPerTick = healTotal / 10;
        this.scene.time.addEvent({
            delay: 500, repeat: 9,
            callback: () => {
                if (this.active && this.phantomUltActive) {
                    this.hp = Math.min(this.maxHp, this.hp + healPerTick);
                    this.scene.registry.set('bossHp', this.hp);
                }
            },
        });

        // End after 5.5s
        this.scene.time.delayedCall(5500, () => {
            if (this.active && this.phantomUltActive) this._phantomEndUltimate();
        });
    }

    _updatePhantomUltimate(delta) {
        // Drift slightly
        this.setVelocityX(0);
    }

    _phantomEndUltimate() {
        this.phantomUltActive = false;
        this.scene.cameras.main.flash(400, 100, 255, 255);
        this.showOverlayText('VULNERABLE!', '#ff4444', 34);
        this._applyPhantomAlpha();
    }

    _applyPhantomAlpha() {
        const a = this.phase >= 3 ? 0.15 : this.phase >= 2 ? 0.4 : 1.0;
        this.setAlpha(a);
        if (this.phase >= 2) this.setTint(0x00ffff);
    }

    // ─── TITAN ──────────────────────────────────────────────────
    _updateTitan(player, enemyBullets, delta) {
        // Ultimate check
        this.titanUltCd = Math.max(0, this.titanUltCd - delta);
        if (!this.titanUltActive && this.titanUltCd <= 0 && this.hp < this.maxHp * 0.8) {
            this._titanStartUltimate(enemyBullets);
            return;
        }
        if (this.titanUltActive) {
            this._updateTitanUltimate(player, enemyBullets, delta);
            return;
        }
        if (this.titanSweeping) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir  = player.x > this.x ? 1 : -1;

        this.slamCd          = Math.max(0, this.slamCd          - delta);
        this.titanLeapCd     = Math.max(0, this.titanLeapCd     - delta);
        this.titanRockRainCd = Math.max(0, this.titanRockRainCd - delta);
        this.titanSweepCd    = Math.max(0, this.titanSweepCd    - delta);

        if (this.phase === 1 && !this.armorActive) this.armorActive = true;
        if (this.titanIsLeaping) return;

        // Slow relentless advance
        this.setVelocityX(dir * this.moveSpeed * 0.72);

        // Close stomp
        if (dist < 90 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            player.takeDamage(this.damage);
            this.scene.cameras.main.shake(220, 0.014);
        }

        // Boulder lob
        if (dist > 200 && dist < 650 && this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            this._titanBoulder(player, enemyBullets);
        }

        // Rock Rain
        if (this.titanRockRainCd <= 0) {
            this.titanRockRainCd = this.titanRockRainCdMax;
            this._titanRockRain(player, enemyBullets, this.phase >= 2 ? 6 : 4);
        }

        // Timed ground slam
        if (this.slamCd <= 0) {
            this.slamCd = this.phase >= 2 ? this.slamCdMax * 0.55 : this.slamCdMax;
            this._titanSlam(enemyBullets);
        }

        // Phase 2: enrage leap
        if (this.phase >= 2 && this.titanLeapCd <= 0) {
            this.titanLeapCd = this.titanLeapCdMax;
            this._titanLeap(player, enemyBullets);
        }

        // Phase 2+: Ground Sweep
        if (this.phase >= 2 && this.titanSweepCd <= 0) {
            this._titanGroundSweep(player, enemyBullets);
        }
    }

    _drawTitanSilhouette() {
        // Background is now drawn by GameScene._spawnTitanArena
    }

    _titanBoulder(player, enemyBullets) {
        // Warning marker at predicted landing
        const marker = this.scene.add.ellipse(player.x, GROUND_Y - 6, 62, 18, 0xff6600, 0.42);
        this.scene.tweens.add({ targets: marker, alpha: 0.72, scaleX: 1.1, duration: 200, yoyo: true, repeat: 3, onComplete: () => marker.destroy() });

        const angle = Phaser.Math.Angle.Between(this.x, this.y - 40, player.x, player.y - 20);
        const spd   = 280 + this.tier * 22;
        const b     = enemyBullets.create(this.x, this.y - 40, 'boss_bullet_titan');
        if (!b) return;
        b.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        b.setGravityY(-900);
        b.damage = this.damage + 10;
        b.setScale(1.5);

        // Boulder lands and creates shockwaves
        this.scene.time.delayedCall(1800, () => {
            if (b?.active) {
                const bx = b.x, by = b.y;
                b.destroy();
                this.scene.cameras.main.shake(180, 0.01);
                for (const d of [-1, 1]) {
                    const sw = enemyBullets.create(bx, by, 'boss_shockwave');
                    if (!sw) continue;
                    sw.setVelocityX(d * 380);
                    sw.setGravityY(-900);
                    sw.damage = this.damage - 6;
                    this.scene.time.delayedCall(1400, () => { if (sw?.active) sw.destroy(); });
                }
            }
        });
    }

    _titanSlam(enemyBullets) {
        this.setVelocityX(0);
        this.setTint(0xffcc00);
        this.scene.cameras.main.shake(340, 0.022);

        // 4 shockwaves: 2 horizontal + 2 diagonal-upward (hits platforms)
        const swDirs = [
            { vx: -470, vy: 0   },
            { vx:  470, vy: 0   },
            { vx: -290, vy: -290 },
            { vx:  290, vy: -290 },
        ];
        swDirs.forEach(({ vx, vy }) => {
            const sw = enemyBullets.create(this.x, this.y + 10, 'boss_shockwave');
            if (!sw) return;
            sw.setVelocity(vx, vy);
            sw.setGravityY(-900);
            sw.damage = this.damage - 5;
            this.scene.time.delayedCall(1600, () => { if (sw?.active) sw.destroy(); });
        });

        this.scene.time.delayedCall(300, () => {
            if (!this.active) return;
            if (this.phase >= 2) this.setTint(0xff6600); else this.clearTint();
        });
    }

    _titanLeap(player, enemyBullets) {
        this.titanIsLeaping = true;
        const rx    = this.scene.roomIndex * ROOM_W;
        const landX = Phaser.Math.Clamp(player.x, rx + 80, rx + ROOM_W - 80);

        // Growing shadow warning
        const shadow = this.scene.add.ellipse(landX, GROUND_Y - 4, 90, 24, 0xff4400, 0.4);
        this.scene.tweens.add({ targets: shadow, scaleX: 2.6, scaleY: 2.6, alpha: 0.75, duration: 900 });

        this.setVelocityX((landX > this.x ? 1 : -1) * 500);
        this.setVelocityY(-610);
        this.setTint(0xff4400);
        this.showOverlayText('EARTHQUAKE!', '#ff4400', 30);

        this.scene.time.delayedCall(1200, () => {
            if (!this.active) return;
            shadow.destroy();
            this.titanIsLeaping = false;
            if (this.phase >= 2) this.setTint(0xff6600); else this.clearTint();
            this.scene.cameras.main.shake(500, 0.028);

            // Heavy landing shockwaves
            for (const d of [-1, 1]) {
                const sw = enemyBullets.create(this.x, this.y + 10, 'boss_shockwave');
                if (!sw) continue;
                sw.setVelocityX(d * 530);
                sw.setGravityY(-900);
                sw.setScale(1.5);
                sw.damage = this.damage + 5;
                this.scene.time.delayedCall(1800, () => { if (sw?.active) sw.destroy(); });
            }
            // Upward shockwave
            const swUp = enemyBullets.create(this.x, this.y, 'boss_shockwave');
            if (swUp) {
                swUp.setVelocity(0, -370);
                swUp.setGravityY(-900);
                swUp.damage = this.damage - 3;
                this.scene.time.delayedCall(1200, () => { if (swUp?.active) swUp.destroy(); });
            }
        });
    }

    _titanRockRain(player, enemyBullets, count = 4) {
        const rx = this.scene.roomIndex * ROOM_W;
        this.showOverlayText('ROCK RAIN!', '#cc4400', 28);
        this.scene.cameras.main.shake(280, 0.014);

        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * 520, () => {
                if (!this.active) return;
                const targetX = Phaser.Math.Between(rx + 100, rx + ROOM_W - 100);

                // Shadow warning circle
                const shadow = this.scene.add.ellipse(targetX, GROUND_Y - 6, 80, 22, 0xff5500, 0.35);
                this.scene.tweens.add({
                    targets: shadow, alpha: 0.72, scaleX: 1.3, duration: 260,
                    yoyo: true, repeat: 2, onComplete: () => shadow.destroy(),
                });

                // Boulder drops after warning
                this.scene.time.delayedCall(310, () => {
                    if (!this.active) return;
                    const b = enemyBullets.create(
                        targetX + Phaser.Math.Between(-30, 30), -30, 'boss_bullet_titan'
                    );
                    if (!b) return;
                    b.setScale(1.6);
                    b.setVelocity(0, 550);
                    b.setGravityY(-900);
                    b.damage = this.damage + 6;

                    // Impact on ground
                    this.scene.time.delayedCall(1350, () => {
                        if (!b?.active) return;
                        const bx = b.x;
                        b.destroy();
                        this.scene.cameras.main.shake(130, 0.008);
                        for (const d of [-1, 1]) {
                            const sw = enemyBullets.create(bx, GROUND_Y - 10, 'boss_shockwave');
                            if (sw) {
                                sw.setVelocityX(d * 340);
                                sw.setGravityY(-900);
                                sw.damage = this.damage - 4;
                                this.scene.time.delayedCall(1100, () => { if (sw?.active) sw.destroy(); });
                            }
                        }
                    });
                });
            });
        }
    }

    _titanGroundSweep(player, enemyBullets) {
        if (this.titanSweeping) return;
        this.titanSweeping  = true;
        this.titanSweepCd   = this.titanSweepCdMax;

        const rx   = this.scene.roomIndex * ROOM_W;
        const dir  = player.x < this.x ? 1 : -1;
        const fromX = dir > 0 ? rx + 60 : rx + ROOM_W - 60;
        const toX   = dir > 0 ? rx + ROOM_W - 60 : rx + 60;
        this._titanSweepX = fromX;

        const fist = this.scene.add.graphics().setDepth(4);
        this._titanSweepFist = fist;
        this.setVelocityX(0);
        this.showOverlayText('GROUND SWEEP!', '#ff8800', 30);

        const drawFist = (x) => {
            fist.clear();
            fist.fillStyle(0x2a1e14);
            fist.fillRect(x - 90, GROUND_Y - 110, 180, 115);
            fist.fillStyle(0x3e2e20);
            fist.fillRect(x - 88, GROUND_Y - 108, 176, 108);
            fist.fillStyle(0x524032);
            fist.fillRect(x - 86, GROUND_Y - 108, 82, 44);
            // Knuckle row
            for (let k = -3; k <= 3; k++) {
                fist.fillStyle(0x4a3828);
                fist.fillRect(x + k * 26 - 16, GROUND_Y - 114, 28, 24);
                fist.fillStyle(0x5e4a38);
                fist.fillRect(x + k * 26 - 14, GROUND_Y - 112, 12, 18);
            }
            // Lava cracks
            fist.fillStyle(0xcc3300, 0.55);
            fist.fillRect(x - 62, GROUND_Y - 92, 3, 78);
            fist.fillRect(x - 22, GROUND_Y - 98, 3, 84);
            fist.fillRect(x + 20, GROUND_Y - 98, 3, 84);
            fist.fillRect(x + 60, GROUND_Y - 92, 3, 78);
            fist.fillStyle(0xff6600, 0.35);
            fist.fillRect(x - 60, GROUND_Y - 88, 1, 70);
            fist.fillRect(x + 21, GROUND_Y - 94, 1, 78);
            // Leading-edge lava glow
            fist.fillStyle(0xff4400, 0.28);
            fist.fillRect(dir > 0 ? x + 70 : x - 90, GROUND_Y - 110, 24, 110);
        };

        drawFist(fromX);

        this.scene.tweens.add({
            targets: this,
            _titanSweepX: toX,
            duration: 1700,
            ease: 'Cubic.easeIn',
            onUpdate: () => {
                drawFist(this._titanSweepX);
                if (player.active) {
                    if (Math.abs(player.x - this._titanSweepX) < 92 && player.y > GROUND_Y - 116) {
                        player.takeDamage(this.damage + 6);
                    }
                }
            },
            onComplete: () => {
                this.scene.cameras.main.shake(420, 0.026);
                fist.destroy();
                this._titanSweepFist = null;
                this.titanSweeping   = false;
            },
        });
    }

    _titanStartUltimate(enemyBullets) {
        this.titanUltActive  = true;
        this.titanUltCd      = this.titanUltCdMax;
        this.titanIsLeaping  = false;
        this.setVelocityX(0);
        this.setVelocityY(0);

        // Screen darkness flash
        const cam = this.scene.cameras.main;
        cam.shake(900, 0.025);
        const overlay = this.scene.add.rectangle(
            cam.scrollX + this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width, this.scene.scale.height,
            0x000000, 0
        ).setScrollFactor(0).setDepth(99);
        this.scene.tweens.add({
            targets: overlay, alpha: 0.65, duration: 380, yoyo: true, hold: 280,
            onComplete: () => overlay.destroy(),
        });

        this.setTint(0xff0000);
        this.showOverlayText("TITAN'S WRATH!", '#ff4400', 42);

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance("You are nothing!");
            u.pitch = 0.5; u.rate = 0.75;
            window.speechSynthesis.speak(u);
        }

        // 6-direction shockwave burst after 600ms
        this.scene.time.delayedCall(600, () => {
            if (!this.active) return;
            cam.shake(700, 0.032);
            const dirs = [
                { vx: -490, vy: 0    },
                { vx:  490, vy: 0    },
                { vx: -330, vy: -330 },
                { vx:  330, vy: -330 },
                { vx: -140, vy: -460 },
                { vx:  140, vy: -460 },
            ];
            dirs.forEach(({ vx, vy }) => {
                const sw = enemyBullets.create(this.x, this.y + 10, 'boss_shockwave');
                if (!sw) return;
                sw.setVelocity(vx, vy);
                sw.setGravityY(-900);
                sw.setScale(1.7);
                sw.damage = this.damage + 7;
                this.scene.time.delayedCall(2000, () => { if (sw?.active) sw.destroy(); });
            });
        });

        // Heal over 4s
        const healTotal   = (0.15 + this.tier * 0.03) * this.maxHp;
        const healPerTick = healTotal / 8;
        this.scene.time.addEvent({
            delay: 500, repeat: 7,
            callback: () => {
                if (!this.active) return;
                this.hp = Math.min(this.maxHp, this.hp + healPerTick);
                this.scene.registry.set('bossHp', this.hp);
            },
        });

        // Vulnerability after 4.2s
        this.scene.time.delayedCall(4200, () => {
            if (this.active && this.titanUltActive) this._titanEndUltimate();
        });
    }

    _updateTitanUltimate(player, enemyBullets, delta) {
        this.setVelocityX(0);
    }

    _titanEndUltimate() {
        this.titanUltActive = false;
        this.scene.cameras.main.flash(500, 255, 100, 0);
        this.showOverlayText('VULNERABLE!', '#ff4444', 34);
        if (this.phase >= 2) this.setTint(0xff6600); else this.clearTint();
    }

    // ─── STORM ──────────────────────────────────────────────────
    _updateStorm(player, enemyBullets, delta) {
        // First tick: disable gravity, create cloud, set initial wander target
        if (!this._stormFlying) {
            this._stormFlying = true;
            this.body.allowGravity = false;
            this.setVelocityY(0);
            const rx = this.scene.roomIndex * ROOM_W;
            this._stormWanderX = rx + ROOM_W / 2;
            this._stormWanderY = 260;
            // Cloud back layer (depth 1) — upper puffs sit BEHIND Storm
            const cb = this.scene.add.graphics().setDepth(1);
            cb.fillStyle(0x1e3566, 1.0);
            cb.fillCircle(-44,  10, 36); // left puff
            cb.fillCircle(  0,  -2, 42); // center top puff
            cb.fillCircle( 44,  10, 36); // right puff

            // Cloud front layer (depth 3) — lower body sits IN FRONT of Storm
            // covering her from the waist down so she looks like she's riding it
            const cf = this.scene.add.graphics().setDepth(3);
            cf.fillStyle(0x1e3566, 1.0);
            cf.fillEllipse(  0, 28, 148, 52); // wide main body
            cf.fillCircle(-48, 20, 30);       // lower-left puff
            cf.fillCircle( 48, 20, 30);       // lower-right puff
            cf.fillCircle(  0, 18, 34);       // center overlap to blend seamlessly

            // Jagged lightning streaks hanging from cloud bottom with branching forks
            const rnd = (a, b) => a + Math.random() * (b - a);
            const makePts = (sx, sy, steps, xSpread, yDrop) => {
                const pts = [[sx, sy]];
                let cx = sx, cy = sy;
                for (let i = 0; i < steps; i++) {
                    cx += rnd(-xSpread, xSpread);
                    cy += rnd(yDrop * 0.7, yDrop * 1.3);
                    pts.push([cx, cy]);
                }
                return pts;
            };
            const strokePts = (pts, w, col, a) => {
                cf.lineStyle(w, col, a);
                cf.beginPath(); cf.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) cf.lineTo(pts[i][0], pts[i][1]);
                cf.strokePath();
            };
            const drawLightning = (sx, sy) => {
                const main  = makePts(sx, sy, 6, 10, 8);
                const fi    = Math.floor(main.length * 0.55);
                const [fx, fy] = main[fi];
                const fork1 = makePts(fx - 5, fy, 3, 7, 7);
                const fork2 = makePts(fx + 5, fy, 3, 7, 7);
                strokePts(main,  9,   0xaa00ee, 0.18); // wide outer glow
                strokePts(fork1, 6,   0xaa00ee, 0.14);
                strokePts(fork2, 6,   0xaa00ee, 0.14);
                strokePts(main,  4,   0xcc44ff, 0.50); // mid purple glow
                strokePts(fork1, 2.5, 0xcc44ff, 0.38);
                strokePts(fork2, 2.5, 0xcc44ff, 0.38);
                strokePts(main,  1.5, 0xe8c0ff, 1.0);  // bright core
                strokePts(fork1, 1,   0xe8c0ff, 0.9);
                strokePts(fork2, 1,   0xe8c0ff, 0.9);
            };
            // 4 bolts hanging from cloud base
            drawLightning(-46, 44);
            drawLightning(-18, 46);
            drawLightning( 14, 45);
            drawLightning( 44, 44);

            this._stormCloudGfx = cb; // back layer
            this._stormCloudFg  = cf; // front layer
        }

        // Move both cloud layers with boss each frame (offset down so cloud sits at waist)
        if (this._stormCloudGfx) this._stormCloudGfx.setPosition(this.x, this.y + 18);
        if (this._stormCloudFg)  this._stormCloudFg.setPosition(this.x, this.y + 18);

        // Ultimate check
        this.stormUltCd = Math.max(0, this.stormUltCd - delta);
        if (!this.stormUltActive && this.stormUltCd <= 0 && this.hp < this.maxHp * 0.85) {
            this._stormStartUltimate(player, enemyBullets);
            return;
        }
        if (this.stormUltActive) {
            this._updateStormUltimate(player, enemyBullets, delta);
            return;
        }

        const rx   = this.scene.roomIndex * ROOM_W;
        const minX = rx + 90, maxX = rx + ROOM_W - 90;
        const minY = 90,      maxY = GROUND_Y - 90;

        this.stormLightCd  = Math.max(0, this.stormLightCd  - delta);
        this.stormSurgeCd  = Math.max(0, this.stormSurgeCd  - delta);
        this.stormAerialCd = Math.max(0, this.stormAerialCd - delta);
        this.pulseCd       = Math.max(0, this.pulseCd       - delta);

        // ── 2D Wander AI ───────────────────────────────────────────
        this._stormWanderCd = Math.max(0, this._stormWanderCd - delta);
        if (this._stormWanderCd <= 0) {
            this._stormWanderCd = Phaser.Math.Between(1400, 2600);
            // Bias toward player's quadrant but stay in upper 60% of arena
            const biasX = Phaser.Math.Clamp(player.x + Phaser.Math.Between(-320, 320), minX, maxX);
            const biasY = Phaser.Math.Clamp(player.y - Phaser.Math.Between(100, 340), minY, maxY * 0.55);
            this._stormWanderX = biasX;
            this._stormWanderY = biasY;
        }

        const dx  = this._stormWanderX - this.x;
        const dy  = this._stormWanderY - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const spd = this.phase >= 2 ? this.moveSpeed * 1.35 : this.moveSpeed;
        if (len > 12) {
            this.setVelocityX((dx / len) * spd);
            this.setVelocityY((dy / len) * spd * 0.7);
        } else {
            this.setVelocityX(0);
            this.setVelocityY(0);
        }

        // Clamp to arena bounds
        const nx = Phaser.Math.Clamp(this.x, minX, maxX);
        const ny = Phaser.Math.Clamp(this.y, minY, maxY);
        if (nx !== this.x || ny !== this.y) this.setPosition(nx, ny);

        // ── Attacks ────────────────────────────────────────────────
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Spread shot
        if (this.attackCd <= 0) {
            this.attackCd = this.attackCdMax;
            const count = this.phase >= 2 ? 5 : 3;
            this.fireBurst(player, enemyBullets, count);
        }

        // Lightning strikes
        if (this.stormLightCd <= 0) {
            this.stormLightCd = this.stormLightCdMax;
            const count = this.phase >= 3 ? 3 : this.phase >= 2 ? 2 : 1;
            this._stormLightningStrike(player, count);
        }

        // Static aura when close
        if (this.pulseCd <= 0) {
            this.pulseCd = this.pulseCdMax;
            const aura = this.phase >= 2 ? 160 : 110;
            if (dist < aura) {
                player.takeDamage(this.damage - 8);
                this.scene.cameras.main.flash(120, 255, 255, 0);
            }
            this.setTint(0xffffff);
            this.scene.time.delayedCall(160, () => { if (this.active) this._applyStormPhaseColor(); });
        }

        // Phase 2+: storm surge ring
        if (this.phase >= 2 && this.stormSurgeCd <= 0) {
            this.stormSurgeCd = this.stormSurgeCdMax;
            this._stormSurge(enemyBullets);
        }

        // Phase 2+: aerial strikes that punish players on platforms
        if (this.phase >= 2 && this.stormAerialCd <= 0) {
            this.stormAerialCd = this.stormAerialCdMax;
            this._stormAerialStrike(player);
        }
    }

    _stormLightningStrike(player, count) {
        const rx = this.scene.roomIndex * ROOM_W;

        // Build spread positions so the player must actively dodge
        let positions;
        if (count === 1) {
            positions = [player.x + Phaser.Math.Between(-60, 60)];
        } else if (count === 2) {
            // One on player, one cutting off the natural escape direction
            const escDir = player.x < rx + ROOM_W / 2 ? 1 : -1;
            positions = [
                player.x,
                Phaser.Math.Clamp(player.x + escDir * 400, rx + 100, rx + ROOM_W - 100),
            ];
        } else {
            // 3 strikes spread across the arena — left third, center, right third
            // Shuffle fire order so pattern isn't always left→center→right
            positions = [
                Phaser.Math.Clamp(rx + ROOM_W * 0.18, rx + 80, rx + ROOM_W - 80),
                player.x + Phaser.Math.Between(-50, 50),
                Phaser.Math.Clamp(rx + ROOM_W * 0.82, rx + 80, rx + ROOM_W - 80),
            ];
            Phaser.Utils.Array.Shuffle(positions);
        }

        positions.forEach((targetX, i) => {
            this.scene.time.delayedCall(i * 440, () => {
                if (!this.active) return;
                const warn = this.scene.add.ellipse(targetX, GROUND_Y - 6, 68, 18, 0xffffff, 0.62);
                this.scene.tweens.add({ targets: warn, scaleX: 1.3, alpha: 0.9, duration: 700, yoyo: true });

                this.scene.time.delayedCall(800, () => {
                    if (!this.active) return;
                    warn.destroy();
                    const bolt = this.scene.add.rectangle(targetX, GROUND_Y / 2, 20, GROUND_Y, 0xffffff, 0.92);
                    this.scene.tweens.add({ targets: bolt, alpha: 0, scaleX: 3.5, duration: 210, onComplete: () => bolt.destroy() });
                    this.scene.cameras.main.flash(90, 255, 255, 200);
                    // Phase 1: only damages ground-level players — platforms are safe zones
                    // Phase 2+: bolt reaches platform height too
                    const safeOnPlatform = this.phase < 2 && player.y < GROUND_Y - 120;
                    if (player.active && Math.abs(player.x - targetX) < 48 && !safeOnPlatform) {
                        player.takeDamage(this.damage + 12);
                    }
                });
            });
        });
    }

    _stormSurge(enemyBullets) {
        this.showOverlayText('STORM SURGE!', '#ffffff', 28);
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const b = enemyBullets.create(this.x, this.y - 20, this.bulletKey);
            if (!b) continue;
            b.setTint(0xffffff);
            b.setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
            b.setGravityY(-900);
            b.damage = Math.round(this.damage * 0.78);
            this.scene.time.delayedCall(2000, () => { if (b?.active) b.destroy(); });
        }
    }

    _stormAerialStrike(player) {
        // Horizontal lightning beams at platform heights — punishes staying elevated
        const rx = this.scene.roomIndex * ROOM_W;
        // Match the platform heights used in Storm's arena layout
        const allHeights = [GROUND_Y - 180, GROUND_Y - 240, GROUND_Y - 320, GROUND_Y - 370];
        const count = this.phase >= 3 ? 3 : 2;
        const heights = allHeights.slice(0, count);

        this.showOverlayText('GET DOWN!', '#ffffff', 28);

        heights.forEach((targetY, i) => {
            this.scene.time.delayedCall(i * 380, () => {
                if (!this.active) return;
                const beamW = ROOM_W - 100;
                const cx    = rx + ROOM_W / 2;

                // Warning bar at this height
                const warn = this.scene.add.rectangle(cx, targetY, beamW, 12, 0xffffff, 0.38);
                this.scene.tweens.add({ targets: warn, alpha: 0.72, duration: 500, yoyo: true });

                this.scene.time.delayedCall(700, () => {
                    if (!this.active) return;
                    warn.destroy();

                    // Full-width horizontal beam
                    const beam = this.scene.add.rectangle(cx, targetY, beamW, 24, 0xffffff, 0.9);
                    this.scene.tweens.add({ targets: beam, alpha: 0, scaleY: 4, duration: 200, onComplete: () => beam.destroy() });
                    this.scene.cameras.main.flash(70, 180, 180, 255);

                    // Only damages players at this elevation — ground level is safe
                    if (player.active && Math.abs(player.y - targetY) < 90) {
                        player.takeDamage(this.damage + 8);
                    }
                });
            });
        });
    }

    _stormStartUltimate(player, enemyBullets) {
        this.stormUltActive   = true;
        this.stormUltCd       = this.stormUltCdMax;
        this.stormUltOrbsLeft  = 3;
        this.stormOrbAngle     = 0;
        this.isCharging        = false;

        // Rush immediately to arena center at high speed
        const rx = this.scene.roomIndex * ROOM_W;
        const cx = rx + ROOM_W / 2;
        const cy = GROUND_Y - 310;
        this._stormUltCenterX  = cx;
        this._stormUltCenterY  = cy;
        this._stormUltCentered = false;

        this.scene.cameras.main.flash(600, 180, 180, 255);
        this.setTint(0xffffff);
        this.showOverlayText('EYE OF THE STORM!', '#ffffff', 42);

        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance("You cannot outrun the storm!");
            u.pitch = 1.0; u.rate = 0.85;
            window.speechSynthesis.speak(u);
        }

        this._stormSpawnOrbs();

        // Heal during window
        const healTotal   = (0.10 + this.tier * 0.025) * this.maxHp;
        const healPerTick = healTotal / 12;
        this.scene.time.addEvent({
            delay: 500, repeat: 11,
            callback: () => {
                if (this.active && this.stormUltActive) {
                    this.hp = Math.min(this.maxHp, this.hp + healPerTick);
                    this.scene.registry.set('bossHp', this.hp);
                }
            },
        });

        // Final lightning volley before ending
        this.scene.time.delayedCall(6500, () => {
            if (this.active && this.stormUltActive) {
                this._stormLightningStrike(player, 3);
                this.scene.time.delayedCall(1200, () => {
                    if (this.active && this.stormUltActive) this._stormEndUltimate();
                });
            }
        });
    }

    _stormSpawnOrbs() {
        const orbs = this.scene.bossOrbs;
        if (!orbs) return;
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2;
            const radius = 130;
            const orb    = orbs.create(
                this.x + Math.cos(angle) * radius,
                this.y + Math.sin(angle) * radius,
                'viper_orb'
            );
            if (!orb) continue;
            orb.setTint(0x7722ff);
            orb.setScale(1.6);
            orb.body.allowGravity = false;
            orb.setImmovable(true);
            orb.orbHp     = 2 + this.tier;
            orb.bossRef   = this;
            orb.orbType   = 'storm_orb';
            orb.orbAngle  = angle;
            orb.orbRadius = radius;
            orb.pulseTween = this.scene.tweens.add({
                targets: orb, scaleX: 1.2, scaleY: 1.2, duration: 340, yoyo: true, repeat: -1,
            });
        }
    }

    _updateStormUltimate(player, enemyBullets, delta) {
        // Rush to center first, then hold position for the whole ultimate
        if (!this._stormUltCentered) {
            const dx   = this._stormUltCenterX - this.x;
            const dy   = this._stormUltCenterY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 14) {
                const spd = 340;
                this.setVelocityX((dx / dist) * spd);
                this.setVelocityY((dy / dist) * spd);
            } else {
                this.setPosition(this._stormUltCenterX, this._stormUltCenterY);
                this.setVelocity(0, 0);
                this._stormUltCentered = true;
            }
        } else {
            this.setVelocity(0, 0);
        }

        // Rotate orbs around boss
        this.stormOrbAngle += delta * 0.00048;
        const orbs = this.scene.bossOrbs;
        if (orbs) {
            orbs.getChildren()
                .filter(o => o.orbType === 'storm_orb' && o.active)
                .forEach(orb => {
                    const angle = orb.orbAngle + this.stormOrbAngle;
                    orb.x = this.x + Math.cos(angle) * orb.orbRadius;
                    orb.y = this.y + Math.sin(angle) * orb.orbRadius;
                    orb.refreshBody();
                    // Zap player on contact
                    if (player.active && Phaser.Math.Distance.Between(orb.x, orb.y, player.x, player.y) < 32) {
                        const now = this.scene.time.now;
                        if (!orb._dmgTime || now - orb._dmgTime > 700) {
                            orb._dmgTime = now;
                            player.takeDamage(this.damage - 8);
                        }
                    }
                });
        }

        if (this.stormUltOrbsLeft <= 0) this._stormEndUltimate();
    }

    _stormEndUltimate() {
        this.stormUltActive = false;
        // Storm keeps flying — gravity stays off, resume wander from current position
        this._stormWanderX = this.x;
        this._stormWanderY = this.y;
        this._stormWanderCd = 0;
        this.scene.cameras.main.flash(400, 180, 180, 255);
        this.showOverlayText('VULNERABLE!', '#ff4444', 34);
        this._applyStormPhaseColor();
        // Clean remaining orbs
        const orbs = this.scene.bossOrbs;
        if (orbs) {
            orbs.getChildren()
                .filter(o => o.orbType === 'storm_orb' && o.active)
                .forEach(o => { if (o.pulseTween) o.pulseTween.stop(); o.destroy(); });
        }
    }

    _applyStormPhaseColor() {
        if (this.phase >= 2) this.setTint(0xffffff); else this.clearTint();
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
        if (this.bossType === 'blaze'   && this.blazeUltActive)   return;
        if (this.bossType === 'phantom' && this.phantomUltActive)  return;
        if (this.bossType === 'titan'   && this.titanUltActive)    return;
        if (this.bossType === 'storm'   && this.stormUltActive)    return;

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

        // Cleanup Blaze
        if (this.bossType === 'blaze') {
            if (this.scene.blazeFireZones) this.scene.blazeFireZones.clear(true, true);
            if (this.scene.bossOrbs) {
                this.scene.bossOrbs.getChildren()
                    .filter(o => o.orbType === 'blaze_core' && o.active)
                    .forEach(o => { if (o.pulseTween) o.pulseTween.stop(); o.destroy(); });
            }
        }
        // Cleanup Titan
        if (this.bossType === 'titan' && this._titanBgGraphic) {
            this._titanBgGraphic.destroy();
            this._titanBgGraphic = null;
        }
        // Cleanup Storm
        if (this.bossType === 'storm') {
            if (this.scene.bossOrbs) {
                this.scene.bossOrbs.getChildren()
                    .filter(o => o.orbType === 'storm_orb' && o.active)
                    .forEach(o => { if (o.pulseTween) o.pulseTween.stop(); o.destroy(); });
            }
            if (this._stormCloudGfx) { this._stormCloudGfx.destroy(); this._stormCloudGfx = null; }
            if (this._stormCloudFg)  { this._stormCloudFg.destroy();  this._stormCloudFg  = null; }
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
