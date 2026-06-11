import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.generateAssets();
    }

    create() {
        this.scene.start('MissionScene', { gameState: this.registry.get('gameState') });
    }

    generateAssets() {
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // Floors
        const floors = [
            { name: 'floor_default', color: 0xF5E6C8 },
            { name: 'floor_stone', color: 0x4A4A5A },
            { name: 'floor_server', color: 0x1E2A3A },
            { name: 'floor_soc', color: 0x151E2D },
            { name: 'floor_corp', color: 0x2A2A35 },
            { name: 'floor_lab', color: 0x1E2E25 },
            { name: 'floor_exec', color: 0x2A1F15 },
            { name: 'floor_ext', color: 0x1A2A1A },
        ];

        floors.forEach(f => {
            graphics.clear();
            graphics.fillStyle(f.color);
            graphics.fillRect(0, 0, 32, 32);
            graphics.lineStyle(1, 0x000000, 0.1);
            graphics.strokeRect(0, 0, 32, 32);
            graphics.generateTexture(f.name, 32, 32);
        });

        // Wall
        graphics.clear();
        graphics.fillStyle(0x2D2D3A);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(2, 0x1A1A25, 1);
        graphics.strokeRect(0, 0, 32, 32);
        graphics.generateTexture('wall', 32, 32);

        // Door
        graphics.clear();
        graphics.fillStyle(0x888888);
        graphics.fillRect(4, 0, 24, 32);
        graphics.fillStyle(0x555555);
        graphics.fillRect(14, 12, 4, 8);
        graphics.generateTexture('door', 32, 32);

        // Player
        graphics.clear();
        graphics.fillStyle(0x00FF88);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0xFFFFFF);
        graphics.fillRect(24, 14, 6, 4);
        graphics.generateTexture('player', 32, 32);

        // Guard
        graphics.clear();
        graphics.fillStyle(0xFFA500);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0x000000);
        graphics.fillRect(24, 14, 6, 4);
        graphics.generateTexture('guard', 32, 32);

        // Boss (SOC Manager)
        graphics.clear();
        graphics.fillStyle(0xFF00FF);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xFFFFFF);
        graphics.fillRect(24, 14, 6, 4);
        graphics.generateTexture('boss_soc', 32, 32);

        // Boss (IRT)
        graphics.clear();
        graphics.fillStyle(0xFF0000);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0x000000);
        graphics.fillRect(24, 14, 6, 4);
        graphics.generateTexture('boss_irt', 32, 32);

        // Camera
        graphics.clear();
        graphics.fillStyle(0x333333);
        graphics.fillRect(8, 8, 16, 16);
        graphics.fillStyle(0xFF0000);
        graphics.fillCircle(16, 16, 4);
        graphics.generateTexture('camera', 32, 32);

        // Terminal — server console with glowing screen
        graphics.clear();
        graphics.fillStyle(0x0a0f18);
        graphics.fillRoundedRect(3, 2, 26, 28, 4);
        graphics.lineStyle(2, 0x00ffff, 0.9);
        graphics.strokeRoundedRect(3, 2, 26, 28, 4);
        graphics.fillStyle(0x00ffff, 0.9);
        graphics.fillRect(7, 6, 18, 12);
        graphics.fillStyle(0x003344);
        for (let i = 0; i < 3; i++) graphics.fillRect(8, 8 + i * 3, 16, 1);
        graphics.fillStyle(0x00ff88);
        graphics.fillRect(8, 22, 4, 4);
        graphics.fillRect(14, 22, 4, 4);
        graphics.generateTexture('terminal', 32, 32);

        // ── Pickups / bonuses ────────────────────────────────────────────
        // Data shard (cyan diamond)
        graphics.clear();
        graphics.fillStyle(0x00e5ff, 1);
        graphics.beginPath();
        graphics.moveTo(12, 2); graphics.lineTo(22, 12); graphics.lineTo(12, 22); graphics.lineTo(2, 12);
        graphics.closePath(); graphics.fillPath();
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillRect(10, 8, 4, 8);
        graphics.generateTexture('pickup_data', 24, 24);

        // Intel document
        graphics.clear();
        graphics.fillStyle(0xffd54a, 1);
        graphics.fillRoundedRect(4, 2, 16, 20, 2);
        graphics.fillStyle(0x7a5a00, 1);
        for (let i = 0; i < 4; i++) graphics.fillRect(7, 6 + i * 4, 10, 1.5);
        graphics.generateTexture('pickup_intel', 24, 24);

        // Medkit
        graphics.clear();
        graphics.fillStyle(0x16202c, 1);
        graphics.fillRoundedRect(2, 2, 20, 20, 4);
        graphics.lineStyle(2, 0xff5566, 1); graphics.strokeRoundedRect(2, 2, 20, 20, 4);
        graphics.fillStyle(0xff5566, 1);
        graphics.fillRect(10, 6, 4, 12); graphics.fillRect(6, 10, 12, 4);
        graphics.generateTexture('pickup_medkit', 24, 24);

        // EMP charge (yellow bolt)
        graphics.clear();
        graphics.fillStyle(0x1a1f14, 1);
        graphics.fillCircle(12, 12, 11);
        graphics.lineStyle(2, 0xffe14d, 1); graphics.strokeCircle(12, 12, 11);
        graphics.fillStyle(0xffe14d, 1);
        graphics.beginPath();
        graphics.moveTo(13, 4); graphics.lineTo(7, 13); graphics.lineTo(11, 13); graphics.lineTo(10, 20);
        graphics.lineTo(17, 10); graphics.lineTo(13, 10); graphics.closePath(); graphics.fillPath();
        graphics.generateTexture('pickup_emp', 24, 24);

        // Keycard
        graphics.clear();
        graphics.fillStyle(0x3aa0ff, 1);
        graphics.fillRoundedRect(2, 5, 20, 14, 2);
        graphics.fillStyle(0xffffff, 0.8); graphics.fillRect(5, 8, 7, 5);
        graphics.fillStyle(0x0a3a66, 1); graphics.fillRect(14, 8, 5, 8);
        graphics.generateTexture('pickup_keycard', 24, 24);

        // ── Decorative props ─────────────────────────────────────────────
        // Server rack
        graphics.clear();
        graphics.fillStyle(0x141c28, 1);
        graphics.fillRoundedRect(0, 0, 34, 48, 3);
        graphics.lineStyle(1, 0x2a3b52, 1); graphics.strokeRoundedRect(0, 0, 34, 48, 3);
        for (let i = 0; i < 6; i++) {
            graphics.fillStyle(0x0d1420, 1); graphics.fillRect(4, 4 + i * 7, 26, 5);
            graphics.fillStyle(i % 2 ? 0x00ff88 : 0x00b4ff, 0.9); graphics.fillRect(26, 5 + i * 7, 2, 2);
        }
        graphics.generateTexture('prop_server', 34, 48);

        // Data core (glowing orb)
        graphics.clear();
        graphics.fillStyle(0x00b4ff, 0.18); graphics.fillCircle(20, 20, 20);
        graphics.fillStyle(0x06121f, 1); graphics.fillCircle(20, 20, 13);
        graphics.lineStyle(2, 0x00e5ff, 0.9); graphics.strokeCircle(20, 20, 13);
        graphics.fillStyle(0x00e5ff, 1); graphics.fillCircle(20, 20, 5);
        graphics.generateTexture('prop_datacore', 40, 40);

        // Console desk
        graphics.clear();
        graphics.fillStyle(0x18222e, 1); graphics.fillRoundedRect(0, 8, 40, 20, 3);
        graphics.fillStyle(0x00ffcc, 0.8); graphics.fillRect(6, 2, 28, 10);
        graphics.fillStyle(0x05202a, 1); graphics.fillRect(8, 4, 24, 6);
        graphics.generateTexture('prop_console', 40, 30);

        // Crate
        graphics.clear();
        graphics.fillStyle(0x2a2417, 1); graphics.fillRoundedRect(0, 0, 30, 30, 2);
        graphics.lineStyle(2, 0x5a4a22, 1); graphics.strokeRoundedRect(0, 0, 30, 30, 2);
        graphics.lineStyle(2, 0x5a4a22, 1); graphics.lineBetween(0, 0, 30, 30); graphics.lineBetween(30, 0, 0, 30);
        graphics.generateTexture('prop_crate', 30, 30);
    }
}
