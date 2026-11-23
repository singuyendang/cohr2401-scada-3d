import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type NodeTransformOverride,
} from './plant3dLayout.ts';
import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export type B21FLayerId = 'pcw' | 'cleanroom';

export interface B21fDetailAssembly {
  pipes: (DetailedPipe3D & { b2Layer: B21FLayerId })[];
  ducts: (DetailedDuct3D & { b2Layer: B21FLayerId })[];
  valves: (InlineValve3D & { b2Layer: B21FLayerId })[];
  sensors: (InlineSensor3D & { b2Layer: B21FLayerId })[];
}

export const B21F_CEILING_Y = 3.85; // Cleanroom suspended ceiling panel height
export const B21F_PLENUM_TOP_Y = 6.1; // Structural roof slab above 1F overhead utility plenum
export const B21F_HALF_X = 18.0; // X = -18 .. +18 (36m wide)
export const B21F_CLEAN_Z_MIN = -12.0; // Cleanroom rear edge (facing Outdoor PCW & B5 CT driveway)
export const B21F_CLEAN_Z_MAX = 12.0; // Cleanroom front edge
export const B21F_PCW_Z_MIN = -22.0; // Outdoor PCW Yard facing Building 5 Cooling Towers across the aisle!
export const B21F_PCW_Z_MAX = -12.8;

export const B21F_CAMERA_PRESETS: Record<
  B21FLayerId | 'all',
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  all: { pos: [-22, 24, 30], target: [0, 2.6, -4.0], label: 'All 1F' },
  pcw: { pos: [-16, 12, -31], target: [0, 2.2, -17.2], label: 'Outdoor PCW' },
  cleanroom: { pos: [-14, 15, 25], target: [0, 2.2, 0.5], label: '1F Cleanroom' },
};

/**
 * Generates the complete 3D MEP assembly for Building 2 — 1st Floor (`b2_plant`):
 *   1. OUTDOOR PCW STATION (Z = -22.0 .. -12.8, outside rear wall facing Building 5 Cooling Towers!):
 *      - Follows the EXACT Building 5 PCW arrangement & piping topology, rotated along wall Z = -12.5:
 *        * LEFT: 2× Blue PHEs E-601A/B PERPENDICULAR to wall Z=-12.5 (rotY=+PI/2 -> ALL 4 ports on ONE single +X face!)
 *        * CHW Supply (#00cfe8) & Return (#008f91) arrive from Building 5 (-Z) -> E-601A/B CHW ports + Johnson Controls TCV-10601/02
 *        * OUTERMOST EDGE (farthest from wall, Z=-20.2): 4× VFD Main Pumps P-601A/B/C/D -> Filters FLT-601A/B -> PHE PCW Warm In
 *        * PHE PCW Cold Out -> TT10601/02 -> Merge -> FIT10601 -> Split Tee (UP into 1F/3F & DOWN to parallel XV-10603/04 Cyan/Teal)
 *        * FAR RIGHT: A-601 Air Separator, TK-602 Expansion Tank, PIT10601, RO Makeup XV-10602,
 *                     Drain XV-10601 -> Top of TK-601 Rejected Tank (LT10601) -> Bottom to P-602 -> WW Reject!
 *   2. 1F OPTICS CLEANROOM & OVERHEAD PLENUM (Z = -12 .. +12, Y = 0 .. 6.1m):
 *      - 1F PCW branches from Scr_B2_PCW.Pdl with SLENDER vertical drops (radius 0.036m) piercing ceiling straight INTO 1F tools!
 *      - Overhead FFU-1F-01..03 & FCU-1F-01..04: solid discharge stops AT ceiling face (Y=3.85m), ONLY cool-air droplets cascade down!
 *      - 4× Ceiling-Hung PAUCT-01..04 suspended directly beneath 3.85m ceiling by 2 threaded rods ("2 thanh ti treo") with CHW drops & cool-air jets!
 *      - Overhead EAF-1F-01..03 & Toilet TEF-1F-01..02: vertical suction pickup down to ceiling face (Y=3.85m) pulling room air UP -> THROUGH fan -> OUT!
 *      - Room-mounted column sensors inside the 1F cleanroom/office zones!
 */
export function buildB21fDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B21fDetailAssembly {
  const posOf = (id: string, fallback: [number, number, number]): [number, number, number] => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return fallback;
    const t = resolveNodeTransform(node, overrides);
    return [t.x, t.y, t.z];
  };

  const pipes: (DetailedPipe3D & { b2Layer: B21FLayerId })[] = [];
  const ducts: (DetailedDuct3D & { b2Layer: B21FLayerId })[] = [];
  const valves: (InlineValve3D & { b2Layer: B21FLayerId })[] = [];
  const sensors: (InlineSensor3D & { b2Layer: B21FLayerId })[] = [];

  const pcwPumps = ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'];
  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];

  const [e1x, , e1z] = posOf('b2_e601a', [-12.5, 0, -14.2]);
  const [e2x, , e2z] = posOf('b2_e601b', [-12.5, 0, -17.2]);
  const [f1x, , f1z] = posOf('b2_flt601a', [-8.6, 0, -14.2]);
  const [f2x, , f2z] = posOf('b2_flt601b', [-8.6, 0, -17.2]);
  const [p1x, , p1z] = posOf('b2_p601a', [-6.0, 0, -20.2]);
  const [p2x, , p2z] = posOf('b2_p601b', [-3.5, 0, -20.2]);
  const [p3x, , p3z] = posOf('b2_p601c', [-1.0, 0, -20.2]);
  const [p4x, , p4z] = posOf('b2_p601d', [1.5, 0, -20.2]);
  const [a6x, , a6z] = posOf('b2_a601', [5.0, 0, -20.0]);
  const [tk2x, , tk2z] = posOf('b2_tk602', [7.4, 0, -17.4]);
  const [tk1x, , tk1z] = posOf('b2_tk601', [10.8, 0, -17.4]);
  const [p602x, , p602z] = posOf('b2_p602', [13.8, 0, -17.4]);

  // =========================================================================
  // 1. OUTDOOR PCW STATION (EXACT B5 PCW TOPOLOGY — ALL 4 PORTS ON ONE SINGLE +X PHE FACE!)
  //    PHEs E-601A & E-601B sit on the LEFT with rotY = +Math.PI/2 (perpendicular to wall Z=-12.5):
  //      Local (lx, ly, lz) -> World (he.x + lz, ly, he.z - lx)
  //      * SINGLE 4-port front face: X = he.x + 0.72 = -11.78 (ZERO pipes piercing rear or side!)
  //      * CHW column (local lx = -0.36): Z = he.z + 0.36 -> Bottom y=0.56 CHW Supply In, Top y=1.88 CHW Return Out!
  //      * PCW column (local lx = +0.36): Z = he.z - 0.36 -> Bottom y=0.56 PCW Warm In,   Top y=1.88 PCW Cold Out!
  // =========================================================================
  const heFaceX = (x: number) => x + 0.72;
  const heChwZ = (z: number) => z + 0.36;
  const hePcwZ = (z: number) => z - 0.36;

  // Strictly separated X / Y / Z pipe tracks (ZERO overlapping or diagonal pipes!)
  const X_CHW_DROP = -10.85; // CHW Supply vertical drops from B5 overhead bridge into PHE CHW bottom ports
  const X_CHW_RET_RISER = -11.25; // CHW Return vertical risers carrying Johnson Controls TCV-10601 / TCV-10602
  const X_PCW_MERGE = -10.25; // PCW Supply merge track after E-601A/B cold outlets (TT10601 / TT10602)
  const Y_CHW_BRIDGE = 4.35; // Elevated CHW Supply pipe bridge arriving from Building 5 (-Z)
  const Y_CHW_RET_BRIDGE = 3.95; // Elevated CHW Return pipe bridge returning to Building 5 (-Z)
  const Y_PCW_SPLIT = 3.2; // Mid-high PCW Supply header through FIT10601 -> Split Tee!
  const X_PCW_SPLIT = -1.8; // Exact SCADA Split Node AFTER FIT10601: UP into B2 & DOWN to XV-10603/04!
  const Z_PCW_SUP_WALL = -13.15; // PCW Supply header running along exterior wall face -> FIT10601 -> Split Tee!
  const Z_PCW_SUCT = -21.2; // Outermost pump suction bus behind P-601A/B/C/D (farthest from wall!)
  const Z_PCW_DISCH = -18.95; // Pump discharge bus between P-601A..D and FLT-601A/B!
  const Y_PUMP_PORT = 0.62;
  const X_PCW_RET_CORR = 4.95; // Main PCW Return corridor cleanly passing into A-601!

  // --- 1A. CHW SUPPLY FROM BUILDING 5 CHILLER PLANT (-Z) -> E-601A & E-601B CHW BOTTOM PORTS (y=0.56) ---
  pipes.push(
    {
      id: 'b2_pcw_chw_sup_from_b5',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      requireAllTags: ['B21F_TCV10601', 'B21F_TCV10602'],
      points: [
        [X_CHW_DROP, Y_CHW_BRIDGE, B21F_PCW_Z_MIN],
        [X_CHW_DROP, Y_CHW_BRIDGE, heChwZ(e1z)],
        [X_CHW_DROP, 0.56, heChwZ(e1z)],
        [heFaceX(e1x), 0.56, heChwZ(e1z)],
      ],
      radius: 0.1,
      particleCount: 10,
    },
    {
      id: 'b2_pcw_chw_sup_e601b',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      requireAllTags: ['B21F_TCV10602'],
      points: [
        [X_CHW_DROP, Y_CHW_BRIDGE, heChwZ(e2z)],
        [X_CHW_DROP, 0.56, heChwZ(e2z)],
        [heFaceX(e2x), 0.56, heChwZ(e2z)],
      ],
      radius: 0.095,
      particleCount: 5,
    }
  );

  // --- 1B. CHW RETURN FROM E-601A & E-601B CHW TOP PORTS (y=1.88) -> TCV-10601/02 -> BACK TO BUILDING 5 (-Z) ---
  pipes.push(
    {
      id: 'b2_pcw_chw_ret_e601a',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      requireAllTags: ['B21F_TCV10601'],
      points: [
        [heFaceX(e1x), 1.88, heChwZ(e1z)],
        [X_CHW_RET_RISER, 1.88, heChwZ(e1z)],
        [X_CHW_RET_RISER, Y_CHW_RET_BRIDGE, heChwZ(e1z)],
        [X_CHW_RET_RISER, Y_CHW_RET_BRIDGE, B21F_PCW_Z_MIN],
      ],
      radius: 0.1,
      particleCount: 10,
    },
    {
      id: 'b2_pcw_chw_ret_e601b',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      requireAllTags: ['B21F_TCV10602'],
      points: [
        [heFaceX(e2x), 1.88, heChwZ(e2z)],
        [X_CHW_RET_RISER, 1.88, heChwZ(e2z)],
        [X_CHW_RET_RISER, Y_CHW_RET_BRIDGE, heChwZ(e2z)],
      ],
      radius: 0.095,
      particleCount: 5,
    }
  );

  valves.push(
    {
      id: 'vl_b2_tcv10601',
      layer: 'pcw',
      b2Layer: 'pcw',
      tag: 'B21F_TCV10601',
      shortLabel: 'TCV10601',
      pos: [X_CHW_RET_RISER, 2.95, heChwZ(e1z)],
      orientation: 'vertical',
      valveStyle: 'control',
    },
    {
      id: 'vl_b2_tcv10602',
      layer: 'pcw',
      b2Layer: 'pcw',
      tag: 'B21F_TCV10602',
      shortLabel: 'TCV10602',
      pos: [X_CHW_RET_RISER, 2.95, heChwZ(e2z)],
      orientation: 'vertical',
      valveStyle: 'control',
    }
  );

  // --- 1C. PCW SUCTION BUS (A-601 + TK-602 + PIT10601 + XV-10602 RO Makeup -> OUTERMOST PUMPS P-601A..D) ---
  pipes.push(
    // Return trunk coming out of cleanroom ceiling plenum -> down into A-601 Air Separator -> Outermost Suction Bus!
    {
      id: 'b2_pcw_ret_from_building',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [X_PCW_RET_CORR, 4.82, -12.0],
        [X_PCW_RET_CORR, 4.82, -13.15],
        [X_PCW_RET_CORR, Y_PUMP_PORT, -13.15],
        [X_PCW_RET_CORR, Y_PUMP_PORT, a6z],
        [a6x, Y_PUMP_PORT, a6z],
        [a6x, Y_PUMP_PORT, Z_PCW_SUCT],
        [p1x, Y_PUMP_PORT, Z_PCW_SUCT],
      ],
      radius: 0.11,
      particleCount: 12,
    },
    // Expansion Tank TK-602 tie-in to suction manifold
    {
      id: 'b2_pcw_tk602_tie',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [tk2x, Y_PUMP_PORT, tk2z],
        [tk2x, Y_PUMP_PORT, a6z],
        [a6x, Y_PUMP_PORT, a6z],
      ],
      radius: 0.085,
      particleCount: 3,
    },
    // RO Water Makeup Line -> XV-10602 -> Suction Bus beside A-601 / TK-602
    {
      id: 'b2_pcw_ro_makeup',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'di',
      flowSourceTags: ['B21F_XV10602'],
      points: [
        [7.4, 3.3, B21F_PCW_Z_MIN],
        [7.4, 3.3, a6z],
        [6.35, 3.3, a6z],
        [6.35, Y_PUMP_PORT, a6z],
      ],
      radius: 0.08,
      particleCount: 5,
    },
    // Drain Relief Line -> XV-10601 -> Climbs & Enters TOP of Rejected Tank TK-601 -> Bottom Outlet to P-602 -> WW Reject!
    {
      id: 'b2_pcw_drain_to_tk601_top',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: ['B21F_XV10601'],
      points: [
        [a6x, Y_PUMP_PORT, a6z],
        [a6x, 1.15, a6z],
        [9.0, 1.15, a6z],
        [9.0, 1.15, tk1z],
        [9.0, 3.65, tk1z],
        [tk1x, 3.65, tk1z],
        [tk1x, 3.1, tk1z],
      ],
      radius: 0.085,
      particleCount: 7,
    },
    {
      id: 'b2_pcw_tk601_to_p602',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: ['B21F_P602'],
      points: [
        [tk1x + 0.95, 0.5, tk1z],
        [p602x - 0.55, 0.5, p602z],
      ],
      radius: 0.08,
      particleCount: 3,
    },
    {
      id: 'b2_pcw_p602_reject',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: ['B21F_P602'],
      points: [
        [p602x + 0.55, 0.5, p602z],
        [16.8, 0.5, p602z],
        [16.8, 0.5, B21F_PCW_Z_MIN],
      ],
      radius: 0.08,
      particleCount: 4,
    }
  );

  // 4× Outermost Vertical VFD Pumps P-601A/B/C/D (Z=-20.2): Rear Suction (-Z) -> Front Discharge (+Z)
  for (const [idx, px, pz, tag] of [
    ['a', p1x, p1z, 'B21F_P601A'],
    ['b', p2x, p2z, 'B21F_P601B'],
    ['c', p3x, p3z, 'B21F_P601C'],
    ['d', p4x, p4z, 'B21F_P601D'],
  ] as const) {
    pipes.push(
      {
        id: `b2_pcw_suct_${idx}`,
        layer: 'pcw',
        b2Layer: 'pcw',
        fluid: 'pcw_ret',
        flowSourceTags: [tag],
        points: [
          [px, Y_PUMP_PORT, Z_PCW_SUCT],
          [px, Y_PUMP_PORT, pz - 0.55],
        ],
        radius: 0.085,
        particleCount: 2,
      },
      {
        id: `b2_pcw_disch_${idx}`,
        layer: 'pcw',
        b2Layer: 'pcw',
        fluid: 'pcw_ret',
        flowSourceTags: [tag],
        points: [
          [px, Y_PUMP_PORT, pz + 0.55],
          [px, Y_PUMP_PORT, Z_PCW_DISCH],
        ],
        radius: 0.085,
        particleCount: 2,
      }
    );
  }

  // --- 1D. PUMP DISCHARGE BUS -> STAINLESS METAL BAG FILTERS FLT-601A/B -> PHE PCW WARM INLETS (y=0.56, +X face!) ---
  pipes.push(
    {
      id: 'b2_pcw_disch_bus',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [p4x, Y_PUMP_PORT, Z_PCW_DISCH],
        [f1x + 0.85, Y_PUMP_PORT, Z_PCW_DISCH],
        [f1x + 0.85, Y_PUMP_PORT, f1z],
      ],
      radius: 0.105,
      particleCount: 8,
    },
    // Filter A upper inlet (+X side, y=1.45) & lower outlet (-X side, y=0.56) -> E-601A PCW Bottom-Right Port!
    {
      id: 'b2_pcw_to_flt_a',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [f1x + 0.85, Y_PUMP_PORT, f1z],
        [f1x + 0.85, 1.45, f1z],
        [f1x + 0.45, 1.45, f1z],
      ],
      radius: 0.09,
      particleCount: 3,
    },
    {
      id: 'b2_pcw_flt_a_to_e601a',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [f1x - 0.45, 0.56, f1z],
        [f1x - 0.45, 0.56, hePcwZ(e1z)],
        [heFaceX(e1x), 0.56, hePcwZ(e1z)],
      ],
      radius: 0.09,
      particleCount: 4,
    },
    // Filter B upper inlet (+X side, y=1.45) & lower outlet (-X side, y=0.56) -> E-601B PCW Bottom-Right Port!
    {
      id: 'b2_pcw_to_flt_b',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [f2x + 0.85, Y_PUMP_PORT, f2z],
        [f2x + 0.85, 1.45, f2z],
        [f2x + 0.45, 1.45, f2z],
      ],
      radius: 0.09,
      particleCount: 3,
    },
    {
      id: 'b2_pcw_flt_b_to_e601b',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [f2x - 0.45, 0.56, f2z],
        [f2x - 0.45, 0.56, hePcwZ(e2z)],
        [heFaceX(e2x), 0.56, hePcwZ(e2z)],
      ],
      radius: 0.09,
      particleCount: 4,
    }
  );

  // --- 1E. EXACT SCADA PCW SUPPLY TREE (#00cfe8):
  //   E-601A -> TT10601 + E-601B -> TT10602 -> Merge -> FIT10601 -> SPLIT TEE (X=-1.8, Y=3.2, Z=-13.15):
  //     (1) Branch UP & INTO Building 2 1F Cleanroom Ceiling (Y=5.1) + Riser to 3F!
  //     (2) Branch DOWN into 2 parallel manual bypass valves XV-10603 & XV-10604!
  //         ABOVE XV-10603/04 = Bright Cyan (#00cfe8); BELOW XV-10603/04 = Dark Teal (#009999) merging into Main Return! ---
  pipes.push(
    {
      id: 'b2_pcw_sup_e601b_merge',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [heFaceX(e2x), 1.88, hePcwZ(e2z)],
        [X_PCW_MERGE, 1.88, hePcwZ(e2z)],
        [X_PCW_MERGE, 1.88, hePcwZ(e1z)],
      ],
      radius: 0.095,
      particleCount: 5,
    },
    {
      id: 'b2_pcw_sup_e601a_to_fit_split',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [heFaceX(e1x), 1.88, hePcwZ(e1z)],
        [X_PCW_MERGE, 1.88, hePcwZ(e1z)],
        [X_PCW_MERGE, Y_PCW_SPLIT, hePcwZ(e1z)],
        [X_PCW_MERGE, Y_PCW_SPLIT, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT, Y_PCW_SPLIT, Z_PCW_SUP_WALL],
      ],
      radius: 0.105,
      particleCount: 9,
    },
    // Branch 1 AFTER FIT10601: UP from Split Tee -> runs into 1F Cleanroom Ceiling Spine (-13.5, 5.1, -12.0)!
    {
      id: 'b2_pcw_sup_into_cleanroom',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [X_PCW_SPLIT, Y_PCW_SPLIT, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT, 5.1, Z_PCW_SUP_WALL],
        [-13.5, 5.1, Z_PCW_SUP_WALL],
        [-13.5, 5.1, -12.0],
      ],
      radius: 0.105,
      particleCount: 9,
    },
    // Branch 2 AFTER FIT10601: DOWN into parallel XV-10603 & XV-10604 (Bright Cyan ABOVE both valves!)
    {
      id: 'b2_pcw_byp_above_03',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: ['B21F_XV10603'],
      requireAllTags: pcwPumps,
      points: [
        [X_PCW_SPLIT, Y_PCW_SPLIT, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT, 1.8, Z_PCW_SUP_WALL],
      ],
      radius: 0.085,
      particleCount: 2,
    },
    {
      id: 'b2_pcw_byp_above_04',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: ['B21F_XV10604'],
      requireAllTags: pcwPumps,
      points: [
        [X_PCW_SPLIT, 2.65, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT + 1.2, 2.65, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT + 1.2, 1.8, Z_PCW_SUP_WALL],
      ],
      radius: 0.085,
      particleCount: 3,
    },
    // BELOW XV-10603 & XV-10604 -> turns Dark Teal (#009999) and merges cleanly into Main Return!
    {
      id: 'b2_pcw_byp_below_03',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: ['B21F_XV10603'],
      requireAllTags: pcwPumps,
      points: [
        [X_PCW_SPLIT, 1.8, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT, Y_PUMP_PORT, Z_PCW_SUP_WALL],
        [X_PCW_RET_CORR, Y_PUMP_PORT, Z_PCW_SUP_WALL],
      ],
      radius: 0.085,
      particleCount: 5,
    },
    {
      id: 'b2_pcw_byp_below_04',
      layer: 'pcw',
      b2Layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: ['B21F_XV10604'],
      requireAllTags: pcwPumps,
      points: [
        [X_PCW_SPLIT + 1.2, 1.8, Z_PCW_SUP_WALL],
        [X_PCW_SPLIT + 1.2, Y_PUMP_PORT, Z_PCW_SUP_WALL],
      ],
      radius: 0.085,
      particleCount: 2,
    }
  );

  // PCW Outdoor Valves & Sensors (strictly 1F station tags — DPT10601 & TT10603 live on 3F!)
  valves.push(
    { id: 'vl_b2_xv10602', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_XV10602', shortLabel: 'XV10602', pos: [7.4, 3.3, -21.0], orientation: 'horizontal_z', valveStyle: 'xv' },
    { id: 'vl_b2_xv10601', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_XV10601', shortLabel: 'XV10601', pos: [7.2, 1.15, a6z], orientation: 'horizontal_x', valveStyle: 'xv' },
    { id: 'vl_b2_xv10603', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_XV10603', shortLabel: 'XV10603', pos: [X_PCW_SPLIT, 1.8, Z_PCW_SUP_WALL], orientation: 'vertical', valveStyle: 'xv' },
    { id: 'vl_b2_xv10604', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_XV10604', shortLabel: 'XV10604', pos: [X_PCW_SPLIT + 1.2, 1.8, Z_PCW_SUP_WALL], orientation: 'vertical', valveStyle: 'xv' }
  );
  sensors.push(
    { id: 'sn_b2_tt10601', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_TT10601', shortLabel: 'TT10601', pos: [(heFaceX(e1x) + X_PCW_MERGE) / 2, 1.88 + 0.55, hePcwZ(e1z)], fluid: 'pcw' },
    { id: 'sn_b2_tt10602', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_TT10602', shortLabel: 'TT10602', pos: [(heFaceX(e2x) + X_PCW_MERGE) / 2, 1.88 + 0.55, hePcwZ(e2z)], fluid: 'pcw' },
    { id: 'sn_b2_fit10601', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_FIT10601', shortLabel: 'FIT10601', pos: [-5.8, Y_PCW_SPLIT + 0.55, Z_PCW_SUP_WALL], fluid: 'pcw' },
    { id: 'sn_b2_pit10601', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_PIT10601', shortLabel: 'PIT10601', pos: [5.9, Y_PUMP_PORT + 0.58, a6z], fluid: 'pcw_ret' },
    { id: 'sn_b2_lt10601', layer: 'pcw', b2Layer: 'pcw', tag: 'B21F_LT10601', shortLabel: 'LT10601', pos: [tk1x, 3.25, tk1z], fluid: 'pcw_ret' }
  );

  // =========================================================================
  // 2. 1F OVERHEAD UTILITY PLENUM: 1F PCW BRANCHES + SLENDER DROPS INTO 1F TOOLS!
  // =========================================================================
  const Y_PCW_SUP = 5.1;
  const Y_PCW_RET = 4.82;

  pipes.push(
    {
      id: 'b21f_pcw_sup_spine',
      layer: 'pcw',
      b2Layer: 'cleanroom',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [-13.5, Y_PCW_SUP, -12.0],
        [-13.5, Y_PCW_SUP, 5.7],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    {
      id: 'b21f_pcw_ret_spine',
      layer: 'pcw',
      b2Layer: 'cleanroom',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [X_PCW_RET_CORR, Y_PCW_RET, 5.3],
        [X_PCW_RET_CORR, Y_PCW_RET, -12.0],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    // Vertical PCW Riser climbing through roof slab to 3F Cleanroom!
    {
      id: 'b21f_pcw_sup_riser_3f',
      layer: 'pcw',
      b2Layer: 'cleanroom',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [-13.5, Y_PCW_SUP, -11.4],
        [-13.5, B21F_PLENUM_TOP_Y + 0.5, -11.4],
      ],
      radius: 0.09,
      particleCount: 3,
    },
    {
      id: 'b21f_pcw_ret_riser_3f',
      layer: 'pcw',
      b2Layer: 'cleanroom',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [X_PCW_RET_CORR, B21F_PLENUM_TOP_Y + 0.5, -11.4],
        [X_PCW_RET_CORR, Y_PCW_RET, -11.4],
      ],
      radius: 0.09,
      particleCount: 3,
    }
  );

  const b21fToolRows: { code: string; zSup: number; zRet: number; endX: number; tools: { x: number; topY: number }[] }[] = [
    {
      code: 'north',
      zSup: -6.3,
      zRet: -6.7,
      endX: 15.0,
      tools: [
        { x: -13.5, topY: 2.15 },
        { x: -7.5, topY: 2.15 },
        { x: 2.5, topY: 2.15 },
        { x: 8.5, topY: 2.15 },
        { x: 14.2, topY: 2.15 },
      ],
    },
    {
      code: 'south',
      zSup: 5.7,
      zRet: 5.3,
      endX: 0.2,
      tools: [
        { x: -13.5, topY: 2.15 },
        { x: -7.5, topY: 2.15 },
        { x: -1.5, topY: 0.98 },
      ],
    },
  ];

  for (const row of b21fToolRows) {
    pipes.push(
      {
        id: `b21f_pcw_br_sup_${row.code}`,
        layer: 'pcw',
        b2Layer: 'cleanroom',
        fluid: 'pcw',
        flowSourceTags: pcwPumps,
        points: [
          [-13.5, Y_PCW_SUP, row.zSup],
          [row.endX, Y_PCW_SUP, row.zSup],
        ],
        radius: 0.072,
        particleCount: 7,
      },
      {
        id: `b21f_pcw_br_ret_${row.code}`,
        layer: 'pcw',
        b2Layer: 'cleanroom',
        fluid: 'pcw_ret',
        flowSourceTags: pcwPumps,
        points: [
          [row.endX, Y_PCW_RET, row.zRet],
          [X_PCW_RET_CORR, Y_PCW_RET, row.zRet],
        ],
        radius: 0.072,
        particleCount: 7,
      }
    );

    row.tools.forEach((tool, ti) => {
      pipes.push(
        {
          id: `b21f_pcw_drop_sup_${row.code}_${ti}`,
          layer: 'pcw',
          b2Layer: 'cleanroom',
          fluid: 'pcw',
          flowSourceTags: pcwPumps,
          points: [
            [tool.x - 0.18, Y_PCW_SUP, row.zSup],
            [tool.x - 0.18, tool.topY, row.zSup],
          ],
          radius: 0.036,
          particleCount: 3,
        },
        {
          id: `b21f_pcw_drop_ret_${row.code}_${ti}`,
          layer: 'pcw',
          b2Layer: 'cleanroom',
          fluid: 'pcw_ret',
          flowSourceTags: pcwPumps,
          points: [
            [tool.x + 0.18, tool.topY, row.zRet],
            [tool.x + 0.18, Y_PCW_RET, row.zRet],
          ],
          radius: 0.036,
          particleCount: 3,
        }
      );
    });
  }

  // =========================================================================
  // 3. OVERHEAD 1F CHW FEED TO 4× CEILING FCUs + 4× SUSPENDED UNDER-CEILING PAUCT-01..04
  //    - FCU & FFU solid ducts stop AT ceiling edge (Y=3.85m); ONLY cool-air droplets descend into rooms!
  //    - PAUCT-01..04 hang below ceiling at Y=3.15m via 2 threaded rods ("2 thanh ti treo") with CHW drops & cool-air streams!
  // =========================================================================
  const Y_FCU_CHW_SUP = 4.65;
  const Y_FCU_CHW_RET = 4.4;
  pipes.push(
    {
      id: 'b21f_fcu_chw_sup',
      layer: 'chiller',
      b2Layer: 'cleanroom',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [15.8, Y_FCU_CHW_SUP, -12.0],
        [15.8, Y_FCU_CHW_SUP, 8.2],
        [5.5, Y_FCU_CHW_SUP, 8.2],
      ],
      radius: 0.075,
      particleCount: 8,
    },
    {
      id: 'b21f_fcu_chw_ret',
      layer: 'chiller',
      b2Layer: 'cleanroom',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [5.5, Y_FCU_CHW_RET, 8.6],
        [16.3, Y_FCU_CHW_RET, 8.6],
        [16.3, Y_FCU_CHW_RET, -12.0],
      ],
      radius: 0.075,
      particleCount: 8,
    },
    // West CHW Overhead Header feeding the 4 Ceiling-Hung PAUCT-01..04 units!
    {
      id: 'b21f_pauct_chw_sup_hdr',
      layer: 'chiller',
      b2Layer: 'cleanroom',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      points: [
        [-10.85, Y_FCU_CHW_SUP, -12.0],
        [-10.85, Y_FCU_CHW_SUP, 2.4],
        [-14.2, Y_FCU_CHW_SUP, 2.4],
      ],
      radius: 0.068,
      particleCount: 7,
    },
    {
      id: 'b21f_pauct_chw_ret_hdr',
      layer: 'chiller',
      b2Layer: 'cleanroom',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      points: [
        [-14.2, Y_FCU_CHW_RET, 2.8],
        [-11.25, Y_FCU_CHW_RET, 2.8],
        [-11.25, Y_FCU_CHW_RET, -12.0],
      ],
      radius: 0.068,
      particleCount: 7,
    }
  );

  for (const fcu of [
    { id: 'b2_fcu01', tag: 'B21F_FCU01', vTag: 'B21F_FCU01V', lbl: 'FCU01V', fb: [5.5, 4.15, 2.2] as [number, number, number] },
    { id: 'b2_fcu02', tag: 'B21F_FCU02', vTag: 'B21F_FCU02V', lbl: 'FCU02V', fb: [11.5, 4.15, 2.2] as [number, number, number] },
    { id: 'b2_fcu03', tag: 'B21F_FCU03', vTag: 'B21F_FCU03V', lbl: 'FCU03V', fb: [5.5, 4.15, 7.6] as [number, number, number] },
    { id: 'b2_fcu04', tag: 'B21F_FCU04', vTag: 'B21F_FCU04V', lbl: 'FCU04V', fb: [11.5, 4.15, 7.6] as [number, number, number] },
  ]) {
    const [fx, , fz] = posOf(fcu.id, fcu.fb);
    pipes.push(
      {
        id: `b21f_${fcu.id}_chw_in`,
        layer: 'chiller',
        b2Layer: 'cleanroom',
        fluid: 'chw',
        flowSourceTags: chwpTags,
        requireAllTags: [fcu.vTag],
        points: [
          [fx - 0.55, Y_FCU_CHW_SUP, 8.2],
          [fx - 0.55, Y_FCU_CHW_SUP, fz],
          [fx - 0.55, 4.35, fz],
        ],
        radius: 0.045,
        particleCount: 3,
      },
      {
        id: `b21f_${fcu.id}_chw_out`,
        layer: 'chiller',
        b2Layer: 'cleanroom',
        fluid: 'chwr',
        flowSourceTags: chwpTags,
        requireAllTags: [fcu.vTag],
        points: [
          [fx + 0.55, 4.35, fz],
          [fx + 0.55, Y_FCU_CHW_RET, fz],
          [fx + 0.55, Y_FCU_CHW_RET, 8.6],
        ],
        radius: 0.045,
        particleCount: 3,
      }
    );
    valves.push({
      id: `vl_${fcu.id}`,
      layer: 'chiller',
      b2Layer: 'cleanroom',
      tag: fcu.vTag,
      shortLabel: fcu.lbl,
      pos: [fx - 0.55, Y_FCU_CHW_SUP, fz + 0.5],
      orientation: 'horizontal_z',
      valveStyle: 'xv',
    });
    // Short collar stops AT ceiling face (Y=3.85m); ONLY cool-air droplets descend into the room!
    ducts.push(
      {
        id: `b21f_air_neck_${fcu.id}`,
        b2Layer: 'cleanroom',
        kind: 'supply',
        flowSourceTags: [fcu.tag],
        points: [
          [fx, 4.18, fz],
          [fx, B21F_CEILING_Y, fz],
        ],
        width: 0.58,
        height: 0.58,
        particleCount: 1,
      },
      {
        id: `b21f_air_blow_${fcu.id}`,
        b2Layer: 'cleanroom',
        kind: 'supply',
        flowSourceTags: [fcu.tag],
        points: [
          [fx, B21F_CEILING_Y - 0.04, fz],
          [fx, 1.65, fz],
        ],
        width: 0.58,
        height: 0.58,
        particlesOnly: true,
        particleCount: 6,
      }
    );
  }

  // Ceiling FFU-1F-01..03: short plenum neck stops AT ceiling face (Y=3.85m), ONLY laminar clean-air droplets descend!
  for (const ffu of [
    { id: 'b2_ffu01', tag: 'B21F_FFU01', fb: [-14.2, 4.0, -9.2] as [number, number, number] },
    { id: 'b2_ffu02', tag: 'B21F_FFU02', fb: [-9.2, 4.0, -9.2] as [number, number, number] },
    { id: 'b2_ffu03', tag: 'B21F_FFU03', fb: [-4.2, 4.0, -9.2] as [number, number, number] },
  ]) {
    const [ux, , uz] = posOf(ffu.id, ffu.fb);
    ducts.push(
      {
        id: `b21f_air_neck_${ffu.id}`,
        b2Layer: 'cleanroom',
        kind: 'supply',
        flowSourceTags: [ffu.tag],
        points: [
          [ux, 4.02, uz],
          [ux, B21F_CEILING_Y, uz],
        ],
        width: 0.72,
        height: 0.72,
        particleCount: 1,
      },
      {
        id: `b21f_air_blow_${ffu.id}`,
        b2Layer: 'cleanroom',
        kind: 'supply',
        flowSourceTags: [ffu.tag],
        points: [
          [ux, B21F_CEILING_Y - 0.04, uz],
          [ux, 1.55, uz],
        ],
        width: 0.72,
        height: 0.72,
        particlesOnly: true,
        particleCount: 6,
      }
    );
  }

  // 4× Ceiling-Hung PAUCT-01..04 (hanging beneath 3.85m ceiling at Y=3.15m via 2 threaded rods):
  //   Slender CHW Supply/Return pipes drop from overhead CHW header into each unit + horizontal cool-air fan stream across room!
  for (const pauct of [
    { id: 'b2_1f_pauct01', tag: 'B22F_PAUCT01', fb: [-13.5, 3.15, -2.4] as [number, number, number] },
    { id: 'b2_1f_pauct02', tag: 'B22F_PAUCT02', fb: [-6.0, 3.15, -2.4] as [number, number, number] },
    { id: 'b2_1f_pauct03', tag: 'B22F_PAUCT03', fb: [-13.5, 3.15, 2.4] as [number, number, number] },
    { id: 'b2_1f_pauct04', tag: 'B22F_PAUCT04', fb: [-6.0, 3.15, 2.4] as [number, number, number] },
  ]) {
    const [px, py, pz] = posOf(pauct.id, pauct.fb);
    pipes.push(
      {
        id: `b21f_${pauct.id}_chws`,
        layer: 'chiller',
        b2Layer: 'cleanroom',
        fluid: 'chw',
        flowSourceTags: chwpTags,
        points: [
          [-10.85, Y_FCU_CHW_SUP, pz],
          [px - 0.72, Y_FCU_CHW_SUP, pz],
          [px - 0.72, py + 0.24, pz],
        ],
        radius: 0.036,
        particleCount: 3,
      },
      {
        id: `b21f_${pauct.id}_chwr`,
        layer: 'chiller',
        b2Layer: 'cleanroom',
        fluid: 'chwr',
        flowSourceTags: chwpTags,
        points: [
          [px - 0.72, py + 0.24, pz + 0.22],
          [px - 0.72, Y_FCU_CHW_RET, pz + 0.22],
          [-11.25, Y_FCU_CHW_RET, pz + 0.22],
        ],
        radius: 0.036,
        particleCount: 3,
      }
    );
    // Horizontal cool-air particle jet blown out the front grille across the cleanroom!
    ducts.push({
      id: `b21f_pauct_jet_${pauct.id}`,
      b2Layer: 'cleanroom',
      kind: 'supply',
      flowSourceTags: [pauct.tag],
      points: [
        [px, py + 0.22, pz + 0.45],
        [px, py + 0.22, pz + 3.2],
      ],
      width: 0.5,
      height: 0.35,
      particlesOnly: true,
      particleCount: 6,
    });
  }

  // =========================================================================
  // 4. OVERHEAD 1F EXHAUST DUCTS: EAF-1F-01..03 & TOILET TEF-1F-01..02
  //    Every ceiling exhaust fan has a VERTICAL SUCTION DROP down to ceiling edge (Y=3.85m)
  //    strictly pulling air UP out of the room -> THROUGH the fan -> OUT to exterior wall!
  // =========================================================================
  const exhCeilingFans: { id: string; tag: string; fb: [number, number, number]; pickupX: number; outX: number }[] = [
    { id: 'b2_1f_eaf01', tag: 'B21F_EAF01', fb: [-12.0, 5.4, -3.2], pickupX: -9.6, outX: -18.0 },
    { id: 'b2_1f_eaf02', tag: 'B21F_EAF02', fb: [4.5, 5.4, -3.2], pickupX: 2.1, outX: 18.0 },
    { id: 'b2_1f_eaf03', tag: 'B21F_EAF03', fb: [12.5, 5.4, -3.2], pickupX: 10.1, outX: 18.0 },
    { id: 'b2_1f_tef01', tag: 'B21F_TEF01', fb: [14.5, 5.35, 3.6], pickupX: 12.4, outX: 18.0 },
    { id: 'b2_1f_tef02', tag: 'B21F_TEF02', fb: [14.5, 5.35, 9.6], pickupX: 12.4, outX: 18.0 },
  ];
  for (const ef of exhCeilingFans) {
    const [ex, ey, ez] = posOf(ef.id, ef.fb);
    ducts.push({
      id: `b21f_exh_duct_${ef.id}`,
      b2Layer: 'cleanroom',
      kind: 'exhaust',
      flowSourceTags: [ef.tag],
      points: [
        [ef.pickupX, B21F_CEILING_Y, ez],
        [ef.pickupX, ey, ez],
        [ex, ey, ez],
        [ef.outX, ey, ez],
      ],
      width: 0.56,
      height: 0.48,
      particleCount: 6,
    });
  }

  // =========================================================================
  // 5. ROOM-MOUNTED COLUMN SENSORS BELOW CEILING (Y = 1.65m — INSIDE CLEANROOMS!)
  // =========================================================================
  const colSensors: { tag: string; lbl: string; pos: [number, number, number] }[] = [
    { tag: 'B22F_AHU01_RAT', lbl: 'AREA1 T', pos: [-11.5, 1.85, -3.0] },
    { tag: 'B22F_AHU01_RAH', lbl: 'AREA1 RH', pos: [-11.5, 1.25, -3.0] },
    { tag: 'B22F_AHU02_RAT', lbl: 'AREA2 T', pos: [-5.0, 1.85, -3.0] },
    { tag: 'B22F_AHU02_RAH', lbl: 'AREA2 RH', pos: [-5.0, 1.25, -3.0] },
    { tag: 'B22F_AHU03_RAT', lbl: 'CNC T', pos: [3.5, 1.85, -3.0] },
    { tag: 'B22F_AHU04_RAT', lbl: 'COAT T', pos: [10.0, 1.85, -3.0] },
    { tag: 'B22F_AHU04_RAH', lbl: 'COAT RH', pos: [10.0, 1.25, -3.0] },
    { tag: 'B22F_AHU08_RAT', lbl: 'CMAT T', pos: [15.0, 1.85, -3.0] },
    { tag: 'B22F_AHU06_RAT', lbl: 'POLISH T', pos: [-11.5, 1.85, 3.0] },
    { tag: 'B22F_AHU07_RAT', lbl: 'CLEAN T', pos: [-5.0, 1.85, 3.0] },
    { tag: 'B22F_AHU05_RAT', lbl: 'BLAST T', pos: [-11.5, 1.85, 9.2] },
    { tag: 'B22F_AHU10_RAT', lbl: 'AREA4 T', pos: [-5.0, 1.85, 9.2] },
    { tag: 'B22F_AHU09_RAT', lbl: 'GOWN T', pos: [-0.2, 1.85, 9.2] },
    { tag: 'B21F_FCU01RT1', lbl: 'FCU01 T', pos: [5.5, 1.75, 3.6] },
    { tag: 'B21F_FCU02RT1', lbl: 'FCU02 T', pos: [11.5, 1.75, 3.6] },
    { tag: 'B21F_FCU03RT1', lbl: 'FCU03 T', pos: [5.5, 1.75, 9.2] },
    { tag: 'B21F_FCU04RT1', lbl: 'FCU04 T', pos: [11.5, 1.75, 9.2] },
  ];

  for (const cs of colSensors) {
    sensors.push({
      id: `sn_b21f_${cs.tag}`,
      layer: 'ac',
      b2Layer: 'cleanroom',
      tag: cs.tag,
      shortLabel: cs.lbl,
      pos: cs.pos,
      fluid: 'air',
      kind: 'room_sensor',
    });
  }

  return { pipes, ducts, valves, sensors };
}
