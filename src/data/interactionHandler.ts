import { GameObject } from './roomGenerator';
import { RoomTask } from './gameData';
import { Quiz } from '@/types/quiz';

export interface InteractionResult {
  type: 'none' | 'health' | 'xp' | 'speed' | 'key' | 'open_task' | 'next_room' | 'locked';
  value?: number;
  task?: RoomTask | Quiz;
  objectId?: string;
}

export function handleInteraction(obj: GameObject, hasKeyCard: boolean): InteractionResult {
  switch (obj.type) {
    case 'health_pack':
      if (obj.collected) return { type: 'none' };
      obj.collected = true;
      return { type: 'health', value: obj.lootValue! };
    case 'data_chip':
      if (obj.collected) return { type: 'none' };
      obj.collected = true;
      return { type: 'xp', value: obj.lootValue! };
    case 'energy_cell':
      if (obj.collected) return { type: 'none' };
      obj.collected = true;
      return { type: 'speed', value: obj.lootValue! };
    case 'key_card':
      if (obj.collected) return { type: 'none' };
      obj.collected = true;
      return { type: 'key' };
    case 'terminal':
    case 'firewall':
    case 'database':
    case 'router':
    case 'camera':
    case 'safe':
      return { type: 'open_task', task: obj.task, objectId: obj.id };
    case 'door':
      return { type: 'next_room' };
    case 'locked_door':
      if (hasKeyCard) {
        return { type: 'next_room' };
      }
      return { type: 'locked' };
    default:
      return { type: 'none' };
  }
}
