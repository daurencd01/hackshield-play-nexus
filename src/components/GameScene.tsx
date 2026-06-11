import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useGameAI } from '@/hooks/useGameAI';
import { useGameCollision } from '@/hooks/useGameCollision';
import { useMultiplayerSync } from '@/hooks/useMultiplayerSync';
import { generateRoom } from '@/utils/roomGenerator';
import { RoomConfig, Player, GameEvent } from '@/types/game';
import { createLogger } from '@/utils/logger';
import PhaserGame from './game/PhaserGame';
import { ObjectiveSystem } from '@/game/systems/ObjectiveSystem';
import { InventorySystem } from '@/game/systems/InventorySystem';
import { SkillSystem } from '@/game/systems/SkillSystem';
import { AlertSystem } from '@/game/systems/AlertSystem';
import { ExfiltrationSystem, EXFIL_OPTIONS } from '@/game/systems/ExfiltrationSystem';
import { CheckCircle2, Circle, Trophy, Download, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useSkills } from '@/hooks/useSkills';
import { HackChallenge } from './game/HackChallenge';
import { TouchControls } from './game/TouchControls';
import { challengeForTerminal } from '@/game/hackChallenges';
import { dataService } from '@/lib/dataService';

const log = createLogger('GameScene');

interface GameSceneProps {
    userId: string;
    username: string;
    sessionId?: string | null;
    roomId: number;
    mode: 'solo' | 'coop';
    isHost: boolean;
    onComplete?: (xp: number) => void;
}

const GameScene: React.FC<GameSceneProps> = ({ userId, username, sessionId, roomId, mode, isHost, onComplete }) => {
    const missionId = `m${roomId + 1}`;
    const { gameState, gameStateRef, updateGameState } = useGameState(userId, roomId);
    const { inventory } = useInventory(userId);
    const { skills } = useSkills(userId);

    // Initialize Systems
    useEffect(() => {
        ObjectiveSystem.getInstance().init(userId, missionId);
    }, [userId, missionId]);

    useEffect(() => {
        if (inventory) InventorySystem.getInstance().init(inventory.map(i => ({ item_id: i.id, quantity: i.quantity })));
    }, [inventory]);

    useEffect(() => {
        if (skills) SkillSystem.getInstance().init(skills);
    }, [skills]);
    const { updateAI, guardPathsRef } = useGameAI();
    const { resolveMovement, checkInteraction } = useGameCollision();
    const { broadcastEvent } = useMultiplayerSync(
        sessionId || null,
        userId,
        username,
        isHost,
        gameStateRef,
        updateGameState
    );

    const room = useMemo(() => generateRoom(roomId), [roomId]);
    const keys = useRef<Record<string, boolean>>({});
    const touchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    
    // Состояния для Debug оверлея
    const [showDebug, setShowDebug] = useState(false);
    const showDebugRef = useRef<boolean>(false);
    const [fps, setFps] = useState(60);
    const [showExfilDialog, setShowExfilDialog] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const hintRef = useRef<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const [showBriefing, setShowBriefing] = useState(true);
    const briefingRef = useRef(true);
    useEffect(() => { briefingRef.current = showBriefing; }, [showBriefing]);

    // Initialize Room
    useEffect(() => {
        const spawn = room.spawnPoints[mode === 'solo' ? 0 : (isHost ? 1 : 2)];
        
        const localPlayer: Player = {
            id: userId,
            username,
            position: { ...spawn },
            velocity: { x: 0, y: 0 },
            health: 100,
            maxHealth: 100,
            xp: 0,
            isStealthMode: false,
            isInVent: false,
            isStunned: false,
            stunUntil: 0,
            empCharges: 1,
            keycards: [],
            facing: 0,
            color: '#00ff00'
        };

        const players = new Map<string, Player>();
        players.set(userId, localPlayer);

        updateGameState({
            mode,
            sessionId: sessionId || null,
            isHost,
            guards: room.guards.map((g, i) => ({ ...g, id: `guard-${i}` })),
            cameras: room.cameras.map((c, i) => ({ ...c, id: `camera-${i}` })),
            doors: room.doors.map((d, i) => ({ ...d, id: `door-${i}` })),
            terminals: room.terminals.map((t, i) => ({ ...t, id: `terminal-${i}` })),
            lasers: room.lasers.map((l, i) => ({ ...l, id: `laser-${i}` })),
            collectibles: room.collectibles.map((c, i) => ({ ...c, id: `pickup-${i}` })),
            players,
            missionStatus: 'in_progress'
        });
    }, [room, userId, username, sessionId, mode, isHost]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.code] = true;
            if (e.code === 'KeyE') handleInteract();
            if (e.code === 'F3') {
                e.preventDefault();
                showDebugRef.current = !showDebugRef.current;
                setShowDebug(showDebugRef.current);
            }
            if (e.code === 'Digit1') InventorySystem.getInstance().useItem('emp');
            if (e.code === 'Digit2') InventorySystem.getInstance().useItem('jammer');
            if (e.code === 'Digit3') InventorySystem.getInstance().useItem('badge');
            if (e.code === 'Digit4') InventorySystem.getInstance().useItem('usb');
            if (e.code === 'Digit5') InventorySystem.getInstance().useItem('sniffer');
            if (e.code === 'ShiftLeft') updateGameState(prev => {
                const players = new Map(prev.players);
                const p = players.get(userId);
                if (p) p.isStealthMode = true;
                return { ...prev, players };
            });
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keys.current[e.code] = false;
            if (e.code === 'ShiftLeft') updateGameState(prev => {
                const players = new Map(prev.players);
                const p = players.get(userId);
                if (p) p.isStealthMode = false;
                return { ...prev, players };
            });
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleInteract = () => {
        const gs = gameStateRef.current;
        const player = gs.players.get(userId);
        if (!player) return;

        const interaction = checkInteraction(gs, player);
        if (!interaction) return;

        switch (interaction.type) {
            case 'terminal':
                if (interaction.target.isHacked) {
                    flashMsg('Терминал уже взломан');
                    break;
                }
                updateGameState({ showQuiz: true, activeHackTarget: interaction.target.id });
                break;
            case 'exit': {
                const mainHacked = gs.terminals.some(t => t.isMainObjective && t.isHacked);
                if (!mainHacked) {
                    flashMsg('Сначала отключите целевой терминал ★ (C2)');
                    break;
                }
                broadcastEvent({ type: 'mission_complete' });
                updateGameState({ missionStatus: 'success' });
                break;
            }
        }
    };

    const flashMsg = (msg: string, ms = 2500) => {
        setFlash(msg);
        window.setTimeout(() => setFlash(curr => (curr === msg ? null : curr)), ms);
    };

    // Result of a terminal hack-challenge
    const handleHackResolve = (correct: boolean, xp: number) => {
        const targetId = gameStateRef.current.activeHackTarget;
        const target = gameStateRef.current.terminals.find(t => t.id === targetId);
        if (correct && targetId) {
            updateGameState(prev => ({
                ...prev,
                terminals: prev.terminals.map(t => (t.id === targetId ? { ...t, isHacked: true } : t)),
                showQuiz: false,
                activeHackTarget: null,
            }));
            dataService.addXp(xp);
            if (target?.isMainObjective) {
                flashMsg('★ C2 ОТКЛЮЧЁН! Уходите через EXIT →', 4000);
            } else {
                flashMsg(`+${xp} XP · Терминал взломан`);
            }
        } else {
            AlertSystem.getInstance().increaseAlert(20);
            updateGameState({ showQuiz: false, activeHackTarget: null });
            flashMsg('ДОСТУП ОТКЛОНЁН — тревога повышена!', 2000);
        }
    };

    const handleHackClose = () => updateGameState({ showQuiz: false, activeHackTarget: null });

    // Game Loop
    useEffect(() => {
        let lastTime = performance.now();
        let frameId: number;

        let frameCount = 0;
        let lastFpsUpdateTime = performance.now();

        const loop = (time: number) => {
            const dt = time - lastTime;
            lastTime = time;

            // Расчет FPS
            frameCount++;
            if (time - lastFpsUpdateTime >= 1000) {
                const calculatedFps = Math.round((frameCount * 1000) / (time - lastFpsUpdateTime));
                setFps(calculatedFps);
                frameCount = 0;
                lastFpsUpdateTime = time;
            }

            const gs = gameStateRef.current;
            if (gs.missionStatus !== 'in_progress' || gs.showQuiz || briefingRef.current) {
                frameId = requestAnimationFrame(loop);
                return;
            }

            // Interaction hint (only re-renders when the prompt changes)
            const hp = gs.players.get(userId);
            let h: string | null = null;
            if (hp) {
                const it = checkInteraction(gs, hp);
                if (it?.type === 'terminal') {
                    h = it.target.isHacked ? null : (it.target.isMainObjective ? '★ Взломать C2 — [E]' : 'Взломать терминал — [E]');
                } else if (it?.type === 'exit') {
                    h = gs.terminals.some(t => t.isMainObjective && t.isHacked) ? 'Экстракция — [E]' : null;
                }
            }
            if (h !== hintRef.current) { hintRef.current = h; setHint(h); }

            // 1. Local Player Movement
            const player = gs.players.get(userId);
            if (player && !player.isStunned) {
                const speed = player.isStealthMode ? 2 : 4;
                let dx = (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0);
                let dy = (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0);
                // Touch joystick fallback (mobile)
                if (dx === 0 && dy === 0) { dx = touchRef.current.x; dy = touchRef.current.y; }

                if (Math.hypot(dx, dy) > 0.15) {
                    const angle = Math.atan2(dy, dx);
                    const desiredPos = {
                        x: player.position.x + Math.cos(angle) * speed,
                        y: player.position.y + Math.sin(angle) * speed
                    };
                    resolveMovement(player, desiredPos, room.walls, gs.doors);
                    player.facing = angle;
                    
                    // Broadcast move (throttled inside useMultiplayerSync.ts to 20Hz / 50ms)
                    broadcastEvent({
                        type: 'player_move',
                        userId,
                        position: player.position,
                        facing: player.facing
                    });
                }
            }

            // 1b. Auto-pickup bonuses
            const lp = gs.players.get(userId);
            if (lp && gs.collectibles.length) {
                for (const c of gs.collectibles as any[]) {
                    const ddx = lp.position.x - c.position.x;
                    const ddy = lp.position.y - c.position.y;
                    if (ddx * ddx + ddy * ddy < 26 * 26) {
                        if (c.type === 'data') { dataService.addXp(25); flashMsg('+25 XP · Data shard'); }
                        else if (c.type === 'intel') { dataService.addXp(40); ObjectiveSystem.getInstance().completeObjective('intel'); flashMsg('+40 XP · Intel получен'); }
                        else if (c.type === 'medkit') { lp.health = Math.min(lp.maxHealth, lp.health + 30); flashMsg('+30 HP · Аптечка'); }
                        else if (c.type === 'emp') { lp.empCharges += 1; flashMsg('+1 ЭМИ-заряд'); }
                        else if (typeof c.type === 'string' && c.type.startsWith('keycard')) {
                            const col = c.type.split('_')[1];
                            if (!lp.keycards.includes(col)) lp.keycards.push(col);
                            flashMsg('Ключ-карта: ' + col);
                        }
                        updateGameState(prev => ({ ...prev, collectibles: (prev.collectibles as any[]).filter(x => x.id !== c.id) }));
                        break;
                    }
                }
            }

            // 2. Alert System Update
            const localPlayer = gs.players.get(userId);
            const isHidden = localPlayer?.isStealthMode || localPlayer?.isInVent || false;
            const isJammerActive = InventorySystem.getInstance().isEffectActive('jammer');
            const alertStage = AlertSystem.getInstance().update(dt, isHidden, isJammerActive);
            if (alertStage === 'MISSION FAILED') {
                updateGameState({ missionStatus: 'failed', message: 'Maximum alert level reached. Extraction impossible.' });
            }

            // 3. Exfiltration Update
            const activeExfil = ExfiltrationSystem.getInstance().getActiveExfil();
            if (activeExfil) {
                const terminal = gs.terminals.find(t => t.id === activeExfil.terminalId);
                if (terminal && localPlayer) {
                    ExfiltrationSystem.getInstance().update(dt, localPlayer.position, terminal.position, (xp) => {
                        broadcastEvent({ type: 'mission_complete' });
                        updateGameState({ missionStatus: 'success' });
                    });
                }
            }

            // 4. AI Update (Host Only)
            if (isHost) {
                updateAI(gs, dt, room.walls, room.shadows);
                if (Math.random() > 0.8) {
                    broadcastEvent({ type: 'guard_update', guards: gs.guards });
                    broadcastEvent({ type: 'camera_update', cameras: gs.cameras });
                    broadcastEvent({ type: 'world_update', alarmState: gs.alarmState, detectionLevel: gs.detectionLevel });
                }
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [isHost, userId, room]);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <PhaserGame gameState={gameState} room={room} userId={userId} isHost={isHost} />

            {/* Mission briefing — Operation BLACKOUT */}
            {showBriefing && (
                <div className="fixed inset-0 z-[55] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
                    <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-[#0b121c] border border-cyan-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
                        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400 mb-1">// CLASSIFIED · INCIDENT RESPONSE</p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">OPERATION BLACKOUT</h2>
                        <p className="text-cyan-400 font-mono text-xs mb-5">СЕКТОР: {room.name} · УГРОЗА: {room.difficulty.toUpperCase()}</p>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
                            Синдикат <span className="text-red-400 font-semibold">NULL SECTOR</span> запустил шифровальщик в дата-центре NovaTech
                            и выкачивает данные на C2-сервер. Ты — оперативник <span className="text-cyan-300 font-semibold">GHOST</span>.
                        </p>
                        <ul className="text-gray-400 text-sm space-y-1.5 mb-6">
                            <li>▸ Пробирайся мимо операторов (охрана) и захваченных камер.</li>
                            <li>▸ Взламывай терминалы — отвечай на задачи по кибербезопасности.</li>
                            <li>▸ Отключи <span className="text-amber-400">★ целевой C2-терминал</span> и уйди через <span className="text-emerald-400">EXIT</span>.</li>
                        </ul>
                        <p className="text-[11px] text-gray-500 font-mono mb-5">Управление: WASD — движение · E — взлом · Shift — тихий шаг · F3 — отладка</p>
                        <button
                            onClick={() => setShowBriefing(false)}
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
                        >
                            НАЧАТЬ ОПЕРАЦИЮ →
                        </button>
                    </div>
                </div>
            )}

            {/* Terminal hack-challenge */}
            {gameState.showQuiz && gameState.activeHackTarget && (() => {
                const t = gameState.terminals.find(tt => tt.id === gameState.activeHackTarget);
                const ch = challengeForTerminal(gameState.activeHackTarget, !!t?.isMainObjective);
                return (
                    <HackChallenge
                        challenge={ch}
                        isMainObjective={!!t?.isMainObjective}
                        onResolve={handleHackResolve}
                        onClose={handleHackClose}
                    />
                );
            })()}

            {/* Interaction hint */}
            {hint && !gameState.showQuiz && !showBriefing && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-black/75 border border-cyan-500/40 text-cyan-300 text-xs font-mono animate-pulse pointer-events-none">
                    {hint}
                </div>
            )}

            {/* Flash message */}
            {flash && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg bg-black/85 border border-cyan-500/40 text-cyan-200 text-sm font-mono text-center pointer-events-none shadow-lg">
                    {flash}
                </div>
            )}

            {/* Touch controls (mobile) */}
            {!showBriefing && !gameState.showQuiz && gameState.missionStatus === 'in_progress' && (
                <TouchControls
                    onMove={(x, y) => { touchRef.current = { x, y }; }}
                    onAction={handleInteract}
                    onStealth={(on) => updateGameState(prev => {
                        const players = new Map(prev.players);
                        const p = players.get(userId);
                        if (p) p.isStealthMode = on;
                        return { ...prev, players };
                    })}
                />
            )}

            {/* Exfiltration Dialog */}
            {showExfilDialog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-cyan-500/30 p-8 rounded-2xl max-w-md w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <Download className="w-8 h-8 text-cyan-400" />
                            <h2 className="text-2xl font-orbitron font-bold text-white uppercase tracking-tight">Data Exfiltration</h2>
                        </div>
                        <p className="text-zinc-400 mb-8 text-sm">Select data package for extraction.</p>
                        <div className="grid gap-4">
                            {EXFIL_OPTIONS.map(opt => (
                                <button key={opt.id} onClick={() => { ExfiltrationSystem.getInstance().startExfiltration(showExfilDialog, opt); setShowExfilDialog(null); }} className="p-4 bg-zinc-800/50 border border-white/5 hover:border-cyan-500/50 rounded-xl text-left group transition-all">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-white font-bold">{opt.label}</span>
                                        <span className="text-cyan-400 font-mono">+{opt.xpReward} XP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-zinc-500">
                                        <span>Time: {opt.durationSec}s</span>
                                        <span className="text-orange-500">Alert +{opt.alertIncrease}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowExfilDialog(null)} className="mt-6 w-full py-3 text-zinc-500 hover:text-white font-mono text-xs uppercase">Cancel</button>
                    </div>
                </div>
            )}

            {/* Exfiltration Progress HUD */}
            {ExfiltrationSystem.getInstance().getActiveExfil() && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/90 border border-cyan-500/30 p-4 rounded-xl w-64 shadow-2xl z-40">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
                            {ExfiltrationSystem.getInstance().getActiveExfil()?.isPaused ? 'DOWNLOAD PAUSED' : 'EXFILTRATING...'}
                        </span>
                        <span className="text-xs font-mono text-white">
                            {Math.round(ExfiltrationSystem.getInstance().getActiveExfil()?.progress || 0)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${ExfiltrationSystem.getInstance().getActiveExfil()?.progress}%` }} />
                    </div>
                </div>
            )}

            {/* Objectives Panel (translucent & slim so it doesn't hide the playfield) */}
            <div className="absolute top-4 right-4 bg-black/35 backdrop-blur-sm p-3 rounded-lg border border-cyan-500/20 text-xs font-mono text-cyan-400 max-w-[190px] flex flex-col gap-1.5 z-40 pointer-events-none shadow-lg">
                <div className="text-cyan-300 font-bold border-b border-cyan-500/20 pb-1 flex justify-between items-center">
                    <span>▸ OBJECTIVES</span>
                    <Trophy className="w-3 h-3 text-cyan-400" />
                </div>
                {ObjectiveSystem.getInstance().getObjectives().filter(o => o.type === 'primary' || !o.completed).slice(0, 4).map(obj => (
                    <div key={obj.id} className="flex items-start gap-2">
                        {obj.completed ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-600 shrink-0" />}
                        <div>
                            <p className={`${obj.completed ? 'text-green-500 line-through' : 'text-white'}`}>{obj.title}</p>
                            {!obj.completed && <p className="text-[10px] text-gray-500">{obj.description}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Alert Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-40 pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
                    <ShieldAlert className={`w-4 h-4 ${AlertSystem.getInstance().getAlertLevel() > 75 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                    <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${AlertSystem.getInstance().getAlertLevel() > 75 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${AlertSystem.getInstance().getAlertLevel()}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white min-w-[80px]">{AlertSystem.getInstance().getStage()}</span>
                </div>
            </div>

            {/* HUD */}
            <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
                {/* Inventory HUD */}
                <div className="flex gap-2 mb-2">
                    {InventorySystem.getInstance().getItems().map(item => (
                        <div key={item.id} className={`w-10 h-10 rounded-lg border flex items-center justify-center relative ${item.qty > 0 ? 'bg-zinc-900 border-cyan-500/50' : 'bg-zinc-950 border-white/5 opacity-50'}`}>
                             <span className="text-white text-[10px] font-bold">{item.id.toUpperCase()}</span>
                             <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[8px] px-1 rounded-full">{item.qty}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/20 text-xs text-white">
                    ROOM: {room.name}
                </div>
                <div className="bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/20 text-xs text-cyan-400">
                    DIFFICULTY: {room.difficulty.toUpperCase()}
                </div>
            </div>

            {/* F3 Cyberpunk Debug Panel */}
            {showDebug && (
                <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md p-4 rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-400 max-w-xs flex flex-col gap-2 z-50 pointer-events-none shadow-lg animate-fade-in shadow-cyan-500/10">
                    <div className="text-cyan-300 font-bold border-b border-cyan-500/20 pb-1 flex justify-between items-center">
                        <span>▸ NEXUS SYSTEM DEBUGR</span>
                        <span className="text-[9px] bg-cyan-950 px-1 rounded border border-cyan-500/30 text-cyan-400">ACTIVE</span>
                    </div>
                    <div className="flex justify-between">
                        <span>FPS:</span>
                        <span className="text-white font-semibold">{fps}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>PLAYERS:</span>
                        <span className="text-white">{gameState.players.size}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GUARDS:</span>
                        <span className="text-white">{gameState.guards.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CAMERAS:</span>
                        <span className="text-white">{gameState.cameras.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>DOORS / TERM:</span>
                        <span className="text-white">{gameState.doors.length} / {gameState.terminals.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>ALARM:</span>
                        <span className={gameState.alarmState === 'triggered' ? 'text-red-400 font-bold animate-pulse' : 'text-green-400'}>
                            {gameState.alarmState.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>MODE / HOST:</span>
                        <span className="text-white">{gameState.mode.toUpperCase()} / {gameState.isHost ? 'TRUE' : 'FALSE'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>LOCAL X/Y:</span>
                        <span className="text-white">
                            {Math.round(gameState.players.get(userId)?.position.x || 0)}, {Math.round(gameState.players.get(userId)?.position.y || 0)}
                        </span>
                    </div>
                    <div className="border-t border-cyan-500/20 pt-1 text-[9px] text-cyan-500/70 text-center">
                        Press [F3] to toggle debug view
                    </div>
                </div>
            )}

            {/* Mission Status Overlays */}
            {gameState.missionStatus === 'success' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <h2 className="text-4xl font-bold text-green-500 mb-4 tracking-tighter">MISSION ACCOMPLISHED</h2>
                    <p className="text-white/60 mb-8">All objectives secured. Extraction successful.</p>
                    <button 
                        onClick={() => {
                            if (onComplete) {
                                onComplete(200);
                            } else {
                                window.location.reload();
                            }
                        }}
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full transition-all"
                    >
                        CONTINUE TO NEXT LEVEL
                    </button>
                </div>
            )}

            {/* Mission Status Overlays */}
            {gameState.missionStatus === 'failed' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <h2 className="text-4xl font-bold text-red-500 mb-4 tracking-tighter">MISSION FAILED</h2>
                    <p className="text-white/60 mb-8">{gameState.message || 'You were detected or compromised.'}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all"
                    >
                        RETRY MISSION
                    </button>
                </div>
            )}
        </div>
    );
};

export default GameScene;
