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
        };

        const s = stats[type] || stats.guard;

        // Floor scaling: 7% HP/dmg per floor, 3% speed, capped
        const floorScale = Math.min(3,   1 + Math.max(0, floor - 1) * 0.07);
        const speedScale = Math.min(1.8, 1 + Math.max(0, floor - 1) * 0.03);

        this.maxHp       = Math.round(s.hp     * floorScale);
        this.hp          = this.maxHp;
        this.moveSpeed   = Math.round(s.speed  * speedScale);
        this.damage      = Math.round(s.damage * floorScale);
        this.attackRange = s.range;
        this.attackCdMax = s.attackCd;
        this.attackCd    = Phaser.Math.Between(0, Math.min(s.attackCd, 1500));
        this.slowed      = false;
        this.slowTimer   = 0;
        this.jumpCd      = 0;

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
            this.setScale(1.35);
            if (!isElite) this.setTint(0xff4400);
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
            case 'miniboss':
            case 'juggernaut':
                if (dist > this.attackRange + 10) {
                    const dir = player.x > this.x ? 1 : -1;
                    this.setVelocityX(dir * this.moveSpeed * speedMult);

                    if (this.body.blocked.down && this.jumpCd <= 0 && this.enemyType !== 'juggernaut') {
                        const playerAbove  = player.y < this.y - 100;
                        const blockedHoriz = (dir > 0 && this.body.blocked.right) || (dir < 0 && this.body.blocked.left);
                        if (playerAbove || blockedHoriz) {
                            this.setVelocityY(-720);
                            this.jumpCd = Phaser.Math.Between(1600, 2800);
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
                            this.setVelocityY(-720);
                            this.jumpCd = Phaser.Math.Between(1600, 2800);
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
        else if (this.enemyType === 'miniboss')   this.setTint(0xff4400);
        else if (this.enemyType === 'berserker')  this.setTint(0xff4400);
        else if (this.enemyType === 'juggernaut') this.setTint(0x888888);
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
