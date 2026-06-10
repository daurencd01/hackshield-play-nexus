import { GameState } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';

export interface Objective {
  id: string;
  type: 'primary' | 'secondary' | 'bonus';
  title: string;
  description: string;
  completed: boolean;
  failed: boolean;
  progress?: number;
  maxProgress?: number;
}

export class ObjectiveSystem {
    private static instance: ObjectiveSystem;
    private objectives: Objective[] = [];
    private missionId: string = '';
    private userId: string = '';

    private constructor() {}

    public static getInstance(): ObjectiveSystem {
        if (!ObjectiveSystem.instance) {
            ObjectiveSystem.instance = new ObjectiveSystem();
        }
        return ObjectiveSystem.instance;
    }

    public init(userId: string, missionId: string) {
        this.userId = userId;
        this.missionId = missionId;
        this.objectives = [
            { id: 'entry', type: 'primary', title: 'Find Entry Point', description: 'Reach DMZ zone', completed: false, failed: false },
            { id: 'vpn', type: 'primary', title: 'Hack VPN Gateway', description: 'Interact with VPN terminal', completed: false, failed: false },
            { id: 'privesc', type: 'primary', title: 'Escalate Privileges', description: 'Hack AD terminal', completed: false, failed: false },
            { id: 'evidence', type: 'primary', title: 'Download Evidence', description: 'Complete data exfiltration', completed: false, failed: false },
            { id: 'escape', type: 'primary', title: 'Escape Facility', description: 'Reach Extraction Zone', completed: false, failed: false },
            { id: 'stealth', type: 'secondary', title: 'Stay Undetected', description: 'Alert never exceeds 25', completed: true, failed: false },
            { id: 'cameras', type: 'secondary', title: 'Disable Cameras', description: 'Disable all cameras in a zone', completed: false, failed: false },
            { id: 'intel', type: 'secondary', title: 'Collect Intelligence', description: 'Read all intel documents', completed: false, failed: false, progress: 0, maxProgress: 3 },
            { id: 'no_emp', type: 'bonus', title: 'No EMP Usage', description: 'Complete without using EMP', completed: true, failed: false },
            { id: 'ghost', type: 'bonus', title: 'Ghost Run', description: 'No detection events at all', completed: true, failed: false },
            { id: 'speedrun', type: 'bonus', title: 'Speed Run', description: 'Under 10 minutes', completed: true, failed: false },
        ];
    }

    public getObjectives(): Objective[] {
        return this.objectives;
    }

    public updateObjective(id: string, updates: Partial<Objective>) {
        const obj = this.objectives.find(o => o.id === id);
        if (obj) {
            Object.assign(obj, updates);
            this.saveToSupabase();
        }
    }

    public failObjective(id: string) {
        this.updateObjective(id, { failed: true, completed: false });
    }

    public completeObjective(id: string) {
        this.updateObjective(id, { completed: true, failed: false });
    }

    private async saveToSupabase() {
        if (!this.userId || !this.missionId) return;
        await (supabase.from('mission_progress') as any).upsert({
            user_id: this.userId,
            mission_id: this.missionId,
            objectives: this.objectives,
            completed_at: this.allPrimaryCompleted() ? new Date().toISOString() : null,
            score: this.calculateScore()
        });
    }

    private allPrimaryCompleted(): boolean {
        return this.objectives.filter(o => o.type === 'primary').every(o => o.completed);
    }

    private calculateScore(): number {
        let score = 0;
        this.objectives.forEach(o => {
            if (o.completed) {
                if (o.type === 'primary') score += 500;
                if (o.type === 'secondary') score += 200;
                if (o.type === 'bonus') score += 300;
            }
        });
        return score;
    }
}
