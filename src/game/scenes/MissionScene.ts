import * as Phaser from 'phaser';
import { GameState } from '@/types/game';
import { ObjectiveSystem } from '@/game/systems/ObjectiveSystem';
import { BossEntity } from '@/game/entities/BossEntity';
import { AlertSystem } from '@/game/systems/AlertSystem';
import { ExfiltrationSystem } from '@/game/systems/ExfiltrationSystem';

export class MissionScene extends Phaser.Scene {
    private playerSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private guardSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private cameraSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private bosses: Map<string, BossEntity> = new Map();
    private gameState!: GameState;
    private map!: Phaser.Tilemaps.Tilemap;
    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickThumb?: Phaser.GameObjects.Arc;
    private actionButton?: Phaser.GameObjects.Arc;

    constructor() {
        super('MissionScene');
    }

    init(data: { gameState: GameState }) {
        this.gameState = data.gameState;
        this.events.on('shutdown', this.shutdown, this);
    }

    private shutdown() {
        this.sys.events.removeAllListeners();
        this.playerSprites.clear();
        this.guardSprites.clear();
        this.cameraSprites.clear();
        this.bosses.clear();
    }

    create() {
        this.createMap();
        this.setupCamera();
        if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
            this.createMobileControls();
        }

        this.events.on('boss_action', this.handleBossAction, this);
    }

    private handleBossAction(action: any) {
        switch (action.type) {
            case 'lockdown':
                // Actually lock all doors in the current room
                this.gameState.doors.forEach(door => {
                    door.state = 'locked';
                    door.unlockedUntil = Date.now() + 60000;
                });
                break;
            case 'spawn_guards':
                for (let i = 0; i < action.count; i++) {
                    const spawn = { x: 100 + Math.random() * 500, y: 100 + Math.random() * 300 };
                    const newGuard = {
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
                    };
                    this.gameState.guards.push(newGuard);
                }
                break;
            case 'network_isolation':
                // Cancel active exfiltration
                const exfil = ExfiltrationSystem.getInstance();
                if (exfil.getActiveExfil()) {
                    exfil.cancelExfiltration();
                    AlertSystem.getInstance().increaseAlert(25);
                }
                break;
            case 'camera_surge':
                // Speed up all cameras
                this.gameState.cameras.forEach(cam => {
                    cam.rotationSpeed *= 3;
                    this.time.delayedCall(20000, () => {
                        cam.rotationSpeed /= 3;
                    });
                });
                break;
        }
    }

    update(time: number, delta: number) {
        this.updatePlayers();
        this.updateGuards();
        this.updateCameras();
        this.updateBosses(delta);
        this.checkObjectiveProgress();
    }

    private createMap() {
        const mapWidth = 40;
        const mapHeight = 30;
        this.map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: mapWidth, height: mapHeight });
        const floorTileset = this.map.addTilesetImage('floor_default', 'floor_default');
        const wallTileset = this.map.addTilesetImage('wall', 'wall');
        const floorLayer = this.map.createBlankLayer('Floor', floorTileset!);
        const wallLayer = this.map.createBlankLayer('Walls', wallTileset!);
        floorLayer?.fill(0, 0, 0, mapWidth, mapHeight);
        this.addWallBorders(wallLayer!);
    }

    private addWallBorders(layer: Phaser.Tilemaps.TilemapLayer) {
        for(let x=0; x<layer.tilemap.width; x++) {
            layer.putTileAt(0, x, 0);
            layer.putTileAt(0, x, layer.tilemap.height - 1);
        }
        for(let y=0; y<layer.tilemap.height; y++) {
            layer.putTileAt(0, 0, y);
            layer.putTileAt(0, layer.tilemap.width - 1, y);
        }
    }

    private setupCamera() {
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }

    private createMobileControls() {
        const { width, height } = this.scale;

        this.joystickBase = this.add.circle(100, height - 100, 50, 0xffffff, 0.2).setScrollFactor(0).setInteractive();
        this.joystickThumb = this.add.circle(100, height - 100, 25, 0xffffff, 0.5).setScrollFactor(0);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && Phaser.Math.Distance.Between(pointer.x, pointer.y, 100, height - 100) < 100) {
                const angle = Phaser.Math.Angle.Between(100, height - 100, pointer.x, pointer.y);
                const dist = Math.min(50, Phaser.Math.Distance.Between(100, height - 100, pointer.x, pointer.y));
                this.joystickThumb?.setPosition(100 + Math.cos(angle) * dist, (height - 100) + Math.sin(angle) * dist);

                const localPlayer = this.playerSprites.get(this.gameState.localPlayerId);
                if (localPlayer) {
                    const speed = 3;
                    localPlayer.setVelocity(Math.cos(angle) * speed * 50, Math.sin(angle) * speed * 50);
                    localPlayer.setRotation(angle);
                }
            }
        });

        this.input.on('pointerup', () => {
            this.joystickThumb?.setPosition(100, height - 100);
            const localPlayer = this.playerSprites.get(this.gameState.localPlayerId);
            if (localPlayer) localPlayer.setVelocity(0, 0);
        });

        this.actionButton = this.add.circle(width - 100, height - 100, 40, 0x00ff88, 0.3).setScrollFactor(0).setInteractive();
        this.add.text(width - 110, height - 115, 'E', { fontSize: '32px', color: '#fff' }).setScrollFactor(0);

        this.actionButton.on('pointerdown', () => {
            this.game.events.emit('mobile_interact');
        });
    }

    private updatePlayers() {
        this.gameState.players.forEach((p, id) => {
            let sprite = this.playerSprites.get(id);
            if (!sprite) {
                sprite = this.physics.add.sprite(p.position.x, p.position.y, 'player');
                this.playerSprites.set(id, sprite);
                if (id === this.gameState.localPlayerId) this.cameras.main.startFollow(sprite);
            }
            sprite.setPosition(p.position.x, p.position.y);
            sprite.setRotation(p.facing);
        });
    }

    private updateGuards() {
        const camera = this.cameras.main;
        this.gameState.guards.forEach(g => {
            let sprite = this.guardSprites.get(g.id);
            if (!sprite) {
                sprite = this.physics.add.sprite(g.position.x, g.position.y, 'guard');
                this.guardSprites.set(g.id, sprite);
            }
            sprite.setPosition(g.position.x, g.position.y);
            sprite.setRotation(g.visionAngle);

            // Performance: Disable physics if outside camera view
            const isVisible = camera.worldView.contains(g.position.x, g.position.y);
            if (sprite.body) {
                (sprite.body as Phaser.Physics.Arcade.Body).enable = isVisible;
            }
        });
    }

    private updateCameras() {
        this.gameState.cameras.forEach(c => {
            let sprite = this.cameraSprites.get(c.id);
            if (!sprite) {
                sprite = this.physics.add.sprite(c.position.x, c.position.y, 'camera');
                this.cameraSprites.set(c.id, sprite);
            }
            sprite.setRotation(c.rotationAngle);
        });
    }

    private updateBosses(dt: number) {
        const localPlayer = this.gameState.players.get(this.gameState.localPlayerId);
        if (!localPlayer) return;

        const alertLevel = AlertSystem.getInstance().getAlertLevel();

        // Spawn Bosses if needed (example logic)
        if (this.gameState.currentRoomId === 15 && !this.bosses.has('soc-manager')) {
            const boss = new BossEntity(this, 500, 300, 'soc-manager', 'SOC_MANAGER');
            this.bosses.set('soc-manager', boss);
        }

        this.bosses.forEach(boss => {
            boss.updateBoss(localPlayer.position, alertLevel, dt);
        });
    }

    private checkObjectiveProgress() {
        const localPlayer = this.gameState.players.get(this.gameState.localPlayerId);
        if (!localPlayer) return;
        if (localPlayer.position.x > 320 && localPlayer.position.x < 640 && localPlayer.position.y < 320) {
            ObjectiveSystem.getInstance().completeObjective('entry');
        }
    }

    updateExternalState(newState: GameState) {
        this.gameState = newState;
    }
}
