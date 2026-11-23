import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export type B31FLayerId = 'outdoor' | 'warehouse';

export interface B31fDetailAssembly {
  pipes: (DetailedPipe3D & { b3Layer: B31FLayerId })[];
  ducts: (DetailedDuct3D & { b3Layer: B31FLayerId })[];
  valves: (InlineValve3D & { b3Layer: B31FLayerId })[];
  sensors: (InlineSensor3D & { b3Layer: B31FLayerId })[];
}

export const B31F_CEILING_Y = 4.2; // 1F Warehouse / Process suspended ceiling height
export const B31F_ROOF_Y = 6.4; // Structural roof truss height above 1F ceiling plenum
export const B31F_OUTDOOR_X_MIN = -21.8; // Outer curb along Road No. 2 (Đường Số 2, intersecting Trần Phú at +Z!)
export const B31F_WALL_X = -11.2; // Left exterior wall separating Outdoor Chiller/Heat Yard (-X) from Indoor 1F Warehouse (+X)
export const B31F_INDOOR_X_MAX = 19.0; // Indoor warehouse right boundary
export const B31F_HALF_Z = 12.5; // Z = -12.5 .. +12.5 (25m deep; +Z faces Đường Trần Phú!)

export const B31F_CAMERA_PRESETS: Record<
  B31FLayerId | 'all',
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  all: { pos: [-26, 24, 30], target: [-2, 2.5, 0], label: 'All 1F' },
  outdoor: { pos: [-31, 12, 16], target: [-16.2, 2.0, 0.2], label: 'Outdoor Chiller & Heat Fan' },
  warehouse: { pos: [4, 17, 27], target: [4.5, 2.3, 0.5], label: '1F Warehouse & Utilities' },
};

/**
 * Generates the complete, 100% SCADA-faithful 3D MEP assembly for Building 3 — 1st Floor (`b3_plant`):
 *   1. OUTDOOR UTILITY YARD along Road No. 2 (X = -21.8 .. -11.2, facing -X Road No. 2 & +Z Trần Phú):
 *      - North Yard (Z < 0): 2× Air-Cooled Daikin EWAD-TZ Chillers (CH-21 / CH-22) + CH21CHWP / CH22CHWP + CH21CHV / CH22CHV
 *        + Manual Bypass BPMV + CHSTS1 / CHRTS2 / CHWPS1 / BPPS1 / BPPS2 / BPTS3 (Scr_B3_HVAC_CHILLED.Pdl)
 *      - South Yard (Z > 0): 3× Upright Mitsubishi-style Heat Fans (HP-01 / HP-02 / HP-03) + HPP-21 / HPP-22 + HP01V / 02V / 03V
 *        + Manual Bypass HPBPMV + HPSTS1 / HPRTS2 / HWPS1 / HPBPPS1 / HPBPPS2 / HPBPTS3 (Scr_B3_HotWaterSystem.Pdl)
 *   2. INDOOR 1F WAREHOUSE, CLEANSE/CHEMICAL/MATERIAL & DI CISTERN (X = -11.2 .. +19.0):
 *      - Overhead CHW & HW risers climbing into 2F AHU room + CHW branch feeding 1F FCU-03 (B31F_FCU03V + particlesOnly downward cool air!)
 *      - DI Cistern Loop (B31F_PCV10705 / PIT10705 / FIT10705)
 *      - 5× Ceiling Exhaust Fans (EAF-01..05) & Toilet TEF-01 with vertical suction pickups from ceiling face (Y = 4.2m) pulling air UP -> OUT!
 *      - Column-mounted room environmental sensors (AHU01/02 RAT/RAH & FCU03RT1)!
 */
export function buildB31fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B31fDetailAssembly {
  const posOf = (id: string, fallback: [number, number, number]): [number, number, number] => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return fallback;
    const t = resolveNodeTransform(node, overrides);
    return [t.x, t.y, t.z];
  };

  const pipes: (DetailedPipe3D & { b3Layer: B31FLayerId })[] = [];
  const ducts: (DetailedDuct3D & { b3Layer: B31FLayerId })[] = [];
  const valves: (InlineValve3D & { b3Layer: B31FLayerId })[] = [];
  const sensors: (InlineSensor3D & { b3Layer: B31FLayerId })[] = [];

  const chwpTags = ['B31F_CH21CHWP', 'B31F_CH22CHWP'];
  const hppTags = ['B31F_HPP21', 'B31F_HPP22'];

  const [ch21x, , ch21z] = posOf('b3_ch21', [-16.8, 0, 9.6]);
  const [ch22x, , ch22z] = posOf('b3_ch22', [-16.8, 0, 4.4]);
  const [p21x, , p21z] = posOf('b3_ch21p', [-16.8, 0, 1.0]);
  const [p22x, , p22z] = posOf('b3_ch22p', [-16.8, 0, -1.1]);

  const [hpp1x, , hpp1z] = posOf('b3_hpp21', [-16.8, 0, -3.4]);
  const [hpp2x, , hpp2z] = posOf('b3_hpp22', [-16.8, 0, -5.5]);
  const [hp1x, , hp1z] = posOf('b3_hp01', [-16.8, 0, -7.6]);
  const [hp2x, , hp2z] = posOf('b3_hp02', [-16.8, 0, -9.6]);
  const [hp3x, , hp3z] = posOf('b3_hp03', [-16.8, 0, -11.6]);

  const [cisX, , cisZ] = posOf('b3_cistern', [13.5, 0, -7.4]);

  // =========================================================================
  // 1A. OUTDOOR AIR-COOLED CHILLER YARD (LENGTHWISE PARALLEL TO ROAD NO. 2!)
  //     - All equipment aligned in ONE row along X = -16.8 (Trần Phú +Z -> -Z: CH-21 -> CH-22 -> CHWP -> HPP -> HP-01..03)
  //     - Inline vertical pumps have TWO opposing flanged nozzles along Z (+Z and -Z, 180 deg apart):
  //         * CH21CHWP / CH22CHWP: Suction enters -Z flange -> pumped straight through -> Discharge exits +Z flange toward Chillers!
  //         * HPP-21 / HPP-22:     Suction enters +Z flange -> pumped straight through -> Discharge exits -Z flange toward Heat Fans!
  //     - Chiller & Heat Fan outlet pipes are horizontally offset in Z from inlet pipes so NO pipe ever passes over an actuator valve!
  // =========================================================================
  const X_REAR_DISCH = -18.95; // Inner rear discharge manifold (Pump Disch -> Chiller / Heat Fan Inlet via CHV / HPV)
  const X_REAR_SUP = -19.8; // Middle rear Supply collector (Chiller / Heat Fan Outlet -> Bridge Supply)
  const X_REAR_RET = -20.65; // Outer rear Return drop (Bridge Return -> Pump Suction)
  const Y_PUMP = 0.48;
  const Y_SUCT_HOP = 0.9; // Pump suction cleanly hops OVER X_REAR_DISCH (0.48) and UNDER X_REAR_SUP (1.32)!
  const Y_EVAP_IN = 0.62;
  const Y_EVAP_OUT = 1.32; // Clears actuator valve tops AND pump suction hop (0.90m)!
  const Y_BRIDGE_PIPE = 4.72; // ALL 4 bridge headers rest side-by-side right on top of the Overhead Support Bridge!
  const Z_CHW_SUP = 2.35; // CHW Supply on bridge (completely separated from CHW Return!)
  const Z_CHW_RET = 1.15; // CHW Return on bridge (1.20m clear horizontal gap for BPMV bypass!)
  const X_BYP_BRIDGE = -15.4; // Exact X position on Overhead Support Bridge for BPMV / HPBPMV bypass cross-pipe!
  const PUMP_FLANGE_Z = 0.62; // Exact world Z offset of vertical inline pump opposing flanged nozzles!
  const PUMP_ELBOW_Z = 0.82; // Clean elbow stub 0.20m outside each pump flange
  const CH_PORT_DZ = 0.7; // Separate Chiller Evap Inlet (-0.70) & Outlet (+0.70) Z ports -> 1.40m clear of actuator!
  const HP_PORT_DZ = 0.35; // Separate Heat Fan Inlet (+0.35) & Outlet (-0.35) Z ports -> 0.70m clear of actuator!

  pipes.push(
    // CHW Return exits Building 3 HIGH on Overhead Support Bridge (Z=+1.15, Y=4.72) -> drops at X_REAR_RET (-20.65) -> CHWP Suction!
    {
      id: 'b3_chwr_from_bldg',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_CHW_RET],
        [X_REAR_RET, Y_BRIDGE_PIPE, Z_CHW_RET],
        [X_REAR_RET, Y_PUMP, Z_CHW_RET],
        [X_REAR_RET, Y_PUMP, p22z - PUMP_ELBOW_Z],
      ],
      radius: 0.1,
      particleCount: 11,
    },
    // CHWP Rear Discharge Bus (X=-18.95, Y=0.48) linking CH22CHWP (+Z disch) & CH21CHWP (+Z disch) -> CH-22 & CH-21 inlets!
    {
      id: 'b3_chwr_disch_bus',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [X_REAR_DISCH, Y_PUMP, p22z + PUMP_ELBOW_Z],
        [X_REAR_DISCH, Y_PUMP, ch21z - CH_PORT_DZ],
      ],
      radius: 0.1,
      particleCount: 9,
    },
    // Cold CHW Supply Collector BEHIND CH-21 & CH-22 (X=-19.80, Y=1.32) -> climbs straight UP at Z=+2.35 -> crosses Bridge into Building 3!
    {
      id: 'b3_chws_to_bldg',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [X_REAR_SUP, Y_EVAP_OUT, ch21z + CH_PORT_DZ],
        [X_REAR_SUP, Y_EVAP_OUT, Z_CHW_SUP],
        [X_REAR_SUP, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_CHW_SUP],
      ],
      radius: 0.1,
      particleCount: 12,
    },
    // Horizontal Manual Bypass Pipe carrying B31F_BPMV ON THE OVERHEAD PIPE BRIDGE (CHW Supply Z=+2.35 -> CHW Return Z=+1.15)!
    {
      id: 'b3_chw_bypass',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'chw',
      flowSourceTags: ['B31F_BPMV'],
      requireAllTags: chwpTags,
      points: [
        [X_BYP_BRIDGE, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [X_BYP_BRIDGE, Y_BRIDGE_PIPE, Z_CHW_RET],
      ],
      radius: 0.08,
      particleCount: 4,
    }
  );

  // Per-Pump (2 opposing inline flanges: -Z Suction & +Z Discharge!) & Per-Chiller (offset Inlet/Outlet Z ports!)
  for (const [n, chx, chz, px, pz] of [
    ['21', ch21x, ch21z, p21x, p21z],
    ['22', ch22x, ch22z, p22x, p22z],
  ] as const) {
    const pTag = `B31F_CH${n}CHWP`;
    const vTag = `B31F_CH${n}CHV`;
    const evapRearX = chx - 1.05;
    const chInZ = chz - CH_PORT_DZ;
    const chOutZ = chz + CH_PORT_DZ;
    const suctStubZ = pz - PUMP_ELBOW_Z;
    const suctFlangeZ = pz - PUMP_FLANGE_Z;
    const dischFlangeZ = pz + PUMP_FLANGE_Z;
    const dischStubZ = pz + PUMP_ELBOW_Z;
    pipes.push(
      {
        id: `b3_ch${n}_p_suct`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'chwr',
        flowSourceTags: [pTag],
        points: [
          [X_REAR_RET, Y_PUMP, suctStubZ],
          [X_REAR_RET, Y_SUCT_HOP, suctStubZ],
          [px, Y_SUCT_HOP, suctStubZ],
          [px, Y_PUMP, suctStubZ],
          [px, Y_PUMP, suctFlangeZ],
        ],
        radius: 0.08,
        particleCount: 4,
      },
      {
        id: `b3_ch${n}_p_disch`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'chwr',
        flowSourceTags: [pTag],
        points: [
          [px, Y_PUMP, dischFlangeZ],
          [px, Y_PUMP, dischStubZ],
          [X_REAR_DISCH, Y_PUMP, dischStubZ],
        ],
        radius: 0.08,
        particleCount: 3,
      },
      {
        id: `b3_ch${n}_evap_in`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'chwr',
        flowSourceTags: chwpTags,
        requireAllTags: [vTag],
        points: [
          [X_REAR_DISCH, Y_PUMP, chInZ],
          [X_REAR_DISCH, Y_EVAP_IN, chInZ],
          [evapRearX, Y_EVAP_IN, chInZ],
        ],
        radius: 0.085,
        particleCount: 3,
      },
      {
        id: `b3_ch${n}_evap_out`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'chw',
        flowSourceTags: chwpTags,
        requireAllTags: [vTag],
        points: [
          [evapRearX, Y_EVAP_OUT, chOutZ],
          [X_REAR_SUP, Y_EVAP_OUT, chOutZ],
        ],
        radius: 0.085,
        particleCount: 3,
      }
    );
    valves.push({
      id: `vl_b3_ch${n}chv`,
      layer: 'chiller',
      b3Layer: 'outdoor',
      tag: vTag,
      shortLabel: `CH${n}CHV`,
      pos: [(X_REAR_DISCH + evapRearX) / 2, Y_EVAP_IN, chInZ],
      orientation: 'horizontal_x',
      valveStyle: 'actuator',
    });
  }

  // Manual Bypass Valve B31F_BPMV mounted squarely on horizontal CHW Bypass Pipe (Supply -> Return) on Overhead Support Bridge!
  valves.push({
    id: 'vl_b3_bpmv',
    layer: 'chiller',
    b3Layer: 'outdoor',
    tag: 'B31F_BPMV',
    shortLabel: 'BPMV',
    pos: [X_BYP_BRIDGE, Y_BRIDGE_PIPE, (Z_CHW_SUP + Z_CHW_RET) / 2],
    orientation: 'horizontal_z',
    valveStyle: 'control',
  });

  // 100% SCADA-faithful CHW sensors (Scr_B3_HVAC_CHILLED.Pdl) — EVERY stem welded directly onto its exact pipe (+0.55m above pipe centerline)!
  sensors.push(
    // CHSTS1: CHW Supply Temp (downstream of bypass, entering Building 3)
    { id: 'sn_b3_chsts1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_CHSTS1', shortLabel: 'CHSTS1', pos: [-12.5, Y_BRIDGE_PIPE + 0.55, Z_CHW_SUP], fluid: 'chw' },
    // CHRTS2: CHW Return Temp (upstream of bypass, exiting Building 3)
    { id: 'sn_b3_chrts2', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_CHRTS2', shortLabel: 'CHRTS2', pos: [-12.5, Y_BRIDGE_PIPE + 0.55, Z_CHW_RET], fluid: 'chwr' },
    // BPPS1: CHW Bypass Supply Pressure (on CHW Supply just downstream of BPMV tee)
    { id: 'sn_b3_bpps1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_BPPS1', shortLabel: 'BPPS1', pos: [-14.0, Y_BRIDGE_PIPE + 0.55, Z_CHW_SUP], fluid: 'chw' },
    // BPTS3: CHW Bypass Supply Collector Temp (on CHW Supply upstream of BPMV tee, from Chillers)
    { id: 'sn_b3_bpts3', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_BPTS3', shortLabel: 'BPTS3', pos: [-16.9, Y_BRIDGE_PIPE + 0.55, Z_CHW_SUP], fluid: 'chw' },
    // BPPS2: CHW Bypass Return Pressure (on CHW Return downstream of BPMV tee, heading to CHWP Suction)
    { id: 'sn_b3_bpps2', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_BPPS2', shortLabel: 'BPPS2', pos: [-16.9, Y_BRIDGE_PIPE + 0.55, Z_CHW_RET], fluid: 'chwr' },
    // CHWPS1: CHWP Common Discharge Header Pressure (welded directly on rear discharge bus at Y_PUMP = 0.48!)
    { id: 'sn_b3_chwps1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_CHWPS1', shortLabel: 'CHWPS1', pos: [X_REAR_DISCH, Y_PUMP + 0.55, 2.8], fluid: 'chwr' }
  );

  // =========================================================================
  // 1B. OUTDOOR HOT WATER HEAT FAN YARD (BEHIND HPP-21/22 & HP-01/02/03 ON ROAD NO. 2 SIDE -> OVERHEAD BRIDGE!)
  // =========================================================================
  const Y_HW_IN = 0.48;
  const Y_HW_OUT = 1.32; // Clears HPP suction hop (0.90m) & HP01..03V actuator tops cleanly!
  const Z_HW_RET = -2.35; // HW Return on bridge (cleanly separated from CHW Return end -1.92!)
  const Z_HW_SUP = -3.55; // HW Supply on bridge (1.20m clear horizontal gap for HPBPMV bypass!)

  pipes.push(
    // HW Return exits Building 3 HIGH on Overhead Support Bridge (Z=-2.35, Y=4.72) -> drops at X_REAR_RET (-20.65) -> HPP Suction (+Z flanges)!
    {
      id: 'b3_hwr_from_bldg',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: hppTags,
      points: [
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_HW_RET],
        [X_REAR_RET, Y_BRIDGE_PIPE, Z_HW_RET],
        [X_REAR_RET, Y_PUMP, Z_HW_RET],
        [X_REAR_RET, Y_PUMP, hpp2z + PUMP_ELBOW_Z],
      ],
      radius: 0.095,
      particleCount: 11,
    },
    // HPP-21 & HPP-22: 2 OPPOSING INLINE FLANGES (+Z Suction entering pump -> -Z Discharge exiting toward Heat Fans!)
    {
      id: 'b3_hpp21_suct',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: ['B31F_HPP21'],
      points: [
        [X_REAR_RET, Y_PUMP, hpp1z + PUMP_ELBOW_Z],
        [X_REAR_RET, Y_SUCT_HOP, hpp1z + PUMP_ELBOW_Z],
        [hpp1x, Y_SUCT_HOP, hpp1z + PUMP_ELBOW_Z],
        [hpp1x, Y_PUMP, hpp1z + PUMP_ELBOW_Z],
        [hpp1x, Y_PUMP, hpp1z + PUMP_FLANGE_Z],
      ],
      radius: 0.08,
      particleCount: 4,
    },
    {
      id: 'b3_hpp21_disch',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: ['B31F_HPP21'],
      points: [
        [hpp1x, Y_PUMP, hpp1z - PUMP_FLANGE_Z],
        [hpp1x, Y_PUMP, hpp1z - PUMP_ELBOW_Z],
        [X_REAR_DISCH, Y_PUMP, hpp1z - PUMP_ELBOW_Z],
      ],
      radius: 0.08,
      particleCount: 3,
    },
    {
      id: 'b3_hpp22_suct',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: ['B31F_HPP22'],
      points: [
        [X_REAR_RET, Y_PUMP, hpp2z + PUMP_ELBOW_Z],
        [X_REAR_RET, Y_SUCT_HOP, hpp2z + PUMP_ELBOW_Z],
        [hpp2x, Y_SUCT_HOP, hpp2z + PUMP_ELBOW_Z],
        [hpp2x, Y_PUMP, hpp2z + PUMP_ELBOW_Z],
        [hpp2x, Y_PUMP, hpp2z + PUMP_FLANGE_Z],
      ],
      radius: 0.08,
      particleCount: 4,
    },
    {
      id: 'b3_hpp22_disch',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: ['B31F_HPP22'],
      points: [
        [hpp2x, Y_PUMP, hpp2z - PUMP_FLANGE_Z],
        [hpp2x, Y_PUMP, hpp2z - PUMP_ELBOW_Z],
        [X_REAR_DISCH, Y_PUMP, hpp2z - PUMP_ELBOW_Z],
      ],
      radius: 0.08,
      particleCount: 3,
    },
    // Rear HW Discharge Manifold (X=-18.95, Y=0.48) feeding HP-01, HP-02, HP-03 inlets from behind!
    {
      id: 'b3_hw_disch_bus',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_ret',
      flowSourceTags: hppTags,
      points: [
        [X_REAR_DISCH, Y_HW_IN, hpp1z - PUMP_ELBOW_Z],
        [X_REAR_DISCH, Y_HW_IN, hp3z + HP_PORT_DZ],
      ],
      radius: 0.09,
      particleCount: 10,
    },
    // Hot Water Supply Collector BEHIND HP-03..HP-01 (X=-19.80, Y=1.32) -> climbs straight UP at Z=-3.55 -> crosses Bridge into Building 3!
    {
      id: 'b3_hws_to_bldg',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_sup',
      flowSourceTags: hppTags,
      points: [
        [X_REAR_SUP, Y_HW_OUT, hp3z - HP_PORT_DZ],
        [X_REAR_SUP, Y_HW_OUT, Z_HW_SUP],
        [X_REAR_SUP, Y_BRIDGE_PIPE, Z_HW_SUP],
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_HW_SUP],
      ],
      radius: 0.095,
      particleCount: 12,
    },
    // Horizontal Manual Hot Water Bypass Pipe carrying B31F_HPBPMV ON THE OVERHEAD PIPE BRIDGE (HW Supply Z=-3.55 -> HW Return Z=-2.35)!
    {
      id: 'b3_hw_bypass',
      layer: 'chiller',
      b3Layer: 'outdoor',
      fluid: 'hw_sup',
      flowSourceTags: ['B31F_HPBPMV'],
      requireAllTags: hppTags,
      points: [
        [X_BYP_BRIDGE, Y_BRIDGE_PIPE, Z_HW_SUP],
        [X_BYP_BRIDGE, Y_BRIDGE_PIPE, Z_HW_RET],
      ],
      radius: 0.075,
      particleCount: 4,
    }
  );

  for (const [n, hpx, hpz] of [
    ['01', hp1x, hp1z],
    ['02', hp2x, hp2z],
    ['03', hp3x, hp3z],
  ] as const) {
    const vTag = `B31F_HP${n}V`;
    const hpRearX = hpx - 0.65;
    const hpInZ = hpz + HP_PORT_DZ;
    const hpOutZ = hpz - HP_PORT_DZ;
    pipes.push(
      {
        id: `b3_hp${n}_in`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'hw_ret',
        flowSourceTags: hppTags,
        requireAllTags: [vTag],
        points: [
          [X_REAR_DISCH, Y_HW_IN, hpInZ],
          [hpRearX, Y_HW_IN, hpInZ],
        ],
        radius: 0.075,
        particleCount: 3,
      },
      {
        id: `b3_hp${n}_out`,
        layer: 'chiller',
        b3Layer: 'outdoor',
        fluid: 'hw_sup',
        flowSourceTags: hppTags,
        requireAllTags: [vTag],
        points: [
          [hpRearX, Y_HW_OUT, hpOutZ],
          [X_REAR_SUP, Y_HW_OUT, hpOutZ],
        ],
        radius: 0.075,
        particleCount: 3,
      }
    );
    valves.push({
      id: `vl_b3_hp${n}v`,
      layer: 'chiller',
      b3Layer: 'outdoor',
      tag: vTag,
      shortLabel: `HP${n}V`,
      pos: [(X_REAR_DISCH + hpRearX) / 2, Y_HW_IN, hpInZ],
      orientation: 'horizontal_x',
      valveStyle: 'actuator',
    });
  }

  // Manual Bypass Valve B31F_HPBPMV mounted squarely on horizontal HW Bypass Pipe (Supply -> Return) on Overhead Support Bridge!
  valves.push({
    id: 'vl_b3_hpbpmv',
    layer: 'chiller',
    b3Layer: 'outdoor',
    tag: 'B31F_HPBPMV',
    shortLabel: 'HPBPMV',
    pos: [X_BYP_BRIDGE, Y_BRIDGE_PIPE, (Z_HW_SUP + Z_HW_RET) / 2],
    orientation: 'horizontal_z',
    valveStyle: 'control',
  });

  // 100% SCADA-faithful HW sensors (Scr_B3_HotWaterSystem.Pdl) — EVERY stem welded directly onto its exact pipe (+0.55m above pipe centerline)!
  sensors.push(
    // HPSTS1: HW Supply Temp (downstream of bypass, entering Building 3)
    { id: 'sn_b3_hpsts1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HPSTS1', shortLabel: 'HPSTS1', pos: [-12.5, Y_BRIDGE_PIPE + 0.55, Z_HW_SUP], fluid: 'hw_sup' },
    // HPRTS2: HW Return Temp (upstream of bypass, exiting Building 3)
    { id: 'sn_b3_hprts2', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HPRTS2', shortLabel: 'HPRTS2', pos: [-12.5, Y_BRIDGE_PIPE + 0.55, Z_HW_RET], fluid: 'hw_ret' },
    // HPBPPS1: HW Bypass Supply Pressure (on HW Supply just downstream of HPBPMV tee)
    { id: 'sn_b3_hpbpps1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HPBPPS1', shortLabel: 'HPBPPS1', pos: [-14.0, Y_BRIDGE_PIPE + 0.55, Z_HW_SUP], fluid: 'hw_sup' },
    // HPBPTS3: HW Bypass Supply Collector Temp (on HW Supply upstream of HPBPMV tee, from Heat Fans)
    { id: 'sn_b3_hpbpts3', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HPBPTS3', shortLabel: 'HPBPTS3', pos: [-16.9, Y_BRIDGE_PIPE + 0.55, Z_HW_SUP], fluid: 'hw_sup' },
    // HPBPPS2: HW Bypass Return Pressure (on HW Return downstream of HPBPMV tee, heading to HPP Suction)
    { id: 'sn_b3_hpbpps2', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HPBPPS2', shortLabel: 'HPBPPS2', pos: [-16.9, Y_BRIDGE_PIPE + 0.55, Z_HW_RET], fluid: 'hw_ret' },
    // HWPS1: HPP Common Discharge Header Pressure (welded directly on rear HW discharge bus at Y_HW_IN = 0.48!)
    { id: 'sn_b3_hwps1', layer: 'chiller', b3Layer: 'outdoor', tag: 'B31F_HWPS1', shortLabel: 'HWPS1', pos: [X_REAR_DISCH, Y_HW_IN + 0.55, -6.8], fluid: 'hw_ret' }
  );

  // =========================================================================
  // 2. INDOOR 1F OVERHEAD RISERS TO 2F AHUs, FCU-1F-03, DI CISTERN & EXHAUST FANS!
  // =========================================================================
  const [fcu3x, , fcu3z] = posOf('b3_1f_fcu03', [12.5, 4.5, 8.2]);

  pipes.push(
    // CHW Supply & Return entering from Overhead Support Bridge -> Vertical Risers UP to 2F AHUs + branch to FCU-1F-03!
    {
      id: 'b3_in_chws_riser',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [-9.2, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [-9.2, B31F_ROOF_Y + 0.4, Z_CHW_SUP],
      ],
      radius: 0.095,
      particleCount: 5,
    },
    {
      id: 'b3_in_chwr_riser',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [-9.2, B31F_ROOF_Y + 0.4, Z_CHW_RET],
        [-9.2, Y_BRIDGE_PIPE, Z_CHW_RET],
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_CHW_RET],
      ],
      radius: 0.095,
      particleCount: 5,
    },
    // HW Supply & Return entering from Overhead Support Bridge -> Vertical Risers UP to 2F AHUs!
    {
      id: 'b3_in_hws_riser',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'hw_sup',
      flowSourceTags: hppTags,
      points: [
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_HW_SUP],
        [-9.2, Y_BRIDGE_PIPE, Z_HW_SUP],
        [-9.2, B31F_ROOF_Y + 0.4, Z_HW_SUP],
      ],
      radius: 0.09,
      particleCount: 5,
    },
    {
      id: 'b3_in_hwr_riser',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'hw_ret',
      flowSourceTags: hppTags,
      points: [
        [-9.2, B31F_ROOF_Y + 0.4, Z_HW_RET],
        [-9.2, Y_BRIDGE_PIPE, Z_HW_RET],
        [B31F_WALL_X, Y_BRIDGE_PIPE, Z_HW_RET],
      ],
      radius: 0.09,
      particleCount: 5,
    },
    // CHW Branch feeding 1F Warehouse / Restroom FCU-1F-03 (B31F_FCU03V)
    {
      id: 'b3_1f_fcu03_chws',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      requireAllTags: ['B31F_FCU03V'],
      points: [
        [-9.2, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [fcu3x - 0.5, Y_BRIDGE_PIPE, Z_CHW_SUP],
        [fcu3x - 0.5, Y_BRIDGE_PIPE, fcu3z],
      ],
      radius: 0.055,
      particleCount: 8,
    },
    {
      id: 'b3_1f_fcu03_chwr',
      layer: 'chiller',
      b3Layer: 'warehouse',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      requireAllTags: ['B31F_FCU03V'],
      points: [
        [fcu3x + 0.5, Y_BRIDGE_PIPE, fcu3z],
        [fcu3x + 0.5, Y_BRIDGE_PIPE, Z_CHW_RET],
        [-9.2, Y_BRIDGE_PIPE, Z_CHW_RET],
      ],
      radius: 0.055,
      particleCount: 8,
    },
    // B3 DI Cistern Supply & Return Loop (B31F_PCV10705 / PIT10705 / FIT10705) arriving from Building 5 RO-DI!
    {
      id: 'b3_di_loop_sup',
      layer: 'di',
      b3Layer: 'warehouse',
      fluid: 'di_sup',
      flowSourceTags: ['B31F_PCV10705'],
      points: [
        [cisX, 5.25, -B31F_HALF_Z],
        [cisX, 5.25, cisZ],
        [cisX, 2.35, cisZ],
      ],
      radius: 0.075,
      particleCount: 6,
    },
    {
      id: 'b3_di_loop_ret',
      layer: 'di',
      b3Layer: 'warehouse',
      fluid: 'di_ret',
      flowSourceTags: ['B31F_PCV10705'],
      points: [
        [cisX + 0.65, 2.35, cisZ],
        [cisX + 0.65, 4.95, cisZ],
        [cisX + 0.65, 4.95, -B31F_HALF_Z],
      ],
      radius: 0.075,
      particleCount: 6,
    }
  );

  valves.push(
    {
      id: 'vl_b3_1f_fcu03v',
      layer: 'chiller',
      b3Layer: 'warehouse',
      tag: 'B31F_FCU03V',
      shortLabel: 'FCU03V',
      pos: [fcu3x - 0.5, Y_BRIDGE_PIPE, fcu3z - 1.5],
      orientation: 'horizontal_z',
      valveStyle: 'xv',
    },
    {
      id: 'vl_b3_pcv10705',
      layer: 'di',
      b3Layer: 'warehouse',
      tag: 'B31F_PCV10705',
      shortLabel: 'PCV10705',
      pos: [cisX, 5.25, cisZ - 2.6],
      orientation: 'horizontal_z',
      valveStyle: 'control',
    }
  );

  sensors.push(
    { id: 'sn_b3_pit10705', layer: 'di', b3Layer: 'warehouse', tag: 'B31F_PIT10705', shortLabel: 'PIT10705', pos: [cisX, 5.8, cisZ - 1.2], fluid: 'di_sup' },
    { id: 'sn_b3_fit10705', layer: 'di', b3Layer: 'warehouse', tag: 'B31F_FIT10705', shortLabel: 'FIT10705', pos: [cisX, 3.6, cisZ], fluid: 'di_sup' }
  );

  // FCU-1F-03: short solid neck stops AT ceiling face (Y = 4.2m); ONLY cool-air droplets descend into Warehouse/Restroom!
  ducts.push(
    {
      id: 'b3_1f_fcu03_neck',
      b3Layer: 'warehouse',
      kind: 'supply',
      flowSourceTags: ['B31F_FCU03'],
      points: [
        [fcu3x, 4.52, fcu3z],
        [fcu3x, B31F_CEILING_Y, fcu3z],
      ],
      width: 0.62,
      height: 0.62,
      particleCount: 1,
    },
    {
      id: 'b3_1f_fcu03_blow',
      b3Layer: 'warehouse',
      kind: 'supply',
      flowSourceTags: ['B31F_FCU03'],
      points: [
        [fcu3x, B31F_CEILING_Y - 0.05, fcu3z],
        [fcu3x, 1.7, fcu3z],
      ],
      width: 0.62,
      height: 0.62,
      particlesOnly: true,
      particleCount: 6,
    }
  );

  // 1F Overhead Exhaust Fans (EAF-01..05 & Toilet TEF-01):
  //   EVERY ceiling exhaust fan has a vertical suction pickup reaching ceiling edge (Y=4.2m) pulling room air UP -> THROUGH fan -> OUT!
  const b31fExhFans: {
    id: string;
    tag: string;
    fb: [number, number, number];
    pickupX: number;
    outX: number;
    b3Layer: B31FLayerId;
  }[] = [
    { id: 'b3_1f_eaf01', tag: 'B31F_EAF01', fb: [-4.5, 5.75, -8.0], pickupX: -2.2, outX: -11.2, b3Layer: 'warehouse' },
    { id: 'b3_1f_eaf02', tag: 'B31F_EAF02', fb: [2.0, 5.75, -8.0], pickupX: -0.3, outX: 19.0, b3Layer: 'warehouse' },
    { id: 'b3_1f_eaf03', tag: 'B31F_EAF03', fb: [7.5, 5.75, -8.0], pickupX: 5.2, outX: 19.0, b3Layer: 'warehouse' },
    { id: 'b3_1f_eaf04', tag: 'B31F_EAF04', fb: [14.5, 5.75, 2.2], pickupX: 12.2, outX: 19.0, b3Layer: 'warehouse' },
    { id: 'b3_1f_eaf05', tag: 'B31F_EAF05', fb: [-7.0, 5.75, 8.8], pickupX: -4.8, outX: -11.2, b3Layer: 'warehouse' },
    { id: 'b3_1f_tef01', tag: 'B31F_TEF01', fb: [16.0, 5.7, 9.6], pickupX: 14.0, outX: 19.0, b3Layer: 'warehouse' },
  ];

  for (const ef of b31fExhFans) {
    const [ex, ey, ez] = posOf(ef.id, ef.fb);
    ducts.push({
      id: `b31f_exh_duct_${ef.id}`,
      b3Layer: ef.b3Layer,
      kind: 'exhaust',
      flowSourceTags: [ef.tag],
      points: [
        [ef.pickupX, B31F_CEILING_Y, ez],
        [ef.pickupX, ey, ez],
        [ex, ey, ez],
        [ef.outX, ey, ez],
      ],
      width: 0.54,
      height: 0.46,
      particleCount: 6,
    });
  }

  // Room-Mounted Column Environmental Sensors inside 1F Process / Warehouse Zones
  const roomSensors: { tag: string; lbl: string; pos: [number, number, number] }[] = [
    { tag: 'B3M1F_AHU01_RAT', lbl: 'CLEANSE T', pos: [-5.5, 1.85, -3.5] },
    { tag: 'B3M1F_AHU01_RAH', lbl: 'CLEANSE RH', pos: [-5.5, 1.25, -3.5] },
    { tag: 'B3M1F_AHU02_RAT', lbl: 'CHEM T', pos: [4.5, 1.85, -3.5] },
    { tag: 'B3M1F_AHU02_RAH', lbl: 'CHEM RH', pos: [4.5, 1.25, -3.5] },
    { tag: 'B31F_FCU03RT1', lbl: 'WH/REST T', pos: [12.5, 1.8, 9.6] },
  ];
  for (const rs of roomSensors) {
    sensors.push({
      id: `sn_b31f_${rs.tag}`,
      layer: 'ac',
      b3Layer: 'warehouse',
      tag: rs.tag,
      shortLabel: rs.lbl,
      pos: rs.pos,
      fluid: 'air',
      kind: 'room_sensor',
    });
  }

  return { pipes, ducts, valves, sensors };
}
