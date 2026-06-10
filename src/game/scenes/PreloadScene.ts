import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.generateAssets();
    }

    create() {
        this.scene.start('MissionScene');
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

        // Terminal
        graphics.clear();
        graphics.fillStyle(0x111111);
        graphics.fillRect(4, 4, 24, 24);
        graphics.fillStyle(0x00FFFF);
        graphics.fillRect(8, 8, 16, 12);
        graphics.generateTexture('terminal', 32, 32);
    }
}
