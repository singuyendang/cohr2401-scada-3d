import * as THREE from 'three';
import {
  B31F_CEILING_Y,
  B31F_HALF_Z,
  B31F_INDOOR_X_MAX,
  B31F_OUTDOOR_X_MIN,
  B31F_ROOF_Y,
  B31F_WALL_X,
} from '../../training/b31f3dDetail.ts';
import {
  B32F_CEILING_Y,
  B32F_HALF_X,
  B32F_HALF_Z,
  B32F_OFFICE_CEIL_Y,
} from '../../training/b32f3dDetail.ts';
import { build3DStaircase, buildMsbSwitchgearRoom } from './b2Architecture3d.ts';

/**
 * Iconic Industrial Warehouse Pallet Racking Bay (matching uploaded reference photos!):
 *   - Royal-Blue slotted steel upright frames (#1d4ed8) with diagonal blue X-bracing at each end
 *   - Bright Safety-Orange horizontal load beams (#ea580c) across 4 storage tiers
 *   - White/light-grey steel decking shelves populated with symbolic cardboard shipping cartons,
 *     wrapped pallets, and blue industrial plastic tote bins!
 */
function addWarehousePalletRack(
  parent: THREE.Group,
  cx: number,
  cz: number,
  bays = 3,
  bayW = 2.4,
  rackD = 1.1,
  rackH = 3.25
): void {
  const grp = new THREE.Group();
  grp.position.set(cx, 0.08, cz);

  const postBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.38, metalness: 0.55 });
  const beamOrange = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.36, metalness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.35 });
  const cartonA = new THREE.MeshStandardMaterial({ color: 0xc29563, roughness: 0.85 });
  const cartonB = new THREE.MeshStandardMaterial({ color: 0xa67c52, roughness: 0.88 });
  const palletWood = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.82 });
  const toteBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.48 });

  const totalW = bays * bayW;
  const startX = -totalW / 2;
  const levels = [0.22, 1.12, 2.02, 2.92];

  // Vertical Royal-Blue Slotted Uprights + Diagonal End X-Bracing
  for (let i = 0; i <= bays; i++) {
    const px = startX + i * bayW;
    for (const pz of [-rackD / 2, rackD / 2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, rackH, 0.09), postBlue);
      post.position.set(px, rackH / 2, pz);
      post.castShadow = true;
      grp.add(post);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), postBlue);
      foot.position.set(px, 0.02, pz);
      grp.add(foot);
    }

    // Horizontal & diagonal cross-bracing between front & rear uprights (exact photo detail!)
    for (let li = 0; li < levels.length - 1; li++) {
      const y1 = levels[li];
      const y2 = levels[li + 1];
      const midY = (y1 + y2) / 2;
      const braceH = y2 - y1;
      const diagLen = Math.hypot(rackD - 0.1, braceH);
      const diagAngle = Math.atan2(braceH, rackD - 0.1);

      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, diagLen), postBlue);
      brace.position.set(px, midY, 0);
      brace.rotation.x = li % 2 === 0 ? diagAngle : -diagAngle;
      grp.add(brace);

      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, rackD), postBlue);
      tie.position.set(px, y2, 0);
      grp.add(tie);
    }
  }

  // Bright Safety-Orange Horizontal Load Beams + White Steel Decking + Varied Cargo Cartons/Pallets!
  for (let li = 0; li < levels.length; li++) {
    const ly = levels[li];
    for (const pz of [-rackD / 2, rackD / 2]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.11, 0.06), beamOrange);
      beam.position.set(0, ly, pz);
      beam.castShadow = true;
      grp.add(beam);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(totalW - 0.08, 0.035, rackD - 0.08), deckMat);
    deck.position.set(0, ly + 0.04, 0);
    deck.receiveShadow = true;
    grp.add(deck);

    // Populate shelves with realistic pallets, cardboard boxes & blue industrial tote bins (skip a few spots naturally)
    for (let bi = 0; bi < bays; bi++) {
      const hash = Math.abs(Math.round(cx * 7 + cz * 13 + bi * 5 + li * 3)) % 5;
      if (hash === 4 && li === levels.length - 1) continue; // Keep occasional open slot for realism
      const bx = startX + (bi + 0.5) * bayW;

      // Wooden pallet base
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.78, 0.09, rackD * 0.84), palletWood);
      pallet.position.set(bx, ly + 0.1, 0);
      grp.add(pallet);

      if (hash === 0 || hash === 2) {
        // Twin stacked cardboard shipping cartons
        for (const ox of [-bayW * 0.19, bayW * 0.19]) {
          const ch = 0.42 + ((bi + li) % 2) * 0.14;
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(bayW * 0.34, ch, rackD * 0.74),
            ox < 0 ? cartonA : cartonB
          );
          box.position.set(bx + ox, ly + 0.145 + ch / 2, 0);
          box.castShadow = true;
          grp.add(box);
        }
      } else if (hash === 1) {
        // Large wrapped master shipping crate
        const ch = 0.58;
        const crate = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.68, ch, rackD * 0.76), cartonA);
        crate.position.set(bx, ly + 0.145 + ch / 2, 0);
        crate.castShadow = true;
        grp.add(crate);
      } else {
        // 3 Blue industrial storage tote bins
        for (const ox of [-bayW * 0.24, 0, bayW * 0.24]) {
          const tote = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.2, 0.34, rackD * 0.68), toteBlue);
          tote.position.set(bx + ox, ly + 0.145 + 0.17, 0);
          tote.castShadow = true;
          grp.add(tote);
        }
      }
    }
  }

  parent.add(grp);
}

/**
 * Building 3 — 1st Floor Architecture (`b3_plant`):
 *   - LEFT OUTDOOR CHILLER & HEAT FAN YARD (X = -21.8 .. -11.2, facing Road No. 2 along -X & Trần Phú at +Z):
 *       * Concrete equipment pads, yellow safety curbs, Road No. 2 asphalt edge & corner intersection cue
 *       * Exterior Left Wall (X = -11.2) separating Outdoor Plant Yard from Indoor 1F Warehouse
 *   - RIGHT INDOOR 1F WAREHOUSE & UTILITY ZONES (X = -11.2 .. +19.0):
 *       * Open perimeter (NO outer front/right walls!) for unobstructed viewing
 *       * Industrial Warehouse with 4 double-rows of Blue/Orange Pallet Racking loaded with cartons & pallets,
 *         plus yellow forklift aisles and a symbolic yellow pallet jack
 *       * Cleanse / Chemical / Material & DI Cistern floor zones with columns carrying live room sensors
 *       * Suspended translucent ceiling grid (Y = 4.2m) with LED warehouse lights dividing 1F from Overhead Plenum!
 */
export function buildB31fArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const yardD = B31F_HALF_Z * 2; // 25m

  // 1. OUTDOOR YARD ALONG ROAD NO. 2 (X = -21.8 .. -11.2)
  const outdoorGrp = new THREE.Group();
  outdoorGrp.userData.b3Layer = 'outdoor';

  const yardW = B31F_WALL_X - B31F_OUTDOOR_X_MIN; // 10.6m
  const yardCx = (B31F_OUTDOOR_X_MIN + B31F_WALL_X) / 2;

  const yardPad = new THREE.Mesh(
    new THREE.BoxGeometry(yardW, 0.12, yardD),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.86 })
  );
  yardPad.position.set(yardCx, 0.06, 0);
  yardPad.receiveShadow = true;
  outdoorGrp.add(yardPad);

  // Subtle Road No. 2 (Đường Số 2) asphalt edge along -X & Trần Phú edge along +Z
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  const yellowCurb = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });

  const road2Strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, yardD + 2.4), asphaltMat);
  road2Strip.position.set(B31F_OUTDOOR_X_MIN - 1.3, 0.04, 1.2);
  road2Strip.receiveShadow = true;
  outdoorGrp.add(road2Strip);
  for (let dz = -11; dz <= 12; dz += 3.5) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.6), dashMat);
    dash.position.set(B31F_OUTDOOR_X_MIN - 1.3, 0.09, dz);
    outdoorGrp.add(dash);
  }
  const tranPhuStrip = new THREE.Mesh(new THREE.BoxGeometry(yardW + 33.0, 0.08, 2.4), asphaltMat);
  tranPhuStrip.position.set(-1.5, 0.04, B31F_HALF_Z + 1.2);
  tranPhuStrip.receiveShadow = true;
  outdoorGrp.add(tranPhuStrip);

  // CONTINUOUS FULL-LENGTH GREY GALVANIZED B40 WELDED WIRE-MESH FENCE (height = 2.55m matching Chiller!)
  const fenceX = B31F_OUTDOOR_X_MIN + 0.25;
  const fenceH = 2.55;
  const fenceCurbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78 });
  const galvPostMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38, metalness: 0.62 });

  // Procedural crisp grey B40 welded wire-mesh alpha texture (exact match to uploaded B40 fence photo!)
  const meshCanvas = document.createElement('canvas');
  meshCanvas.width = 128;
  meshCanvas.height = 128;
  const mctx = meshCanvas.getContext('2d');
  if (mctx) {
    mctx.clearRect(0, 0, 128, 128);
    mctx.strokeStyle = '#cbd5e1';
    mctx.lineWidth = 5;
    for (let gx = 0; gx <= 128; gx += 16) {
      mctx.beginPath();
      mctx.moveTo(gx, 0);
      mctx.lineTo(gx, 128);
      mctx.stroke();
    }
    for (let gy = 0; gy <= 128; gy += 32) {
      mctx.beginPath();
      mctx.moveTo(0, gy);
      mctx.lineTo(128, gy);
      mctx.stroke();
    }
  }
  const meshTex = new THREE.CanvasTexture(meshCanvas);
  meshTex.wrapS = THREE.RepeatWrapping;
  meshTex.wrapT = THREE.RepeatWrapping;
  meshTex.repeat.set(22, 4);
  const b40MeshMat = new THREE.MeshStandardMaterial({
    map: meshTex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 0.42,
    metalness: 0.65,
  });

  const fenceBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, yardD), fenceCurbMat);
  fenceBase.position.set(fenceX, 0.2, 0);
  fenceBase.castShadow = true;
  outdoorGrp.add(fenceBase);

  // Full-height B40 welded grey wire-mesh screen running entire length of Building 3!
  const b40Screen = new THREE.Mesh(new THREE.PlaneGeometry(yardD, fenceH - 0.25), b40MeshMat);
  b40Screen.rotation.y = Math.PI / 2;
  b40Screen.position.set(fenceX, 0.34 + (fenceH - 0.25) / 2, 0);
  outdoorGrp.add(b40Screen);

  // Horizontal galvanized V-fold stiffness ribs + light-grey square steel posts every 2.5m (exact Photo 1 cue!)
  for (const ry of [0.85, 1.65, 2.48]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, yardD), galvPostMat);
    rib.position.set(fenceX, ry, 0);
    outdoorGrp.add(rib);
  }
  for (let fz = -B31F_HALF_Z; fz <= B31F_HALF_Z + 0.01; fz += 2.5) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, fenceH, 0.11), galvPostMat);
    post.position.set(fenceX, 0.2 + fenceH / 2, fz);
    post.castShadow = true;
    outdoorGrp.add(post);
  }

  // Safety yellow perimeter curb along South (+Z Trần Phú) edge
  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(yardW, 0.18, 0.18), yellowCurb);
  southCurb.position.set(yardCx, 0.12, B31F_HALF_Z - 0.1);
  outdoorGrp.add(southCurb);

  // Clear Pedestrian Walkway between Equipment Row (X = -15.7) and Building 3 Exterior Wall (X = -11.2)!
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });
  const outdoorWalk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, yardD - 0.8), walkMat);
  outdoorWalk.position.set(-13.4, 0.13, 0);
  outdoorGrp.add(outdoorWalk);
  for (const wx of [-14.7, -12.1]) {
    const wLine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, yardD - 0.8), yellowCurb);
    wLine.position.set(wx, 0.135, 0);
    outdoorGrp.add(wLine);
  }

  // Continuous raised concrete equipment plinth under ONE straight row parallel to Road No. 2 (CH-21 -> CH-22 -> Pumps -> HP-01..03!)
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const rowPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 24.4), plinthMat);
  rowPlinth.position.set(-16.8, 0.09, -0.2);
  outdoorGrp.add(rowPlinth);

  // OVERHEAD STEEL PIPE SUPPORT BRIDGE ("Cây cầu support") crossing cleanly over the walkway into Building 3!
  //   - Supports side-by-side CHW Supply (Z=+2.35) & CHW Return (Z=+1.15) + BPMV bypass
  //   - Supports side-by-side HW Return (Z=-2.15) & HW Supply (Z=-3.35) + HPBPMV bypass
  //   - Portal columns placed at X = -21.1 (behind rear risers), -15.0 (walkway outer edge), -11.6 (Building 3 wall)
  //     so ZERO pipes pass through any steel column!
  const bridgeSteel = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.72 });
  const bridgeDeckY = 4.54; // Top of steel cross-sleepers = 4.62m -> pipes rest cleanly at Y = 4.72m!
  for (const [zA, zB] of [
    [2.65, 0.85], // CHW Bridge Bay (carries Supply +2.35 & Return +1.15 + BPMV)
    [-2.05, -3.85], // HW Bridge Bay (carries Return -2.35 & Supply -3.55 + HPBPMV)
  ] as const) {
    const zMid = (zA + zB) / 2;
    const baySpanZ = Math.abs(zA - zB);
    // Steel H-Beam Portal Columns on both sides of the bridge bay
    for (const bx of [-21.1, -15.0, -11.6]) {
      for (const bz of [zA, zB]) {
        const bCol = new THREE.Mesh(new THREE.BoxGeometry(0.16, bridgeDeckY, 0.16), bridgeSteel);
        bCol.position.set(bx, bridgeDeckY / 2, bz);
        bCol.castShadow = true;
        outdoorGrp.add(bCol);
      }
    }
    // Longitudinal main side girders running from X = -21.2 to Building 3 wall (-11.2)
    for (const bz of [zA, zB]) {
      const girder = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.18, 0.16), bridgeSteel);
      girder.position.set(-16.2, bridgeDeckY, bz);
      girder.castShadow = true;
      outdoorGrp.add(girder);
    }
    // Transverse pipe-rack cross-sleepers supporting the side-by-side Supply & Return headers every ~1.9m!
    for (const sx of [-20.8, -19.0, -17.1, -15.0, -13.2, -11.6]) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, baySpanZ + 0.16), bridgeSteel);
      sleeper.position.set(sx, bridgeDeckY, zMid);
      outdoorGrp.add(sleeper);
    }
  }
  // Tie-beams bracing the CHW & HW Overhead Bridge bays together across Z = +0.85 .. -2.05
  for (const bx of [-21.1, -15.0, -11.6]) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.9), bridgeSteel);
    tie.position.set(bx, bridgeDeckY, -0.6);
    outdoorGrp.add(tie);
  }

  // Exterior Left Wall of Building 3 (X = -11.2) separating Outdoor Plant Yard from Indoor Warehouse!
  const extWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, B31F_ROOF_Y, yardD),
    new THREE.MeshStandardMaterial({ color: 0xdce4ee, transparent: true, opacity: 0.36, roughness: 0.42 })
  );
  extWall.position.set(B31F_WALL_X, B31F_ROOF_Y / 2, 0);
  outdoorGrp.add(extWall);
  arch.add(outdoorGrp);

  // 2. INDOOR 1F WAREHOUSE & PROCESS ZONES (X = -11.2 .. +19.0, OPEN PERIMETER!)
  const whGrp = new THREE.Group();
  whGrp.userData.b3Layer = 'warehouse';

  const zones: { x1: number; x2: number; z1: number; z2: number; color: number }[] = [
    // Cleanse & Wet Bench Room (Mint Green)
    { x1: -11.0, x2: 1.0, z1: -12.4, z2: -2.6, color: 0xbbf7d0 },
    // Chemical & Material Room (Warm Amber / Soft Violet)
    { x1: 1.0, x2: 9.0, z1: -12.4, z2: -2.6, color: 0xfde68a },
    // DI Cistern Room (Soft Cyan)
    { x1: 9.0, x2: 19.0, z1: -12.4, z2: -2.6, color: 0xcffafe },
    // Main 1F Industrial Warehouse Hall (Glossy Epoxy Light Slate)
    { x1: -11.0, x2: 19.0, z1: -2.6, z2: 12.4, color: 0xdbe4ee },
  ];

  for (const z of zones) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(z.x2 - z.x1 - 0.08, 0.08, z.z2 - z.z1 - 0.08),
      new THREE.MeshStandardMaterial({ color: z.color, roughness: 0.28, metalness: 0.12 })
    );
    slab.position.set((z.x1 + z.x2) / 2, 0.04, (z.z1 + z.z2) / 2);
    slab.receiveShadow = true;
    whGrp.add(slab);
  }

  // Translucent internal partition dividing Rear Process Rooms (-Z) from Main Warehouse Hall (+Z)
  const wallGlass = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.28,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });
  const addDiv = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(isX ? len : 0.14, B31F_CEILING_Y, isX ? 0.14 : len),
      wallGlass
    );
    w.position.set((x1 + x2) / 2, B31F_CEILING_Y / 2, (z1 + z2) / 2);
    whGrp.add(w);
  };
  addDiv(-11.0, -2.6, 19.0, -2.6);
  addDiv(1.0, -12.4, 1.0, -2.6);
  addDiv(9.0, -12.4, 9.0, -2.6);

  // Yellow Forklift & Pedestrian Safety Aisle Markings inside Warehouse
  for (const lz of [-0.6, 4.4, 9.8]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.02, 0.12), yellowCurb);
    stripe.position.set(4.0, 0.09, lz);
    whGrp.add(stripe);
  }

  // 4 Double-Row Industrial Blue/Orange Pallet Racks inside the 1F Warehouse (exact match to uploaded rack photos!)
  addWarehousePalletRack(whGrp, -5.2, 1.4, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, -5.2, 2.6, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, 5.2, 1.4, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, 5.2, 2.6, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, -5.2, 6.6, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, -5.2, 7.8, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, 5.2, 6.6, 3, 2.5, 1.05, 3.25);
  addWarehousePalletRack(whGrp, 5.2, 7.8, 3, 2.5, 1.05, 3.25);

  // Symbolic Yellow Hydraulic Pallet Jack parked neatly in central warehouse forklift aisle
  const jack = new THREE.Group();
  jack.position.set(0.2, 0.08, 4.4);
  const jackYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.3 });
  const jackDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  for (const fz of [-0.24, 0.24]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.16), jackYellow);
    fork.position.set(0.2, 0.06, fz);
    jack.add(fork);
  }
  const pumpCol = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.56), jackYellow);
  pumpCol.position.set(-0.46, 0.25, 0);
  jack.add(pumpCol);
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), jackDark);
  handleBar.position.set(-0.56, 0.78, 0);
  handleBar.rotation.z = 0.22;
  jack.add(handleBar);
  whGrp.add(jack);

  // Structural Columns carrying 1F Room Sensors
  const colWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
  const frameAlu = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.72 });
  for (const [cx, cz] of [
    [-5.5, -3.5],
    [4.5, -3.5],
    [12.5, -3.5],
    [-5.5, 4.4],
    [4.5, 4.4],
    [12.5, 9.6],
  ] as const) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, B31F_CEILING_Y, 0.42), colWhite);
    col.position.set(cx, B31F_CEILING_Y / 2, cz);
    whGrp.add(col);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), frameAlu);
    base.position.set(cx, 0.08, cz);
    whGrp.add(base);
  }

  // Suspended Translucent Warehouse Ceiling + Bright White LED High-Bay Fixtures + Roof Beams
  const inW = B31F_INDOOR_X_MAX - B31F_WALL_X; // 30.2m
  const inCx = (B31F_WALL_X + B31F_INDOOR_X_MAX) / 2; // +3.9
  const ceilPanel = new THREE.Mesh(
    new THREE.BoxGeometry(inW, 0.08, yardD),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.28, roughness: 0.28 })
  );
  ceilPanel.position.set(inCx, B31F_CEILING_Y, 0);
  whGrp.add(ceilPanel);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.92 });
  for (let lx = -8.5; lx <= 16.5; lx += 5.0) {
    for (let lz = -9.0; lz <= 9.0; lz += 6.0) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.55), ledMat);
      led.position.set(lx, B31F_CEILING_Y - 0.05, lz);
      whGrp.add(led);
    }
  }

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  for (const pz of [-B31F_HALF_Z, B31F_HALF_Z]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(inW, 0.2, 0.2), steelMat);
    beam.position.set(inCx, B31F_ROOF_Y, pz);
    whGrp.add(beam);
  }
  for (const px of [B31F_WALL_X, 4.0, B31F_INDOOR_X_MAX]) {
    for (const pz of [-B31F_HALF_Z, B31F_HALF_Z]) {
      const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.24, B31F_ROOF_Y - B31F_CEILING_Y, 0.24), steelMat);
      pCol.position.set(px, (B31F_CEILING_Y + B31F_ROOF_Y) / 2, pz);
      whGrp.add(pCol);
    }
  }

  arch.add(whGrp);
  return arch;
}

/**
 * Building 3 — 2nd Floor / M1F Architecture (`b3_2f`):
 *   - LEFT MECHANICAL BAY (X = -22 .. +1): 2× Daikin AHUs + 3× Centrifugal Exhaust Fans + Green Service Walkway
 *   - CENTRAL STAIRWELL (X = +1.8, Z = +7.2): True-depth 14-step 3D Stairwell rising from 1F Warehouse!
 *   - TOP-RIGHT OFFICE & LAB ZONE (X = +3.5 .. +22, Z = -11 .. +0.8): Suspended ceiling (Y = 3.85m) with LED panels & 7× Overhead FCUs
 *   - BOTTOM-RIGHT MSB ELECTRICAL SWITCHROOM (X = +5.5 .. +21.6, Z = +1.2 .. +10.6):
 *       2 Parallel Facing Rows of Tall 2.42m AHU-Height Switchgear Cabinets (MDB-3.1 / 3.2 / 3.3 & Sub-DBs)!
 */
export function buildB32fArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const roomW = B32F_HALF_X * 2; // 44m
  const roomD = B32F_HALF_Z * 2; // 22m

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.32,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.68 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });

  // Main 2F Mechanical Floor Slab (Left Mechanical Hall)
  const mechFloor = new THREE.Mesh(
    new THREE.BoxGeometry(25.5, 0.1, roomD),
    new THREE.MeshStandardMaterial({ color: 0x25354c, roughness: 0.78 })
  );
  mechFloor.position.set(-9.25, 0.02, 0);
  mechFloor.receiveShadow = true;
  arch.add(mechFloor);

  // Marked Green Service Walkway between AHU Row (-4.6) and Exhaust Fan Row (+5.4)
  const walk = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.025, 2.3), walkMat);
  walk.position.set(-9.5, 0.075, 0.6);
  arch.add(walk);
  for (const lz of [-0.55, 1.75]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(23.8, 0.03, 0.1), yellowMat);
    stripe.position.set(-9.5, 0.08, lz);
    arch.add(stripe);
  }

  // Top-Right Office & Lab Floor Slab (X = +3.5 .. +22, Z = -11 .. +1.0) + Suspended Ceiling (Y = 3.85m)
  const offW = 18.5;
  const offD = 12.0;
  const offCx = 12.75;
  const offCz = -5.0;
  const offFloor = new THREE.Mesh(
    new THREE.BoxGeometry(offW, 0.08, offD),
    new THREE.MeshStandardMaterial({ color: 0xdcfce7, roughness: 0.3, metalness: 0.1 })
  );
  offFloor.position.set(offCx, 0.04, offCz);
  offFloor.receiveShadow = true;
  arch.add(offFloor);

  const offCeil = new THREE.Mesh(
    new THREE.BoxGeometry(offW, 0.07, offD),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.3, roughness: 0.25 })
  );
  offCeil.position.set(offCx, B32F_OFFICE_CEIL_Y, offCz);
  arch.add(offCeil);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.92 });
  for (let lx = 6.0; lx <= 19.5; lx += 4.5) {
    for (let lz = -8.5; lz <= -1.5; lz += 4.2) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.6), ledMat);
      led.position.set(lx, B32F_OFFICE_CEIL_Y - 0.04, lz);
      arch.add(led);
    }
  }

  // Partition wall separating Mechanical Bay (-X) from Office/Lab (+X)
  const midWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, B32F_OFFICE_CEIL_Y, offD), wallMat);
  midWall.position.set(3.5, B32F_OFFICE_CEIL_Y / 2, offCz);
  arch.add(midWall);

  // Rear & Left Exterior Walls + Perimeter Roof Steel Beams
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, B32F_CEILING_Y, 0.18), wallMat);
  rearWall.position.set(0, B32F_CEILING_Y / 2, -B32F_HALF_Z);
  arch.add(rearWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, B32F_CEILING_Y, roomD), wallMat);
  leftWall.position.set(-B32F_HALF_X, B32F_CEILING_Y / 2, 0);
  arch.add(leftWall);

  for (const pz of [-B32F_HALF_Z, B32F_HALF_Z]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 0.22), steelMat);
    beam.position.set(0, B32F_CEILING_Y, pz);
    arch.add(beam);
  }
  for (const px of [-B32F_HALF_X, -7.5, 5.5, B32F_HALF_X]) {
    for (const pz of [-B32F_HALF_Z, B32F_HALF_Z]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, B32F_CEILING_Y, 0.28), steelMat);
      col.position.set(px, B32F_CEILING_Y / 2, pz);
      arch.add(col);
    }
  }

  // True-Depth 3D Stairwell rising from 1F Warehouse up to 2F right in front of the MSB Room doorway!
  arch.add(build3DStaircase(1.8, 7.6, 0, 2.4));

  // Full Building 3 2F MSB Electrical Switchroom (X = +5.5 .. +21.8, Z = +1.2 .. +10.8):
  //   2 Parallel Facing Rows of Tall 2.42m AHU-Height Switchgear Cabinets (MDB-3.1 / 3.2 / 3.3 & Sub-DBs)!
  arch.add(buildMsbSwitchgearRoom(5.5, 21.8, 1.2, 10.8, B32F_CEILING_Y, 'left'));

  return arch;
}
