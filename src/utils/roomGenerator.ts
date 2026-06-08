import { RoomConfig, Vec2, Guard, Camera, Door, Terminal, Laser } from '@/types/game';

// Seeded random number generator
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const ROOM_CONFIG_METADATA: Record<number, Partial<RoomConfig>> = {
  0: { name: "Training Ground", theme: "tutorial", difficulty: "tutorial" },
  1: { name: "Startup Office", theme: "office", difficulty: "easy" },
  2: { name: "Warehouse Complex", theme: "warehouse", difficulty: "easy" },
  3: { name: "IT Department", theme: "office", difficulty: "medium" },
  4: { name: "NovaTech Server Room", theme: "datacenter", difficulty: "medium" },
  5: { name: "Finance Floor", theme: "bank", difficulty: "medium" },
  6: { name: "Data Vault", theme: "archive", difficulty: "hard" },
  7: { name: "R&D Lab", theme: "lab", difficulty: "hard" },
  8: { name: "Laser Labyrinth", theme: "security", difficulty: "hard" },
  9: { name: "Underground Parking", theme: "garage", difficulty: "hard" },
  10: { name: "Corporate Hub", theme: "office", difficulty: "expert" },
  11: { name: "Crypto Exchange", theme: "finance", difficulty: "expert" },
  12: { name: "Telecom Hub", theme: "telecom", difficulty: "expert" },
  13: { name: "Biotech Lab", theme: "bio", difficulty: "expert" },
  14: { name: "Military Checkpoint", theme: "military", difficulty: "expert" },
  15: { name: "Ministry Bunker", theme: "underground", difficulty: "boss" },
  16: { name: "Satellite Center", theme: "space", difficulty: "boss" },
  17: { name: "High-Security Prison", theme: "prison", difficulty: "boss" },
  18: { name: "Secret Research Facility", theme: "research", difficulty: "boss" },
  19: { name: "Cyber Command", theme: "military", difficulty: "boss" },
  20: { name: "Black Vault", theme: "final", difficulty: "boss" },
};

export function generateRoom(roomId: number): RoomConfig {
  const meta = ROOM_CONFIG_METADATA[roomId] || ROOM_CONFIG_METADATA[0];
  const rng = mulberry32(roomId * 1000 + 42);
  
  const width = 700;
  const height = 500;
  const cellSize = 50;
  
  const room: RoomConfig = {
    id: roomId,
    name: meta.name!,
    description: `Secure facility: ${meta.name}`,
    theme: meta.theme!,
    difficulty: meta.difficulty as any,
    width,
    height,
    backgroundColor: getThemeColor(meta.theme!),
    walls: [],
    shadows: [],
    spawnPoints: [
      { x: 50, y: height / 2 }, // solo
      { x: 50, y: height / 2 - 40 }, // p1
      { x: 50, y: height / 2 + 40 }, // p2
    ],
    exitPoint: { x: width - 50, y: height / 2 },
    guards: [],
    cameras: [],
    doors: [],
    terminals: [],
    lasers: [],
    collectibles: [],
    ventilation: [],
    alarmButtons: [],
    objective: "Hack the main terminal and reach the exit."
  };

  // Basic Layout: Border Walls
  room.walls.push({ x: 0, y: 0, w: width, h: 20 }); // Top
  room.walls.push({ x: 0, y: height - 20, w: width, h: 20 }); // Bottom
  room.walls.push({ x: 0, y: 0, w: 20, h: height }); // Left
  room.walls.push({ x: width - 20, y: 0, w: 20, h: height }); // Right

  // Generate Internal Walls based on difficulty
  const wallCount = 2 + Math.floor(roomId / 3);
  for (let i = 0; i < wallCount; i++) {
    const isHorizontal = rng() > 0.5;
    const wx = Math.floor(rng() * (width / cellSize - 4) + 2) * cellSize;
    const wy = Math.floor(rng() * (height / cellSize - 4) + 2) * cellSize;
    const len = Math.floor(rng() * 3 + 2) * cellSize;
    
    room.walls.push({
      x: wx,
      y: wy,
      w: isHorizontal ? len : 20,
      h: isHorizontal ? 20 : len
    });
    
    // Add a door in the wall sometimes
    if (rng() > 0.3) {
        room.doors.push({
            position: { x: isHorizontal ? wx + len/2 - 15 : wx - 5, y: isHorizontal ? wy - 5 : wy + len/2 - 15 },
            width: isHorizontal ? 30 : 30,
            height: isHorizontal ? 30 : 30,
            state: rng() > 0.7 ? 'locked' : 'closed',
            isHorizontal: isHorizontal,
            unlockedUntil: 0
        });
    }
  }

  // Add Cameras
  const cameraCount = Math.min(1 + Math.floor(roomId / 2), 15);
  for (let i = 0; i < cameraCount; i++) {
    room.cameras.push({
        position: { x: rng() * (width - 100) + 50, y: rng() * (height - 100) + 50 },
        state: 'active',
        hackedUntil: 0,
        rotationAngle: rng() * Math.PI * 2,
        rotationSpeed: 0.01 + rng() * 0.02,
        rotationRange: [-Math.PI / 4, Math.PI / 4],
        visionRange: 150,
        visionFOV: Math.PI / 3, // 60 degrees
        detectionTimer: 0
    });
  }

  // Add Guards (starting from room 1)
  if (roomId > 0) {
    const guardCount = Math.min(Math.floor(roomId / 2), 12);
    for (let i = 0; i < guardCount; i++) {
      const p1 = { x: rng() * (width - 200) + 100, y: rng() * (height - 200) + 100 };
      const p2 = { x: p1.x + (rng() - 0.5) * 200, y: p1.y + (rng() - 0.5) * 200 };
      room.guards.push({
        position: { ...p1 },
        state: 'patrol',
        patrolPoints: [p1, p2],
        currentPatrolIndex: 0,
        visionAngle: 0,
        visionRange: 120,
        visionFOV: Math.PI / 3,
        speed: 1.5,
        alertLevel: 0,
        lastSeenPlayerPos: null,
        searchTimer: 0
      });
    }
  }

  // Add Terminals
  const terminalCount = 1 + Math.floor(roomId / 5);
  for (let i = 0; i < terminalCount; i++) {
      room.terminals.push({
          position: { x: width - 100 - (i * 40), y: 100 + (rng() * (height - 200)) },
          isMainObjective: i === 0,
          isHacked: false,
          hackProgress: 0
      });
  }

  // Add Lasers (from room 2)
  if (roomId >= 2) {
      const laserCount = Math.min(Math.floor(roomId / 3), 10);
      for (let i = 0; i < laserCount; i++) {
          const isVert = rng() > 0.5;
          const lx = rng() * (width - 200) + 100;
          const ly = rng() * (height - 200) + 100;
          room.lasers.push({
              start: { x: lx, y: ly },
              end: { x: isVert ? lx : lx + 150, y: isVert ? ly + 150 : ly },
              isActive: true,
              triggersAlarm: true,
              blinkPattern: rng() > 0.7 ? { onMs: 2000, offMs: 1000 } : undefined
          });
      }
  }

  // Add Shadows (Shadow Zones)
  const shadowCount = 3 + Math.floor(roomId / 4);
  for (let i = 0; i < shadowCount; i++) {
      room.shadows.push({
          x: rng() * (width - 150) + 50,
          y: rng() * (height - 150) + 50,
          w: 60 + rng() * 100,
          h: 60 + rng() * 100
      });
  }

  // Add Vents (from room 5)
  if (roomId >= 5) {
      room.ventilation.push({
          x: 100,
          y: 50,
          w: width - 200,
          h: 30
      });
  }

  return room;
}

function getThemeColor(theme: string): string {
    switch(theme) {
        case 'office': return '#1a1a1a';
        case 'datacenter': return '#0a0a12';
        case 'bank': return '#121a12';
        case 'lab': return '#1a121a';
        case 'military': return '#1a1a0a';
        case 'tutorial': return '#111';
        default: return '#111';
    }
}
