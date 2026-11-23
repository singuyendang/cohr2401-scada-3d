import type { DemandSequencer, EquipmentUnit, AnalogSensor } from '../types/scada.ts';

/**
 * Returns unit tags ordered by ascending priority (1 = highest priority).
 */
export function getUnitsByPriority(seq: DemandSequencer): { tag: string; prior: number; idx: number }[] {
  return seq.unitTags
    .map((tag, idx) => ({ tag, prior: seq.priors[idx] ?? idx + 1, idx }))
    .sort((a, b) => a.prior - b.prior);
}

/**
 * Evaluates a single FB_Demand sequencer block (TIA FB_Demandv0/v1/v2).
 * Supports:
 *  - Editable Enable, StartUpSP, ShutDownSP, StartUpDelaySec, ShutDownDelaySec, Priors[]
 *  - 3-condition Chiller demand (B5CH): Avg FLA Capacity + CHSTS1 Temp Threshold + Timer
 *  - Failover after StartUpDelay when a running unit trips into FAULTED
 *  - Minimum required active count (e.g., min 2 Cooling Towers per active Chiller, min 1 CHWP/CWP per active Chiller)
 */
export function stepDemandSequencer(
  seq: DemandSequencer,
  equipment: Record<string, EquipmentUnit>,
  sensors: Record<string, AnalogSensor>,
  dt: number,
  minRequiredCount: number = 1
): { nextSeq: DemandSequencer; desiredAutoStartTags: Set<string> } {
  const ordered = getUnitsByPriority(seq);
  const runningUnits = ordered.filter(({ tag }) => {
    const u = equipment[tag];
    return u && (u.status === 'RUNNING' || u.status === 'STARTING') && !u.faulted;
  });
  const availableAutoUnits = ordered.filter(({ tag }) => {
    const u = equipment[tag];
    return u && u.mode === 'AUTO' && !u.faulted;
  });
  const standbyAutoUnits = availableAutoUnits.filter(({ tag }) => {
    const u = equipment[tag];
    return u && u.status === 'STOPPED';
  });
  const runningAutoUnits = availableAutoUnits.filter(({ tag }) => {
    const u = equipment[tag];
    return u && (u.status === 'RUNNING' || u.status === 'STARTING');
  });

  const runningCount = runningUnits.length;

  if (!seq.enable) {
    return {
      nextSeq: {
        ...seq,
        count: runningCount,
        elapsedSec: 0,
        stuCall: false,
        stdCall: false,
        stuPrior: 0,
        stdPrior: 0,
        status: 'IDLE',
      },
      desiredAutoStartTags: new Set(runningAutoUnits.map((u) => u.tag)),
    };
  }

  const pvSensor = sensors[seq.pvSensorTag];
  const pv = pvSensor ? pvSensor.pv : seq.startUpSP;
  const sensorFault = pvSensor?.faulted ?? false;

  // Determine condition for Stage Up (STU) and Stage Down (STD)
  let wantStageUp = false;
  let wantStageDown = false;

  if (!sensorFault) {
    if (
      (seq.id === 'B5CH' || seq.id === 'B3CH' || seq.id === 'B3HP') &&
      seq.chillerCapacityStartSP !== undefined &&
      seq.chillerCapacityStopSP !== undefined
    ) {
      // TIA PEData comment: "Use to control chillers/heat fans with 3 conditions: Capacity + Temp. threshold + Timer"
      const avgFla =
        runningUnits.length > 0
          ? runningUnits.reduce((acc, u) => acc + (equipment[u.tag]?.loadPct ?? 0), 0) / runningUnits.length
          : 100;
      const tempTriggersUp = seq.stageUpWhenHigh ? pv >= seq.startUpSP : pv <= seq.startUpSP;
      const tempTriggersDown = seq.stageUpWhenHigh ? pv <= seq.shutDownSP : pv >= seq.shutDownSP;
      const capHigh = avgFla >= seq.chillerCapacityStartSP;
      const capLow = avgFla <= seq.chillerCapacityStopSP;

      // Failover: if runningCount < targetCount (e.g., a running unit faulted), stage up after StartUpDelay
      wantStageUp =
        runningCount < Math.max(minRequiredCount, seq.targetCount) ||
        (tempTriggersUp && capHigh && standbyAutoUnits.length > 0);
      wantStageDown =
        runningCount > minRequiredCount &&
        runningAutoUnits.length > 0 &&
        tempTriggersDown &&
        capLow &&
        !wantStageUp;
    } else if (seq.id === 'B5OFLAC') {
      // OFLAC: VSD AC204 leads; Fixed AC201/AC202 stage on when VSD >= 92% or pressure < StartUpSP
      const vsd = equipment['B51F_AC204'];
      const vsdSaturated = vsd && vsd.status === 'RUNNING' && vsd.loadPct >= 92;
      wantStageUp =
        runningCount < Math.max(minRequiredCount, seq.targetCount) ||
        ((pv <= seq.startUpSP || vsdSaturated) && standbyAutoUnits.length > 0);
      wantStageDown =
        runningCount > minRequiredCount &&
        pv >= seq.shutDownSP &&
        !(vsd && vsd.loadPct > 70) &&
        !wantStageUp;
    } else if (seq.stageUpWhenHigh) {
      wantStageUp =
        runningCount < Math.max(minRequiredCount, seq.targetCount) ||
        (pv >= seq.startUpSP && standbyAutoUnits.length > 0);
      wantStageDown =
        runningCount > minRequiredCount &&
        pv <= seq.shutDownSP &&
        !wantStageUp;
    } else {
      // Pressure-based (stage up when PV <= StartUpSP, stage down when PV >= ShutDownSP)
      wantStageUp =
        runningCount < Math.max(minRequiredCount, seq.targetCount) ||
        (pv <= seq.startUpSP && standbyAutoUnits.length > 0);
      wantStageDown =
        runningCount > minRequiredCount &&
        pv >= seq.shutDownSP &&
        !wantStageUp;
    }
  } else {
    // Even if sensor is faulted, still support failover if runningCount < minRequiredCount
    wantStageUp = runningCount < minRequiredCount;
  }

  let nextTargetCount = Math.max(minRequiredCount, seq.targetCount);
  let elapsedSec = seq.elapsedSec;
  let stuCall = false;
  let stdCall = false;
  let status: DemandSequencer['status'] = 'DEMAND_STB';

  const nextToStart = standbyAutoUnits[0];
  const nextToStop = runningAutoUnits[runningAutoUnits.length - 1];

  if (wantStageUp) {
    if (!nextToStart) {
      status = runningCount < minRequiredCount ? 'NO_STANDBY' : 'DEMAND_STB';
      elapsedSec = 0;
    } else if (runningCount === 0) {
      // First start immediately initiates highest priority unit
      status = 'FIRST_START';
      stuCall = true;
      nextTargetCount = Math.max(1, minRequiredCount);
      elapsedSec = 0;
    } else {
      status = 'DEMAND_STU';
      stuCall = true;
      elapsedSec = Number((elapsedSec + dt).toFixed(2));
      if (elapsedSec >= Math.max(0.5, seq.startUpDelaySec)) {
        nextTargetCount = Math.min(availableAutoUnits.length, runningCount + 1);
        elapsedSec = 0;
      }
    }
  } else if (wantStageDown && nextToStop) {
    status = 'DEMAND_STD';
    stdCall = true;
    elapsedSec = Number((elapsedSec + dt).toFixed(2));
    if (elapsedSec >= Math.max(0.5, seq.shutDownDelaySec)) {
      nextTargetCount = Math.max(minRequiredCount, runningCount - 1);
      elapsedSec = 0;
    }
  } else {
    elapsedSec = 0;
    status = 'DEMAND_STB';
    nextTargetCount = Math.max(minRequiredCount, Math.min(nextTargetCount, runningCount || minRequiredCount));
  }

  // Pick the top `nextTargetCount` available Auto units by priority
  const desiredAutoStartTags = new Set<string>();
  // Keep already-running Auto units first if within targetCount (prevents chatter), or honor priority order on changeover
  const chosen = availableAutoUnits.slice(0, nextTargetCount);
  for (const item of chosen) {
    desiredAutoStartTags.add(item.tag);
  }

  return {
    nextSeq: {
      ...seq,
      count: runningCount,
      targetCount: nextTargetCount,
      elapsedSec,
      stuCall,
      stdCall,
      stuPrior: nextToStart ? nextToStart.prior : 0,
      stdPrior: nextToStop ? nextToStop.prior : 0,
      status,
    },
    desiredAutoStartTags,
  };
}
