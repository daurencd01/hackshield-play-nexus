export type AlertStage = 'NORMAL' | 'SUSPICIOUS' | 'ACTIVE SEARCH' | 'LOCKDOWN' | 'MISSION FAILED';

export class AlertSystem {
    private static instance: AlertSystem;
    private alertLevel: number = 0;
    private stage: AlertStage = 'NORMAL';
    private lastHiddenTime: number = Date.now();

    private constructor() {}

    public static getInstance(): AlertSystem {
        if (!AlertSystem.instance) {
            AlertSystem.instance = new AlertSystem();
        }
        return AlertSystem.instance;
    }

    public update(dt: number, isPlayerHidden: boolean, isSignalJammerActive: boolean): AlertStage {
        const now = Date.now();
        if (isPlayerHidden) {
            if (now - this.lastHiddenTime > 30000) {
                this.increaseAlert(-(1 * (dt / 1000)));
            }
        } else {
            this.lastHiddenTime = now;
        }
        if (isSignalJammerActive) {
            this.increaseAlert(-(0.5 * (dt / 1000)));
        }
        this.updateStage();
        return this.stage;
    }

    public increaseAlert(amount: number) {
        this.alertLevel = Math.max(0, Math.min(100, this.alertLevel + amount));
        this.updateStage();
    }

    private updateStage() {
        if (this.alertLevel >= 100) this.stage = 'MISSION FAILED';
        else if (this.alertLevel >= 75) this.stage = 'LOCKDOWN';
        else if (this.alertLevel >= 50) this.stage = 'ACTIVE SEARCH';
        else if (this.alertLevel >= 25) this.stage = 'SUSPICIOUS';
        else this.stage = 'NORMAL';
    }

    public getAlertLevel() { return this.alertLevel; }
    public getStage() { return this.stage; }

    public getGuardSpeedMultiplier(): number {
        if (this.stage === 'SUSPICIOUS') return 1.2;
        if (this.stage === 'ACTIVE SEARCH') return 1.4;
        if (this.stage === 'LOCKDOWN') return 1.6;
        return 1.0;
    }

    public getCameraRotationMultiplier(): number {
        if (this.stage === 'SUSPICIOUS') return 1.5;
        if (this.stage === 'ACTIVE SEARCH') return 2.0;
        if (this.stage === 'LOCKDOWN') return 3.0;
        return 1.0;
    }
}
