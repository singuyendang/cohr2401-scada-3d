import { useEffect } from 'react';
import { useB5Store } from '../store/b5Store.ts';
import { useTrainingStore } from '../store/trainingStore.ts';

export function usePlantLoop() {
  const tick = useB5Store((s) => s.tick);

  useEffect(() => {
    // Seed initial trend point immediately on mount
    tick(0.5);
    const id = window.setInterval(() => {
      tick(0.5);
      const simTime = useB5Store.getState().plant.simTimeSec;
      useTrainingStore.getState().syncChallengeStatus(simTime);
    }, 500);
    return () => window.clearInterval(id);
  }, [tick]);
}
