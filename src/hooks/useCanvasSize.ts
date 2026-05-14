import { useState, useEffect } from 'react';

export function useCanvasSize() {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isLandscape: false
  });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isMobile = w < 1024;
      const isLandscape = w > h;

      let canvasW: number, canvasH: number;

      if (isMobile) {
        // Full screen on mobile/tablet
        canvasW = w;
        canvasH = h;
      } else {
        // Desktop - limited size with aspect ratio
        const maxW = Math.min(w - 128, 1200);
        const maxH = h - 240;
        const ratio = 16 / 9;

        if (maxW / ratio > maxH) {
          canvasH = maxH;
          canvasW = maxH * ratio;
        } else {
          canvasW = maxW;
          canvasH = maxW / ratio;
        }
      }

      setSize({
        width: Math.floor(canvasW),
        height: Math.floor(canvasH),
        isMobile,
        isLandscape
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return size;
}
