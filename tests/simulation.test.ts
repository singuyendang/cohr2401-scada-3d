import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialB5State } from '../src/simulation/initialB5State.ts';
import { stepBuilding5Plant } from '../src/simulation/physicsB5.ts';
import { cvToVfdHz, manualSpToVfdHz, stepPidLoop, VFD_MIN_HZ } from '../src/simulation/pid.ts';
import { useAuthStore } from '../src/store/authStore.ts';
import {
  computeOrthogonalPipePath,
  DEFAULT_3D_NODES,
  DEFAULT_3D_PIPES,
  parseLayoutOverrides,
  serializeLayoutOverrides,
} from '../src/training/plant3dLayout.ts';
import { TRAINING_CHALLENGES } from '../src/training/trainingScenarios.ts';
import { SOP_MANUALS } from '../src/training/sopManual.ts';
import { buildB5ChillerDetailAssembly } from '../src/training/b5Chiller3dDetail.ts';
import { buildB5M1fDetailAssembly } from '../src/training/b5M1f3dDetail.ts';
import { buildB5M2fDetailAssembly } from '../src/training/b5M2f3dDetail.ts';
import { B52F_CEILING_Y, buildB52fDetailAssembly } from '../src/training/b52f3dDetail.ts';

test('VFD strictly enforces 15.0 Hz floor (30% of 50 Hz) when running and 0.0 Hz when stopped', () => {
  assert.equal(VFD_MIN_HZ, 15.0);
  assert.equal(cvToVfdHz(0, true), 15.0);
  assert.equal(cvToVfdHz(10, true), 15.0);
  assert.equal(cvToVfdHz(29.9, true), 15.0);
  assert.equal(cvToVfdHz(60, true), 30.0);
  assert.equal(cvToVfdHz(100, true), 50.0);
  assert.equal(cvToVfdHz(80, false), 0.0);
  assert.equal(manualSpToVfdHz(5, true), 15.0);
  assert.equal(manualSpToVfdHz(42, false), 0.0);
});

test('Auto valve PID clamps strictly to [autoOutMinPct, autoOutMaxPct] while Manual mode is unconstrained', () => {
  let state = createInitialB5State();
  const pid = state.pids['B52F_PCV10701_PID'];
  pid.autoOutMinPct = 20;
  pid.autoOutMaxPct = 75;
  pid.sp = 4.5; // High SP drives CV up
  let nextPid = pid;
  for (let i = 0; i < 30; i++) {
    nextPid = stepPidLoop(nextPid, 1.0, false, 0.5);
  }
  assert.equal(nextPid.cvPct, 75);

  nextPid.sp = 1.5; // Low SP drives CV down
  for (let i = 0; i < 60; i++) {
    nextPid = stepPidLoop(nextPid, 5.0, false, 0.5);
  }
  assert.equal(nextPid.cvPct, 20);

  // Switch valve to MANUAL and set 5% (below Auto Min 20%) -> Manual mode MUST NOT be restricted
  state.valves['B52F_PCV10701'].mode = 'MANUAL';
  state.valves['B52F_PCV10701'].targetPct = 5;
  for (let i = 0; i < 20; i++) {
    state = stepBuilding5Plant(state, 0.5);
  }
  assert.equal(state.valves['B52F_PCV10701'].positionPct, 5);
});

test('Initial state has XV10502 OPEN at PIT10501=1.6 bar and hysteresis closes above 2.2 / opens XV10501 above 2.6', () => {
  let state = createInitialB5State();
  assert.equal(state.sensors['B51F_PIT10501'].pv, 1.6);
  assert.equal(state.valves['B51F_XV10502'].openFB, true);
  assert.equal(state.valves['B51F_XV10501'].closeFB, true);

  // Override PIT10501 to 2.3 bar (> H 2.2) -> XV10502 closes
  state.sensors['B51F_PIT10501'].manualOverride = true;
  state.sensors['B51F_PIT10501'].overrideValue = 2.3;
  for (let i = 0; i < 12; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B51F_XV10502'].closeFB, true);
  assert.equal(state.valves['B51F_XV10501'].closeFB, true);

  // Override PIT10501 to 2.75 bar (> HH 2.6) -> XV10501 (Drain) opens
  state.sensors['B51F_PIT10501'].overrideValue = 2.75;
  for (let i = 0; i < 12; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B51F_XV10501'].openFB, true);
});

test('Manual-only valves (BPMV, HEMV, HBPMV, XV10503, XV10504) stay strictly in MANUAL', () => {
  let state = createInitialB5State();
  const manualOnlyTags = ['B51F_BPMV', 'B51F_HEMV', 'B51F_HBPMV', 'B51F_XV10503', 'B51F_XV10504'];
  for (const tag of manualOnlyTags) {
    assert.equal(state.valves[tag].manualOnly, true);
    state.valves[tag].mode = 'AUTO'; // attempt illegal switch
  }
  state = stepBuilding5Plant(state, 0.5);
  for (const tag of manualOnlyTags) {
    assert.equal(state.valves[tag].mode, 'MANUAL');
  }
});

test('3-way AHU valves keep CHW CHWPS1 header pressure invariant when AHU valves move', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  for (let i = 0; i < 10; i++) state = stepBuilding5Plant(state, 0.5);
  const pressBefore = state.sensors['B51F_CHWPS1'].pv;

  // Force all AHU CW valves to Manual 10%
  for (const cfg of Object.values(state.ahus)) {
    state.valves[cfg.cwValveTag].mode = 'MANUAL';
    state.valves[cfg.cwValveTag].targetPct = 10;
  }
  for (let i = 0; i < 10; i++) state = stepBuilding5Plant(state, 0.5);
  const pressAfter = state.sensors['B51F_CHWPS1'].pv;
  assert.ok(Math.abs(pressAfter - pressBefore) < 0.08, `Expected constant CHWPS1, got ${pressBefore} -> ${pressAfter}`);
});

test('Cooling Tower wet-bulb saturation: raising ambient wet-bulb to 28°C drives CT fans to 50 Hz via TT10505', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  state.sandbox.ambientWetBulbC = 28.0;
  for (let i = 0; i < 40; i++) state = stepBuilding5Plant(state, 0.5);
  assert.ok(state.sensors['B51F_TT10505'].pv > 28.0, 'TT10505 must stay above 28°C wet-bulb');
  assert.equal(state.equipment['B51F_CT11FN'].frequencyHz, 50.0);
});

test('Chiller Fault triggers FB_Demand failover to CH13 after StartUpDelay via interlock chain', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  state.demands.B5CH.startUpDelaySec = 2;
  // Fault CH11
  state.equipment['B51F_CH11'].faulted = true;
  state.equipment['B51F_CH11'].status = 'FAULTED';

  // Run 18 seconds of simulated time (2s delay + 3s valve open + 1s CHWP start + 2.5s CH13 start)
  for (let i = 0; i < 36; i++) {
    state = stepBuilding5Plant(state, 0.5);
  }
  assert.equal(state.equipment['B51F_CH11'].status, 'FAULTED');
  assert.equal(state.valves['B51F_CH13CHV'].openFB, true);
  assert.equal(state.equipment['B51F_CH13CHWP'].status, 'RUNNING');
  assert.equal(state.equipment['B51F_CH13'].status, 'RUNNING');
  assert.ok(state.equipment['B51F_CH13CHWP'].frequencyHz >= 15.0);
});

test('OFLAC VSD-lead (AC204) stages Fixed compressor (AC201) when air demand spikes to 95%', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  state.demands.B5OFLAC.startUpDelaySec = 2;
  state.sandbox.oflacAirDemandPct = 95;

  for (let i = 0; i < 24; i++) {
    state = stepBuilding5Plant(state, 0.5);
  }
  assert.equal(state.equipment['B51F_AC204'].status, 'RUNNING');
  assert.equal(state.equipment['B51F_AC201'].status, 'RUNNING');
});


test('P-502 Rejected PCW pump starts STOPPED at 68%, runs Auto >= High (85%), latches at 60%, stops <= Low (35%)', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;

  assert.equal(state.equipment['B51F_P502'].status, 'STOPPED', 'P-502 should start STOPPED at initial LT10501=68%');

  // Override TK-501 level above High (85%) -> P-502 starts automatically
  state.sensors['B51F_LT10501'].manualOverride = true;
  state.sensors['B51F_LT10501'].overrideValue = 88.0;
  state.sensors['B51F_LT10501'].pv = 88.0;
  for (let i = 0; i < 6; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B51F_P502'].status, 'RUNNING', 'P-502 must RUN when TK-501 LT10501 >= 85%');

  // Drop level to mid-band (60%) -> P-502 must remain latched RUNNING
  state.sensors['B51F_LT10501'].overrideValue = 60.0;
  state.sensors['B51F_LT10501'].pv = 60.0;
  for (let i = 0; i < 4; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B51F_P502'].status, 'RUNNING', 'P-502 must stay latched RUNNING between Low and High');

  // Drop level below Low (35%) -> P-502 must STOP automatically
  state.sensors['B51F_LT10501'].overrideValue = 30.0;
  state.sensors['B51F_LT10501'].pv = 30.0;
  for (let i = 0; i < 4; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B51F_P502'].status, 'STOPPED', 'P-502 must STOP when TK-501 LT10501 <= 35%');
});


test('VFD PID enforces editable Auto Min/Max limits and responds to Derivative Kd gain', () => {
  const baseLoop = createInitialB5State().pids['B51F_CH11CHWP_PID'];
  // Narrow VFD auto output to [50%, 80%] (25.0 Hz – 40.0 Hz)
  let loop = { ...baseLoop, autoOutMinPct: 50, autoOutMaxPct: 80, sp: 4.0, kp: 15, ki: 4, kd: 2.0, integral: 65, lastError: 0 };

  // Massive high error (PV = 1.0 << SP = 4.0) should clamp at 80% (40.0 Hz)
  loop = stepPidLoop(loop, 1.0, false, 0.5);
  assert.equal(loop.cvPct, 80, 'VFD PID Auto Max must clamp CV at 80% (40.0 Hz)');

  // Massive negative error (PV = 7.0 >> SP = 4.0) should clamp at 50% (25.0 Hz)
  loop = stepPidLoop(loop, 7.0, false, 0.5);
  assert.equal(loop.cvPct, 50, 'VFD PID Auto Min must clamp CV at 50% (25.0 Hz)');

  // Derivative Kd check: with sudden error jump, Kd > 0 produces larger response than Kd = 0
  const noD = stepPidLoop({ ...baseLoop, autoOutMinPct: 30, autoOutMaxPct: 100, sp: 4.0, kp: 5, ki: 0, kd: 0, integral: 50, lastError: 0 }, 3.0, false, 0.5);
  const withD = stepPidLoop({ ...baseLoop, autoOutMinPct: 30, autoOutMaxPct: 100, sp: 4.0, kp: 5, ki: 0, kd: 4.0, integral: 50, lastError: 0 }, 3.0, false, 0.5);
  assert.ok(withD.cvPct > noD.cvPct, `Expected Kd > 0 (${withD.cvPct}) to exceed Kd = 0 (${noD.cvPct}) on step error`);
});


test('PMS SLD electrical tree dynamically sums MDB 5.1..5.3 from child DBs and responds to Chiller stop', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  for (let i = 0; i < 4; i++) state = stepBuilding5Plant(state, 0.5);

  const mdb51Before = state.meters['PMDB_B5M2F_MDB51'].activeKw;
  assert.ok(mdb51Before > 100, `Expected MDB-5.1 active load > 100 kW while chillers run; got ${mdb51Before}`);

  // Trip CH11 -> MDB-5.1 total active kW must immediately drop
  state.equipment['B51F_CH11'].faulted = true;
  state.equipment['B51F_CH11'].status = 'FAULTED';
  state.equipment['B51F_CH11'].loadPct = 0;
  state = stepBuilding5Plant(state, 0.5);

  const mdb51After = state.meters['PMDB_B5M2F_MDB51'].activeKw;
  assert.ok(
    mdb51After < mdb51Before - 50,
    `Expected MDB-5.1 kW to drop significantly after CH11 trip (before=${mdb51Before}, after=${mdb51After})`
  );
});


test('All Building 5, Building 2 & Building 3 PID loops settle smoothly without limit-cycle oscillation (steady swing < 5%) and Trend records every tick', () => {
  let state = createInitialB5State();
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};

  const totalTicks = 160;
  for (let i = 0; i < totalTicks; i++) {
    state = stepBuilding5Plant(state, 0.5);
    if (i >= 100) {
      for (const k of Object.keys(state.pids)) {
        const v = state.pids[k].cvPct;
        mins[k] = Math.min(mins[k] ?? 999, v);
        maxs[k] = Math.max(maxs[k] ?? -999, v);
      }
    }
  }

  // Every tick recorded (zero 2-tick Nyquist aliasing)
  assert.equal(state.trends.length, totalTicks, 'Trend buffer must record every simulation tick');

  // Every PID loop must settle cleanly without wild oscillation
  for (const k of Object.keys(mins)) {
    const swing = maxs[k] - mins[k];
    assert.ok(
      swing < 5.0,
      `PID loop ${k} oscillated excessively in steady state: min=${mins[k].toFixed(1)}%, max=${maxs[k].toFixed(1)}%, swing=${swing.toFixed(1)}%`
    );
  }
});


test('WinCC 4-state Alarm lifecycle: Came In -> Went Out stays in Online Alarm until ACK -> History only', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;

  // 1. Trigger CH11 fault -> CAME_IN (active=true, acknowledged=false)
  state.equipment['B51F_CH11'].faulted = true;
  state.equipment['B51F_CH11'].status = 'FAULTED';
  state = stepBuilding5Plant(state, 0.5);

  const chFault = state.alarms.find((a) => a.tag === 'B51F_CH11' && a.severity === 'FAULT');
  assert.ok(chFault, 'Expected B51F_CH11 FAULT alarm to be logged');
  assert.equal(chFault.state, 'CAME_IN');
  assert.equal(chFault.active, true);
  assert.equal(chFault.acknowledged, false);
  assert.equal(chFault.wentOutTime, null);

  // 2. Clear fault BEFORE acknowledging -> WENT_OUT (active=false, acknowledged=false, stays in Online Alarm!)
  state.equipment['B51F_CH11'].faulted = false;
  state.equipment['B51F_CH11'].status = 'STOPPED';
  state = stepBuilding5Plant(state, 0.5);

  const wentOutAlarm = state.alarms.find((a) => a.id === chFault.id);
  assert.ok(wentOutAlarm);
  assert.equal(wentOutAlarm.state, 'WENT_OUT');
  assert.equal(wentOutAlarm.active, false);
  assert.equal(wentOutAlarm.acknowledged, false);
  assert.ok(wentOutAlarm.wentOutTime !== null, 'Went Out timestamp must be populated');
  assert.equal(wentOutAlarm.active || !wentOutAlarm.acknowledged, true, 'Went Out Unack alarm MUST remain visible in Online Alarm');

  // 3. Trigger a second fault, ACK while still active -> CAME_IN_ACK, then clear -> WENT_OUT_ACK
  state.equipment['B51F_P501A'].faulted = true;
  state.equipment['B51F_P501A'].status = 'FAULTED';
  state = stepBuilding5Plant(state, 0.5);
  const pFault = state.alarms.find((a) => a.tag === 'B51F_P501A' && a.severity === 'FAULT');
  assert.ok(pFault);
  pFault.acknowledged = true;
  pFault.state = 'CAME_IN_ACK';
  pFault.ackTime = '12:00:00';

  state.equipment['B51F_P501A'].faulted = false;
  state.equipment['B51F_P501A'].status = 'STOPPED';
  state = stepBuilding5Plant(state, 0.5);
  const clearedAck = state.alarms.find((a) => a.id === pFault.id);
  assert.ok(clearedAck);
  assert.equal(clearedAck.state, 'WENT_OUT_ACK');
  assert.equal(clearedAck.active || !clearedAck.acknowledged, false, 'Cleared + ACK alarm leaves Online Alarm and persists in History Alarm');
});


test('Auth store requires login and validates default Administrator Fujicac / COHR2401 + logout', () => {
  useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().user, null);

  // Wrong password rejected
  const bad = useAuthStore.getState().login('Fujicac', 'wrong', false);
  assert.equal(bad.ok, false);
  assert.equal(useAuthStore.getState().user, null);

  // Default Fujicac / COHR2401 accepted as Administrator
  const ok = useAuthStore.getState().login('Fujicac', 'COHR2401', true);
  assert.equal(ok.ok, true);
  assert.equal(useAuthStore.getState().user?.username, 'Fujicac');
  assert.equal(useAuthStore.getState().user?.role, 'Administrator');
  assert.equal(useAuthStore.getState().remembered, true);

  // Logout clears active user
  useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().remembered, false);

  // Change password validation & enforcement
  const badCurr = useAuthStore.getState().changePassword('Fujicac', 'WRONG', 'NEWPASS1', 'NEWPASS1');
  assert.equal(badCurr.ok, false);
  const badConfirm = useAuthStore.getState().changePassword('Fujicac', 'COHR2401', 'NEWPASS1', 'DIFFERENT');
  assert.equal(badConfirm.ok, false);
  const changed = useAuthStore.getState().changePassword('Fujicac', 'COHR2401', 'NEWPASS1', 'NEWPASS1');
  assert.equal(changed.ok, true);

  // Old password rejected, new password accepted
  assert.equal(useAuthStore.getState().login('Fujicac', 'COHR2401', false).ok, false);
  assert.equal(useAuthStore.getState().login('Fujicac', 'NEWPASS1', false).ok, true);

  // Restore default COHR2401
  assert.equal(useAuthStore.getState().changePassword('Fujicac', 'NEWPASS1', 'COHR2401', 'COHR2401').ok, true);
  useAuthStore.getState().logout();
});


test('Building 2 PCW (4 pumps P-601A..D): PIT10601 hysteresis, P-602 H/L latch, manual-only XV10603/04', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;

  // Initial state: P-601A/B running, P-601C/D standby, P-602 stopped at 65%, XV10602 open at 1.6 bar
  assert.equal(state.equipment['B21F_P601A'].status, 'RUNNING');
  assert.equal(state.equipment['B21F_P601B'].status, 'RUNNING');
  assert.equal(state.equipment['B21F_P601C'].status, 'STOPPED');
  assert.equal(state.equipment['B21F_P601D'].status, 'STOPPED');
  assert.equal(state.equipment['B21F_P602'].status, 'STOPPED');
  assert.equal(state.valves['B21F_XV10602'].openFB, true);
  assert.equal(state.valves['B21F_XV10603'].manualOnly, true);
  assert.equal(state.valves['B21F_XV10604'].manualOnly, true);

  // Override B21F_LT10601 >= 85% -> P-602 starts, stays latched at 60%, stops <= 35%
  state.sensors['B21F_LT10601'].manualOverride = true;
  state.sensors['B21F_LT10601'].overrideValue = 88.0;
  state.sensors['B21F_LT10601'].pv = 88.0;
  for (let i = 0; i < 6; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_P602'].status, 'RUNNING');

  state.sensors['B21F_LT10601'].overrideValue = 60.0;
  state.sensors['B21F_LT10601'].pv = 60.0;
  for (let i = 0; i < 4; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_P602'].status, 'RUNNING');

  state.sensors['B21F_LT10601'].overrideValue = 30.0;
  state.sensors['B21F_LT10601'].pv = 30.0;
  for (let i = 0; i < 4; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_P602'].status, 'STOPPED');

  // Override B21F_PIT10601 > 2.6 bar -> XV10602 closes and XV10601 opens
  state.sensors['B21F_PIT10601'].manualOverride = true;
  state.sensors['B21F_PIT10601'].overrideValue = 2.75;
  for (let i = 0; i < 12; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B21F_XV10602'].closeFB, true);
  assert.equal(state.valves['B21F_XV10601'].openFB, true);
});


test('Building 2 live cross-building coupling (DI RO-DI link, PV EoL B23F_PIT1302) & B2 PMS dynamic summation', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;
  for (let i = 0; i < 6; i++) state = stepBuilding5Plant(state, 0.5);

  // 1. Disconnecting shared RO-DI package drops BOTH Building 2 (B22F_PIT10704) & Building 3 (B31F_PIT10705) DI pressure
  const diBefore = state.sensors['B22F_PIT10704'].pv;
  const diB3Before = state.sensors['B31F_PIT10705'].pv;
  state.sandbox.diPackageConnected = false;
  for (let i = 0; i < 20; i++) state = stepBuilding5Plant(state, 0.5);
  assert.ok(state.sensors['B22F_PIT10704'].pv < diBefore - 1.5, 'Disconnecting RO-DI must depressurize B2 DI loop');
  assert.ok(state.sensors['B31F_PIT10705'].pv < diB3Before - 1.5, 'Disconnecting RO-DI must depressurize B3 DI Cistern loop');
  state.sandbox.diPackageConnected = true;

  // 1b. Building 2 FCU motorized XV valves (B21F_FCU01V..04V, B23F_FCU02V) + 0.5s STOPPING/STARTING transition
  assert.equal(state.valves['B21F_FCU01V'].openFB, true);
  assert.equal(state.valves['B23F_FCU02V'].openFB, true);
  state.equipment['B21F_FCU01'].mode = 'MANUAL';
  state.equipment['B21F_FCU01'].cmdStart = false;
  // Tick 1 (0.5s): RUNNING -> STOPPING (blue slow spin)
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_FCU01'].status, 'STOPPING', 'FCU must show STOPPING for ~0.5s on Stop command');
  // Tick 2 (0.5s): STOPPING -> STOPPED
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_FCU01'].status, 'STOPPED', 'FCU must reach STOPPED after 0.5s STOPPING');
  for (let i = 0; i < 8; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B21F_FCU01V'].closeFB, true, 'B21F_FCU01V XV valve must close in Auto when B21F_FCU01 stops');
  // Start back up -> Tick 1 enters STARTING (0.5s), Tick 2 reaches RUNNING
  state.equipment['B21F_FCU01'].cmdStart = true;
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_FCU01'].status, 'STARTING', 'FCU must show STARTING for ~0.5s on Start command');
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B21F_FCU01'].status, 'RUNNING', 'FCU must reach RUNNING after 0.5s STARTING');

  // 2. Stopping shared B5 PV pumps raises B23F_PIT1302 toward atmospheric (0 kPa)
  const pvBefore = state.sensors['B23F_PIT1302'].pv;
  state.demands.B5PV.enable = false;
  state.equipment['B51F_PV1301A'].mode = 'MANUAL';
  state.equipment['B51F_PV1301A'].cmdStart = false;
  state.equipment['B51F_PV1301B'].mode = 'MANUAL';
  state.equipment['B51F_PV1301B'].cmdStart = false;
  for (let i = 0; i < 24; i++) state = stepBuilding5Plant(state, 0.5);
  assert.ok(state.sensors['B23F_PIT1302'].pv > pvBefore + 25, 'Stopping B5 PV must decay B2 EoL vacuum B23F_PIT1302');

  // 3. Building 2 PMS MDB-2.1 sums dynamically from B2 AHUs/PCW/Fans and drops when B2 PCW pumps trip
  const mdb21Before = state.meters['PMDB_B2_MDB21'].activeKw;
  assert.ok(mdb21Before > 250, `Expected MDB-2.1 active load > 250 kW, got ${mdb21Before}`);
  state.equipment['B21F_P601A'].faulted = true;
  state.equipment['B21F_P601A'].status = 'FAULTED';
  state.equipment['B21F_P601B'].faulted = true;
  state.equipment['B21F_P601B'].status = 'FAULTED';
  state = stepBuilding5Plant(state, 0.5);
  assert.ok(state.meters['PMDB_B2_MDB21'].activeKw < mdb21Before - 20, 'Tripping B2 PCW pumps must drop MDB-2.1 kW');
  const b2FaultAlarm = state.alarms.find((a) => a.tag === 'B21F_P601A' && a.building === 'B2');
  assert.ok(b2FaultAlarm, 'Building 2 fault must log alarm tagged with building="B2"');
});


test('Building 3 Air-Cooled Chiller (CH-21/22) interlock & failover, Heat Fan (HP-01/02/03) + HPP failover, B3 FCU XV valves & PMS', () => {
  let state = createInitialB5State();
  state.sandbox.noiseAmplitudePct = 0;

  // 1. Initial B3 state: CH21 duty, CH22 standby; HP01/02 duty, HP03 standby; BPMV & HPBPMV manual-only
  assert.equal(state.equipment['B31F_CH21'].status, 'RUNNING');
  assert.equal(state.equipment['B31F_CH22'].status, 'STOPPED');
  assert.equal(state.equipment['B31F_HP01'].status, 'RUNNING');
  assert.equal(state.equipment['B31F_HP02'].status, 'RUNNING');
  assert.equal(state.equipment['B31F_HP03'].status, 'STOPPED');
  assert.equal(state.valves['B31F_BPMV'].manualOnly, true);
  assert.equal(state.valves['B31F_HPBPMV'].manualOnly, true);
  assert.equal(state.valves['B31F_FCU03V'].openFB, true);
  assert.equal(state.valves['B3M1F_FCU01V'].openFB, true);

  // 2. Trip B31F_CH21 -> Demand B3CH opens CH22CHV -> runs CH22CHWP -> runs CH22 (with zero CT dependencies!)
  state.demands.B3CH.startUpDelaySec = 2;
  state.equipment['B31F_CH21'].faulted = true;
  state.equipment['B31F_CH21'].status = 'FAULTED';
  for (let i = 0; i < 36; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B31F_CH22CHV'].openFB, true, 'CH22CHV must open during B3 chiller failover');
  assert.equal(state.equipment['B31F_CH22CHWP'].status, 'RUNNING', 'CH22CHWP must start after CH22CHV opens');
  assert.equal(state.equipment['B31F_CH22'].status, 'RUNNING', 'CH22 air-cooled chiller must run after CH21 trip');

  const b3FaultAlarm = state.alarms.find((a) => a.tag === 'B31F_CH21' && a.building === 'B3');
  assert.ok(b3FaultAlarm, 'Building 3 chiller trip must log alarm tagged with building="B3"');

  // 3. Trip HPP-21 -> HPP-22 fails over automatically to keep Heat Fans pressurized
  state.equipment['B31F_HPP21'].faulted = true;
  state.equipment['B31F_HPP21'].status = 'FAULTED';
  for (let i = 0; i < 8; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B31F_HPP22'].status, 'RUNNING', 'HPP-22 must fail over automatically when HPP-21 faults');

  // 4. Stopping B3M1F_FCU01 closes its motorized XV valve B3M1F_FCU01V after 0.5s STOPPING
  state.equipment['B3M1F_FCU01'].mode = 'MANUAL';
  state.equipment['B3M1F_FCU01'].cmdStart = false;
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B3M1F_FCU01'].status, 'STOPPING');
  state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.equipment['B3M1F_FCU01'].status, 'STOPPED');
  for (let i = 0; i < 8; i++) state = stepBuilding5Plant(state, 0.5);
  assert.equal(state.valves['B3M1F_FCU01V'].closeFB, true, 'B3M1F_FCU01V must close when B3M1F_FCU01 stops');

  // 5. Building 3 PMS MDB-3.1/3.2/3.3 dynamically sum live loads and respond to B3 CH22 trip
  const mdb31Before = state.meters['PMDB_B3M1F_MDB31'].activeKw;
  assert.ok(mdb31Before > 100, `Expected B3 MDB-3.1 active load > 100 kW, got ${mdb31Before}`);
  state.equipment['B31F_CH22'].faulted = true;
  state.equipment['B31F_CH22'].status = 'FAULTED';
  state.equipment['B31F_CH22'].loadPct = 0;
  state = stepBuilding5Plant(state, 0.5);
  assert.ok(state.meters['PMDB_B3M1F_MDB31'].activeKw < mdb31Before - 30, 'Tripping B3 CH22 must immediately drop MDB-3.1 kW');
});


test('3D Layout JSON binds strictly to real SCADA tags, auto-reroutes pipes on drag, and round-trips Export/Import JSON', () => {
  const state = createInitialB5State();

  for (const node of DEFAULT_3D_NODES) {
    if (node.meshType === 'building') continue;
    const tag = node.statusTag ?? node.tag;
    const exists =
      Boolean(state.equipment[tag]) || Boolean(state.valves[tag]) || Boolean(state.sensors[tag]);
    assert.ok(exists, `3D node ${node.id} references unknown SCADA tag "${tag}"`);
    if (node.levelSensorTag) {
      assert.ok(state.sensors[node.levelSensorTag], `3D tank ${node.id} references unknown level sensor "${node.levelSensorTag}"`);
    }
  }

  for (const pipe of DEFAULT_3D_PIPES) {
    const exists = Boolean(state.equipment[pipe.flowSourceTag]) || Boolean(state.valves[pipe.flowSourceTag]);
    assert.ok(exists, `3D pipe ${pipe.id} references unknown flowSourceTag "${pipe.flowSourceTag}"`);
  }

  // Validate every detailed Unified B5 1F (Chiller + HR + PCW + AC + DI) pipe, inline valve, and inline sensor tag!
  const b5Detail = buildB5ChillerDetailAssembly({});
  assert.ok(b5Detail.pipes.length >= 70, 'Unified B5 1F must build complete 4-layer (Chiller/PCW/AC/DI) pipe network');
  assert.ok(b5Detail.valves.length >= 35, 'Unified B5 1F must include Chiller + PCW + DI inline valves');
  assert.ok(b5Detail.sensors.length >= 26, 'Unified B5 1F must mount all combined Chiller + PCW + AC + DI 1F/2F sensors');
  assert.ok(!b5Detail.sensors.some((s) => s.tag === 'B51F_DPT10501' || s.tag === 'B51F_TT10503'), '2F PCW sensors DPT10501 & TT10503 must NOT be placed on 1F');
  assert.ok(b5Detail.valves.some((v) => v.tag === 'B51F_BPMV'), 'Must include CHW ceiling bypass valve B51F_BPMV');
  assert.ok(b5Detail.valves.some((v) => v.tag === 'B51F_HBPMV'), 'Must include Heat Recovery ceiling bypass valve B51F_HBPMV');
  assert.ok(b5Detail.valves.some((v) => v.tag === 'B51F_TCV10501'), 'Must include PCW valve B51F_TCV10501');
  assert.ok(b5Detail.valves.some((v) => v.tag === 'B52F_PCV10701'), 'Must include B5 2F DI valve B52F_PCV10701');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_v1301' && n.meshType === 'tank'), 'Must include PV Vacuum Receiver Tank V-1301');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_p10101a' && n.meshType === 'horizontal_pump'), 'P-10101A must be a horizontal end-suction pump');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_p10101b' && n.meshType === 'horizontal_pump'), 'P-10101B must be a horizontal end-suction pump');
  assert.ok(b5Detail.sensors.some((s) => s.id === 'sn_fs10101' && s.kind === 'flow_switch'), 'Must include Flow Switch FS-10101 on common discharge of P-10101A/B');
  assert.ok(b5Detail.sensors.some((s) => s.tag === 'B51F_PIT1301'), 'Must include PV pressure sensor B51F_PIT1301');
  assert.ok(b5Detail.pipes.some((p) => p.id === 'ofrac_cw_from_ct' && p.fluid === 'cdw_sup'), 'OFRAC CW supply must come from Cooling Tower in CT supply color (cdw_sup)');
  assert.ok(b5Detail.pipes.some((p) => p.id === 'ofrac_cw_ret_to_ct' && p.fluid === 'cdw_ret'), 'OFRAC CW return must loop back to Cooling Tower in CT return color (cdw_ret)');
  for (const lyr of ['chiller', 'pcw', 'ac', 'di'] as const) {
    assert.ok(b5Detail.pipes.some((p) => p.layer === lyr), `Unified B5 1F must contain pipes for layer "${lyr}"`);
  }
  // Verify NO collinear overlapping pipes in PCW or AC/PV layers (independent non-overlapping tracks!)
  for (const checkLayer of ['pcw', 'ac'] as const) {
    const layerPipes = b5Detail.pipes.filter((p) => p.layer === checkLayer);
    for (let a = 0; a < layerPipes.length; a++) {
      for (let b = a + 1; b < layerPipes.length; b++) {
        for (let i = 0; i < layerPipes[a].points.length - 1; i++) {
          const [ax1, ay1, az1] = layerPipes[a].points[i];
          const [ax2, ay2, az2] = layerPipes[a].points[i + 1];
          for (let j = 0; j < layerPipes[b].points.length - 1; j++) {
            const [bx1, by1, bz1] = layerPipes[b].points[j];
            const [bx2, by2, bz2] = layerPipes[b].points[j + 1];
            const overlapX = Math.abs(ay1 - by1) < 0.08 && Math.abs(ay2 - by2) < 0.08 && Math.abs(az1 - bz1) < 0.08 && Math.abs(az2 - bz2) < 0.08
              && Math.min(Math.max(ax1, ax2), Math.max(bx1, bx2)) - Math.max(Math.min(ax1, ax2), Math.min(bx1, bx2)) > 0.15;
            const overlapY = Math.abs(ax1 - bx1) < 0.08 && Math.abs(ax2 - bx2) < 0.08 && Math.abs(az1 - bz1) < 0.08 && Math.abs(az2 - bz2) < 0.08
              && Math.min(Math.max(ay1, ay2), Math.max(by1, by2)) - Math.max(Math.min(ay1, ay2), Math.min(by1, by2)) > 0.15;
            const overlapZ = Math.abs(ax1 - bx1) < 0.08 && Math.abs(ax2 - bx2) < 0.08 && Math.abs(ay1 - by1) < 0.08 && Math.abs(ay2 - by2) < 0.08
              && Math.min(Math.max(az1, az2), Math.max(bz1, bz2)) - Math.max(Math.min(az1, az2), Math.min(bz1, bz2)) > 0.15;
            assert.ok(
              !(overlapX || overlapY || overlapZ),
              `${checkLayer.toUpperCase()} pipes "${layerPipes[a].id}"[${i}] and "${layerPipes[b].id}"[${j}] overlap collinearly!`
            );
          }
        }
      }
    }
  }
  for (const p of b5Detail.pipes) {
    // Every single pipe segment MUST be strictly 90-degree orthogonal (no diagonal segments!)
    for (let i = 0; i < p.points.length - 1; i++) {
      const [x1, y1, z1] = p.points[i];
      const [x2, y2, z2] = p.points[i + 1];
      const axesMoved = (Math.abs(x2 - x1) > 1e-4 ? 1 : 0) + (Math.abs(y2 - y1) > 1e-4 ? 1 : 0) + (Math.abs(z2 - z1) > 1e-4 ? 1 : 0);
      assert.ok(
        axesMoved <= 1,
        `Pipe "${p.id}" segment ${i} is diagonal: (${x1},${y1},${z1}) -> (${x2},${y2},${z2})`
      );
    }
    for (const tag of [...p.flowSourceTags, ...(p.requireAllTags ?? [])]) {
      assert.ok(Boolean(state.equipment[tag]) || Boolean(state.valves[tag]), `Detailed B5 pipe ${p.id} references unknown tag "${tag}"`);
    }
  }
  for (const v of b5Detail.valves) {
    assert.ok(Boolean(state.valves[v.tag]), `Detailed B5 inline valve ${v.id} references unknown valve "${v.tag}"`);
  }
  for (const s of b5Detail.sensors) {
    if (s.kind === 'flow_switch') {
      for (const ft of s.flowSourceTags ?? [s.tag]) {
        assert.ok(Boolean(state.equipment[ft]), `Detailed B5 flow switch ${s.id} references unknown equipment "${ft}"`);
      }
    } else {
      assert.ok(Boolean(state.sensors[s.tag]), `Detailed B5 inline sensor ${s.id} references unknown sensor "${s.tag}"`);
    }
    // Every pipe-mounted sensor stem bottom (sy - 0.55) MUST physically touch a pipe segment (ZERO floating sensors!)
    if (s.tag !== 'B51F_LT10501') {
      const [sx, sy, sz] = s.pos;
      const py = sy - 0.55;
      let touchesPipe = false;
      for (const p of b5Detail.pipes) {
        for (let i = 0; i < p.points.length - 1; i++) {
          const [x1, y1, z1] = p.points[i];
          const [x2, y2, z2] = p.points[i + 1];
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dz = z2 - z1;
          const lenSq = dx * dx + dy * dy + dz * dz;
          const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((sx - x1) * dx + (py - y1) * dy + (sz - z1) * dz) / lenSq)) : 0;
          const cx = x1 + t * dx;
          const cy = y1 + t * dy;
          const cz = z1 + t * dz;
          const dist = Math.hypot(sx - cx, py - cy, sz - cz);
          if (dist <= 0.15) {
            touchesPipe = true;
            break;
          }
        }
        if (touchesPipe) break;
      }
      assert.ok(
        touchesPipe,
        `Sensor "${s.id}" (${s.tag}) at (${sx}, ${sy}, ${sz}) is FLOATING (stem bottom y=${py.toFixed(2)} does not touch any pipe!)`
      );
    }
  }

  // Validate Building 5 — M1F Mezzanine AHU-B5-1F-01 assembly (Daikin AHU, rectangular ducts, EAF01 ceiling branch, CHW/HW ceiling drops & 3-way valves!)
  const b5M1f = buildB5M1fDetailAssembly({});
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_ahu1f' && n.zone === 'b5_m1f'), 'AHU-B5-1F-01 must be placed in zone b5_m1f');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_m1f_eaf01' && n.zone === 'b5_m1f' && n.meshType === 'duct_fan'), 'M1F must include ceiling inline duct fan EAF-B5-1F-01');
  assert.equal(b5M1f.ducts.length, 5, 'M1F must include Supply Air, Return Air, Fresh Air & EAF-01 Exhaust relief branch ducts');
  assert.ok(b5M1f.ducts.every((d) => d.width >= 0.75 && d.height >= 0.75), 'M1F AHU air ducts must be large & boxy');
  assert.ok(b5M1f.pipes.some((p) => p.id === 'm1f_chw_sup' && p.fluid === 'chw'), 'M1F CHW Supply must match Chiller Supply color (chw)');
  assert.ok(b5M1f.pipes.some((p) => p.id === 'm1f_chw_ret' && p.fluid === 'chwr'), 'M1F CHW Return must match Chiller Return color (chwr)');
  assert.ok(b5M1f.pipes.some((p) => p.id === 'm1f_hw_sup' && p.fluid === 'hw_sup'), 'M1F HW Supply must match Heat Recovery Supply color (hw_sup)');
  assert.ok(b5M1f.pipes.some((p) => p.id === 'm1f_hw_ret' && p.fluid === 'hw_ret'), 'M1F HW Return must match Heat Recovery Return color (hw_ret)');
  assert.ok(b5M1f.valves.some((v) => v.tag === 'B5M1F_AHU01_CWCV'), 'M1F must include 3-way CHW control valve CWCV');
  assert.ok(b5M1f.valves.some((v) => v.tag === 'B5M1F_AHU01_HWCV'), 'M1F must include 3-way HW control valve HWCV');
  assert.equal(b5M1f.sensors.length, 5, 'M1F must mount all 5 live AHU sensors (SAT, SAS, RAT, RAH, DP)');
  for (const p of b5M1f.pipes) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const [x1, y1, z1] = p.points[i];
      const [x2, y2, z2] = p.points[i + 1];
      const axesMoved = (Math.abs(x2 - x1) > 1e-4 ? 1 : 0) + (Math.abs(y2 - y1) > 1e-4 ? 1 : 0) + (Math.abs(z2 - z1) > 1e-4 ? 1 : 0);
      assert.ok(axesMoved <= 1, `M1F pipe "${p.id}" segment ${i} must be strictly 90° orthogonal`);
    }
    for (const tag of [...p.flowSourceTags, ...(p.requireAllTags ?? [])]) {
      assert.ok(Boolean(state.equipment[tag]) || Boolean(state.valves[tag]), `M1F pipe "${p.id}" references unknown tag "${tag}"`);
    }
  }
  for (const s of b5M1f.sensors) {
    assert.ok(Boolean(state.sensors[s.tag]), `M1F sensor "${s.id}" references unknown sensor "${s.tag}"`);
  }

  // Validate Building 5 — M2F Mezzanine (1 PAU + 4 AHUs + 3 floor FA centrifugal exhaust fans + ceiling EAF02/FAF01!)
  const b5M2f = buildB5M2fDetailAssembly({});
  assert.ok(b5M2f.ducts.length >= 20, 'M2F must build PAU fresh-air header, 4× SA/RA, RA->EAF02 relief, FAF01 & 3× FA exhaust ducts');
  assert.ok(b5M2f.valves.length === 9, 'M2F must include 9 control valves (4× CWCV, 4× HWCV, 1× PAU CHCV)');
  assert.ok(b5M2f.sensors.length >= 12, 'M2F must mount PAU SAT, 4× AHU SAT/RAT, PIT11201, PIT11202 & TIT11201');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_eaf02' && n.zone === 'b5_air' && n.meshType === 'duct_fan' && n.pos[1] > 4), 'M2F EAF-02 must be mounted on overhead ceiling duct');
  assert.ok(DEFAULT_3D_NODES.some((n) => n.id === 'b5_faf01' && n.zone === 'b5_air' && n.meshType === 'duct_fan' && n.pos[1] > 4), 'M2F FAF-01 must be mounted on overhead ceiling duct');
  for (const p of b5M2f.pipes) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const [x1, y1, z1] = p.points[i];
      const [x2, y2, z2] = p.points[i + 1];
      const axesMoved = (Math.abs(x2 - x1) > 1e-4 ? 1 : 0) + (Math.abs(y2 - y1) > 1e-4 ? 1 : 0) + (Math.abs(z2 - z1) > 1e-4 ? 1 : 0);
      assert.ok(axesMoved <= 1, `M2F pipe "${p.id}" segment ${i} must be strictly 90° orthogonal`);
    }
    for (const tag of [...p.flowSourceTags, ...(p.requireAllTags ?? [])]) {
      assert.ok(Boolean(state.equipment[tag]) || Boolean(state.valves[tag]), `M2F pipe "${p.id}" references unknown tag "${tag}"`);
    }
  }
  for (const v of b5M2f.valves) {
    assert.ok(Boolean(state.valves[v.tag]), `M2F valve "${v.id}" references unknown valve "${v.tag}"`);
  }
  for (const s of b5M2f.sensors) {
    assert.ok(Boolean(state.sensors[s.tag]), `M2F sensor "${s.id}" references unknown sensor "${s.tag}"`);
  }

  // Validate Building 5 — 2F Cleanroom (column-mounted room sensors below ceiling + DI/PCW/PV/EXH plenum above ceiling!)
  const b52f = buildB52fDetailAssembly();
  assert.equal(b52f.valves.length, 3, '2F Cleanroom overhead plenum must include 3 DI control valves PCV10701..03');
  assert.ok(b52f.sensors.some((s) => s.tag === 'B51F_DPT10501' && s.pos[1] > B52F_CEILING_Y), '2F PCW DPT10501 must sit above the cleanroom ceiling panel');
  assert.ok(b52f.sensors.some((s) => s.tag === 'B51F_TT10503' && s.pos[1] > B52F_CEILING_Y), '2F PCW TT10503 must sit above the cleanroom ceiling panel');
  assert.ok(b52f.sensors.some((s) => s.tag === 'B52F_PIT1303' && s.pos[1] > B52F_CEILING_Y), '2F PV PIT1303 must sit above the cleanroom ceiling panel');
  assert.ok(b52f.sensors.filter((s) => s.kind === 'room_sensor').every((s) => s.pos[1] < B52F_CEILING_Y), 'All 2F column-mounted cleanroom sensors must sit inside the room below ceiling');
  for (const p of b52f.pipes) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const [x1, y1, z1] = p.points[i];
      const [x2, y2, z2] = p.points[i + 1];
      const axesMoved = (Math.abs(x2 - x1) > 1e-4 ? 1 : 0) + (Math.abs(y2 - y1) > 1e-4 ? 1 : 0) + (Math.abs(z2 - z1) > 1e-4 ? 1 : 0);
      assert.ok(axesMoved <= 1, `2F pipe "${p.id}" segment ${i} must be strictly 90° orthogonal`);
    }
    for (const tag of [...p.flowSourceTags, ...(p.requireAllTags ?? [])]) {
      assert.ok(Boolean(state.equipment[tag]) || Boolean(state.valves[tag]), `2F pipe "${p.id}" references unknown tag "${tag}"`);
    }
  }
  for (const v of b52f.valves) {
    assert.ok(Boolean(state.valves[v.tag]), `2F valve "${v.id}" references unknown valve "${v.tag}"`);
  }
  for (const s of b52f.sensors) {
    assert.ok(Boolean(state.sensors[s.tag]), `2F sensor "${s.id}" references unknown sensor "${s.tag}"`);
  }

  // Orthogonal pipe auto-rerouting reacts immediately to dragged equipment coordinates
  const pathBefore = computeOrthogonalPipePath({ x: -11, y: 0, z: 1, h: 1.3 }, { x: -11, y: 0, z: -5, h: 2.2 }, 1.5);
  const pathDragged = computeOrthogonalPipePath({ x: -6, y: 0, z: 3, h: 1.3 }, { x: -11, y: 0, z: -5, h: 2.2 }, 1.5);
  assert.equal(pathBefore[0][0], -11);
  assert.equal(pathDragged[0][0], -6);
  assert.equal(pathDragged[0][2], 3);
  assert.equal(pathDragged[pathDragged.length - 1][0], -11);

  // JSON Export / Import round-trip
  const raw = serializeLayoutOverrides({ b5_ch11: { x: -8.5, z: -3.5, rotY: Math.PI / 2 } });
  const parsed = parseLayoutOverrides(raw);
  assert.ok(parsed, 'Exported 3D layout JSON must parse cleanly');
  assert.equal(parsed.b5_ch11.x, -8.5);
  assert.equal(parsed.b5_ch11.z, -3.5);
  assert.equal(parseLayoutOverrides('{bad json'), null);

  // SOP baseline checks pass on healthy nominal plant
  assert.equal(SOP_MANUALS.length, 6);
  const nominal = stepBuilding5Plant(createInitialB5State(), 0.5);
  for (const sop of SOP_MANUALS) {
    for (const step of sop.steps) {
      assert.equal(step.checkDone(nominal), true, `Nominal healthy plant should satisfy ${sop.code} step ${step.id}`);
    }
  }
});


test('All 8 OTS Timed Challenges pass 2-way verification (no intervention -> FAIL, correct SOP fix -> PASS)', () => {
  assert.equal(TRAINING_CHALLENGES.length, 8);

  for (const ch of TRAINING_CHALLENGES) {
    // 1. Run WITHOUT operator intervention -> MUST FAIL
    let noFixState = ch.injectFault(createInitialB5State());
    noFixState.sandbox.noiseAmplitudePct = 0;
    for (let i = 0; i < 60; i++) {
      noFixState = stepBuilding5Plant(noFixState, 0.5);
    }
    const passedWithoutFix = ch.criteria.every((c) => c.check(noFixState));
    assert.equal(
      passedWithoutFix,
      false,
      `Challenge ${ch.code} (${ch.title}) MUST NOT pass without operator intervention!`
    );

    // 2. Run WITH reference SOP intervention -> MUST PASS
    let fixedState = ch.injectFault(createInitialB5State());
    fixedState.sandbox.noiseAmplitudePct = 0;
    // Let initial fault tick register alarm first (just like startChallenge does)
    fixedState = stepBuilding5Plant(fixedState, 0.5);
    fixedState = ch.applyReferenceFix(fixedState);
    for (let i = 0; i < 90; i++) {
      fixedState = stepBuilding5Plant(fixedState, 0.5);
    }
    for (const cr of ch.criteria) {
      assert.equal(
        cr.check(fixedState),
        true,
        `Challenge ${ch.code} criterion "${cr.label}" MUST PASS after reference operator fix`
      );
    }
  }
});
