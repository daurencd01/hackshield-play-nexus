import { GameObject, Laser, CW, CH, WALL } from './constants';

export interface RoomData {
  name: string;
  objects: GameObject[];
  lasers: Laser[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

const ROOM_NAMES = [
  "Digital Onboarding", "Password Fortress", "Network Recon", "Web Exploit Lab", "Malware Analysis",
  "Social Engineering Ops", "Crypto Foundation", "Attack Vectors", "OS Hardening", "Wireless Assault",
  "Pentest Academy", "Digital Forensics", "Cloud Breach", "AppSec Deep Dive", "SOC Operations",
  "Legal & Compliance", "Incident Response", "IoT & ICS Security", "Advanced Cryptography",
  "APT Simulation", "Final Exam: Cyber Guardian"
];

export function generateRoom(roomIdx: number): RoomData {
  const name = ROOM_NAMES[roomIdx] || `Sector ${roomIdx}`;
  const objects: GameObject[] = [];
  const lasers: Laser[] = [];
  
  // Determine difficulty
  let difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy';
  if (roomIdx >= 15) difficulty = 'expert';
  else if (roomIdx >= 10) difficulty = 'hard';
  else if (roomIdx >= 5) difficulty = 'medium';

  // Base exit portal
  objects.push({ 
    id: 'exit', 
    x: CW - 80, 
    y: CH / 2 - 25, 
    width: 50, 
    height: 50, 
    type: 'exit_portal',
    label: 'NEXT SECTOR'
  });

  // Procedural generation based on roomIdx
  const seed = roomIdx * 1337;
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  // Add walls based on difficulty
  if (difficulty === 'medium' || difficulty === 'hard' || difficulty === 'expert') {
    const wallCount = difficulty === 'medium' ? 1 : difficulty === 'hard' ? 2 : 3;
    for (let i = 0; i < wallCount; i++) {
      const isVertical = pseudoRandom(i) > 0.5;
      if (isVertical) {
        const x = 200 + pseudoRandom(i + 10) * (CW - 400);
        const h = 150 + pseudoRandom(i + 20) * 200;
        const y = pseudoRandom(i + 30) > 0.5 ? 0 : CH - h;
        objects.push({ id: `wall_${i}`, x, y, width: 20, height: h, type: 'wall' });
      } else {
        const y = 100 + pseudoRandom(i + 10) * (CH - 200);
        const w = 150 + pseudoRandom(i + 20) * 200;
        const x = pseudoRandom(i + 30) > 0.5 ? 100 : CW - 100 - w;
        objects.push({ id: `wall_${i}`, x, y, width: w, height: 20, type: 'wall' });
      }
    }
  }

  // Add terminals/servers
  const targetCount = 2 + Math.floor(roomIdx / 5);
  const types: GameObject['type'][] = ['terminal', 'server', 'data_node'];
  
  for (let i = 0; i < targetCount; i++) {
    const type = types[Math.floor(pseudoRandom(i + 50) * types.length)];
    let x = 150 + pseudoRandom(i + 60) * (CW - 300);
    let y = 100 + pseudoRandom(i + 70) * (CH - 200);
    
    // Avoid overlap with walls (simple check)
    objects.push({
      id: `target_${i}`,
      x, y,
      width: 40, height: 40,
      type,
      label: `${type.toUpperCase()} ${i + 1}`
    });
  }

  // Add lasers for hard/expert
  if (difficulty === 'hard' || difficulty === 'expert') {
    const laserCount = difficulty === 'hard' ? 1 : 2;
    for (let i = 0; i < laserCount; i++) {
      const isVertical = pseudoRandom(i + 100) > 0.5;
      if (isVertical) {
        const x = 250 + pseudoRandom(i + 110) * (CW - 500);
        lasers.push({ x1: x, y1: 0, x2: x, y2: CH, active: true, damage: 25, color: "#ff3366" });
      } else {
        const y = 150 + pseudoRandom(i + 110) * (CH - 300);
        lasers.push({ x1: 100, y1: y, x2: CW - 100, y2: y, active: true, damage: 25, color: "#ff3366" });
      }
    }
  }

  // Expert: Add moving NPC/Security
  if (difficulty === 'expert') {
    objects.push({
      id: 'security_bot',
      x: CW / 2,
      y: CH / 2,
      width: 30,
      height: 30,
      type: 'npc',
      label: 'SENTINEL'
    });
  }

  return { name, objects, lasers, difficulty };
}
