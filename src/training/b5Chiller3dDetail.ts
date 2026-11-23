import {
  DEFAULT_3D_NODES,
  resolveNodeTransform,
  type B51FLayerId,
  type FluidType,
  type NodeTransformOverride,
} from './plant3dLayout.ts';

export interface DetailedPipe3D {
  id: string;
  layer: B51FLayerId;
  fluid: FluidType;
  flowSourceTags: string[]; // Pipe flows if ANY of these equipment/valves are active (or all if requireAllTags)
  requireAllTags?: string[]; // Additional tags that must be open/running
  points: [number, number, number][];
  radius?: number;
  particleCount?: number;
}

export type Valve3DStyle = 'control' | 'xv' | 'actuator';

export interface InlineValve3D {
  id: string;
  layer: B51FLayerId;
  tag: string;
  shortLabel: string;
  pos: [number, number, number];
  orientation: 'vertical' | 'horizontal_x' | 'horizontal_z';
  valveStyle?: Valve3DStyle; // 'control'=Johnson Controls VPMA (TCV/PCV), 'xv'=Johnson Controls Brass+Blue (XV), 'actuator'=VTM Navy-Blue Electric Actuator (CHV/CDV/IV/OV/BPMV)
}

export interface InlineSensor3D {
  id: string;
  layer: B51FLayerId;
  tag: string;
  shortLabel: string;
  pos: [number, number, number];
  fluid: FluidType;
  kind?: 'sensor' | 'flow_switch' | 'room_sensor';
  flowSourceTags?: string[]; // For paddle flow switches (e.g., FS-10101) driven by pump running status
}

export interface B5ChillerDetailAssembly {
  pipes: DetailedPipe3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B5_CEILING_Y = 7.2; // Elevated Building 5 1F ceiling height (raised from 5.4m -> 7.2m!)
export const B5_CT_DECK_Y = 8.6; // Outdoor KingSun Cooling Tower steel deck (1.4m HIGHER than indoor ceiling!)
export const B5_WALL_Z = -5.4; // Exterior rear wall separating Indoor 1F Room (+Z) & Outdoor CT Yard (-Z)
export const B5_INNER_WALL_Z = 9.2; // Inner building wall behind the pump row
export const B5_LEFT_WALL_X = -18.2; // Exterior left wall separating Indoor Chiller Room (+X) & Outdoor PCW Yard (-X)

/**
 * Generates the 100% SCADA-faithful, STRICTLY 90-DEGREE ORTHOGONAL CEILING-ROUTED 3D piping,
 * inline motorized/control valves, and live header sensors for the UNIFIED Building 5 — 1st Floor (1F):
 *   1. layer 'chiller': 4 Daikin Chillers + Heat Recovery CH-14 + 8 Vertical Pumps + 9 KingSun CTs (Y=8.6m, rear piping!)
 *   2. layer 'pcw'    : Outdoor PCW Silicon Station beside CH-11 (outside left wall X = -34..-18.5)
 *   3. layer 'ac'     : Compressed Air Room (OFRAC AC-101/102 + OFLAC AC-201/202/204 + IR Dryers/Receivers + PV-1301A/B)
 *   4. layer 'di'     : 3rd-Party RO-DI Skid on 1F + Building 5 2nd Floor DI Instrument Loops (PCV/PIT/FIT 10701..03)
 *
 * Every single pipe segment across ALL 4 layers is guaranteed strictly 90° orthogonal (ZERO diagonal segments!).
 */
export function buildB5ChillerDetailAssembly(
  overrides: Record<string, NodeTransformOverride>
): B5ChillerDetailAssembly {
  const posOf = (id: string): { x: number; y: number; z: number } => {
    const node = DEFAULT_3D_NODES.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0, z: 0 };
    const t = resolveNodeTransform(node, overrides);
    return { x: t.x, y: t.y, z: t.z };
  };

  const pipes: DetailedPipe3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  // =========================================================================
  // LAYER 1: CHILLER, HEAT RECOVERY & 9 KINGSUN COOLING TOWERS ('chiller')
  // =========================================================================
  const ch11 = posOf('b5_ch11');
  const ch12 = posOf('b5_ch12');
  const ch13 = posOf('b5_ch13');
  const ch14 = posOf('b5_ch14');

  const p11 = posOf('b5_ch11p');
  const p12 = posOf('b5_ch12p');
  const p13 = posOf('b5_ch13p');
  const p14 = posOf('b5_ch14p');
  const hwp = posOf('b5_ch11hwp');

  const cwp11 = posOf('b5_cwp11');
  const cwp12 = posOf('b5_cwp12');
  const cwp13 = posOf('b5_cwp13');

  const cts = Array.from({ length: 9 }, (_, i) => ({
    n: 11 + i,
    pos: posOf(`b5_ct${11 + i}`),
  }));

  const frontZ = (c: { z: number }) => c.z + 1.6;
  const chwX = (c: { x: number }) => c.x + 0.62;
  const cdwX = (c: { x: number }) => c.x - 0.62;

  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
  const cwpTags = ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'];

  // Elevated Staggered Ceiling Pipe Rack under 7.2m Ceiling (ALL >= 5.45m!)
  const Y_CHWP_DISCH = 5.45;
  const Y_CWP_DISCH = 5.8;
  const Y_HW_DISCH = 5.75;
  const Y_CHW_SUP = 6.2;
  const Y_HW_SUP = 6.2;
  const Y_CT_OUT = 6.5;
  const Y_CHW_RET = 6.6;
  const Y_HW_RET = 6.6;
  const Y_CDW_RET = 7.0;
  const Y_PUMP_PORT = 0.48; // Vertical inline pump horizontal center for rear suction (+Z) & front discharge (-Z)

  const Z_PUMP_SUCT = 8.15;
  const Z_CHWP_HDR = 4.8;
  const Z_CWP_HDR = 5.4;
  const Z_CHW_SUP_HDR = 3.2;
  const Z_CHW_RET_HDR = 5.95;
  const Z_CHILLER_DROP_CHW = 2.0;
  const Z_CHILLER_DROP_CDW = 1.4;

  // --- 1A. CHW RETURN (#008f91) ---
  // Runs along Z_CHW_RET_HDR from X=-18.0 all the way to X=-10.0 so CHRTS2, BPMV Tee, BPPS2 & BPTS3 ALL bolt directly onto the pipe!
  const chwrDropX = -10.0;
  pipes.push({
    id: 'chwr_ceiling_main',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: [...chwpTags, 'B51F_CH14CHWP'],
    points: [
      [-18.0, Y_CHW_RET, Z_CHW_RET_HDR],
      [chwrDropX, Y_CHW_RET, Z_CHW_RET_HDR],
      [chwrDropX, Y_CHW_RET, Z_PUMP_SUCT],
      [chwrDropX, Y_PUMP_PORT, Z_PUMP_SUCT],
      [p11.x, Y_PUMP_PORT, Z_PUMP_SUCT],
    ],
    radius: 0.14,
    particleCount: 10,
  });
  pipes.push({
    id: 'chwr_suct_p13_ext',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: ['B51F_CH13CHWP'],
    points: [
      [chwrDropX, Y_PUMP_PORT, Z_PUMP_SUCT],
      [p13.x, Y_PUMP_PORT, Z_PUMP_SUCT],
    ],
    radius: 0.12,
    particleCount: 2,
  });
  pipes.push({
    id: 'chwr_ceiling_to_ch14p',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: ['B51F_CH14CHWP'],
    points: [
      [chwrDropX, Y_CHW_RET, Z_PUMP_SUCT],
      [p14.x, Y_CHW_RET, Z_PUMP_SUCT],
      [p14.x, Y_PUMP_PORT, Z_PUMP_SUCT],
      [p14.x, Y_PUMP_PORT, p14.z + 0.62],
    ],
    radius: 0.12,
    particleCount: 7,
  });
  sensors.push(
    { id: 'sn_chrts2', layer: 'chiller', tag: 'B51F_CHRTS2', shortLabel: 'CHRTS2', pos: [-16.8, Y_CHW_RET + 0.55, Z_CHW_RET_HDR], fluid: 'chwr' },
    { id: 'sn_bpps2', layer: 'chiller', tag: 'B51F_BPPS2', shortLabel: 'BPPS2', pos: [-13.2, Y_CHW_RET + 0.55, Z_CHW_RET_HDR], fluid: 'chwr' },
    { id: 'sn_bpts3', layer: 'chiller', tag: 'B51F_BPTS3', shortLabel: 'BPTS3', pos: [-11.0, Y_CHW_RET + 0.55, Z_CHW_RET_HDR], fluid: 'chwr' }
  );

  for (const [n, p] of [
    [11, p11],
    [12, p12],
    [13, p13],
  ] as const) {
    const tag = `B51F_CH${n}CHWP`;
    pipes.push({
      id: `chwr_suct_${n}`,
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: [tag],
      points: [
        [p.x, Y_PUMP_PORT, Z_PUMP_SUCT],
        [p.x, Y_PUMP_PORT, p.z + 0.62],
      ],
      radius: 0.11,
      particleCount: 2,
    });
    const frontRiserZ = p.z - 0.95;
    pipes.push({
      id: `chwr_disch_${n}`,
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: [tag],
      points: [
        [p.x, Y_PUMP_PORT, p.z - 0.62],
        [p.x, Y_PUMP_PORT, frontRiserZ],
        [p.x, Y_CHWP_DISCH, frontRiserZ],
        [p.x, Y_CHWP_DISCH, Z_CHWP_HDR],
      ],
      radius: 0.11,
      particleCount: 5,
    });
  }

  const chwpHdrMinX = Math.min(p11.x, p12.x, p13.x, chwX(ch11));
  const chwpHdrMaxX = Math.max(p11.x, p12.x, p13.x, chwX(ch13));
  pipes.push({
    id: 'chwr_disch_header',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: chwpTags,
    points: [
      [chwpHdrMinX, Y_CHWP_DISCH, Z_CHWP_HDR],
      [chwpHdrMaxX, Y_CHWP_DISCH, Z_CHWP_HDR],
    ],
    radius: 0.14,
    particleCount: 8,
  });
  sensors.push({
    id: 'sn_chwps1',
    layer: 'chiller',
    tag: 'B51F_CHWPS1',
    shortLabel: 'CHWPS1',
    pos: [-7.0, Y_CHWP_DISCH + 0.55, Z_CHWP_HDR],
    fluid: 'chwr',
  });

  for (const [n, c] of [
    [11, ch11],
    [12, ch12],
    [13, ch13],
  ] as const) {
    const nx = chwX(c);
    pipes.push({
      id: `chwr_in_ch${n}`,
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: [`B51F_CH${n}CHWP`],
      requireAllTags: [`B51F_CH${n}CHV`],
      points: [
        [nx, Y_CHWP_DISCH, Z_CHWP_HDR],
        [nx, Y_CHWP_DISCH, Z_CHILLER_DROP_CHW],
        [nx, 0.72, Z_CHILLER_DROP_CHW],
        [nx, 0.72, frontZ(c)],
      ],
      radius: 0.11,
      particleCount: 5,
    });
  }

  const p14FrontRiserZ = p14.z - 0.95;
  pipes.push({
    id: 'chwr_in_ch14',
    layer: 'chiller',
    fluid: 'chwr',
    flowSourceTags: ['B51F_CH14CHWP'],
    requireAllTags: ['B51F_CH14CHV'],
    points: [
      [p14.x, Y_PUMP_PORT, p14.z - 0.62],
      [p14.x, Y_PUMP_PORT, p14FrontRiserZ],
      [p14.x, Y_CHWP_DISCH, p14FrontRiserZ],
      [p14.x, Y_CHWP_DISCH, Z_CHILLER_DROP_CHW],
      [chwX(ch14), Y_CHWP_DISCH, Z_CHILLER_DROP_CHW],
      [chwX(ch14), 0.72, Z_CHILLER_DROP_CHW],
      [chwX(ch14), 0.72, frontZ(ch14)],
    ],
    radius: 0.11,
    particleCount: 6,
  });
  sensors.push({
    id: 'sn_hchps1',
    layer: 'chiller',
    tag: 'B51F_HCHPS1',
    shortLabel: 'HCHPS1',
    pos: [p14.x, Y_CHWP_DISCH + 0.55, 4.3],
    fluid: 'chwr',
  });

  // --- 1B. CHW SUPPLY (#00cfe8) + VERTICAL CHV VALVES + CEILING BPMV ---
  for (const [n, c] of [
    [11, ch11],
    [12, ch12],
    [13, ch13],
    [14, ch14],
  ] as const) {
    const nx = chwX(c);
    const fz = frontZ(c);
    const riserZ = fz + 0.65;
    pipes.push({
      id: `chws_out_ch${n}`,
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: [`B51F_CH${n}CHWP`],
      requireAllTags: [`B51F_CH${n}CHV`],
      points: [
        [nx, 1.38, fz],
        [nx, 1.38, riserZ],
        [nx, Y_CHW_SUP, riserZ],
        [nx, Y_CHW_SUP, Z_CHW_SUP_HDR],
      ],
      radius: 0.11,
      particleCount: 5,
    });
    valves.push({
      id: `vl_chv${n}`,
      layer: 'chiller',
      tag: `B51F_CH${n}CHV`,
      shortLabel: `CHV1-${n - 10}`,
      pos: [nx, 3.2, riserZ],
      orientation: 'vertical',
    });
  }

  pipes.push({
    id: 'chws_ceiling_header',
    layer: 'chiller',
    fluid: 'chw',
    flowSourceTags: [...chwpTags, 'B51F_CH14CHWP'],
    points: [
      [chwX(ch14), Y_CHW_SUP, Z_CHW_SUP_HDR],
      [-18.0, Y_CHW_SUP, Z_CHW_SUP_HDR],
    ],
    radius: 0.14,
    particleCount: 10,
  });
  sensors.push(
    { id: 'sn_chsts1', layer: 'chiller', tag: 'B51F_CHSTS1', shortLabel: 'CHSTS1', pos: [-16.6, Y_CHW_SUP + 0.55, Z_CHW_SUP_HDR], fluid: 'chw' },
    { id: 'sn_bpps1', layer: 'chiller', tag: 'B51F_BPPS1', shortLabel: 'BPPS1', pos: [-13.2, Y_CHW_SUP + 0.55, Z_CHW_SUP_HDR], fluid: 'chw' }
  );

  const bpmvX = -14.8;
  pipes.push({
    id: 'chw_bypass_bridge',
    layer: 'chiller',
    fluid: 'chw',
    flowSourceTags: ['B51F_BPMV'],
    points: [
      [bpmvX, Y_CHW_SUP, Z_CHW_SUP_HDR],
      [bpmvX, Y_CHW_RET, Z_CHW_SUP_HDR],
      [bpmvX, Y_CHW_RET, Z_CHW_RET_HDR],
    ],
    radius: 0.1,
    particleCount: 3,
  });
  valves.push({
    id: 'vl_bpmv',
    layer: 'chiller',
    tag: 'B51F_BPMV',
    shortLabel: 'BPMV',
    pos: [bpmvX, Y_CHW_RET, (Z_CHW_SUP_HDR + Z_CHW_RET_HDR) / 2],
    orientation: 'horizontal_z',
  });

  // --- 1C. CONDENSER SUPPLY FROM BACK OF 9 ELEVATED KINGSUN CTs (Y = 8.6m) (#5da0e8) ---
  const Z_CT_OUT_HDR = -12.75;
  const Y_CT_OUT_DECK = B5_CT_DECK_Y + 0.35; // 8.95m
  const cwpDropX = -6.2;

  for (const ct of cts) {
    const bz = ct.pos.z - 1.15;
    pipes.push({
      id: `cdw_ct_out_${ct.n}`,
      layer: 'chiller',
      fluid: 'cdw_sup',
      flowSourceTags: [`B51F_CT${ct.n}OV`],
      requireAllTags: cwpTags,
      points: [
        [ct.pos.x, ct.pos.y + 0.35, bz],
        [ct.pos.x, ct.pos.y + 0.35, Z_CT_OUT_HDR],
      ],
      radius: 0.09,
      particleCount: 2,
    });
    valves.push({
      id: `vl_ct${ct.n}ov`,
      layer: 'chiller',
      tag: `B51F_CT${ct.n}OV`,
      shortLabel: `CT${ct.n}OV`,
      pos: [ct.pos.x, ct.pos.y + 0.35, (bz + Z_CT_OUT_HDR) / 2],
      orientation: 'horizontal_z',
    });
  }

  const ctMinX = Math.min(...cts.map((c) => c.pos.x));
  const ctMaxX = Math.max(...cts.map((c) => c.pos.x));
  const cwpMaxX = Math.max(cwp11.x, cwp12.x, cwp13.x);
  pipes.push({
    id: 'cdw_ct_out_header',
    layer: 'chiller',
    fluid: 'cdw_sup',
    flowSourceTags: cwpTags,
    points: [
      [ctMaxX, Y_CT_OUT_DECK, Z_CT_OUT_HDR],
      [ctMinX, Y_CT_OUT_DECK, Z_CT_OUT_HDR],
    ],
    radius: 0.14,
    particleCount: 8,
  });
  pipes.push({
    id: 'cdw_ct_to_cwp_suction',
    layer: 'chiller',
    fluid: 'cdw_sup',
    flowSourceTags: cwpTags,
    points: [
      [cwpDropX, Y_CT_OUT_DECK, Z_CT_OUT_HDR],
      [cwpDropX, Y_CT_OUT, Z_CT_OUT_HDR],
      [cwpDropX, Y_CT_OUT, Z_PUMP_SUCT],
      [cwpDropX, Y_PUMP_PORT, Z_PUMP_SUCT],
      [cwpMaxX, Y_PUMP_PORT, Z_PUMP_SUCT],
    ],
    radius: 0.14,
    particleCount: 10,
  });
  sensors.push({
    id: 'sn_tt10505',
    layer: 'chiller',
    tag: 'B51F_TT10505',
    shortLabel: 'TT10505',
    pos: [cwpDropX, Y_CT_OUT + 0.55, -2.5],
    fluid: 'cdw_sup',
  });

  for (const [n, p] of [
    [11, cwp11],
    [12, cwp12],
    [13, cwp13],
  ] as const) {
    const tag = `B51F_CT${n}CWP`;
    pipes.push({
      id: `cdw_suct_${n}`,
      layer: 'chiller',
      fluid: 'cdw_sup',
      flowSourceTags: [tag],
      points: [
        [p.x, Y_PUMP_PORT, Z_PUMP_SUCT],
        [p.x, Y_PUMP_PORT, p.z + 0.62],
      ],
      radius: 0.11,
      particleCount: 2,
    });
    const frontRiserZ = p.z - 0.95;
    pipes.push({
      id: `cdw_disch_${n}`,
      layer: 'chiller',
      fluid: 'cdw_sup',
      flowSourceTags: [tag],
      points: [
        [p.x, Y_PUMP_PORT, p.z - 0.62],
        [p.x, Y_PUMP_PORT, frontRiserZ],
        [p.x, Y_CWP_DISCH, frontRiserZ],
        [p.x, Y_CWP_DISCH, Z_CWP_HDR],
      ],
      radius: 0.11,
      particleCount: 5,
    });
  }

  const cwpHdrMinX = Math.min(cdwX(ch11), cwp11.x);
  const cwpHdrMaxX = Math.max(cdwX(ch13), cwp13.x);
  pipes.push({
    id: 'cdw_disch_header',
    layer: 'chiller',
    fluid: 'cdw_sup',
    flowSourceTags: cwpTags,
    points: [
      [cwpHdrMaxX, Y_CWP_DISCH, Z_CWP_HDR],
      [cwpHdrMinX, Y_CWP_DISCH, Z_CWP_HDR],
    ],
    radius: 0.14,
    particleCount: 8,
  });
  sensors.push({
    id: 'sn_pit10505',
    layer: 'chiller',
    tag: 'B51F_PIT10505',
    shortLabel: 'PIT10505',
    pos: [-2.0, Y_CWP_DISCH + 0.55, Z_CWP_HDR],
    fluid: 'cdw_sup',
  });

  for (const [n, c] of [
    [11, ch11],
    [12, ch12],
    [13, ch13],
  ] as const) {
    const nx = cdwX(c);
    pipes.push({
      id: `cdw_in_ch${n}`,
      layer: 'chiller',
      fluid: 'cdw_sup',
      flowSourceTags: cwpTags,
      requireAllTags: [`B51F_CH${n}CDV`],
      points: [
        [nx, Y_CWP_DISCH, Z_CWP_HDR],
        [nx, Y_CWP_DISCH, Z_CHILLER_DROP_CDW],
        [nx, 0.72, Z_CHILLER_DROP_CDW],
        [nx, 0.72, frontZ(c)],
      ],
      radius: 0.11,
      particleCount: 5,
    });
  }

  // --- 1D. CONDENSER RETURN TO BACK OF 9 ELEVATED KINGSUN CTs (Y = 8.6m) (#2c5ec4) ---
  const Y_CT_IN_HDR = B5_CT_DECK_Y + 0.85; // 9.45m
  const Z_CT_IN_HDR = -13.35;

  for (const [n, c] of [
    [11, ch11],
    [12, ch12],
    [13, ch13],
  ] as const) {
    const nx = cdwX(c);
    const fz = frontZ(c);
    const riserZ = fz + 0.35;
    pipes.push({
      id: `cdw_out_ch${n}`,
      layer: 'chiller',
      fluid: 'cdw_ret',
      flowSourceTags: cwpTags,
      requireAllTags: [`B51F_CH${n}CDV`],
      points: [
        [nx, 1.38, fz],
        [nx, 1.38, riserZ],
        [nx, Y_CDW_RET, riserZ],
        [nx, Y_CDW_RET, Z_CHILLER_DROP_CDW],
      ],
      radius: 0.11,
      particleCount: 5,
    });
    valves.push({
      id: `vl_cdv${n}`,
      layer: 'chiller',
      tag: `B51F_CH${n}CDV`,
      shortLabel: `CDV1-${n - 10}`,
      pos: [nx, 3.2, riserZ],
      orientation: 'vertical',
    });
  }

  pipes.push({
    id: 'cdw_ret_to_cts',
    layer: 'chiller',
    fluid: 'cdw_ret',
    flowSourceTags: cwpTags,
    points: [
      [cdwX(ch11), Y_CDW_RET, Z_CHILLER_DROP_CDW],
      [cdwX(ch13), Y_CDW_RET, Z_CHILLER_DROP_CDW],
      [cdwX(ch13), Y_CDW_RET, Z_CT_IN_HDR],
      [cdwX(ch13), Y_CT_IN_HDR, Z_CT_IN_HDR],
    ],
    radius: 0.14,
    particleCount: 10,
  });
  pipes.push({
    id: 'cdw_ct_top_manifold',
    layer: 'chiller',
    fluid: 'cdw_ret',
    flowSourceTags: cwpTags,
    points: [
      [ctMinX, Y_CT_IN_HDR, Z_CT_IN_HDR],
      [ctMaxX, Y_CT_IN_HDR, Z_CT_IN_HDR],
    ],
    radius: 0.14,
    particleCount: 8,
  });

  for (const ct of cts) {
    const bz = ct.pos.z - 1.15;
    pipes.push({
      id: `cdw_ct_in_${ct.n}`,
      layer: 'chiller',
      fluid: 'cdw_ret',
      flowSourceTags: [`B51F_CT${ct.n}IV`],
      requireAllTags: cwpTags,
      points: [
        [ct.pos.x, Y_CT_IN_HDR, Z_CT_IN_HDR],
        [ct.pos.x, ct.pos.y + 2.35, Z_CT_IN_HDR],
        [ct.pos.x, ct.pos.y + 2.35, bz],
      ],
      radius: 0.095,
      particleCount: 3,
    });
    valves.push({
      id: `vl_ct${ct.n}iv`,
      layer: 'chiller',
      tag: `B51F_CT${ct.n}IV`,
      shortLabel: `CT${ct.n}IV`,
      pos: [ct.pos.x, (Y_CT_IN_HDR + ct.pos.y + 2.35) / 2, Z_CT_IN_HDR],
      orientation: 'vertical',
    });
  }

  // --- 1E. COMBINED HEAT RECOVERY SYSTEM (CH-14 + CH11HWP + HBPMV) ---
  const ch14HotX = cdwX(ch14);
  const Z_HW_SUP_HDR = 2.6;
  const Z_HW_RET_HDR = 5.95;

  pipes.push({
    id: 'hw_ret_to_hwp',
    layer: 'chiller',
    fluid: 'hw_ret',
    flowSourceTags: ['B51F_CH11HWP'],
    points: [
      [18.0, Y_HW_RET, Z_HW_RET_HDR],
      [hwp.x, Y_HW_RET, Z_HW_RET_HDR],
      [hwp.x, Y_HW_RET, Z_PUMP_SUCT],
      [hwp.x, Y_PUMP_PORT, Z_PUMP_SUCT],
      [hwp.x, Y_PUMP_PORT, hwp.z + 0.62],
    ],
    radius: 0.12,
    particleCount: 7,
  });
  sensors.push(
    { id: 'sn_hrts2', layer: 'chiller', tag: 'B51F_HRTS2', shortLabel: 'HRTS2', pos: [16.5, Y_HW_RET + 0.55, Z_HW_RET_HDR], fluid: 'hw_ret' },
    { id: 'sn_hbpps2', layer: 'chiller', tag: 'B51F_HBPPS2', shortLabel: 'HBPPS2', pos: [13.2, Y_HW_RET + 0.55, Z_HW_RET_HDR], fluid: 'hw_ret' },
    { id: 'sn_hbpts3', layer: 'chiller', tag: 'B51F_HBPTS3', shortLabel: 'HBPTS3', pos: [10.0, Y_HW_RET + 0.55, Z_HW_RET_HDR], fluid: 'hw_ret' }
  );

  const hwpFrontRiserZ = hwp.z - 0.95;
  pipes.push({
    id: 'hw_hwp_to_ch14',
    layer: 'chiller',
    fluid: 'hw_ret',
    flowSourceTags: ['B51F_CH11HWP'],
    requireAllTags: ['B51F_CH14CDV'],
    points: [
      [hwp.x, Y_PUMP_PORT, hwp.z - 0.62],
      [hwp.x, Y_PUMP_PORT, hwpFrontRiserZ],
      [hwp.x, Y_HW_DISCH, hwpFrontRiserZ],
      [hwp.x, Y_HW_DISCH, Z_CHILLER_DROP_CDW],
      [ch14HotX, Y_HW_DISCH, Z_CHILLER_DROP_CDW],
      [ch14HotX, 0.72, Z_CHILLER_DROP_CDW],
      [ch14HotX, 0.72, frontZ(ch14)],
    ],
    radius: 0.12,
    particleCount: 7,
  });
  sensors.push({
    id: 'sn_hclps1',
    layer: 'chiller',
    tag: 'B51F_HCLPS1',
    shortLabel: 'HCLPS1',
    pos: [hwp.x, Y_HW_DISCH + 0.55, 4.1],
    fluid: 'hw_ret',
  });

  const ch14RiserZ = frontZ(ch14) + 0.35;
  pipes.push({
    id: 'hw_sup_from_ch14',
    layer: 'chiller',
    fluid: 'hw_sup',
    flowSourceTags: ['B51F_CH11HWP'],
    requireAllTags: ['B51F_CH14CDV'],
    points: [
      [ch14HotX, 1.38, frontZ(ch14)],
      [ch14HotX, 1.38, ch14RiserZ],
      [ch14HotX, Y_HW_SUP, ch14RiserZ],
      [ch14HotX, Y_HW_SUP, Z_HW_SUP_HDR],
      [18.0, Y_HW_SUP, Z_HW_SUP_HDR],
    ],
    radius: 0.12,
    particleCount: 7,
  });
  valves.push({
    id: 'vl_cdv14',
    layer: 'chiller',
    tag: 'B51F_CH14CDV',
    shortLabel: 'CDV1-4',
    pos: [ch14HotX, 3.2, ch14RiserZ],
    orientation: 'vertical',
  });
  sensors.push(
    { id: 'sn_hsts1', layer: 'chiller', tag: 'B51F_HSTS1', shortLabel: 'HSTS1', pos: [16.5, Y_HW_SUP + 0.55, Z_HW_SUP_HDR], fluid: 'hw_sup' },
    { id: 'sn_hbpps1', layer: 'chiller', tag: 'B51F_HBPPS1', shortLabel: 'HBPPS1', pos: [12.5, Y_HW_SUP + 0.55, Z_HW_SUP_HDR], fluid: 'hw_sup' }
  );

  const hbpmvX = 14.8;
  pipes.push({
    id: 'hw_bypass_bridge',
    layer: 'chiller',
    fluid: 'hw_sup',
    flowSourceTags: ['B51F_HBPMV'],
    points: [
      [hbpmvX, Y_HW_SUP, Z_HW_SUP_HDR],
      [hbpmvX, Y_HW_RET, Z_HW_SUP_HDR],
      [hbpmvX, Y_HW_RET, Z_HW_RET_HDR],
    ],
    radius: 0.1,
    particleCount: 3,
  });
  valves.push({
    id: 'vl_hbpmv',
    layer: 'chiller',
    tag: 'B51F_HBPMV',
    shortLabel: 'HBPMV',
    pos: [hbpmvX, Y_HW_RET, (Z_HW_SUP_HDR + Z_HW_RET_HDR) / 2],
    orientation: 'horizontal_z',
  });

  // =========================================================================
  // LAYER 2: OUTDOOR PCW SILICON STATION (Outside Left Wall beside CH-11: 'pcw')
  //   100% Faithful to Scr_B5_PCW.Pdl & Real Site Layout:
  //   - CHW Supply Branch connects DIRECTLY from Chiller Supply Header (-18.0, Y_CHW_SUP, Z_CHW_SUP_HDR)
  //     into LEFT Bottom CHW Inlet of E-501A & E-501B; CHW Return exits LEFT Top of E-501A/B through
  //     Johnson Controls TCV-10501 / TCV-10502 and connects DIRECTLY back into Chiller Return Header (-18.0, Y_CHW_RET, Z_CHW_RET_HDR)!
  //   - PHE E-501A & E-501B sit SIDE-BY-SIDE PARALLEL to Left Wall (X=-20.6), all 4 ports on FRONT (-X) face:
  //       LEFT (-Z, z - 0.36) = CHW Supply (bottom) & CHW Return (top)
  //       RIGHT (+Z, z + 0.36) = PCW Warm In (bottom) & PCW Cold Out (top)
  //   - 3× Pumps P-501A/B/C sit on OUTERMOST EDGE (X=-32.2) farthest from wall -> Stainless Metal Filters FLT-501A/B (X=-26.2) -> PHE!
  //   - TK-501 sits on FAR RIGHT (+Z = +6.0) with TOP INLET (from XV-10501) and BOTTOM OUTLET into P-502 (to its right at Z = +8.6)!
  // =========================================================================
  const e501a = posOf('b5_e501a');
  const e501b = posOf('b5_e501b');
  const fltA = posOf('b5_flt501a');
  const fltB = posOf('b5_flt501b');
  const p501a = posOf('b5_p501a');
  const p501b = posOf('b5_p501b');
  const p501c = posOf('b5_p501c');
  const a501 = posOf('b5_a501');
  const tk502 = posOf('b5_tk502');
  const tk501 = posOf('b5_tk501');
  const p502 = posOf('b5_p502');
  const pcwPumpTags = ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'];

  // Exact PHE 4-port front face (+Z side when rotY = 0, perpendicular to left wall X=-18.2!):
  //   LEFT column (-X = he.x - 0.36)  = Chiller Water (CHW: Bottom=Supply In, Top=Return Out via TCV)
  //   RIGHT column (+X = he.x + 0.36) = PCW Water (Bottom=Warm In from FLT, Top=Cold Supply Out -> TT -> FIT -> Split!)
  //   Lower ports Y = 0.56; Upper ports Y = 1.88
  const heFaceZ = (he: { z: number }) => he.z + 0.72;
  const heChwX = (he: { x: number }) => he.x - 0.36;
  const hePcwX = (he: { x: number }) => he.x + 0.36;

  // All PCW & CHW pipe tracks strictly separated on X / Y / Z (ZERO overlapping pipes!)
  const Z_CHW_DROP = -1.1; // CHW Supply vertical drops cleanly in front of PHE LEFT ports
  const Z_CHW_RET_RISER = -1.55; // CHW Return vertical risers (carrying Johnson Controls TCV-10501/02)
  const Z_PCW_MERGE = -0.55; // PCW Supply merge line (E-501A/B -> TT10501/02 -> Merge -> FIT10501)
  const Y_PCW_SPLIT = 3.2; // Mid-high PCW Supply header through FIT10501 -> Split Tee at Z = +2.8
  const Z_PCW_SPLIT = 2.8; // Exact SCADA Split Node AFTER FIT10501: UP to 2F & DOWN to XV-10503/04!
  const Z_PCW_RET_CORR = 4.9; // Ground return track cleanly through corridor between TK-502 & TK-501
  const X_PCW_SUCT = -28.6; // Outermost suction header behind P-501A/B/C (-X side)
  const X_PCW_DISCH = -25.6; // Front discharge bus between P-501A/B/C and FLT-501A/B
  const rodiForPc = posOf('b5_rodi');

  // --- 2A. CHW SUPPLY DIRECT BRANCH FROM CHILLER SUPPLY HEADER -> E-501A & E-501B LEFT-BOTTOM PORTS ---
  pipes.push({
    id: 'pcw_chw_sup_from_chiller',
    layer: 'pcw',
    fluid: 'chw',
    flowSourceTags: ['B51F_TCV10501', 'B51F_TCV10502'],
    points: [
      [-18.0, Y_CHW_SUP, Z_CHW_SUP_HDR],
      [-19.0, Y_CHW_SUP, Z_CHW_SUP_HDR],
      [-19.0, Y_CHW_SUP, Z_CHW_DROP],
      [heChwX(e501b), Y_CHW_SUP, Z_CHW_DROP],
      [heChwX(e501b), 0.56, Z_CHW_DROP],
      [heChwX(e501b), 0.56, heFaceZ(e501b)],
    ],
    radius: 0.11,
    particleCount: 10,
  });
  pipes.push({
    id: 'pcw_chw_sup_e501a',
    layer: 'pcw',
    fluid: 'chw',
    flowSourceTags: ['B51F_TCV10501'],
    points: [
      [heChwX(e501a), Y_CHW_SUP, Z_CHW_DROP],
      [heChwX(e501a), 0.56, Z_CHW_DROP],
      [heChwX(e501a), 0.56, heFaceZ(e501a)],
    ],
    radius: 0.11,
    particleCount: 5,
  });

  // --- 2B. CHW RETURN FROM E-501A & E-501B LEFT-TOP PORTS -> JOHNSON CONTROLS TCV-10501/02 -> DIRECTLY BACK TO CHILLER RETURN HEADER ---
  pipes.push({
    id: 'pcw_chw_ret_e501b',
    layer: 'pcw',
    fluid: 'chwr',
    flowSourceTags: ['B51F_TCV10502'],
    points: [
      [heChwX(e501b), 1.88, heFaceZ(e501b)],
      [heChwX(e501b), 1.88, Z_CHW_RET_RISER],
      [heChwX(e501b), Y_CHW_RET, Z_CHW_RET_RISER],
      [-18.6, Y_CHW_RET, Z_CHW_RET_RISER],
      [-18.6, Y_CHW_RET, Z_CHW_RET_HDR],
      [-18.0, Y_CHW_RET, Z_CHW_RET_HDR],
    ],
    radius: 0.11,
    particleCount: 10,
  });
  pipes.push({
    id: 'pcw_chw_ret_e501a',
    layer: 'pcw',
    fluid: 'chwr',
    flowSourceTags: ['B51F_TCV10501'],
    points: [
      [heChwX(e501a), 1.88, heFaceZ(e501a)],
      [heChwX(e501a), 1.88, Z_CHW_RET_RISER],
      [heChwX(e501a), Y_CHW_RET, Z_CHW_RET_RISER],
    ],
    radius: 0.11,
    particleCount: 5,
  });
  valves.push(
    {
      id: 'vl_tcv10501',
      layer: 'pcw',
      tag: 'B51F_TCV10501',
      shortLabel: 'TCV10501',
      pos: [heChwX(e501a), 3.4, Z_CHW_RET_RISER],
      orientation: 'vertical',
      valveStyle: 'control',
    },
    {
      id: 'vl_tcv10502',
      layer: 'pcw',
      tag: 'B51F_TCV10502',
      shortLabel: 'TCV10502',
      pos: [heChwX(e501b), 3.4, Z_CHW_RET_RISER],
      orientation: 'vertical',
      valveStyle: 'control',
    }
  );

  // --- 2C. PCW SUCTION BUS (A-501 + TK-502 + XV-10502 RO Makeup + PIT-10501 -> OUTER PUMPS P-501A/B/C) ---
  pipes.push({
    id: 'pcw_suct_bus',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: pcwPumpTags,
    points: [
      [X_PCW_SUCT, Y_PUMP_PORT, a501.z],
      [X_PCW_SUCT, Y_PUMP_PORT, p501a.z],
    ],
    radius: 0.12,
    particleCount: 6,
  });
  pipes.push({
    id: 'pcw_a501_to_suct',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: pcwPumpTags,
    points: [
      [tk502.x, Y_PUMP_PORT, a501.z],
      [a501.x, Y_PUMP_PORT, a501.z],
      [X_PCW_SUCT, Y_PUMP_PORT, a501.z],
    ],
    radius: 0.12,
    particleCount: 4,
  });
  pipes.push({
    id: 'pcw_tk502_drop',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: pcwPumpTags,
    points: [
      [tk502.x, Y_PUMP_PORT, tk502.z],
      [tk502.x, Y_PUMP_PORT, a501.z],
    ],
    radius: 0.1,
    particleCount: 2,
  });
  sensors.push({
    id: 'sn_pit10501',
    layer: 'pcw',
    tag: 'B51F_PIT10501',
    shortLabel: 'PIT10501',
    pos: [-24.75, Y_PUMP_PORT + 0.55, a501.z],
    fluid: 'pcw_ret',
  });

  // 3× Vertical PCW Pumps (P-501A/B/C at outermost X = -27.2): Rear Suction (-X) -> Front Discharge (+X)
  for (const [k, p] of [
    ['a', p501a],
    ['b', p501b],
    ['c', p501c],
  ] as const) {
    const tag = `B51F_P501${k.toUpperCase()}`;
    pipes.push({
      id: `pcw_p501${k}_suct`,
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: [tag],
      points: [
        [X_PCW_SUCT, Y_PUMP_PORT, p.z],
        [p.x - 0.62, Y_PUMP_PORT, p.z],
      ],
      radius: 0.1,
      particleCount: 2,
    });
    pipes.push({
      id: `pcw_p501${k}_disch`,
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: [tag],
      points: [
        [p.x + 0.62, Y_PUMP_PORT, p.z],
        [X_PCW_DISCH, Y_PUMP_PORT, p.z],
      ],
      radius: 0.1,
      particleCount: 2,
    });
  }
  pipes.push({
    id: 'pcw_disch_bus',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: pcwPumpTags,
    points: [
      [X_PCW_DISCH, Y_PUMP_PORT, p501a.z],
      [X_PCW_DISCH, Y_PUMP_PORT, fltB.z + 1.0],
      [fltA.x - 0.55, Y_PUMP_PORT, fltB.z + 1.0],
    ],
    radius: 0.12,
    particleCount: 7,
  });

  // --- 2D. PUMP DISCHARGE -> STAINLESS METAL BAG FILTERS (FLT-501A/B) -> PHE RIGHT-BOTTOM PCW INLETS ---
  for (const [k, flt, he] of [
    ['a', fltA, e501a],
    ['b', fltB, e501b],
  ] as const) {
    pipes.push({
      id: `pcw_to_flt_${k}`,
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumpTags,
      points: [
        [flt.x - 0.55, Y_PUMP_PORT, flt.z + 1.0],
        [flt.x - 0.55, Y_PUMP_PORT, flt.z],
        [flt.x - 0.55, 1.45, flt.z],
        [flt.x - 0.45, 1.45, flt.z],
      ],
      radius: 0.1,
      particleCount: 4,
    });
    pipes.push({
      id: `pcw_flt_to_he_${k}`,
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumpTags,
      points: [
        [flt.x + 0.45, 0.56, flt.z],
        [flt.x + 0.45, 0.56, flt.z - 0.65],
        [hePcwX(he), 0.56, flt.z - 0.65],
        [hePcwX(he), 0.56, heFaceZ(he)],
      ],
      radius: 0.1,
      particleCount: 4,
    });
  }

  // --- 2E. EXACT SCADA PCW SUPPLY TREE (#00cfe8):
  //   E-501A -> TT10501 + E-501B -> TT10502 -> Merge -> FIT10501 -> SPLIT TEE (Z=+2.8, Y=3.2):
  //     (1) Branch UP straight to Building 5 - 2nd Floor (DPT10501 & TT10503 live on 2F, NOT 1F!)
  //     (2) Branch DOWN into 2 parallel manual bypass valves XV-10503 & XV-10504!
  //         ABOVE XV-10503/04 = Bright Cyan (#00cfe8); BELOW XV-10503/04 = Dark Teal (#009999) merging into Main Return! ---
  const X_PCW_SUP_COL = hePcwX(e501a); // -19.64 (strictly clear of CHW Supply at -19.0 & CHW Return at -18.6!)
  pipes.push({
    id: 'pcw_sup_e501b_merge',
    layer: 'pcw',
    fluid: 'pcw',
    flowSourceTags: pcwPumpTags,
    points: [
      [hePcwX(e501b), 1.88, heFaceZ(e501b)],
      [hePcwX(e501b), 1.88, Z_PCW_MERGE],
      [X_PCW_SUP_COL, 1.88, Z_PCW_MERGE],
    ],
    radius: 0.11,
    particleCount: 5,
  });
  pipes.push({
    id: 'pcw_sup_e501a_to_fit_split',
    layer: 'pcw',
    fluid: 'pcw',
    flowSourceTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, 1.88, heFaceZ(e501a)],
      [X_PCW_SUP_COL, 1.88, Z_PCW_MERGE],
      [X_PCW_SUP_COL, Y_PCW_SPLIT, Z_PCW_MERGE],
      [X_PCW_SUP_COL, Y_PCW_SPLIT, Z_PCW_SPLIT],
    ],
    radius: 0.12,
    particleCount: 7,
  });
  // Branch 1 AFTER FIT10501: Straight UP from Split Tee (-19.64, 3.2, +2.8) to Building 5 - 2nd Floor!
  pipes.push({
    id: 'pcw_sup_up_to_2f',
    layer: 'pcw',
    fluid: 'pcw',
    flowSourceTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, Y_PCW_SPLIT, Z_PCW_SPLIT],
      [X_PCW_SUP_COL, 7.6, Z_PCW_SPLIT],
    ],
    radius: 0.12,
    particleCount: 5,
  });
  // Branch 2 AFTER FIT10501: Straight DOWN into XV-10503 (Z=+2.8) + 90° parallel branch to XV-10504 (Z=+3.9) — Cyan ABOVE both valves!
  pipes.push({
    id: 'pcw_bypass_above_xv03',
    layer: 'pcw',
    fluid: 'pcw',
    flowSourceTags: ['B51F_XV10503'],
    requireAllTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, Y_PCW_SPLIT, Z_PCW_SPLIT],
      [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT],
    ],
    radius: 0.095,
    particleCount: 2,
  });
  pipes.push({
    id: 'pcw_bypass_above_xv04',
    layer: 'pcw',
    fluid: 'pcw',
    flowSourceTags: ['B51F_XV10504'],
    requireAllTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, 2.65, Z_PCW_SPLIT],
      [X_PCW_SUP_COL, 2.65, Z_PCW_SPLIT + 1.1],
      [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT + 1.1],
    ],
    radius: 0.095,
    particleCount: 3,
  });
  valves.push(
    {
      id: 'vl_b51f_xv10503',
      layer: 'pcw',
      tag: 'B51F_XV10503',
      shortLabel: 'XV10503',
      pos: [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT],
      orientation: 'vertical',
      valveStyle: 'xv',
    },
    {
      id: 'vl_b51f_xv10504',
      layer: 'pcw',
      tag: 'B51F_XV10504',
      shortLabel: 'XV10504',
      pos: [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT + 1.1],
      orientation: 'vertical',
      valveStyle: 'xv',
    }
  );
  // BELOW XV-10503 & XV-10504 -> turns Dark Teal (#009999), merges together, and joins Main PCW Return Drop!
  pipes.push({
    id: 'pcw_bypass_below_xv03',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: ['B51F_XV10503'],
    requireAllTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT],
      [X_PCW_SUP_COL, Y_PUMP_PORT, Z_PCW_SPLIT],
      [X_PCW_SUP_COL, Y_PUMP_PORT, Z_PCW_RET_CORR],
    ],
    radius: 0.095,
    particleCount: 3,
  });
  pipes.push({
    id: 'pcw_bypass_below_xv04',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: ['B51F_XV10504'],
    requireAllTags: pcwPumpTags,
    points: [
      [X_PCW_SUP_COL, 1.8, Z_PCW_SPLIT + 1.1],
      [X_PCW_SUP_COL, Y_PUMP_PORT, Z_PCW_SPLIT + 1.1],
    ],
    radius: 0.095,
    particleCount: 2,
  });

  // 1F PCW Supply Sensors ONLY (TT10501, TT10502, FIT10501 — DPT10501 & TT10503 belong on Building 5 2nd Floor!)
  sensors.push(
    { id: 'sn_tt10501', layer: 'pcw', tag: 'B51F_TT10501', shortLabel: 'TT10501', pos: [X_PCW_SUP_COL, 1.88 + 0.55, (heFaceZ(e501a) + Z_PCW_MERGE) / 2], fluid: 'pcw' },
    { id: 'sn_tt10502', layer: 'pcw', tag: 'B51F_TT10502', shortLabel: 'TT10502', pos: [hePcwX(e501b), 1.88 + 0.55, (heFaceZ(e501b) + Z_PCW_MERGE) / 2], fluid: 'pcw' },
    { id: 'sn_fit10501', layer: 'pcw', tag: 'B51F_FIT10501', shortLabel: 'FIT10501', pos: [X_PCW_SUP_COL, Y_PCW_SPLIT + 0.55, 1.35], fluid: 'pcw' }
  );

  // --- 2F. MAIN PCW RETURN DROP FROM 2ND FLOOR (#009999) -> MERGES XV10503/04 BYPASS -> AIR SEPARATOR A-501 ---
  pipes.push({
    id: 'pcw_ret_from_2f',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: pcwPumpTags,
    points: [
      [-18.8, 7.6, Z_PCW_RET_CORR],
      [-18.8, Y_PUMP_PORT, Z_PCW_RET_CORR],
      [X_PCW_SUP_COL, Y_PUMP_PORT, Z_PCW_RET_CORR],
      [a501.x, Y_PUMP_PORT, Z_PCW_RET_CORR],
      [a501.x, Y_PUMP_PORT, a501.z],
    ],
    radius: 0.12,
    particleCount: 10,
  });

  // --- 2G. RO WATER MAKEUP PIPE ROUTED FROM DI ROOM AROUND BACK OF BUILDING 5 (CT SIDE, Z=-6.4, Y=4.2m) -> XV-10502 -> SUCTION BUS ---
  const X_RO_DROP = -25.4;
  pipes.push({
    id: 'pcw_ro_makeup',
    layer: 'pcw',
    fluid: 'di',
    flowSourceTags: ['B51F_XV10502'],
    points: [
      [rodiForPc.x, 2.4, rodiForPc.z - 1.8],
      [rodiForPc.x, 2.4, -6.4],
      [rodiForPc.x, 4.2, -6.4],
      [X_RO_DROP, 4.2, -6.4],
      [X_RO_DROP, 4.2, a501.z],
      [X_RO_DROP, Y_PUMP_PORT, a501.z],
    ],
    radius: 0.095,
    particleCount: 16,
  });
  valves.push({
    id: 'vl_xv10502',
    layer: 'pcw',
    tag: 'B51F_XV10502',
    shortLabel: 'XV10502',
    pos: [X_RO_DROP, 4.2, 2.3],
    orientation: 'horizontal_z',
    valveStyle: 'xv',
  });

  // --- 2H. DRAIN RELIEF LINE (XV-10501) -> HOPS CLEANLY OVER RETURN TRACK -> ENTERS FROM TOP OF TK-501 -> BOTTOM OUTLET TO P-502 ---
  const X_DRAIN_RISER = -25.1;
  pipes.push({
    id: 'pcw_drain_to_tk501_top',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: ['B51F_XV10501'],
    points: [
      [X_DRAIN_RISER, Y_PUMP_PORT, a501.z],
      [X_DRAIN_RISER, 1.15, a501.z],
      [X_DRAIN_RISER, 1.15, tk501.z],
      [X_DRAIN_RISER, 3.65, tk501.z],
      [tk501.x, 3.65, tk501.z],
      [tk501.x, 3.1, tk501.z],
    ],
    radius: 0.095,
    particleCount: 6,
  });
  valves.push({
    id: 'vl_xv10501',
    layer: 'pcw',
    tag: 'B51F_XV10501',
    shortLabel: 'XV10501',
    pos: [X_DRAIN_RISER, 2.25, tk501.z],
    orientation: 'vertical',
    valveStyle: 'xv',
  });
  sensors.push({
    id: 'sn_lt10501',
    layer: 'pcw',
    tag: 'B51F_LT10501',
    shortLabel: 'LT10501',
    pos: [tk501.x, 3.75, tk501.z],
    fluid: 'pcw',
  });

  // BOTTOM OUTLET OF TK-501 -> REAR SUCTION OF P-502 (to the RIGHT / +Z of TK-501) -> WW REJECT!
  pipes.push({
    id: 'pcw_tk501_bottom_to_p502',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: ['B51F_P502'],
    points: [
      [tk501.x, Y_PUMP_PORT, tk501.z + 0.9],
      [p502.x, Y_PUMP_PORT, p502.z - 0.62],
    ],
    radius: 0.095,
    particleCount: 3,
  });
  pipes.push({
    id: 'pcw_p502_reject',
    layer: 'pcw',
    fluid: 'pcw_ret',
    flowSourceTags: ['B51F_P502'],
    points: [
      [p502.x, Y_PUMP_PORT, p502.z + 0.62],
      [p502.x, Y_PUMP_PORT, 9.6],
      [-19.5, Y_PUMP_PORT, 9.6],
    ],
    radius: 0.095,
    particleCount: 4,
  });

  // =========================================================================
  // LAYER 3: COMPRESSED AIR ROOM (OFRAC + OFLAC + VACUUM PV: 'ac')
  //   ALL piping & instruments elevated on ceiling, strictly 90° orthogonal & ZERO overlaps!
  //   - Compressors lined up from Inner Wall (+Z) -> CT Wall (-Z): AC-101 -> AC-102 -> AC-201 -> AC-202 -> AC-204
  //   - OFRAC Cooling Water: Blue Horizontal End-Suction Pumps (P-10101A/B) drawing directly from CT Supply (#5da0e8)
  //     -> Common Top Discharge with Paddle Flow Switch (FS-10101) -> AC-101 & AC-102 -> Return (#2c5ec4) back to CT!
  //   - Process Vacuum (PV): Ceiling Vacuum Header (terminating at 7.2m for upper floors) + PIT1301 -> Receiver V-1301
  //     -> PV-1301A/B Suction IN (#a8a228) -> PV-1301A/B Exhaust OUT (#f97316) -> Ceiling Vent Stack (7.2m)!
  // =========================================================================
  const ac101 = posOf('b5_ac101');
  const ac102 = posOf('b5_ac102');
  const ac201 = posOf('b5_ac201');
  const ac202 = posOf('b5_ac202');
  const ac204 = posOf('b5_ac204');
  const v101a = posOf('b5_v101a');
  const v101b = posOf('b5_v101b');
  const v201a = posOf('b5_v201a');
  const v201b = posOf('b5_v201b');
  const ad101a = posOf('b5_ad101a');
  const ad102a = posOf('b5_ad102a');
  const ad101b = posOf('b5_ad101b');
  const ad102b = posOf('b5_ad102b');
  const ad201a = posOf('b5_ad201a');
  const ad202a = posOf('b5_ad202a');
  const ad202b = posOf('b5_ad202b');
  const cpA = posOf('b5_p10101a');
  const cpB = posOf('b5_p10101b');
  const v1301 = posOf('b5_v1301');
  const pvA = posOf('b5_pv1301a');
  const pvB = posOf('b5_pv1301b');

  const ofracAcTags = ['B51F_AC101', 'B51F_AC102'];
  const oflacAcTags = ['B51F_AC201', 'B51F_AC202', 'B51F_AC204'];
  const ofracCpTags = ['B51F_P10101A', 'B51F_P10101B'];
  const pvTags = ['B51F_PV1301A', 'B51F_PV1301B'];
  const Y_AIR_COLL = 5.55;
  const Y_AIR_DRY = 6.05;
  const Y_AC_CW_DISCH = 6.15; // P-10101A/B discharge -> AC-101/102 (cdw_sup #5da0e8)
  const Y_AC_CW_SUP = 6.55; // CT supply -> P-10101A/B suction (cdw_sup #5da0e8)
  const Y_AC_CW_RET = 6.95; // AC-101/102 return -> back to CT (cdw_ret #2c5ec4)

  // --- 3A. OFRAC COMPRESSED AIR TRAIN (AC-101, AC-102 -> V-101A -> AD-101A/102A & AD-101B/102B -> V-101B -> Ceiling PIT10101/AIT10101) ---
  for (const [k, ac] of [
    ['101', ac101],
    ['102', ac102],
  ] as const) {
    pipes.push({
      id: `ofrac_ac${k}_up`,
      layer: 'ac',
      fluid: 'air',
      flowSourceTags: [`B51F_AC${k}`],
      points: [
        [ac.x + 1.1, 2.0, ac.z],
        [ac.x + 1.1, Y_AIR_COLL, ac.z],
        [27.4, Y_AIR_COLL, ac.z],
      ],
      radius: 0.1,
      particleCount: 4,
    });
  }
  pipes.push({
    id: 'ofrac_coll_to_v101a',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ofracAcTags,
    points: [
      [27.4, Y_AIR_COLL, ac101.z],
      [27.4, Y_AIR_COLL, ac102.z],
    ],
    radius: 0.12,
    particleCount: 4,
  });
  pipes.push({
    id: 'ofrac_feed_v101a',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ofracAcTags,
    points: [
      [27.4, Y_AIR_COLL, v101a.z],
      [v101a.x - 0.32, Y_AIR_COLL, v101a.z],
      [v101a.x - 0.32, 3.05, v101a.z],
    ],
    radius: 0.12,
    particleCount: 4,
  });
  // V-101A (+0.32 outlet nozzle) -> Overhead Split -> Dual Dryer Trains (A & B) -> V-101B (-0.32 inlet nozzle)
  pipes.push({
    id: 'ofrac_v101a_to_split',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ofracAcTags,
    points: [
      [v101a.x + 0.32, 3.05, v101a.z],
      [v101a.x + 0.32, Y_AIR_DRY, v101a.z],
      [31.4, Y_AIR_DRY, v101a.z],
      [31.4, Y_AIR_DRY, ad101a.z],
      [39.2, Y_AIR_DRY, ad101a.z],
      [39.2, Y_AIR_DRY, v101b.z],
      [v101b.x - 0.32, Y_AIR_DRY, v101b.z],
      [v101b.x - 0.32, 3.05, v101b.z],
    ],
    radius: 0.11,
    particleCount: 10,
  });
  pipes.push({
    id: 'ofrac_train_b_overhead',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ['B51F_AD101B', 'B51F_AD102B'],
    requireAllTags: ofracAcTags,
    points: [
      [31.4, Y_AIR_DRY, v101a.z],
      [31.4, Y_AIR_DRY, ad101b.z],
      [39.2, Y_AIR_DRY, ad101b.z],
      [39.2, Y_AIR_DRY, v101b.z],
    ],
    radius: 0.1,
    particleCount: 6,
  });
  // Vertical drops into each OFRAC Air Dryer
  for (const [id, tag, ad] of [
    ['ad101a', 'B51F_AD101A', ad101a],
    ['ad102a', 'B51F_AD102A', ad102a],
    ['ad101b', 'B51F_AD101B', ad101b],
    ['ad102b', 'B51F_AD102B', ad102b],
  ] as const) {
    pipes.push({
      id: `ofrac_drop_${id}`,
      layer: 'ac',
      fluid: 'air',
      flowSourceTags: [tag],
      requireAllTags: ofracAcTags,
      points: [
        [ad.x, Y_AIR_DRY, ad.z],
        [ad.x, 2.7, ad.z],
      ],
      radius: 0.085,
      particleCount: 2,
    });
  }
  // V-101B (+0.32 outlet nozzle) -> Overhead Header -> PIT10101 & AIT10101 -> Out (+X) toward RO-DI & B5 2F
  pipes.push({
    id: 'ofrac_out_header',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ofracAcTags,
    points: [
      [v101b.x + 0.32, 3.05, v101b.z],
      [v101b.x + 0.32, Y_AIR_COLL, v101b.z],
      [45.5, Y_AIR_COLL, v101b.z],
    ],
    radius: 0.12,
    particleCount: 5,
  });
  sensors.push(
    { id: 'sn_pit10101', layer: 'ac', tag: 'B51F_PIT10101', shortLabel: 'PIT10101', pos: [43.0, Y_AIR_COLL + 0.55, v101b.z], fluid: 'air' },
    { id: 'sn_ait10101', layer: 'ac', tag: 'B51F_AIT10101', shortLabel: 'AIT10101', pos: [44.8, Y_AIR_COLL + 0.55, v101b.z], fluid: 'air' }
  );

  // --- 3A-CW. OFRAC COOLING WATER LOOP CONNECTED DIRECTLY TO COOLING TOWERS! ---
  //   Colors match Cooling Tower Supply (#5da0e8 cdw_sup) & Return (#2c5ec4 cdw_ret)!
  //   Horizontal Pumps P-10101A/B (per user specification):
  //     - INLET  (Đầu vào — đổ từ trên xuống): Top Vertical Flange (p.x, Y=0.92, p.z - 0.34)
  //     - OUTLET (Đầu ra — ngang với sàn):     Lower Front Horizontal Flange (p.x, Y=0.42, p.z - 0.68)
  //     - Common Discharge Line carries Paddle Flow Switch FS-10101!
  const Y_HPUMP_OUT = 0.42; // Lower horizontal outlet flange (near floor)
  const Y_HPUMP_IN = 0.92; // Top vertical inlet flange (fed from above)
  const Z_CP_OUT_FLANGE = cpA.z - 0.68; // 7.52
  const Z_CP_OUT_BUS = cpA.z - 1.15; // 7.05 (floor-level common discharge header right in front of pumps!)
  const Z_CP_TOP_IN = cpA.z - 0.34; // 7.86 (aligned straight above top vertical inlet flanges!)
  const Y_CP_IN_MANIFOLD = 2.15; // Overhead split manifold pouring straight down into both pumps' top inlets
  const X_CP_IN_DROP = (cpA.x + cpB.x) / 2; // 29.9
  const X_CP_DISCH_RISER = 26.8;
  const X_AC_CW_SUP_FEED = 22.2; // Overhead CT -> Pump Top-Inlet trunk
  const X_AC_CW_RET_TRUNK = 22.6; // Overhead AC Return -> CT trunk
  const X_AC_CW_DISCH_TRUNK = 23.0; // Overhead Pump Discharge -> AC-101/102 trunk

  // 1) CT Supply Header (cdw_ct_out_header end at X=ctMaxX, Y=8.95, Z=-12.75) -> Overhead Trunk -> Pours DOWN into Top Inlets of P-10101A/B
  pipes.push({
    id: 'ofrac_cw_from_ct',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ofracCpTags,
    points: [
      [ctMaxX, Y_CT_OUT_DECK, Z_CT_OUT_HDR],
      [X_AC_CW_SUP_FEED, Y_CT_OUT_DECK, Z_CT_OUT_HDR],
      [X_AC_CW_SUP_FEED, Y_AC_CW_SUP, Z_CT_OUT_HDR],
      [X_AC_CW_SUP_FEED, Y_AC_CW_SUP, Z_CP_TOP_IN],
      [X_CP_IN_DROP, Y_AC_CW_SUP, Z_CP_TOP_IN],
      [X_CP_IN_DROP, Y_CP_IN_MANIFOLD, Z_CP_TOP_IN],
    ],
    radius: 0.1,
    particleCount: 12,
  });
  pipes.push({
    id: 'ofrac_cw_in_cpa',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ['B51F_P10101A'],
    points: [
      [X_CP_IN_DROP, Y_CP_IN_MANIFOLD, Z_CP_TOP_IN],
      [cpA.x, Y_CP_IN_MANIFOLD, Z_CP_TOP_IN],
      [cpA.x, Y_HPUMP_IN, Z_CP_TOP_IN],
    ],
    radius: 0.085,
    particleCount: 3,
  });
  pipes.push({
    id: 'ofrac_cw_in_cpb',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ['B51F_P10101B'],
    points: [
      [X_CP_IN_DROP, Y_CP_IN_MANIFOLD, Z_CP_TOP_IN],
      [cpB.x, Y_CP_IN_MANIFOLD, Z_CP_TOP_IN],
      [cpB.x, Y_HPUMP_IN, Z_CP_TOP_IN],
    ],
    radius: 0.085,
    particleCount: 3,
  });

  // 2) Lower Horizontal Outlet of P-10101A & P-10101B (near floor Y=0.42) -> Merge into Common Discharge -> Flow Switch FS-10101 -> Ceiling -> AC-101 & AC-102
  pipes.push({
    id: 'ofrac_cw_disch_cpb',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ['B51F_P10101B'],
    points: [
      [cpB.x, Y_HPUMP_OUT, Z_CP_OUT_FLANGE],
      [cpB.x, Y_HPUMP_OUT, Z_CP_OUT_BUS],
      [cpA.x, Y_HPUMP_OUT, Z_CP_OUT_BUS],
    ],
    radius: 0.085,
    particleCount: 3,
  });
  pipes.push({
    id: 'ofrac_cw_disch_cpa',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ['B51F_P10101A'],
    points: [
      [cpA.x, Y_HPUMP_OUT, Z_CP_OUT_FLANGE],
      [cpA.x, Y_HPUMP_OUT, Z_CP_OUT_BUS],
    ],
    radius: 0.085,
    particleCount: 2,
  });
  pipes.push({
    id: 'ofrac_cw_disch_common',
    layer: 'ac',
    fluid: 'cdw_sup',
    flowSourceTags: ofracCpTags,
    points: [
      [cpA.x, Y_HPUMP_OUT, Z_CP_OUT_BUS],
      [X_CP_DISCH_RISER, Y_HPUMP_OUT, Z_CP_OUT_BUS],
      [X_CP_DISCH_RISER, Y_AC_CW_DISCH, Z_CP_OUT_BUS],
      [X_AC_CW_DISCH_TRUNK, Y_AC_CW_DISCH, Z_CP_OUT_BUS],
      [X_AC_CW_DISCH_TRUNK, Y_AC_CW_DISCH, ac102.z - 0.35],
    ],
    radius: 0.095,
    particleCount: 9,
  });
  // Paddle Flow Switch FS-10101 bolted directly onto Elevated Overhead Common Discharge Header (Y = 6.15m)!
  sensors.push({
    id: 'sn_fs10101',
    layer: 'ac',
    tag: 'B51F_P10101A',
    shortLabel: 'FS-10101',
    pos: [(X_CP_DISCH_RISER + X_AC_CW_DISCH_TRUNK) / 2, Y_AC_CW_DISCH + 0.55, Z_CP_OUT_BUS],
    fluid: 'cdw_sup',
    kind: 'flow_switch',
    flowSourceTags: ofracCpTags,
  });
  // Cooling Water Supply drops into BOTH AC-101 & AC-102 (lower side port Y=0.85, Z = ac.z - 0.35)
  for (const [k, ac] of [
    ['101', ac101],
    ['102', ac102],
  ] as const) {
    pipes.push({
      id: `ofrac_cw_in_ac${k}`,
      layer: 'ac',
      fluid: 'cdw_sup',
      flowSourceTags: ofracCpTags,
      points: [
        [X_AC_CW_DISCH_TRUNK, Y_AC_CW_DISCH, ac.z - 0.35],
        [X_AC_CW_DISCH_TRUNK, 0.85, ac.z - 0.35],
        [ac.x - 1.4, 0.85, ac.z - 0.35],
      ],
      radius: 0.08,
      particleCount: 3,
    });
  }

  // 3) Cooling Water Return from BOTH AC-101 & AC-102 (#2c5ec4 cdw_ret) -> Ceiling Trunk -> Loops Back into CT Return Manifold!
  for (const [k, ac] of [
    ['101', ac101],
    ['102', ac102],
  ] as const) {
    pipes.push({
      id: `ofrac_cw_out_ac${k}`,
      layer: 'ac',
      fluid: 'cdw_ret',
      flowSourceTags: ofracCpTags,
      points: [
        [ac.x - 1.4, 1.45, ac.z + 0.35],
        [X_AC_CW_RET_TRUNK, 1.45, ac.z + 0.35],
        [X_AC_CW_RET_TRUNK, Y_AC_CW_RET, ac.z + 0.35],
      ],
      radius: 0.08,
      particleCount: 3,
    });
  }
  pipes.push({
    id: 'ofrac_cw_ret_to_ct',
    layer: 'ac',
    fluid: 'cdw_ret',
    flowSourceTags: ofracCpTags,
    points: [
      [X_AC_CW_RET_TRUNK, Y_AC_CW_RET, ac101.z + 0.35],
      [X_AC_CW_RET_TRUNK, Y_AC_CW_RET, Z_CT_IN_HDR],
      [X_AC_CW_RET_TRUNK, Y_CT_IN_HDR, Z_CT_IN_HDR],
      [ctMaxX, Y_CT_IN_HDR, Z_CT_IN_HDR],
    ],
    radius: 0.1,
    particleCount: 12,
  });

  // --- 3B. OFLAC COMPRESSED AIR TRAIN (AC-201, AC-202, AC-204 -> V-201A -> AD-201A/202A & AD-202B -> V-201B -> Ceiling PIT20101/AIT20101) ---
  for (const [k, ac] of [
    ['201', ac201],
    ['202', ac202],
    ['204', ac204],
  ] as const) {
    pipes.push({
      id: `oflac_ac${k}_up`,
      layer: 'ac',
      fluid: 'air',
      flowSourceTags: [`B51F_AC${k}`],
      points: [
        [ac.x + 1.1, 2.0, ac.z],
        [ac.x + 1.1, Y_AIR_COLL, ac.z],
        [27.4, Y_AIR_COLL, ac.z],
      ],
      radius: 0.1,
      particleCount: 4,
    });
  }
  pipes.push({
    id: 'oflac_coll_bus',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: oflacAcTags,
    points: [
      [27.4, Y_AIR_COLL, ac201.z],
      [27.4, Y_AIR_COLL, ac204.z],
    ],
    radius: 0.12,
    particleCount: 5,
  });
  pipes.push({
    id: 'oflac_feed_v201a',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: oflacAcTags,
    points: [
      [27.4, Y_AIR_COLL, v201a.z],
      [v201a.x - 0.32, Y_AIR_COLL, v201a.z],
      [v201a.x - 0.32, 3.05, v201a.z],
    ],
    radius: 0.12,
    particleCount: 4,
  });
  pipes.push({
    id: 'oflac_v201a_to_v201b',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: oflacAcTags,
    points: [
      [v201a.x + 0.32, 3.05, v201a.z],
      [v201a.x + 0.32, Y_AIR_DRY, v201a.z],
      [31.4, Y_AIR_DRY, v201a.z],
      [31.4, Y_AIR_DRY, ad201a.z],
      [39.2, Y_AIR_DRY, ad201a.z],
      [39.2, Y_AIR_DRY, v201b.z],
      [v201b.x - 0.32, Y_AIR_DRY, v201b.z],
      [v201b.x - 0.32, 3.05, v201b.z],
    ],
    radius: 0.11,
    particleCount: 10,
  });
  pipes.push({
    id: 'oflac_train_b_overhead',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: ['B51F_AD202B'],
    requireAllTags: oflacAcTags,
    points: [
      [31.4, Y_AIR_DRY, v201a.z],
      [31.4, Y_AIR_DRY, ad202b.z],
      [39.2, Y_AIR_DRY, ad202b.z],
      [39.2, Y_AIR_DRY, v201b.z],
    ],
    radius: 0.1,
    particleCount: 6,
  });
  for (const [id, tag, ad] of [
    ['ad201a', 'B51F_AD201A', ad201a],
    ['ad202a', 'B51F_AD202A', ad202a],
    ['ad202b', 'B51F_AD202B', ad202b],
  ] as const) {
    pipes.push({
      id: `oflac_drop_${id}`,
      layer: 'ac',
      fluid: 'air',
      flowSourceTags: [tag],
      requireAllTags: oflacAcTags,
      points: [
        [ad.x, Y_AIR_DRY, ad.z],
        [ad.x, 2.7, ad.z],
      ],
      radius: 0.085,
      particleCount: 2,
    });
  }
  pipes.push({
    id: 'oflac_out_header',
    layer: 'ac',
    fluid: 'air',
    flowSourceTags: oflacAcTags,
    points: [
      [v201b.x + 0.32, 3.05, v201b.z],
      [v201b.x + 0.32, Y_AIR_COLL, v201b.z],
      [45.5, Y_AIR_COLL, v201b.z],
    ],
    radius: 0.12,
    particleCount: 5,
  });
  sensors.push(
    { id: 'sn_pit20101', layer: 'ac', tag: 'B51F_PIT20101', shortLabel: 'PIT20101', pos: [43.0, Y_AIR_COLL + 0.55, v201b.z], fluid: 'air' },
    { id: 'sn_ait20101', layer: 'ac', tag: 'B51F_AIT20101', shortLabel: 'AIT20101', pos: [44.8, Y_AIR_COLL + 0.55, v201b.z], fluid: 'air' }
  );

  // --- 3C. PROCESS VACUUM SYSTEM (Ceiling Stub from Upper Floors -> PIT1301 -> V-1301 -> PV-1301A/B IN -> Exhaust OUT -> Ceiling Stub) ---
  //   Vacuum pump local ports (size [2.4, 1.85, 1.7]):
  //     - INLET (Vacuum Suction, Olive-Gold #a8a228): (pv.x - 0.82, Y = 1.62, pv.z - 0.24)
  //     - OUTLET (Exhaust Discharge, Orange #f97316): (pv.x + 0.08, Y = 1.62, pv.z - 0.24)
  const Y_PV_PORT = 1.62;
  const Z_PV_PORT = pvA.z - 0.24; // 7.96
  const Y_PV_SUCT_BUS = 4.95; // V-1301 outlet -> PV-1301A/B suction bus
  const Y_PV_EXH_BUS = 5.4; // PV-1301A/B exhaust discharge -> ceiling vent stub
  const Y_PV_MAIN_CEIL = 5.85; // Main vacuum header from upper floors -> PIT1301 -> V-1301 inlet
  const Z_PV_MAIN_CEIL = 7.15; // Cleanly separated from OFRAC dryers (Z=6.3) & PV ports (Z=7.96)
  const Z_PV_EXH_BUS = 7.5; // Dedicated track for exhaust header
  const pvAInX = pvA.x - 0.82;
  const pvBInX = pvB.x - 0.82;
  const pvAOutX = pvA.x + 0.08;
  const pvBOutX = pvB.x + 0.08;

  // 1) Main Vacuum Line descending from 1F Ceiling Stub (7.2m -> upper floors connected on upper-floor drawings!) -> PIT1301 -> V-1301 Left Inlet
  pipes.push({
    id: 'pv_main_from_ceiling',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: pvTags,
    points: [
      [36.0, B5_CEILING_Y, Z_PV_MAIN_CEIL],
      [36.0, Y_PV_MAIN_CEIL, Z_PV_MAIN_CEIL],
      [33.4, Y_PV_MAIN_CEIL, Z_PV_MAIN_CEIL],
      [33.4, 1.15, Z_PV_MAIN_CEIL],
      [33.4, 1.15, v1301.z],
      [v1301.x - 0.62, 1.15, v1301.z],
    ],
    radius: 0.11,
    particleCount: 8,
  });
  // Main Vacuum Header Pressure Sensor B51F_PIT1301 mounted on the overhead main vacuum line before V-1301!
  sensors.push({
    id: 'sn_pit1301',
    layer: 'ac',
    tag: 'B51F_PIT1301',
    shortLabel: 'PIT1301',
    pos: [34.6, Y_PV_MAIN_CEIL + 0.55, Z_PV_MAIN_CEIL],
    fluid: 'vac',
  });

  // 2) Receiver V-1301 Top Outlet -> Overhead Vacuum Suction Bus -> Clear Drops into PV-1301A & PV-1301B INLET Ports
  pipes.push({
    id: 'pv_v1301_to_suct_bus',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: pvTags,
    points: [
      [v1301.x, 2.85, v1301.z],
      [v1301.x, Y_PV_SUCT_BUS, v1301.z],
      [v1301.x, Y_PV_SUCT_BUS, Z_PV_PORT],
      [pvBInX, Y_PV_SUCT_BUS, Z_PV_PORT],
    ],
    radius: 0.105,
    particleCount: 7,
  });
  pipes.push({
    id: 'pv_suct_in_a',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: ['B51F_PV1301A'],
    points: [
      [pvAInX, Y_PV_SUCT_BUS, Z_PV_PORT],
      [pvAInX, Y_PV_PORT, Z_PV_PORT],
    ],
    radius: 0.095,
    particleCount: 3,
  });
  pipes.push({
    id: 'pv_suct_in_b',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: ['B51F_PV1301B'],
    points: [
      [pvBInX, Y_PV_SUCT_BUS, Z_PV_PORT],
      [pvBInX, Y_PV_PORT, Z_PV_PORT],
    ],
    radius: 0.095,
    particleCount: 3,
  });

  // 3) PV-1301A & PV-1301B OUTLET (Exhaust) Ports -> Common Overhead Exhaust Header -> Ceiling Vent Stub (stops at 7.2m)
  pipes.push({
    id: 'pv_exh_out_a',
    layer: 'ac',
    fluid: 'exh',
    flowSourceTags: ['B51F_PV1301A'],
    points: [
      [pvAOutX, Y_PV_PORT, Z_PV_PORT],
      [pvAOutX, Y_PV_EXH_BUS, Z_PV_PORT],
      [pvAOutX, Y_PV_EXH_BUS, Z_PV_EXH_BUS],
      [pvBOutX, Y_PV_EXH_BUS, Z_PV_EXH_BUS],
    ],
    radius: 0.095,
    particleCount: 5,
  });
  pipes.push({
    id: 'pv_exh_out_b',
    layer: 'ac',
    fluid: 'exh',
    flowSourceTags: ['B51F_PV1301B'],
    points: [
      [pvBOutX, Y_PV_PORT, Z_PV_PORT],
      [pvBOutX, Y_PV_EXH_BUS, Z_PV_PORT],
      [pvBOutX, Y_PV_EXH_BUS, Z_PV_EXH_BUS],
    ],
    radius: 0.095,
    particleCount: 4,
  });
  pipes.push({
    id: 'pv_exh_to_ceiling',
    layer: 'ac',
    fluid: 'exh',
    flowSourceTags: pvTags,
    points: [
      [pvBOutX, Y_PV_EXH_BUS, Z_PV_EXH_BUS],
      [44.6, Y_PV_EXH_BUS, Z_PV_EXH_BUS],
      [44.6, B5_CEILING_Y, Z_PV_EXH_BUS],
    ],
    radius: 0.11,
    particleCount: 4,
  });

  // =========================================================================
  // LAYER 4: 3RD-PARTY RO-DI SKID ON 1F + BUILDING 5 2ND FLOOR DI LOOPS ('di')
  //   100% Faithful to Scr_B5_DI.Pdl!
  //   - Vertical Supply Riser (#f1f5f9) & Return Riser (#64748b) climb from RO-DI Skid (Y=0) to B5 2F (Y=8.6m)
  //   - 3 Horizontal B5 2F Instrument Loops (PCV10701/03/02, PIT10701/03/02, FIT10701/03/02)
  //   - Inter-building DI risers exiting toward Building 2 (2F/1F) & Building 3 (1F Cistern)!
  // =========================================================================
  const rodi = posOf('b5_rodi');
  const X_DI_SUP_RISER = rodi.x - 4.6; // 51.9
  const X_DI_RET_RISER = rodi.x - 3.9; // 52.6
  const Y_DI_2F_SUP = 8.7; // Building 5 - 2nd Floor DI Supply Loop Elevation (above 7.2m 1F ceiling!)
  const Y_DI_2F_RET = 8.15; // Building 5 - 2nd Floor DI Return Loop Elevation
  const X_DI_2F_END = rodi.x + 7.2; // 63.7

  // Main Vertical Supply & Return Risers from 3rd-Party RO-DI Skid -> Building 5 2F
  pipes.push({
    id: 'di_main_sup_riser',
    layer: 'di',
    fluid: 'di_sup',
    flowSourceTags: ['B52F_PCV10701', 'B52F_PCV10702', 'B52F_PCV10703'],
    points: [
      [rodi.x - 2.6, 2.8, rodi.z - 0.8],
      [X_DI_SUP_RISER, 2.8, rodi.z - 0.8],
      [X_DI_SUP_RISER, Y_DI_2F_SUP, rodi.z - 0.8],
      [X_DI_SUP_RISER, Y_DI_2F_SUP, -2.5],
      [X_DI_SUP_RISER, Y_DI_2F_SUP, 5.5],
    ],
    radius: 0.12,
    particleCount: 9,
  });
  pipes.push({
    id: 'di_main_ret_riser',
    layer: 'di',
    fluid: 'di_ret',
    flowSourceTags: ['B52F_PCV10701', 'B52F_PCV10702', 'B52F_PCV10703'],
    points: [
      [X_DI_RET_RISER, Y_DI_2F_RET, -2.5],
      [X_DI_RET_RISER, Y_DI_2F_RET, 5.5],
    ],
    radius: 0.12,
    particleCount: 6,
  });
  pipes.push({
    id: 'di_ret_down_to_rodi',
    layer: 'di',
    fluid: 'di_ret',
    flowSourceTags: ['B52F_PCV10701', 'B52F_PCV10702', 'B52F_PCV10703'],
    points: [
      [X_DI_RET_RISER, Y_DI_2F_RET, rodi.z + 0.8],
      [X_DI_RET_RISER, 2.2, rodi.z + 0.8],
      [rodi.x - 2.6, 2.2, rodi.z + 0.8],
    ],
    radius: 0.12,
    particleCount: 6,
  });

  // 3 Building 5 — 2nd Floor DI Instrument Loops (Disco Dicing, Edge/Auto Grinding, Sand Blasting)
  for (const loop of [
    { z: -2.5, pcv: 'B52F_PCV10701', pit: 'B52F_PIT10701', fit: 'B52F_FIT10701', code: '10701' },
    { z: 1.5, pcv: 'B52F_PCV10703', pit: 'B52F_PIT10703', fit: 'B52F_FIT10703', code: '10703' },
    { z: 5.5, pcv: 'B52F_PCV10702', pit: 'B52F_PIT10702', fit: 'B52F_FIT10702', code: '10702' },
  ] as const) {
    pipes.push({
      id: `di_b52f_loop_${loop.code}`,
      layer: 'di',
      fluid: 'di_sup',
      flowSourceTags: [loop.pcv],
      points: [
        [X_DI_SUP_RISER, Y_DI_2F_SUP, loop.z],
        [X_DI_2F_END, Y_DI_2F_SUP, loop.z],
        [X_DI_2F_END, Y_DI_2F_RET, loop.z],
      ],
      radius: 0.1,
      particleCount: 6,
    });
    pipes.push({
      id: `di_b52f_ret_${loop.code}`,
      layer: 'di',
      fluid: 'di_ret',
      flowSourceTags: [loop.pcv],
      points: [
        [X_DI_2F_END, Y_DI_2F_RET, loop.z],
        [X_DI_RET_RISER, Y_DI_2F_RET, loop.z],
      ],
      radius: 0.1,
      particleCount: 5,
    });
    valves.push({
      id: `vl_pcv${loop.code}`,
      layer: 'di',
      tag: loop.pcv,
      shortLabel: `PCV${loop.code}`,
      pos: [X_DI_SUP_RISER + 2.4, Y_DI_2F_SUP, loop.z],
      orientation: 'horizontal_x',
      valveStyle: 'control',
    });
    sensors.push(
      { id: `sn_pit${loop.code}`, layer: 'di', tag: loop.pit, shortLabel: `PIT${loop.code}`, pos: [X_DI_SUP_RISER + 6.2, Y_DI_2F_SUP + 0.55, loop.z], fluid: 'di_sup' },
      { id: `sn_fit${loop.code}`, layer: 'di', tag: loop.fit, shortLabel: `FIT${loop.code}`, pos: [X_DI_SUP_RISER + 9.6, Y_DI_2F_SUP + 0.55, loop.z], fluid: 'di_sup' }
    );
  }

  // Elevated Inter-Building Transfer Take-off (to Building 2 2F/1F & Building 3 1F Cistern)
  pipes.push({
    id: 'di_to_b2_b3_bridge',
    layer: 'di',
    fluid: 'di_sup',
    flowSourceTags: ['B22F_PCV10704', 'B31F_PCV10705'],
    points: [
      [X_DI_SUP_RISER, Y_DI_2F_SUP, -2.5],
      [X_DI_SUP_RISER, Y_DI_2F_SUP, -5.6],
      [X_DI_2F_END + 2.2, Y_DI_2F_SUP, -5.6],
    ],
    radius: 0.11,
    particleCount: 6,
  });

  return { pipes, valves, sensors };
}
