export class SkillSystem {
    private static instance: SkillSystem;
    private skills: Map<string, number> = new Map();

    private constructor() {}

    public static getInstance(): SkillSystem {
        if (!SkillSystem.instance) {
            SkillSystem.instance = new SkillSystem();
        }
        return SkillSystem.instance;
    }

    public init(userSkills: { id: string, level: number }[]) {
        this.skills.clear();
        userSkills.forEach(s => this.skills.set(s.id, s.level));
    }

    public getSkillLevel(skillId: string): number {
        return this.skills.get(skillId) || 0;
    }

    public getGuardDetectionRangeMultiplier(): number {
        const level = this.getSkillLevel('stealth');
        if (level >= 5) return 0.5;
        if (level >= 3) return 0.75;
        if (level >= 1) return 0.9;
        return 1.0;
    }

    public getExfiltrationSpeedMultiplier(): number {
        const level = this.getSkillLevel('networking');
        if (level >= 2) return 1.15;
        return 1.0;
    }

    public getHackTimeMultiplier(): number {
        const level = this.getSkillLevel('networking');
        if (level >= 5) return 0.5;
        if (level >= 3) return 0.75;
        if (level >= 1) return 0.9;
        return 1.0;
    }

    public getXpMultiplier(): number {
        const level = this.getSkillLevel('forensics');
        if (level >= 5) return 1.5;
        if (level >= 3) return 1.25;
        if (level >= 1) return 1.1;
        return 1.0;
    }
}
