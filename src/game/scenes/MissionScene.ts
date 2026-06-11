import * as Phaser from 'phaser';
import { GameState, RoomConfig } from '@/types/game';
import { ObjectiveSystem } from '@/game/systems/ObjectiveSystem';
import { BossEntity } from '@/game/entities/BossEntity';
import { AlertSystem } from '@/game/systems/AlertSystem';
import { ExfiltrationSystem } from '@/game/systems/ExfiltrationSystem';

export class MissionScene extends Phaser.Scene {
    private playerSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private guardSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private cameraSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private terminalSprites: Map<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }> = new Map();
    private collectibleSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
    private bosses: Map<string, BossEntity> = new Map();
    private gameState!: GameState;
    private room?: RoomConfig;

    // Re-drawn each frame
    private visionG!: Phaser.GameObjects.Graphics;
    private doorG!: Phaser.GameObjects.Graphics;
    private laserG!: Phaser.GameObjects.Graphics;

    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickThumb?: Phaser.GameObjects.Arc;
    private actionButton?: Phaser.GameObjects.Arc;

    constructor() {
        super('MissionScene');
    }

    init(data: { gameState?: GameState }) {
        this.gameState = data?.gameState ?? this.registry.get('gameState');
        this.room = this.registry.get('room');
        this.events.on('shutdown', this.shutdown, this);
    }

    private shutdown() {
        this.sys.events.removeAllListeners();
        this.playerSprites.clear();
        this.guardSprites.clear();
        this.cameraSprites.clear();
        this.terminalSprites.clear();
        this.collectibleSprites.clear();
        this.bosses.clear();
    }

    create() {
        this.room = this.registry.get('room') ?? this.room;
        this.drawStaticRoom();
        this.setupCamera();

        // Layered dynamic graphics
        this.visionG = this.add.graphics().setDepth(2);
        this.laserG = this.add.graphics().setDepth(6);
        this.doorG = this.add.graphics().setDepth(3);

        if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
            this.createMobileControls();
        }
        this.events.on('boss_action', this.handleBossAction, this);
    }

    // ── Static geometry (floor, grid, shadows, walls, exit) ──────────────────
    private drawStaticRoom() {
        const room = this.room;
        const w = room?.width ?? 700;
        const h = room?.height ?? 500;
        const g = this.add.graphics().setDepth(0);

        // Floor
        g.fillStyle(0x0e1626, 1).fillRect(0, 0, w, h);
        // Grid
        g.lineStyle(1, 0x1b2940, 0.6);
        for (let x = 0; x <= w; x += 50) g.lineBetween(x, 0, x, h);
        for (let y = 0; y <= h; y += 50) g.lineBetween(0, y, w, y);

        // Shadow / cover zones
        room?.shadows?.forEach(s => {
            g.fillStyle(0x000000, 0.35).fillRect(s.x, s.y, s.w, s.h);
        });

        // Walls
        room?.walls?.forEach(wall => {
            g.fillStyle(0x2d3a52, 1).fillRect(wall.x, wall.y, wall.w, wall.h);
            g.lineStyle(1, 0x415273, 1).strokeRect(wall.x, wall.y, wall.w, wall.h);
        });

        // Decorative "hacker" props
        const propTex: Record<string, string> = { server: 'prop_server', datacore: 'prop_datacore', console: 'prop_console', crate: 'prop_crate' };
        room?.props?.forEach(p => {
            const img = this.add.image(p.x, p.y, propTex[p.type] ?? 'prop_crate').setDepth(1).setAlpha(0.95);
            if (p.type === 'datacore') {
                this.tweens.add({ targets: img, alpha: 0.55, scale: 1.08, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
        });

        // Exit zone
        if (room) {
            const ex = room.exitPoint;
            g.fillStyle(0x00ff88, 0.18).fillRect(ex.x - 28, ex.y - 28, 56, 56);
            g.lineStyle(2, 0x00ff88, 0.9).strokeRect(ex.x - 28, ex.y - 28, 56, 56);
            this.add.text(ex.x, ex.y - 40, 'EXIT', { fontSize: '12px', color: '#00ff88', fontFamily: 'monospace' })
                .setOrigin(0.5).setDepth(1);
        }
    }

    private setupCamera() {
        const w = this.room?.width ?? 700;
        const h = this.room?.height ?? 500;
        this.cameras.main.setBounds(0, 0, w, h);
        // Small rooms: center them. Large rooms: the camera follows the player (set in updatePlayers).
        if (w <= 800 && h <= 600) {
            this.cameras.main.centerOn(w / 2, h / 2);
        }
    }

    update(_time: number, delta: number) {
        const gs = this.registry.get('gameState') as GameState | undefined;
        if (gs) this.gameState = gs;
        if (!this.gameState) return;

        this.updatePlayers();
        this.updateGuards();
        this.updateCameras();
        this.updateTerminals();
        this.updateCollectibles();
        this.updateDoors();
        this.updateLasers();
        this.updateVision();
        this.updateBosses(delta);
        this.checkObjectiveProgress();
    }

    private updatePlayers() {
        this.gameState.players.forEach((p, id) => {
            let sprite = this.playerSprites.get(id);
            if (!sprite) {
                sprite = this.physics.add.sprite(p.position.x, p.position.y, 'player').setDepth(8);
                this.playerSprites.set(id, sprite);
                if (id === this.gameState.localPlayerId) {
                    this.cameras.main.startFollow(sprite, true, 0.12, 0.12);
                }
            }
            sprite.setPosition(p.position.x, p.position.y);
            sprite.setRotation(p.facing);
            sprite.setAlpha(p.isInVent ? 0.4 : 1);
        });
    }

    private updateGuards() {
        this.gameState.guards.forEach(g => {
            let sprite = this.guardSprites.get(g.id);
            if (!sprite) {
                sprite = this.physics.add.sprite(g.position.x, g.position.y, 'guard').setDepth(7);
                this.guardSprites.set(g.id, sprite);
            }
            sprite.setPosition(g.position.x, g.position.y);
            sprite.setRotation(g.visionAngle);
            sprite.setTint(g.state === 'chase' || g.state === 'alert' ? 0xff4444 : 0xffffff);
        });
    }

    private updateCameras() {
        this.gameState.cameras.forEach(c => {
            let sprite = this.cameraSprites.get(c.id);
            if (!sprite) {
                sprite = this.physics.add.sprite(c.position.x, c.position.y, 'camera').setDepth(7);
                this.tweens.add({ targets: sprite, alpha: 0.5, duration: 480, yoyo: true, repeat: -1 });
                this.cameraSprites.set(c.id, sprite);
            }
            sprite.setRotation(c.rotationAngle);
            sprite.setTint(c.state === 'hacked' ? 0x00ff88 : 0xffffff);
        });
    }

    private updateTerminals() {
        this.gameState.terminals?.forEach(t => {
            let entry = this.terminalSprites.get(t.id);
            if (!entry) {
                const sprite = this.add.sprite(t.position.x, t.position.y, 'terminal').setDepth(7);
                this.tweens.add({ targets: sprite, scale: 1.14, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                const label = this.add.text(t.position.x, t.position.y - 24,
                    t.isMainObjective ? '★ TARGET' : 'TERMINAL',
                    { fontSize: '10px', color: t.isMainObjective ? '#ffd700' : '#00ffff', fontFamily: 'monospace' })
                    .setOrigin(0.5).setDepth(7);
                entry = { sprite, label };
                this.terminalSprites.set(t.id, entry);
            }
            if (t.isHacked) {
                entry.sprite.setTint(0x00ff88);
                entry.label.setText('HACKED').setColor('#00ff88');
            } else {
                entry.sprite.setTint(t.isMainObjective ? 0xffd700 : 0x00ffff);
            }
        });
    }

    private collectibleTex(type: string): string {
        if (type.startsWith('keycard')) return 'pickup_keycard';
        if (type === 'intel') return 'pickup_intel';
        if (type === 'medkit') return 'pickup_medkit';
        if (type === 'emp') return 'pickup_emp';
        return 'pickup_data';
    }

    private updateCollectibles() {
        const present = new Set<string>();
        (this.gameState.collectibles || []).forEach((c: any) => {
            if (!c?.id || !c.position) return;
            present.add(c.id);
            if (!this.collectibleSprites.has(c.id)) {
                const s = this.add.sprite(c.position.x, c.position.y, this.collectibleTex(c.type)).setDepth(6);
                // glow ring
                const ring = this.add.circle(c.position.x, c.position.y, 14, 0x00e5ff, 0.12).setDepth(5);
                this.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 1300, repeat: -1, ease: 'Sine.easeOut' });
                this.tweens.add({ targets: s, y: c.position.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                s.setData('ring', ring);
                this.collectibleSprites.set(c.id, s);
            }
        });
        // remove collected
        this.collectibleSprites.forEach((s, id) => {
            if (!present.has(id)) {
                (s.getData('ring') as Phaser.GameObjects.Arc | undefined)?.destroy();
                s.destroy();
                this.collectibleSprites.delete(id);
            }
        });
    }

    private updateDoors() {
        this.doorG.clear();
        this.gameState.doors?.forEach(d => {
            if (d.state === 'open') return;
            const color = d.state === 'locked' ? 0xff3355 : d.state === 'broken' ? 0x555555 : 0x9aa7bd;
            this.doorG.fillStyle(color, 0.9).fillRect(d.position.x, d.position.y, d.width, d.height);
            this.doorG.lineStyle(1, 0x000000, 0.5).strokeRect(d.position.x, d.position.y, d.width, d.height);
        });
    }

    private updateLasers() {
        this.laserG.clear();
        this.gameState.lasers?.forEach(l => {
            if (!l.isActive) return;
            this.laserG.lineStyle(2, 0xff2244, 0.9);
            this.laserG.lineBetween(l.start.x, l.start.y, l.end.x, l.end.y);
        });
    }

    private updateVision() {
        this.visionG.clear();
        const drawCone = (x: number, y: number, angle: number, range: number, fov: number, color: number, alpha: number) => {
            this.visionG.fillStyle(color, alpha);
            this.visionG.slice(x, y, range, angle - fov / 2, angle + fov / 2, false);
            this.visionG.fillPath();
        };
        this.gameState.guards.forEach(g => {
            const hostile = g.state === 'chase' || g.state === 'alert';
            drawCone(g.position.x, g.position.y, g.visionAngle, g.visionRange, g.visionFOV,
                hostile ? 0xff0000 : 0xffee00, hostile ? 0.22 : 0.12);
        });
        this.gameState.cameras.forEach(c => {
            if (c.state !== 'active') return;
            drawCone(c.position.x, c.position.y, c.rotationAngle, c.visionRange, c.visionFOV, 0xff5500, 0.12);
        });
    }

    private updateBosses(dt: number) {
        const localPlayer = this.gameState.players.get(this.gameState.localPlayerId);
        if (!localPlayer) return;
        const alertLevel = AlertSystem.getInstance().getAlertLevel();
        if (this.gameState.currentRoomId === 15 && !this.bosses.has('soc-manager')) {
            const boss = new BossEntity(this, 500, 300, 'soc-manager', 'SOC_MANAGER');
            this.bosses.set('soc-manager', boss);
        }
        this.bosses.forEach(boss => boss.updateBoss(localPlayer.position, alertLevel, dt));
    }

    private checkObjectiveProgress() {
        const localPlayer = this.gameState.players.get(this.gameState.localPlayerId);
        if (!localPlayer) return;
        if (localPlayer.position.x > 320 && localPlayer.position.x < 640 && localPlayer.position.y < 320) {
            ObjectiveSystem.getInstance().completeObjective('entry');
        }
    }

    private handleBossAction(action: any) {
        switch (action.type) {
            case 'lockdown':
                this.gameState.doors.forEach(door => {
                    door.state = 'locked';
                    door.unlockedUntil = Date.now() + 60000;
                });
                break;
            case 'spawn_guards':
                for (let i = 0; i < action.count; i++) {
                    const spawn = { x: 100 + Math.random() * 500, y: 100 + Math.random() * 300 };
                    this.gameState.guards.push({
                        id: `reinforcement-${Date.now()}-${i}`,
                        position: spawn,
                        state: 'searching' as any,
                        patrolPoints: [spawn],
                        currentPatrolIndex: 0,
                        visionAngle: 0,
                        visionRange: 150,
                        visionFOV: Math.PI / 3,
                        speed: 2,
                        alertLevel: 50,
                        lastSeenPlayerPos: null,
                        searchTimer: 10000
                    });
                }
                break;
            case 'network_isolation': {
                const exfil = ExfiltrationSystem.getInstance();
                if (exfil.getActiveExfil()) {
                    exfil.cancelExfiltration();
                    AlertSystem.getInstance().increaseAlert(25);
                }
                break;
            }
            case 'camera_surge':
                this.gameState.cameras.forEach(cam => {
                    cam.rotationSpeed *= 3;
                    this.time.delayedCall(20000, () => { cam.rotationSpeed /= 3; });
                });
                break;
        }
    }

    private createMobileControls() {
        const { width, height } = this.scale;
        this.joystickBase = this.add.circle(100, height - 100, 50, 0xffffff, 0.2).setScrollFactor(0).setDepth(20).setInteractive();
        this.joystickThumb = this.add.circle(100, height - 100, 25, 0xffffff, 0.5).setScrollFactor(0).setDepth(20);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && Phaser.Math.Distance.Between(pointer.x, pointer.y, 100, height - 100) < 100) {
                const angle = Phaser.Math.Angle.Between(100, height - 100, pointer.x, pointer.y);
                const dist = Math.min(50, Phaser.Math.Distance.Between(100, height - 100, pointer.x, pointer.y));
                this.joystickThumb?.setPosition(100 + Math.cos(angle) * dist, (height - 100) + Math.sin(angle) * dist);
                this.game.events.emit('mobile_move', { angle, active: true });
            }
        });
        this.input.on('pointerup', () => {
            this.joystickThumb?.setPosition(100, height - 100);
            this.game.events.emit('mobile_move', { angle: 0, active: false });
        });

        this.actionButton = this.add.circle(width - 100, height - 100, 40, 0x00ff88, 0.3).setScrollFactor(0).setDepth(20).setInteractive();
        this.add.text(width - 110, height - 115, 'E', { fontSize: '32px', color: '#fff' }).setScrollFactor(0).setDepth(20);
        this.actionButton.on('pointerdown', () => this.game.events.emit('mobile_interact'));
    }
}
