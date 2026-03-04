import { useEffect } from 'react';
import type { PlaybackActions } from './usePlayback';

export function useKeyboardShortcuts(
  actions: PlaybackActions,
  isPlaying: boolean,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          actions.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.stepBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.stepForward();
          break;
        case '1':
          actions.setSpeed(0.5);
          break;
        case '2':
          actions.setSpeed(1);
          break;
        case '3':
          actions.setSpeed(2);
          break;
        case '4':
          actions.setSpeed(3);
          break;
        case '5':
          actions.setSpeed(5);
          break;
        case 'Escape':
          actions.goToStep(0);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, isPlaying]);
}
