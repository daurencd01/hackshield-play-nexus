import { useState, useEffect, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      const startY = e.touches[0].pageY;
      
      const handleTouchMove = (moveEvent: TouchEvent) => {
        const currentY = moveEvent.touches[0].pageY;
        const diff = currentY - startY;
        
        if (diff > 0) {
          // Add some resistance
          const distance = Math.min(diff * 0.4, PULL_THRESHOLD + 20);
          setPullDistance(distance);
          
          if (distance > 10) {
            moveEvent.preventDefault();
          }
        }
      };
      
      const handleTouchEnd = async () => {
        if (pullDistance > PULL_THRESHOLD) {
          setRefreshing(true);
          setPullDistance(0);
          try {
            await onRefresh();
          } finally {
            setRefreshing(false);
          }
        } else {
          setPullDistance(0);
        }
        
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
      
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart);
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, [handleTouchStart]);

  return { refreshing, pullDistance };
}
