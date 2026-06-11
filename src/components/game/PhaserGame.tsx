import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { MissionScene } from '@/game/scenes/MissionScene';
import { GameState, RoomConfig } from '@/types/game';

interface PhaserGameProps {
    gameState: GameState;
    room?: RoomConfig;
    userId: string;
    isHost: boolean;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ gameState, room }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    // Create the Phaser game once.
    useEffect(() => {
        if (!containerRef.current) return;
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: 800,
            height: 600,
            backgroundColor: '#0a0e1a',
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
            scene: [PreloadScene, MissionScene],
        };
        const game = new Phaser.Game(config);
        gameRef.current = game;
        // Registry is the single source of truth — set before scenes boot.
        game.registry.set('room', room);
        game.registry.set('gameState', gameState);
        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the registry in sync with React state every render.
    useEffect(() => {
        gameRef.current?.registry.set('gameState', gameState);
    }, [gameState]);

    return <div ref={containerRef} className="w-full h-full" />;
};

export default PhaserGame;
