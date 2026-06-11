import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Skill {
    id: string;
    level: number;
}

export function useSkills(userId: string | undefined) {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSkills = async () => {
        if (!userId) return;
        setLoading(true);
        const { data, error } = await (supabase
            .from('user_skills') as any)
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            setSkills(data.map((s: any) => ({
                id: s.skill_id,
                level: s.level
            })));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSkills();
    }, [userId]);

    const unlockSkill = async (skillId: string, cost: number) => {
        if (!userId) return false;

        const currentSkill = skills.find(s => s.id === skillId);
        const nextLevel = (currentSkill?.level || 0) + 1;
        if (nextLevel > 5) return false;

        const { error: xpError } = await (supabase as any).rpc('increment_xp', { xp_to_add: -cost });
        if (xpError) return false;

        await (supabase
            .from('user_skills') as any)
            .upsert({
                user_id: userId,
                skill_id: skillId,
                level: nextLevel,
                unlocked_at: new Date().toISOString()
            }, { onConflict: 'user_id,skill_id' });

        await loadSkills();
        return true;
    };

    return { skills, loading, unlockSkill, refresh: loadSkills };
}
