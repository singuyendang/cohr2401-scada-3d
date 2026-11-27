export type BuildingId = 'B5' | 'B2' | 'B3';

export type B5SubsystemId =
  | 'chiller'
  | 'heat_recovery'
  | 'pcw'
  | 'di'
  | 'oflac'
  | 'ofrac'
  | 'pv'
  | 'ahu'
  | 'exh'
  | 'pms';

export type B5ScreenId =
  | 'site_overview'
  | 'plant_3d_training'
  | 'b5_overview'
  | 'b5_overview_1f'
  | 'b5_overview_m1f'
  | 'b5_overview_2f'
  | 'b5_overview_m2f'
  | 'b5_chiller'
  | 'b5_heat_recovery'
  | 'b5_cw_ahu'
  | 'b5_air_ahu'
  | 'b5_pcw'
  | 'b5_di'
  | 'b5_oflac'
  | 'b5_ofrac'
  | 'b5_pv'
  | 'b5_exh'
  | 'b5_pms'
  | 'b2_overview'
  | 'b2_overview_1f'
  | 'b2_overview_2f'
  | 'b2_overview_3f'
  | 'b2_overview_m3f'
  | 'b2_cw_ahu'
  | 'b2_air_ahu'
  | 'b2_air_fcu'
  | 'b2_pcw'
  | 'b2_di'
  | 'b2_pv'
  | 'b2_exh'
  | 'b2_pms'
  | 'b3_overview'
  | 'b3_overview_1f'
  | 'b3_overview_m1f'
  | 'b3_chiller'
  | 'b3_heat'
  | 'b3_cw_ahu'
  | 'b3_air_ahu'
  | 'b3_di'
  | 'b3_exh'
  | 'b3_pms'
  | 'b5_trend_online'
  | 'b5_trend_history'
  | 'b5_alarms_online'
  | 'b5_alarms_history';

export type EquipmentKind =
  | 'chiller'
  | 'vfd'
  | 'dol'
  | 'ac_fix'
  | 'ac_vsd'
  | 'dryer'
  | 'pv';

export type ControlMode = 'AUTO' | 'MANUAL';
export type EquipmentStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'FAULTED';
export type SensorAlarmLevel = 'NORMAL' | 'HHA' | 'HA' | 'LA' | 'LLA' | 'FAULT';

export interface EquipmentUnit {
  tag: string;
  label: string;
  subsystem: B5SubsystemId;
  kind: EquipmentKind;
  mode: ControlMode;
  remote: boolean; // PLC FB Inputs.Local (wired to *_REM): true = REMOTE (SCADA allowed), false = LOCAL (Field panel only)
  status: EquipmentStatus;
  cmdStart: boolean;
  startTimerSec: number;
  frequencyHz: number; // 0 when stopped/faulted, strictly 15.0..50.0 when VFD running
  manualSP: number; // 15..50 Hz for VFD, 0..100% for VSD
  loadPct: number; // % FLA (Chiller) or % Capacity (AC/PV)
  runHours: number;
  ratedKw: number;
  powerMeterTag: string;
  interlockOk: boolean;
  interlockReason: string;
  sttPerm: boolean;
  stpPerm: boolean;
  faulted: boolean;
  telemetry: Record<string, number>;
}

export interface ValveUnit {
  tag: string;
  label: string;
  subsystem: B5SubsystemId;
  kind: 'CVAL' | 'XVAL';
  manualOnly: boolean;
  mode: ControlMode;
  cmdOpen: boolean;
  targetPct: number; // 0..100
  positionPct: number; // 0..100
  openFB: boolean;
  closeFB: boolean;
  permissive: boolean;
  faulted: boolean;
  pidTag?: string;
}

export interface SensorAlarmConfig {
  hhaSP: number;
  haSP: number;
  laSP: number;
  llaSP: number;
  hhaEn: boolean;
  haEn: boolean;
  laEn: boolean;
  llaEn: boolean;
  activeLevel: SensorAlarmLevel;
}

export interface AnalogSensor {
  tag: string;
  label: string;
  subsystem: B5SubsystemId;
  kind: 'TIT' | 'PIT_BAR' | 'PIT_KPA' | 'PIT_PA' | 'DPT' | 'FIT' | 'HIT' | 'LIT' | 'AIT';
  pv: number;
  lastGoodPv: number;
  unit: string;
  minRange: number;
  maxRange: number;
  decimals: number;
  manualOverride: boolean;
  overrideValue: number;
  faulted: boolean;
  alarms: SensorAlarmConfig;
}

export interface PIDLoop {
  tag: string;
  label: string;
  subsystem: B5SubsystemId;
  sensorTag: string;
  sp: number;
  kp: number;
  ki: number;
  kd: number;
  reverseActing: boolean; // true: PV < SP => increase output (pressure/heating); false: PV > SP => increase output (cooling)
  integral: number;
  lastError: number;
  lastPv?: number;
  dFiltered?: number;
  cvPct: number; // 0..100%
  isValvePid: boolean;
  autoOutMinPct: number; // Auto-only lower output clamp (0..100), does not affect Manual
  autoOutMaxPct: number; // Auto-only upper output clamp (0..100), does not affect Manual
  unit: string;
  minSP: number;
  maxSP: number;
}

export type DemandId =
  | 'B5CH'
  | 'B5CHWP'
  | 'B5CWP'
  | 'B5CT'
  | 'B5PCW'
  | 'B2PCW'
  | 'B5OFLAC'
  | 'B5OFRAC'
  | 'B5OFRACCP'
  | 'B5PV'
  | 'B3CH'
  | 'B3CHWP'
  | 'B3HP';

export type DemandStatus =
  | 'IDLE'
  | 'FIRST_START'
  | 'DEMAND_STU'
  | 'DEMAND_STD'
  | 'DEMAND_STB'
  | 'NO_STANDBY';

export interface DemandSequencer {
  id: DemandId;
  label: string;
  subsystem: B5SubsystemId;
  enable: boolean;
  unitTags: string[];
  priors: number[]; // 1..N priority per unitTags[i]
  pvSensorTag: string;
  pvUnit: string;
  startUpSP: number;
  shutDownSP: number;
  startUpDelaySec: number;
  shutDownDelaySec: number;
  elapsedSec: number;
  stuCall: boolean;
  stdCall: boolean;
  stuPrior: number;
  stdPrior: number;
  targetCount: number;
  count: number;
  status: DemandStatus;
  /** True when staging UP triggers if PV > startUpSP (e.g. Chiller temp, CT temp); false if PV < startUpSP (pressure). */
  stageUpWhenHigh: boolean;
  /** For B5CH 3-condition control: requires avg FLA >= chillerCapacityStartSP alongside CHSTS1 & Timer */
  chillerCapacityStartSP?: number;
  chillerCapacityStopSP?: number;
}

export interface PowerMeter {
  tag: string;
  label: string;
  parentTag: string | null;
  meterType: 'PM8000' | 'PMMFM383AC' | 'PM2000';
  voltageLL: number;
  voltageLN: number;
  frequencyHz: number;
  currentAvg: number;
  powerFactor: number;
  activeKw: number;
  reactiveKvar: number;
  apparentKva: number;
  energyKwh: number;
  baseKw: number;
}

export type WinccAlarmState = 'CAME_IN' | 'CAME_IN_ACK' | 'WENT_OUT' | 'WENT_OUT_ACK';

export interface AlarmRecord {
  id: string;
  number: number; // WinCC sequential message number
  building: BuildingId;
  timestamp: string; // legacy HH:mm:ss alias for cameInTime
  cameInDate: string; // DD/MM/YYYY
  cameInTime: string; // HH:mm:ss
  wentOutTime: string | null;
  ackTime: string | null;
  simTimeSec: number;
  tag: string;
  subsystem: B5SubsystemId;
  alarmClass: 'ALARM' | 'WARNING';
  severity: 'HHA' | 'HA' | 'LA' | 'LLA' | 'FAULT';
  message: string;
  state: WinccAlarmState;
  active: boolean;
  acknowledged: boolean;
}

export interface TrendPoint {
  simTimeSec: number;
  wallMs?: number;
  timeLabel: string;
  values: Record<string, number>;
}

export interface SandboxControls {
  paused: boolean;
  timeScale: 1 | 5 | 10;
  noiseAmplitudePct: number; // 0..300
  ambientWetBulbC: number; // 18..30, default 22.5
  coolingLoadPct: number; // 20..100, default 58 (B5/B2 Central Plant)
  b3CoolingLoadPct: number; // 20..100, default 58 (B3 Dedicated Air-Cooled Chiller)
  pcwToolLoadPct: number; // 20..100, default 55 (B5 PCW)
  b2PcwToolLoadPct: number; // 20..100, default 55 (B2 PCW)
  diBranchDemandPct: number; // 20..100, default 60
  oflacAirDemandPct: number; // 15..100, default 45
  ofracAirDemandPct: number; // 15..100, default 45
  pvVacuumDemandPct: number; // 15..100, default 45
  diPackageConnected: boolean; // Third-party RO-DI Water Package communication signal (default true)
}

export type FaceplateType =
  | 'Fpl_VFD'
  | 'Fpl_DOL'
  | 'Fpl_CH'
  | 'Fpl_CHData'
  | 'Fpl_CVAL'
  | 'Fpl_XVAL'
  | 'Fpl_PID'
  | 'Fpl_Demand'
  | 'Fpl_Sensor'
  | 'Fpl_AC'
  | 'Fpl_ACFIXData'
  | 'Fpl_ACVSDData'
  | 'Fpl_PV'
  | 'Fpl_PVData'
  | 'Fpl_AHU_DewPoint'
  | 'Fpl_PAU'
  | 'Fpl_PM8000'
  | 'Fpl_PMMFM383AC'
  | 'Fpl_PM2000';

export interface OpenFaceplate {
  id: string;
  type: FaceplateType;
  targetTag: string;
  title: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface AhuRoomConfig {
  ahuTag: string;
  label: string;
  cwValveTag: string;
  hwValveTag: string;
  fanPidTag: string;
  cwPidTag: string;
  hwPidTag: string;
  satSensorTag: string;
  ratSensorTag: string;
  rahSensorTag: string;
  sasSensorTag: string;
  dewPointSensorTag: string;
  roomTempSP: number;
  roomRhSP: number;
  dewPointSP: number;
  sasSP: number;
}

export interface PlantState {
  simTimeSec: number;
  tickCount: number;
  equipment: Record<string, EquipmentUnit>;
  valves: Record<string, ValveUnit>;
  sensors: Record<string, AnalogSensor>;
  pids: Record<string, PIDLoop>;
  demands: Record<DemandId, DemandSequencer>;
  meters: Record<string, PowerMeter>;
  ahus: Record<string, AhuRoomConfig>;
  alarms: AlarmRecord[];
  trends: TrendPoint[];
  sandbox: SandboxControls;
}
