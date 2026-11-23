import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B5M2fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const M2F_CEILING_Y = 6.8;
export const M2F_WALL_LEFT_X = -19.0;
export const M2F_WALL_RIGHT_X = 19.0;
export const M2F_WALL_REAR_Z = -10.5;
export const M2F_WALL_FRONT_Z = 9.5;

/**
 * Generates the complete 3D MEP assembly for Building 5 — 2nd Mezzanine Floor (M2F · zone 'b5_air'):
 *   - 1× PAU-2F-01 (FAR LEFT beside Left Exterior Wall -19.0) + 4× Daikin Cleanroom AHUs (AHU-2F-01..04) lined up in ONE straight row!
 *   - All 5 units oriented with rotY = +Math.PI/2:
 *       * Supply Air (-Z) faces INTO the Rear Wall -> drops cleanly down to 2F Cleanrooms!
 *       * Fresh Air Damper (+Z) faces INTO the room!
 *       * Coil Access & Daikin Fan Porthole (+X) open to service aisles!
 *   - PAU draws outdoor air from LEFT Exterior Wall (-19.0) -> Treated Fresh Air header feeds into ALL 4 AHU dampers (+Z)!
 *   - CHW Supply (#00cfe8) & Return (#008f91) + Heat Recovery HW Supply (#eb9ee3) & Return (#e03c86) ceiling headers
 *     dropping cleanly down to PAU (3-way CHCV) & ALL 4 AHUs (3-way CWCV & HWCV)!
 *   - Return Air ducts rise into top Mixing Section of all 4 AHUs & branch right to ceiling-mounted EAF-02 -> outdoors!
 *   - Ceiling-mounted FAF-01 exhaust duct styled in matching EXH color ('exhaust')!
 *   - 3× Floor-mounted Teal-Green Centrifugal Exhaust Fans (FA-11201A / 03A / 04A) with side circular inlet + pleated
 *     flexible canvas duct connector ("bạt mềm ống gió") + top vertical square discharge climbing to ceiling & outdoors!
 */
export function buildB5M2fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B5M2fDetailAssembly {
  const posOf = (id: string): { x: number; y: number; z: number; w: number; h: number; d: number } => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0, z: 0, w: 4.8, h: 2.45, d: 2.35 };
    const t = resolveNodeTransform(node, overrides);
    return { x: t.x, y: t.y, z: t.z, w: node.size[0], h: node.size[1], d: node.size[2] };
  };

  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const pau01 = posOf('b5_pau01');
  const ahu01 = posOf('b5_ahu01');
  const ahu02 = posOf('b5_ahu02');
  const ahu03 = posOf('b5_ahu03');
  const ahu04 = posOf('b5_ahu04');
  const fa1 = posOf('b5_fa11201');
  const fa3 = posOf('b5_fa11203');
  const fa4 = posOf('b5_fa11204');
  const eaf02 = posOf('b5_eaf02');
  const faf01 = posOf('b5_faf01');

  const ahus = [
    { id: '01', tag: 'B5M2F_AHU01', unit: ahu01 },
    { id: '02', tag: 'B5M2F_AHU02', unit: ahu02 },
    { id: '03', tag: 'B5M2F_AHU03', unit: ahu03 },
    { id: '04', tag: 'B5M2F_AHU04', unit: ahu04 },
  ] as const;

  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
  const hwpTags = ['B51F_CH11HWP'];
  const anyAhuTags = ahus.map((a) => a.tag);

  // NOTE on rotY = +Math.PI / 2 for PAU & all 4 AHUs:
  //   Local (lx, ly, lz) -> World (x + lz, ly, z - lx)
  //   - Local +X (Supply Air Mouth)       -> World Z = unit.z - unit.w/2 (faces -Z INTO Rear Wall!)
  //   - Local -X (Fresh Air Damper Mouth) -> World Z = unit.z + unit.w/2 (faces +Z INTO Room!)
  //   - Top Return Air Collar (lx=-0.36w) -> World Z = unit.z + unit.w*0.36
  //   - Local +Z (Front Coil Access Face) -> World X = unit.x + unit.d/2 (faces +X open to aisle!)

  // =========================================================================
  // 1. PAU-B5-2F-01 (FAR LEFT) FRESH AIR FROM LEFT WALL -> TREATED HEADER -> 4× AHU DAMPERS (+Z)
  // =========================================================================
  const Y_DAMPER = 1.32;
  const Y_PAU_OVER = 3.55;
  const Z_OA_HDR = -1.25; // Treated Fresh Air header running neatly in front of all 4 AHU dampers (high above walkway edge!)
  const pauDamperZ = pau01.z + pau01.w / 2; // -2.90 (front Damper mouth facing into room)
  const pauSupplyZ = pau01.z - pau01.w / 2; // -7.10 (rear treated Supply mouth)

  // Outdoor fresh air intake duct piercing LEFT Exterior Wall (-19.0) directly into PAU-2F-01 damper!
  ducts.push({
    id: 'm2f_pau_outdoor_in',
    kind: 'fresh',
    flowSourceTags: ['B5M2F_PAU01'],
    points: [
      [M2F_WALL_LEFT_X, Y_DAMPER, pauDamperZ + 1.15],
      [pau01.x, Y_DAMPER, pauDamperZ + 1.15],
      [pau01.x, Y_DAMPER, pauDamperZ],
    ],
    width: 1.05,
    height: 1.0,
    particleCount: 4,
  });

  // Treated Fresh Air exits PAU (-Z) -> rises over PAU -> runs forward to Z_OA_HDR (-1.25) -> feeds ALL 4 AHU dampers (+Z)!
  // Extends by +0.475m past ahu04.x so the final vertical drop forms an exact flush 90° square corner!
  ducts.push({
    id: 'm2f_pau_to_fresh_hdr',
    kind: 'fresh',
    flowSourceTags: ['B5M2F_PAU01'],
    points: [
      [pau01.x, Y_DAMPER, pauSupplyZ],
      [pau01.x, Y_DAMPER, pauSupplyZ - 1.15],
      [pau01.x, Y_PAU_OVER, pauSupplyZ - 1.15],
      [pau01.x, Y_PAU_OVER, Z_OA_HDR],
      [ahu04.x + 0.475, Y_PAU_OVER, Z_OA_HDR],
    ],
    width: 0.95,
    height: 0.85,
    particleCount: 10,
  });
  sensors.push({
    id: 'sn_m2f_pau_sat',
    layer: 'ac',
    tag: 'B5M2F_PAU01_SAT',
    shortLabel: 'PAU01 SAT',
    pos: [pau01.x, Y_PAU_OVER + 0.425 + 0.55, pau01.z],
    fluid: 'air',
  });

  // 4 Vertical Fresh Air Drops starting flush against underside of header (Y_PAU_OVER - 0.425) -> Damper Mouth (+Z)!
  for (const a of ahus) {
    const ahuDamperZ = a.unit.z + a.unit.w / 2; // -2.50 (facing +Z into room!)
    ducts.push({
      id: `m2f_oa_to_ahu${a.id}`,
      kind: 'fresh',
      flowSourceTags: ['B5M2F_PAU01'],
      points: [
        [a.unit.x, Y_PAU_OVER - 0.425, Z_OA_HDR],
        [a.unit.x, Y_DAMPER, Z_OA_HDR],
        [a.unit.x, Y_DAMPER, ahuDamperZ],
      ],
      width: 0.95,
      height: 0.85,
      particleCount: 3,
    });
  }

  // =========================================================================
  // 2. LARGE BOXY SUPPLY AIR (-Z INTO REAR WALL -> DOWN TO 2F) & RETURN AIR
  //    + RETURN AIR RELIEF BRANCH -> CEILING EAF-02 -> OUTDOORS!
  // =========================================================================
  const Y_RA_CEIL = 5.15;
  const Z_SA_WALL_DROP = -9.5; // Right against Rear Wall (-10.5), dropping cleanly into 2F Cleanrooms below!
  const Z_RA_HEADER = -3.2; // Directly aligned over top Mixing Section (z + w*0.36 = -3.2) of all 4 AHUs!

  for (const a of ahus) {
    const saMouthZ = a.unit.z - a.unit.w / 2; // -7.50 (pointing -Z into Rear Wall!)
    ducts.push({
      id: `m2f_sa_ahu${a.id}`,
      kind: 'supply',
      flowSourceTags: [a.tag],
      points: [
        [a.unit.x, Y_DAMPER, saMouthZ],
        [a.unit.x, Y_DAMPER, Z_SA_WALL_DROP],
        [a.unit.x, 0.05, Z_SA_WALL_DROP],
      ],
      width: 1.15,
      height: 1.0,
      particleCount: 4,
    });
    sensors.push({
      id: `sn_m2f_ahu${a.id}_sat`,
      layer: 'ac',
      tag: `${a.tag}_SAT`,
      shortLabel: `AHU${a.id} SAT`,
      pos: [a.unit.x, Y_DAMPER + 0.5 + 0.55, (saMouthZ + Z_SA_WALL_DROP) / 2],
      fluid: 'air',
    });

    // Return Air big boxy duct dropping flush from underside of ceiling RA trunk into top Mixing Section of AHU!
    const raDropZ = a.unit.z + a.unit.w * 0.36; // -3.20
    ducts.push({
      id: `m2f_ra_ahu${a.id}`,
      kind: 'return',
      flowSourceTags: [a.tag],
      points: [
        [a.unit.x, Y_RA_CEIL - 0.44, Z_RA_HEADER],
        [a.unit.x, a.unit.h, raDropZ],
      ],
      width: 1.0,
      height: 0.88,
      taperEnd: true,
      particleCount: 4,
    });
    sensors.push({
      id: `sn_m2f_ahu${a.id}_rat`,
      layer: 'ac',
      tag: `${a.tag}_RAT`,
      shortLabel: `AHU${a.id} RAT`,
      pos: [a.unit.x, Y_RA_CEIL + 0.44 + 0.55, Z_RA_HEADER],
      fluid: 'air',
    });
  }

  // Common Overhead Return Air Collector Trunk + Branch Off to Ceiling Exhaust Fan EAF-02 (flush left endcap at ahu01.x - 0.50!)
  ducts.push({
    id: 'm2f_ra_common_to_eaf02',
    kind: 'return',
    flowSourceTags: anyAhuTags,
    points: [
      [ahu01.x - 0.5, Y_RA_CEIL, Z_RA_HEADER],
      [eaf02.x - 0.65, Y_RA_CEIL, Z_RA_HEADER],
    ],
    width: 1.0,
    height: 0.88,
    particleCount: 8,
  });
  ducts.push({
    id: 'm2f_eaf02_out',
    kind: 'exhaust',
    flowSourceTags: ['B51F_EAF02'],
    points: [
      [eaf02.x + 0.65, Y_RA_CEIL, Z_RA_HEADER],
      [13.1, Y_RA_CEIL, Z_RA_HEADER],
      [13.1, Y_RA_CEIL, M2F_WALL_REAR_Z],
    ],
    width: 0.9,
    height: 0.85,
    particleCount: 5,
  });

  // Ceiling-Mounted Inline Black Axial Exhaust Fan FAF-01 on Front Ceiling Exhaust Duct (EXH color!)
  const Y_FAF_CEIL = 5.45;
  ducts.push({
    id: 'm2f_faf01_in',
    kind: 'exhaust',
    flowSourceTags: ['B51F_FAF01'],
    points: [
      [4.5, Y_FAF_CEIL, faf01.z],
      [faf01.x + 0.65, Y_FAF_CEIL, faf01.z],
    ],
    width: 0.85,
    height: 0.8,
    particleCount: 4,
  });
  ducts.push({
    id: 'm2f_faf01_out',
    kind: 'exhaust',
    flowSourceTags: ['B51F_FAF01'],
    points: [
      [faf01.x - 0.65, Y_FAF_CEIL, faf01.z],
      [M2F_WALL_LEFT_X, Y_FAF_CEIL, faf01.z],
    ],
    width: 0.85,
    height: 0.8,
    particleCount: 4,
  });

  // =========================================================================
  // 3. CHILLED WATER (CHW #00cfe8/#008f91) & HEAT RECOVERY (HW #eb9ee3/#e03c86)
  //    Overhead Ceiling Headers distributing evenly down to PAU-01 & ALL 4 AHUs via 3-way VPMA valves!
  // =========================================================================
  const Y_CHW_SUP = 5.8;
  const Y_CHW_RET = 6.08;
  const Y_HW_SUP = 6.34;
  const Y_HW_RET = 6.6;
  const Z_CHW_SUP_HDR = -6.2;
  const Z_CHW_RET_HDR = -6.65;
  const Z_HW_SUP_HDR = -7.1;
  const Z_HW_RET_HDR = -7.55;
  const Y_COIL_IN = 0.88;
  const Y_COIL_OUT = 1.62;
  const Y_3WAY = 2.55;

  const lastAhuDropX = ahu04.x + ahu04.d / 2 + 0.65;

  // Main Ceiling Water Headers entering from Left Riser Wall (-19.0) & distributing across PAU & all 4 AHUs
  pipes.push(
    {
      id: 'm2f_chw_sup_hdr',
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [M2F_WALL_LEFT_X, Y_CHW_SUP, Z_CHW_SUP_HDR],
        [lastAhuDropX, Y_CHW_SUP, Z_CHW_SUP_HDR],
      ],
      radius: 0.11,
      particleCount: 10,
    },
    {
      id: 'm2f_chw_ret_hdr',
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [lastAhuDropX, Y_CHW_RET, Z_CHW_RET_HDR],
        [M2F_WALL_LEFT_X, Y_CHW_RET, Z_CHW_RET_HDR],
      ],
      radius: 0.11,
      particleCount: 10,
    },
    {
      id: 'm2f_hw_sup_hdr',
      layer: 'chiller',
      fluid: 'hw_sup',
      flowSourceTags: hwpTags,
      points: [
        [M2F_WALL_LEFT_X, Y_HW_SUP, Z_HW_SUP_HDR],
        [lastAhuDropX, Y_HW_SUP, Z_HW_SUP_HDR],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    {
      id: 'm2f_hw_ret_hdr',
      layer: 'chiller',
      fluid: 'hw_ret',
      flowSourceTags: hwpTags,
      points: [
        [lastAhuDropX, Y_HW_RET, Z_HW_RET_HDR],
        [M2F_WALL_LEFT_X, Y_HW_RET, Z_HW_RET_HDR],
      ],
      radius: 0.095,
      particleCount: 9,
    }
  );

  // Per-Unit Vertical Ceiling Drops into Coil Access Face (+X) of PAU-01 & ALL 4 AHUs!
  const waterUnits = [
    { code: 'pau01', unit: pau01, cwTag: 'B5M2F_PAU01_CHCV', hwTag: '', shortCw: 'PAU CHCV', shortHw: '' },
    ...ahus.map((a) => ({ code: `ahu${a.id}`, unit: a.unit, cwTag: `${a.tag}_CWCV`, hwTag: `${a.tag}_HWCV`, shortCw: `CWCV${a.id}`, shortHw: `HWCV${a.id}` })),
  ];

  for (const wu of waterUnits) {
    const faceX = wu.unit.x + wu.unit.d / 2;
    const dropX = faceX + 0.65;
    // With rotY = +Math.PI/2, local coil lx offsets (-0.55, -0.10, +0.45, +0.90) map to World Z = unit.z - lx!
    const zChwSup = wu.unit.z + 0.55;
    const zChwRet = wu.unit.z + 0.1;
    const zHwSup = wu.unit.z - 0.45;
    const zHwRet = wu.unit.z - 0.9;

    pipes.push({
      id: `m2f_chw_sup_${wu.code}`,
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [dropX, Y_CHW_SUP, Z_CHW_SUP_HDR],
        [dropX, Y_CHW_SUP, zChwSup],
        [dropX, Y_COIL_IN, zChwSup],
        [faceX, Y_COIL_IN, zChwSup],
      ],
      radius: 0.075,
      particleCount: 5,
    });
    pipes.push({
      id: `m2f_chw_ret_${wu.code}`,
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      requireAllTags: [wu.cwTag],
      points: [
        [faceX, Y_COIL_OUT, zChwRet],
        [dropX, Y_COIL_OUT, zChwRet],
        [dropX, Y_CHW_RET, zChwRet],
        [dropX, Y_CHW_RET, Z_CHW_RET_HDR],
      ],
      radius: 0.075,
      particleCount: 5,
    });
    pipes.push({
      id: `m2f_chw_byp_${wu.code}`,
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [dropX, Y_3WAY, zChwSup],
        [dropX, Y_3WAY, zChwRet],
      ],
      radius: 0.055,
      particleCount: 2,
    });
    valves.push({
      id: `vl_m2f_${wu.code}_cw`,
      layer: 'chiller',
      tag: wu.cwTag,
      shortLabel: wu.shortCw,
      pos: [dropX, Y_3WAY, zChwRet],
      orientation: 'vertical',
      valveStyle: 'control',
    });

    if (wu.hwTag) {
      pipes.push({
        id: `m2f_hw_sup_${wu.code}`,
        layer: 'chiller',
        fluid: 'hw_sup',
        flowSourceTags: hwpTags,
        points: [
          [dropX, Y_HW_SUP, Z_HW_SUP_HDR],
          [dropX, Y_HW_SUP, zHwSup],
          [dropX, Y_COIL_IN, zHwSup],
          [faceX, Y_COIL_IN, zHwSup],
        ],
        radius: 0.07,
        particleCount: 5,
      });
      pipes.push({
        id: `m2f_hw_ret_${wu.code}`,
        layer: 'chiller',
        fluid: 'hw_ret',
        flowSourceTags: hwpTags,
        requireAllTags: [wu.hwTag],
        points: [
          [faceX, Y_COIL_OUT, zHwRet],
          [dropX, Y_COIL_OUT, zHwRet],
          [dropX, Y_HW_RET, zHwRet],
          [dropX, Y_HW_RET, Z_HW_RET_HDR],
        ],
        radius: 0.07,
        particleCount: 5,
      });
      pipes.push({
        id: `m2f_hw_byp_${wu.code}`,
        layer: 'chiller',
        fluid: 'hw_sup',
        flowSourceTags: hwpTags,
        points: [
          [dropX, Y_3WAY, zHwSup],
          [dropX, Y_3WAY, zHwRet],
        ],
        radius: 0.05,
        particleCount: 2,
      });
      valves.push({
        id: `vl_m2f_${wu.code}_hw`,
        layer: 'chiller',
        tag: wu.hwTag,
        shortLabel: wu.shortHw,
        pos: [dropX, Y_3WAY, zHwRet],
        orientation: 'vertical',
        valveStyle: 'control',
      });
    }
  }

  // =========================================================================
  // 4. PROCESS EXHAUST BAY (FLOOR-MOUNTED CENTRIFUGAL FANS FA-11201A / 03A / 04A)
  // =========================================================================
  const Y_FA_IN = 1.05;
  const Y_FA_OUT_TOP = 2.35;
  const Y_EXH_CEIL = 5.85;

  const faSpecs = [
    { id: '11201', tag: 'B5M2F_FA11201A', unit: fa1, sensorTag: 'B51F_PIT11201', sensorLabel: 'PIT11201' },
    { id: '11203', tag: 'B5M2F_FA11203A', unit: fa3, sensorTag: 'B51F_PIT11202', sensorLabel: 'PIT11202' },
    { id: '11204', tag: 'B5M2F_FA11204A', unit: fa4, sensorTag: 'B51F_TIT11201', sensorLabel: 'TIT11201' },
  ] as const;

  faSpecs.forEach((f, idx) => {
    const fanInX = f.unit.x - 0.92;
    const fanOutX = f.unit.x - 0.28;
    const riserX = f.unit.x - 2.45;
    const ceilLaneX = 15.65 + idx * 1.15;

    ducts.push({
      id: `m2f_exh_in_${f.id}`,
      kind: 'exhaust',
      flowSourceTags: [f.tag],
      points: [
        [riserX, 0.05, f.unit.z],
        [riserX, Y_FA_IN, f.unit.z],
        [fanInX, Y_FA_IN, f.unit.z],
      ],
      width: 0.95,
      height: 0.95,
      particleCount: 4,
    });
    sensors.push({
      id: `sn_m2f_${f.sensorLabel.toLowerCase()}`,
      layer: 'ac',
      tag: f.sensorTag,
      shortLabel: f.sensorLabel,
      pos: [(riserX + fanInX) / 2, Y_FA_IN + 0.475 + 0.55, f.unit.z],
      fluid: 'exh',
    });

    ducts.push({
      id: `m2f_exh_out_${f.id}`,
      kind: 'exhaust',
      flowSourceTags: [f.tag],
      points: [
        [fanOutX, Y_FA_OUT_TOP, f.unit.z],
        [fanOutX, Y_EXH_CEIL, f.unit.z],
        [ceilLaneX, Y_EXH_CEIL, f.unit.z],
        [ceilLaneX, Y_EXH_CEIL, M2F_WALL_REAR_Z],
      ],
      width: 0.92,
      height: 0.88,
      particleCount: 7,
    });
  });

  return { pipes, ducts, valves, sensors };
}
