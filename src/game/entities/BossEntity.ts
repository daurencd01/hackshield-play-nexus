import * as Phaser from 'phaser';
import { Vec2 } from '@/types/game';
import { AlertSystem } from '@/game/systems/AlertSystem';

export type BossState = 'IDLE' | 'ACTIVE' | 'HUNTING' | 'COOLDOWN';

export class BossEntity extends Phaser.Physics.Arcade.Sprite {
    public bossId: string;
    public bossType: 'SOC_MANAGER' | 'IRT' | 'AI';
    public stateMachine: BossState = 'IDLE';
    private abilityTimer: Phaser.Time.TimerEvent | null = null;
    private lastKnownPlayerPos: Vec2 | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, bossId: string, type: 'SOC_MANAGER' | 'IRT' | 'AI') {
        const texture = type === 'SOC_MANAGER' ? 'boss_soc' : 'boss_irt';
        super(scene, x, y, texture);
        this.bossId = bossId;
        this.bossType = type;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (type === 'AI') {
            this.setVisible(false);
            if (this.body) {
                this.body.enable = false;
            }
        }
    }

    public updateBoss(playerPos: Vec2, alertLevel: number, dt: number) {
        if (this.stateMachine === 'IDLE') {
            const threshold = this.bossType === 'SOC_MANAGER' ? 50 : (this.bossType === 'IRT' ? 60 : 70);
            if (alertLevel >= threshold) {
                this.stateMachine = 'ACTIVE';
                this.startAbilityLoop();
            }
            return;
        }

        if (this.bossType === 'IRT') {
            this.handleIRTHunting(playerPos);
        } else if (this.bossType === 'SOC_MANAGER') {
            this.handleSOCPatrol();
        }
    }

    private startAbilityLoop() {
        this.abilityTimer = this.scene.time.addEvent({
            delay: this.bossType === 'AI' ? 30000 : (this.bossType === 'SOC_MANAGER' ? 45000 : 60000),
            callback: this.useAbility,
            callbackScope: this,
            loop: true
        });
    }

    private useAbility() {
        if (this.stateMachine === 'COOLDOWN') return;

        switch (this.bossType) {
            case 'SOC_MANAGER':
                this.useSOCAbility();
                break;
            case 'IRT':
                this.useIRTAbility();
                break;
            case 'AI':
                this.useAIAbility();
                break;
        }
    }

    private useSOCAbility() {
        const alertLevel = AlertSystem.getInstance().getAlertLevel();
        if (alertLevel >= 75) {
            // Lockdown: Lock all doors in wing (simulated by state update)
            this.scene.events.emit('boss_action', { type: 'lockdown', wing: 'SOC' });
        } else {
            // Reinforcements: Spawn extra guards
            this.scene.events.emit('boss_action', { type: 'spawn_guards', count: 2 });
        }
        AlertSystem.getInstance().increaseAlert(10);
    }

    private useIRTAbility() {
        // IRT Members sweep/disable
        this.scene.events.emit('boss_action', { type: 'disable_terminal' });
    }

    private useAIAbility() {
        const abilities = ['reroute_guards', 'disable_vents', 'network_isolation', 'camera_surge'];
        const choice = abilities[Math.floor(Math.random() * abilities.length)];
        this.scene.events.emit('boss_action', { type: choice });
    }

    private handleIRTHunting(playerPos: Vec2) {
        this.stateMachine = 'HUNTING';
        this.scene.physics.moveToObject(this, playerPos, 120);
        this.setRotation(Phaser.Math.Angle.BetweenPoints(this, playerPos));
    }

    private handleSOCPatrol() {
        // Simple circle patrol for SOC Manager
        const time = this.scene.time.now / 1000;
        const radius = 100;
        const centerX = 500;
        const centerY = 300;
        this.x = centerX + Math.cos(time) * radius;
        this.y = centerY + Math.sin(time) * radius;
    }
}
