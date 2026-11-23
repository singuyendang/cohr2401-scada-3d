import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B2M3fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B2M3F_CEILING_Y = 6.8;
export const B2M3F_HALF_X = 30.0; // X = -30 .. +30 (60m wide split into Zone A Left & Zone B Right)
export const B2M3F_HALF_Z = 10.5; // Z = -10.5 .. +10.5 (21m deep)
export const B2M3F_CORRIDOR_HALF_X = 2.2;

/**
 * Generates the complete 3D MEP assembly for Building 2 — M3F Mezzanine AHU/PAU Deck (`b2_m3f`):
 *   - Exact Scr_B22F_AIR_AHU (Tab 3F–M3F) independent dual-zone topology:
 *       * ZONE A (Left Hall): PAU-B2-2F-01 (far left) -> dedicated Treated Fresh Air header feeding ONLY
 *         AHU-M3F-01, 02, 03, 06, 05 (5× AHUs)
 *       * ZONE B (Right Hall): PAU-B2-2F-02 (far right) -> dedicated Treated Fresh Air header feeding ONLY
 *         AHU-M3F-04, 08, 07, 10, 09, 11 (6× AHUs)
 *   - Same Building 5 M2F / Building 2 2F Daikin AHU/PAU orientation (rotY = +Math.PI/2):
 *       * Supply Air (-Z into rear wall -> drops cleanly down to 3F Cleanrooms)
 *       * Fresh Air Damper (+Z facing into room)
 *       * Return Air rising from ceiling into top mixing section
 *       * CHW (#00cfe8/#008f91) & HW (#eb9ee3/#e03c86) ceiling headers dropping into 3-way CHCV/CWCV/HWCV valves!
 */
export function buildB2M3fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B2M3fDetailAssembly {
  const posOf = (id: string): { x: number; y: number; z: number; w: number; h: number; d: number } => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0, z: 0, w: 3.4, h: 2.35, d: 1.9 };
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
    pauId: 'b2_m3f_pau01',
    pauTag: 'B22F_PAU01',
    outerWallX: -B2M3F_HALF_X,
    ahus: [
      { id: 'b2_m3f_ahu01', tag: 'B2M3F_AHU01', num: '01' },
      { id: 'b2_m3f_ahu02', tag: 'B2M3F_AHU02', num: '02' },
      { id: 'b2_m3f_ahu03', tag: 'B2M3F_AHU03', num: '03' },
      { id: 'b2_m3f_ahu06', tag: 'B2M3F_AHU06', num: '06' },
      { id: 'b2_m3f_ahu05', tag: 'B2M3F_AHU05', num: '05' },
    ],
  };

  const zoneB = {
    pauId: 'b2_m3f_pau02',
    pauTag: 'B22F_PAU02',
    outerWallX: B2M3F_HALF_X,
    ahus: [
      { id: 'b2_m3f_ahu04', tag: 'B2M3F_AHU04', num: '04' },
      { id: 'b2_m3f_ahu08', tag: 'B2M3F_AHU08', num: '08' },
      { id: 'b2_m3f_ahu07', tag: 'B2M3F_AHU07', num: '07' },
      { id: 'b2_m3f_ahu10', tag: 'B2M3F_AHU10', num: '10' },
      { id: 'b2_m3f_ahu09', tag: 'B2M3F_AHU09', num: '09' },
      { id: 'b2_m3f_ahu11', tag: 'B2M3F_AHU11', num: '11' },
    ],
  };

  const Y_DAMPER = 1.28;
  const Y_PAU_OVER = 3.45;
  const Z_OA_HDR = -0.8;
  const Z_SA_WALL = -9.6;
  const Z_RA_HDR = -3.0;
  const Y_RA_CEIL = 4.95;

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
      id: `b2m3f_pau_oa_${zKey}`,
      kind: 'fresh',
      flowSourceTags: [cfg.pauTag],
      points: [
        [cfg.outerWallX, Y_DAMPER, pauDamperZ + 0.95],
        [pau.x, Y_DAMPER, pauDamperZ + 0.95],
        [pau.x, Y_DAMPER, pauDamperZ],
      ],
      width: 0.9,
      height: 0.85,
      particleCount: 4,
    });

    // 2. Dedicated Treated Fresh Air Header -> ONLY this Zone's AHUs (flush square endcap over last AHU drop!)
    const hdrEndX = farAhuX + (zKey === 'A' ? 0.4 : -0.4);
    ducts.push({
      id: `b2m3f_pau_hdr_${zKey}`,
      kind: 'fresh',
      flowSourceTags: [cfg.pauTag],
      points: [
        [pau.x, Y_DAMPER, pauSupplyZ],
        [pau.x, Y_DAMPER, pauSupplyZ - 0.85],
        [pau.x, Y_PAU_OVER, pauSupplyZ - 0.85],
        [pau.x, Y_PAU_OVER, Z_OA_HDR],
        [hdrEndX, Y_PAU_OVER, Z_OA_HDR],
      ],
      width: 0.8,
      height: 0.72,
      particleCount: 11,
    });

    sensors.push({
      id: `sn_b2m3f_${cfg.pauTag}_sat`,
      layer: 'ac',
      tag: `${cfg.pauTag}_SAT`,
      shortLabel: `PAU2F-${zKey === 'A' ? '01' : '02'} SAT`,
      pos: [pau.x, Y_PAU_OVER + 0.85, pau.z],
      fluid: 'air',
    });

    // 3. Per-AHU Fresh Air Drop (flush against underside of header!), Rear Supply Air Drop to 3F, and Top Return Air!
    for (const a of ahuUnits) {
      const ahuDamperZ = a.unit.z + a.unit.w / 2;
      const ahuSaZ = a.unit.z - a.unit.w / 2;
      const ahuRaZ = a.unit.z + a.unit.w * 0.34;
      ducts.push(
        {
          id: `b2m3f_oa_${a.num}`,
          kind: 'fresh',
          flowSourceTags: [cfg.pauTag],
          points: [
            [a.unit.x, Y_PAU_OVER - 0.36, Z_OA_HDR],
            [a.unit.x, Y_DAMPER, Z_OA_HDR],
            [a.unit.x, Y_DAMPER, ahuDamperZ],
          ],
          width: 0.8,
          height: 0.72,
          particleCount: 3,
        },
        {
          id: `b2m3f_sa_${a.num}`,
          kind: 'supply',
          flowSourceTags: [a.tag],
          points: [
            [a.unit.x, Y_DAMPER, ahuSaZ],
            [a.unit.x, Y_DAMPER, Z_SA_WALL],
            [a.unit.x, 0.15, Z_SA_WALL],
          ],
          width: 0.88,
          height: 0.84,
          particleCount: 4,
        },
        {
          id: `b2m3f_ra_${a.num}`,
          kind: 'return',
          flowSourceTags: [a.tag],
          points: [
            [a.unit.x, Y_RA_CEIL, Z_RA_HDR],
            [a.unit.x, Y_RA_CEIL, ahuRaZ],
            [a.unit.x, a.unit.h, ahuRaZ],
          ],
          width: 0.78,
          height: 0.74,
          particleCount: 3,
        }
      );
    }

    // 4. Ceiling CHW (#00cfe8 / #008f91) & HW (#eb9ee3 / #e03c86) Headers + 3-Way Valves
    const minX = Math.min(pau.x, ...ahuUnits.map((a) => a.unit.x));
    const maxX = Math.max(pau.x, ...ahuUnits.map((a) => a.unit.x));
    const Y_CHW_S = 6.2;
    const Y_CHW_R = 5.92;
    const Y_HW_S = 5.6;
    const Y_HW_R = 5.32;
    const Z_PIPE = -5.2;

    pipes.push(
      { id: `b2m3f_chws_${zKey}`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, points: [[minX, Y_CHW_S, Z_PIPE], [maxX, Y_CHW_S, Z_PIPE]], radius: 0.085, particleCount: 10 },
      { id: `b2m3f_chwr_${zKey}`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, points: [[maxX, Y_CHW_R, Z_PIPE - 0.3], [minX, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.085, particleCount: 10 },
      { id: `b2m3f_hws_${zKey}`, layer: 'chiller', fluid: 'hw_sup', flowSourceTags: hwpTags, points: [[minX, Y_HW_S, Z_PIPE + 0.35], [maxX, Y_HW_S, Z_PIPE + 0.35]], radius: 0.072, particleCount: 9 },
      { id: `b2m3f_hwr_${zKey}`, layer: 'chiller', fluid: 'hw_ret', flowSourceTags: hwpTags, points: [[maxX, Y_HW_R, Z_PIPE + 0.65], [minX, Y_HW_R, Z_PIPE + 0.65]], radius: 0.072, particleCount: 9 }
    );

    const pauSideX = pau.x + pau.d / 2 + 0.1;
    pipes.push(
      { id: `b2m3f_pau_chws_${zKey}`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, requireAllTags: [`${cfg.pauTag}_CHCV`], points: [[pau.x, Y_CHW_S, Z_PIPE], [pauSideX, Y_CHW_S, Z_PIPE], [pauSideX, 1.45, Z_PIPE]], radius: 0.055, particleCount: 4 },
      { id: `b2m3f_pau_chwr_${zKey}`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, requireAllTags: [`${cfg.pauTag}_CHCV`], points: [[pauSideX, 0.9, Z_PIPE - 0.3], [pauSideX, Y_CHW_R, Z_PIPE - 0.3], [pau.x, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.055, particleCount: 4 }
    );
    valves.push({
      id: `vl_b2m3f_${cfg.pauTag}_chcv`,
      layer: 'chiller',
      tag: `${cfg.pauTag}_CHCV`,
      shortLabel: `PAU${zKey === 'A' ? '01' : '02'} CHCV`,
      pos: [pauSideX, 2.75, Z_PIPE],
      orientation: 'vertical',
      valveStyle: 'control',
    });

    for (const a of ahuUnits) {
      const sideX = a.unit.x + a.unit.d / 2 + 0.08;
      pipes.push(
        { id: `b2m3f_ahu${a.num}_chws`, layer: 'chiller', fluid: 'chw', flowSourceTags: chwpTags, requireAllTags: [`${a.tag}_CWCV`], points: [[a.unit.x, Y_CHW_S, Z_PIPE], [sideX, Y_CHW_S, Z_PIPE], [sideX, 1.45, Z_PIPE]], radius: 0.048, particleCount: 4 },
        { id: `b2m3f_ahu${a.num}_chwr`, layer: 'chiller', fluid: 'chwr', flowSourceTags: chwpTags, requireAllTags: [`${a.tag}_CWCV`], points: [[sideX, 0.9, Z_PIPE - 0.3], [sideX, Y_CHW_R, Z_PIPE - 0.3], [a.unit.x, Y_CHW_R, Z_PIPE - 0.3]], radius: 0.048, particleCount: 4 },
        { id: `b2m3f_ahu${a.num}_hws`, layer: 'chiller', fluid: 'hw_sup', flowSourceTags: hwpTags, requireAllTags: [`${a.tag}_HWCV`], points: [[a.unit.x, Y_HW_S, Z_PIPE + 0.35], [sideX, Y_HW_S, Z_PIPE + 0.35], [sideX, 1.45, Z_PIPE + 0.35]], radius: 0.045, particleCount: 3 },
        { id: `b2m3f_ahu${a.num}_hwr`, layer: 'chiller', fluid: 'hw_ret', flowSourceTags: hwpTags, requireAllTags: [`${a.tag}_HWCV`], points: [[sideX, 0.9, Z_PIPE + 0.65], [sideX, Y_HW_R, Z_PIPE + 0.65], [a.unit.x, Y_HW_R, Z_PIPE + 0.65]], radius: 0.045, particleCount: 3 }
      );
      valves.push(
        { id: `vl_b2m3f_ahu${a.num}_cw`, layer: 'chiller', tag: `${a.tag}_CWCV`, shortLabel: `M${a.num} CWCV`, pos: [sideX, 2.85, Z_PIPE], orientation: 'vertical', valveStyle: 'control' },
        { id: `vl_b2m3f_ahu${a.num}_hw`, layer: 'chiller', tag: `${a.tag}_HWCV`, shortLabel: `M${a.num} HWCV`, pos: [sideX, 2.35, Z_PIPE + 0.35], orientation: 'vertical', valveStyle: 'control' }
      );
    }
  }

  return { pipes, ducts, valves, sensors };
}
