import React from 'react';
import { Award, BookOpen, Box, CheckCircle2, Clock, X, XCircle } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';
import { useTrainingStore } from '../../store/trainingStore.ts';
import { TRAINING_CHALLENGES } from '../../training/trainingScenarios.ts';
import { SOP_MANUALS } from '../../training/sopManual.ts';

function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Floating Training HUD pinned cleanly above SCADA 2D screens whenever a Guided SOP
 * or Timed OTS Challenge is in progress, allowing seamless 3D <-> 2D SCADA operation!
 */
export const TrainingHudBanner: React.FC = () => {
  const activeScreen = useB5Store((s) => s.activeScreen);
  const plant = useB5Store((s) => s.plant);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const activeChallenge = useTrainingStore((s) => s.activeChallenge);
  const stopChallenge = useTrainingStore((s) => s.stopChallenge);
  const activeSopId = useTrainingStore((s) => s.activeSopId);
  const activeSopStepIndex = useTrainingStore((s) => s.activeSopStepIndex);
  const stopSop = useTrainingStore((s) => s.stopSop);

  if (activeScreen === 'plant_3d_training') return null;

  if (activeChallenge) {
    const ch = TRAINING_CHALLENGES.find((c) => c.id === activeChallenge.challengeId);
    if (!ch) return null;
    const results = ch.criteria.map((c) => c.check(plant));
    const metCount = results.filter(Boolean).length;
    const elapsed =
      (activeChallenge.finishedAtSimTimeSec ?? plant.simTimeSec) - activeChallenge.startedSimTimeSec;
    const remaining = Math.max(0, activeChallenge.durationSec - elapsed);

    const tone =
      activeChallenge.status === 'PASSED'
        ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
        : activeChallenge.status === 'FAILED'
        ? 'bg-rose-950/95 border-rose-400 text-rose-100'
        : 'bg-indigo-950/95 border-cyan-400 text-cyan-100';

    return (
      <div className={`mx-3 mt-2 px-3 py-2 rounded-md border font-mono text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg ${tone}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-black">
            {activeChallenge.status === 'PASSED' ? (
              <Award className="w-4 h-4 text-emerald-400" />
            ) : activeChallenge.status === 'FAILED' ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Clock className="w-4 h-4 text-cyan-300" />
            )}
            [{ch.code}] {ch.title}
          </span>
          <span className="px-2 py-0.5 rounded bg-black/40 font-black">
            {activeChallenge.status === 'PASSED'
              ? 'PASSED'
              : activeChallenge.status === 'FAILED'
              ? 'FAILED'
              : `Left ${formatCountdown(remaining)}`}
          </span>
          <span className="px-2 py-0.5 rounded bg-black/30 text-[11px]">
            Criteria: <strong>{metCount}/3</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('plant_3d_training')}
            className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" /> Back to 3D &amp; Details
          </button>
          <button
            onClick={stopChallenge}
            title="End Challenge"
            className="p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (activeSopId) {
    const sop = SOP_MANUALS.find((s) => s.id === activeSopId);
    if (!sop) return null;
    const step = sop.steps[activeSopStepIndex] ?? sop.steps[0];
    const done = step ? step.checkDone(plant) : false;

    return (
      <div className="mx-3 mt-2 px-3 py-2 rounded-md border border-sky-400 bg-sky-950/95 text-sky-100 font-mono text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
          <span className="font-black">
            [{sop.code}] Step {activeSopStepIndex + 1}/{sop.steps.length}: {step.title}
          </span>
          {done && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-bold text-[10.5px]">
              <CheckCircle2 className="w-3 h-3" /> Condition Met
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('plant_3d_training')}
            className="px-2.5 py-1 rounded bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" /> Back to 3D &amp; SOP
          </button>
          <button onClick={stopSop} title="Close SOP Guide" className="p-1 rounded hover:bg-white/10 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
