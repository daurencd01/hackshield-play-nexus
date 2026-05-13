import { useEffect } from 'react';
import { GS } from './useGameState';

export function useInputHandler(
  gs: React.MutableRefObject<GS>, 
  onInteract: () => void,
  isMobile: boolean,
  joystickInput: React.MutableRefObject<{ x: number; y: number }>
) {
  useEffect(() => {
    const map: Record<string, "up"|"down"|"left"|"right"> = {
      ArrowUp:"up",    KeyW:"up",    w:"up",    W:"up",    ц:"up",    Ц:"up",
      ArrowDown:"down",  KeyS:"down",  s:"down",  S:"down",  ы:"down",  Ы:"down",
      ArrowLeft:"left",  KeyA:"left",  a:"left",  A:"left",  ф:"left",  Ф:"left",
      ArrowRight:"right", KeyD:"right", d:"right", D:"right", в:"right", В:"right",
    };
    const interactCodes = new Set(["KeyE", "e", "E", "у", "У"]);
    const crouchCodes = new Set(["ControlLeft", "ControlRight", "KeyC", "c", "C", "с", "С"]);

    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      const k = map[code] || map[key] || map[e.key];
      if (k) { e.preventDefault(); gs.current.keys[k] = true; }
      
      if (interactCodes.has(code) || interactCodes.has(key) || interactCodes.has(e.key)) {
        if (!gs.current.modalOpen && gs.current.interactCooldown <= 0) {
          onInteract();
        }
      }

      if (crouchCodes.has(code) || crouchCodes.has(key) || crouchCodes.has(e.key)) {
        gs.current.isCrouching = true;
      }
    };

    const up = (e: KeyboardEvent) => {
      const k = map[e.code] || map[e.key.toLowerCase()] || map[e.key];
      if (k) gs.current.keys[k] = false;
      if (crouchCodes.has(e.code) || crouchCodes.has(e.key.toLowerCase())) {
        gs.current.isCrouching = false;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [gs, onInteract]);
}
