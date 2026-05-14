import { ROOM_PROGRESSION } from './gameData';
import { getTaskForRoom, RoomTask } from './gameData';
import { Quiz } from '@/types/quiz';

export type ObjectType = 
  | 'terminal' | 'firewall' | 'database' | 'router' | 'camera' | 'safe'
  | 'usb_drive' | 'data_chip' | 'health_pack' | 'energy_cell' | 'key_card'
  | 'laser_trap' | 'mine' | 'turret' | 'electric_panel'
  | 'wall' | 'glass_wall' | 'door' | 'locked_door'
  | 'server_rack' | 'monitor' | 'cable' | 'warning_sign' | 'pipe' | 'vent'
  | 'guard' | 'hiding_spot';

export interface GameObject {
  id: string;
  type: ObjectType;
  x: number; y: number;
  width: number; height: number;
  interactive?: boolean;
  hacked?: boolean;
  completed?: boolean;
  collected?: boolean;
  destroyed?: boolean;
  task?: Quiz | RoomTask;
  damage?: number;
  damageInterval?: number;
  lastDamageTime?: number;
  shootInterval?: number;
  lastShotTime?: number;
  range?: number;
  active?: boolean;
  activationPattern?: 'always' | 'periodic' | 'proximity';
  period?: number;
  lootType?: 'xp' | 'health' | 'speed' | 'shield' | 'key';
  lootValue?: number;
  animPhase?: number;
  rotation?: number;
  w?: number; // compat
  h?: number; // compat
  
  // Stealth & Camera props
  rotationAngle?: number;
  rotationSpeed?: number;
  rotationRange?: number;
  baseAngle?: number;
  rotationDirection?: 1 | -1;
  detectionLevel?: number;
  detectionState?: 'idle' | 'suspicious' | 'detected';
  detectionRate?: number;
  forgetRate?: number;
  detectionCone?: { range: number; angle: number };
  
  // Guard props
  state?: 'spawning' | 'chasing' | 'searching' | 'returning';
  speed?: number;
  targetX?: number; targetY?: number;
  spawnX?: number; spawnY?: number;
  catchRadius?: number;
  searchTimer?: number;
  alertedBy?: string;
}

export function generateRoomContent(roomIndex: number, canvasW: number, canvasH: number, task?: Quiz | RoomTask): GameObject[] {
  const config = ROOM_PROGRESSION[roomIndex] || ROOM_PROGRESSION[0];
  const objects: GameObject[] = [];
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;

  // Varied Terminal Position - Ensure it doesn't overlap spawn (64, 200)
  let termX = centerX + (Math.sin(roomIndex * 1.5) * 100) - 30;
  let termY = centerY + (Math.cos(roomIndex * 2.1) * 80) - 25;
  
  // Keep terminal away from left wall where player spawns
  if (termX < 150) termX += 100;

  objects.push({
    id: `terminal_${roomIndex}`, type: 'terminal',
    x: termX, y: termY, width: 60, height: 50, w: 60, h: 50,
    interactive: true, hacked: false, completed: false,
    task: task || getTaskForRoom(roomIndex)
  });

  // Laser Ring around terminal for difficulty > 1
  if (config.difficulty > 1) {
    // Top laser
    objects.push({
      id: `term_laser_t_${roomIndex}`, type: 'laser_trap',
      x: termX - 10, y: termY - 40, width: 80, height: 10, w: 80, h: 10,
      period: 3, animPhase: 0, active: true
    });
    // Bottom laser
    objects.push({
      id: `term_laser_b_${roomIndex}`, type: 'laser_trap',
      x: termX - 10, y: termY + 80, width: 80, height: 10, w: 80, h: 10,
      period: 3, animPhase: 1.5, active: true
    });
  }

  const requiresKey = roomIndex >= 4;
  objects.push({
    id: `door_${roomIndex}`, type: requiresKey ? 'locked_door' : 'door',
    x: canvasW - 50, y: centerY - 30, width: 30, height: 60, w: 30, h: 60,
    interactive: true, completed: false
  });

  for (let i = 0; i < config.hazards.cameras; i++) {
    const baseAngle = (i % 2 === 0) ? Math.PI / 2 : Math.PI;
    objects.push({
      id: `cam_${roomIndex}_${i}`, type: 'camera',
      x: 100 + (i * 200 + roomIndex * 50) % (canvasW - 200), y: 40, width: 24, height: 24, w: 24, h: 24,
      hacked: false, interactive: true,
      rotationAngle: baseAngle,
      baseAngle: baseAngle,
      rotationSpeed: 0.5 + Math.random() * 0.5,
      rotationRange: Math.PI / 3,
      rotationDirection: 1,
      detectionLevel: 0,
      detectionState: 'idle',
      detectionRate: 40,
      forgetRate: 20,
      detectionCone: { range: 180, angle: Math.PI / 3 }
    });
  }

  // Add hiding spots for rooms with difficulty > 2
  if (config.difficulty >= 2) {
    objects.push({
      id: `hiding_${roomIndex}`, type: 'hiding_spot',
      x: 150 + Math.random() * (canvasW - 300), y: 50 + Math.random() * (canvasH - 100),
      width: 40, height: 40, w: 40, h: 40
    });
  }

  for (let i = 0; i < config.hazards.lasers; i++) {
    const yPos = 100 + (i * 80 + roomIndex * 30) % (canvasH - 200);
    // Keep lasers away from spawn corridor
    if (Math.abs(yPos - 200) < 40) continue; 

    objects.push({
      id: `laser_${roomIndex}_${i}`, type: 'laser_trap',
      x: 150, y: yPos, width: 300, height: 20, w: 300, h: 20,
      period: Math.max(1.5, 4 - config.difficulty * 0.5),
      animPhase: i * 0.5 + roomIndex * 0.2,
      active: true
    });
  }

  for (let i = 0; i < config.hazards.turrets; i++) {
    objects.push({
      id: `turret_${roomIndex}_${i}`, type: 'turret',
      x: 200 + (i * 200 + roomIndex * 40) % (canvasW - 300), y: canvasH - 80, width: 24, height: 24, w: 24, h: 24,
      shootInterval: Math.max(800, 2500 - config.difficulty * 300),
      range: 200, destroyed: false
    });
  }

  const healthPacks = config.difficulty >= 3 ? Math.floor(config.difficulty / 2) : 0;
  for (let i = 0; i < healthPacks; i++) {
    objects.push({
      id: `hp_${roomIndex}_${i}`, type: 'health_pack',
      x: 150 + Math.random() * (canvasW - 200), y: 60 + Math.random() * (canvasH - 120),
      width: 20, height: 20, w: 20, h: 20, collected: false, lootType: 'health', lootValue: 25
    });
  }

  const chipCount = 2 + config.difficulty;
  for (let i = 0; i < chipCount; i++) {
    objects.push({
      id: `chip_${roomIndex}_${i}`, type: 'data_chip',
      x: 120 + Math.random() * (canvasW - 200), y: 80 + Math.random() * (canvasH - 160),
      width: 16, height: 16, w: 16, h: 16, collected: false, lootType: 'xp', lootValue: 15, animPhase: Math.random() * Math.PI * 2
    });
  }

  if (config.difficulty >= 2) {
    objects.push({
      id: `energy_${roomIndex}`, type: 'energy_cell',
      x: 150 + Math.random() * (canvasW - 250), y: 100 + Math.random() * (canvasH - 200),
      width: 16, height: 20, w: 16, h: 20, collected: false, lootType: 'speed', lootValue: 1.5
    });
  }

  if (requiresKey) {
    objects.push({
      id: `key_${roomIndex}`, type: 'key_card',
      x: 200, y: canvasH - 60, width: 24, height: 16, w: 24, h: 16,
      collected: false, lootType: 'key'
    });
  }

  // Random Server Racks - Keep away from spawn zone (30-100, 150-250)
  const rackCount = 3 + (roomIndex % 3);
  for (let i = 0; i < rackCount; i++) {
    let rx = 30;
    let ry = 40 + i * 90;
    // If it overlaps the Y spawn area (200), move it up or down
    if (Math.abs(ry + 30 - 200) < 60) {
       ry = (ry < 200) ? 50 : 300;
    }
    objects.push({
      id: `rack_${roomIndex}_${i}`, type: 'server_rack',
      x: rx, y: ry, width: 30, height: 60, w: 30, h: 60
    });
  }

  const monCount = 1 + (roomIndex % 2);
  for (let i = 0; i < monCount; i++) {
    objects.push({
      id: `mon_${roomIndex}_${i}`, type: 'monitor',
      x: canvasW - 80, y: 60 + i * 180, width: 40, height: 28, w: 40, h: 28
    });
  }

  if (config.difficulty >= 3) {
    objects.push({
      id: `warn_${roomIndex}`, type: 'warning_sign',
      x: canvasW / 2, y: 30, width: 24, height: 22, w: 24, h: 22
    });
  }

  return objects;
}
