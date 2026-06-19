export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type, floor = 1, isElite = false) {
        const textures = {
            guard:      'enemy_guard',
            sniper:     'enemy_sniper',
            runner:     'enemy_runner',
            shielded:   'enemy_shielded',
            spawner:    'enemy_spawner',
            miniboss:   'enemy_miniboss',
            berserker:  'enemy_berserker',
            juggernaut: 'enemy_juggernaut',
            vampire:    'enemy_vampire',
            wraith:     'enemy_wraith',
            colossus:   'enemy_colossus',
        };
        super(scene, x, y, textures[type] || 'enemy_guard');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyType = type;
        this.setCollideWorldBounds(true);

        const stats = {
            guard:    { hp: 65,  speed: 95,  damage: 14, range: 44,  attackCd: 1100 },
            sniper:   { hp: 50,  speed: 0,   damage: 22, range: 700, attackCd: 2400 },
            runner:   { hp: 35,  speed: 185, damage: 10, range: 38,  attackCd: 750  },
            shielded: { hp: 80,  speed: 75,  damage: 16, range: 46,  attackCd: 1100 },
            spawner:  { hp: 200, speed: 0,   damage: 0,  range: 0,   attackCd: 99999 },
            miniboss:   { hp: 320, speed: 88,  damage: 28, range: 56,  attackCd: 900  },
            berserker:  { hp: 50,  speed: 220, damage: 18, range: 42,  attackCd: 700  },
            juggernaut: { hp: 260, speed: 60,  damage: 32, range: 60,  attackCd: 1600 },
            vampire:    { hp: 90,  speed: 118, damage: 22, range: 46,  attackCd: 1100 },
            wraith:     { hp: 55,  speed: 210, damage: 20, range: 44,  attackCd: 900  },
            colossus:   { hp: 340, speed: 50,  damage: 35, range: 500, attackCd: 2000 },
        };

        const s = stats[type] || stats.guard;

        // Floor scaling: 5% HP/dmg per floor, 2.5% speed, capped
        const floorScale = Math.min(2.5, 1 + Math.max(0, floor - 1) * 0.05);
        const speedScale = Math.min(1.7, 1 + Math.max(0, floor - 1) * 0.025);

        this.maxHp       = Math.round(s.hp     * floorScale);
        this.hp          = this.maxHp;
        this.moveSpeed   = Math.round(s.speed  * speedScale);
        this.damage      = Math.round(s.damage * floorScale);
        this.attackRange = s.range;
        this.attackCdMax = s.attackCd;
        this.attackCd    = Phaser.Math.Between(0, Math.min(s.attackCd, 1500));
        this.slowed      = false;
        this.slowTimer   = 0;
        this.jumpCd      = Phaser.Math.Between(600, 3000); // stagger so all enemies don't jump on frame 1

        // Modifiers (applied externally by GameScene for curses etc.)
        this.armorMod       = 1;     // < 1 means takes less damage
        this.isSpawnedEnemy = false; // spawned runners don't count toward room clear
        this.parentSpawner  = null;  // owning spawner tracks active runner count

        // Elite modifier
        if (isElite) {
            this.maxHp     = Math.round(this.maxHp   * 2);
            this.hp        = this.maxHp;
            this.damage    = Math.round(this.damage  * 1.5);
            this.moveSpeed = Math.round(this.moveSpeed * 1.25);
            this.setTint(0xffd700);
        }

        // Type-specific setup
        if (type === 'shielded') {
            this.shieldHp    = Math.round(60 * floorScale);
            this.maxShieldHp = this.shieldHp;
            if (!isElite) this.setTint(0x0088ff);
        }

        if (type === 'spawner') {
            this.spawnTimer     = 0;
            this.spawnInterval  = Math.max(2500, 4500 - floor * 80);
            this.spawnedRunners = 0;
            this.maxSpawns      = 3;
        }

        if (type === 'miniboss') {
            this.minibossSubtype = 'warlord'; // overridden by GameScene after construction
            this.setScale(1.4);
            // Subtype vars populated in _initMinibossSubtype()
        }

        if (type === 'berserker') {
            this.chargeTimer    = Phaser.Math.Between(2200, 3800);
            this.charging       = false;
            this.chargeDuration = 0;
            if (!isElite) this.setTint(0xff4400);
        }

        if (type === 'juggernaut') {
            this.armorMod = Math.min(this.armorMod, 0.55);
            this.setScale(1.5);
            if (!isElite) this.setTint(0x888888);
        }

        if (type === 'wraith') {
            this.teleportCd    = Phaser.Math.Between(2000, 3500);
            this.teleportCdMax = 3000;
            this.setAlpha(0.75);
            if (!isElite) this.setTint(0xaa44ff);
        }

        if (type === 'colossus') {
            this.armorMod      = 0.2;  // 80% damage reduction until staggered
            this.staggerHpPool = 0;    // damage absorbed this window
            this.staggerWindow = 0;    // remaining time of stagger window
            this.staggerCd     = 0;    // stagger recharge timer
            this.staggered     = false;
            this.setScale(1.6);
            if (!isElite) this.setTint(0x607d8b);
        }

        this.hpBar = scene.add.graphics();
        this.drawHpBar();
    }

    drawHpBar() {
        if (!this.hpBar || !this.active) return;
        // Mini-boss HP is shown in the UIScene top bar instead
        if (this.enemyType === 'miniboss') return;
        this.hpBar.clear();

        const w  = 40, h = 5;
        const pct = Math.max(0, this.hp / this.maxHp);
        const bx  = this.x - w / 2;
        const by  = this.y - this.height * this.scaleY / 2 - 10;

        // Shield bar above HP bar for shielded type
        if (this.enemyType === 'shielded' && this.maxShieldHp > 0) {
            const sby      = by - 8;
            const shieldPct = Math.max(0, this.shieldHp / this.maxShieldHp);
            this.hpBar.fillStyle(0x001133);
            this.hpBar.fillRect(bx, sby, w, 4);
            if (this.shieldHp > 0) {
                this.hpBar.fillStyle(0x4499ff);
                this.hpBar.fillRect(bx, sby, w * shieldPct, 4);
            }
        }

        this.hpBar.fillStyle(0x222222);
        this.hpBar.fillRect(bx, by, w, h);

        const col = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
        this.hpBar.fillStyle(col);
        this.hpBar.fillRect(bx, by, w * pct, h);
    }

    update(player, enemyBullets, delta) {
        if (!this.active || !player || !player.active) return;

        const dist      = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const speedMult = this.slowed ? 0.35 : 1;

        this.setFlipX(player.x < this.x);
        this.attackCd = Math.max(0, this.attackCd - delta * (this.slowed ? 0.4 : 1));
        this.jumpCd   = Math.max(0, this.jumpCd   - delta);

        if (this.slowed) {
            this.slowTimer -= delta;
            if (this.slowTimer <= 0) {
                this.slowed = false;
                this._restoreTypeTint();
            }
        }

        switch (this.enemyType) {
            case 'guard':
            case 'runner':
            case 'shielded':
            case 'juggernaut':
                if (dist > this.attackRange + 10) {
                    const dir = player.x > this.x ? 1 : -1;
                    this.setVelocityX(dir * this.moveSpeed * speedMult);

                    if (this.body.blocked.down && this.jumpCd <= 0 && this.enemyType !== 'juggernaut') {
                        const playerAbove  = player.y < this.y - 100;
                        const blockedHoriz = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                        if (playerAbove || blockedHoriz) {
                            this.setVelocityY(playerAbove ? -820 : -720);
                            this.jumpCd = playerAbove
                                ? Phaser.Math.Between(800, 1400)
                                : Phaser.Math.Between(1600, 2800);
                        }
                    }
                } else {
                    this.setVelocityX(0);
                    if (this.attackCd <= 0) {
                        this.attackCd = this.attackCdMax;
                        player.takeDamage(this.damage);
                    }
                }
                break;

            case 'miniboss':
                this._updateMiniboss(player, enemyBullets, delta, dist, speedMult);
                break;

            case 'sniper':
                this.setVelocityX(0);
                if (dist <= this.attackRange && this.attackCd <= 0) {
                    this.attackCd = this.attackCdMax;
                    this.fireAt(player, enemyBullets);
                }
                break;

            case 'berserker': {
                if (dist > this.attackRange + 10) {
                    const dir = player.x > this.x ? 1 : -1;
                    this.chargeTimer -= delta;
                    if (!this.charging && this.chargeTimer <= 0) {
                        this.charging       = true;
                        this.chargeDuration = 550;
                        this.chargeTimer    = Phaser.Math.Between(2200, 3800);
                        if (!this.slowed) this.setTint(0xff8800);
                    }
                    if (this.charging) {
                        this.chargeDuration -= delta;
                        if (this.chargeDuration <= 0) {
                            this.charging = false;
                            if (!this.slowed) this._restoreTypeTint();
                        }
                    }
                    const spd = (this.charging ? this.moveSpeed * 2.2 : this.moveSpeed) * speedMult;
                    this.setVelocityX(dir * spd);
                    if (this.body.blocked.down && this.jumpCd <= 0) {
                        const playerAbove  = player.y < this.y - 100;
                        const blockedHoriz = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                        if (playerAbove || blockedHoriz) {
                            this.setVelocityY(playerAbove ? -820 : -720);
                            this.jumpCd = playerAbove
                                ? Phaser.Math.Between(800, 1400)
                                : Phaser.Math.Between(1600, 2800);
                        }
                    }
                } else {
                    this.setVelocityX(0);
                    if (this.attackCd <= 0) {
                        this.attackCd = this.attackCdMax;
                        player.takeDamage(this.damage);
                    }
                }
                break;
            }

            case 'vampire': {
                if (dist > this.attackRange + 10) {
                    const dir = player.x > this.x ? 1 : -1;
                    this.setVelocityX(dir * this.moveSpeed * speedMult);
                    if (this.body.blocked.down && this.jumpCd <= 0) {
                        const playerAbove  = player.y < this.y - 70;
                        const blockedHoriz = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                        if (playerAbove || blockedHoriz) {
                            this.setVelocityY(-760);
                            this.jumpCd = Phaser.Math.Between(900, 1500);
                        }
                    }
                } else {
                    this.setVelocityX(0);
                    if (this.attackCd <= 0) {
                        this.attackCd = this.attackCdMax;
                        player.takeDamage(this.damage);
                        const drain = Math.round(this.damage * 0.3);
                        this.hp = Math.min(this.hp + drain, this.maxHp);
                        this._floatText(`+${drain}`, '#ff66cc');
                        this.drawHpBar();
                    }
                }
                break;
            }

            case 'wraith': {
                // Teleporting melee — blinks to player and attacks
                const dir = player.x > this.x ? 1 : -1;
                this.setVelocityX(dir * this.moveSpeed * speedMult);

                this.teleportCd -= delta;
                if (this.teleportCd <= 0) {
                    this.teleportCd = this.teleportCdMax;
                    const offsetX = (Math.random() > 0.5 ? 60 : -60) + Phaser.Math.Between(-20, 20);
                    this.setPosition(player.x + offsetX, player.y);
                    this.setVelocityX(0);
                    // Flash on teleport
                    this.setTint(0xffffff);
                    this.scene.time.delayedCall(80, () => { if (this.active && !this.slowed) this.setTint(0xaa44ff); });
                }

                if (dist <= this.attackRange + 10 && this.attackCd <= 0) {
                    this.attackCd = this.attackCdMax;
                    player.takeDamage(this.damage);
                }
                break;
            }

            case 'colossus': {
                // Stagger system: track damage received; if >200 in window, stagger
                if (this.staggerWindow > 0) {
                    this.staggerWindow -= delta;
                    if (this.staggerWindow <= 0) {
                        this.staggerHpPool = 0;
                        if (!this.staggered) this.staggerCd = 6000;
                    }
                }
                if (this.staggered) {
                    this.staggerCd -= delta;
                    if (this.staggerCd <= 0) {
                        this.staggered = false;
                        this.armorMod  = 0.2;
                        if (!this.slowed) this.setTint(0x607d8b);
                        this._floatText('ARMORED', '#90a4ae');
                    }
                }

                const dirC = player.x > this.x ? 1 : -1;
                this.setVelocityX(dirC * this.moveSpeed * speedMult);

                // Ranged spread shot
                if (dist <= this.attackRange && dist > 60 && this.attackCd <= 0) {
                    this.attackCd = this.attackCdMax;
                    this.fireAt(player, enemyBullets);
                    // Also fire flanking shots in phase if staggered
                    if (this.staggered) {
                        this.scene.time.delayedCall(120, () => { if (this.active) this.fireAt(player, enemyBullets); });
                        this.scene.time.delayedCall(240, () => { if (this.active) this.fireAt(player, enemyBullets); });
                    }
                } else if (dist <= 60 && this.attackCd <= 0) {
                    // Melee if cornered
                    this.attackCd = this.attackCdMax;
                    player.takeDamage(this.damage);
                }
                break;
            }

            case 'spawner':
                this.setVelocityX(0);
                this.spawnTimer += delta;
                // Flash beacon when a spawn is imminent
                if (this.spawnTimer > this.spawnInterval * 0.75 && this.spawnedRunners < this.maxSpawns) {
                    this.setTint(Math.floor(this.spawnTimer / 150) % 2 === 0 ? 0xff2222 : 0x441111);
                } else {
                    this.clearTint();
                }
                if (this.spawnTimer >= this.spawnInterval && this.spawnedRunners < this.maxSpawns) {
                    this.spawnTimer = 0;
                    this.spawnedRunners++;
                    const spawnX = this.x + (Math.random() > 0.5 ? 70 : -70);
                    this.scene.events.emit('requestSpawn', spawnX, this.y, this);
                }
                break;
        }

        this.drawHpBar();
    }

    fireAt(player, bullets) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const spd   = 400;
        const bullet = bullets.create(this.x, this.y - 8, 'enemy_bullet');
        if (!bullet) return;
        bullet.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        bullet.setGravityY(-900);
        bullet.damage = this.damage;
        this.scene.time.delayedCall(2800, () => { if (bullet && bullet.active) bullet.destroy(); });
    }

    hit(amount, isLifeSteal = false) {
        // Titan Scout mini-boss stagger tracking
        if (this.enemyType === 'miniboss' && this.minibossSubtype === 'titan_scout' && !this.tsStaggered) {
            if (this.tsStaggerWin <= 0) this.tsStaggerWin = 2500;
            this.tsStaggerHp += amount;
            if (this.tsStaggerHp >= 150) {
                this.tsStaggered  = true;
                this.tsStaggerWin = 0;
                this.tsStaggerHp  = 0;
                this.tsChargeCd   = 2000; // brief stagger duration
                this.armorMod     = 1;
                this.setTint(0xff4444);
                this._floatText('STAGGERED!', '#ff6666');
                this.scene.cameras.main.shake(150, 0.009);
            }
        }

        // Colossus stagger tracking
        if (this.enemyType === 'colossus' && !this.staggered) {
            if (this.staggerWindow <= 0) this.staggerWindow = 3000;
            this.staggerHpPool += amount;
            if (this.staggerHpPool >= 200) {
                this.staggered     = true;
                this.staggerWindow = 0;
                this.staggerHpPool = 0;
                this.staggerCd     = 2000;
                this.armorMod      = 1;
                this.setTint(0xff4444);
                this._floatText('STAGGERED!', '#ff6666');
                this.scene.cameras.main.shake(150, 0.009);
            }
        }

        // Shield absorbs all damage while active
        if (this.enemyType === 'shielded' && this.shieldHp > 0) {
            this.shieldHp -= amount;
            if (this.shieldHp <= 0) {
                this.shieldHp = 0;
                this.clearTint();
                this.setTint(0xffffff);
                this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
                this._floatText('SHIELD BROKEN', '#4499ff');
            } else {
                this.setTint(0x4499ff);
                this.scene.time.delayedCall(80, () => { if (this.active && !this.slowed) this.setTint(0x0088ff); });
            }
            this.drawHpBar();
            return;
        }

        // Apply armor modifier (from curses or armored flag)
        const effective = this.armorMod < 1 ? Math.ceil(amount * this.armorMod) : amount;
        this.hp -= effective;

        this.setTint(0xffffff);
        this.scene.time.delayedCall(70, () => { if (this.active && !this.slowed) this._restoreTypeTint(); });

        const txt = this.scene.add.text(
            this.x + Phaser.Math.Between(-18, 18),
            this.y - 28,
            `-${effective}`,
            { fontSize: '17px', color: '#ff6666', fontStyle: 'bold' }
        ).setOrigin(0.5);
        this.scene.tweens.add({
            targets: txt, y: txt.y - 36, alpha: 0, duration: 650,
            onComplete: () => txt.destroy(),
        });

        this.drawHpBar();

        if (this.enemyType === 'miniboss') {
            this.scene.registry.set('minibossHp', Math.max(0, this.hp));
        }

        if (this.hp <= 0) this.kill(isLifeSteal);
    }

    _restoreTypeTint() {
        if (!this.active) return;
        if (this.enemyType === 'shielded' && this.shieldHp > 0) this.setTint(0x0088ff);
        else if (this.enemyType === 'miniboss') {
            const TINTS = { warlord: 0xff4400, gunner: 0x00cc55, shade: 0xaa00ff, titan_scout: 0x607d8b, storm_caller: 0xffdd00 };
            this.setTint(TINTS[this.minibossSubtype] ?? 0xff4400);
        }
        else if (this.enemyType === 'berserker')  this.setTint(0xff4400);
        else if (this.enemyType === 'juggernaut') this.setTint(0x888888);
        else if (this.enemyType === 'wraith')     this.setTint(0xaa44ff);
        else if (this.enemyType === 'colossus')   this.setTint(this.staggered ? 0xff4444 : 0x607d8b);
        else this.clearTint();
    }

    _floatText(msg, color) {
        const txt = this.scene.add.text(this.x, this.y - 40, msg, {
            fontSize: '14px', color, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.scene.tweens.add({
            targets: txt, y: txt.y - 40, alpha: 0, duration: 800,
            onComplete: () => txt.destroy(),
        });
    }

    // ─── MINI-BOSS SUBTYPE SYSTEM ───────────────────────────────

    _initMinibossSubtype(subtype) {
        this.minibossSubtype = subtype;
        const TINTS = { warlord: 0xff4400, gunner: 0x00cc55, shade: 0xaa00ff, titan_scout: 0x607d8b, storm_caller: 0xffdd00 };
        this.setTint(TINTS[subtype] ?? 0xff4400);

        // Override stats per subtype
        const fl = this.scene.registry.get('floor') ?? 1;
        const fs = Math.min(2.5, 1 + Math.max(0, fl - 1) * 0.05);
        switch (subtype) {
            case 'warlord':
                this.maxHp    = Math.round(380 * fs); this.hp = this.maxHp;
                this.moveSpeed = Math.round(95  * Math.min(1.7, 1 + fl * 0.025));
                this.damage   = Math.round(30  * fs);
                this.attackRange = 58;
                this.slamCdMax  = 4500; this.slamCd   = 3000;
                this.mbEnraged  = false;
                break;
            case 'gunner':
                this.maxHp    = Math.round(280 * fs); this.hp = this.maxHp;
                this.moveSpeed = Math.round(58  * Math.min(1.7, 1 + fl * 0.025));
                this.damage   = Math.round(22  * fs);
                this.attackRange = 480;
                this.burstCdMax = 2000; this.burstCd = 1000;
                this.turretCdMax= 12000; this.turretCd = 6000;
                this.turretFireCdMax = 1500; this.turretFireCd = 1500;
                this.turretPos  = null;
                break;
            case 'shade':
                this.maxHp    = Math.round(220 * fs); this.hp = this.maxHp;
                this.moveSpeed = Math.round(155 * Math.min(1.7, 1 + fl * 0.025));
                this.damage   = Math.round(28  * fs);
                this.attackRange = 50;
                this.blinkCdMax = 2800; this.blinkCd = 2000;
                this.mbInvisible = false; this.mbInvisTimer = 0;
                this.mbEnraged   = false;
                break;
            case 'titan_scout':
                this.maxHp    = Math.round(460 * fs); this.hp = this.maxHp;
                this.moveSpeed = Math.round(62  * Math.min(1.7, 1 + fl * 0.025));
                this.damage   = Math.round(36  * fs);
                this.attackRange = 60;
                this.armorMod   = 0.45;
                this.tsStaggerHp = 0; this.tsStaggerWin = 0; this.tsStaggered = false;
                this.tsChargeCdMax = 5000; this.tsChargeCd = 3000;
                this.tsCharging    = false; this.tsChargeDur = 0;
                break;
            case 'storm_caller':
                this.maxHp    = Math.round(260 * fs); this.hp = this.maxHp;
                this.moveSpeed = Math.round(42  * Math.min(1.7, 1 + fl * 0.025));
                this.damage   = Math.round(24  * fs);
                this.attackRange = 560;
                this.boltCdMax  = 1800; this.boltCd  = 1000;
                this.barrageCdMax= 8000; this.barrageCd = 5000;
                break;
        }
        this.scene.registry.set('minibossMaxHp', this.maxHp);
        this.scene.registry.set('minibossHp',    this.hp);
    }

    _updateMiniboss(player, enemyBullets, delta, dist, speedMult) {
        switch (this.minibossSubtype) {
            case 'warlord':     this._mbWarlord(player, enemyBullets, delta, dist, speedMult); break;
            case 'gunner':      this._mbGunner(player, enemyBullets, delta, dist, speedMult);  break;
            case 'shade':       this._mbShade(player, enemyBullets, delta, dist, speedMult);   break;
            case 'titan_scout': this._mbTitanScout(player, enemyBullets, delta, dist, speedMult); break;
            case 'storm_caller':this._mbStormCaller(player, enemyBullets, delta, dist, speedMult); break;
            default:            this._mbWarlord(player, enemyBullets, delta, dist, speedMult); break;
        }
    }

    // ── WARLORD — melee bruiser, ground slam, enrages at 50% ────
    _mbWarlord(player, bullets, delta, dist, speedMult) {
        this.attackCd = Math.max(0, this.attackCd - delta);
        this.slamCd   = Math.max(0, this.slamCd   - delta);
        this.jumpCd   = Math.max(0, this.jumpCd   - delta);

        // Enrage at 50% HP (once)
        if (!this.mbEnraged && this.hp <= this.maxHp * 0.5) {
            this.mbEnraged = true;
            this.moveSpeed  = Math.round(this.moveSpeed * 1.35);
            this.damage     = Math.round(this.damage    * 1.25);
            this.attackCdMax = Math.round(this.attackCdMax * 0.7);
            this.setTint(0xff8800);
            this._floatText('ENRAGED!', '#ff8800');
            this.scene.cameras.main.shake(250, 0.012);
        }

        // Ground slam: jump toward player then shockwave on land
        if (this.slamCd <= 0 && dist < 320 && this.body.blocked.down) {
            this.slamCd = this.slamCdMax;
            this._floatText('SLAM!', '#ff4400');
            const dir = player.x > this.x ? 1 : -1;
            this.setVelocityX(dir * 260);
            this.setVelocityY(-680);
            this.scene.time.delayedCall(550, () => {
                if (!this.active) return;
                this.scene.events.emit('minibossShockwave', this.x, this.y, Math.round(this.damage * 1.4), 130);
            });
            return;
        }

        // Normal chase + melee
        if (dist > this.attackRange + 10) {
            const dir = player.x > this.x ? 1 : -1;
            this.setVelocityX(dir * this.moveSpeed * speedMult);
            if (this.body.blocked.down && this.jumpCd <= 0) {
                const above   = player.y < this.y - 100;
                const blocked = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                if (above || blocked) {
                    this.setVelocityY(above ? -840 : -740);
                    this.jumpCd = above ? Phaser.Math.Between(800,1400) : Phaser.Math.Between(1600,2800);
                }
            }
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
                this.scene.cameras.main.shake(80, 0.007);
            }
        }
    }

    // ── GUNNER — ranged burst fire + deploys a mini-turret ───────
    _mbGunner(player, bullets, delta, dist, speedMult) {
        this.attackCd    = Math.max(0, this.attackCd    - delta);
        this.burstCd     = Math.max(0, this.burstCd     - delta);
        this.turretCd    = Math.max(0, this.turretCd    - delta);
        this.turretFireCd= Math.max(0, this.turretFireCd- delta);

        // Keep preferred range 220-480px
        const dir = player.x > this.x ? 1 : -1;
        if (dist < 220) {
            this.setVelocityX(-dir * this.moveSpeed * speedMult);
        } else if (dist > 480) {
            this.setVelocityX(dir * this.moveSpeed * 0.6 * speedMult);
        } else {
            this.setVelocityX(0);
        }

        // 3-round burst
        if (this.burstCd <= 0 && dist <= this.attackRange) {
            this.burstCd = this.burstCdMax;
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 140, () => {
                    if (!this.active) return;
                    const spread = (Math.random() - 0.5) * 0.16;
                    const angle  = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y) + spread;
                    const b = bullets.create(this.x, this.y - 8, 'enemy_bullet');
                    if (!b) return;
                    b.setVelocity(Math.cos(angle) * 430, Math.sin(angle) * 430);
                    b.setGravityY(-900);
                    b.damage = Math.round(this.damage * 0.75);
                    b.setTint(0x00ff66);
                    this.scene.time.delayedCall(2400, () => { if (b?.active) b.destroy(); });
                });
            }
        }

        // Deploy turret (once per spawn cycle)
        if (this.turretCd <= 0) {
            this.turretCd = this.turretCdMax;
            const tx = this.x + (Math.random() > 0.5 ? 200 : -200);
            this.turretPos = { x: Phaser.Math.Clamp(tx, this.x - 300, this.x + 300), y: this.y };
            this.scene.events.emit('minibossGunnerTurret', this.turretPos.x, this.turretPos.y);
            this._floatText('DEPLOY!', '#00cc55');
        }

        // Fire from turret
        if (this.turretPos && this.turretFireCd <= 0 && dist < 700) {
            this.turretFireCd = this.turretFireCdMax;
            const angle = Phaser.Math.Angle.Between(this.turretPos.x, this.turretPos.y, player.x, player.y);
            const b = bullets.create(this.turretPos.x, this.turretPos.y - 8, 'enemy_bullet');
            if (b) {
                b.setVelocity(Math.cos(angle) * 370, Math.sin(angle) * 370);
                b.setGravityY(-900);
                b.damage = Math.round(this.damage * 0.6);
                b.setTint(0x00ff88);
                this.scene.time.delayedCall(2800, () => { if (b?.active) b.destroy(); });
            }
        }
    }

    // ── SHADE — teleport melee, goes invisible post-blink ────────
    _mbShade(player, bullets, delta, dist, speedMult) {
        this.attackCd = Math.max(0, this.attackCd - delta);
        this.blinkCd  = Math.max(0, this.blinkCd  - delta);
        this.jumpCd   = Math.max(0, this.jumpCd   - delta);

        if (this.mbInvisible) {
            this.mbInvisTimer -= delta;
            if (this.mbInvisTimer <= 0) {
                this.mbInvisible = false;
                this.setAlpha(0.85);
                this._restoreTypeTint();
            }
        }

        // Enrage at 50% — halve blink CD
        if (!this.mbEnraged && this.hp <= this.maxHp * 0.5) {
            this.mbEnraged   = true;
            this.blinkCdMax  = Math.round(this.blinkCdMax * 0.5);
            this.attackCdMax = Math.round(this.attackCdMax * 0.75);
            this._floatText('FADE!', '#cc44ff');
            this.setAlpha(0.55);
        }

        // Blink to player
        if (this.blinkCd <= 0) {
            this.blinkCd = this.blinkCdMax;
            const offsetX = (Math.random() > 0.5 ? 52 : -52) + Phaser.Math.Between(-16, 16);
            this.setPosition(player.x + offsetX, player.y);
            this.setVelocityX(0);
            this.setTint(0xffffff);
            this.scene.cameras.main.flash(80, 120, 0, 200);
            // Go invisible post-blink
            this.mbInvisible  = true;
            this.mbInvisTimer = 1400;
            this.setAlpha(0.12);
            this.scene.time.delayedCall(80, () => { if (this.active) this._restoreTypeTint(); });
            return;
        }

        // During invisible: stay close and wait
        if (this.mbInvisible) {
            if (dist <= this.attackRange && this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(Math.round(this.damage * 1.4)); // bonus from stealth
                this._floatText('BACKSTAB!', '#ff44ff');
                this.mbInvisible = false;
                this.setAlpha(0.85);
            }
            return;
        }

        // Normal approach
        if (dist > this.attackRange + 10) {
            const dir = player.x > this.x ? 1 : -1;
            this.setVelocityX(dir * this.moveSpeed * speedMult);
            if (this.body.blocked.down && this.jumpCd <= 0) {
                const above   = player.y < this.y - 100;
                const blocked = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                if (above || blocked) {
                    this.setVelocityY(-820);
                    this.jumpCd = Phaser.Math.Between(700, 1200);
                }
            }
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
            }
        }
    }

    // ── TITAN SCOUT — armored, shoulder charges across the room ──
    _mbTitanScout(player, bullets, delta, dist, speedMult) {
        this.attackCd     = Math.max(0, this.attackCd   - delta);
        this.jumpCd       = Math.max(0, this.jumpCd     - delta);
        this.tsChargeCd   = Math.max(0, this.tsChargeCd - delta);
        if (this.tsStaggerWin > 0) this.tsStaggerWin -= delta;

        // Stagger recovery
        if (this.tsStaggered) {
            this.tsChargeCd -= delta;
            if (this.tsChargeCd <= 0) {
                this.tsStaggered = false;
                this.armorMod    = 0.45;
                this.tsStaggerHp = 0;
                this.tsChargeCd  = this.tsChargeCdMax;
                this._restoreTypeTint();
                this._floatText('ARMORED', '#90aabb');
            }
        }

        // Shoulder charge: horizontal dash across room
        if (this.tsCharging) {
            this.tsChargeDur -= delta;
            if (this.tsChargeDur <= 0) {
                this.tsCharging = false;
                this.setVelocityX(0);
                this.armorMod = 0.45;
                if (!this.tsStaggered) this._restoreTypeTint();
            }
            // Hit player during charge
            if (dist < 70 && this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(Math.round(this.damage * 1.6));
                this.scene.cameras.main.shake(180, 0.015);
                this._floatText('CHARGE HIT!', '#90aabb');
            }
            return;
        }

        // Trigger charge
        if (this.tsChargeCd <= 0 && !this.tsStaggered && this.body.blocked.down) {
            this.tsChargeCd  = this.tsChargeCdMax;
            this.tsCharging  = true;
            this.tsChargeDur = 620;
            this.armorMod    = 0; // charge phase is unarmored but moving fast
            const dir = player.x > this.x ? 1 : -1;
            this.setVelocityX(dir * 580);
            this.setTint(0xffffff);
            this._floatText('CHARGE!', '#607d8b');
            this.scene.cameras.main.shake(120, 0.009);
            return;
        }

        // Normal slow chase
        if (dist > this.attackRange + 10) {
            const dir = player.x > this.x ? 1 : -1;
            this.setVelocityX(dir * this.moveSpeed * speedMult);
        } else {
            this.setVelocityX(0);
            if (this.attackCd <= 0) {
                this.attackCd = this.attackCdMax;
                player.takeDamage(this.damage);
                this.scene.cameras.main.shake(100, 0.008);
            }
        }
    }

    // ── STORM CALLER — ranged lightning, barrages the player ─────
    _mbStormCaller(player, bullets, delta, dist, speedMult) {
        this.attackCd  = Math.max(0, this.attackCd  - delta);
        this.boltCd    = Math.max(0, this.boltCd    - delta);
        this.barrageCd = Math.max(0, this.barrageCd - delta);
        this.jumpCd    = Math.max(0, this.jumpCd    - delta);

        // Stay at 280-560px range
        const dir = player.x > this.x ? 1 : -1;
        if (dist < 280) {
            this.setVelocityX(-dir * this.moveSpeed * speedMult);
        } else if (dist > 560) {
            this.setVelocityX(dir * this.moveSpeed * 0.7 * speedMult);
        } else {
            this.setVelocityX(0);
        }

        // Single aimed bolt
        if (this.boltCd <= 0 && dist <= this.attackRange) {
            this.boltCd = this.boltCdMax;
            const angle = Phaser.Math.Angle.Between(this.x, this.y - 8, player.x, player.y);
            const b = bullets.create(this.x, this.y - 8, 'enemy_bullet');
            if (b) {
                b.setVelocity(Math.cos(angle) * 510, Math.sin(angle) * 510);
                b.setGravityY(-900);
                b.damage = Math.round(this.damage * 0.85);
                b.setTint(0xffff44);
                this.scene.time.delayedCall(2600, () => { if (b?.active) b.destroy(); });
            }
        }

        // Lightning Barrage — 5 fast bolts rapid-fire
        if (this.barrageCd <= 0 && dist <= this.attackRange) {
            this.barrageCd = this.barrageCdMax;
            this._floatText('LIGHTNING!', '#ffdd00');
            this.scene.cameras.main.flash(150, 255, 240, 80);
            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(i * 110, () => {
                    if (!this.active) return;
                    const spread = (Math.random() - 0.5) * 0.3;
                    const a = Phaser.Math.Angle.Between(this.x, this.y - 8, player.x, player.y) + spread;
                    const b = bullets.create(this.x, this.y - 8, 'enemy_bullet');
                    if (!b) return;
                    b.setVelocity(Math.cos(a) * 540, Math.sin(a) * 540);
                    b.setGravityY(-900);
                    b.damage = Math.round(this.damage * 1.1);
                    b.setTint(0xffffff);
                    this.scene.time.delayedCall(2500, () => { if (b?.active) b.destroy(); });
                });
            }
            // Drop a lightning strike zone under the player
            this.scene.time.delayedCall(300, () => {
                if (!this.active) return;
                this.scene.events.emit('minibossLightningStrike', player.x, player.y);
            });
        }
    }

    applySlowEffect(ms) {
        this.slowed    = true;
        this.slowTimer = ms;
        this.setTint(0x00b0ff);
    }

    kill(isLifeSteal) {
        if (!this.active) return;

        if (Math.random() < 0.22) this.scene.events.emit('dropHealth', this.x, this.y);
        if (isLifeSteal)          this.scene.events.emit('lifeStealKill', 14);

        const POWERUP_TYPES = ['powerup_firerate', 'powerup_invincible', 'powerup_jumps'];
        if (Math.random() < 0.05)
            this.scene.events.emit('dropPowerup', this.x, this.y,
                POWERUP_TYPES[Phaser.Math.Between(0, POWERUP_TYPES.length - 1)]);

        if (this.enemyType === 'miniboss') {
            this.scene.registry.set('minibossActive', false);
        }

        // Spawned runners don't count toward room-clear
        if (!this.isSpawnedEnemy) this.scene.events.emit('enemyDied');

        // Notify parent spawner so it can allow another spawn
        if (this.parentSpawner && this.parentSpawner.active) {
            this.parentSpawner.spawnedRunners = Math.max(0, this.parentSpawner.spawnedRunners - 1);
        }

        this.cleanupHpBar();
        this.destroy();
    }

    cleanupHpBar() {
        if (this.hpBar) { this.hpBar.destroy(); this.hpBar = null; }
    }

    destroy(fromScene) {
        this.cleanupHpBar();
        super.destroy(fromScene);
    }
}
