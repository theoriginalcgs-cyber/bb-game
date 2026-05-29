export default class LevelGenerator {
    static generate(scene, groundGroup, platformGroup, roomIndex, roomStartX, floor = 1) {
        const ROOM_W   = 1440;
        const GROUND_Y = 648;
        const roomEndX = roomStartX + ROOM_W;
        const tileW    = 64;
        const difficulty = Math.floor(roomIndex / 3) + 1;
        const zone = Math.floor((floor - 1) / 10);

        const GROUND_KEYS   = ['ground',   'ground_neon',   'ground_volcanic',   'ground_void'];
        const PLATFORM_KEYS = ['platform', 'platform_neon', 'platform_volcanic', 'platform_void'];
        const groundKey = GROUND_KEYS[Math.min(zone, GROUND_KEYS.length - 1)];
        const platKey   = PLATFORM_KEYS[Math.min(zone, PLATFORM_KEYS.length - 1)];

        for (let x = roomStartX; x < roomEndX + tileW; x += tileW) {
            const t1 = groundGroup.create(x + tileW / 2, GROUND_Y + 16, groundKey);
            t1.setImmovable(true); t1.refreshBody();
            const t2 = groundGroup.create(x + tileW / 2, GROUND_Y + 48, groundKey);
            t2.setImmovable(true); t2.refreshBody();
        }

        const platforms = LevelGenerator.makePlatforms(roomStartX, roomEndX, GROUND_Y, difficulty, zone);
        platforms.forEach(({ x, y, cols }) => {
            for (let c = 0; c < cols; c++) {
                const tile = platformGroup.create(x + c * tileW + tileW / 2, y + 12, platKey);
                tile.setImmovable(true);
                tile.refreshBody();
            }
        });

        return LevelGenerator.makeEnemySpawns(roomStartX, roomEndX, GROUND_Y, platforms, difficulty, roomIndex, floor);
    }

    static makePlatforms(startX, endX, groundY, difficulty, zone = 0) {
        const platforms = [];
        const tileW    = 64;
        const MIN_H    = 80;
        const MAX_STEP = 180;
        const MIN_STEP = 75;

        // Zone-specific feel: denser/lower in early zones, sparse/high in late zones
        const zoneCfg = [
            { countMin: 3, countMax: 4 + Math.min(difficulty, 2), maxH: 310, colMin: 2, colMax: 4 }, // Industrial
            { countMin: 4, countMax: 6,                           maxH: 330, colMin: 2, colMax: 4 }, // Neon (dense)
            { countMin: 3, countMax: 5,                           maxH: 360, colMin: 2, colMax: 3 }, // Volcanic (tall)
            { countMin: 2, countMax: 4,                           maxH: 400, colMin: 2, colMax: 3 }, // Void (sparse, very high)
        ];
        const cfg      = zoneCfg[Math.min(zone, zoneCfg.length - 1)];
        const count    = Phaser.Math.Between(cfg.countMin, cfg.countMax);
        const MAX_HEIGHT = cfg.maxH;

        // Build a staircase of heights so every platform is reachable via a chain.
        // Each step ≤ MAX_STEP, so when heights are sorted the gaps are always jumpable.
        const heightsAboveGround = [];
        let current = 0;
        for (let i = 0; i < count; i++) {
            const remaining = MAX_HEIGHT - current;
            if (remaining < MIN_STEP) {
                // Ceiling reached — fill remaining zones with a mid-range height
                heightsAboveGround.push(Phaser.Math.Between(MIN_STEP, MAX_HEIGHT - MIN_STEP));
            } else {
                const step = Phaser.Math.Between(MIN_STEP, Math.min(MAX_STEP, remaining));
                current += step;
                heightsAboveGround.push(current);
            }
        }

        // Shuffle so the staircase direction is unpredictable each room
        Phaser.Utils.Array.Shuffle(heightsAboveGround);

        const usableW = endX - startX - 200;
        const zoneW   = usableW / count;

        for (let i = 0; i < heightsAboveGround.length; i++) {
            const y    = groundY - heightsAboveGround[i];
            const cols = Phaser.Math.Between(cfg.colMin, cfg.colMax);
            const platW = cols * tileW;
            const zoneX = startX + 100 + i * zoneW;
            const minX  = zoneX + 20;
            const maxX  = zoneX + zoneW - platW - 40;

            if (maxX < minX) continue;

            let x, valid;
            let attempts = 0;

            do {
                x = Phaser.Math.Between(minX, maxX);
                valid = true;
                for (const p of platforms) {
                    const aR     = x + platW;
                    const bR     = p.x + p.cols * tileW;
                    const xClose = aR + MIN_H > p.x && x < bR + MIN_H;
                    if (xClose && Math.abs(y - p.y) < 70) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            } while (!valid && attempts < 15);

            if (valid) platforms.push({ x, y, cols });
        }

        return platforms;
    }

    static makeEnemySpawns(startX, endX, groundY, platforms, difficulty, roomIndex, floor = 1) {
        const spawns = [];
        // Density increases with floor — cap raised from 12 to 18
        const count       = Math.min(4 + difficulty + Math.floor(roomIndex / 2) + Math.floor(floor / 5), 18);
        const eliteChance = Math.max(0, (floor - 10) * 0.03); // grows ~3% per floor above 10

        // Player starts at startX + 120 — keep enemies at least 300px away
        const safeMinX = startX + 420;

        for (let i = 0; i < count; i++) {
            let x, y;
            const onGround = Math.random() < 0.55 || platforms.length === 0;

            if (onGround) {
                x = Phaser.Math.Between(safeMinX, endX - 80);
                y = groundY - 38;
            } else {
                const MIN_CLEARANCE  = 130;
                // Only use platforms safely away from the player spawn
                const safePlats      = platforms.filter(p => p.x >= safeMinX - 64);
                const openPlatforms  = safePlats.filter(p =>
                    !safePlats.some(o => o !== p && o.y < p.y && p.y - o.y < MIN_CLEARANCE)
                );
                const pool = openPlatforms.length > 0 ? openPlatforms : (safePlats.length > 0 ? safePlats : null);
                if (!pool) {
                    x = Phaser.Math.Between(safeMinX, endX - 80);
                    y = groundY - 38;
                } else {
                    const p = pool[Phaser.Math.Between(0, pool.length - 1)];
                    x = Phaser.Math.Between(p.x + 24, p.x + p.cols * 64 - 24);
                    y = p.y - 32;
                }
            }

            const type    = LevelGenerator.pickEnemyType(roomIndex, difficulty, floor);
            const isElite = floor >= 10 && Math.random() < eliteChance;
            spawns.push({ x, y, type, isElite });
        }

        return spawns;
    }

    static generateBossRoom(scene, groundGroup, platformGroup, roomIndex, startX, bossType) {
        const ROOM_W   = 1440;
        const GROUND_Y = 648;
        const roomEndX = startX + ROOM_W;
        const tileW    = 64;

        const groundKey = bossType === 'viper' ? 'ground_viper' : 'ground';
        for (let x = startX; x < roomEndX + tileW; x += tileW) {
            const t1 = groundGroup.create(x + tileW / 2, GROUND_Y + 16, groundKey);
            t1.setImmovable(true); t1.refreshBody();
            const t2 = groundGroup.create(x + tileW / 2, GROUND_Y + 48, groundKey);
            t2.setImmovable(true); t2.refreshBody();
        }

        const P = (x, y, cols) => {
            for (let c = 0; c < cols; c++) {
                const tile = platformGroup.create(x + c * tileW + tileW / 2, y + 12, 'platform');
                tile.setImmovable(true);
                tile.refreshBody();
            }
        };
        const cx = startX + ROOM_W / 2;

        switch (bossType) {
            case 'viper':
                // Open arena — toxic pool gameplay
                break;
            default:
            case 'blaze':
                P(startX + 100,          GROUND_Y - 160, 3);
                P(startX + ROOM_W - 292, GROUND_Y - 160, 3);
                P(cx - 96,               GROUND_Y - 290, 4);
                P(cx - 64,               GROUND_Y - 430, 2);
                break;
            case 'phantom':
                P(startX + 100,          GROUND_Y - 170, 3);
                P(startX + 300,          GROUND_Y - 300, 3);
                P(startX + 500,          GROUND_Y - 190, 3);
                P(cx - 64,               GROUND_Y - 370, 3);
                P(cx + 128,              GROUND_Y - 250, 3);
                P(startX + ROOM_W - 484, GROUND_Y - 300, 3);
                break;
            case 'titan':
                P(startX + 100,          GROUND_Y - 200, 2);
                P(startX + 100,          GROUND_Y - 360, 2);
                P(startX + 100,          GROUND_Y - 490, 2);
                P(startX + ROOM_W - 228, GROUND_Y - 200, 2);
                P(startX + ROOM_W - 228, GROUND_Y - 360, 2);
                P(startX + ROOM_W - 228, GROUND_Y - 490, 2);
                break;
            case 'storm':
                P(startX + 120,          GROUND_Y - 160, 2);
                P(startX + 300,          GROUND_Y - 310, 2);
                P(startX + 480,          GROUND_Y - 460, 2);
                P(cx - 64,               GROUND_Y - 260, 3);
                P(cx + 96,               GROUND_Y - 430, 2);
                P(startX + ROOM_W - 428, GROUND_Y - 310, 2);
                P(startX + ROOM_W - 248, GROUND_Y - 160, 2);
                break;
        }

        return [];
    }

    static pickEnemyType(roomIndex, difficulty, floor = 1) {
        if (roomIndex === 0) return 'guard';
        const r = Math.random();

        // Each tier uses its own probability table so thresholds don't collide
        if (floor >= 30) {
            if (r < 0.12) return 'vampire';
            if (r < 0.22) return 'juggernaut';
            if (r < 0.36) return 'berserker';
            if (r < 0.44) return 'spawner';
            if (r < 0.58) return 'shielded';
            if (r < 0.72) return 'sniper';
            if (r < 0.86) return 'runner';
            return 'guard';
        }
        if (floor >= 20) {
            if (r < 0.14) return 'juggernaut';
            if (r < 0.30) return 'berserker';
            if (r < 0.40) return 'spawner';
            if (r < 0.54) return 'shielded';
            if (r < 0.68) return 'sniper';
            if (r < 0.82) return 'runner';
            return 'guard';
        }
        if (floor >= 10) {
            if (r < 0.20) return 'berserker';
            if (r < 0.32) return 'shielded';
            if (r < 0.40) return 'spawner';
            if (r < 0.56) return 'sniper';
            if (r < 0.76) return 'runner';
            return 'guard';
        }

        // Original logic for floors 1-9
        if (floor >= 8) {
            if (r < 0.18) return 'shielded';
        }
        if (difficulty === 1) return r < 0.75 ? 'guard' : 'runner';
        if (difficulty === 2) return r < 0.4  ? 'guard' : r < 0.7 ? 'runner' : 'sniper';
        return r < 0.33 ? 'guard' : r < 0.66 ? 'runner' : 'sniper';
    }
}
