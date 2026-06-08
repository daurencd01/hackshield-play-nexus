import { useEffect, useRef } from 'react';
import { GS } from './constants';

export function useInputHandler(
  gs: React.MutableRefObject<GS>, 
  onInteract: () => void,
  onFullscreen?: () => void,
  onRespawn?: () => void
) {
  const interactPressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = gs.current.keys;
      const key = e.key.toLowerCase();

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', ' ', 'f', 'r'].includes(key)) {
        // Only prevent default if we are not in an input field (though currently there are none in the game scene)
        if (e.target instanceof HTMLBodyElement || e.target instanceof HTMLCanvasElement) {
          e.preventDefault();
        }
      }

      switch (key) {
        case 'w': case 'arrowup': k.up = true; break;
        case 's': case 'arrowdown': k.down = true; break;
        case 'a': case 'arrowleft': k.left = true; break;
        case 'd': case 'arrowright': k.right = true; break;
        case 'f': if (onFullscreen) onFullscreen(); break;
        case 'r': if (onRespawn) onRespawn(); break;
        case 'e': case ' ':
          if (!interactPressed.current) {
            k.interact = true;
            interactPressed.current = true;
            onInteract();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = gs.current.keys;
      const key = e.key.toLowerCase();

      switch (key) {
        case 'w': case 'arrowup': k.up = false; break;
        case 's': case 'arrowdown': k.down = false; break;
        case 'a': case 'arrowleft': k.left = false; break;
        case 'd': case 'arrowright': k.right = false; break;
        case 'e': case ' ':
          k.interact = false;
          interactPressed.current = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gs, onInteract]);
}
