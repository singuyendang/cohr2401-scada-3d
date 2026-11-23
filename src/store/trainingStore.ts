import { create } from 'zustand';
import {
  DEFAULT_3D_NODES,
  parseLayoutOverrides,
  serializeLayoutOverrides,
  type B51FLayerId,
  type NodeTransformOverride,
  type Zone3DId,
} from '../training/plant3dLayout.ts';
import type { B21FLayerId } from '../training/b21f3dDetail.ts';
import type { B31FLayerId } from '../training/b31f3dDetail.ts';
import { TRAINING_CHALLENGES } from '../training/trainingScenarios.ts';
import { SOP_MANUALS } from '../training/sopManual.ts';
import { createInitialB5State } from '../simulation/initialB5State.ts';
import { useB5Store } from './b5Store.ts';

const STORAGE_KEY = 'cohr2401_3d_layout_v14';

function loadStoredOverrides(): Record<string, NodeTransformOverride> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return parseLayoutOverrides(raw) ?? {};
  } catch {
    return {};
  }
}

function saveStoredOverrides(overrides: Record<string, NodeTransformOverride>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, serializeLayoutOverrides(overrides));
  } catch {
    // Ignore quota/storage errors
  }
}

export type TrainingPanelTab = 'explore' | 'sop' | 'challenge';

export interface ActiveChallengeRun {
  challengeId: string;
  startedSimTimeSec: number;
  durationSec: number;
  status: 'RUNNING' | 'PASSED' | 'FAILED';
  finishedAtSimTimeSec: number | null;
}

interface TrainingStore {
  activeZone: Zone3DId;
  panelTab: TrainingPanelTab;
  editLayoutMode: boolean;
  snapToGrid: boolean;
  showLabels: boolean;
  flowEnabled: boolean;
  flowSpeed: number; // 0.25 .. 3.0 multiplier
  b51fLayers: Record<B51FLayerId, boolean>;
  b51fFocusLayer: B51FLayerId | 'all';
  b21fLayers: Record<B21FLayerId, boolean>;
  b21fFocusLayer: B21FLayerId | 'all';
  b31fLayers: Record<B31FLayerId, boolean>;
  b31fFocusLayer: B31FLayerId | 'all';
  cameraPresetSeq: number;
  selectedNodeId: string | null;
  customTransforms: Record<string, NodeTransformOverride>;

  // Guided SOP state
  activeSopId: string | null;
  activeSopStepIndex: number;

  // Timed Challenge state
  activeChallenge: ActiveChallengeRun | null;

  // Actions
  setActiveZone: (zone: Zone3DId) => void;
  setPanelTab: (tab: TrainingPanelTab) => void;
  setEditLayoutMode: (on: boolean) => void;
  setSnapToGrid: (on: boolean) => void;
  setShowLabels: (on: boolean) => void;
  setFlowEnabled: (on: boolean) => void;
  setFlowSpeed: (speed: number) => void;
  isolateB51FLayer: (layer: B51FLayerId | 'all') => void;
  toggleB51FLayer: (layer: B51FLayerId) => void;
  isolateB21FLayer: (layer: B21FLayerId | 'all') => void;
  toggleB21FLayer: (layer: B21FLayerId) => void;
  isolateB31FLayer: (layer: B31FLayerId | 'all') => void;
  toggleB31FLayer: (layer: B31FLayerId) => void;
  setSelectedNodeId: (id: string | null) => void;

  // 3D Drag & Drop Layout Editing
  updateNodeTransform: (nodeId: string, patch: Partial<NodeTransformOverride>) => void;
  rotateSelectedNode90: () => void;
  resetZoneLayout: (zone: Zone3DId) => void;
  resetAllLayouts: () => void;
  exportLayoutJson: () => string;
  importLayoutJson: (raw: string) => boolean;

  // SOP Actions
  startSop: (sopId: string) => void;
  setSopStepIndex: (idx: number) => void;
  stopSop: () => void;

  // Challenge Actions
  startChallenge: (challengeId: string) => void;
  stopChallenge: () => void;
  syncChallengeStatus: (simTimeSec: number) => void;
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  activeZone: 'site',
  panelTab: 'explore',
  editLayoutMode: false,
  snapToGrid: true,
  showLabels: true,
  flowEnabled: true,
  flowSpeed: 0.25,
  b51fLayers: { chiller: true, pcw: true, ac: true, di: true },
  b51fFocusLayer: 'all',
  b21fLayers: { pcw: true, cleanroom: true },
  b21fFocusLayer: 'all',
  b31fLayers: { outdoor: true, warehouse: true },
  b31fFocusLayer: 'all',
  cameraPresetSeq: 0,
  selectedNodeId: null,
  customTransforms: loadStoredOverrides(),

  activeSopId: null,
  activeSopStepIndex: 0,
  activeChallenge: null,

  setActiveZone: (zone) => {
    // Redirect legacy b5_utilities calls cleanly into unified B5 1F floor view
    if (zone === 'b5_utilities') {
      set((s) => ({
        activeZone: 'b5_chiller',
        selectedNodeId: null,
        b51fLayers: { chiller: true, pcw: true, ac: true, di: true },
        b51fFocusLayer: 'all',
        cameraPresetSeq: s.cameraPresetSeq + 1,
      }));
      return;
    }
    set({ activeZone: zone, selectedNodeId: null });
  },
  setPanelTab: (tab) => set({ panelTab: tab }),
  setEditLayoutMode: (on) => set({ editLayoutMode: on }),
  setSnapToGrid: (on) => set({ snapToGrid: on }),
  setShowLabels: (on) => set({ showLabels: on }),
  setFlowEnabled: (on) => set({ flowEnabled: on }),
  setFlowSpeed: (speed) => set({ flowSpeed: Math.max(0.25, Math.min(3.0, Number(speed.toFixed(2)))) }),
  isolateB51FLayer: (layer) =>
    set((state) => ({
      activeZone: 'b5_chiller',
      b51fFocusLayer: layer,
      b51fLayers:
        layer === 'all'
          ? { chiller: true, pcw: true, ac: true, di: true }
          : {
              chiller: layer === 'chiller',
              pcw: layer === 'pcw',
              ac: layer === 'ac',
              di: layer === 'di',
            },
      cameraPresetSeq: state.cameraPresetSeq + 1,
    })),
  toggleB51FLayer: (layer) =>
    set((state) => {
      const next = { ...state.b51fLayers, [layer]: !state.b51fLayers[layer] };
      const activeKeys = (Object.keys(next) as B51FLayerId[]).filter((k) => next[k]);
      return {
        b51fLayers: next,
        b51fFocusLayer: activeKeys.length === 1 ? activeKeys[0] : 'all',
      };
    }),
  isolateB21FLayer: (layer) =>
    set((state) => ({
      activeZone: 'b2_plant',
      b21fFocusLayer: layer,
      b21fLayers:
        layer === 'all'
          ? { pcw: true, cleanroom: true }
          : {
              pcw: layer === 'pcw',
              cleanroom: layer === 'cleanroom',
            },
      cameraPresetSeq: state.cameraPresetSeq + 1,
    })),
  toggleB21FLayer: (layer) =>
    set((state) => {
      const next = { ...state.b21fLayers, [layer]: !state.b21fLayers[layer] };
      const activeKeys = (Object.keys(next) as B21FLayerId[]).filter((k) => next[k]);
      return {
        b21fLayers: next,
        b21fFocusLayer: activeKeys.length === 1 ? activeKeys[0] : 'all',
      };
    }),
  isolateB31FLayer: (layer) =>
    set((state) => ({
      activeZone: 'b3_plant',
      b31fFocusLayer: layer,
      b31fLayers:
        layer === 'all'
          ? { outdoor: true, warehouse: true }
          : {
              outdoor: layer === 'outdoor',
              warehouse: layer === 'warehouse',
            },
      cameraPresetSeq: state.cameraPresetSeq + 1,
    })),
  toggleB31FLayer: (layer) =>
    set((state) => {
      const next = { ...state.b31fLayers, [layer]: !state.b31fLayers[layer] };
      const activeKeys = (Object.keys(next) as B31FLayerId[]).filter((k) => next[k]);
      return {
        b31fLayers: next,
        b31fFocusLayer: activeKeys.length === 1 ? activeKeys[0] : 'all',
      };
    }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeTransform: (nodeId, patch) =>
    set((state) => {
      const base = DEFAULT_3D_NODES.find((n) => n.id === nodeId);
      if (!base) return state;
      const cur = state.customTransforms[nodeId] ?? {
        x: base.pos[0],
        z: base.pos[2],
        rotY: base.rotY ?? 0,
      };
      const nextOv: NodeTransformOverride = {
        x: patch.x !== undefined ? Number(patch.x.toFixed(2)) : cur.x,
        z: patch.z !== undefined ? Number(patch.z.toFixed(2)) : cur.z,
        rotY: patch.rotY !== undefined ? patch.rotY : cur.rotY,
      };
      const nextMap = { ...state.customTransforms, [nodeId]: nextOv };
      saveStoredOverrides(nextMap);
      return { customTransforms: nextMap };
    }),

  rotateSelectedNode90: () => {
    const { selectedNodeId, customTransforms, updateNodeTransform } = get();
    if (!selectedNodeId) return;
    const base = DEFAULT_3D_NODES.find((n) => n.id === selectedNodeId);
    if (!base) return;
    const curRot = customTransforms[selectedNodeId]?.rotY ?? base.rotY ?? 0;
    const nextRot = (curRot + Math.PI / 2) % (Math.PI * 2);
    updateNodeTransform(selectedNodeId, { rotY: nextRot });
  },

  resetZoneLayout: (zone) =>
    set((state) => {
      const idsInZone = new Set(DEFAULT_3D_NODES.filter((n) => n.zone === zone).map((n) => n.id));
      const nextMap: Record<string, NodeTransformOverride> = {};
      for (const [k, v] of Object.entries(state.customTransforms)) {
        if (!idsInZone.has(k)) nextMap[k] = v;
      }
      saveStoredOverrides(nextMap);
      return { customTransforms: nextMap };
    }),

  resetAllLayouts: () => {
    saveStoredOverrides({});
    set({ customTransforms: {} });
  },

  exportLayoutJson: () => serializeLayoutOverrides(get().customTransforms),

  importLayoutJson: (raw) => {
    const parsed = parseLayoutOverrides(raw);
    if (!parsed) return false;
    saveStoredOverrides(parsed);
    set({ customTransforms: parsed });
    return true;
  },

  startSop: (sopId) => {
    const sop = SOP_MANUALS.find((s) => s.id === sopId);
    if (!sop) return;
    const mappedZone: Zone3DId = sop.zone === 'b5_utilities' ? 'b5_chiller' : sop.zone;
    const focusLayer: B51FLayerId | 'all' = sop.id.includes('pcw')
      ? 'pcw'
      : sop.id.includes('oflac') || sop.id.includes('ofrac')
      ? 'ac'
      : sop.id.includes('di')
      ? 'di'
      : sop.id.includes('chiller')
      ? 'chiller'
      : 'all';
    set((state) => ({
      activeSopId: sopId,
      activeSopStepIndex: 0,
      activeChallenge: null,
      panelTab: 'sop',
      activeZone: mappedZone,
      editLayoutMode: false,
      ...(mappedZone === 'b5_chiller'
        ? {
            b51fFocusLayer: focusLayer,
            b51fLayers:
              focusLayer === 'all'
                ? { chiller: true, pcw: true, ac: true, di: true }
                : {
                    chiller: focusLayer === 'chiller',
                    pcw: focusLayer === 'pcw',
                    ac: focusLayer === 'ac',
                    di: focusLayer === 'di',
                  },
            cameraPresetSeq: state.cameraPresetSeq + 1,
          }
        : {}),
    }));
  },

  setSopStepIndex: (idx) => set({ activeSopStepIndex: idx }),
  stopSop: () => set({ activeSopId: null, activeSopStepIndex: 0 }),

  startChallenge: (challengeId) => {
    const ch = TRAINING_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) return;
    const freshPlant = ch.injectFault(createInitialB5State());
    // Ensure simulation is unpaused & running at comfortable real-time or user speed
    freshPlant.sandbox.paused = false;
    useB5Store.setState({
      plant: freshPlant,
      openFaceplates: [],
      locatedTarget: null,
    });
    // Tick once immediately so alarms/fault states register right away
    useB5Store.getState().tick(0.5);

    const startSim = useB5Store.getState().plant.simTimeSec;
    const mappedZone: Zone3DId = ch.zone === 'b5_utilities' ? 'b5_chiller' : ch.zone;
    const focusLayer: B51FLayerId | 'all' =
      ch.scadaScreen === 'b5_pcw'
        ? 'pcw'
        : ch.scadaScreen === 'b5_oflac' || ch.scadaScreen === 'b5_ofrac' || ch.scadaScreen === 'b5_pv'
        ? 'ac'
        : ch.scadaScreen === 'b5_di'
        ? 'di'
        : 'chiller';
    set((state) => ({
      activeChallenge: {
        challengeId,
        startedSimTimeSec: startSim,
        durationSec: ch.durationSec,
        status: 'RUNNING',
        finishedAtSimTimeSec: null,
      },
      activeSopId: null,
      panelTab: 'challenge',
      activeZone: mappedZone,
      editLayoutMode: false,
      ...(mappedZone === 'b5_chiller'
        ? {
            b51fFocusLayer: focusLayer,
            b51fLayers: {
              chiller: focusLayer === 'chiller',
              pcw: focusLayer === 'pcw',
              ac: focusLayer === 'ac',
              di: focusLayer === 'di',
            },
            cameraPresetSeq: state.cameraPresetSeq + 1,
          }
        : {}),
    }));
  },

  stopChallenge: () => set({ activeChallenge: null }),

  syncChallengeStatus: (simTimeSec) => {
    const run = get().activeChallenge;
    if (!run || run.status !== 'RUNNING') return;
    const ch = TRAINING_CHALLENGES.find((c) => c.id === run.challengeId);
    if (!ch) return;

    const plant = useB5Store.getState().plant;
    const allMet = ch.criteria.every((c) => c.check(plant));
    const elapsed = simTimeSec - run.startedSimTimeSec;

    if (allMet && elapsed >= 3) {
      set({
        activeChallenge: {
          ...run,
          status: 'PASSED',
          finishedAtSimTimeSec: simTimeSec,
        },
      });
    } else if (elapsed >= run.durationSec) {
      set({
        activeChallenge: {
          ...run,
          status: 'FAILED',
          finishedAtSimTimeSec: simTimeSec,
        },
      });
    }
  },
}));
