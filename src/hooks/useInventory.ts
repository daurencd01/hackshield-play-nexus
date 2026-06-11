import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    quantity: number;
}

export function useInventory(userId: string | undefined) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadInventory = async () => {
        if (!userId) return;
        setLoading(true);
        const { data, error } = await (supabase
            .from('user_inventory') as any)
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            setInventory(data.map((item: any) => ({
                id: item.item_id,
                name: getItemName(item.item_id),
                description: getItemDescription(item.item_id),
                cost: getItemCost(item.item_id),
                quantity: item.quantity
            })));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadInventory();
    }, [userId]);

    const purchaseItem = async (itemId: string, cost: number) => {
        if (!userId) return false;

        const { error: xpError } = await (supabase as any).rpc('increment_xp', { xp_to_add: -cost });
        if (xpError) return false;

        const existing = inventory.find(i => i.id === itemId);
        if (existing) {
            await (supabase
                .from('user_inventory') as any)
                .update({ quantity: existing.quantity + 1 })
                .eq('user_id', userId)
                .eq('item_id', itemId);
        } else {
            await (supabase
                .from('user_inventory') as any)
                .insert({ user_id: userId, item_id: itemId, quantity: 1 });
        }

        await loadInventory();
        return true;
    };

    return { inventory, loading, purchaseItem, refresh: loadInventory };
}

function getItemName(id: string) {
    const names: any = { emp: 'EMP Device', jammer: 'Signal Jammer', badge: 'Fake Badge', usb: 'USB Drop', sniffer: 'Network Sniffer' };
    return names[id] || id;
}

function getItemDescription(id: string) {
    const descs: any = {
        emp: 'Disables cameras and doors in 200px radius for 30s',
        jammer: 'Reduces alert gain by 50% and decays alert by 0.5/s for 60s',
        badge: 'Guards ignore you for 45s (breaks if you run/hack)',
        usb: 'Auto-hack terminal in 10s',
        sniffer: 'Reveals all terminals and guard routes for 120s'
    };
    return descs[id] || '';
}

function getItemCost(id: string) {
    const costs: any = { emp: 500, jammer: 300, badge: 400, usb: 200, sniffer: 350 };
    return costs[id] || 0;
}
