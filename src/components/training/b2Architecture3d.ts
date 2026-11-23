import * as THREE from 'three';
import {
  B21F_CEILING_Y,
  B21F_CLEAN_Z_MAX,
  B21F_CLEAN_Z_MIN,
  B21F_HALF_X,
  B21F_PCW_Z_MAX,
  B21F_PCW_Z_MIN,
  B21F_PLENUM_TOP_Y,
} from '../../training/b21f3dDetail.ts';
import {
  B22F_CEILING_Y,
  B22F_CORRIDOR_HALF_X,
  B22F_HALF_X,
  B22F_HALF_Z,
} from '../../training/b22f3dDetail.ts';
import {
  B23F_CEILING_Y,
  B23F_HALF_X,
  B23F_HALF_Z,
  B23F_PLENUM_TOP_Y,
} from '../../training/b23f3dDetail.ts';
import {
  B2M3F_CEILING_Y,
  B2M3F_CORRIDOR_HALF_X,
  B2M3F_HALF_X,
  B2M3F_HALF_Z,
} from '../../training/b2M3f3dDetail.ts';

/** Exact facing angle so local +Z (worker face/arms/clipboard) aims straight INTO (targetX, targetZ). */
export function faceToward(wx: number, wz: number, targetX: number, targetZ: number): number {
  return Math.atan2(targetX - wx, targetZ - wz);
}

/**
 * True-Depth 3D Industrial Stairwell descending from upper landing (Y = 0.0) down to lower floor (Y = -3.6m):
 *   - 14 solid concrete/steel steps with crisp risers, treads & bright yellow anti-slip nosing edges
 *   - Angled dark-steel side stringer beams + recessed dark stairwell shaft walls for unmistakable depth
 *   - 3-sided safety-yellow tubular guardrails (left, right & back) with vertical stanchions and mid-rails!
 *   - Local coordinates: opening spans Z = -2.6 .. +2.6, top landing entry at -Z, stairs descend toward +Z!
 */
export function build3DStaircase(x: number, z: number, rotY = 0, stairW = 2.6): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;

  const stepCount = 14;
  const totalDrop = 3.5;
  const totalRun = 4.9;
  const stepRise = totalDrop / stepCount;
  const stepRun = totalRun / stepCount;

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const riserDark = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.2 });
  const shaftDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, side: THREE.DoubleSide });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });

  // Recessed stairwell dark side walls & bottom landing pad at Y = -3.5m so vertical depth reads instantly!
  const wellLen = totalRun + 0.6;
  const bottomPad = new THREE.Mesh(new THREE.BoxGeometry(stairW + 0.3, 0.16, wellLen + 0.6), riserDark);
  bottomPad.position.set(0, -totalDrop - 0.08, 0.2);
  grp.add(bottomPad);

  for (const sx of [-(stairW / 2 + 0.09), stairW / 2 + 0.09]) {
    const wellWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, totalDrop, wellLen), shaftDark);
    wellWall.position.set(sx, -totalDrop / 2, 0);
    grp.add(wellWall);
  }
  const farWellWall = new THREE.Mesh(new THREE.BoxGeometry(stairW + 0.3, totalDrop, 0.14), shaftDark);
  farWellWall.position.set(0, -totalDrop / 2, wellLen / 2);
  grp.add(farWellWall);

  // Yellow perimeter floor curb framing the stairwell cutout on the upper deck
  for (const sx of [-(stairW / 2 + 0.14), stairW / 2 + 0.14]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, wellLen + 0.28), yellowMat);
    curb.position.set(sx, 0.05, 0);
    grp.add(curb);
  }
  const backCurb = new THREE.Mesh(new THREE.BoxGeometry(stairW + 0.42, 0.09, 0.14), yellowMat);
  backCurb.position.set(0, 0.05, wellLen / 2 + 0.07);
  grp.add(backCurb);

  // 14 Descending Steps (Z = -totalRun/2 at top Y=-0.12 -> Z = +totalRun/2 at bottom Y=-3.50)
  for (let s = 0; s < stepCount; s++) {
    const sy = -(s + 0.5) * stepRise;
    const sz = -totalRun / 2 + (s + 0.5) * stepRun;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairW - 0.08, stepRise * 0.96, stepRun + 0.04), concreteMat);
    tread.position.set(0, sy, sz);
    tread.castShadow = true;
    tread.receiveShadow = true;
    grp.add(tread);

    // Bright yellow anti-slip step nosing strip along front edge of every step!
    const nosing = new THREE.Mesh(new THREE.BoxGeometry(stairW - 0.06, 0.035, 0.05), yellowMat);
    nosing.position.set(0, sy + stepRise * 0.48, sz + stepRun * 0.48);
    grp.add(nosing);
  }

  // Dual Angled Steel Stringer Beams running diagonally under left & right step edges
  const diagLen = Math.hypot(totalRun, totalDrop);
  const slopeAngle = Math.atan2(totalDrop, totalRun);
  for (const sx of [-(stairW / 2 - 0.04), stairW / 2 - 0.04]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, diagLen), steelMat);
    stringer.position.set(sx, -totalDrop / 2 - 0.18, 0);
    stringer.rotation.x = slopeAngle;
    grp.add(stringer);

    // Sloped Handrail descending cleanly alongside the steps!
    const slopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, diagLen), yellowMat);
    slopeRail.position.set(sx, -totalDrop / 2 + 0.92, 0);
    slopeRail.rotation.x = slopeAngle;
    grp.add(slopeRail);
  }

  // 3-Sided Upper-Deck Safety-Yellow Tubular Guardrails (Left, Right & Far End — entry stays open at -Z!)
  const railH = 1.05;
  for (const sx of [-(stairW / 2 + 0.14), stairW / 2 + 0.14]) {
    for (const ry of [railH, railH * 0.52]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, wellLen + 0.22), yellowMat);
      bar.position.set(sx, ry, 0);
      grp.add(bar);
    }
    for (let p = 0; p <= 4; p++) {
      const pz = -wellLen / 2 - 0.06 + (p / 4) * (wellLen + 0.18);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.065, railH, 0.065), yellowMat);
      post.position.set(sx, railH / 2, pz);
      grp.add(post);
    }
  }
  for (const ry of [railH, railH * 0.52]) {
    const backBar = new THREE.Mesh(new THREE.BoxGeometry(stairW + 0.34, 0.06, 0.06), yellowMat);
    backBar.position.set(0, ry, wellLen / 2 + 0.07);
    grp.add(backBar);
  }

  return grp;
}

/**
 * Full Industrial MSB Electrical Switchroom with 2 Parallel Facing Rows of Tall (~2.4m, AHU-height) Switchgear Cabinets:
 *   - Partitioned room with translucent glass/concrete enclosure & open access doorway
 *   - 2 Parallel facing rows of tall MDB / Feeder DB switchgear cubicles (height 2.4m matching Daikin AHUs!)
 *   - Glowing digital PM8000 power meter displays, circuit breaker rotary handles, amber arc-flash header strips & cable busway trays
 *   - Insulated dark-grey rubber floor mat aisle with yellow safety stripes running between the 2 facing cabinet rows!
 *   - ZERO non-tag decorative text banners!
 */
export function buildMsbSwitchgearRoom(
  xMin: number,
  xMax: number,
  zMin: number,
  zMax: number,
  ceilY: number,
  doorSide: 'left' | 'front' = 'left'
): THREE.Group {
  const room = new THREE.Group();
  const rw = xMax - xMin;
  const rd = zMax - zMin;
  const cx = (xMin + xMax) / 2;
  const cz = (zMin + zMax) / 2;

  const msbFloorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.36,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const cabBody = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.36, metalness: 0.48 });
  const cabBase = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.35 });
  const cabHeader = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.38, metalness: 0.25 });
  const doorSeam = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
  const meterGlow = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.85,
  });
  const cyanLed = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
  });
  const buswayMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.75 });

  // Dedicated MSB Room Epoxy Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.1, rd), msbFloorMat);
  floor.position.set(cx, 0.03, cz);
  floor.receiveShadow = true;
  room.add(floor);

  // Rear, Right & Partition Walls (with open double-doorway on doorSide!)
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(rw, ceilY, 0.18), wallMat);
  rearWall.position.set(cx, ceilY / 2, zMin);
  room.add(rearWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, ceilY, rd), wallMat);
  rightWall.position.set(xMax, ceilY / 2, cz);
  room.add(rightWall);

  if (doorSide === 'left') {
    // Solid dividing wall along xMin separating mechanical hall from MSB room, leaving a 3.2m wide doorway near +Z!
    const doorZ1 = zMax - 3.8;
    const solidLen = Math.max(1.0, doorZ1 - zMin);
    const divWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, ceilY, solidLen), wallMat);
    divWall.position.set(xMin, ceilY / 2, zMin + solidLen / 2);
    room.add(divWall);
    // Overhead lintel above the MSB doorway
    const lintelH = Math.max(0.8, ceilY - 2.9);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.22, lintelH, zMax - doorZ1), wallMat);
    lintel.position.set(xMin, ceilY - lintelH / 2, (doorZ1 + zMax) / 2);
    room.add(lintel);
    // Yellow doorway frame posts
    for (const dz of [doorZ1, zMax - 0.25]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.9, 0.16), yellowMat);
      jamb.position.set(xMin, 1.45, dz);
      room.add(jamb);
    }
  } else {
    // Partition wall on left (xMin) with open front entrance on zMax
    const divWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, ceilY, rd), wallMat);
    divWall.position.set(xMin, ceilY / 2, cz);
    room.add(divWall);
  }

  // Decide orientation of the 2 parallel facing cabinet rows so they fit spaciously!
  const alignAlongZ = rd >= rw * 1.15;
  const cabH = 2.42; // Tall industrial switchgear height matching Daikin AHUs (~2.4m)!
  const cabD = 1.15;

  const addSwitchgearCabinet = (px: number, pz: number, faceDirX: number, faceDirZ: number, cw: number) => {
    const cab = new THREE.Group();
    cab.position.set(px, 0.08, pz);
    cab.rotation.y = Math.atan2(faceDirX, faceDirZ);

    // Dark recessed steel plinth base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.16, cabD), cabBase);
    plinth.position.y = 0.08;
    cab.add(plinth);

    // Tall industrial switchgear steel enclosure (2.42m tall!)
    const body = new THREE.Mesh(new THREE.BoxGeometry(cw - 0.04, cabH - 0.3, cabD), cabBody);
    body.position.y = 0.16 + (cabH - 0.3) / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    cab.add(body);

    // Amber top header cornice
    const cap = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.16, cabD + 0.04), cabHeader);
    cap.position.y = cabH - 0.08;
    cab.add(cap);

    // Front (+Z) double-door center seam, rotary breaker handle, glowing PM8000 digital meter & arc-flash warning triangle!
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, cabH - 0.42, 0.03), doorSeam);
    seam.position.set(0, cabH * 0.5, cabD / 2 + 0.01);
    cab.add(seam);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.09), cabBase);
    handle.position.set(cw * 0.18, 1.25, cabD / 2 + 0.04);
    cab.add(handle);

    const meter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.04), meterGlow);
    meter.position.set(-cw * 0.22, 1.78, cabD / 2 + 0.02);
    cab.add(meter);

    const statusBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), cyanLed);
    statusBar.position.set(cw * 0.22, 1.78, cabD / 2 + 0.02);
    cab.add(statusBar);

    const warn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), yellowMat);
    warn.position.set(-cw * 0.22, 1.48, cabD / 2 + 0.02);
    cab.add(warn);

    room.add(cab);
  };

  if (alignAlongZ) {
    // 2 Parallel Facing Rows running along Z (Left Row faces +X, Right Row faces -X) with central rubber aisle!
    const rowLeftX = xMin + 2.3;
    const rowRightX = xMax - 2.3;
    const usableZ = rd - 5.2;
    const countPerRow = Math.max(4, Math.min(7, Math.floor(usableZ / 1.85)));
    const pitch = usableZ / countPerRow;
    const startZ = zMin + 1.8 + pitch / 2;

    // Insulated rubber floor mat aisle between the 2 facing cabinet rows
    const matAisle = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.8, rowRightX - rowLeftX - 1.5), 0.025, usableZ + 0.6), rubberMat);
    matAisle.position.set(cx, 0.095, zMin + 1.8 + usableZ / 2);
    room.add(matAisle);

    for (let i = 0; i < countPerRow; i++) {
      const pz = startZ + i * pitch;
      addSwitchgearCabinet(rowLeftX, pz, 1, 0, pitch - 0.08);
      addSwitchgearCabinet(rowRightX, pz, -1, 0, pitch - 0.08);
    }

    // Overhead Aluminum Busduct / Cable Tray connecting both rows cleanly!
    for (const rx of [rowLeftX, rowRightX]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, usableZ + 0.4), buswayMat);
      tray.position.set(rx, cabH + 0.45, zMin + 1.8 + usableZ / 2);
      room.add(tray);
    }
  } else {
    // 2 Parallel Facing Rows running along X (Rear Row faces +Z, Front Row faces -Z) with central rubber aisle!
    const rowBackZ = zMin + 2.1;
    const rowFrontZ = zMax - 2.1;
    const usableX = rw - 2.4;
    const countPerRow = Math.max(4, Math.min(7, Math.floor(usableX / 1.85)));
    const pitch = usableX / countPerRow;
    const startX = xMin + 1.2 + pitch / 2;

    const matAisle = new THREE.Mesh(new THREE.BoxGeometry(usableX + 0.5, 0.025, Math.max(1.6, rowFrontZ - rowBackZ - 1.4)), rubberMat);
    matAisle.position.set(cx, 0.095, cz);
    room.add(matAisle);

    for (let i = 0; i < countPerRow; i++) {
      const px = startX + i * pitch;
      addSwitchgearCabinet(px, rowBackZ, 0, 1, pitch - 0.08);
      addSwitchgearCabinet(px, rowFrontZ, 0, -1, pitch - 0.08);
    }

    for (const rz of [rowBackZ, rowFrontZ]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(usableX + 0.4, 0.14, 0.55), buswayMat);
      tray.position.set(cx, cabH + 0.45, rz);
      room.add(tray);
    }
  }

  return room;
}

function addCleanroomLaserTool(arch: THREE.Group, tx: number, tz: number, rotY = 0, b2Layer?: 'cleanroom'): void {
  const toolMetal = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.32, metalness: 0.42 });
  const frameAlu = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.72 });
  const laserGreenGlass = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    emissive: 0x15803d,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.52,
    roughness: 0.15,
  });

  const tGrp = new THREE.Group();
  if (b2Layer) tGrp.userData.b2Layer = b2Layer;
  tGrp.position.set(tx, 0.08, tz);
  tGrp.rotation.y = rotY;

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.92, 1.5), toolMetal);
  base.position.y = 0.46;
  base.castShadow = true;
  tGrp.add(base);

  const upperFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.24, 1.44), toolMetal);
  upperFrame.position.y = 1.54;
  tGrp.add(upperFrame);

  const greenDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.94, 1.5), laserGreenGlass);
  greenDoor.position.y = 1.48;
  tGrp.add(greenDoor);

  const hmi = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.34, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 })
  );
  hmi.position.set(-1.26, 1.42, 0.82);
  tGrp.add(hmi);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), frameAlu);
  mast.position.set(0.92, 2.36, 0.52);
  tGrp.add(mast);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.85 })
  );
  lamp.position.set(0.92, 2.64, 0.52);
  tGrp.add(lamp);

  arch.add(tGrp);
}

function addCleanroomBench(arch: THREE.Group, cx: number, cz: number, len = 3.2, b2Layer?: 'cleanroom'): void {
  const toolMetal = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.32, metalness: 0.42 });
  const toolDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.48, metalness: 0.5 });
  const conv = new THREE.Group();
  if (b2Layer) conv.userData.b2Layer = b2Layer;
  conv.position.set(cx, 0.08, cz);
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.84, 1.12), toolMetal);
  body.position.y = 0.42;
  body.castShadow = true;
  conv.add(body);
  const track = new THREE.Mesh(new THREE.BoxGeometry(len - 0.16, 0.12, 0.82), toolDark);
  track.position.y = 0.88;
  conv.add(track);
  arch.add(conv);
}

function addCleanroomBunnyOperator(
  arch: THREE.Group,
  wx: number,
  wz: number,
  targetX: number,
  targetZ: number,
  pose: 'work' | 'hmi' | 'clipboard',
  b2Layer?: 'cleanroom'
): void {
  const suitWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, metalness: 0.05 });
  const bootGrey = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
  const maskBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });
  const skinTone = new THREE.MeshStandardMaterial({ color: 0xf1c7a5, roughness: 0.65 });
  const gloveBlue = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.45 });
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });

  const op = new THREE.Group();
  if (b2Layer) op.userData.b2Layer = b2Layer;
  op.position.set(wx, 0.08, wz);
  // Guarantee every operator faces directly INTO their tool/HMI/workbench!
  op.rotation.y = faceToward(wx, wz, targetX, targetZ);

  for (const lx of [-0.11, 0.11]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.78, 10), suitWhite);
    leg.position.set(lx, 0.45, 0);
    leg.castShadow = true;
    op.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), bootGrey);
    boot.position.set(lx, 0.05, 0.04);
    op.add(boot);
  }

  const upper = new THREE.Group();
  upper.position.set(0, 0.84, 0);
  upper.rotation.x = pose === 'work' ? 0.2 : 0.06;
  op.add(upper);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.54, 12), suitWhite);
  torso.position.y = 0.27;
  torso.castShadow = true;
  upper.add(torso);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), suitWhite);
  hood.position.set(0, 0.68, 0.01);
  upper.add(hood);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.06), skinTone);
  face.position.set(0, 0.71, 0.13);
  upper.add(face);
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.085, 0.07), maskBlue);
  mask.position.set(0, 0.635, 0.135);
  upper.add(mask);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.23, 0.48, 0);
    if (pose === 'work') {
      arm.rotation.x = -0.95;
      arm.rotation.z = side * 0.14;
    } else if (pose === 'hmi') {
      arm.rotation.x = side === 1 ? -1.15 : -0.35;
    } else {
      arm.rotation.x = -0.78;
      arm.rotation.z = side * 0.2;
    }
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.5, 10), suitWhite);
    sleeve.position.y = -0.24;
    arm.add(sleeve);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), gloveBlue);
    glove.position.y = -0.5;
    arm.add(glove);
    upper.add(arm);
  }

  if (pose === 'clipboard') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.025), clipMat);
    board.position.set(0, 0.32, 0.38);
    board.rotation.x = -0.55;
    upper.add(board);
  }

  arch.add(op);
}

function addSuspendedCleanroomCeiling(
  arch: THREE.Group,
  halfX: number,
  zMin: number,
  zMax: number,
  ceilY: number,
  plenumTopY: number,
  b2Layer?: 'cleanroom'
): void {
  const ceilGrp = new THREE.Group();
  if (b2Layer) ceilGrp.userData.b2Layer = b2Layer;

  const spanW = halfX * 2;
  const spanD = zMax - zMin;
  const midZ = (zMin + zMax) / 2;

  const ledWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.95 });
  const hepaMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.6 });
  const plenumSteel = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });

  const ceilPanel = new THREE.Mesh(
    new THREE.BoxGeometry(spanW, 0.08, spanD),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.32,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  ceilPanel.position.set(0, ceilY, midZ);
  ceilGrp.add(ceilPanel);

  const ceilGrid = new THREE.GridHelper(spanW, Math.round(spanW / 2), 0x94a3b8, 0xcbd5e1);
  ceilGrid.position.set(0, ceilY - 0.045, midZ);
  ceilGrid.scale.z = spanD / spanW;
  ceilGrp.add(ceilGrid);

  for (let lx = -halfX + 3; lx <= halfX - 3; lx += 5) {
    for (let lz = zMin + 2.5; lz <= zMax - 2.5; lz += 5) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.72), ledWhite);
      led.position.set(lx, ceilY - 0.05, lz);
      ceilGrp.add(led);
      if (lx + 2.5 <= halfX - 1.5) {
        const hepa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 1.15), hepaMat);
        hepa.position.set(lx + 2.5, ceilY - 0.05, lz);
        ceilGrp.add(hepa);
      }
    }
  }

  for (const px of [-halfX, 0, halfX]) {
    for (const pz of [zMin, zMax]) {
      const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.24, plenumTopY - ceilY, 0.24), plenumSteel);
      pCol.position.set(px, (ceilY + plenumTopY) / 2, pz);
      ceilGrp.add(pCol);
    }
    const pBeamZ = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, spanD), plenumSteel);
    pBeamZ.position.set(px, plenumTopY, midZ);
    ceilGrp.add(pBeamZ);
  }
  for (const pz of [zMin, zMax]) {
    const pBeamX = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.18, 0.18), plenumSteel);
    pBeamX.position.set(0, plenumTopY, pz);
    ceilGrp.add(pBeamX);
  }

  arch.add(ceilGrp);
}

/**
 * Building 2 — 1st Floor Architecture (`b2_plant`):
 *   - Outdoor PCW Concrete Pad & Driveway Stripe along the North (-Z) edge facing Building 5 Cooling Towers!
 *   - Open-Perimeter 1F Optics Cleanroom (NO outer surrounding walls!) with 4 color-coded epoxy zones,
 *     translucent internal zone partitions, columns, Coating/CNC/Polishing tools, cleanroom operators facing INTO tools,
 *     and suspended glowing LED/HEPA ceiling (Y = 3.85m)!
 */
export function buildB21fArchitecture(): THREE.Group {
  const arch = new THREE.Group();

  // 1. OUTDOOR PCW YARD PAD (Z = -22.0 .. -12.8, facing Building 5 CT Yard!)
  const pcwGrp = new THREE.Group();
  pcwGrp.userData.b2Layer = 'pcw';
  const pcwPad = new THREE.Mesh(
    new THREE.BoxGeometry(36.0, 0.12, B21F_PCW_Z_MAX - B21F_PCW_Z_MIN),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
  );
  pcwPad.position.set(0, 0.06, (B21F_PCW_Z_MIN + B21F_PCW_Z_MAX) / 2);
  pcwPad.receiveShadow = true;
  pcwGrp.add(pcwPad);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(36.0, 0.16, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 })
  );
  curb.position.set(0, 0.12, B21F_PCW_Z_MIN + 0.12);
  pcwGrp.add(curb);

  const sepWall = new THREE.Mesh(
    new THREE.BoxGeometry(36.0, B21F_CEILING_Y, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xdce4ee, transparent: true, opacity: 0.38, roughness: 0.4 })
  );
  sepWall.position.set(0, B21F_CEILING_Y / 2, -12.5);
  pcwGrp.add(sepWall);
  arch.add(pcwGrp);

  // 2. 1F CLEANROOM FLOOR ZONES (Open perimeter — NO surrounding outer walls!)
  const cleanGrp = new THREE.Group();
  cleanGrp.userData.b2Layer = 'cleanroom';

  const zones: { x1: number; x2: number; z1: number; z2: number; color: number }[] = [
    { x1: -18, x2: -2, z1: -12, z2: -1, color: 0xbfdbfe },
    { x1: -2, x2: 18, z1: -12, z2: -1, color: 0xbbf7d0 },
    { x1: -18, x2: 2, z1: -1, z2: 12, color: 0xe9d5ff },
    { x1: 2, x2: 18, z1: -1, z2: 12, color: 0xfde68a },
  ];

  for (const z of zones) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(z.x2 - z.x1 - 0.08, 0.08, z.z2 - z.z1 - 0.08),
      new THREE.MeshStandardMaterial({ color: z.color, roughness: 0.22, metalness: 0.14 })
    );
    slab.position.set((z.x1 + z.x2) / 2, 0.04, (z.z1 + z.z2) / 2);
    slab.receiveShadow = true;
    cleanGrp.add(slab);
  }

  const wallGlass = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.28,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });
  const addDiv = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(isX ? len : 0.14, B21F_CEILING_Y, isX ? 0.14 : len),
      wallGlass
    );
    w.position.set((x1 + x2) / 2, B21F_CEILING_Y / 2, (z1 + z2) / 2);
    cleanGrp.add(w);
  };
  addDiv(-18, -1, 18, -1);
  addDiv(-2, -12, -2, -1);
  addDiv(2, -1, 2, 12);

  const colWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
  const frameAlu = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.72 });
  const cols: [number, number][] = [
    [-11.5, -3.0], [-5.0, -3.0], [3.5, -3.0], [10.0, -3.0], [15.0, -3.0],
    [-11.5, 3.0], [-5.0, 3.0], [5.5, 3.6], [11.5, 3.6],
    [-11.5, 9.2], [-5.0, 9.2], [-0.2, 9.2], [5.5, 9.2], [11.5, 9.2],
  ];
  for (const [cx, cz] of cols) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, B21F_CEILING_Y, 0.42), colWhite);
    col.position.set(cx, B21F_CEILING_Y / 2, cz);
    cleanGrp.add(col);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), frameAlu);
    base.position.set(cx, 0.08, cz);
    cleanGrp.add(base);
  }
  arch.add(cleanGrp);

  // 3. Symbolic Cleanroom Tools aligned directly under the 1F PCW vertical drops!
  for (const tx of [-13.5, -7.5, 2.5, 8.5, 14.2]) {
    addCleanroomLaserTool(arch, tx, -6.5, 0, 'cleanroom');
  }
  addCleanroomLaserTool(arch, -13.5, 5.5, Math.PI, 'cleanroom');
  addCleanroomLaserTool(arch, -7.5, 5.5, Math.PI, 'cleanroom');
  addCleanroomBench(arch, -1.5, 5.5, 3.0, 'cleanroom');

  // 4. Cleanroom Bunny-Suit Operators ALL facing straight INTO their equipment!
  addCleanroomBunnyOperator(arch, -13.5, -5.0, -13.5, -6.5, 'hmi', 'cleanroom');
  addCleanroomBunnyOperator(arch, 2.5, -5.0, 2.5, -6.5, 'work', 'cleanroom');
  addCleanroomBunnyOperator(arch, 8.5, -5.0, 8.5, -6.5, 'clipboard', 'cleanroom');
  addCleanroomBunnyOperator(arch, -7.5, 6.9, -7.5, 5.5, 'work', 'cleanroom');
  addCleanroomBunnyOperator(arch, -1.5, 6.7, -1.5, 5.5, 'hmi', 'cleanroom');

  // 5. Suspended Glowing LED / HEPA Ceiling dividing 1F Cleanroom from Overhead Plenum
  addSuspendedCleanroomCeiling(
    arch,
    B21F_HALF_X,
    B21F_CLEAN_Z_MIN,
    B21F_CLEAN_Z_MAX,
    B21F_CEILING_Y,
    B21F_PLENUM_TOP_Y,
    'cleanroom'
  );

  return arch;
}

/**
 * Shared Dual-Zone A & B Mechanical Floor Architecture for Building 2 — 2F & M3F:
 *   - Central Corridor & True-Depth 3D Stairwell descending to lower floor separating Zone A (Left) & Zone B (Right)
 *   - Rear & Side structural walls, marked service walkways, and full dual-row MSB Electrical Switchroom on M3F!
 */
function buildDualZoneMechanicalFloor(
  halfX: number,
  halfZ: number,
  ceilY: number,
  corridorHalfX: number,
  includeMsbRoom = false
): THREE.Group {
  const arch = new THREE.Group();
  const roomW = halfX * 2;
  const roomD = halfZ * 2;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.34, roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.65 });
  const corrMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.75 });
  const glassDiv = new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25, side: THREE.DoubleSide });

  // Central Corridor separating Zone A (Left) and Zone B (Right)!
  const corridor = new THREE.Mesh(new THREE.BoxGeometry(corridorHalfX * 2, 0.04, roomD - 0.6), corrMat);
  corridor.position.set(0, 0.025, 0);
  arch.add(corridor);

  for (const sx of [-corridorHalfX, corridorHalfX]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, roomD - 0.6), stripeMat);
    stripe.position.set(sx, 0.03, 0);
    arch.add(stripe);
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.12, ceilY * 0.78, roomD - 2.0), glassDiv);
    divider.position.set(sx, (ceilY * 0.78) / 2, -0.5);
    arch.add(divider);
  }

  // True-Depth 3D Stairwell rising from lower floor into the central corridor (+Z front end)!
  arch.add(build3DStaircase(0, halfZ - 3.4, 0, 2.7));

  // Green pedestrian service walkways between AHU row and front Exhaust/Service zone
  const sideW = halfX - corridorHalfX - 1.2;
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.03, 2.2), walkMat);
    walk.position.set(side * (corridorHalfX + 0.6 + sideW / 2), 0.02, 1.2);
    arch.add(walk);
  }

  // Rear, Left & Right exterior walls + Steel roof perimeter beams
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, ceilY, 0.18), wallMat);
  rearWall.position.set(0, ceilY / 2, -halfZ);
  arch.add(rearWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, ceilY, roomD), wallMat);
  leftWall.position.set(-halfX, ceilY / 2, 0);
  arch.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, ceilY, roomD), wallMat);
  rightWall.position.set(halfX, ceilY / 2, 0);
  arch.add(rightWall);

  for (const pz of [-halfZ, halfZ]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 0.22), steelMat);
    beam.position.set(0, ceilY, pz);
    arch.add(beam);
  }

  // Full Building 2 M3F MSB Electrical Switchroom (front-right bay, 2 parallel facing rows of tall 2.4m AHU-height cabinets!)
  if (includeMsbRoom) {
    arch.add(buildMsbSwitchgearRoom(12.5, halfX - 0.3, 2.8, halfZ - 0.3, ceilY, 'front'));
  }

  return arch;
}

export function buildB22fArchitecture(): THREE.Group {
  return buildDualZoneMechanicalFloor(B22F_HALF_X, B22F_HALF_Z, B22F_CEILING_Y, B22F_CORRIDOR_HALF_X, false);
}

export function buildB2M3fArchitecture(): THREE.Group {
  return buildDualZoneMechanicalFloor(B2M3F_HALF_X, B2M3F_HALF_Z, B2M3F_CEILING_Y, B2M3F_CORRIDOR_HALF_X, true);
}

/**
 * Building 2 — 3rd Floor Optics Cleanroom Architecture (`b2_3f`):
 *   - 11 color-coded epoxy floor zones matching Scr_B2_3F_Overview.Pdl
 *   - Open perimeter (NO outer surrounding walls!), translucent internal zone dividers only
 *   - Optics Dicing / Grinding / Wax Clean / Polishing tools + cleanroom bunny-suit operators ALL facing INTO tools
 *   - Suspended glowing LED/HEPA ceiling (Y = 3.85m) separating 3F Cleanroom from Overhead Plenum!
 */
export function buildB23fArchitecture(): THREE.Group {
  const arch = new THREE.Group();

  const zones: { x1: number; x2: number; z1: number; z2: number; color: number }[] = [
    { x1: -18, x2: -9, z1: -12, z2: -4, color: 0xbfdbfe },
    { x1: -9, x2: 0, z1: -12, z2: -4, color: 0xbbf7d0 },
    { x1: 0, x2: 9, z1: -12, z2: -4, color: 0xbbf7d0 },
    { x1: 9, x2: 18, z1: -12, z2: -4, color: 0xa5f3fc },
    { x1: -18, x2: -9, z1: -4, z2: 4, color: 0xa5f3fc },
    { x1: -9, x2: 0, z1: -4, z2: 4, color: 0xe9d5ff },
    { x1: 0, x2: 9, z1: -4, z2: 4, color: 0xfed7aa },
    { x1: 9, x2: 18, z1: -4, z2: 4, color: 0xfed7aa },
    { x1: -18, x2: -6, z1: 4, z2: 12, color: 0xbfdbfe },
    { x1: -6, x2: 6, z1: 4, z2: 12, color: 0xe9d5ff },
    { x1: 6, x2: 18, z1: 4, z2: 12, color: 0xfde68a },
  ];

  for (const z of zones) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(z.x2 - z.x1 - 0.08, 0.08, z.z2 - z.z1 - 0.08),
      new THREE.MeshStandardMaterial({ color: z.color, roughness: 0.22, metalness: 0.14 })
    );
    slab.position.set((z.x1 + z.x2) / 2, 0.04, (z.z1 + z.z2) / 2);
    slab.receiveShadow = true;
    arch.add(slab);
  }

  const wallGlass = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.28,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });
  const addDiv = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(isX ? len : 0.14, B23F_CEILING_Y, isX ? 0.14 : len),
      wallGlass
    );
    w.position.set((x1 + x2) / 2, B23F_CEILING_Y / 2, (z1 + z2) / 2);
    arch.add(w);
  };
  addDiv(-18, -4, 18, -4);
  addDiv(-18, 4, 18, 4);
  addDiv(-9, -12, -9, 4);
  addDiv(0, -12, 0, 4);
  addDiv(9, -12, 9, 4);
  addDiv(-6, 4, -6, 12);
  addDiv(6, 4, 6, 12);

  const colWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
  const frameAlu = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.72 });
  const cols: [number, number][] = [
    [-13.5, -4.4], [-4.5, -4.4], [4.5, -4.4], [13.5, -4.4],
    [-13.5, 3.6], [-4.5, 3.6], [4.5, 3.6], [13.5, 3.6],
    [-12.0, 10.6], [0.0, 10.6], [7.8, 10.6], [12.0, 10.6],
  ];
  for (const [cx, cz] of cols) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, B23F_CEILING_Y, 0.42), colWhite);
    col.position.set(cx, B23F_CEILING_Y / 2, cz);
    arch.add(col);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), frameAlu);
    base.position.set(cx, 0.08, cz);
    arch.add(base);
  }

  // 3F Optics Process Tools aligned straight under the 3F PCW drops!
  for (const tx of [-13.5, -4.5, 4.5, 13.5]) {
    addCleanroomLaserTool(arch, tx, -8.0, 0);
  }
  addCleanroomBench(arch, -13.5, 0.0, 3.4);
  addCleanroomLaserTool(arch, -4.5, 0.0, 0);
  addCleanroomBench(arch, 4.5, 0.0, 3.4);
  addCleanroomBench(arch, 13.5, 0.0, 3.0);
  addCleanroomBench(arch, -12.0, 8.0, 3.6);
  addCleanroomLaserTool(arch, -2.5, 8.0, Math.PI);
  addCleanroomBench(arch, 3.0, 8.0, 3.2);

  // 6 Cleanroom Bunny-Suit Operators ALL facing straight INTO their equipment!
  addCleanroomBunnyOperator(arch, -13.5, -6.4, -13.5, -8.0, 'hmi');
  addCleanroomBunnyOperator(arch, -4.5, -6.4, -4.5, -8.0, 'work');
  addCleanroomBunnyOperator(arch, 4.5, -6.4, 4.5, -8.0, 'clipboard');
  addCleanroomBunnyOperator(arch, -13.5, 1.4, -13.5, 0.0, 'work');
  addCleanroomBunnyOperator(arch, 4.5, 1.4, 4.5, 0.0, 'work');
  addCleanroomBunnyOperator(arch, -2.5, 9.4, -2.5, 8.0, 'hmi');

  addSuspendedCleanroomCeiling(
    arch,
    B23F_HALF_X,
    -B23F_HALF_Z,
    B23F_HALF_Z,
    B23F_CEILING_Y,
    B23F_PLENUM_TOP_Y
  );

  return arch;
}
