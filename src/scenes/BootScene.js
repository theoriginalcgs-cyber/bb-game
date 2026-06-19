export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        this.createAgentTextures();
        this.createEnemyTextures();
        this.createBossTextures();
        this.createTileTextures();
        this.createProjectileTextures();
        this.createPickupTextures();
        this.scene.start('MenuScene');
    }

    createAgentTextures() {
        this._drawJett();
        this._drawPhoenix();
        this._drawSage();
        this._drawReyna();
    }

    // ── JETT — slim, athletic, cyan ponytail ──────────────────────
    _drawJett() {
        const g    = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xf0c8a0, hair = 0xf5f5f5, suit = 0x29b6f6;
        const acc  = 0x0288d1, dark = 0x01579b, gun  = 0x78909c;

        // Hair
        g.fillStyle(hair);
        g.fillRect(11, 0, 26, 8);    // crown
        g.fillRect(9,  4,  4, 8);    // left side
        g.fillRect(35, 2, 10, 5);    // ponytail base
        g.fillRect(37, 5,  8,14);    // ponytail drape
        // Head / face
        g.fillStyle(skin);
        g.fillRect(12, 8, 24,18);    // face
        g.fillRect(10,13,  3, 6);    // L ear
        g.fillRect(35,13,  3, 6);    // R ear
        // Eyebrows
        g.fillStyle(dark);
        g.fillRect(14,10,  7, 2);
        g.fillRect(27,10,  7, 2);
        // Eye whites
        g.fillStyle(0xffffff);
        g.fillRect(14,13,  8, 5);
        g.fillRect(26,13,  8, 5);
        // Pupils (teal)
        g.fillStyle(0x00838f);
        g.fillRect(16,14,  4, 3);
        g.fillRect(28,14,  4, 3);
        // Nose + mouth
        g.fillStyle(0xd4a574);
        g.fillRect(22,19,  4, 2);
        g.fillStyle(0xb07050);
        g.fillRect(19,22,  8, 2);
        // Neck
        g.fillStyle(skin);
        g.fillRect(20,26,  8, 4);
        // Torso
        g.fillStyle(suit);
        g.fillRect(12,29, 24,24);
        g.fillStyle(acc);
        g.fillRect(12,29, 24, 4);    // shoulder band
        // Speed streaks
        g.fillStyle(0x80d8ff);
        g.fillRect(15,34,  6, 2);
        g.fillRect(14,38,  8, 2);
        g.fillRect(15,42,  6, 2);
        // Belt
        g.fillStyle(dark);
        g.fillRect(12,49, 24, 3);
        // Arms
        g.fillStyle(suit);
        g.fillRect(4, 29,  8,20);    // L
        g.fillRect(36,29,  8,20);    // R
        g.fillStyle(skin);
        g.fillRect(4, 47,  8, 6);    // L hand
        g.fillRect(36,47,  8, 6);    // R hand
        // Pistol (right side)
        g.fillStyle(gun);
        g.fillRect(42,37,  6, 4);
        g.fillRect(44,33,  4, 8);
        // Legs
        g.fillStyle(suit);
        g.fillRect(12,52, 10,18);
        g.fillRect(26,52, 10,18);
        // Boots
        g.fillStyle(dark);
        g.fillRect(11,62, 12, 8);
        g.fillRect(25,62, 12, 8);

        g.generateTexture('agent_jett', 48, 70);
        g.destroy();
    }

    // ── PHOENIX — broader, flame hair, fire orange/red ───────────
    _drawPhoenix() {
        const g    = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0x8d5524, hair = 0x1a1a1a, suit = 0xb71c1c;
        const acc  = 0xff5722, dark = 0x7f0000, gun  = 0x78909c;

        // Flame hair — spiky, black with red highlights
        g.fillStyle(0xcc0000);        // red highlight tips
        g.fillRect(16, 0,  4, 4);
        g.fillRect(24, 0,  4, 5);
        g.fillRect(32, 0,  4, 4);
        g.fillStyle(hair);            // black base
        g.fillRect(12, 2,  6, 6);
        g.fillRect(20, 1,  8, 8);
        g.fillRect(30, 2,  6, 6);
        g.fillRect(10, 6,  4, 6);
        g.fillRect(34, 6,  4, 6);
        // Head (slightly wider)
        g.fillStyle(skin);
        g.fillRect(11, 8, 26,18);
        g.fillRect(9, 13,  3, 6);    // L ear
        g.fillRect(35,13,  3, 6);    // R ear
        // Bold eyebrows
        g.fillStyle(0x3e2723);
        g.fillRect(12,10, 10, 3);
        g.fillRect(26,10, 10, 3);
        // Eye whites
        g.fillStyle(0xffffff);
        g.fillRect(13,13,  9, 6);
        g.fillRect(26,13,  9, 6);
        // Fire orange pupils
        g.fillStyle(0xff3d00);
        g.fillRect(15,14,  5, 4);
        g.fillRect(28,14,  5, 4);
        // Eye highlights
        g.fillStyle(0xffffff);
        g.fillRect(16,14,  2, 2);
        g.fillRect(29,14,  2, 2);
        // Nose + smirk
        g.fillStyle(0xc8906a);
        g.fillRect(21,19,  6, 2);
        g.fillStyle(0xa06040);
        g.fillRect(17,22, 12, 2);
        g.fillRect(27,21,  3, 3);    // raised corner
        // Neck
        g.fillStyle(skin);
        g.fillRect(19,26, 10, 4);
        // Torso (broader)
        g.fillStyle(suit);
        g.fillRect(10,29, 28,24);
        g.fillStyle(acc);
        g.fillRect(10,29, 28, 5);    // shoulder piece
        // Flame side stripes
        g.fillStyle(0xff8f00);
        g.fillRect(14,35,  4,14);
        g.fillRect(30,35,  4,14);
        // Belt
        g.fillStyle(dark);
        g.fillRect(10,50, 28, 3);
        // Arms (wider)
        g.fillStyle(suit);
        g.fillRect(2, 29,  9,22);
        g.fillRect(37,29,  9,22);
        g.fillStyle(skin);
        g.fillRect(2, 49,  9, 6);
        g.fillRect(37,49,  9, 6);
        // Pistol
        g.fillStyle(gun);
        g.fillRect(44,38,  4, 3);
        g.fillRect(45,34,  3, 8);
        // Legs
        g.fillStyle(suit);
        g.fillRect(11,52, 12,18);
        g.fillRect(25,52, 12,18);
        // Boots
        g.fillStyle(dark);
        g.fillRect(10,62, 14, 8);
        g.fillRect(24,62, 14, 8);

        g.generateTexture('agent_phoenix', 48, 70);
        g.destroy();
    }

    // ── SAGE — elegant, dark green long hair, healing robe ───────
    _drawSage() {
        const g     = this.make.graphics({ x: 0, y: 0, add: false });
        const skin  = 0xf5deb3, hair = 0x1a1a1a, robe = 0x1565c0;
        const light = 0x64b5f6, dark = 0x0d47a1, gun  = 0x78909c;

        // Long flowing hair
        g.fillStyle(hair);
        g.fillRect(10, 2, 28, 8);    // crown
        g.fillRect(8,  6,  4,22);    // L flow
        g.fillRect(36, 6,  4,20);    // R flow
        g.fillRect(9, 26,  3,10);    // L behind shoulder
        g.fillRect(36,26,  3, 8);    // R behind shoulder
        // Head
        g.fillStyle(skin);
        g.fillRect(12, 8, 24,18);
        g.fillRect(10,13,  3, 6);    // L ear
        g.fillRect(35,13,  3, 6);    // R ear
        // Thin elegant eyebrows
        g.fillStyle(hair);
        g.fillRect(14,10,  7, 2);
        g.fillRect(27,10,  7, 2);
        // Eye whites
        g.fillStyle(0xffffff);
        g.fillRect(14,13,  8, 5);
        g.fillRect(26,13,  8, 5);
        // Jade pupils
        g.fillStyle(0x00695c);
        g.fillRect(16,14,  4, 3);
        g.fillRect(28,14,  4, 3);
        // Nose + gentle smile
        g.fillStyle(0xd4a574);
        g.fillRect(22,19,  4, 2);
        g.fillStyle(0xb07050);
        g.fillRect(19,22, 10, 2);
        g.fillRect(18,21,  2, 3);    // L smile curve
        g.fillRect(28,21,  2, 3);    // R smile curve
        // Neck
        g.fillStyle(skin);
        g.fillRect(20,26,  8, 4);
        // Robe torso
        g.fillStyle(robe);
        g.fillRect(10,29, 28,24);
        g.fillStyle(light);
        g.fillRect(10,29, 28, 4);    // collar
        g.fillRect(22,33,  4,18);    // center vertical stripe
        g.fillRect(14,41, 20, 3);    // horizontal cross
        g.fillStyle(dark);
        g.fillRect(10,50, 28, 3);
        // Arms
        g.fillStyle(robe);
        g.fillRect(4, 29,  8,22);
        g.fillRect(36,29,  8,22);
        g.fillStyle(skin);
        g.fillRect(4, 49,  8, 6);
        g.fillRect(36,49,  8, 6);
        // Healing orb (left hand)
        g.fillStyle(0x80cbc4);
        g.fillCircle(6, 48, 6);
        g.fillStyle(0xe0f7fa);
        g.fillCircle(6, 48, 3);
        // Pistol (right, subtle)
        g.fillStyle(gun);
        g.fillRect(43,38,  5, 4);
        g.fillRect(44,34,  4, 8);
        // Robe lower (legs hidden under robe)
        g.fillStyle(robe);
        g.fillRect(10,52, 12,18);
        g.fillRect(26,52, 12,18);
        g.fillRect(10,52, 28, 5);    // robe hem band
        // Shoes peeking out
        g.fillStyle(dark);
        g.fillRect(11,64, 11, 6);
        g.fillRect(26,64, 11, 6);

        g.generateTexture('agent_sage', 48, 70);
        g.destroy();
    }

    // ── REYNA — sharp bob, dark cape, intense purple ──────────────
    _drawReyna() {
        const g    = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xf0c0c0, hair = 0x4a148c, suit = 0x6a1b9a;
        const acc  = 0xce93d8, dark = 0x38006b, gun  = 0x78909c;

        // Sharp angular bob
        g.fillStyle(hair);
        g.fillRect(10, 2, 28,10);    // crown
        g.fillRect(8,  4,  4,16);    // L bob
        g.fillRect(36, 4,  4,16);    // R bob
        g.fillRect(8, 16,  6, 4);    // L angular cut
        g.fillRect(34,16,  6, 4);    // R angular cut
        // Head
        g.fillStyle(skin);
        g.fillRect(12,10, 24,16);
        g.fillRect(10,14,  3, 6);    // L ear
        g.fillRect(35,14,  3, 6);    // R ear
        // Sharp angular eyebrows
        g.fillStyle(hair);
        g.fillRect(13,12,  9, 2);
        g.fillRect(26,12,  9, 2);
        // Eye whites
        g.fillStyle(0xffffff);
        g.fillRect(13,15,  9, 6);
        g.fillRect(26,15,  9, 6);
        // Glowing purple pupils
        g.fillStyle(0xce93d8);
        g.fillRect(15,16,  5, 4);
        g.fillRect(28,16,  5, 4);
        // Eye highlights
        g.fillStyle(0xffffff);
        g.fillRect(16,16,  2, 2);
        g.fillRect(29,16,  2, 2);
        // Nose + slight smirk
        g.fillStyle(0xd4a0a0);
        g.fillRect(21,20,  4, 2);
        g.fillStyle(0xb07070);
        g.fillRect(18,23,  8, 2);
        g.fillRect(24,22,  2, 3);    // smirk corner
        // Neck
        g.fillStyle(skin);
        g.fillRect(20,26,  8, 4);
        // Cape behind body
        g.fillStyle(dark);
        g.fillRect(6, 29, 36,38);    // wide cape back
        g.fillRect(4, 33,  4,30);    // L cape edge
        g.fillRect(40,33,  4,30);    // R cape edge
        // Suit over cape
        g.fillStyle(suit);
        g.fillRect(12,29, 24,24);
        g.fillStyle(acc);
        g.fillRect(12,29, 24, 4);    // collar
        g.fillRect(18,33,  3,14);    // L chest stripe
        g.fillRect(27,33,  3,14);    // R chest stripe
        g.fillRect(20,38,  8, 2);    // cross detail
        g.fillStyle(dark);
        g.fillRect(12,50, 24, 3);    // belt
        // Arms
        g.fillStyle(suit);
        g.fillRect(5, 29,  8,22);
        g.fillRect(35,29,  8,22);
        g.fillStyle(skin);
        g.fillRect(5, 49,  8, 6);
        g.fillRect(35,49,  8, 6);
        // Pistol
        g.fillStyle(gun);
        g.fillRect(42,38,  6, 4);
        g.fillRect(44,34,  4, 8);
        // Legs (dark, cape-covered)
        g.fillStyle(dark);
        g.fillRect(12,52, 10,18);
        g.fillRect(26,52, 10,18);
        g.fillRect(11,62, 12, 8);    // L boot
        g.fillRect(25,62, 12, 8);    // R boot

        g.generateTexture('agent_reyna', 48, 70);
        g.destroy();
    }

    createEnemyTextures() {
        this._drawGuard();
        this._drawSniper();
        this._drawRunner();
        this._drawShielded();
        this._drawSpawner();
        this._drawMiniBoss();
        this._drawBerserker();
        this._drawJuggernaut();
        this._drawVampire();
        this._drawWraith();
        this._drawColossus();
    }

    // ── GUARD — armoured sentinel with sword and buckler ──────────
    _drawGuard() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const armor = 0x8b0000, armL = 0xc62828;
        const metal = 0x909090, metalL = 0xd0d0d0;
        const dark = 0x3d0000, visor = 0xff4444;

        // Helmet crest spike
        g.fillStyle(metal);
        g.fillRect(19, 0,  6,  4);
        // Helmet
        g.fillStyle(armor);
        g.fillRect(8,  2, 28, 16);
        g.fillStyle(armL);
        g.fillRect(8,  2, 28,  4);    // crown highlight
        // Visor slits
        g.fillStyle(visor);
        g.fillRect(10, 9,  8,  4);
        g.fillRect(26, 9,  8,  4);
        g.fillStyle(0xff8888);
        g.fillRect(11,10,  5,  2);
        g.fillRect(27,10,  5,  2);
        // Gorget
        g.fillStyle(dark);
        g.fillRect(16,18, 12,  5);
        // Pauldrons
        g.fillStyle(armL);
        g.fillRect(2, 20, 10, 10);
        g.fillRect(32,20, 10, 10);
        g.fillStyle(metal);
        g.fillRect(2, 20, 10,  2);
        g.fillRect(32,20, 10,  2);
        // Breastplate
        g.fillStyle(armor);
        g.fillRect(10,22, 24, 30);
        g.fillStyle(armL);
        g.fillRect(10,22, 24,  5);    // chest highlight
        g.fillStyle(metal);
        g.fillRect(20,27,  4, 20);    // centre seam
        g.fillRect(12,33,  6,  2);    // L rivet row
        g.fillRect(26,33,  6,  2);    // R rivet row
        // Belt
        g.fillStyle(dark);
        g.fillRect(10,49, 24,  4);
        g.fillStyle(metal);
        g.fillRect(18,50,  8,  2);    // buckle
        // Arms
        g.fillStyle(armor);
        g.fillRect(2, 30,  8, 20);
        g.fillRect(34,30,  8, 20);
        g.fillStyle(armL);
        g.fillRect(2, 30,  8,  3);
        g.fillRect(34,30,  8,  3);
        // Gauntlets
        g.fillStyle(metal);
        g.fillRect(2, 48,  8,  5);
        g.fillRect(34,48,  8,  5);
        // Legs + boots
        g.fillStyle(armor);
        g.fillRect(10,52, 10, 10);
        g.fillRect(24,52, 10, 10);
        g.fillStyle(dark);
        g.fillRect(9, 58, 12,  4);
        g.fillRect(23,58, 12,  4);
        // Sword (right edge of canvas)
        g.fillStyle(metal);
        g.fillRect(40,24,  4, 28);    // blade
        g.fillStyle(metalL);
        g.fillRect(41,25,  2, 26);    // shine
        g.fillStyle(0x6d4c41);
        g.fillRect(38,22,  6,  5);    // crossguard
        // Buckler (left edge)
        g.fillStyle(armL);
        g.fillRect(0, 26,  9, 14);
        g.fillStyle(metal);
        g.fillRect(2, 28,  5, 10);
        g.fillStyle(metalL);
        g.fillRect(3, 30,  3,  6);

        g.generateTexture('enemy_guard', 44, 62);
        g.destroy();
    }

    // ── SNIPER — hooded tactician with long-range rifle ───────────
    _drawSniper() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const coat = 0x3e2723, coatL = 0x6d4c41;
        const hood = 0x212121, skin = 0xf0c8a0;
        const scope = 0x00e5ff, rifle = 0x424242, rifleL = 0x9e9e9e;

        // Hood
        g.fillStyle(hood);
        g.fillRect(7,  0, 22, 14);
        g.fillRect(4,  4,  4,  8);    // L edge
        g.fillRect(28, 4,  4,  8);    // R edge
        // Exposed lower face
        g.fillStyle(skin);
        g.fillRect(9,  7, 18,  8);
        // Goggles
        g.fillStyle(hood);
        g.fillRect(9,  6,  7,  5);
        g.fillRect(20, 6,  7,  5);
        g.fillStyle(scope);
        g.fillRect(10, 7,  5,  3);
        g.fillRect(21, 7,  5,  3);
        g.fillStyle(0x80f0ff);
        g.fillRect(10, 7,  2,  2);
        g.fillRect(21, 7,  2,  2);
        // Collar
        g.fillStyle(hood);
        g.fillRect(13,14, 10,  4);
        // Long tactical coat
        g.fillStyle(coat);
        g.fillRect(7, 16, 22, 32);
        g.fillStyle(coatL);
        g.fillRect(7, 16, 22,  4);    // collar
        g.fillStyle(0x2d1a13);
        g.fillRect(17,20,  2, 24);    // centre seam
        // Coat sleeves
        g.fillStyle(coat);
        g.fillRect(1, 18,  7, 22);
        g.fillRect(28,18,  7, 22);
        // Gloved hands
        g.fillStyle(hood);
        g.fillRect(1, 38,  7,  6);
        g.fillRect(28,38,  7,  6);
        // Legs + boots
        g.fillStyle(coat);
        g.fillRect(8, 46,  8, 10);
        g.fillRect(20,46,  8, 10);
        g.fillStyle(hood);
        g.fillRect(7, 52, 10,  4);
        g.fillRect(19,52, 10,  4);
        // Sniper rifle (extends to right edge)
        g.fillStyle(rifle);
        g.fillRect(28,20, 22,  6);    // body
        g.fillStyle(rifleL);
        g.fillRect(28,20, 22,  2);    // top shine
        g.fillStyle(rifle);
        g.fillRect(42,16,  8,  4);    // scope mount
        g.fillStyle(scope);
        g.fillRect(42,14,  8,  6);    // scope lens
        g.fillStyle(0x80f0ff);
        g.fillRect(44,15,  4,  2);    // scope highlight
        g.fillStyle(rifle);
        g.fillRect(46,22,  4,  8);    // bipod

        g.generateTexture('enemy_sniper', 50, 56);
        g.destroy();
    }

    // ── RUNNER — feral sprinter with claws ────────────────────────
    _drawRunner() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const body = 0x880e4f, bodyL = 0xc2185b;
        const dark = 0x4a0026, skin = 0xf8bbd0;
        const claws = 0xeeeeee, eyes = 0xff1744;

        // Scraggly hair spikes
        g.fillStyle(dark);
        g.fillRect(6,  0,  4,  4);
        g.fillRect(12, 0,  4,  5);
        g.fillRect(18, 0,  4,  4);
        g.fillRect(22, 0,  4,  3);
        // Head
        g.fillStyle(skin);
        g.fillRect(4,  2, 22, 16);
        g.fillRect(3,  6,  3,  8);    // L ear
        g.fillRect(26, 6,  3,  8);    // R ear
        // Narrow menacing eyes
        g.fillStyle(eyes);
        g.fillRect(6,  7,  7,  3);
        g.fillRect(17, 7,  7,  3);
        g.fillStyle(0xff6666);
        g.fillRect(7,  7,  3,  2);
        g.fillRect(18, 7,  3,  2);
        // Snarl with fangs
        g.fillStyle(dark);
        g.fillRect(8, 13, 14,  3);
        g.fillStyle(0xffffff);
        g.fillRect(9, 14,  2,  2);    // L fang
        g.fillRect(12,13,  2,  2);
        g.fillRect(17,13,  2,  2);
        g.fillRect(20,14,  2,  2);    // R fang
        // Neck
        g.fillStyle(skin);
        g.fillRect(11,18,  8,  4);
        // Lean body
        g.fillStyle(body);
        g.fillRect(6, 20, 20, 26);
        g.fillStyle(bodyL);
        g.fillRect(6, 20, 20,  4);    // shoulder band
        // Arms (outstretched)
        g.fillStyle(body);
        g.fillRect(0, 22,  6, 22);
        g.fillRect(26,22,  6, 22);
        // Claws
        g.fillStyle(claws);
        g.fillRect(0, 42,  3,  4);
        g.fillRect(3, 44,  3,  4);
        g.fillRect(26,42,  3,  4);
        g.fillRect(29,44,  3,  4);
        // Legs + clawed feet
        g.fillStyle(body);
        g.fillRect(6, 44,  8, 10);
        g.fillRect(18,44,  8, 10);
        g.fillStyle(dark);
        g.fillRect(4, 52, 12,  2);
        g.fillRect(18,52, 12,  2);
        g.fillStyle(claws);
        g.fillRect(4, 52,  2,  3);
        g.fillRect(14,52,  2,  3);
        g.fillRect(18,52,  2,  3);
        g.fillRect(28,52,  2,  3);

        g.generateTexture('enemy_runner', 32, 54);
        g.destroy();
    }

    // ── SHIELDED — iron vanguard with tower shield ────────────────
    _drawShielded() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const armor = 0x1565c0, armL = 0x1e88e5;
        const metal = 0x90a4ae, metalL = 0xcfd8dc;
        const dark = 0x0d47a1, eyes = 0x00e5ff;

        // Full plate helmet
        g.fillStyle(armor);
        g.fillRect(9,  0, 26, 20);
        g.fillStyle(armL);
        g.fillRect(9,  0, 26,  4);    // crown
        // Visor (glowing cyan)
        g.fillStyle(dark);
        g.fillRect(11, 8, 22,  6);    // visor recess
        g.fillStyle(eyes);
        g.fillRect(12, 9,  8,  4);
        g.fillRect(24, 9,  8,  4);
        g.fillStyle(0x80f0ff);
        g.fillRect(13,10,  4,  2);
        g.fillRect(25,10,  4,  2);
        // Gorget
        g.fillStyle(dark);
        g.fillRect(15,20, 14,  4);
        // Heavy pauldrons
        g.fillStyle(armL);
        g.fillRect(0, 20, 14, 12);
        g.fillRect(30,20, 14, 12);
        g.fillStyle(metal);
        g.fillRect(0, 20, 14,  3);
        g.fillRect(30,20, 14,  3);
        // Breastplate
        g.fillStyle(armor);
        g.fillRect(10,23, 24, 28);
        g.fillStyle(armL);
        g.fillRect(10,23, 24,  5);
        g.fillStyle(metal);
        g.fillRect(20,28,  4, 18);    // centre seam
        g.fillRect(12,35,  6,  3);
        g.fillRect(26,35,  6,  3);
        // Belt
        g.fillStyle(dark);
        g.fillRect(10,48, 24,  4);
        // Arms + gauntlets
        g.fillStyle(armor);
        g.fillRect(2, 30,  8, 20);
        g.fillRect(34,30,  8, 20);
        g.fillStyle(metal);
        g.fillRect(2, 48,  8,  6);
        g.fillRect(34,48,  8,  6);
        // Legs + boots
        g.fillStyle(armor);
        g.fillRect(10,52, 10, 10);
        g.fillRect(24,52, 10, 10);
        g.fillStyle(dark);
        g.fillRect(9, 58, 12,  4);
        g.fillRect(23,58, 12,  4);
        // Tower shield (left side, prominent)
        g.fillStyle(armL);
        g.fillRect(0, 22, 10, 30);
        g.fillStyle(0x64b5f6);
        g.fillRect(2, 24,  6, 26);
        g.fillStyle(metalL);
        g.fillRect(4, 26,  2, 22);    // ridge
        g.fillStyle(metal);
        g.fillRect(0, 36, 10,  3);    // band

        g.generateTexture('enemy_shielded', 44, 62);
        g.destroy();
    }

    // ── SPAWNER — industrial hive node machine ─────────────────────
    _drawSpawner() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const base = 0x121212, body = 0x1c1c2e;
        const panel = 0x2a2a45, metal = 0x455a64;
        const beacon = 0xff1744, beaconL = 0xff6090;
        const portal = 0xb71c1c, eye = 0xff0000;

        // Base + legs
        g.fillStyle(metal);
        g.fillRect(8, 54, 48, 10);
        g.fillRect(4, 58,  8,  6);
        g.fillRect(52,58,  8,  6);
        g.fillStyle(base);
        g.fillRect(10,56, 44,  6);
        // Main body
        g.fillStyle(body);
        g.fillRect(8, 16, 48, 40);
        g.fillRect(14,10, 36, 10);
        g.fillRect(10, 6, 44,  8);
        // Panel detail lines
        g.fillStyle(panel);
        g.fillRect(10,20, 44,  4);
        g.fillRect(10,34, 44,  4);
        g.fillRect(10,46, 44,  4);
        g.fillStyle(metal);
        g.fillRect(10,16,  4, 40);    // L edge strip
        g.fillRect(50,16,  4, 40);    // R edge strip
        // Central core eye
        g.fillStyle(portal);
        g.fillRect(22,22, 20, 22);
        g.fillStyle(eye);
        g.fillCircle(32,33,  8);
        g.fillStyle(0xff6666);
        g.fillCircle(32,33,  5);
        g.fillStyle(0xff9999);
        g.fillCircle(32,33,  2);
        g.fillStyle(0xffffff);
        g.fillCircle(30,31,  1);
        // Side spawn portals
        g.fillStyle(portal);
        g.fillRect(2, 24,  8, 14);
        g.fillRect(54,24,  8, 14);
        g.fillStyle(eye);
        g.fillRect(4, 26,  4, 10);
        g.fillRect(56,26,  4, 10);
        g.fillStyle(0xff6666);
        g.fillRect(5, 28,  2,  6);
        g.fillRect(57,28,  2,  6);
        // Beacon antenna
        g.fillStyle(metal);
        g.fillRect(29, 0,  6, 10);
        g.fillStyle(beacon);
        g.fillCircle(32, 4,  5);
        g.fillStyle(beaconL);
        g.fillCircle(32, 4,  2);
        // Corner rivets
        g.fillStyle(metal);
        g.fillRect(14,18,  3,  3);
        g.fillRect(47,18,  3,  3);
        g.fillRect(14,50,  3,  3);
        g.fillRect(47,50,  3,  3);

        g.generateTexture('enemy_spawner', 64, 64);
        g.destroy();
    }

    // ── MINI-BOSS — warlord with crown, heavy plate, greatsword ──
    _drawMiniBoss() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const armor = 0x6d0000, armL = 0x9a0007;
        const metal = 0x757575, metalL = 0xbdbdbd;
        const dark = 0x2d0000, eyes = 0xff6d00;
        const crown = 0xb71c1c;

        // Crown spikes
        g.fillStyle(crown);
        g.fillRect(16, 0,  6,  8);    // centre
        g.fillRect(10, 2,  5,  6);    // L
        g.fillRect(25, 2,  5,  6);    // R
        g.fillStyle(metal);
        g.fillRect(14, 6, 18,  4);    // crown base band
        // Massive armoured head
        g.fillStyle(armor);
        g.fillRect(8,  8, 30, 20);
        g.fillStyle(armL);
        g.fillRect(8,  8, 30,  5);
        // Glowing orange eyes
        g.fillStyle(dark);
        g.fillRect(10,15, 26,  8);    // face recess
        g.fillStyle(eyes);
        g.fillRect(11,16, 10,  6);
        g.fillRect(25,16, 10,  6);
        g.fillStyle(0xffcc00);
        g.fillRect(13,17,  6,  4);
        g.fillRect(27,17,  6,  4);
        // Neck
        g.fillStyle(dark);
        g.fillRect(18,28, 10,  4);
        // Massive pauldrons
        g.fillStyle(armL);
        g.fillRect(0, 26, 14, 16);
        g.fillRect(36,26, 14, 16);
        g.fillStyle(metal);
        g.fillRect(0, 26, 14,  4);
        g.fillRect(36,26, 14,  4);
        // Heavy body
        g.fillStyle(armor);
        g.fillRect(10,30, 30, 32);
        g.fillStyle(armL);
        g.fillRect(10,30, 30,  6);
        g.fillStyle(metal);
        g.fillRect(22,36,  6, 22);    // centre plate
        g.fillRect(12,42,  8,  4);
        g.fillRect(30,42,  8,  4);
        // Belt
        g.fillStyle(dark);
        g.fillRect(10,59, 30,  5);
        g.fillStyle(metalL);
        g.fillRect(22,59,  6,  5);
        // Arms + gauntlets
        g.fillStyle(armor);
        g.fillRect(2, 38,  8, 24);
        g.fillRect(40,38,  8, 24);
        g.fillStyle(metal);
        g.fillRect(2, 58,  8,  6);
        g.fillRect(40,58,  8,  6);
        // Massive legs + boots
        g.fillStyle(armor);
        g.fillRect(10,62, 14, 10);
        g.fillRect(26,62, 14, 10);
        g.fillStyle(dark);
        g.fillRect(8, 68, 18,  4);
        g.fillRect(24,68, 18,  4);
        // Greatsword (right edge)
        g.fillStyle(metalL);
        g.fillRect(48,10,  8, 50);    // blade
        g.fillStyle(metal);
        g.fillRect(49,12,  6, 48);
        g.fillStyle(0xffe082);
        g.fillRect(44,30, 12,  8);    // crossguard
        g.fillStyle(0x8d6e63);
        g.fillRect(50,38,  4, 16);    // handle

        g.generateTexture('enemy_miniboss', 56, 72);
        g.destroy();
    }

    // ── BERSERKER — feral charger, bare arms, tribal rage ────────
    _drawBerserker() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xc84020, body = 0x6e1a00, dark = 0x3a0a00;
        const eyes = 0xff2200, hair = 0x1a0000, mark = 0xff6600;

        // Wild spiked hair
        g.fillStyle(hair);
        g.fillRect(4,  0,  4, 5);
        g.fillRect(10, 0,  4, 7);
        g.fillRect(16, 0,  4, 5);
        g.fillRect(22, 0,  4, 6);
        g.fillRect(28, 0,  4, 4);
        g.fillRect(4,  3, 28, 8);
        // Head
        g.fillStyle(skin);
        g.fillRect(6,  8, 24, 16);
        g.fillRect(4, 12,  3, 8);
        g.fillRect(29,12,  3, 8);
        // Eyes (glowing red)
        g.fillStyle(eyes);
        g.fillRect(8, 13, 8, 4);
        g.fillRect(20,13, 8, 4);
        g.fillStyle(0xff8866);
        g.fillRect(9, 14, 4, 2);
        g.fillRect(21,14, 4, 2);
        // Snarl
        g.fillStyle(dark);
        g.fillRect(9, 20, 18, 3);
        g.fillStyle(0xffffff);
        g.fillRect(10,20, 3, 2); g.fillRect(15,19, 3, 2); g.fillRect(22,20, 3, 2);
        // Neck + tribal mark
        g.fillStyle(skin);
        g.fillRect(14,24, 8, 4);
        g.fillStyle(mark);
        g.fillRect(12,26, 12, 2);
        // Muscular torso
        g.fillStyle(body);
        g.fillRect(6, 27, 24, 22);
        g.fillStyle(dark);
        g.fillRect(6, 27, 24, 4);
        // Tribal markings on chest
        g.fillStyle(mark);
        g.fillRect(8, 32, 4, 10); g.fillRect(24,32, 4, 10);
        g.fillRect(14,36, 8, 2);
        // Belt
        g.fillStyle(dark);
        g.fillRect(6, 46, 24, 4);
        // Bare arms (muscular)
        g.fillStyle(skin);
        g.fillRect(0, 27, 7, 22);
        g.fillRect(29,27, 7, 22);
        // Clawed hands
        g.fillStyle(0xdddddd);
        g.fillRect(0, 47, 3, 5); g.fillRect(4, 49, 3, 4);
        g.fillRect(29,47, 3, 5); g.fillRect(33,49, 3, 4);
        // Legs
        g.fillStyle(body);
        g.fillRect(7, 50, 9, 14);
        g.fillRect(20,50, 9, 14);
        g.fillStyle(dark);
        g.fillRect(6, 58, 11, 6); g.fillRect(19,58, 11, 6);

        g.generateTexture('enemy_berserker', 36, 64);
        g.destroy();
    }

    // ── JUGGERNAUT — iron colossus, massive plate, no neck ────────
    _drawJuggernaut() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const plate = 0x2a2a2a, plateL = 0x484848;
        const metal = 0x606060, metalL = 0x909090;
        const visor = 0xff3300, dark   = 0x111111;

        // Full enclosing helmet — no face visible
        g.fillStyle(plate);
        g.fillRect(8,  0, 40, 28);
        g.fillStyle(plateL);
        g.fillRect(8,  0, 40, 6);
        // Visor slit (single glowing line)
        g.fillStyle(dark);
        g.fillRect(10,10, 36, 10);
        g.fillStyle(visor);
        g.fillRect(12,13, 32,  4);
        g.fillStyle(0xff8866);
        g.fillRect(14,14, 28,  2);
        // Gorget
        g.fillStyle(plate);
        g.fillRect(18,28, 20,  4);
        // Enormous pauldrons
        g.fillStyle(plateL);
        g.fillRect(0, 22, 18, 18); g.fillRect(38,22, 18, 18);
        g.fillStyle(metal);
        g.fillRect(0, 22, 18,  4); g.fillRect(38,22, 18,  4);
        // Thick breastplate
        g.fillStyle(plate);
        g.fillRect(12,30, 32, 32);
        g.fillStyle(plateL);
        g.fillRect(12,30, 32,  6);
        g.fillStyle(metalL);
        g.fillRect(26,36,  4, 22);
        g.fillRect(14,42, 10,  4); g.fillRect(32,42, 10,  4);
        // Belt
        g.fillStyle(dark);
        g.fillRect(12,59, 32,  5);
        g.fillStyle(metalL);
        g.fillRect(24,59,  8,  5);
        // Thick arms
        g.fillStyle(plate);
        g.fillRect(2, 36, 12, 26);
        g.fillRect(42,36, 12, 26);
        g.fillStyle(metal);
        g.fillRect(2, 58, 12,  6); g.fillRect(42,58, 12,  6);
        // Short wide legs
        g.fillStyle(plate);
        g.fillRect(14,64, 14, 14);
        g.fillRect(28,64, 14, 14);
        g.fillStyle(dark);
        g.fillRect(12,72, 18,  6); g.fillRect(26,72, 18,  6);

        g.generateTexture('enemy_juggernaut', 56, 78);
        g.destroy();
    }

    // ── VAMPIRE — pale predator, cape, glowing red eyes ──────────
    _drawVampire() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xe8d8e8, hair = 0x1a0025, suit = 0x2d0040;
        const cape = 0x1a0033, acc  = 0x9933cc, eyes = 0xff0033;

        // Slicked-back hair
        g.fillStyle(hair);
        g.fillRect(10, 0, 24, 10);
        g.fillRect(8,  4,  4, 8); g.fillRect(32, 4,  4, 8);
        // Pale face
        g.fillStyle(skin);
        g.fillRect(12, 8, 20, 18);
        g.fillRect(10,12,  3, 7); g.fillRect(31,12,  3, 7);
        // Glowing red eyes
        g.fillStyle(eyes);
        g.fillRect(14,13, 7, 4); g.fillRect(23,13, 7, 4);
        g.fillStyle(0xff6688);
        g.fillRect(15,14, 4, 2); g.fillRect(24,14, 4, 2);
        // Aristocratic nose + fanged smirk
        g.fillStyle(0xd0c0d0);
        g.fillRect(20,19, 4, 2);
        g.fillStyle(0xb090b0);
        g.fillRect(16,22, 12, 2);
        g.fillStyle(0xffffff);
        g.fillRect(17,22, 2, 3); g.fillRect(25,22, 2, 3);
        // Neck
        g.fillStyle(skin);
        g.fillRect(18,26, 8, 4);
        // Wide cape behind body
        g.fillStyle(cape);
        g.fillRect(4, 28, 36, 40);
        g.fillRect(2, 32,  4, 34); g.fillRect(38,32,  4, 34);
        // Elegant suit
        g.fillStyle(suit);
        g.fillRect(12,29, 20, 22);
        g.fillStyle(acc);
        g.fillRect(12,29, 20,  4);
        g.fillRect(19,33,  2, 14); g.fillRect(23,33,  2, 14);
        // White shirt detail
        g.fillStyle(0xffffff);
        g.fillRect(20,34,  4, 10);
        g.fillStyle(0xdddddd);
        g.fillRect(14,37,  4,  3); g.fillRect(26,37,  4,  3);
        // Belt
        g.fillStyle(hair);
        g.fillRect(12,48, 20,  3);
        // Arms (cape-covered, elegant)
        g.fillStyle(suit);
        g.fillRect(5, 30,  8, 22); g.fillRect(31,30,  8, 22);
        g.fillStyle(skin);
        g.fillRect(5, 50,  8,  6); g.fillRect(31,50,  8,  6);
        // Legs
        g.fillStyle(cape);
        g.fillRect(12,51, 10, 18); g.fillRect(22,51, 10, 18);
        g.fillStyle(hair);
        g.fillRect(11,62, 12,  6); g.fillRect(21,62, 12,  6);

        g.generateTexture('enemy_vampire', 44, 68);
        g.destroy();
    }

    // ── WRAITH — spectral teleporter, ghostly and translucent ────
    _drawWraith() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const ghost = 0x6600aa, ghostL = 0xaa44ff, core = 0xdd88ff;

        // Wispy body
        g.fillStyle(ghostL); g.fillRect(6, 4, 28, 38);
        g.fillStyle(ghost);  g.fillRect(8, 6, 24, 34);
        // Flowing robe bottom (jagged)
        g.fillStyle(ghostL);
        g.fillRect(6, 38, 6, 14); g.fillRect(16,38, 6, 18); g.fillRect(26,38, 6, 14);
        // Eyes (glowing)
        g.fillStyle(core); g.fillRect(10,10,8,6); g.fillRect(22,10,8,6);
        g.fillStyle(0xffffff); g.fillRect(12,12,4,3); g.fillRect(24,12,4,3);
        // Arms (wispy tendrils)
        g.fillStyle(ghostL);
        g.fillRect(0,12,8,18); g.fillRect(32,12,8,18);
        g.fillStyle(ghost);
        g.fillRect(0,22,4,6); g.fillRect(36,22,4,6);

        g.generateTexture('enemy_wraith', 40, 56);
        g.destroy();
    }

    // ── COLOSSUS — massive armored ranged tank ───────────────────
    _drawColossus() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const plate = 0x455a64, plateL = 0x607d8b, dark = 0x263238;
        const visor = 0x00e5ff, cannon = 0x37474f;

        // Helmet (huge)
        g.fillStyle(plateL); g.fillRect(8, 0, 48, 28);
        g.fillStyle(plate);  g.fillRect(10, 2, 44, 24);
        // Visor slit
        g.fillStyle(visor);  g.fillRect(12, 8, 40, 10);
        g.fillStyle(0x80deea); g.fillRect(14, 10, 36, 6);
        // Bolts on helmet
        g.fillStyle(dark);
        g.fillRect(10, 2, 4, 4); g.fillRect(50, 2, 4, 4);
        g.fillRect(10,22, 4, 4); g.fillRect(50,22, 4, 4);

        // Body — massive chest plate
        g.fillStyle(plateL); g.fillRect(4, 28, 56, 46);
        g.fillStyle(plate);  g.fillRect(6, 30, 52, 42);
        // Chest details
        g.fillStyle(dark);
        g.fillRect(18, 34, 28, 4); g.fillRect(18, 44, 28, 4); g.fillRect(18, 54, 28, 4);
        // Core gem
        g.fillStyle(visor);  g.fillRect(27, 38, 10, 10);
        g.fillStyle(0x80deea); g.fillRect(29, 40, 6, 6);

        // Shoulder plates
        g.fillStyle(plateL); g.fillRect(0, 28, 8, 28); g.fillRect(56, 28, 8, 28);
        g.fillStyle(dark);   g.fillRect(0, 28, 8, 4);  g.fillRect(56, 28, 8, 4);

        // Arm cannon (right side)
        g.fillStyle(cannon); g.fillRect(56, 38, 20, 16);
        g.fillStyle(dark);   g.fillRect(72, 38, 6, 16);
        g.fillStyle(visor);  g.fillRect(74, 40, 4, 12);

        // Legs (armored, wide)
        g.fillStyle(plateL); g.fillRect(6, 74, 24, 22); g.fillRect(34, 74, 24, 22);
        g.fillStyle(plate);  g.fillRect(8, 76, 20, 18); g.fillRect(36, 76, 20, 18);
        g.fillStyle(dark);   g.fillRect(8, 82, 20, 4);  g.fillRect(36, 82, 4, 4);
        // Boots
        g.fillStyle(dark);   g.fillRect(4, 90, 28, 6);  g.fillRect(32, 90, 28, 6);

        g.generateTexture('enemy_colossus', 80, 96);
        g.destroy();
    }

    createTileTextures() {
        // Ground
        const gnd = this.make.graphics({ x: 0, y: 0, add: false });
        gnd.fillStyle(0x0d2137);
        gnd.fillRect(0, 0, 64, 32);
        gnd.fillStyle(0x1a3a5c);
        gnd.fillRect(0, 0, 64, 8);
        gnd.lineStyle(1, 0x2a5580, 0.6);
        gnd.strokeRect(0, 0, 64, 32);
        gnd.generateTexture('ground', 64, 32);
        gnd.destroy();

        // Platform
        const plt = this.make.graphics({ x: 0, y: 0, add: false });
        plt.fillStyle(0x1f3a5f);
        plt.fillRect(0, 0, 64, 24);
        plt.fillStyle(0x3d7ebf);
        plt.fillRect(0, 0, 64, 5);
        plt.lineStyle(1, 0x4a90d9, 0.8);
        plt.strokeRect(0, 0, 64, 24);
        plt.generateTexture('platform', 64, 24);
        plt.destroy();

        // Door / exit
        const door = this.make.graphics({ x: 0, y: 0, add: false });
        door.fillStyle(0x222222);
        door.fillRect(0, 0, 56, 96);
        door.fillStyle(0xff4655);
        door.fillRect(4, 4, 48, 88);
        door.fillStyle(0xffffff);
        door.fillRect(40, 44, 8, 8);  // handle
        door.lineStyle(2, 0xff7080);
        door.strokeRect(4, 4, 48, 88);
        door.generateTexture('door', 56, 96);
        door.destroy();

        // Background tile
        const bg = this.make.graphics({ x: 0, y: 0, add: false });
        bg.fillStyle(0x091520);
        bg.fillRect(0, 0, 64, 64);
        bg.lineStyle(1, 0x0e1f2e, 1);
        bg.strokeRect(0, 0, 64, 64);
        bg.generateTexture('bgtile', 64, 64);
        bg.destroy();

        // Viper boss room background tile (toxic domain)
        const vbg = this.make.graphics({ x: 0, y: 0, add: false });
        vbg.fillStyle(0x010a03);          // near-black dark green base
        vbg.fillRect(0, 0, 64, 64);
        vbg.fillStyle(0x021206);          // slightly lighter cells
        vbg.fillRect(2, 2, 28, 28);
        vbg.fillRect(34, 34, 28, 28);
        vbg.fillStyle(0x003a10);          // green vein lines
        vbg.fillRect(0, 31, 64, 2);
        vbg.fillRect(31, 0, 2, 64);
        vbg.fillStyle(0x004d16);          // glow nodes at intersections
        vbg.fillRect(13, 13, 5, 5);
        vbg.fillRect(46, 46, 5, 5);
        vbg.fillRect(13, 46, 4, 4);
        vbg.fillRect(46, 13, 4, 4);
        vbg.fillStyle(0x007722);          // bright centre dot
        vbg.fillRect(14, 14, 3, 3);
        vbg.fillRect(47, 47, 3, 3);
        vbg.generateTexture('bg_viper', 64, 64);
        vbg.destroy();

        // Viper boss room ground (toxic green sludge)
        const vgnd = this.make.graphics({ x: 0, y: 0, add: false });
        vgnd.fillStyle(0x031a09);
        vgnd.fillRect(0, 0, 64, 32);
        vgnd.fillStyle(0x062e10);         // slightly lighter mid layer
        vgnd.fillRect(0, 0, 64, 10);
        vgnd.fillStyle(0x00cc44);         // bright toxic-green top glow
        vgnd.fillRect(0, 0, 64, 3);
        vgnd.fillStyle(0x009933);         // secondary glow stripe
        vgnd.fillRect(0, 3, 64, 2);
        vgnd.fillStyle(0x003d0f);         // subtle crack lines
        vgnd.fillRect(10, 8, 2, 22);
        vgnd.fillRect(30, 6, 2, 24);
        vgnd.fillRect(50, 10, 2, 18);
        vgnd.lineStyle(1, 0x004d14, 0.7);
        vgnd.strokeRect(0, 0, 64, 32);
        vgnd.generateTexture('ground_viper', 64, 32);
        vgnd.destroy();

        // ── Zone tile variants ──────────────────────────────────────────

        // Zone 2: Neon District
        const gndN = this.make.graphics({ x: 0, y: 0, add: false });
        gndN.fillStyle(0x0d0820); gndN.fillRect(0, 0, 64, 32);
        gndN.fillStyle(0x4a1080); gndN.fillRect(0, 0, 64, 8);
        gndN.fillStyle(0xb030f0); gndN.fillRect(0, 0, 64, 3);
        gndN.fillStyle(0xdd66ff); gndN.fillRect(0, 3, 64, 1);
        gndN.lineStyle(1, 0x6a1b9a, 0.6); gndN.strokeRect(0, 0, 64, 32);
        gndN.generateTexture('ground_neon', 64, 32); gndN.destroy();

        const pltN = this.make.graphics({ x: 0, y: 0, add: false });
        pltN.fillStyle(0x1a0840); pltN.fillRect(0, 0, 64, 24);
        pltN.fillStyle(0x9c27b0); pltN.fillRect(0, 0, 64, 5);
        pltN.lineStyle(1, 0xce93d8, 0.9); pltN.strokeRect(0, 0, 64, 24);
        pltN.generateTexture('platform_neon', 64, 24); pltN.destroy();

        // Zone 3: Volcanic Depths
        const gndV = this.make.graphics({ x: 0, y: 0, add: false });
        gndV.fillStyle(0x1a0500); gndV.fillRect(0, 0, 64, 32);
        gndV.fillStyle(0x6d1500); gndV.fillRect(0, 0, 64, 8);
        gndV.fillStyle(0xff5722); gndV.fillRect(0, 0, 64, 3);
        gndV.fillStyle(0xff8c00); gndV.fillRect(0, 3, 64, 1);
        gndV.lineStyle(1, 0x4a1500, 0.6); gndV.strokeRect(0, 0, 64, 32);
        gndV.generateTexture('ground_volcanic', 64, 32); gndV.destroy();

        const pltV = this.make.graphics({ x: 0, y: 0, add: false });
        pltV.fillStyle(0x2d0a00); pltV.fillRect(0, 0, 64, 24);
        pltV.fillStyle(0xbf360c); pltV.fillRect(0, 0, 64, 5);
        pltV.lineStyle(1, 0xff7043, 0.9); pltV.strokeRect(0, 0, 64, 24);
        pltV.generateTexture('platform_volcanic', 64, 24); pltV.destroy();

        // Zone 4: The Void
        const gndVo = this.make.graphics({ x: 0, y: 0, add: false });
        gndVo.fillStyle(0x050510); gndVo.fillRect(0, 0, 64, 32);
        gndVo.fillStyle(0x1a0840); gndVo.fillRect(0, 0, 64, 8);
        gndVo.fillStyle(0x7c4dff); gndVo.fillRect(0, 0, 64, 3);
        gndVo.fillStyle(0xb388ff); gndVo.fillRect(0, 3, 64, 1);
        gndVo.lineStyle(1, 0x3d1a6e, 0.6); gndVo.strokeRect(0, 0, 64, 32);
        gndVo.generateTexture('ground_void', 64, 32); gndVo.destroy();

        const pltVo = this.make.graphics({ x: 0, y: 0, add: false });
        pltVo.fillStyle(0x0a0520); pltVo.fillRect(0, 0, 64, 24);
        pltVo.fillStyle(0x4527a0); pltVo.fillRect(0, 0, 64, 5);
        pltVo.lineStyle(1, 0x7c4dff, 1.0); pltVo.strokeRect(0, 0, 64, 24);
        pltVo.generateTexture('platform_void', 64, 24); pltVo.destroy();

        // Agent portrait card backgrounds
        const agents = [
            { key: 'card_jett',   bg: 0x0a1a26, border: 0x4fc3f7 },
            { key: 'card_phoenix', bg: 0x1e0e00, border: 0xff7043 },
            { key: 'card_sage',   bg: 0x061406, border: 0x66bb6a },
            { key: 'card_reyna',  bg: 0x150019, border: 0xce93d8 },
        ];
        agents.forEach(({ key, bg: bgColor, border }) => {
            const p = this.make.graphics({ x: 0, y: 0, add: false });
            p.fillStyle(bgColor);
            p.fillRect(0, 0, 160, 200);
            p.lineStyle(2, border);
            p.strokeRect(0, 0, 160, 200);
            p.generateTexture(key, 160, 200);
            p.destroy();
        });
    }

    createProjectileTextures() {
        // Player bullet
        const b = this.make.graphics({ x: 0, y: 0, add: false });
        b.fillStyle(0xffeb3b);
        b.fillRect(0, 3, 14, 6);
        b.fillStyle(0xffffff);
        b.fillRect(0, 5, 5, 2);
        b.generateTexture('bullet', 14, 12);
        b.destroy();

        // Fireball (Phoenix ability)
        const f = this.make.graphics({ x: 0, y: 0, add: false });
        f.fillStyle(0xff4500);
        f.fillCircle(14, 14, 14);
        f.fillStyle(0xff8c00);
        f.fillCircle(14, 14, 9);
        f.fillStyle(0xffff00);
        f.fillCircle(14, 14, 4);
        f.generateTexture('fireball', 28, 28);
        f.destroy();

        // Slow orb (Sage ability)
        const o = this.make.graphics({ x: 0, y: 0, add: false });
        o.fillStyle(0x00b0ff);
        o.fillCircle(12, 12, 12);
        o.fillStyle(0xe0f7fa);
        o.fillCircle(12, 12, 6);
        o.generateTexture('slow_orb', 24, 24);
        o.destroy();

        // Enemy bullet
        const eb = this.make.graphics({ x: 0, y: 0, add: false });
        eb.fillStyle(0xff1744);
        eb.fillCircle(7, 7, 7);
        eb.generateTexture('enemy_bullet', 14, 14);
        eb.destroy();
    }

    createBossTextures() {
        this._drawBossViper();
        this._drawBossBlaze();
        this._drawBossPhantom();
        this._drawBossTitan();
        this._drawBossStorm();
        this._drawBossKilljoy();
        this._drawBossChamber();
        this._drawBossKayo();

        // ── Boss bullets ──
        // VIPER bullet (toxic green orb)
        const bv = this.make.graphics({ x: 0, y: 0, add: false });
        bv.fillStyle(0x003300); bv.fillCircle(10,10,10);
        bv.fillStyle(0x00aa33); bv.fillCircle(10,10,6);
        bv.fillStyle(0x44ff77); bv.fillCircle(10,10,3);
        bv.fillStyle(0xccffcc); bv.fillCircle(10,10,1);
        bv.generateTexture('boss_bullet', 20, 20);
        bv.destroy();

        // BLAZE bullet (orange ember)
        const bbl = this.make.graphics({ x: 0, y: 0, add: false });
        bbl.fillStyle(0xff5722); bbl.fillCircle(11,11,11);
        bbl.fillStyle(0xffcc02); bbl.fillCircle(11,11,6);
        bbl.fillStyle(0xffffff); bbl.fillCircle(11,11,2);
        bbl.generateTexture('boss_bullet_blaze', 22, 22);
        bbl.destroy();

        // PHANTOM bullet (teal ghost orb)
        const bph = this.make.graphics({ x: 0, y: 0, add: false });
        bph.fillStyle(0x006064); bph.fillCircle(10,10,10);
        bph.fillStyle(0x00e5ff); bph.fillCircle(10,10,5);
        bph.fillStyle(0xe0f7fa); bph.fillCircle(10,10,2);
        bph.generateTexture('boss_bullet_phantom', 20, 20);
        bph.destroy();

        // TITAN bullet (boulder)
        const bti = this.make.graphics({ x: 0, y: 0, add: false });
        bti.fillStyle(0x5d4037); bti.fillCircle(14,14,14);
        bti.fillStyle(0x3e2723); bti.fillCircle(8,8,5); bti.fillCircle(20,18,4);
        bti.fillStyle(0x795548); bti.fillCircle(16,10,4);
        bti.generateTexture('boss_bullet_titan', 28, 28);
        bti.destroy();

        // STORM bullet (lightning bolt)
        const bst = this.make.graphics({ x: 0, y: 0, add: false });
        bst.fillStyle(0xfff176); bst.fillRect(0,3,8,4);
        bst.fillStyle(0x00e5ff); bst.fillRect(6,0,6,10);
        bst.fillStyle(0xfff176); bst.fillRect(10,3,8,4);
        bst.generateTexture('boss_bullet_storm', 18, 10);
        bst.destroy();

        // TITAN shockwave (ground wave)
        const sw = this.make.graphics({ x: 0, y: 0, add: false });
        sw.fillStyle(0xff8f00); sw.fillRect(0,0,52,10);
        sw.fillStyle(0xffcc02); sw.fillRect(4,2,44,6);
        sw.generateTexture('boss_shockwave', 52, 10);
        sw.destroy();

        // KILLJOY bullet (yellow nano-swarm orb)
        const bkj = this.make.graphics({ x: 0, y: 0, add: false });
        bkj.fillStyle(0x665500); bkj.fillCircle(10,10,10);
        bkj.fillStyle(0xffee00); bkj.fillCircle(10,10,6);
        bkj.fillStyle(0xffff99); bkj.fillCircle(10,10,3);
        bkj.generateTexture('boss_bullet_killjoy', 20, 20);
        bkj.destroy();

        // CHAMBER bullet (gold sniper round)
        const bch = this.make.graphics({ x: 0, y: 0, add: false });
        bch.fillStyle(0xb8860b); bch.fillRect(0,4,22,6);
        bch.fillStyle(0xffe082); bch.fillRect(4,5,14,4);
        bch.fillStyle(0xffffff); bch.fillRect(18,5,4,4);
        bch.generateTexture('boss_bullet_chamber', 22, 14);
        bch.destroy();

        // KAYO bullet (cyan energy pulse)
        const bko = this.make.graphics({ x: 0, y: 0, add: false });
        bko.fillStyle(0x004d60); bko.fillCircle(10,10,10);
        bko.fillStyle(0x00bcd4); bko.fillCircle(10,10,6);
        bko.fillStyle(0x80deea); bko.fillCircle(10,10,3);
        bko.generateTexture('boss_bullet_kayo', 20, 20);
        bko.destroy();

        // Chamber trap (teal slow-field disk)
        const ct = this.make.graphics({ x: 0, y: 0, add: false });
        ct.fillStyle(0x003344, 0.8); ct.fillEllipse(28, 10, 56, 20);
        ct.fillStyle(0x00bcd4, 0.9); ct.fillEllipse(28, 10, 42, 12);
        ct.lineStyle(2, 0xffe082, 0.95); ct.strokeEllipse(28, 10, 56, 20);
        ct.generateTexture('chamber_trap', 56, 20);
        ct.destroy();

        // Kayo knife (teal blade)
        const kk = this.make.graphics({ x: 0, y: 0, add: false });
        kk.fillStyle(0x00bcd4); kk.fillRect(2,8,20,4);
        kk.fillStyle(0x80deea); kk.fillTriangle(22,6, 30,10, 22,14);
        kk.fillStyle(0x555555); kk.fillRect(0,9,4,2);
        kk.generateTexture('kayo_knife', 32, 20);
        kk.destroy();
    }

    // ── VIPER — Valorant: long dark hair, green eyes, respirator, tactical suit ──
    _drawBossViper() {
        const g     = this.make.graphics({ x: 0, y: 0, add: false });
        const skin  = 0xe8c090;   // warm skin tone (same family as Jett)
        const skinS = 0xc89a60;   // shadow / nose
        const brow  = 0x180808;   // dark eyebrows
        const hair  = 0x08080f;   // near-black hair
        const hairH = 0x14142a;   // dark-blue sheen
        const suit  = 0x090e0e;
        const teal  = 0x0a3d2e;
        const gold  = 0xc89a08;
        const green = 0x00bb44;
        const glow  = 0x55ff88;

        // ── Long dark hair — drawn first so body layers on top ──
        g.fillStyle(hair);
        g.fillRect(24,  0, 40,  8);   // crown
        g.fillRect(14,  4, 18, 70);   // L curtain (flows past waist)
        g.fillRect(56,  4, 18, 70);   // R curtain
        g.fillRect(16, 70, 14,  8);   // L taper
        g.fillRect(58, 70, 14,  8);   // R taper
        g.fillStyle(hairH);
        g.fillRect(17,  6,  5, 64);   // L sheen stripe
        g.fillRect(66,  6,  5, 64);   // R sheen stripe
        g.fillRect(30,  0, 12,  4);   // crown shine

        // ── Human face (skin, same approach as Jett) ──
        g.fillStyle(skin);
        g.fillRect(28,  8, 32, 24);   // face
        g.fillRect(24, 13,  4, 10);   // L ear
        g.fillRect(60, 13,  4, 10);   // R ear
        g.fillStyle(skinS);
        g.fillRect(25, 16,  3,  4);   // L ear shadow
        g.fillRect(60, 16,  3,  4);   // R ear shadow

        // ── Eyebrows ──
        g.fillStyle(brow);
        g.fillRect(30, 11, 10,  2);   // L brow
        g.fillRect(48, 11, 10,  2);   // R brow

        // ── Eye whites ──
        g.fillStyle(0xffffff);
        g.fillRect(30, 14, 11,  6);   // L white
        g.fillRect(47, 14, 11,  6);   // R white

        // ── Green pupils + glow ──
        g.fillStyle(green);
        g.fillRect(32, 15,  7,  4);
        g.fillRect(49, 15,  7,  4);
        g.fillStyle(glow);
        g.fillRect(33, 15,  4,  3);
        g.fillRect(50, 15,  4,  3);
        g.fillStyle(0xffffff);        // catchlights
        g.fillRect(38, 15,  2,  2);
        g.fillRect(55, 15,  2,  2);

        // ── Nose ──
        g.fillStyle(skinS);
        g.fillRect(40, 21,  5,  2);

        // ── Black face mask covering lower half only ──
        g.fillStyle(0x0c0c0c);
        g.fillRect(26, 23, 36,  9);
        g.fillStyle(gold);
        g.fillRect(26, 23, 36,  2);   // gold top edge
        g.fillRect(36, 25, 16,  3);   // centre filter
        g.fillStyle(0x2a2a2a);
        g.fillRect(27, 26,  8,  5);   // L vent
        g.fillRect(53, 26,  8,  5);   // R vent
        g.fillStyle(0x484848);
        g.fillRect(28, 27,  6,  3);
        g.fillRect(54, 27,  6,  3);

        // ── Neck (skin visible above collar) ──
        g.fillStyle(skin);
        g.fillRect(38, 32, 12,  3);
        g.fillStyle(green);
        g.fillRect(36, 34, 16,  1);

        // ── Torso ──
        g.fillStyle(suit);
        g.fillRect(22, 35, 44, 27);
        g.fillStyle(gold);
        g.fillRect(22, 35, 44,  3);
        g.fillRect(22, 35,  4, 27);
        g.fillRect(62, 35,  4, 27);
        g.fillStyle(teal);
        g.fillRect(26, 38, 10, 21);
        g.fillRect(52, 38, 10, 21);
        g.fillStyle(green);
        g.fillRect(38, 39, 12,  2);
        g.fillRect(42, 41,  4, 15);
        g.fillStyle(glow);
        g.fillRect(39, 44, 10,  7);
        g.fillStyle(gold);
        g.fillRect(26, 59, 36,  3);

        // ── Arms ──
        g.fillStyle(suit);
        g.fillRect(8,  35, 14, 27);
        g.fillRect(66, 35, 14, 27);
        g.fillStyle(teal);
        g.fillRect(8,  44, 14,  3);
        g.fillRect(66, 44, 14,  3);
        g.fillStyle(0x182420);
        g.fillRect(8,  59, 14,  6);
        g.fillRect(66, 59, 14,  6);

        // ── Chemical canister (R hand) ──
        g.fillStyle(0x2a2a2a);
        g.fillRect(68, 46, 10, 16);
        g.fillStyle(green);
        g.fillRect(69, 48,  8, 12);
        g.fillStyle(0x3a3a3a);
        g.fillRect(68, 43, 10,  5);
        g.fillStyle(glow);
        g.fillRect(70, 44,  6,  2);
        g.fillStyle(gold);
        g.fillRect(68, 60, 10,  2);

        // ── Legs ──
        g.fillStyle(suit);
        g.fillRect(26, 62, 14, 22);
        g.fillRect(48, 62, 14, 22);
        g.fillStyle(teal);
        g.fillRect(26, 70,  8,  4);
        g.fillRect(54, 70,  8,  4);

        // ── Boots ──
        g.fillStyle(0x060606);
        g.fillRect(24, 80, 16, 16);
        g.fillRect(48, 80, 16, 16);
        g.fillStyle(gold);
        g.fillRect(24, 80, 16,  2);
        g.fillRect(48, 80, 16,  2);
        g.fillStyle(teal);
        g.fillRect(26, 84,  6,  4);
        g.fillRect(56, 84,  6,  4);

        g.generateTexture('boss_viper', 88, 96);
        g.destroy();
    }

    // ── BLAZE — magma titan, lava-crack body ─────────────────────
    _drawBossBlaze() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const body = 0x1a0000, crust = 0x3e0000;
        const lava = 0xff6d00, lavaL = 0xffcc02;
        const fire = 0xff3d00, fireT = 0xffee58;

        // Flame crown
        g.fillStyle(fireT);
        g.fillRect(22, 0,  6,  6);
        g.fillRect(32, 0,  8,  8);
        g.fillRect(44, 0,  6,  6);
        g.fillRect(16, 0,  5,  4);
        g.fillRect(51, 0,  5,  4);
        g.fillStyle(lava);
        g.fillRect(18, 2,  8,  6);
        g.fillRect(28, 1, 10,  8);
        g.fillRect(42, 2,  8,  6);
        g.fillStyle(fire);
        g.fillRect(14, 4,  6,  6);
        g.fillRect(52, 4,  6,  6);
        // Craggy head
        g.fillStyle(crust);
        g.fillRect(14, 6, 50, 28);
        g.fillStyle(body);
        g.fillRect(16, 8, 46, 24);
        // Lava crack eyes
        g.fillStyle(lavaL);
        g.fillRect(18,16, 16,  8);
        g.fillRect(48,16, 16,  8);
        g.fillStyle(lava);
        g.fillRect(20,17, 12,  6);
        g.fillRect(50,17, 12,  6);
        g.fillStyle(fire);
        g.fillRect(22,18,  8,  4);
        g.fillRect(52,18,  8,  4);
        // Face cracks
        g.fillStyle(lava);
        g.fillRect(38, 8,  4, 28);    // centre
        g.fillRect(22,26, 14,  3);    // L jaw
        g.fillRect(46,26, 14,  3);    // R jaw
        // Massive body
        g.fillStyle(crust);
        g.fillRect(4, 32, 74, 48);
        g.fillStyle(body);
        g.fillRect(8, 34, 66, 44);
        // Body lava cracks
        g.fillStyle(lava);
        g.fillRect(12,36,  6, 40);
        g.fillRect(34,34,  6, 42);
        g.fillRect(56,36,  6, 40);
        g.fillStyle(lavaL);
        g.fillRect(13,38,  4, 36);
        g.fillRect(35,36,  4, 38);
        g.fillRect(57,38,  4, 36);
        // Arms
        g.fillStyle(crust);
        g.fillRect(0, 30,  6, 36);
        g.fillRect(76,30, 12, 36);
        g.fillStyle(lava);
        g.fillRect(0, 38,  6,  6);
        g.fillRect(78,38,  8,  6);
        // Fire fists
        g.fillStyle(fire);
        g.fillRect(0, 64,  8, 10);
        g.fillStyle(fireT);
        g.fillRect(0, 62,  8,  4);
        g.fillStyle(fire);
        g.fillRect(76,62, 12,  6);
        g.fillStyle(fireT);
        g.fillRect(76,64, 12, 10);
        // Legs
        g.fillStyle(crust);
        g.fillRect(14,78, 24, 18);
        g.fillRect(44,78, 24, 18);
        g.fillStyle(lava);
        g.fillRect(16,80,  8, 14);
        g.fillRect(56,80,  8, 14);

        g.generateTexture('boss_blaze', 88, 96);
        g.destroy();
    }

    // ── PHANTOM — spectral wraith with wispy cloak ───────────────
    _drawBossPhantom() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const cloak = 0x004d57, cloakL = 0x006064;
        const spec = 0x00e5ff, specL = 0xe0f7fa;
        const mask = 0x002b36;

        // Wispy hood tips
        g.fillStyle(cloakL);
        g.fillRect(12, 0,  6,  4);
        g.fillRect(24, 0,  8,  6);
        g.fillRect(38, 0,  8,  6);
        g.fillRect(52, 0,  8,  4);
        g.fillRect(62, 0,  6,  4);
        // Hood
        g.fillStyle(cloakL);
        g.fillRect(10, 2, 60, 30);
        g.fillStyle(cloak);
        g.fillRect(12, 4, 56, 26);
        // Blank spectral mask face
        g.fillStyle(0x004d57);
        g.fillRect(20, 6, 40, 26);
        g.fillStyle(mask);
        g.fillRect(22, 8, 36, 22);
        // Glowing hollow eyes
        g.fillStyle(spec);
        g.fillRect(24,14, 12,  8);
        g.fillRect(44,14, 12,  8);
        g.fillStyle(specL);
        g.fillRect(26,15,  8,  6);
        g.fillRect(46,15,  8,  6);
        g.fillStyle(0xffffff);
        g.fillRect(28,16,  4,  4);
        g.fillRect(48,16,  4,  4);
        // Cloak body
        g.fillStyle(cloakL);
        g.fillRect(4, 30, 72, 48);
        g.fillStyle(cloak);
        g.fillRect(8, 32, 64, 44);
        // Spectral glow channel through body
        g.fillStyle(spec);
        g.fillRect(30,32, 20, 40);
        g.fillStyle(cloakL);
        g.fillRect(32,34, 16, 36);
        // Ghostly sleeve arms
        g.fillStyle(cloakL);
        g.fillRect(0, 28, 10, 34);
        g.fillRect(70,28, 18, 34);
        g.fillStyle(spec);
        g.fillRect(0, 58, 10,  6);    // L wisp
        g.fillRect(70,58, 18,  6);    // R wisp
        // Floating ghost orb weapon
        g.fillStyle(spec);
        g.fillRect(72,16, 16, 16);
        g.fillStyle(specL);
        g.fillRect(74,18, 12, 12);
        g.fillStyle(0xffffff);
        g.fillRect(76,20,  8,  8);
        g.fillStyle(spec);
        g.fillRect(78,22,  4,  4);
        // Wispy jagged bottom
        g.fillStyle(cloakL);
        g.fillRect(8, 76, 12, 20);
        g.fillRect(24,78, 10, 18);
        g.fillRect(38,76, 10, 20);
        g.fillRect(52,78, 10, 18);
        g.fillRect(66,76, 12, 20);
        g.fillStyle(spec);
        g.fillRect(9, 90,  4,  6);
        g.fillRect(25,92,  4,  4);
        g.fillRect(39,90,  4,  6);
        g.fillRect(53,92,  4,  4);
        g.fillRect(67,90,  4,  6);

        g.generateTexture('boss_phantom', 88, 96);
        g.destroy();
    }

    // ── TITAN — stone colossus with lava-crack body ───────────────
    _drawBossTitan() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const rock = 0x3e2723, rockL = 0x5d4037;
        const stone = 0x4e342e, stoneL = 0x6d4c41;
        const lava = 0xff6f00, lavaL = 0xffb300;
        const crack = 0xbcaaa4;

        // Rocky head crown
        g.fillStyle(rockL);
        g.fillRect(20, 0,  8,  6);
        g.fillRect(34, 0,  6,  4);
        g.fillRect(44, 0,  8,  6);
        g.fillRect(28, 0,  8,  8);    // tallest spike
        // Massive boxy head
        g.fillStyle(rock);
        g.fillRect(10, 4, 62, 28);
        g.fillStyle(rockL);
        g.fillRect(12, 4, 60,  8);    // top lighter
        // Rock texture cracks on head
        g.fillStyle(crack);
        g.fillRect(14, 8,  4, 20);
        g.fillRect(30, 6,  4, 22);
        g.fillRect(50, 8,  4, 20);
        g.fillRect(64,10,  4, 18);
        // Sunken lava eyes
        g.fillStyle(0x1a0a00);
        g.fillRect(16,14, 18, 10);
        g.fillRect(48,14, 18, 10);
        g.fillStyle(lavaL);
        g.fillRect(18,15, 14,  8);
        g.fillRect(50,15, 14,  8);
        g.fillStyle(lava);
        g.fillRect(20,16, 10,  6);
        g.fillRect(52,16, 10,  6);
        // Giant body
        g.fillStyle(stone);
        g.fillRect(6, 30, 70, 50);
        g.fillStyle(stoneL);
        g.fillRect(8, 30, 68, 10);    // chest top
        // Body cracks
        g.fillStyle(crack);
        g.fillRect(10,34,  6, 40);
        g.fillRect(26,32,  4, 42);
        g.fillRect(48,32,  4, 42);
        g.fillRect(64,34,  6, 40);
        g.fillStyle(lava);
        g.fillRect(10,46,  6,  8);
        g.fillRect(64,46,  6,  8);
        g.fillRect(26,54,  4,  8);
        g.fillRect(48,54,  4,  8);
        // Massive arms
        g.fillStyle(rock);
        g.fillRect(0, 28,  8, 34);
        g.fillRect(74,28, 14, 34);
        // Boulder fists
        g.fillStyle(rockL);
        g.fillRect(0, 60, 10, 14);
        g.fillRect(72,60, 16, 14);
        g.fillStyle(crack);
        g.fillRect(2, 64,  6,  4);
        g.fillRect(74,64,  8,  4);
        // Legs + rocky feet
        g.fillStyle(stone);
        g.fillRect(12,78, 24, 18);
        g.fillRect(44,78, 24, 18);
        g.fillStyle(rock);
        g.fillRect(10,90, 28,  6);
        g.fillRect(42,90, 28,  6);

        g.generateTexture('boss_titan', 88, 96);
        g.destroy();
    }

    // ── STORM — lightning elemental with crackling form ───────────
    _drawBossStorm() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const body = 0x1a1a00, bodyL = 0x2d2d00;
        const bolt = 0xffee58, boltL = 0xffffff;
        const elec = 0x00e5ff;

        // Lightning discharge crown
        g.fillStyle(boltL);
        g.fillRect(30, 0,  4,  6);
        g.fillRect(40, 0,  4,  6);
        g.fillRect(22, 0,  4,  4);
        g.fillRect(50, 0,  4,  4);
        g.fillStyle(bolt);
        g.fillRect(28, 2,  6,  6);
        g.fillRect(38, 2,  6,  6);
        g.fillRect(20, 2,  5,  5);
        g.fillRect(47, 2,  5,  5);
        g.fillStyle(elec);
        g.fillRect(16, 4,  4,  4);
        g.fillRect(52, 4,  4,  4);
        // Crackling head
        g.fillStyle(bodyL);
        g.fillRect(14, 4, 52, 26);
        g.fillStyle(body);
        g.fillRect(16, 6, 48, 22);
        // Lightning split lines on head
        g.fillStyle(bolt);
        g.fillRect(38, 4,  4, 26);    // centre split
        g.fillRect(22,10, 16,  3);    // L arc
        g.fillRect(42,10, 16,  3);    // R arc
        // Crackling electric eyes
        g.fillStyle(elec);
        g.fillRect(18,12, 14,  8);
        g.fillRect(48,12, 14,  8);
        g.fillStyle(0xe0f7fa);
        g.fillRect(20,13, 10,  6);
        g.fillRect(50,13, 10,  6);
        g.fillStyle(boltL);
        g.fillRect(22,14,  6,  4);
        g.fillRect(52,14,  6,  4);
        // Body (crackling energy form)
        g.fillStyle(bodyL);
        g.fillRect(8, 28, 64, 50);
        g.fillStyle(body);
        g.fillRect(10,30, 60, 46);
        // Lightning bolt body patterns
        g.fillStyle(bolt);
        g.fillRect(20,30,  4, 46);
        g.fillRect(34,28,  4, 48);
        g.fillRect(46,28,  4, 48);
        g.fillRect(60,30,  4, 46);
        g.fillStyle(boltL);
        g.fillRect(21,32,  2, 42);
        g.fillRect(35,30,  2, 44);
        g.fillRect(47,30,  2, 44);
        g.fillRect(61,32,  2, 42);
        // Electric arc connectors
        g.fillStyle(elec);
        g.fillRect(22,38, 12,  3);
        g.fillRect(38,42, 10,  3);
        g.fillRect(24,56, 14,  3);
        g.fillRect(50,38, 10,  3);
        g.fillRect(46,52, 14,  3);
        // Electric tendril arms
        g.fillStyle(bodyL);
        g.fillRect(0, 28, 10, 32);
        g.fillRect(70,28, 18, 32);
        g.fillStyle(bolt);
        g.fillRect(0, 34,  4,  4);
        g.fillRect(0, 48,  6,  4);
        g.fillRect(72,34,  6,  4);
        g.fillRect(70,48,  6,  4);
        // Crackling legs
        g.fillStyle(bodyL);
        g.fillRect(14,76, 22, 20);
        g.fillRect(44,76, 22, 20);
        g.fillStyle(bolt);
        g.fillRect(16,78,  4, 16);
        g.fillRect(54,78,  4, 16);
        // Lightning rod weapon
        g.fillStyle(0x78909c);
        g.fillRect(76, 8,  6, 50);    // shaft
        g.fillStyle(bolt);
        g.fillRect(74, 4, 10,  8);    // tip
        g.fillStyle(boltL);
        g.fillRect(76, 4,  6,  6);    // tip glow
        g.fillStyle(elec);
        g.fillRect(72,28, 12,  4);    // grip
        g.fillStyle(0x546e7a);
        g.fillRect(74,30,  8,  3);

        g.generateTexture('boss_storm', 88, 96);
        g.destroy();
    }

    // ── KILLJOY — tech genius with yellow-accented tactical outfit ──
    _drawBossKilljoy() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xe8b880, dark = 0x222200;
        const suit = 0x1a1a00, accent = 0xffee00, hair = 0x1a0a00;

        // Hair (twin pigtails effect — short hair with bright accent clips)
        g.fillStyle(hair);
        g.fillRect(20, 0, 40, 12);
        g.fillStyle(accent);
        g.fillRect(16, 6, 6, 6);   // L clip
        g.fillRect(58, 6, 6, 6);   // R clip

        // Head
        g.fillStyle(skin); g.fillRect(18, 8, 44, 24);
        // Eyes (sharp, determined)
        g.fillStyle(dark); g.fillRect(24,16,10,6); g.fillRect(46,16,10,6);
        g.fillStyle(accent); g.fillRect(26,18,6,4); g.fillRect(48,18,6,4);
        g.fillStyle(0xffffff); g.fillRect(28,18,3,3); g.fillRect(50,18,3,3);
        // Nose/mouth
        g.fillStyle(0xc8946a); g.fillRect(38,24,4,3);
        g.fillStyle(dark); g.fillRect(32,28,16,3);

        // Body — armored jumpsuit
        g.fillStyle(suit); g.fillRect(14,32,52,44);
        g.fillStyle(accent);
        g.fillRect(14,32,52,4);    // collar stripe
        g.fillRect(38,36,4,40);    // centre line
        g.fillRect(14,60,52,4);    // belt
        // Shoulder pads
        g.fillStyle(0x333300); g.fillRect(8,32,10,18); g.fillRect(62,32,10,18);
        g.fillStyle(accent); g.fillRect(8,32,10,4); g.fillRect(62,32,10,4);

        // Nano-tech device on belt (yellow box with circuits)
        g.fillStyle(accent); g.fillRect(28,60,24,14);
        g.fillStyle(dark); g.fillRect(30,62,20,10);
        g.fillStyle(accent);
        g.fillRect(32,64,4,2); g.fillRect(38,64,10,2);
        g.fillRect(32,68,16,2);

        // Arms
        g.fillStyle(suit); g.fillRect(0,32,10,32); g.fillRect(70,32,10,32);
        g.fillStyle(skin); g.fillRect(0,60,10,10); g.fillRect(70,60,10,10);
        // Gauntlet
        g.fillStyle(accent); g.fillRect(0,56,10,6); g.fillRect(70,56,10,6);

        // Legs
        g.fillStyle(suit); g.fillRect(14,76,22,20); g.fillRect(44,76,22,20);
        g.fillStyle(accent); g.fillRect(14,76,22,4); g.fillRect(44,76,22,4);
        // Boots
        g.fillStyle(dark); g.fillRect(10,90,28,6); g.fillRect(42,90,28,6);

        g.generateTexture('boss_killjoy', 88, 96);
        g.destroy();
    }

    // ── CHAMBER — elegant French rifleman in tailored suit ──────
    _drawBossChamber() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const skin = 0xd4a574, dark = 0x100808;
        const suit = 0x2a1e0a, gold = 0xffe082, cream = 0xfff8e1;
        const hair = 0x5c3d1e;

        // Hair (swept back, dignified)
        g.fillStyle(hair);
        g.fillRect(18, 0, 44, 14);
        g.fillStyle(0x8b6534);
        g.fillRect(20, 2, 40, 8);

        // Head
        g.fillStyle(skin); g.fillRect(18, 10, 44, 24);
        // Eyebrow (one arched smugly)
        g.fillStyle(hair); g.fillRect(22,16,12,3); g.fillRect(46,14,12,3);
        // Eyes (sharp, calculating)
        g.fillStyle(dark); g.fillRect(22,20,12,6); g.fillRect(46,20,12,6);
        g.fillStyle(gold); g.fillRect(24,21,8,4); g.fillRect(48,21,8,4);
        g.fillStyle(0xffffff); g.fillRect(26,22,4,3); g.fillRect(50,22,4,3);
        // Nose (aristocratic)
        g.fillStyle(0xb87a4a); g.fillRect(38,27,4,4);
        // Thin mustache
        g.fillStyle(hair); g.fillRect(30,30,28,3);
        // Mouth (subtle smirk)
        g.fillStyle(dark); g.fillRect(34,32,20,2);

        // Suit collar + tie
        g.fillStyle(cream); g.fillRect(28,34,24,12);
        g.fillStyle(gold); g.fillRect(38,36,4,10);  // tie
        // Body — tailored suit
        g.fillStyle(suit); g.fillRect(10,34,58,42);
        g.fillStyle(gold);
        g.fillRect(10,34,58,3);   // collar line
        g.fillRect(10,50,24,3);   // L lapel
        g.fillRect(54,50,24,3);   // R lapel
        // Pocket square
        g.fillStyle(cream); g.fillRect(60,38,10,8);
        g.fillStyle(gold); g.fillRect(62,38,6,4);
        // Shoulder pads (subtle)
        g.fillStyle(0x1a1008); g.fillRect(6,34,8,18); g.fillRect(74,34,8,18);

        // Arms (suit-sleeved)
        g.fillStyle(suit); g.fillRect(0,34,8,32); g.fillRect(80,34,8,32);
        g.fillStyle(cream); g.fillRect(0,60,8,8); g.fillRect(80,60,8,8);  // cuffs
        g.fillStyle(gold); g.fillRect(0,58,8,4); g.fillRect(80,58,8,4);   // cufflinks

        // Legs (trousers)
        g.fillStyle(suit); g.fillRect(14,76,22,20); g.fillRect(52,76,22,20);
        // Dress shoes
        g.fillStyle(dark); g.fillRect(10,90,28,6); g.fillRect(50,90,28,6);
        g.fillStyle(0x333333); g.fillRect(12,92,24,2); g.fillRect(52,92,24,2);

        // Sniper rifle (long, sleek)
        g.fillStyle(0x555555); g.fillRect(78, 10, 10, 62);  // barrel
        g.fillStyle(gold);     g.fillRect(76,  8, 14,  8);  // scope
        g.fillStyle(0x333333); g.fillRect(80, 18, 6, 10);   // body
        g.fillStyle(0x888888); g.fillRect(80, 60, 6, 12);   // grip

        g.generateTexture('boss_chamber', 88, 96);
        g.destroy();
    }

    // ── KAY/O — militaristic combat robot ───────────────────────
    _drawBossKayo() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const metal = 0x263238, metalL = 0x37474f, metalD = 0x1c2529;
        const teal  = 0x00bcd4, tealL  = 0x80deea;
        const white = 0xeceff1;

        // Head (angular, robotic)
        g.fillStyle(metalL); g.fillRect(14, 2, 52, 28);
        g.fillStyle(metal);  g.fillRect(16, 4, 48, 24);
        // Visor / eye panel
        g.fillStyle(teal);   g.fillRect(16, 8, 48, 14);
        g.fillStyle(tealL);  g.fillRect(18,10, 44, 10);
        g.fillStyle(white);  g.fillRect(20,11, 40,  8);
        // KAY/O logo on forehead
        g.fillStyle(metalD); g.fillRect(28, 4, 24,  4);
        g.fillStyle(teal);   g.fillRect(30, 4, 20,  3);
        // Chin vents
        g.fillStyle(metalD); g.fillRect(24,24,6,6); g.fillRect(34,24,6,6); g.fillRect(44,24,6,6); g.fillRect(54,24,6,6);

        // Neck / collar
        g.fillStyle(metalD); g.fillRect(30,28,28,6);
        g.fillStyle(teal);   g.fillRect(32,30,24,3);

        // Body — heavy armored chassis
        g.fillStyle(metalL); g.fillRect(8,34,64,42);
        g.fillStyle(metal);  g.fillRect(10,36,60,38);
        // Chest plate detail
        g.fillStyle(teal);   g.fillRect(26,38,28,18);
        g.fillStyle(metalD); g.fillRect(28,40,24,14);
        g.fillStyle(teal);   g.fillRect(30,42,20,10);
        g.fillStyle(tealL);  g.fillRect(32,44,16, 6);  // core glow
        // Side vents
        g.fillStyle(metalD);
        for (let i = 0; i < 4; i++) {
            g.fillRect(10, 40+i*6, 14, 4);
            g.fillRect(64, 40+i*6, 14, 4);
        }
        // Belt ammo pouches
        g.fillStyle(0x1c2529); g.fillRect(10,72,64,4);
        g.fillStyle(teal);     g.fillRect(18,72,8,4); g.fillRect(38,72,8,4); g.fillRect(58,72,8,4);

        // Arms (heavy plated)
        g.fillStyle(metalL); g.fillRect(0,34,10,36); g.fillRect(78,34,10,36);
        g.fillStyle(metal);  g.fillRect(0,36,10,32); g.fillRect(78,36,10,32);
        // Forearm cannons
        g.fillStyle(teal); g.fillRect(0,56,10,8); g.fillRect(78,56,10,8);

        // Legs (armored)
        g.fillStyle(metalL); g.fillRect(10,76,26,20); g.fillRect(52,76,26,20);
        g.fillStyle(metal);  g.fillRect(12,78,22,16); g.fillRect(54,78,22,16);
        g.fillStyle(teal);   g.fillRect(12,84,22,4);  g.fillRect(54,84,22,4);
        // Boots
        g.fillStyle(metalD); g.fillRect(8,90,30,6); g.fillRect(50,90,30,6);

        g.generateTexture('boss_kayo', 88, 96);
        g.destroy();
    }

    createPickupTextures() {
        // Health cross
        const h = this.make.graphics({ x: 0, y: 0, add: false });
        h.fillStyle(0xffffff);
        h.fillRect(0, 0, 24, 24);
        h.fillStyle(0xff1744);
        h.fillRect(3, 9, 18, 6);
        h.fillRect(9, 3, 6, 18);
        h.generateTexture('health_drop', 24, 24);
        h.destroy();

        // Viper ultimate orb
        const vo = this.make.graphics({ x: 0, y: 0, add: false });
        vo.fillStyle(0x001a00); vo.fillCircle(22, 22, 22);
        vo.fillStyle(0x005500); vo.fillCircle(22, 22, 16);
        vo.fillStyle(0x00aa33); vo.fillCircle(22, 22, 10);
        vo.fillStyle(0x44ff77); vo.fillCircle(22, 22,  5);
        vo.fillStyle(0xccffdd); vo.fillCircle(22, 22,  2);
        vo.generateTexture('viper_orb', 44, 44);
        vo.destroy();

        // Toxic pool puddle (Viper boss)
        const tp = this.make.graphics({ x: 0, y: 0, add: false });
        tp.fillStyle(0x001a00);
        tp.fillRect(0, 4, 112, 20);
        tp.fillStyle(0x004d00);
        tp.fillRect(6, 2, 100, 22);
        tp.fillStyle(0x007700);
        tp.fillRect(16, 0, 80, 26);
        tp.fillStyle(0x00aa22);
        tp.fillRect(28, 2, 56, 22);
        tp.fillStyle(0x00cc33);
        tp.fillRect(40, 6, 32, 14);
        tp.fillStyle(0x44ff66);
        tp.fillRect(50, 9, 12, 8);
        tp.generateTexture('toxic_pool', 112, 26);
        tp.destroy();

        // Jett dagger (small cyan blade)
        const jd = this.make.graphics({ x: 0, y: 0, add: false });
        jd.fillStyle(0x0288d1); jd.fillRect(0, 16, 12, 4);   // guard
        jd.fillStyle(0x4fc3f7); jd.fillRect(3,  0,  6, 20);  // blade
        jd.fillStyle(0xe0f7fa); jd.fillRect(4,  1,  3, 14);  // shine
        jd.generateTexture('jett_dagger', 12, 20);
        jd.destroy();

        // Powerup drops
        const pfr = this.make.graphics({ x: 0, y: 0, add: false });
        pfr.fillStyle(0x554400); pfr.fillCircle(12, 12, 12);
        pfr.fillStyle(0xffaa00); pfr.fillCircle(12, 12, 9);
        pfr.fillStyle(0xffee00); pfr.fillCircle(12, 12, 5);
        pfr.fillStyle(0xffffff); pfr.fillCircle(9,  9,  2);
        pfr.generateTexture('powerup_firerate', 24, 24);
        pfr.destroy();

        const pin = this.make.graphics({ x: 0, y: 0, add: false });
        pin.fillStyle(0x001155); pin.fillCircle(12, 12, 12);
        pin.fillStyle(0x0044ff); pin.fillCircle(12, 12, 9);
        pin.fillStyle(0x44aaff); pin.fillCircle(12, 12, 5);
        pin.fillStyle(0xffffff); pin.fillCircle(9,  9,  2);
        pin.generateTexture('powerup_invincible', 24, 24);
        pin.destroy();

        const puj = this.make.graphics({ x: 0, y: 0, add: false });
        puj.fillStyle(0x003311); puj.fillCircle(12, 12, 12);
        puj.fillStyle(0x00aa44); puj.fillCircle(12, 12, 9);
        puj.fillStyle(0x44ff88); puj.fillCircle(12, 12, 5);
        puj.fillStyle(0xffffff); puj.fillCircle(9,  9,  2);
        puj.generateTexture('powerup_jumps', 24, 24);
        puj.destroy();
    }
}
