export default class LevelGenerator {
    static generate(scene, groundGroup, platformGroup, roomIndex, roomStartX, floor = 1) {
        const ROOM_W  = 1800;
        const GROUND_Y = 648;
        const roomEndX = roomStartX + ROOM_W;
        const tileW    = 64;
        const difficulty = Math.floor(roomIndex / 3) + 1;

        for (let x = roomStartX; x < roomEndX + tileW; x += tileW) {
            const t1 = groundGroup.create(x + tileW / 2, GROUND_Y + 16, 'ground');
            t1.setImmovable(true); t1.refreshBody();
            const t2 = groundGroup.create(x + tileW / 2, GROUND_Y + 48, 'ground');
            t2.setImmovable(true); t2.refreshBody();
        }

        const platforms = LevelGenerator.makePlatforms(roomStartX, roomEndX, GROUND_Y, difficulty);
        platforms.forEach(({ x, y, cols }) => {
            for (let c = 0; c < cols; c++) {
                const tile = platformGroup.create(x + c * tileW + tileW / 2, y + 12, 'platform');
                tile.setImmovable(true);
                tile.refreshBody();
            }
        });

        return LevelGenerator.makeEnemySpawns(roomStartX, roomEndX, GROUND_Y, platforms, difficulty, roomIndex, floor);
    }

    static makePlatforms(startX, endX, groundY, difficulty) {
        const platforms = [];
        const tileW    = 64;
        const count    = Phaser.Math.Between(3, 4 + Math.min(difficulty, 2));
        const MIN_H    = 80;   // horizontal buffer for proximity check
        const MAX_STEP = 180;  // max vertical gap jumpable by every agent
        const MIN_STEP = 75;   // min height to be a useful platform
        const MAX_HEIGHT = 320; // absolute ceiling above ground

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
            const cols = Phaser.Math.Between(2, 4);
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

        for (let i = 0; i < count; i++) {
            let x, y;
            const onGround = Math.random() < 0.55 || platforms.length === 0;

            if (onGround) {
                x = Phaser.Math.Between(startX + 180, endX - 80);
                y = groundY - 38;
            } else {
                const MIN_CLEARANCE  = 130;
                const openPlatforms  = platforms.filter(p =>
                    !platforms.some(o => o !== p && o.y < p.y && p.y - o.y < MIN_CLEARANCE)
                );
                const pool = openPlatforms.length > 0 ? openPlatforms : null;
                if (!pool) {
                    x = Phaser.Math.Between(startX + 180, endX - 80);
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
        const ROOM_W   = 1800;
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
                // No platforms — open arena for toxic pool gameplay
                break;
            default:
            case 'blaze':
                P(startX + 160,          GROUND_Y - 160, 3);
                P(startX + ROOM_W - 352, GROUND_Y - 160, 3);
                P(cx - 160,              GROUND_Y - 280, 5);
                P(cx - 64,               GROUND_Y - 420, 2);
                break;
            case 'phantom':
                P(startX + 120,          GROUND_Y - 170, 3);
                P(startX + 400,          GROUND_Y - 300, 3);
                P(startX + 680,          GROUND_Y - 200, 3);
                P(cx - 96,               GROUND_Y - 370, 3);
                P(cx + 200,              GROUND_Y - 250, 3);
                P(startX + ROOM_W - 560, GROUND_Y - 170, 3);
                P(startX + ROOM_W - 280, GROUND_Y - 310, 3);
                break;
            case 'titan':
                P(startX + 160,          GROUND_Y - 200, 2);
                P(startX + 160,          GROUND_Y - 360, 2);
                P(startX + 160,          GROUND_Y - 490, 2);
                P(startX + ROOM_W - 288, GROUND_Y - 200, 2);
                P(startX + ROOM_W - 288, GROUND_Y - 360, 2);
                P(startX + ROOM_W - 288, GROUND_Y - 490, 2);
                break;
            case 'storm':
                P(startX + 180,          GROUND_Y - 160, 2);
                P(startX + 420,          GROUND_Y - 310, 2);
                P(startX + 660,          GROUND_Y - 460, 2);
                P(cx - 64,               GROUND_Y - 260, 3);
                P(cx + 120,              GROUND_Y - 430, 2);
                P(startX + ROOM_W - 540, GROUND_Y - 310, 2);
                P(startX + ROOM_W - 300, GROUND_Y - 160, 2);
                P(startX + ROOM_W - 420, GROUND_Y - 480, 2);
                break;
        }

        return [];
    }

    static pickEnemyType(roomIndex, difficulty, floor = 1) {
        if (roomIndex === 0) return 'guard';
        const r = Math.random();

        // New types unlock at higher floors
        if (floor >= 12 && difficulty >= 3) {
            if (r < 0.07) return 'spawner';
            if (r < 0.22) return 'shielded';
        } else if (floor >= 8) {
            if (r < 0.18) return 'shielded';
        }

        if (difficulty === 1) return r < 0.75 ? 'guard' : 'runner';
        if (difficulty === 2) return r < 0.4  ? 'guard' : r < 0.7 ? 'runner' : 'sniper';
        return r < 0.33 ? 'guard' : r < 0.66 ? 'runner' : 'sniper';
    }
}
