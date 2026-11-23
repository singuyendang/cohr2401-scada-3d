import { create } from 'zustand';
import type {
  B5ScreenId,
  BuildingId,
  ControlMode,
  DemandId,
  DemandSequencer,
  FaceplateType,
  OpenFaceplate,
  PlantState,
  SandboxControls,
  SensorAlarmConfig,
} from '../types/scada.ts';
import { createInitialB5State } from '../simulation/initialB5State.ts';
import { stepBuilding5Plant } from '../simulation/physicsB5.ts';
import { clamp, VFD_MIN_HZ, VFD_MAX_HZ } from '../simulation/pid.ts';
import { formatWinccTime } from '../simulation/alarmsAndTrends.ts';

export interface LocatedTarget {
  screen: B5ScreenId;
  tag: string;
  label: string;
  faceplateType?: FaceplateType;
  faceplateTitle?: string;
  ts?: number;
}

interface B5Store {
  plant: PlantState;
  activeBuilding: BuildingId;
  activeScreen: B5ScreenId;
  sandboxOpen: boolean;
  openFaceplates: OpenFaceplate[];
  topZIndex: number;
  selectedTrendTags: string[];
  locatedTarget: LocatedTarget | null;

  // Loop
  tick: (dtSec?: number) => void;

  // Navigation (auto-hides floating faceplates when switching screens per user spec)
  setActiveBuilding: (building: BuildingId) => void;
  setActiveScreen: (screen: B5ScreenId) => void;
  jumpToTarget: (target: LocatedTarget) => void;
  clearLocatedTarget: () => void;
  setSandboxOpen: (open: boolean) => void;

  // Trend selected Analog Input tags (persisted across screen switches!)
  setSelectedTrendTags: (tags: string[]) => void;
  addTrendTag: (tag: string) => void;
  removeTrendTag: (tag: string) => void;

  // Multi-popup draggable faceplate manager
  openFaceplate: (type: FaceplateType, targetTag: string, title: string) => void;
  closeFaceplate: (id: string) => void;
  closeAllFaceplates: () => void;
  focusFaceplate: (id: string) => void;
  moveFaceplate: (id: string, x: number, y: number) => void;

  // Equipment, Valve, PID, Sensor, Demand, AHU actions
  setEquipmentMode: (tag: string, mode: ControlMode) => void;
  commandEquipment: (tag: string, cmd: 'START' | 'STOP', manualSP?: number) => void;
  setEquipmentManualSP: (tag: string, sp: number) => void;
  setChillerTempSP: (tag: string, spTemp: number) => void;
  setEquipmentFault: (tag: string, faulted: boolean) => void;
  clearEquipmentFault: (tag: string) => void;

  commandValve: (tag: string, patch: { mode?: ControlMode; cmdOpen?: boolean; targetPct?: number; faulted?: boolean }) => void;

  updatePid: (
    pidTag: string,
    patch: { sp?: number; kp?: number; ki?: number; kd?: number; autoOutMinPct?: number; autoOutMaxPct?: number; reset?: boolean }
  ) => void;

  updateDemand: (
    id: DemandId,
    patch: Partial<Pick<DemandSequencer, 'enable' | 'startUpSP' | 'shutDownSP' | 'startUpDelaySec' | 'shutDownDelaySec' | 'priors' | 'chillerCapacityStartSP' | 'chillerCapacityStopSP'>>
  ) => void;

  setSensorOverride: (tag: string, manualOverride: boolean, overrideValue?: number) => void;
  setSensorFault: (tag: string, faulted: boolean) => void;
  updateSensorAlarmLimits: (tag: string, patch: Partial<SensorAlarmConfig>) => void;

  updateAhuSetpoints: (ahuTag: string, patch: { roomTempSP?: number; roomRhSP?: number; dewPointSP?: number; sasSP?: number }) => void;

  // Sandbox & Alarms
  updateSandbox: (patch: Partial<SandboxControls>) => void;
  acknowledgeAlarm: (id: string) => void;
  acknowledgeAllAlarms: () => void;
  clearAllFaults: () => void;
  resetPlant: () => void;
}

export const useB5Store = create<B5Store>((set) => ({
  plant: createInitialB5State(),
  activeBuilding: 'B5',
  activeScreen: 'b5_overview',
  sandboxOpen: false,
  openFaceplates: [],
  topZIndex: 40,
  selectedTrendTags: ['B51F_CHWPS1', 'B51F_CHSTS1', 'B51F_TT10505', 'B51F_DPT10501'],
  locatedTarget: null,

  tick: (dtSec = 0.5) =>
    set((state) => {
      if (state.plant.sandbox.paused) return state;
      return { plant: stepBuilding5Plant(state.plant, dtSec) };
    }),

  setActiveBuilding: (building) =>
    set({
      activeBuilding: building,
      activeScreen: building === 'B2' ? 'b2_overview' : building === 'B3' ? 'b3_overview' : 'b5_overview',
      openFaceplates: [],
      locatedTarget: null,
    }),

  setActiveScreen: (screen) =>
    set((state) => ({
      activeBuilding:
        screen === 'site_overview' || screen === 'plant_3d_training'
          ? state.activeBuilding
          : screen.startsWith('b2_')
          ? 'B2'
          : screen.startsWith('b3_')
          ? 'B3'
          : screen.startsWith('b5_overview') ||
            screen === 'b5_ofrac' ||
            screen === 'b5_cw_ahu' ||
            screen === 'b5_air_ahu' ||
            screen === 'b5_pcw' ||
            screen === 'b5_exh' ||
            screen === 'b5_pms'
          ? 'B5'
          : state.activeBuilding,
      activeScreen: screen,
      // Spec requirement: auto-hide floating faceplates when switching to another tab
      openFaceplates: [],
      locatedTarget: null,
    })),

  jumpToTarget: (target) =>
    set({
      activeScreen: target.screen,
      openFaceplates: [],
      locatedTarget: { ...target, ts: Date.now() },
    }),

  clearLocatedTarget: () => set({ locatedTarget: null }),

  setSandboxOpen: (open) => set({ sandboxOpen: open }),

  setSelectedTrendTags: (tags) => set({ selectedTrendTags: tags.slice(0, 8) }),

  addTrendTag: (tag) =>
    set((state) => {
      if (state.selectedTrendTags.includes(tag) || state.selectedTrendTags.length >= 8) return state;
      return { selectedTrendTags: [...state.selectedTrendTags, tag] };
    }),

  removeTrendTag: (tag) =>
    set((state) => ({
      selectedTrendTags: state.selectedTrendTags.filter((t) => t !== tag),
    })),

  openFaceplate: (type, targetTag, title) =>
    set((state) => {
      const id = `${type}:${targetTag}`;
      const existing = state.openFaceplates.find((f) => f.id === id);
      const nextZ = state.topZIndex + 1;
      if (existing) {
        return {
          topZIndex: nextZ,
          openFaceplates: state.openFaceplates.map((f) => (f.id === id ? { ...f, zIndex: nextZ } : f)),
        };
      }
      const offset = (state.openFaceplates.length % 6) * 28;
      const newWin: OpenFaceplate = {
        id,
        type,
        targetTag,
        title,
        x: 280 + offset,
        y: 88 + offset,
        zIndex: nextZ,
      };
      return {
        topZIndex: nextZ,
        openFaceplates: [...state.openFaceplates, newWin],
      };
    }),

  closeFaceplate: (id) =>
    set((state) => ({
      openFaceplates: state.openFaceplates.filter((f) => f.id !== id),
    })),

  closeAllFaceplates: () => set({ openFaceplates: [] }),

  focusFaceplate: (id) =>
    set((state) => {
      const nextZ = state.topZIndex + 1;
      return {
        topZIndex: nextZ,
        openFaceplates: state.openFaceplates.map((f) => (f.id === id ? { ...f, zIndex: nextZ } : f)),
      };
    }),

  moveFaceplate: (id, x, y) =>
    set((state) => ({
      openFaceplates: state.openFaceplates.map((f) => (f.id === id ? { ...f, x, y } : f)),
    })),

  setEquipmentMode: (tag, mode) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: { ...u, mode },
          },
        },
      };
    }),

  commandEquipment: (tag, cmd, manualSP) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      const sp =
        manualSP !== undefined
          ? u.kind === 'vfd'
            ? clamp(manualSP, VFD_MIN_HZ, VFD_MAX_HZ)
            : clamp(manualSP, 0, 100)
          : u.manualSP;
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: {
              ...u,
              cmdStart: cmd === 'START',
              manualSP: sp,
            },
          },
        },
      };
    }),

  setEquipmentManualSP: (tag, sp) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      const clamped = u.kind === 'vfd' ? clamp(sp, VFD_MIN_HZ, VFD_MAX_HZ) : clamp(sp, 0, 100);
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: { ...u, manualSP: clamped },
          },
        },
      };
    }),

  setChillerTempSP: (tag, spTemp) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: {
              ...u,
              telemetry: { ...u.telemetry, spTemp: clamp(spTemp, 4.0, 55.0) },
            },
          },
        },
      };
    }),

  setEquipmentFault: (tag, faulted) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: {
              ...u,
              faulted,
              status: faulted ? 'FAULTED' : 'STOPPED',
              frequencyHz: faulted ? 0 : u.frequencyHz,
              loadPct: faulted ? 0 : u.loadPct,
            },
          },
        },
      };
    }),

  clearEquipmentFault: (tag) =>
    set((state) => {
      const u = state.plant.equipment[tag];
      if (!u) return state;
      return {
        plant: {
          ...state.plant,
          equipment: {
            ...state.plant.equipment,
            [tag]: { ...u, faulted: false, status: 'STOPPED' },
          },
        },
      };
    }),

  commandValve: (tag, patch) =>
    set((state) => {
      const v = state.plant.valves[tag];
      if (!v) return state;
      const nextMode = v.manualOnly ? 'MANUAL' : patch.mode ?? v.mode;
      const nextCmdOpen = patch.cmdOpen ?? v.cmdOpen;
      const nextTargetPct =
        patch.targetPct !== undefined
          ? clamp(patch.targetPct, 0, 100)
          : v.kind === 'XVAL'
          ? nextCmdOpen
            ? 100
            : 0
          : v.targetPct;
      return {
        plant: {
          ...state.plant,
          valves: {
            ...state.plant.valves,
            [tag]: {
              ...v,
              mode: nextMode,
              cmdOpen: nextCmdOpen,
              targetPct: nextTargetPct,
              faulted: patch.faulted ?? v.faulted,
            },
          },
        },
      };
    }),

  updatePid: (pidTag, patch) =>
    set((state) => {
      const p = state.plant.pids[pidTag];
      if (!p) return state;
      const minFloor = p.isValvePid ? 0 : 30; // VFD floor = 30% (15.0 Hz), Valve = 0%
      const nextMin =
        patch.autoOutMinPct !== undefined ? clamp(patch.autoOutMinPct, minFloor, 100) : Math.max(minFloor, p.autoOutMinPct);
      const nextMax =
        patch.autoOutMaxPct !== undefined ? clamp(patch.autoOutMaxPct, nextMin, 100) : Math.max(nextMin, p.autoOutMaxPct);
      return {
        plant: {
          ...state.plant,
          pids: {
            ...state.plant.pids,
            [pidTag]: {
              ...p,
              sp: patch.sp !== undefined ? clamp(patch.sp, p.minSP, p.maxSP) : p.sp,
              kp: patch.kp !== undefined ? Math.max(0, patch.kp) : p.kp,
              ki: patch.ki !== undefined ? Math.max(0, patch.ki) : p.ki,
              kd: patch.kd !== undefined ? Math.max(0, patch.kd) : p.kd,
              autoOutMinPct: nextMin,
              autoOutMaxPct: nextMax,
              integral: patch.reset ? clamp(50, nextMin, nextMax) : p.integral,
              lastError: patch.reset ? 0 : p.lastError,
              dFiltered: patch.reset ? 0 : p.dFiltered,
            },
          },
        },
      };
    }),

  updateDemand: (id, patch) =>
    set((state) => {
      const d = state.plant.demands[id];
      if (!d) return state;
      return {
        plant: {
          ...state.plant,
          demands: {
            ...state.plant.demands,
            [id]: { ...d, ...patch },
          },
        },
      };
    }),

  setSensorOverride: (tag, manualOverride, overrideValue) =>
    set((state) => {
      const s = state.plant.sensors[tag];
      if (!s) return state;
      const val = overrideValue !== undefined ? clamp(overrideValue, s.minRange, s.maxRange) : s.overrideValue;
      return {
        plant: {
          ...state.plant,
          sensors: {
            ...state.plant.sensors,
            [tag]: {
              ...s,
              manualOverride,
              overrideValue: val,
              pv: manualOverride ? val : s.pv,
            },
          },
        },
      };
    }),

  setSensorFault: (tag, faulted) =>
    set((state) => {
      const s = state.plant.sensors[tag];
      if (!s) return state;
      return {
        plant: {
          ...state.plant,
          sensors: {
            ...state.plant.sensors,
            [tag]: { ...s, faulted },
          },
        },
      };
    }),

  updateSensorAlarmLimits: (tag, patch) =>
    set((state) => {
      const s = state.plant.sensors[tag];
      if (!s) return state;
      return {
        plant: {
          ...state.plant,
          sensors: {
            ...state.plant.sensors,
            [tag]: {
              ...s,
              alarms: { ...s.alarms, ...patch },
            },
          },
        },
      };
    }),

  updateAhuSetpoints: (ahuTag, patch) =>
    set((state) => {
      const cfg = state.plant.ahus[ahuTag];
      if (!cfg) return state;
      const nextCfg = { ...cfg, ...patch };
      const nextPids = { ...state.plant.pids };
      if (patch.sasSP !== undefined && nextPids[cfg.fanPidTag]) {
        nextPids[cfg.fanPidTag] = { ...nextPids[cfg.fanPidTag], sp: patch.sasSP };
      }
      if (patch.dewPointSP !== undefined && nextPids[cfg.cwPidTag]) {
        nextPids[cfg.cwPidTag] = { ...nextPids[cfg.cwPidTag], sp: patch.dewPointSP };
      }
      if (patch.roomTempSP !== undefined && cfg.hwPidTag && nextPids[cfg.hwPidTag]) {
        nextPids[cfg.hwPidTag] = { ...nextPids[cfg.hwPidTag], sp: patch.roomTempSP };
      }
      return {
        plant: {
          ...state.plant,
          ahus: { ...state.plant.ahus, [ahuTag]: nextCfg },
          pids: nextPids,
        },
      };
    }),

  updateSandbox: (patch) =>
    set((state) => ({
      plant: {
        ...state.plant,
        sandbox: { ...state.plant.sandbox, ...patch },
      },
    })),

  acknowledgeAlarm: (id) =>
    set((state) => {
      const ackNow = formatWinccTime(new Date());
      return {
        plant: {
          ...state.plant,
          alarms: state.plant.alarms.map((a) =>
            a.id === id
              ? {
                  ...a,
                  acknowledged: true,
                  ackTime: a.ackTime ?? ackNow,
                  state: a.active ? 'CAME_IN_ACK' : 'WENT_OUT_ACK',
                }
              : a
          ),
        },
      };
    }),

  acknowledgeAllAlarms: () =>
    set((state) => {
      const ackNow = formatWinccTime(new Date());
      return {
        plant: {
          ...state.plant,
          alarms: state.plant.alarms.map((a) =>
            a.acknowledged
              ? a
              : {
                  ...a,
                  acknowledged: true,
                  ackTime: a.ackTime ?? ackNow,
                  state: a.active ? 'CAME_IN_ACK' : 'WENT_OUT_ACK',
                }
          ),
        },
      };
    }),

  clearAllFaults: () =>
    set((state) => {
      const equipment = { ...state.plant.equipment };
      for (const k of Object.keys(equipment)) {
        if (equipment[k].faulted) {
          equipment[k] = { ...equipment[k], faulted: false, status: 'STOPPED' };
        }
      }
      const sensors = { ...state.plant.sensors };
      for (const k of Object.keys(sensors)) {
        if (sensors[k].faulted) sensors[k] = { ...sensors[k], faulted: false };
      }
      const valves = { ...state.plant.valves };
      for (const k of Object.keys(valves)) {
        if (valves[k].faulted) valves[k] = { ...valves[k], faulted: false };
      }
      return { plant: { ...state.plant, equipment, sensors, valves } };
    }),

  resetPlant: () =>
    set({
      plant: createInitialB5State(),
      openFaceplates: [],
    }),
}));
