import { useState, useCallback, useRef, useEffect } from 'react';
import type { CircuitStep } from '../lib/types';

const SPEED_LEVELS = [0.5, 1, 2, 3, 5] as const;
const BASE_INTERVAL_MS = 800;

export interface PlaybackState {
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  totalSteps: number;
}

export interface PlaybackActions {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  goToStep: (n: number) => void;
  setSpeed: (level: number) => void;
}

export function usePlayback(steps: CircuitStep[]): {
  state: PlaybackState;
  actions: PlaybackActions;
  currentStepData: CircuitStep;
} {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const totalSteps = steps.length;

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
    lastTickRef.current = performance.now();
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        lastTickRef.current = performance.now();
      }
      return !prev;
    });
  }, []);

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const stepBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (n: number) => {
      setCurrentStep(Math.max(0, Math.min(n, totalSteps - 1)));
    },
    [totalSteps],
  );

  const setSpeed = useCallback((level: number) => {
    const clamped = SPEED_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev,
    );
    setSpeedState(clamped);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = BASE_INTERVAL_MS / speed;
    let accumulated = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      accumulated += now - lastTime;
      lastTime = now;

      if (accumulated >= interval) {
        accumulated -= interval;
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, speed, totalSteps]);

  return {
    state: { currentStep, isPlaying, speed, totalSteps },
    actions: {
      play,
      pause,
      togglePlayPause,
      stepForward,
      stepBack,
      goToStep,
      setSpeed,
    },
    currentStepData: steps[currentStep],
  };
}
