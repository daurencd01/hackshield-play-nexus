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
    
    // Состояния для Debug оверлея
    const [showDebug, setShowDebug] = useState(false);
    const showDebugRef = useRef<boolean>(false);
    const [fps, setFps] = useState(60);
    const [showExfilDialog, setShowExfilDialog] = useState<string | null>(null);

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
                if (interaction.target.isMainObjective) {
                    setShowExfilDialog(interaction.target.id);
                } else {
                    updateGameState({ showQuiz: true, activeHackTarget: interaction.target.id });
                }
                break;
            case 'exit':
                if (isHost) {
                   broadcastEvent({ type: 'mission_complete' });
                   updateGameState({ missionStatus: 'success' });
                }
                break;
        }
    };

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
            if (gs.missionStatus !== 'in_progress' || gs.showQuiz) {
                frameId = requestAnimationFrame(loop);
                return;
            }

            // 1. Local Player Movement
            const player = gs.players.get(userId);
            if (player && !player.isStunned) {
                const speed = player.isStealthMode ? 1.5 : 3;
                const dx = (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0);
                const dy = (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0);
                
                if (dx !== 0 || dy !== 0) {
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
            <PhaserGame gameState={gameState} userId={userId} isHost={isHost} />

            {/* Exfiltration Dialog */}
            {showExfilDialog && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
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

            {/* Objectives Panel */}
            <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md p-4 rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-400 max-w-xs flex flex-col gap-2 z-40 pointer-events-none shadow-lg">
                <div className="text-cyan-300 font-bold border-b border-cyan-500/20 pb-1 flex justify-between items-center">
                    <span>▸ OBJECTIVES</span>
                    <Trophy className="w-3 h-3 text-cyan-400" />
                </div>
                {ObjectiveSystem.getInstance().getObjectives().filter(o => o.type === 'primary' || !o.completed).map(obj => (
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
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
