import { GameState, Terminal, Player } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { ObjectiveSystem } from './ObjectiveSystem';
import { SkillSystem } from './SkillSystem';

export interface ExfiltrationOption {
    id: string;
    label: string;
    sizeGB: number;
    durationSec: number;
    xpReward: number;
    alertIncrease: number;
}

export const EXFIL_OPTIONS: ExfiltrationOption[] = [
    { id: 'a', label: 'Option A: 50 GB', sizeGB: 50, durationSec: 30, xpReward: 500, alertIncrease: 15 },
    { id: 'b', label: 'Option B: 100 GB', sizeGB: 100, durationSec: 60, xpReward: 1000, alertIncrease: 30 },
    { id: 'c', label: 'Option C: 200 GB', sizeGB: 200, durationSec: 120, xpReward: 2000, alertIncrease: 60 },
];

export class ExfiltrationSystem {
    private static instance: ExfiltrationSystem;
    private activeExfil: {
        terminalId: string;
        option: ExfiltrationOption;
        progress: number;
        isPaused: boolean;
        startTime: number;
    } | null = null;

    private constructor() {}

    public static getInstance(): ExfiltrationSystem {
        if (!ExfiltrationSystem.instance) {
            ExfiltrationSystem.instance = new ExfiltrationSystem();
        }
        return ExfiltrationSystem.instance;
    }

    public startExfiltration(terminalId: string, option: ExfiltrationOption) {
        this.activeExfil = {
            terminalId,
            option,
            progress: 0,
            isPaused: false,
            startTime: Date.now()
        };
    }

    public update(dt: number, playerPos: { x: number; y: number }, terminalPos: { x: number; y: number }, onComplete: (xp: number) => void) {
        if (!this.activeExfil) return;
        const dist = Math.sqrt(Math.pow(playerPos.x - terminalPos.x, 2) + Math.pow(playerPos.y - terminalPos.y, 2));
        if (dist > 64) {
            this.activeExfil.isPaused = true;
            return;
        }
        this.activeExfil.isPaused = false;
        const speedMultiplier = SkillSystem.getInstance().getExfiltrationSpeedMultiplier();
        const totalMs = this.activeExfil.option.durationSec * 1000;
        const progressInc = (dt / totalMs) * 100 * speedMultiplier;
        this.activeExfil.progress = Math.min(100, this.activeExfil.progress + progressInc);

        if (this.activeExfil.progress >= 100) {
            const xp = this.activeExfil.option.xpReward;
            ObjectiveSystem.getInstance().completeObjective('evidence');
            this.activeExfil = null;
            onComplete(xp);
        }
    }

    public getActiveExfil() {
        return this.activeExfil;
    }

    public cancelExfiltration() {
        this.activeExfil = null;
    }
}
