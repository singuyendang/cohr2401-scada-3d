import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B32fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B32F_CEILING_Y = 6.8;
export const B32F_OFFICE_CEIL_Y = 3.85;
export const B32F_HALF_X = 22.0; // X = -22 .. +22 (44m wide)
export const B32F_HALF_Z = 11.0; // Z = -11 .. +11 (22m deep)

/**
 * Generates the complete 3D MEP assembly for Building 3 — 2nd Floor / M1F (`b3_2f`):
 *   - LEFT MECHANICAL BAY (X = -22 .. +1):
 *       * 2× Daikin AHUs (AHU-B3-M1F-01 & AHU-B3-M1F-02, rotY = +Math.PI/2):
 *           - Supply Air (-Z) straight into rear wall dropping down to 1F Cleanse / Chemical / Material rooms
 *           - Fresh Air Intake Damper (+Z) drawing fresh air from exterior louver header
 *           - Return Air rising into top Mixing Section
 *           - Overhead CHW (#00cfe8/#008f91) & HW (#eb9ee3/#e03c86) ceiling headers dropping into 3-way CWCV & HWCV valves!
 *       * 3× Floor-Mounted Teal Centrifugal Process Exhaust Fans (FA-11101A Acid, FA-11102A Solvent, FA-11103A Chemical):
 *           - Side circular inlet + pleated canvas boot ("bạt mềm") + PIT11101 / PIT11102 sensors
 *           - Top vertical square discharge climbing to ceiling and discharging cleanly out Left Exterior Wall (-22)!
 *   - TOP-RIGHT OFFICE & LAB ZONE (X = +4 .. +21, Z = -10.5 .. +0.5):
 *       * 7× Overhead Ceiling FCUs (B3M1F_FCU01..07) with CHW drops, XV valves (FCU01V..07V), room temp sensors (FCU01RT1..07RT1),
 *         short ceiling necks stopping AT ceiling face (Y = 3.85m), and particlesOnly downward cool-air droplets!
 *   - BOTTOM-RIGHT MSB ELECTRICAL SWITCHROOM (X = +5.5 .. +21.5, Z = +1.2 .. +10.5):
 *       * Built in b3Architecture3d.ts using 2 parallel facing rows of tall 2.42m AHU-height switchgear cabinets (MDB-3.1/3.2/3.3)!
 */
export function buildB32fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B32fDetailAssembly {
  const posOf = (id: string, fallback: [number, number, number]): { x: number; y: number; z: number; w: number; h: number; d: number } => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return { x: fallback[0], y: fallback[1], z: fallback[2], w: 4.4, h: 2.45, d: 2.3 };
    const t = resolveNodeTransform(node, overrides);
    return { x: t.x, y: t.y, z: t.z, w: node.size[0], h: node.size[1], d: node.size[2] };
  };

  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const chwpTags = ['B31F_CH21CHWP', 'B31F_CH22CHWP'];
  const hppTags = ['B31F_HPP21', 'B31F_HPP22'];

  const ahu01 = posOf('b3_ahu01', [-14.8, 0, -4.6]);
  const ahu02 = posOf('b3_ahu02', [-8.2, 0, -4.6]);
  const ahus = [
    { num: '01', tag: 'B3M1F_AHU01', unit: ahu01 },
    { num: '02', tag: 'B3M1F_AHU02', unit: ahu02 },
  ] as const;

  const Y_DAMPER = 1.28;
  const Z_SA_WALL = -10.2;
  const Z_OA_HDR = -0.8;
  const Z_RA_HDR = -3.6;
  const Y_RA_CEIL = 4.95;

  // Fresh Air Intake Header from Left Exterior Wall (-22.0) feeding AHU-01 & AHU-02 Dampers (+Z face, flush endcap!)
  ducts.push({
    id: 'b32f_oa_main',
    kind: 'fresh',
    flowSourceTags: ['B3M1F_AHU01', 'B3M1F_AHU02'],
    points: [
      [-B32F_HALF_X, 3.35, Z_OA_HDR],
      [ahu02.x + 0.43, 3.35, Z_OA_HDR],
    ],
    width: 0.86,
    height: 0.78,
    particleCount: 7,
  });

  // Ceiling CHW & HW Headers arriving from 1F risers at Left Wall (-22) -> feeding AHU-01, AHU-02 & Office FCUs!
  const Y_CHW_S = 6.15;
  const Y_CHW_R = 5.85;
  const Y_HW_S = 5.5;
  const Y_HW_R = 5.2;
  const Z_PIPE = -5.6;

  pipes.push(
    {
      id: 'b32f_chws_hdr',
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [-20.4, 0.2, Z_PIPE],
        [-20.4, Y_CHW_S, Z_PIPE],
        [19.5, Y_CHW_S, Z_PIPE],
      ],
      radius: 0.09,
      particleCount: 12,
    },
    {
      id: 'b32f_chwr_hdr',
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [19.5, Y_CHW_R, Z_PIPE - 0.35],
        [-19.8, Y_CHW_R, Z_PIPE - 0.35],
        [-19.8, 0.2, Z_PIPE - 0.35],
      ],
      radius: 0.09,
      particleCount: 12,
    },
    {
      id: 'b32f_hws_hdr',
      layer: 'chiller',
      fluid: 'hw_sup',
      flowSourceTags: hppTags,
      points: [
        [-20.4, 0.2, Z_PIPE + 0.45],
        [-20.4, Y_HW_S, Z_PIPE + 0.45],
        [ahu02.x + 1.8, Y_HW_S, Z_PIPE + 0.45],
      ],
      radius: 0.08,
      particleCount: 8,
    },
    {
      id: 'b32f_hwr_hdr',
      layer: 'chiller',
      fluid: 'hw_ret',
      flowSourceTags: hppTags,
      points: [
        [ahu02.x + 1.8, Y_HW_R, Z_PIPE + 0.8],
        [-19.8, Y_HW_R, Z_PIPE + 0.8],
        [-19.8, 0.2, Z_PIPE + 0.8],
      ],
      radius: 0.08,
      particleCount: 8,
    }
  );

  // Per-AHU Ducts (OA, SA into rear wall, Top RA), CHW/HW drops + 3-way CWCV/HWCV valves + Live Sensors
  for (const a of ahus) {
    const ahuDamperZ = a.unit.z + a.unit.w / 2;
    const ahuSaZ = a.unit.z - a.unit.w / 2;
    const ahuRaZ = a.unit.z + a.unit.w * 0.34;
    const faceX = a.unit.x + a.unit.d / 2;
    const dropX = faceX + 0.48;

    ducts.push(
      {
        id: `b32f_oa_${a.num}`,
        kind: 'fresh',
        flowSourceTags: [a.tag],
        points: [
          [a.unit.x, 3.35 - 0.39, Z_OA_HDR],
          [a.unit.x, Y_DAMPER, Z_OA_HDR],
          [a.unit.x, Y_DAMPER, ahuDamperZ],
        ],
        width: 0.86,
        height: 0.78,
        particleCount: 3,
      },
      {
        id: `b32f_sa_${a.num}`,
        kind: 'supply',
        flowSourceTags: [a.tag],
        points: [
          [a.unit.x, Y_DAMPER, ahuSaZ],
          [a.unit.x, Y_DAMPER, Z_SA_WALL],
          [a.unit.x, 0.15, Z_SA_WALL],
        ],
        width: 0.96,
        height: 0.9,
        particleCount: 5,
      },
      {
        id: `b32f_ra_${a.num}`,
        kind: 'return',
        flowSourceTags: [a.tag],
        points: [
          [a.unit.x, Y_RA_CEIL, Z_RA_HDR],
          [a.unit.x, Y_RA_CEIL, ahuRaZ],
          [a.unit.x, a.unit.h, ahuRaZ],
        ],
        width: 0.86,
        height: 0.8,
        taperEnd: true,
        particleCount: 4,
      }
    );

    pipes.push(
      {
        id: `b32f_ahu${a.num}_chws`,
        layer: 'chiller',
        fluid: 'chw',
        flowSourceTags: chwpTags,
        requireAllTags: [`${a.tag}_CWCV`],
        points: [
          [dropX, Y_CHW_S, Z_PIPE],
          [dropX, Y_CHW_S, a.unit.z + 0.55],
          [dropX, 0.88, a.unit.z + 0.55],
          [faceX, 0.88, a.unit.z + 0.55],
        ],
        radius: 0.06,
        particleCount: 4,
      },
      {
        id: `b32f_ahu${a.num}_chwr`,
        layer: 'chiller',
        fluid: 'chwr',
        flowSourceTags: chwpTags,
        requireAllTags: [`${a.tag}_CWCV`],
        points: [
          [faceX, 1.62, a.unit.z + 0.1],
          [dropX, 1.62, a.unit.z + 0.1],
          [dropX, Y_CHW_R, a.unit.z + 0.1],
          [dropX, Y_CHW_R, Z_PIPE - 0.35],
        ],
        radius: 0.06,
        particleCount: 4,
      },
      {
        id: `b32f_ahu${a.num}_hws`,
        layer: 'chiller',
        fluid: 'hw_sup',
        flowSourceTags: hppTags,
        requireAllTags: [`${a.tag}_HWCV`],
        points: [
          [dropX, Y_HW_S, Z_PIPE + 0.45],
          [dropX, Y_HW_S, a.unit.z - 0.45],
          [dropX, 0.88, a.unit.z - 0.45],
          [faceX, 0.88, a.unit.z - 0.45],
        ],
        radius: 0.055,
        particleCount: 4,
      },
      {
        id: `b32f_ahu${a.num}_hwr`,
        layer: 'chiller',
        fluid: 'hw_ret',
        flowSourceTags: hppTags,
        requireAllTags: [`${a.tag}_HWCV`],
        points: [
          [faceX, 1.62, a.unit.z - 0.9],
          [dropX, 1.62, a.unit.z - 0.9],
          [dropX, Y_HW_R, a.unit.z - 0.9],
          [dropX, Y_HW_R, Z_PIPE + 0.8],
        ],
        radius: 0.055,
        particleCount: 4,
      }
    );

    valves.push(
      { id: `vl_b32f_a${a.num}_cw`, layer: 'chiller', tag: `${a.tag}_CWCV`, shortLabel: `A${a.num} CWCV`, pos: [dropX, 2.7, a.unit.z + 0.1], orientation: 'vertical', valveStyle: 'control' },
      { id: `vl_b32f_a${a.num}_hw`, layer: 'chiller', tag: `${a.tag}_HWCV`, shortLabel: `A${a.num} HWCV`, pos: [dropX, 2.7, a.unit.z - 0.9], orientation: 'vertical', valveStyle: 'control' }
    );

    sensors.push(
      { id: `sn_b32f_a${a.num}_sat`, layer: 'ac', tag: `${a.tag}_SAT`, shortLabel: `A${a.num} SAT`, pos: [a.unit.x, 2.3, Z_SA_WALL + 0.9], fluid: 'air' },
      { id: `sn_b32f_a${a.num}_dp`, layer: 'ac', tag: `${a.tag}_DP`, shortLabel: `A${a.num} DP`, pos: [a.unit.x, Y_RA_CEIL + 0.72, Z_RA_HDR], fluid: 'air' }
    );
  }

  // =========================================================================
  // 2. PROCESS EXHAUST FANS ON FLOOR (FA-11101A Acid, FA-11102A Solvent, FA-11103A Chemical)
  //    Side circular inlet + pleated canvas boot -> Top vertical square stack -> Ceiling -> Left Wall (-22)!
  // =========================================================================
  const exhFans: { id: string; tag: string; sensorTag?: string; sensorLbl?: string }[] = [
    { id: 'b3_fa11101', tag: 'B3M1F_FA11101A', sensorTag: 'B3M1F_PIT11101', sensorLbl: 'PIT11101' },
    { id: 'b3_fa11102', tag: 'B3M1F_FA11102A', sensorTag: 'B3M1F_PIT11102', sensorLbl: 'PIT11102' },
    { id: 'b3_fa11103', tag: 'B3M1F_FA11103A' },
  ];

  exhFans.forEach((ef, idx) => {
    const f = posOf(ef.id, [-16.5 + idx * 6.0, 0, 5.4]);
    const suctionZ = f.z - 2.3;
    const dischargeY = 5.45 + idx * 0.42;

    ducts.push(
      {
        id: `b32f_exh_in_${ef.id}`,
        kind: 'exhaust',
        flowSourceTags: [ef.tag],
        points: [
          [f.x, 0.15, suctionZ],
          [f.x, 1.1, suctionZ],
          [f.x, 1.1, f.z - 0.72],
        ],
        width: 0.82,
        height: 0.78,
        particleCount: 4,
      },
      {
        id: `b32f_exh_out_${ef.id}`,
        kind: 'exhaust',
        flowSourceTags: [ef.tag],
        points: [
          [f.x, 2.38, f.z],
          [f.x, dischargeY, f.z],
          [-B32F_HALF_X, dischargeY, f.z],
        ],
        width: 0.88,
        height: 0.82,
        particleCount: 7,
      }
    );

    if (ef.sensorTag && ef.sensorLbl) {
      sensors.push({
        id: `sn_b32f_${ef.sensorTag}`,
        layer: 'ac',
        tag: ef.sensorTag,
        shortLabel: ef.sensorLbl,
        pos: [f.x, 1.85, suctionZ + 0.65],
        fluid: 'exh',
      });
    }
  });

  // =========================================================================
  // 3. TOP-RIGHT M1F OFFICE & LAB CEILING FCUs (B3M1F_FCU01..07 + XV VALVES + RT1)
  //    Solid neck stops AT ceiling face (Y = 3.85m); ONLY cool-air droplets cascade down!
  // =========================================================================
  const m1fFcus = [
    { id: 'b3_m1f_fcu01', num: '01', fb: [6.0, 4.15, -7.8] as [number, number, number] },
    { id: 'b3_m1f_fcu02', num: '02', fb: [10.4, 4.15, -7.8] as [number, number, number] },
    { id: 'b3_m1f_fcu03', num: '03', fb: [14.8, 4.15, -7.8] as [number, number, number] },
    { id: 'b3_m1f_fcu04', num: '04', fb: [19.0, 4.15, -7.8] as [number, number, number] },
    { id: 'b3_m1f_fcu05', num: '05', fb: [7.5, 4.15, -2.5] as [number, number, number] },
    { id: 'b3_m1f_fcu06', num: '06', fb: [13.2, 4.15, -2.5] as [number, number, number] },
    { id: 'b3_m1f_fcu07', num: '07', fb: [18.5, 4.15, -2.5] as [number, number, number] },
  ];

  for (const fcu of m1fFcus) {
    const f = posOf(fcu.id, fcu.fb);
    const tag = `B3M1F_FCU${fcu.num}`;
    const vTag = `${tag}V`;
    const rtTag = `${tag}RT1`;

    pipes.push(
      {
        id: `b32f_${fcu.id}_chws`,
        layer: 'chiller',
        fluid: 'chw',
        flowSourceTags: chwpTags,
        requireAllTags: [vTag],
        points: [
          [f.x - 0.5, Y_CHW_S, Z_PIPE],
          [f.x - 0.5, Y_CHW_S, f.z],
          [f.x - 0.5, 4.45, f.z],
        ],
        radius: 0.042,
        particleCount: 3,
      },
      {
        id: `b32f_${fcu.id}_chwr`,
        layer: 'chiller',
        fluid: 'chwr',
        flowSourceTags: chwpTags,
        requireAllTags: [vTag],
        points: [
          [f.x + 0.5, 4.45, f.z],
          [f.x + 0.5, Y_CHW_R, f.z],
          [f.x + 0.5, Y_CHW_R, Z_PIPE - 0.35],
        ],
        radius: 0.042,
        particleCount: 3,
      }
    );

    valves.push({
      id: `vl_b32f_${fcu.id}`,
      layer: 'chiller',
      tag: vTag,
      shortLabel: `FCU${fcu.num}V`,
      pos: [f.x - 0.5, 5.15, f.z],
      orientation: 'vertical',
      valveStyle: 'xv',
    });

    // Short solid collar stops AT ceiling face (3.85m) + particlesOnly downward cool-air stream!
    ducts.push(
      {
        id: `b32f_neck_${fcu.id}`,
        kind: 'supply',
        flowSourceTags: [tag],
        points: [
          [f.x, 4.18, f.z],
          [f.x, B32F_OFFICE_CEIL_Y, f.z],
        ],
        width: 0.56,
        height: 0.56,
        particleCount: 1,
      },
      {
        id: `b32f_blow_${fcu.id}`,
        kind: 'supply',
        flowSourceTags: [tag],
        points: [
          [f.x, B32F_OFFICE_CEIL_Y - 0.04, f.z],
          [f.x, 1.65, f.z],
        ],
        width: 0.56,
        height: 0.56,
        particlesOnly: true,
        particleCount: 5,
      }
    );

    sensors.push({
      id: `sn_b32f_${rtTag}`,
      layer: 'ac',
      tag: rtTag,
      shortLabel: `FCU${fcu.num} T`,
      pos: [f.x, 1.75, f.z + 1.2],
      fluid: 'air',
      kind: 'room_sensor',
    });
  }

  return { pipes, ducts, valves, sensors };
}
