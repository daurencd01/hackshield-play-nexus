import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { MissionScene } from '@/game/scenes/MissionScene';
import { GameState } from '@/types/game';

interface PhaserGameProps {
    gameState: GameState;
    userId: string;
    isHost: boolean;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ gameState, userId, isHost }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<MissionScene | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: 800,
            height: 600,
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
            scene: [PreloadScene, MissionScene],
        };
        const game = new Phaser.Game(config);
        gameRef.current = game;
        game.events.once('ready', () => {
            setTimeout(() => {
                const missionScene = game.scene.getScene('MissionScene') as MissionScene;
                sceneRef.current = missionScene;
                missionScene.scene.start('MissionScene', { gameState });
            }, 100);
        });
        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (sceneRef.current) sceneRef.current.updateExternalState(gameState);
    }, [gameState]);

    return <div ref={containerRef} className="w-full h-full" />;
};

export default PhaserGame;
