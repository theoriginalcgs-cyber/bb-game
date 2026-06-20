export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, agentKey) {
        super(scene, x, y, `agent_${agentKey}`);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.agentKey = agentKey;
        this.setCollideWorldBounds(true);
        this.body.setSize(30, 58);
        this.body.setOffset(9, 10);

        const stats = {
            jett:    { maxHp: 100, speed: 340, jump: -660, damage: 20, abilityCd: 4000 },
            phoenix: { maxHp: 100, speed: 290, jump: -620, damage: 28, abilityCd: 5000 },
            sage:    { maxHp: 160, speed: 268, jump: -610, damage: 28, abilityCd: 6500 },
            reyna:   { maxHp: 100, speed: 310, jump: -640, damage: 26, abilityCd: 6000 },
        };

        const s = stats[agentKey];
        this.maxHp = s.maxHp;
        this.hp = s.maxHp;
        this.speed = s.speed;
        this.jumpForce = s.jump;
        this.damage = s.damage;
        this.abilityCdMax = s.abilityCd;
        this.abilityCd = 0;
        this.attackCdMax = 320;
        this.attackCd = 0;

        // Jett double jump
        this.canDoubleJump = agentKey === 'jett';
        this.doubleJumped = false;
        this.jumpLocked   = false;
        this.dashTimer = 0;

        // Reyna life steal
        this.lifeSteal = false;
        this.lifeStealTimer = 0;

        this.invincible = false;
        this.cursors = null;
        this.wasd = null;

        // Upgrades
        this.upgrades        = [];
        this.damageBonus     = 0;
        this.critChance      = 0;
        this.multishotLevel   = 0;
        this.multishotCounter = 0;
        this.damageReduction = 1;
        this.lifedrain       = 0;
        this.regenActive     = false;
        this.regenTimer      = 0;

        // Poison state
        this.poisoned     = false;
        this.poisonTimer  = 0;
        this.poisonTickCd = 0;

        // Powerup state
        this._powerupInvincible = false;
        this._unlimitedJumps    = false;
        this.shieldHp           = 0;
        this.maxShieldHp        = 0;
        this.abilityLevel       = 0;
        this._trapTimer         = 0;
        this._trapSpeed         = 0;

        // Shop-exclusive item flags
        this.secondWind      = false;
        this.secondWindUsed  = false;
        this.glassCannon     = false;
        this.damageTakenMult = 1.0;
        this.hasBerserker    = false;
        this.berserkActive   = false;
        this._berserkBaseCd  = 0;
        this.chaosRound      = false;
        this.goldMagnet      = false;
        this.armorPierce     = 0;
        this.temporalField   = false;
        this.deathmark         = false;
        this.deathmarkReady    = false;
        this.damageMultiplier  = 1;

        // Weapon upgrade state
        this.weaponLevel        = 0;
        this._weaponShotCounter = 0;

        // Overload upgrade state
        this.overloadLevel      = 0;
        this._overloadCounter   = 0;

        // Crit damage multiplier (default 2×, stacks via upgrade)
        this.critMultiplier     = 2.0;

        // New upgrade state
        this.explosiveLevel      = 0;
        this.executionerLevel    = 0;
        this.leechShot           = false;
        this.doubleTap           = false;
        this._doubleTapCounter   = 0;
        this.counterStrike       = false;
        this.counterStrikeActive = false;
        this.lastStandAvailable  = false;
        this.lastStandUsed       = false;
    }

    setControls(cursors, wasd) {
        this.cursors = cursors;
        this.wasd = wasd;
    }

    update(time, delta) {
        if (!this.active) return;

        const onGround = this.body.blocked.down;

        // Horizontal
        const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;

        this.dashTimer = Math.max(0, this.dashTimer - delta);

        if (this.dashTimer > 0) {
            if (left)  this.setFlipX(true);
            if (right) this.setFlipX(false);
        } else if (left) {
            this.setVelocityX(-this.speed);
            this.setFlipX(true);
        } else if (right) {
            this.setVelocityX(this.speed);
            this.setFlipX(false);
        } else {
            this.setVelocityX(0);
        }

        // Jump
        const jumpDown = Phaser.Input.Keyboard.JustDown(this.cursors.up)
            || Phaser.Input.Keyboard.JustDown(this.cursors.space)
            || Phaser.Input.Keyboard.JustDown(this.wasd.up);

        if (jumpDown && !this.jumpLocked) {
            if (onGround) {
                this.setVelocityY(this.jumpForce);
                this.doubleJumped = false;
            } else if (this._unlimitedJumps) {
                this.setVelocityY(this.jumpForce * 0.85);
            } else if (this.canDoubleJump && !this.doubleJumped) {
                this.setVelocityY(this.jumpForce * 0.78);
                this.doubleJumped = true;
            }
        }

        if (onGround) this.doubleJumped = false;

        // Poison DoT
        if (this.poisoned) {
            this.poisonTimer  -= delta;
            this.poisonTickCd -= delta;
            if (this.poisonTickCd <= 0) {
                this.poisonTickCd = 700;
                this.hp = Math.max(0, this.hp - 5);
                this.scene.events.emit('hpChanged', this.hp);
                if (!this.invincible) {
                    this.setTint(0x44ff55);
                    this.scene.time.delayedCall(130, () => { if (this.active) this.clearTint(); });
                }
                if (this.hp <= 0) this.scene.events.emit('playerDied');
            }
            if (this.poisonTimer <= 0) this.poisoned = false;
        }

        // Cooldowns
        this.attackCd = Math.max(0, this.attackCd - delta);
        this.abilityCd = Math.max(0, this.abilityCd - delta);
        this.lifeStealTimer = Math.max(0, this.lifeStealTimer - delta);
        if (this.lifeStealTimer <= 0) this.lifeSteal = false;

        // Passive HP regen
        if (this.regenActive && this.hp < this.maxHp) {
            this.regenTimer += delta;
            if (this.regenTimer >= 2000) {
                this.regenTimer = 0;
                this.hp = Math.min(this.hp + 2, this.maxHp);
                this.scene.events.emit('hpChanged', this.hp);
            }
        } else if (!this.regenActive || this.hp >= this.maxHp) {
            this.regenTimer = 0;
        }

        // Berserker: toggle fire-rate boost when HP drops below 30%
        if (this.hasBerserker) {
            const shouldBerserk = this.hp < this.maxHp * 0.3;
            if (shouldBerserk && !this.berserkActive) {
                this.berserkActive  = true;
                this._berserkBaseCd = this.attackCdMax;
                this.attackCdMax    = Math.max(80, Math.round(this.attackCdMax * 0.5));
                this.setTint(0xff4400);
                this.floatText('BERSERK!', '#ff4400');
            } else if (!shouldBerserk && this.berserkActive) {
                this.berserkActive = false;
                if (this._berserkBaseCd) this.attackCdMax = this._berserkBaseCd;
                if (!this.invincible && !this._powerupInvincible) this.clearTint();
            }
        }
    }

    shoot(bullets, targetX, targetY) {
        if (this.attackCd > 0) return;
        this.attackCd = this.attackCdMax;

        let dmg = this.damage + this.damageBonus;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            dmg = Math.round(dmg * this.critMultiplier);
            this.floatText(`CRIT ×${this.critMultiplier}!`, '#ffff44');
        }

        const originX = this.x;
        const originY = this.y - 8;

        let vx, vy, angle;
        if (targetX !== undefined && targetY !== undefined) {
            angle = Phaser.Math.Angle.Between(originX, originY, targetX, targetY);
            vx = Math.cos(angle) * 720;
            vy = Math.sin(angle) * 720;
            this.setFlipX(vx < 0);
        } else {
            const dir = this.flipX ? -1 : 1;
            vx = dir * 720;
            vy = 0;
            angle = vx < 0 ? Math.PI : 0;
        }

        const spawnX = originX + Math.cos(angle) * 28;
        const spawnY = originY + Math.sin(angle) * 28;

        // Weapon upgrade: Jett Twin Blades — fire 2 bullets per shot at level 2
        if (this.agentKey === 'jett' && this.weaponLevel >= 2) {
            const spread2 = 0.1;
            this._spawnBullet(bullets, spawnX, spawnY,
                Math.cos(angle + spread2) * 720, Math.sin(angle + spread2) * 720, angle + spread2, dmg);
            this._spawnBullet(bullets, spawnX, spawnY,
                Math.cos(angle - spread2) * 720, Math.sin(angle - spread2) * 720, angle - spread2, dmg);
        } else {
            this._spawnBullet(bullets, spawnX, spawnY, vx, vy, angle, dmg);
        }

        if (this.multishotLevel > 0) {
            const mod = this.multishotLevel === 1 ? 4 : this.multishotLevel === 2 ? 2 : 1;
            this.multishotCounter = (this.multishotCounter + 1) % mod;
            if (this.multishotCounter === 0) {
                const spread = 0.2;
                this._spawnBullet(bullets, spawnX, spawnY,
                    Math.cos(angle + spread) * 720, Math.sin(angle + spread) * 720, angle + spread, dmg);
                this._spawnBullet(bullets, spawnX, spawnY,
                    Math.cos(angle - spread) * 720, Math.sin(angle - spread) * 720, angle - spread, dmg);
            }
        }
    }

    _spawnBullet(bullets, x, y, vx, vy, angle, dmg) {
        this._weaponShotCounter++;
        this._overloadCounter++;

        let finalDmg = dmg;

        // OVERLOAD upgrade: every N-th bullet deals 3x damage
        if (this.overloadLevel > 0) {
            const triggerEvery = this.overloadLevel === 1 ? 8 : this.overloadLevel === 2 ? 6 : 4;
            if (this._overloadCounter % triggerEvery === 0) {
                finalDmg = dmg * 3;
            }
        }

        // Reyna Tier-2: during Devour, +40% damage
        if (this.agentKey === 'reyna' && this.weaponLevel >= 2 && this.lifeSteal) {
            finalDmg = Math.round(dmg * 1.4);
        }

        // Run modifier damage multiplier (glass cannon / punching bags)
        if (this.damageMultiplier && this.damageMultiplier !== 1) {
            finalDmg = Math.round(finalDmg * this.damageMultiplier);
        }

        // Berserker: +25% damage below 30% HP
        if (this.hasBerserker && this.berserkActive) {
            finalDmg = Math.round(finalDmg * 1.25);
        }

        // Counter Strike: +60% damage for 3s after taking a hit
        if (this.counterStrikeActive) {
            finalDmg = Math.round(finalDmg * 1.6);
        }

        const bullet = bullets.create(x, y, 'bullet');
        if (!bullet) return;
        bullet.setVelocity(vx, vy);
        bullet.setGravityY(-900);
        bullet.setRotation(angle);
        bullet.damage    = finalDmg;
        bullet.origVx    = vx;
        bullet.origVy    = vy;
        bullet.isLifeSteal = this.lifeSteal;

        // Pierce upgrade: bullets pass through enemies
        if (this.upgrades.includes('pierce')) bullet.piercing = true;

        // Leech Shot: heal on every bullet hit
        if (this.leechShot) bullet.isLeechShot = true;

        // Apply weapon flags
        if (this.agentKey === 'jett' && this.weaponLevel >= 1 && this._weaponShotCounter % 5 === 0) {
            bullet.piercing = true;
            bullet.setTint(0x4fc3f7);
        }
        if (this.agentKey === 'sage'   && this.weaponLevel >= 1) bullet.isCryo      = true;
        if (this.agentKey === 'sage'   && this.weaponLevel >= 2 && this._weaponShotCounter % 6 === 0) {
            this.shieldHp = Math.min(this.shieldHp + 1, 8);
            this.scene.events.emit('shieldChanged', this.shieldHp);
            this.floatText('+1 SHIELD', '#66bbff');
        }
        if (this.agentKey === 'reyna'  && this.weaponLevel >= 1) bullet.isDrain      = true;
        if (this.agentKey === 'phoenix'&& this.weaponLevel >= 1) bullet.isHotRound   = true;

        this.scene.time.delayedCall(1400, () => {
            if (bullet && bullet.active) bullet.destroy();
        });

        // Double Tap: every 5th shot fires an instant second bullet at a slight angle
        if (this.doubleTap) {
            this._doubleTapCounter = (this._doubleTapCounter + 1) % 5;
            if (this._doubleTapCounter === 0) {
                const spread = 0.15;
                const a2 = angle + spread;
                const b2 = bullets.create(x, y, 'bullet');
                if (b2) {
                    b2.setVelocity(Math.cos(a2) * 720, Math.sin(a2) * 720);
                    b2.setGravityY(-900);
                    b2.setRotation(a2);
                    b2.damage  = finalDmg;
                    b2.origVx  = Math.cos(a2) * 720;
                    b2.origVy  = Math.sin(a2) * 720;
                    if (this.upgrades.includes('pierce')) b2.piercing    = true;
                    if (this.leechShot)                   b2.isLeechShot = true;
                    this.scene.time.delayedCall(1400, () => { if (b2?.active) b2.destroy(); });
                }
            }
        }
    }

    applyWeaponUpgrade(upgradeId) {
        this.weaponLevel++;
        this.floatText(`WEAPON TIER ${this.weaponLevel}!`, '#ff9800');
    }

    useAbility() {
        if (this.abilityCd > 0) return false;
        this.abilityCd = this.abilityCdMax;

        switch (this.agentKey) {
            case 'jett':    this.dashAbility(); break;
            case 'phoenix': this.fireballAbility(); break;
            case 'sage':    this.healAbility(); break;
            case 'reyna':   this.devourAbility(); break;
        }
        return true;
    }

    dashAbility() {
        const dir = this.flipX ? -1 : 1;
        this.dashTimer = 280;
        this.setVelocityX(dir * 950);
        this.setVelocityY(-180);
        this.setTint(0x4fc3f7);
        this.scene.time.delayedCall(280, () => { if (this.active) this.clearTint(); });

        if (this.abilityLevel >= 1) {
            this.invincible = true;
            this.scene.events.emit('dashDamage', dir);
            this.scene.time.delayedCall(300, () => { if (this.active) this.invincible = false; });
        }
    }

    fireballAbility() {
        const dir = this.flipX ? -1 : 1;
        this.scene.events.emit('spawnFireball', this.x + dir * 20, this.y - 10, dir, this.abilityLevel);
    }

    healAbility() {
        const amount = 30;
        this.hp = Math.min(this.hp + amount, this.maxHp);
        this.scene.events.emit('hpChanged', this.hp);
        this.floatText(`+${amount} HP`, '#66bb6a');

        if (this.abilityLevel >= 1) {
            const dir = this.flipX ? -1 : 1;
            this.scene.events.emit('spawnIceOrb', this.x + dir * 20, this.y - 10, dir);
        }
        if (this.abilityLevel >= 2) {
            this.shieldHp = Math.min(this.shieldHp + 2, 8);
            this.floatText('ICE SHIELD!', '#66bbff');
        }
    }

    devourAbility() {
        this.lifeSteal = true;
        this.lifeStealTimer = 5000;
        this.setTint(0xce93d8);
        this.scene.time.delayedCall(5000, () => { if (this.active) this.clearTint(); });
        this.floatText('DEVOUR!', '#ce93d8');

        if (this.abilityLevel >= 1) {
            const prev = this.attackCdMax;
            this.attackCdMax = Math.max(60, Math.round(this.attackCdMax * 0.5));
            this.scene.time.delayedCall(5000, () => { if (this.active) this.attackCdMax = prev; });
        }
        if (this.abilityLevel >= 2) {
            this.speed += 60;
            this._powerupInvincible = true;
            this.scene.time.delayedCall(1500, () => {
                if (this.active) {
                    this._powerupInvincible = false;
                    this.speed = Math.max(0, this.speed - 60);
                }
            });
        }
    }

    takeDamage(amount) {
        if (this.scene.registry.get('debugGodMode')) return;
        if (this.invincible || this._powerupInvincible) return;

        if (this.shieldHp > 0) {
            this.shieldHp--;
            this.scene.events.emit('shieldChanged', this.shieldHp);
            this.floatText('SHIELD!', '#4488ff');
            this.setTint(0x4488ff);
            this.scene.time.delayedCall(200, () => { if (this.active && !this._powerupInvincible) this.clearTint(); });
            return;
        }

        const reduced = Math.max(1, Math.round(amount * this.damageReduction * this.damageTakenMult));
        this.hp -= reduced;
        this.scene.events.emit('hpChanged', this.hp);

        this.invincible = true;
        this.setTint(0xff4444);
        this.scene.time.delayedCall(140, () => { if (this.active && !this._powerupInvincible) this.clearTint(); });
        this.scene.time.delayedCall(550, () => { this.invincible = false; });

        // Counter Strike: activate damage boost on any hit
        if (this.counterStrike) {
            this.counterStrikeActive = true;
            this.scene.time.delayedCall(3000, () => { if (this.active) this.counterStrikeActive = false; });
        }

        if (this.hp <= 0) {
            // Last Stand: survive lethal hit once per floor with brief invincibility
            if (this.lastStandAvailable && !this.lastStandUsed) {
                this.hp = Math.max(1, Math.round(this.maxHp * 0.15));
                this.lastStandUsed = true;
                this.scene.events.emit('hpChanged', this.hp);
                this.floatText('LAST STAND!', '#ffd700');
                this.setTint(0xffd700);
                this.invincible = true;
                this._powerupInvincible = true;
                this.scene.time.delayedCall(2000, () => {
                    if (this.active) {
                        this.invincible = false;
                        this._powerupInvincible = false;
                        this.clearTint();
                    }
                });
                return;
            }
            if (this.secondWind && !this.secondWindUsed) {
                this.hp = 1;
                this.secondWindUsed = true;
                this.scene.events.emit('hpChanged', this.hp);
                this.floatText('SECOND WIND!', '#00ff88');
                this.setTint(0x00ff88);
                this.scene.time.delayedCall(400, () => { if (this.active) this.clearTint(); });
                return;
            }
            this.hp = 0;
            this.scene.events.emit('playerDied');
        }
    }

    applyPoison(duration = 2500) {
        this.poisoned     = true;
        this.poisonTimer  = Math.max(this.poisonTimer, duration);
        this.poisonTickCd = Math.min(this.poisonTickCd, 300);
    }

    applyTrap(duration = 3000) {
        if (this._trapTimer > 0) return;
        this._trapTimer = duration;
        this._trapSpeed = this.speed;
        this.speed = Math.round(this.speed * 0.4);
        this.setTint(0xffe082);
        this.floatText('SLOWED!', '#ffe082');
        this.scene.time.delayedCall(duration, () => {
            if (!this.active) return;
            this.speed = this._trapSpeed;
            this._trapTimer = 0;
            if (!this._powerupInvincible) this.clearTint();
        });
    }

    gainHp(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
        this.scene.events.emit('hpChanged', this.hp);
        this.floatText(`+${amount}`, '#44ff88');
    }

    floatText(msg, color) {
        const t = this.scene.add.text(this.x, this.y - 30, msg, {
            fontSize: '20px', color, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.scene.tweens.add({
            targets: t, y: t.y - 50, alpha: 0, duration: 900,
            onComplete: () => t.destroy(),
        });
    }

    applyUpgrade(id) {
        this.upgrades.push(id);
        switch (id) {
            case 'dmg_up':    this.damageBonus += 6; break;
            case 'speed_up':  this.speed += 30; break;
            case 'max_hp':
                this.maxHp += 25;
                this.hp = Math.min(this.hp + 15, this.maxHp);
                this.scene.events.emit('hpChanged', this.hp);
                break;
            case 'atk_speed': {
                const stacks = this.upgrades.filter(u => u === 'atk_speed').length; // includes current
                const cut = Math.round(60 * Math.pow(0.8, stacks - 1)); // 60→48→38→31…
                this.attackCdMax = Math.max(80, this.attackCdMax - cut);
                break;
            }
            case 'crit':      this.critChance = Math.min(0.8, this.critChance + 0.25); break;
            case 'multishot': this.multishotLevel++; break;
            case 'armor':     this.damageReduction *= 0.85; break;
            case 'ability_cd':this.abilityCdMax = Math.max(500, Math.round(this.abilityCdMax * 0.85)); break;
            case 'lifedrain': this.lifedrain += 6; break;
            case 'hp_regen':  this.regenActive = true; break;
            case 'shield':
                this.maxShieldHp += 2;
                this.shieldHp    += 2;
                this.scene.events.emit('shieldChanged', this.shieldHp);
                break;
            case 'ricochet':    break; // tracked via this.upgrades array
            case 'pierce':      break; // tracked via this.upgrades array
            case 'overload':
                this.overloadLevel = Math.min(3, (this.overloadLevel || 0) + 1);
                break;
            case 'explosive':
                this.explosiveLevel++;
                this.floatText('EXPLOSIVE TIP!', '#ff6600');
                break;
            case 'leech_shot':
                this.leechShot = true;
                this.floatText('LEECH SHOT!', '#ff69b4');
                break;
            case 'executioner':
                this.executionerLevel++;
                this.floatText('EXECUTIONER!', '#9c27b0');
                break;
            case 'counter':
                this.counterStrike = true;
                this.floatText('COUNTER STRIKE!', '#e91e63');
                break;
            case 'last_stand':
                this.lastStandAvailable = true;
                this.lastStandUsed = false;
                this.floatText('LAST STAND!', '#ffd700');
                break;
            case 'double_tap':
                this.doubleTap = true;
                this.floatText('DOUBLE TAP!', '#00bcd4');
                break;
            case 'crit_dmg':
                this.critMultiplier = Math.min(4.0, this.critMultiplier + 0.5);
                this.floatText(`CRIT ×${this.critMultiplier}!`, '#ffff44');
                break;
            case 'full_heal':
                this.hp = this.maxHp;
                this.scene.events.emit('hpChanged', this.hp);
                this.floatText('FULL HP!', '#00ff88');
                break;
            case 'challenge_rampage':
                this.damageBonus += 10;
                this.speed       += 20;
                this.floatText('RAMPAGE!', '#ff4444');
                break;
            case 'challenge_vitality':
                this.maxHp += 50;
                this.hp     = this.maxHp;
                this.scene.events.emit('hpChanged', this.hp);
                this.floatText('VITALITY!', '#44ff88');
                break;
            case 'challenge_blitz':
                this.attackCdMax = Math.max(80, Math.round(this.attackCdMax * 0.5));
                this.floatText('BLITZ!', '#ffcc00');
                break;

            // ── Shop-exclusive upgrades ────────────────────────────────
            case 'shop_second_wind':
                this.secondWind = true;
                this.floatText('SECOND WIND', '#00ff88');
                break;
            case 'shop_glass_cannon':
                this.glassCannon     = true;
                this.damageBonus    += 20;
                this.damageTakenMult = 1.3;
                this.floatText('GLASS CANNON', '#ff4444');
                break;
            case 'shop_berserker':
                this.hasBerserker = true;
                this.floatText('BERSERKER', '#ff6600');
                break;
            case 'shop_chaos_rounds':
                this.chaosRound = true;
                this.floatText('CHAOS ROUNDS', '#ff44ff');
                break;
            case 'shop_gold_magnet':
                this.goldMagnet = true;
                this.floatText('GOLD MAGNET', '#ffd700');
                break;
            case 'shop_armor_pierce':
                this.armorPierce = 0.6;
                this.floatText('ARMOR PIERCE', '#00ccff');
                break;
            case 'shop_temporal':
                this.temporalField = true;
                this.scene.events.emit('temporalFieldActive');
                this.floatText('TEMPORAL FIELD', '#aa88ff');
                break;
            case 'shop_deathmark':
                this.deathmark = true;
                this.floatText('DEATHMARK', '#ff0044');
                break;
        }
    }

    applyPowerup(type) {
        const DURATIONS = { powerup_firerate: 8000, powerup_invincible: 5000, powerup_jumps: 10000 };
        const dur = DURATIONS[type] || 5000;
        const startTime = Date.now();

        const pushPowerup = () => {
            const existing = (this.scene.registry.get('activePowerups') || []).filter(p => p.type !== type);
            existing.push({ type, remaining: dur, pct: 1 });
            this.scene.registry.set('activePowerups', existing);
        };

        const tickPowerup = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, dur - elapsed);
            const list = (this.scene.registry.get('activePowerups') || []);
            const idx = list.findIndex(p => p.type === type);
            if (idx >= 0) {
                list[idx].remaining = remaining;
                list[idx].pct = remaining / dur;
                this.scene.registry.set('activePowerups', [...list]);
            }
        };

        const removePowerup = () => {
            const list = (this.scene.registry.get('activePowerups') || []).filter(p => p.type !== type);
            this.scene.registry.set('activePowerups', list);
        };

        pushPowerup();
        const ticker = this.scene.time.addEvent({ delay: 200, loop: true, callback: tickPowerup });

        switch (type) {
            case 'powerup_firerate': {
                const prev = this.attackCdMax;
                this.attackCdMax = Math.max(60, Math.round(this.attackCdMax * 0.4));
                this.floatText('RAPID FIRE!', '#ffee00');
                this.scene.time.delayedCall(dur, () => {
                    if (this.active) this.attackCdMax = prev;
                    ticker.destroy(); removePowerup();
                });
                break;
            }
            case 'powerup_invincible':
                this._powerupInvincible = true;
                this.setTint(0x4488ff);
                this.floatText('INVINCIBLE!', '#4488ff');
                this.scene.time.delayedCall(dur, () => {
                    if (this.active) {
                        this._powerupInvincible = false;
                        if (!this.invincible) this.clearTint();
                    }
                    ticker.destroy(); removePowerup();
                });
                break;
            case 'powerup_jumps':
                this._unlimitedJumps = true;
                this.floatText('∞ JUMPS!', '#44ff88');
                this.scene.time.delayedCall(dur, () => {
                    if (this.active) this._unlimitedJumps = false;
                    ticker.destroy(); removePowerup();
                });
                break;
        }
    }

    abilityReadyPercent() {
        return 1 - (this.abilityCd / this.abilityCdMax);
    }
}
