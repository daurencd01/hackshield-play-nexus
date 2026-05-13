export const haptic = {
  vibrate: (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },
  impact: () => haptic.vibrate(10),
  notification: () => haptic.vibrate([10, 50, 10]),
  warning: () => haptic.vibrate([100, 50, 100]),
  error: () => haptic.vibrate([50, 100, 50, 100]),
  success: () => haptic.vibrate([10, 30, 10, 30]),
};
