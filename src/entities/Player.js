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
            phoenix: { maxHp: 100, speed: 290, jump: -620, damage: 38, abilityCd: 5000 },
            sage:    { maxHp: 150, speed: 255, jump: -600, damage: 20, abilityCd: 8000 },
            reyna:   { maxHp: 100, speed: 310, jump: -640, damage: 28, abilityCd: 6000 },
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

        if (jumpDown) {
            if (onGround) {
                this.setVelocityY(this.jumpForce);
                this.doubleJumped = false;
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
    }

    shoot(bullets, targetX, targetY) {
        if (this.attackCd > 0) return;
        this.attackCd = this.attackCdMax;

        let dmg = this.damage + this.damageBonus;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            dmg *= 2;
            this.floatText('CRIT!', '#ffff44');
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

        this._spawnBullet(bullets, spawnX, spawnY, vx, vy, angle, dmg);

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
        const bullet = bullets.create(x, y, 'bullet');
        if (!bullet) return;
        bullet.setVelocity(vx, vy);
        bullet.setGravityY(-900);
        bullet.setRotation(angle);
        bullet.damage = dmg;
        bullet.isLifeSteal = this.lifeSteal;
        this.scene.time.delayedCall(1400, () => {
            if (bullet && bullet.active) bullet.destroy();
        });
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
    }

    fireballAbility() {
        const dir = this.flipX ? -1 : 1;
        this.scene.events.emit('spawnFireball', this.x + dir * 20, this.y - 10, dir);
    }

    healAbility() {
        const amount = 30;
        this.hp = Math.min(this.hp + amount, this.maxHp);
        this.scene.events.emit('hpChanged', this.hp);
        this.floatText(`+${amount} HP`, '#66bb6a');
    }

    devourAbility() {
        this.lifeSteal = true;
        this.lifeStealTimer = 5000;
        this.setTint(0xce93d8);
        this.scene.time.delayedCall(5000, () => { if (this.active) this.clearTint(); });
        this.floatText('DEVOUR!', '#ce93d8');
    }

    takeDamage(amount) {
        if (this.invincible) return;
        const reduced = Math.max(1, Math.round(amount * this.damageReduction));
        this.hp -= reduced;
        this.scene.events.emit('hpChanged', this.hp);

        this.invincible = true;
        this.setTint(0xff4444);
        this.scene.time.delayedCall(140, () => { if (this.active) this.clearTint(); });
        this.scene.time.delayedCall(550, () => { this.invincible = false; });

        if (this.hp <= 0) {
            this.hp = 0;
            this.scene.events.emit('playerDied');
        }
    }

    applyPoison(duration = 2500) {
        this.poisoned     = true;
        this.poisonTimer  = Math.max(this.poisonTimer, duration);
        this.poisonTickCd = Math.min(this.poisonTickCd, 300);
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
            case 'atk_speed': this.attackCdMax = Math.max(80, this.attackCdMax - 60); break;
            case 'crit':      this.critChance = Math.min(0.8, this.critChance + 0.25); break;
            case 'multishot': this.multishotLevel++; break;
            case 'armor':     this.damageReduction *= 0.85; break;
            case 'ability_cd':this.abilityCdMax = Math.max(500, Math.round(this.abilityCdMax * 0.85)); break;
            case 'lifedrain': this.lifedrain += 6; break;
            case 'hp_regen':  this.regenActive = true; break;
        }
    }

    abilityReadyPercent() {
        return 1 - (this.abilityCd / this.abilityCdMax);
    }
}
