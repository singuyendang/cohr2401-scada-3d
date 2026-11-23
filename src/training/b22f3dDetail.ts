import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B22fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B22F_CEILING_Y = 6.8;
export const B22F_HALF_X = 28.0; // X = -28 .. +28 (56m wide split into Zone A Left & Zone B Right)
export const B22F_HALF_Z = 12.0; // Z = -12 .. +12 (24m deep)
export const B22F_CORRIDOR_HALF_X = 2.2; // Central stairwell & corridor separating Zone A & Zone B!

/**
 * Generates the complete 3D MEP assembly for Building 2 — 2nd Floor Mechanical & EXH Deck (`b2_2f`):
 *   - Split cleanly into LEFT HALL (Zone A) and RIGHT HALL (Zone B) separated by the central staircase corridor!
 *   - ZONE A (Left):
 *       * PAU-B2-1F-01 (far left against -28m wall) -> independent Treated Fresh Air header feeding ONLY Zone A AHUs:
 *         AHU-B2-2F-06, 01, 04, 03, 05 (exact user & Scr_B21F_AIR_AHU sequence!)
 *       * EXH 1 (4× floor-mounted centrifugal fans FA-11001A, 11002A, 11002C, 11003A + PIT11003..06) with pleated canvas boots
 *       * Ceiling inline ventilation ducts: ERV-01/02, PAUCT-01/02, EAF-01, TEF-01
 *   - ZONE B (Right):
 *       * PAU-B2-1F-02 (far right against +28m wall) -> independent Treated Fresh Air header feeding ONLY Zone B AHUs:
 *         AHU-B2-2F-02, 07, 08, 10, 09 (exact user & Scr_B21F_AIR_AHU sequence!)
 *       * EXH 2 (3× floor-mounted centrifugal fans FA-11004A, 11004B, 11005A + TIT11001 & PIT11001) with pleated canvas boots
 *       * Ceiling inline ventilation ducts: ERV-03/04, PAUCT-03/04, PAUO-01, EAF-02, TEF-02/03
 *       * Overhead Building 2 DI Water Loop 4 (PCV10704, PIT10704, FIT10704)
 *   - Same Daikin AHU/PAU orientation as Building 5 M2F (rotY = +Math.PI/2):
 *       * Supply Air (-Z into rear wall -> drops down to 1F Cleanrooms), Fresh Air Damper (+Z into room),
 *         Return Air from ceiling into top mixing section, CHW & HW ceiling headers dropping into 3-way valves!
 */
export function buildB22fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B22fDetailAssembly {
  const posOf = (id: string): { x: number; y: number; z: number; w: number; h: number; d: number } => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0, z: 0, w: 3.6, h: 2.35, d: 2.0 };
    const t = resolveNodeTransform(node, overrides);
    return { x: t.x, y: t.y, z: t.z, w: node.size[0], h: node.size[1], d: node.size[2] };
  };

  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
  const hwpTags = ['B51F_CH11HWP'];

  const zoneA = {
    pauId: 'b2_2f_pau01',
    pauTag: 'B21F_PAU01',
    outerWallX: -B22F_HALF_X,
    ahus: [
      { id: 'b2_2f_ahu06', tag: 'B22F_AHU06', num: '06' },
      { id: 'b2_2f_ahu01', tag: 'B22F_AHU01', num: '01' },
      { id: 'b2_2f_ahu04', tag: 'B22F_AHU04', num: '04' },
      { id: 'b2_2f_ahu03', tag: 'B22F_AHU03', num: '03' },
      { id: 'b2_2f_ahu05', tag: 'B22F_AHU05', num: '05' },
    ],
  };

  const zoneB = {
    pauId: 'b2_2f_pau02',
    pauTag: 'B21F_PAU02',
    outerWallX: B22F_HALF_X,
    ahus: [
      { id: 'b2_2f_ahu02', tag: 'B22F_AHU02', num: '02' },
      { id: 'b2_2f_ahu07', tag: 'B22F_AHU07', num: '07' },
      { id: 'b2_2f_ahu08', tag: 'B22F_AHU08', num: '08' },
      { id: 'b2_2f_ahu10', tag: 'B22F_AHU10', num: '10' },
      { id: 'b2_2f_ahu09', tag: 'B22F_AHU09', num: '09' },
    ],
  };

  const Y_DAMPER = 1.28;
  const Y_PAU_OVER = 3.45;
  const Z_OA_HDR = -1.6;
  const Z_SA_WALL = -11.0;
  const Z_RA_HDR = -3.8;
  const Y_RA_CEIL = 4.95;

  // Build Independent Zone A & Zone B PAU -> AHU Ductwork + CHW/HW Piping!
  for (const [zKey, cfg] of [
    ['A', zoneA],
    ['B', zoneB],
  ] as const) {
    const pau = posOf(cfg.pauId);
    const ahuUnits = cfg.ahus.map((a) => ({ ...a, unit: posOf(a.id) }));
    const pauDamperZ = pau.z + pau.w / 2;
    const pauSupplyZ = pau.z - pau.w / 2;
    const farAhuX = zKey === 'A' ? ahuUnits[ahuUnits.length - 1].unit.x : ahuUnits[0].unit.x;

    // 1. Outdoor Fresh Air intake from outer wall -> PAU damper
    ducts.push({
      id: `b22f_pau_oa_${zKey}`,
      kind: 'fresh',
      flowSourceTags: [cfg.pauTag],
      points: [
        [cfg.outerWallX, Y_DAMPER, pauDamperZ + 1.0],
        [pau.x, Y_DAMPER, pauDamperZ + 1.0],
        [pau.x, Y_DAMPER, pauDamperZ],
      ],
      width: 0.92,
      height: 0.88,
      particleCount: 4,
    });

    // 2. Dedicated Treated Fresh Air Header (PAU -> ONLY this Zone's 5 AHUs — flush square endcap over last AHU drop!)
    const hdrEndX = farAhuX + (zKey === 'A' ? 0.41 : -0.41);
    ducts.push({
      id: `b22f_pau_hdr_${zKey}`,
      kind: 'fresh',
      flowSourceTags: [cfg.pauTag],
      points: [
        [pau.x, Y_DAMPER, pauSupplyZ],
        [pau.x, Y_DAMPER, pauSupplyZ - 0.9],
        [pau.x, Y_PAU_OVER, pauSupplyZ - 0.9],
        [pau.x, Y_PAU_OVER, Z_OA_HDR],
        [hdrEndX, Y_PAU_OVER, Z_OA_HDR],
      ],
      width: 0.82,
      height: 0.74,
      particleCount: 10,
    });

    sensors.push({
      id: `sn_b22f_${cfg.pauTag}_sat`,
      layer: 'ac',
      tag: `${cfg.pauTag}_SAT`,
      shortLabel: `PAU1F-${zKey === 'A' ? '01' : '02'} SAT`,
      pos: [pau.x, Y_PAU_OVER + 0.85, pau.z],
      fluid: 'air',
    });

    // 3. Per-AHU Fresh Air drop (flush against underside of header!), Rear Supply Air drop to 1F, and Top Return Air duct!
    for (const a of ahuUnits) {
      const ahuDamperZ = a.unit.z + a.unit.w / 2;
      const ahuSaZ = a.unit.z - a.unit.w / 2;
      const ahuRaZ = a.unit.z + a.unit.w * 0.34;
      ducts.push(
        {
          id: `b22f_oa_${a.num}`,
          kind: 'fresh',
          flowSourceTags: [cfg.pauTag],
          points: [
            [a.unit.x, Y_PAU_OVER - 0.37, Z_OA_HDR],
            [a.unit.x, Y_DAMPER, Z_OA_HDR],
            [a.unit.x, Y_DAMPER, ahuDamperZ],
          ],
          width: 0.82,
          height: 0.74,
          particleCount: 3,
        },
        {
          id: `b22f_sa_${a.num}`,
          kind: 'supply',
          flowSourceTags: [a.tag],
          points: [
            [a.unit.x, Y_DAMPER, ahuSaZ],
            [a.unit.x, Y_DAMPER, Z_SA_WALL],
            [a.unit.x, 0.15, Z_SA_WALL],
          ],
          width: 0.92,
          height: 0.88,
          particleCount: 4,
        },
        {
          id: `b22f_ra_${a.num}`,
          kind: 'return',
          flowSourceTags: [a.tag],
          points: [
            [a.unit.x, Y_RA_CEIL, Z_RA_HDR],
            [a.unit.x, Y_RA_CEIL, ahuRaZ],
            [a.unit.x, a.unit.h, ahuRaZ],
          ],
          width: 0.82,
          height: 0.78,
          particleCount: 3,
        }
      );
    }

    // 4. Ceiling CHW (#00cfe8 / #008f91) & HW (#eb9ee3 / #e03c86) Headers + Drops to PAU & 5 AHUs
    const minX = Math.min(pau.x, ...ahuUnits.map((a) => a.unit.x));
    const maxX = Math.max(pau.x, ...ahuUnits.map((a) => a.unit.x));
    const Y_CHW_S = 6.2;
    const Y_CHW_R = 5.92;
    const Y_HW_S = 5.6;
    const Y_HW_R = 5.32;
    const Z_PIPE = -6.0;

    pipes.push(
      { id: `b22f_chws_${zKey}`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, points: [[minX, Y_CHW_S, Z_PIPE], [maxX, Y_CHW_S, Z_PIPE]], radius: 0.085, particleCount: 9 },
      { id: `b22f_chwr_${zKey}`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, points: [[maxX, Y_CHW_R, Z_PIPE - 0.3], [minX, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.085, particleCount: 9 },
      { id: `b22f_hws_${zKey}`, layer: 'chiller', fluid: 'hw_sup', flowSourceTags: hwpTags, points: [[minX, Y_HW_S, Z_PIPE + 0.35], [maxX, Y_HW_S, Z_PIPE + 0.35]], radius: 0.072, particleCount: 8 },
      { id: `b22f_hwr_${zKey}`, layer: 'chiller', fluid: 'hw_ret', flowSourceTags: hwpTags, points: [[maxX, Y_HW_R, Z_PIPE + 0.65], [minX, Y_HW_R, Z_PIPE + 0.65]], radius: 0.072, particleCount: 8 }
    );

    // PAU CHW drop + CHCV
    const pauSideX = pau.x + pau.d / 2 + 0.12;
    pipes.push(
      { id: `b22f_pau_chws_${zKey}`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, requireAllTags: [`${cfg.pauTag}_CHCV`], points: [[pau.x, Y_CHW_S, Z_PIPE], [pauSideX, Y_CHW_S, Z_PIPE], [pauSideX, 1.45, Z_PIPE]], radius: 0.055, particleCount: 4 },
      { id: `b22f_pau_chwr_${zKey}`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, requireAllTags: [`${cfg.pauTag}_CHCV`], points: [[pauSideX, 0.9, Z_PIPE - 0.3], [pauSideX, Y_CHW_R, Z_PIPE - 0.3], [pau.x, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.055, particleCount: 4 }
    );
    valves.push({
      id: `vl_b22f_${cfg.pauTag}_chcv`,
      layer: 'chiller',
      tag: `${cfg.pauTag}_CHCV`,
      shortLabel: `PAU${zKey === 'A' ? '01' : '02'} CHCV`,
      pos: [pauSideX, 2.75, Z_PIPE],
      orientation: 'vertical',
      valveStyle: 'control',
    });

    // AHU CHW & HW drops + 3-way CWCV/HWCV valves
    for (const a of ahuUnits) {
      const sideX = a.unit.x + a.unit.d / 2 + 0.1;
      pipes.push(
        { id: `b22f_ahu${a.num}_chws`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, requireAllTags: [`${a.tag}_CWCV`], points: [[a.unit.x, Y_CHW_S, Z_PIPE], [sideX, Y_CHW_S, Z_PIPE], [sideX, 1.45, Z_PIPE]], radius: 0.05, particleCount: 4 },
        { id: `b22f_ahu${a.num}_chwr`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, requireAllTags: [`${a.tag}_CWCV`], points: [[sideX, 0.9, Z_PIPE - 0.3], [sideX, Y_CHW_R, Z_PIPE - 0.3], [a.unit.x, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.05, particleCount: 4 },
        { id: `b22f_ahu${a.num}_hws`, layer: 'chiller', fluid: 'hw_sup', flowSourceTags: hwpTags, requireAllTags: [`${a.tag}_HWCV`], points: [[a.unit.x, Y_HW_S, Z_PIPE + 0.35], [sideX, Y_HW_S, Z_PIPE + 0.35], [sideX, 1.45, Z_PIPE + 0.35]], radius: 0.045, particleCount: 3 },
        { id: `b22f_ahu${a.num}_hwr`, layer: 'chiller', fluid: 'hw_ret', flowSourceTags: hwpTags, requireAllTags: [`${a.tag}_HWCV`], points: [[sideX, 0.9, Z_PIPE + 0.65], [sideX, Y_HW_R, Z_PIPE + 0.65], [a.unit.x, Y_HW_R, Z_PIPE + 0.65]], radius: 0.045, particleCount: 3 }
      );
      valves.push(
        { id: `vl_b22f_ahu${a.num}_cw`, layer: 'chiller', tag: `${a.tag}_CWCV`, shortLabel: `A${a.num} CWCV`, pos: [sideX, 2.85, Z_PIPE], orientation: 'vertical', valveStyle: 'control' },
        { id: `vl_b22f_ahu${a.num}_hw`, layer: 'chiller', tag: `${a.tag}_HWCV`, shortLabel: `A${a.num} HWCV`, pos: [sideX, 2.35, Z_PIPE + 0.35], orientation: 'vertical', valveStyle: 'control' }
      );
    }
  }

  // =========================================================================
  // 5. PROCESS EXHAUST FANS ON FLOOR: EXH 1 (ZONE A) & EXH 2 (ZONE B)
  //    Side Circular Inlet + Pleated Canvas Boot -> Top Vertical Square Exhaust Stack -> Ceiling -> Outdoors!
  // =========================================================================
  const exhFans: { id: string; tag: string; sensorTag?: string; sensorLbl?: string; outX: number }[] = [
    // ZONE A — EXH 1 (4× VFD Fans + PIT11003..06)
    { id: 'b2_2f_fa11001a', tag: 'B22F_FA11001A', sensorTag: 'B21F_PIT11003', sensorLbl: 'PIT11003', outX: -B22F_HALF_X },
    { id: 'b2_2f_fa11002a', tag: 'B22F_FA11002A', sensorTag: 'B21F_PIT11004', sensorLbl: 'PIT11004', outX: -B22F_HALF_X },
    { id: 'b2_2f_fa11002c', tag: 'B22F_FA11002C', sensorTag: 'B21F_PIT11005', sensorLbl: 'PIT11005', outX: -B22F_HALF_X },
    { id: 'b2_2f_fa11003a', tag: 'B22F_FA11003A', sensorTag: 'B21F_PIT11006', sensorLbl: 'PIT11006', outX: -B22F_HALF_X },
    // ZONE B — EXH 2 (3× VFD Fans + TIT11001 & PIT11001)
    { id: 'b2_2f_fa11004a', tag: 'B22F_FA11004A', sensorTag: 'B21F_TIT11001', sensorLbl: 'TIT11001', outX: B22F_HALF_X },
    { id: 'b2_2f_fa11004b', tag: 'B22F_FA11004B', sensorTag: 'B22F_PIT11001', sensorLbl: 'PIT11001', outX: B22F_HALF_X },
    { id: 'b2_2f_fa11005a', tag: 'B22F_FA11005A', outX: B22F_HALF_X },
  ];

  exhFans.forEach((ef, idx) => {
    const f = posOf(ef.id);
    const suctionZ = f.z - 2.3;
    const dischargeY = 5.45 + (idx % 2) * 0.45;
    // Side suction duct rising from floor/process tools into centrifugal fan side inlet
    ducts.push({
      id: `b22f_exh_in_${ef.id}`,
      kind: 'exhaust',
      flowSourceTags: [ef.tag],
      points: [
        [f.x, 0.2, suctionZ],
        [f.x, 1.25, suctionZ],
        [f.x, 1.25, f.z - 0.72],
      ],
      width: 0.78,
      height: 0.74,
      particleCount: 4,
    });
    // Vertical top discharge climbing straight up to ceiling & running along ceiling to exterior wall!
    ducts.push({
      id: `b22f_exh_out_${ef.id}`,
      kind: 'exhaust',
      flowSourceTags: [ef.tag],
      points: [
        [f.x, 2.38, f.z],
        [f.x, dischargeY, f.z],
        [ef.outX, dischargeY, f.z],
      ],
      width: 0.86,
      height: 0.82,
      particleCount: 7,
    });
    if (ef.sensorTag && ef.sensorLbl) {
      sensors.push({
        id: `sn_b22f_${ef.sensorTag}`,
        layer: 'ac',
        tag: ef.sensorTag,
        shortLabel: ef.sensorLbl,
        pos: [f.x, 1.25 + 0.72, suctionZ + 0.65],
        fluid: 'exh',
      });
    }
  });

  // =========================================================================
  // 6. OVERHEAD CEILING EXHAUST & VENTILATION DUCTS (10× 2F EAF/ERV/PAUO/TEF — PAUCT-01..04 are ceiling-hung in 1F!)
  //    Every Exhaust fan has a vertical suction pickup rising UP from floor/shaft -> THROUGH fan -> OUT exterior wall!
  // =========================================================================
  const ceilingAuxIds = [
    // Zone A ceiling ducts (discharge out Left Exterior Wall -28.0)
    'b2_2f_erv01', 'b2_2f_erv02', 'b2_2f_eaf01', 'b2_2f_tef01',
    // Zone B ceiling ducts (discharge out Right Exterior Wall +28.0; PAUO-01 brings fresh air IN from +28.0!)
    'b2_2f_erv03', 'b2_2f_erv04', 'b2_2f_pauo01', 'b2_2f_eaf02', 'b2_2f_tef02', 'b2_2f_tef03',
  ];
  ceilingAuxIds.forEach((id, idx) => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return;
    const t = resolveNodeTransform(node, overrides);
    const isFreshAux = id.includes('pau');
    const isZoneA = t.x < 0;
    const outX = isZoneA ? -B22F_HALF_X : B22F_HALF_X;
    const pickupX = t.x + (isZoneA ? 1.8 : -1.8);
    const ductY = t.y;
    const ductZ = t.z + ((idx % 3) - 1) * 0.65;

    if (isFreshAux) {
      // PAUO-01: Fresh outdoor air pulled IN from right wall (+28.0) -> THROUGH fan -> DOWN to lower rooms!
      ducts.push({
        id: `b22f_aux_duct_${id}`,
        kind: 'fresh',
        flowSourceTags: [node.tag],
        points: [
          [outX, ductY, t.z],
          [t.x, ductY, t.z],
          [pickupX, ductY, t.z],
          [pickupX, 0.25, t.z],
        ],
        width: 0.48,
        height: 0.42,
        particleCount: 5,
      });
    } else {
      // Exhaust / ERV / TEF: Vertical suction pickup rising UP from 1F ceiling/shaft -> THROUGH fan -> OUT exterior wall!
      ducts.push({
        id: `b22f_aux_duct_${id}`,
        kind: 'exhaust',
        flowSourceTags: [node.tag],
        points: [
          [pickupX, 0.25, ductZ],
          [pickupX, ductY, ductZ],
          [pickupX, ductY, t.z],
          [t.x, ductY, t.z],
          [outX, ductY, t.z],
        ],
        width: 0.48,
        height: 0.42,
        particleCount: 6,
      });
    }
  });

  // =========================================================================
  // 7. OVERHEAD BUILDING 2 DI WATER LOOP 4 (PCV10704, PIT10704, FIT10704)
  // =========================================================================
  const Y_DI_S = 4.35;
  const Y_DI_R = 4.05;
  const Z_DI = 9.8;
  pipes.push(
    {
      id: 'b22f_di_loop4_sup',
      layer: 'di',
      fluid: 'di_sup',
      flowSourceTags: ['B22F_PCV10704'],
      points: [
        [4.0, Y_DI_S, Z_DI],
        [25.5, Y_DI_S, Z_DI],
        [25.5, Y_DI_R, Z_DI],
      ],
      radius: 0.085,
      particleCount: 8,
    },
    {
      id: 'b22f_di_loop4_ret',
      layer: 'di',
      fluid: 'di_ret',
      flowSourceTags: ['B22F_PCV10704'],
      points: [
        [25.5, Y_DI_R, Z_DI],
        [4.0, Y_DI_R, Z_DI],
      ],
      radius: 0.085,
      particleCount: 8,
    }
  );
  valves.push({
    id: 'vl_b22f_pcv10704',
    layer: 'di',
    tag: 'B22F_PCV10704',
    shortLabel: 'PCV10704',
    pos: [9.5, Y_DI_S, Z_DI],
    orientation: 'horizontal_x',
    valveStyle: 'control',
  });
  sensors.push(
    { id: 'sn_b22f_pit10704', layer: 'di', tag: 'B22F_PIT10704', shortLabel: 'PIT10704', pos: [15.0, Y_DI_S + 0.55, Z_DI], fluid: 'di_sup' },
    { id: 'sn_b22f_fit10704', layer: 'di', tag: 'B22F_FIT10704', shortLabel: 'FIT10704', pos: [20.5, Y_DI_S + 0.55, Z_DI], fluid: 'di_sup' }
  );

  return { pipes, ducts, valves, sensors };
}
