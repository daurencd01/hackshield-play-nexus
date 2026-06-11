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

interface RoomObjectiveOpts {
  roomId?: number;
  cameras?: number;
  intel?: number;
}

export class ObjectiveSystem {
  private static instance: ObjectiveSystem;
  private objectives: Objective[] = [];
  private missionId = '';
  private userId = '';

  private constructor() {}

  public static getInstance(): ObjectiveSystem {
    if (!ObjectiveSystem.instance) ObjectiveSystem.instance = new ObjectiveSystem();
    return ObjectiveSystem.instance;
  }

  /** Build a per-room objective set. The "special" task rotates by room. */
  public init(userId: string, missionId: string, opts: RoomObjectiveOpts = {}) {
    this.userId = userId;
    this.missionId = missionId;

    const roomId = opts.roomId ?? 0;
    const cameras = opts.cameras ?? 0;
    const intel = opts.intel ?? 0;

    const objs: Objective[] = [
      { id: 'terminal', type: 'primary', title: 'Взломать C2-терминал', description: 'Найди и взломай ★ терминал', completed: false, failed: false },
    ];

    // Rotating special objective so each room plays differently.
    const special = roomId % 3;
    if (special === 0 && intel > 0) {
      objs.push({ id: 'intel', type: 'primary', title: 'Собрать все улики', description: `Собрано 0/${intel}`, completed: false, failed: false, progress: 0, maxProgress: intel });
    } else if (special === 1 && cameras > 0) {
      objs.push({ id: 'cameras', type: 'primary', title: 'Отключить все камеры', description: `Отключено 0/${cameras}`, completed: false, failed: false, progress: 0, maxProgress: cameras });
    }
    // "Ghost" is a bonus goal (failing it must not soft-lock extraction).
    objs.push({ id: 'noalarm', type: 'secondary', title: 'Призрак: не поднимать тревогу', description: 'Тревога не выше 70%', completed: true, failed: false });

    // Optional side goals when the room has the content.
    if (special !== 0 && intel > 0) {
      objs.push({ id: 'intel', type: 'secondary', title: 'Собрать улики', description: `Собрано 0/${intel}`, completed: false, failed: false, progress: 0, maxProgress: intel });
    }

    objs.push({ id: 'escape', type: 'primary', title: 'Уйти через EXIT', description: 'Достигни зоны эвакуации', completed: false, failed: false });

    this.objectives = objs;
  }

  public getObjectives(): Objective[] {
    return this.objectives;
  }

  public has(id: string): boolean {
    return this.objectives.some(o => o.id === id);
  }

  public updateObjective(id: string, updates: Partial<Objective>) {
    const obj = this.objectives.find(o => o.id === id);
    if (!obj) return;
    const changed = Object.keys(updates).some(k => (obj as any)[k] !== (updates as any)[k]);
    if (!changed) return;
    Object.assign(obj, updates);
  }

  public completeObjective(id: string) {
    this.updateObjective(id, { completed: true, failed: false });
  }

  public failObjective(id: string) {
    this.updateObjective(id, { failed: true, completed: false });
  }

  /** Advance a counted objective (intel / cameras). Returns true when it just completed. */
  public incrementProgress(id: string): boolean {
    const obj = this.objectives.find(o => o.id === id);
    if (!obj || obj.completed || obj.maxProgress == null) return false;
    obj.progress = Math.min((obj.progress ?? 0) + 1, obj.maxProgress);
    const label = obj.id === 'cameras' ? 'Отключено' : 'Собрано';
    obj.description = `${label} ${obj.progress}/${obj.maxProgress}`;
    if (obj.progress >= obj.maxProgress) {
      obj.completed = true;
      return true;
    }
    return false;
  }

  /** Extraction is allowed once every primary objective except "escape" is done (and none failed). */
  public canExtract(): boolean {
    return this.objectives
      .filter(o => o.type === 'primary' && o.id !== 'escape')
      .every(o => o.completed && !o.failed);
  }

  /** Short label for what's still blocking extraction (for the HUD hint). */
  public pendingLabel(): string | null {
    const pending = this.objectives.find(o => o.type === 'primary' && o.id !== 'escape' && !o.completed);
    return pending ? pending.title : null;
  }
}
