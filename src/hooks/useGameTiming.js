import { useState, useRef, useCallback } from 'react';

const DEFAULT_TIMING = {
  bettingClose: 14,
  flopReveal: 8,
  turnReveal: 2,
  riverBetting: 14,
  riverReveal: 5,
  endOfRound: 14,
};

const STORAGE_KEY = 'rapidFireGameTiming';

export function useGameTiming() {
  const [timing, setTiming] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_TIMING, ...JSON.parse(saved) } : DEFAULT_TIMING;
    } catch {
      return DEFAULT_TIMING;
    }
  });

  const timerRef = useRef(null);

  // Listen for timing updates saved from GameTimingModal
  const reloadTiming = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setTiming(saved ? { ...DEFAULT_TIMING, ...JSON.parse(saved) } : DEFAULT_TIMING);
    } catch {
      setTiming(DEFAULT_TIMING);
    }
  }, []);

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

  return { timing, startTimer, stopTimer, reloadTiming };
}