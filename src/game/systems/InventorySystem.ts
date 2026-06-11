import { AlertSystem } from './AlertSystem';

export interface ActiveEffect {
    itemId: string;
    expiresAt: number;
}

export class InventorySystem {
    private static instance: InventorySystem;
    private items: Map<string, number> = new Map();
    private activeEffects: ActiveEffect[] = [];

    private constructor() {}

    public static getInstance(): InventorySystem {
        if (!InventorySystem.instance) {
            InventorySystem.instance = new InventorySystem();
        }
        return InventorySystem.instance;
    }

    public init(initialItems: { item_id: string, quantity: number }[]) {
        this.items.clear();
        initialItems.forEach(i => this.items.set(i.item_id, i.quantity));
    }

    public useItem(itemId: string): boolean {
        const qty = this.items.get(itemId) || 0;
        if (qty <= 0) return false;
        this.items.set(itemId, qty - 1);
        switch (itemId) {
            case 'emp':
                this.activateEffect('emp', 30000);
                AlertSystem.getInstance().increaseAlert(5);
                break;
            case 'jammer':
                this.activateEffect('jammer', 60000);
                break;
            case 'badge':
                this.activateEffect('badge', 45000);
                break;
            case 'usb':
                this.activateEffect('usb', 10000);
                break;
            case 'sniffer':
                this.activateEffect('sniffer', 120000);
                break;
        }
        return true;
    }

    private activateEffect(itemId: string, durationMs: number) {
        this.activeEffects.push({ itemId, expiresAt: Date.now() + durationMs });
    }

    public update(dt: number) {
        const now = Date.now();
        this.activeEffects = this.activeEffects.filter(e => e.expiresAt > now);
    }

    public isEffectActive(itemId: string): boolean {
        return this.activeEffects.some(e => e.itemId === itemId);
    }

    public getItems() {
        return Array.from(this.items.entries()).map(([id, qty]) => ({ id, qty }));
    }
}
