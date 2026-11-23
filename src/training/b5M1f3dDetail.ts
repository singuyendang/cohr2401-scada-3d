import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';

export interface DetailedDuct3D {
  id: string;
  kind: 'supply' | 'return' | 'fresh' | 'exhaust';
  flowSourceTags: string[];
  points: [number, number, number][];
  width: number; // Cross-section horizontal width (m)
  height: number; // Cross-section vertical height (m)
  taperEnd?: boolean; // Adds realistic galvanized rectangular transition boot at final endpoint (e.g., RA drop onto AHU top)
  particlesOnly?: boolean; // Render ONLY animated airflow droplets (no solid sheet-metal duct) — e.g. FCU/FFU/PAUCT air jets into room!
  particleCount?: number;
}

export interface B5M1fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const M1F_CEILING_Y = 6.2; // M1F Mezzanine AHU room ceiling height (m)
export const M1F_WALL_RIGHT_X = 10.0; // Right wall where Supply Air duct meets center of wall cleanly
export const M1F_WALL_LEFT_X = -10.0; // Opposite wall (spacious 20m × 12m room — AHU occupies ~1/8 area)
export const M1F_ROOM_HALF_Z = 6.0; // Spacious AHU room depth: Z = -6.0 .. +6.0 (12.0m, AHU centered at Z = 0!)

/**
 * Generates the 100% SCADA- & CAD-1555602-faithful 3D assembly for Building 5 — 1st Mezzanine Floor (M1F):
 *   - Daikin Modular AHU-B5-1F-01 inside compact MEP Space 5-MF1
 *   - HUGE boxy rectangular galvanized Supply Air duct punching straight into the Right Wall (bordering Open Void to Facility Station Below)
 *   - HUGE boxy rectangular galvanized Return Air duct dropping from the M1F ceiling straight down into the top of the AHU Mixing Section
 *   - Fresh Air Intake damper opening AWAY from the wall (-X side) to draw fresh outdoor air
 *   - CHW Supply (#00cfe8) & Return (#008f91) + Heat Recovery HW Supply (#eb9ee3) & Return (#e03c86) dropping from ceiling into the AHU Cooling & Reheat Coils via 3-way VPMA control valves (CWCV & HWCV)!
 */
export function buildB5M1fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B5M1fDetailAssembly {
  const ahuNode = DEFAULT_3D_NODES.find((n) => n.id === 'b5_ahu1f');
  const ahuT = ahuNode ? resolveNodeTransform(ahuNode, overrides) : { x: -0.4, y: 0, z: 0, rotY: 0 };
  const ahuW = ahuNode?.size[0] ?? 5.6;
  const ahuH = ahuNode?.size[1] ?? 2.45;
  const ahuD = ahuNode?.size[2] ?? 2.35;

  const ax = ahuT.x;
  const az = ahuT.z;

  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const ahuTag = 'B5M1F_AHU01';
  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
  const hwpTags = ['B51F_CH11HWP'];

  // =========================================================================
  // 1. LARGE BOXY GALVANIZED RECTANGULAR AIR DUCTWORK (SA / RA / OA)
  // =========================================================================
  // 1A. SUPPLY AIR DUCT (1.20m W × 1.05m H) — exits +X mouth of Daikin AHU & runs flush into the Right Wall!
  const saStartX = ax + ahuW / 2;
  const saEndX = M1F_WALL_RIGHT_X;
  const saCenterY = 1.32;
  const saW = 1.2;
  const saH = 1.05;

  ducts.push({
    id: 'm1f_duct_supply',
    kind: 'supply',
    flowSourceTags: [ahuTag],
    points: [
      [saStartX, saCenterY, az],
      [saEndX, saCenterY, az],
    ],
    width: saW,
    height: saH,
    particleCount: 4,
  });

  // Supply Air live duct-mounted sensors (bolted squarely on top surface of SA duct: Y_top = saCenterY + saH/2 = 1.845!)
  const saTopY = saCenterY + saH / 2;
  const saLen = Math.max(1.2, saEndX - saStartX);
  sensors.push(
    {
      id: 'sn_m1f_sat',
      layer: 'ac',
      tag: 'B5M1F_AHU01_SAT',
      shortLabel: 'AHU01 SAT',
      pos: [saStartX + saLen * 0.32, saTopY + 0.55, az],
      fluid: 'air',
    },
    {
      id: 'sn_m1f_sas',
      layer: 'ac',
      tag: 'B5M1F_AHU01_SAS',
      shortLabel: 'AHU01 SAS',
      pos: [saStartX + saLen * 0.72, saTopY + 0.55, az],
      fluid: 'air',
    }
  );

  // 1B. RETURN AIR DUCT (1.15m W × 0.92m H) — runs right under M1F ceiling from right wall & drops STRAIGHT DOWN into top of Mixing Section!
  const raDropX = ax - ahuW * 0.36;
  const raCeilY = 5.15;
  const raW = 1.15;
  const raH = 0.92;

  ducts.push({
    id: 'm1f_duct_return',
    kind: 'return',
    flowSourceTags: [ahuTag],
    points: [
      [M1F_WALL_RIGHT_X, raCeilY, az],
      [raDropX, raCeilY, az],
      [raDropX, ahuH, az],
    ],
    width: raW,
    height: raH,
    taperEnd: true,
    particleCount: 8,
  });

  // Return Air / Room live sensors mounted on top of the ceiling Return Air duct (Y_top = raCeilY + raH/2 = 5.61!)
  const raTopY = raCeilY + raH / 2;
  const raSpan = M1F_WALL_RIGHT_X - raDropX;
  sensors.push(
    {
      id: 'sn_m1f_rat',
      layer: 'ac',
      tag: 'B5M1F_AHU01_RAT',
      shortLabel: 'AHU01 RAT',
      pos: [raDropX + raSpan * 0.25, raTopY + 0.55, az],
      fluid: 'air',
    },
    {
      id: 'sn_m1f_rah',
      layer: 'ac',
      tag: 'B5M1F_AHU01_RAH',
      shortLabel: 'AHU01 RAH',
      pos: [raDropX + raSpan * 0.52, raTopY + 0.55, az],
      fluid: 'air',
    },
    {
      id: 'sn_m1f_dp',
      layer: 'ac',
      tag: 'B5M1F_AHU01_DP',
      shortLabel: 'AHU01 DP',
      pos: [raDropX + raSpan * 0.78, raTopY + 0.55, az],
      fluid: 'air',
    }
  );

  // 1C. FRESH AIR INTAKE DUCT / DAMPER HOOD (1.15m W × 1.05m H) — faces AWAY from the wall (-X side) drawing fresh outdoor air!
  const faMouthX = ax - ahuW / 2; // -3.20
  ducts.push({
    id: 'm1f_duct_fresh',
    kind: 'fresh',
    flowSourceTags: [ahuTag],
    points: [
      [faMouthX - 1.35, saCenterY, az],
      [faMouthX, saCenterY, az],
    ],
    width: 1.15,
    height: 1.05,
    particleCount: 3,
  });

  // 1D. RETURN AIR EXHAUST RELIEF BRANCH -> CEILING INLINE BLACK AXIAL FAN EAF-B5-1F-01 -> REAR EXTERIOR WALL!
  const eafNode = DEFAULT_3D_NODES.find((n) => n.id === 'b5_m1f_eaf01');
  const eafT = eafNode ? resolveNodeTransform(eafNode, overrides) : { x: 4.5, y: 5.15, z: -3.2, rotY: Math.PI / 2 };
  const branchX = eafT.x;
  ducts.push({
    id: 'm1f_duct_exh_to_eaf01',
    kind: 'exhaust',
    flowSourceTags: ['B51F_EAF01'],
    points: [
      [branchX, raCeilY, az],
      [branchX, raCeilY, eafT.z + 0.55],
    ],
    width: 0.78,
    height: 0.78,
    particleCount: 3,
  });
  ducts.push({
    id: 'm1f_duct_eaf01_out',
    kind: 'exhaust',
    flowSourceTags: ['B51F_EAF01'],
    points: [
      [branchX, raCeilY, eafT.z - 0.55],
      [branchX, raCeilY, -M1F_ROOM_HALF_Z],
    ],
    width: 0.78,
    height: 0.78,
    particleCount: 3,
  });

  // =========================================================================
  // 2. CHILLED WATER (CHW) & HEAT RECOVERY HOT WATER (HW) PIPING FROM CEILING
  //    Strictly matching Building 5 Chiller/HR colors, 100% 90° orthogonal, ZERO overlaps!
  //    - CHW Supply: #00cfe8 (chw)     | CHW Return: #008f91 (chwr)
  //    - HW Supply:  #eb9ee3 (hw_sup)  | HW Return:  #e03c86 (hw_ret)
  //    - 3-Way VPMA Control Valves B5M1F_AHU01_CWCV & B5M1F_AHU01_HWCV with visible 3-way bypass bridge!
  // =========================================================================
  const coilFaceZ = az + ahuD / 2; // +1.175 (front coil-connection side of Daikin AHU)
  const dropZ = coilFaceZ + 0.85; // +2.025 (clean pipe drop plane in front of AHU coil stubs)
  const Y_COIL_IN = 0.88; // Lower coil inlet nozzle height
  const Y_COIL_OUT = 1.62; // Upper coil outlet nozzle height
  const Y_3WAY_VALVE = 2.55; // Eye-level 3-way control valve elevation (CWCV & HWCV)

  // Staggered ceiling run elevations (ZERO overlaps!)
  const Y_CHW_SUP_HDR = 5.35;
  const Y_CHW_RET_HDR = 5.6;
  const Y_HW_SUP_HDR = 5.85;
  const Y_HW_RET_HDR = 6.08;

  // X tracks aligned strictly with Cooling Coil (left half of coil bay) & Reheat Coil (right half of coil bay)
  const xChwSup = ax - 0.55; // -0.95
  const xChwRet = ax - 0.1; // -0.50
  const xHwSup = ax + 0.45; // +0.05
  const xHwRet = ax + 0.9; // +0.50

  // 2A. CHW SUPPLY (#00cfe8) — Ceiling Riser Drop -> Cooling Coil Lower Inlet
  pipes.push({
    id: 'm1f_chw_sup',
    layer: 'chiller',
    fluid: 'chw',
    flowSourceTags: chwpTags,
    points: [
      [M1F_WALL_RIGHT_X, Y_CHW_SUP_HDR, dropZ + 0.45],
      [xChwSup, Y_CHW_SUP_HDR, dropZ + 0.45],
      [xChwSup, Y_CHW_SUP_HDR, dropZ],
      [xChwSup, Y_COIL_IN, dropZ],
      [xChwSup, Y_COIL_IN, coilFaceZ],
    ],
    radius: 0.08,
    particleCount: 8,
  });

  // 2B. CHW RETURN (#008f91) — Cooling Coil Upper Outlet -> 3-Way Valve CWCV -> Ceiling Header
  pipes.push({
    id: 'm1f_chw_ret',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: chwpTags,
    requireAllTags: ['B5M1F_AHU01_CWCV'],
    points: [
      [xChwRet, Y_COIL_OUT, coilFaceZ],
      [xChwRet, Y_COIL_OUT, dropZ],
      [xChwRet, Y_CHW_RET_HDR, dropZ],
      [xChwRet, Y_CHW_RET_HDR, dropZ + 0.75],
      [M1F_WALL_RIGHT_X, Y_CHW_RET_HDR, dropZ + 0.75],
    ],
    radius: 0.08,
    particleCount: 8,
  });

  // 3-Way Bypass Bridge tying CHW Supply directly into 3-Way Valve B5M1F_AHU01_CWCV
  pipes.push({
    id: 'm1f_chw_3way_bypass',
    layer: 'chiller',
    fluid: 'chw',
    flowSourceTags: chwpTags,
    points: [
      [xChwSup, Y_3WAY_VALVE, dropZ],
      [xChwRet, Y_3WAY_VALVE, dropZ],
    ],
    radius: 0.065,
    particleCount: 2,
  });
  valves.push({
    id: 'vl_m1f_cwcv',
    layer: 'chiller',
    tag: 'B5M1F_AHU01_CWCV',
    shortLabel: '3W CWCV',
    pos: [xChwRet, Y_3WAY_VALVE, dropZ],
    orientation: 'vertical',
    valveStyle: 'control',
  });

  // 2C. HEAT RECOVERY HW SUPPLY (#eb9ee3) — Ceiling Riser Drop -> Reheat Coil Lower Inlet
  pipes.push({
    id: 'm1f_hw_sup',
    layer: 'chiller',
    fluid: 'hw_sup',
    flowSourceTags: hwpTags,
    points: [
      [M1F_WALL_RIGHT_X, Y_HW_SUP_HDR, dropZ + 1.05],
      [xHwSup, Y_HW_SUP_HDR, dropZ + 1.05],
      [xHwSup, Y_HW_SUP_HDR, dropZ],
      [xHwSup, Y_COIL_IN, dropZ],
      [xHwSup, Y_COIL_IN, coilFaceZ],
    ],
    radius: 0.075,
    particleCount: 8,
  });

  // 2D. HEAT RECOVERY HW RETURN (#e03c86) — Reheat Coil Upper Outlet -> 3-Way Valve HWCV -> Ceiling Header
  pipes.push({
    id: 'm1f_hw_ret',
    layer: 'chiller',
    fluid: 'hw_ret',
    flowSourceTags: hwpTags,
    requireAllTags: ['B5M1F_AHU01_HWCV'],
    points: [
      [xHwRet, Y_COIL_OUT, coilFaceZ],
      [xHwRet, Y_COIL_OUT, dropZ],
      [xHwRet, Y_HW_RET_HDR, dropZ],
      [xHwRet, Y_HW_RET_HDR, dropZ + 1.35],
      [M1F_WALL_RIGHT_X, Y_HW_RET_HDR, dropZ + 1.35],
    ],
    radius: 0.075,
    particleCount: 8,
  });

  // 3-Way Bypass Bridge tying HW Supply directly into 3-Way Valve B5M1F_AHU01_HWCV
  pipes.push({
    id: 'm1f_hw_3way_bypass',
    layer: 'chiller',
    fluid: 'hw_sup',
    flowSourceTags: hwpTags,
    points: [
      [xHwSup, Y_3WAY_VALVE, dropZ],
      [xHwRet, Y_3WAY_VALVE, dropZ],
    ],
    radius: 0.06,
    particleCount: 2,
  });
  valves.push({
    id: 'vl_m1f_hwcv',
    layer: 'chiller',
    tag: 'B5M1F_AHU01_HWCV',
    shortLabel: '3W HWCV',
    pos: [xHwRet, Y_3WAY_VALVE, dropZ],
    orientation: 'vertical',
    valveStyle: 'control',
  });

  return { pipes, ducts, valves, sensors };
}
