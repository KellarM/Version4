import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_TIMING = {
  bettingClose: 10,
  flopReveal: 3,
  turnReveal: 3,
  riverBetting: 20,
  riverReveal: 4,
  endOfRound: 5,
};

export function useGameTiming() {
  const timerRef = useRef(null);
  const timingRef = useRef(null);

  const loadTiming = useCallback(() => {
    try {
      const saved = localStorage.getItem('rapidFireGameTiming');
      if (saved) {
        return { ...DEFAULT_TIMING, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load timing config:', e);
    }
    return DEFAULT_TIMING;
  }, []);

  useEffect(() => {
    timingRef.current = loadTiming();
  }, [loadTiming]);

  const startTimer = useCallback((duration, onTick, onComplete) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = duration;
    onTick(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 0.1;
      onTick(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        onComplete?.();
      }
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    timing: timingRef.current || DEFAULT_TIMING,
    startTimer,
    stopTimer,
    loadTiming,
  };
}