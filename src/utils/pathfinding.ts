import { Vec2 } from '@/types/game';

export interface GridNode {
  x: number;
  y: number;
  g: number;  // стоимость от старта
  h: number;  // эвристика до цели
  f: number;  // g + h
  parent: GridNode | null;
  walkable: boolean;
}

const GRID_SIZE = 20; // размер ячейки сетки в пикселях

export function findPath(
  start: Vec2,
  end: Vec2,
  walls: { x: number; y: number; w: number; h: number }[],
  mapWidth: number = 1200,
  mapHeight: number = 900
): Vec2[] {
  const cols = Math.ceil(mapWidth / GRID_SIZE);
  const rows = Math.ceil(mapHeight / GRID_SIZE);

  const startGridX = Math.max(0, Math.min(cols - 1, Math.floor(start.x / GRID_SIZE)));
  const startGridY = Math.max(0, Math.min(rows - 1, Math.floor(start.y / GRID_SIZE)));
  const endGridX = Math.max(0, Math.min(cols - 1, Math.floor(end.x / GRID_SIZE)));
  const endGridY = Math.max(0, Math.min(rows - 1, Math.floor(end.y / GRID_SIZE)));

  const grid: GridNode[][] = [];
  for (let x = 0; x < cols; x++) {
    grid[x] = [];
    for (let y = 0; y < rows; y++) {
      let walkable = true;
      const cellX = x * GRID_SIZE;
      const cellY = y * GRID_SIZE;
      const padding = 12; // Предотвращаем застревание тела охранника в стене

      for (const w of walls) {
        if (
          cellX + padding < w.x + w.w &&
          cellX + GRID_SIZE - padding > w.x &&
          cellY + padding < w.y + w.h &&
          cellY + GRID_SIZE - padding > w.y
        ) {
          walkable = false;
          break;
        }
      }

      grid[x][y] = {
        x,
        y,
        g: 0,
        h: 0,
        f: 0,
        parent: null,
        walkable
      };
    }
  }

  // Принудительно делаем старт и финиш проходимыми
  if (grid[startGridX]?.[startGridY]) grid[startGridX][startGridY].walkable = true;
  if (grid[endGridX]?.[endGridY]) grid[endGridX][endGridY].walkable = true;

  const openList: GridNode[] = [];
  const closedSet = new Set<string>();

  const startNode = grid[startGridX]?.[startGridY];
  const endNode = grid[endGridX]?.[endGridY];

  if (!startNode || !endNode) return [];

  openList.push(startNode);

  while (openList.length > 0) {
    // Сортировка по весу f
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    closedSet.add(`${current.x},${current.y}`);

    // Достигли цели
    if (current.x === endNode.x && current.y === endNode.y) {
      const path: Vec2[] = [];
      let curr: GridNode | null = current;
      while (curr) {
        path.push({
          x: curr.x * GRID_SIZE + GRID_SIZE / 2,
          y: curr.y * GRID_SIZE + GRID_SIZE / 2
        });
        curr = curr.parent;
      }
      return path.reverse();
    }

    // 8 направлений движения
    const dirs = [
      { dx: 0, dy: -1, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: -1, cost: Math.SQRT2 },
      { dx: 1, dy: -1, cost: Math.SQRT2 },
      { dx: -1, dy: 1, cost: Math.SQRT2 },
      { dx: 1, dy: 1, cost: Math.SQRT2 }
    ];

    for (const dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const neighbor = grid[nx][ny];

      if (!neighbor.walkable || closedSet.has(`${nx},${ny}`)) continue;

      // Блокировка прохождения сквозь ребро двух угловых стен (corner-cutting)
      if (dir.dx !== 0 && dir.dy !== 0) {
        const side1 = grid[current.x + dir.dx]?.[current.y];
        const side2 = grid[current.x]?.[current.y + dir.dy];
        if (side1 && !side1.walkable && side2 && !side2.walkable) {
          continue;
        }
      }

      const tentativeG = current.g + dir.cost;
      const inOpen = openList.find(n => n.x === nx && n.y === ny);

      if (!inOpen || tentativeG < neighbor.g) {
        neighbor.g = tentativeG;
        // Эвристика Манхэттенского расстояния
        neighbor.h = Math.abs(nx - endNode.x) + Math.abs(ny - endNode.y);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;

        if (!inOpen) {
          openList.push(neighbor);
        }
      }
    }
  }

  return [];
}
