import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Maximize2, Minimize2, Square, Video, Waves } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  B51F_CAMERA_PRESETS,
  computeOrthogonalPipePath,
  DEFAULT_3D_NODES,
  DEFAULT_3D_PIPES,
  FLUID_COLORS,
  resolveNodeTransform,
  ZONES_3D,
  type B51FLayerId,
  type Equipment3DNode,
  type NodeTransformOverride,
  type Pipe3DLink,
  type Zone3DId,
} from '../../training/plant3dLayout.ts';
import {
  B5_CEILING_Y,
  B5_CT_DECK_Y,
  B5_INNER_WALL_Z,
  B5_LEFT_WALL_X,
  B5_WALL_Z,
  buildB5ChillerDetailAssembly,
  type DetailedPipe3D,
  type InlineSensor3D,
  type InlineValve3D,
} from '../../training/b5Chiller3dDetail.ts';
import {
  buildB5M1fDetailAssembly,
  M1F_CEILING_Y,
  M1F_ROOM_HALF_Z,
  M1F_WALL_LEFT_X,
  M1F_WALL_RIGHT_X,
  type DetailedDuct3D,
} from '../../training/b5M1f3dDetail.ts';
import {
  buildB5M2fDetailAssembly,
  M2F_CEILING_Y,
  M2F_WALL_FRONT_Z,
  M2F_WALL_LEFT_X,
  M2F_WALL_REAR_Z,
  M2F_WALL_RIGHT_X,
} from '../../training/b5M2f3dDetail.ts';
import {
  B52F_CEILING_Y,
  B52F_HALF_X,
  B52F_HALF_Z,
  B52F_PLENUM_TOP_Y,
  buildB52fDetailAssembly,
} from '../../training/b52f3dDetail.ts';
import {
  B21F_CAMERA_PRESETS,
  buildB21fDetailAssembly,
  type B21FLayerId,
} from '../../training/b21f3dDetail.ts';
import { buildB22fDetailAssembly } from '../../training/b22f3dDetail.ts';
import { buildB23fDetailAssembly } from '../../training/b23f3dDetail.ts';
import { buildB2M3fDetailAssembly } from '../../training/b2M3f3dDetail.ts';
import {
  B31F_CAMERA_PRESETS,
  buildB31fDetailAssembly,
  type B31FLayerId,
} from '../../training/b31f3dDetail.ts';
import { buildB32fDetailAssembly } from '../../training/b32f3dDetail.ts';
import {
  build3DStaircase,
  buildB21fArchitecture,
  buildB22fArchitecture,
  buildB23fArchitecture,
  buildB2M3fArchitecture,
  buildMsbSwitchgearRoom,
} from './b2Architecture3d.ts';
import {
  buildB31fArchitecture,
  buildB32fArchitecture,
} from './b3Architecture3d.ts';
import { useB5Store } from '../../store/b5Store.ts';
import { useTrainingStore } from '../../store/trainingStore.ts';
import type { PlantState } from '../../types/scada.ts';

interface RuntimeNodeRecord {
  node: Equipment3DNode;
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  accentMats: THREE.MeshStandardMaterial[];
  rotors: THREE.Object3D[];
  damperBlades?: THREE.Object3D[];
  liquidMesh?: THREE.Mesh;
  liquidMaxH?: number;
  waterDrops?: {
    meshes: THREE.Mesh[];
    speeds: number[];
    minY: number;
    maxY: number;
    curtainMat: THREE.MeshStandardMaterial;
  };
}

interface RuntimePipeRecord {
  flowSourceTags: string[];
  requireAllTags?: string[];
  group: THREE.Group;
  points: THREE.Vector3[];
  cumLengths: number[];
  totalLength: number;
  particles: THREE.Mesh[];
  phaseOffset: number;
}

interface RuntimeValveRecord {
  valve: InlineValve3D;
  bodyMat: THREE.MeshStandardMaterial;
  actuatorMat: THREE.MeshStandardMaterial;
}

interface RuntimeSensorRecord {
  sensor: InlineSensor3D;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  lastText: string;
}

interface RuntimeVehicleRecord {
  mesh: THREE.Group;
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  minPos: number;
  maxPos: number;
}

function makeLabelSprite(
  text: string,
  bgColor = 'rgba(15, 23, 42, 0.90)',
  borderColor = '#38bdf8',
  textColor = '#f8fafc',
  scaleX = 3.2,
  scaleY = 0.68
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 332, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 23px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 26), 170, 37);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.userData.isLabelSprite = true;
  return sprite;
}

function drawLiveSensorCanvas(
  canvas: HTMLCanvasElement,
  label: string,
  valText: string,
  alarmLevel: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const isCrit = alarmLevel === 'FAULT' || alarmLevel === 'HHA' || alarmLevel === 'LLA';
  const isWarn = alarmLevel === 'HA' || alarmLevel === 'LA';
  const bg = isCrit ? '#dc2626' : isWarn ? '#facc15' : '#0f172a';
  const border = isCrit ? '#fecaca' : isWarn ? '#854d0e' : '#38bdf8';
  const textCol = isWarn ? '#0f172a' : '#ffffff';
  const valCol = isCrit ? '#fef08a' : isWarn ? '#0f172a' : '#4ade80';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textCol;
  ctx.font = 'bold 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, 26);

  ctx.fillStyle = valCol;
  ctx.font = 'bold 25px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(valText, canvas.width / 2, 56);
}

function makeRotorAssembly(radius: number, bladeCount = 6, color = 0x22c55e): { rotor: THREE.Group; mat: THREE.MeshStandardMaterial } {
  const rotor = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4, emissive: color, emissiveIntensity: 0.15 });
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 })
  );
  rotor.add(hub);
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.88, 0.05, radius * 0.24), mat);
    const angle = (i / bladeCount) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * radius * 0.45, 0, Math.sin(angle) * radius * 0.45);
    blade.rotation.y = -angle;
    blade.rotation.x = 0.28;
    rotor.add(blade);
  }
  return { rotor, mat };
}

/**
 * 3D Extruded SCADA 6-Blade Backward-Curved Impeller (exact 3D version of IndustrialFanIcon.tsx Mẫu 2!)
 * Built directly in the X-Y plane facing +Z so spinning `rotor.rotation.z -= ...` rotates 100% smoothly coaxially!
 */
function makeScadaImpeller3D(radius: number, color = 0x22c55e): { rotor: THREE.Group; mat: THREE.MeshStandardMaterial } {
  const rotor = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.42,
    emissive: color,
    emissiveIntensity: 0.22,
  });
  const hubOuterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 });
  const hubInnerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.8 });

  // Exact curved blade contour from IndustrialFanIcon.tsx:
  //   M -3 -8 C -4 -18, 2 -27, 13 -28 C 9 -20, 7 -13, 5 -7 Z  (scaled to radius / 30)
  const s = radius / 30;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-3 * s, 8 * s);
  bladeShape.bezierCurveTo(-4 * s, 18 * s, 2 * s, 27 * s, 13 * s, 28 * s);
  bladeShape.bezierCurveTo(9 * s, 20 * s, 7 * s, 13 * s, 5 * s, 7 * s);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.018);

  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.rotation.z = (i * Math.PI) / 3;
    rotor.add(blade);
  }

  // Concentric Outer & Inner Hub matching SCADA IndustrialFanIcon!
  const hubOuter = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.31, radius * 0.31, 0.06, 18), hubOuterMat);
  hubOuter.rotation.x = Math.PI / 2;
  rotor.add(hubOuter);

  const hubInner = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, 0.075, 14), hubInnerMat);
  hubInner.rotation.x = Math.PI / 2;
  rotor.add(hubInner);

  return { rotor, mat };
}

function makeKingSunLogoMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 112);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 108);

    // Red KingSun emblem: 金 (K) 日
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#dc2626';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('金', 46, 58);
    ctx.fillText('日', 210, 58);

    // Central circular (K) crest
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(128, 56, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '900 44px Arial, sans-serif';
    ctx.fillText('K', 128, 59);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.05 });
}

function makeDaikinLogoMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e5e5dc';
    ctx.fillRect(0, 0, 256, 80);

    // Classic Daikin cyan-blue folded triangle emblem
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(18, 20);
    ctx.lineTo(54, 20);
    ctx.lineTo(18, 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(54, 20);
    ctx.lineTo(54, 42);
    ctx.lineTo(18, 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'italic 900 38px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAIKIN', 64, 43);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1 });
}

function makePerforatedGuardMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#1e293b';
    for (let y = 8; y < 60; y += 10) {
      for (let x = 6; x < 126; x += 10) {
        ctx.beginPath();
        ctx.arc(x + ((y / 10) % 2) * 4, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.65 });
}

function makeIngersollRandLogoMaterial(bgHex = '#1c2026'): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 256, 80);

    // Signature Red Oval (IR) + Ingersoll Rand text
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(46, 40, 32, 20, -0.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'italic 900 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IR', 46, 42);

    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Ingersoll Rand', 86, 42);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.1 });
}

/**
 * High-resolution COHERENT Corporate Logo Texture (exact match to Coherent NT1 entrance monument & building facade!)
 * Features bold deep navy-blue COHERENT typography with the signature atomic-orbital "O" emblem.
 */
function makeCoherentLogoMaterial(bgHex = '#f8fafc', textHex = '#0b3b8c'): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = textHex;
    ctx.font = '900 76px "Arial Black", Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', 48, 67);

    // Signature Coherent Blue Atomic-Orbital Circle "O"
    const ox = 116;
    const oy = 64;
    ctx.beginPath();
    ctx.arc(ox, oy, 33, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = bgHex;
    ctx.lineWidth = 3.2;
    for (const ang of [0.25, 1.35, -0.82]) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, 27, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = textHex;
    ctx.textAlign = 'left';
    ctx.fillText('HERENT', 154, 67);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.1 });
}

/**
 * High-resolution BW INDUSTRIAL Corporate Logo Texture (exact match to BW Industrial park entrance monument).
 * Features bold deep-navy "B" + dual-tone navy/cyan "W" checkmark emblem + crisp cyan "INDUSTRIAL" wordmark.
 */
function makeBwIndustrialLogoMaterial(bgHex = '#f8fafc'): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 128);

    const navy = '#0a4b78';
    const cyan = '#11a8e0';

    // Bold deep-navy "B"
    ctx.fillStyle = navy;
    ctx.font = '900 84px "Arial Black", Impact, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('B', 14, 98);

    // Stylized dual-tone "W" (two cyan rising strokes behind two navy descending strokes)
    // Cyan middle rising stroke
    ctx.fillStyle = cyan;
    ctx.beginPath();
    ctx.moveTo(96, 98);
    ctx.lineTo(118, 40);
    ctx.lineTo(136, 40);
    ctx.lineTo(114, 98);
    ctx.closePath();
    ctx.fill();

    // Cyan tall right checkmark-wing rising stroke
    ctx.beginPath();
    ctx.moveTo(138, 98);
    ctx.lineTo(174, 16);
    ctx.lineTo(194, 16);
    ctx.lineTo(156, 98);
    ctx.closePath();
    ctx.fill();

    // Navy left descending stroke
    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.moveTo(76, 40);
    ctx.lineTo(96, 40);
    ctx.lineTo(114, 98);
    ctx.lineTo(96, 98);
    ctx.closePath();
    ctx.fill();

    // Navy middle descending stroke
    ctx.beginPath();
    ctx.moveTo(118, 40);
    ctx.lineTo(138, 40);
    ctx.lineTo(156, 98);
    ctx.lineTo(138, 98);
    ctx.closePath();
    ctx.fill();

    // Crisp light-weight cyan "INDUSTRIAL" wordmark
    ctx.fillStyle = cyan;
    ctx.font = '400 50px "Segoe UI", Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('INDUSTRIAL', 194, 98);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.1 });
}

function buildEquipmentMesh(node: Equipment3DNode): RuntimeNodeRecord {
  const group = new THREE.Group();
  group.userData = { nodeId: node.id };
  const [w, h, d] = node.size;
  const accentMats: THREE.MeshStandardMaterial[] = [];
  const rotors: THREE.Object3D[] = [];
  const damperBlades: THREE.Object3D[] = [];
  let liquidMesh: THREE.Mesh | undefined;
  let liquidMaxH: number | undefined;
  let waterDrops: RuntimeNodeRecord['waterDrops'];

  const steelDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.6 });
  const steelLight = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  switch (node.meshType) {
    case 'building': {
      // REALISTIC COHERENT NT1 (BW INDUSTRIAL) MODERN FACTORY BUILDING:
      //   - Corrugated silver-white metal siding + grey concrete base plinth + low-pitch gable roof with Royal-Blue parapet trim!
      //   - Authentic C-shaped recessed loading-dock bay facing internal road (+X for B2/B3/B4/B5, -X for B1/B6)!
      //   - Tall narrow dark-tinted architectural window slots + 2F office ribbon windows + COHERENT facade signage!
      const wallWhite = new THREE.MeshStandardMaterial({ color: 0xe6ecf2, roughness: 0.42, metalness: 0.22 });
      const wallRib = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.48, metalness: 0.26 });
      const roofLight = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45, metalness: 0.25 });
      const blueTrim = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.4 });
      const plinthMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.15 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.82 });
      const dockDoorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });

      // EXACT C-NOTCH RECESSED FOOTPRINT MATCHING DRONE & MASTERPLAN PHOTOS:
      //   Left Column (B3, B4) -> recessed loading bay faces RIGHT (+X, dockSide = +1)
      //   Center Column (B2, B5) & Right Column (B1, B6) -> recessed loading bay faces LEFT (-X, dockSide = -1)!
      const dockSide = node.id === 'site_b3' || node.id === 'site_b4' ? 1 : -1;
      const notchDepth = 2.05;
      const mainW = w - notchDepth;
      const mainCx = -dockSide * (notchDepth / 2);
      const wingLen = d * 0.21;
      const wingCx = dockSide * (w / 2 - notchDepth / 2);
      const bayLen = d - wingLen * 2;

      // 1. Main Full-Length Factory Hall shifted away from the recessed loading-dock bay
      const mainHall = new THREE.Mesh(new THREE.BoxGeometry(mainW, h, d), wallWhite);
      mainHall.position.set(mainCx, h / 2, 0);
      mainHall.castShadow = true;
      mainHall.receiveShadow = true;
      group.add(mainHall);

      // 2. Front & Rear Projecting Corner Wings forming the unmistakable C-Shaped Top-Down Footprint!
      for (const zDir of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(notchDepth + 0.06, h, wingLen), wallWhite);
        wing.position.set(wingCx, h / 2, zDir * (d / 2 - wingLen / 2));
        wing.castShadow = true;
        wing.receiveShadow = true;
        group.add(wing);
      }

      // 3. C-Shaped Concrete Plinth & Recessed Loading Dock Canopy + 5 Roll-Up Dock Doors (open to sky above!)
      const mainPlinth = new THREE.Mesh(new THREE.BoxGeometry(mainW + 0.08, 0.35, d + 0.08), plinthMat);
      mainPlinth.position.set(mainCx, 0.175, 0);
      group.add(mainPlinth);
      for (const zDir of [-1, 1]) {
        const wingPlinth = new THREE.Mesh(new THREE.BoxGeometry(notchDepth + 0.1, 0.35, wingLen + 0.08), plinthMat);
        wingPlinth.position.set(wingCx, 0.175, zDir * (d / 2 - wingLen / 2));
        group.add(wingPlinth);
      }

      const dockWallX = dockSide * (w / 2 - notchDepth);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, bayLen - 0.15), blueTrim);
      canopy.position.set(dockWallX + dockSide * 0.48, 1.85, 0);
      group.add(canopy);
      for (let di = 0; di < 5; di++) {
        const dz = -d * 0.24 + (di / 4) * (d * 0.48);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.88), dockDoorMat);
        door.position.set(dockWallX + dockSide * 0.02, 0.92, dz);
        group.add(door);
      }

      // 4. TRUE C-SHAPED GENTLY PITCHED LOW-SLOPE GABLE ROOF (subtle ~0.42m rise at central Z-ridge matching real Coherent NT1 photo!)
      const gableRise = 0.42;
      const halfW = w / 2;
      const slopeAngle = Math.atan2(gableRise, halfW);
      const slopeFullLen = Math.hypot(halfW, gableRise);
      const innerSpan = halfW - notchDepth;
      const slopeInnerLen = Math.hypot(innerSpan, innerSpan * (gableRise / halfW));
      const yAtNotch = h + gableRise * (notchDepth / halfW);

      // (a) Full-length non-dock half-roof slope (from central ridge X=0 down to outer eave X = -dockSide * w/2)
      const fullHalfRoof = new THREE.Mesh(new THREE.BoxGeometry(slopeFullLen + 0.14, 0.14, d + 0.12), roofLight);
      fullHalfRoof.position.set(-dockSide * (halfW / 2), h + gableRise / 2 + 0.05, 0);
      fullHalfRoof.rotation.z = dockSide * slopeAngle;
      fullHalfRoof.receiveShadow = true;
      group.add(fullHalfRoof);

      // (b) Dock-side half-roof: center bay stops at recessed notch wall (open loading bay!), front & rear wings extend full halfW!
      const innerBayRoof = new THREE.Mesh(new THREE.BoxGeometry(slopeInnerLen + 0.08, 0.14, bayLen + 0.06), roofLight);
      innerBayRoof.position.set(dockSide * (innerSpan / 2), (h + gableRise + yAtNotch) / 2 + 0.05, 0);
      innerBayRoof.rotation.z = -dockSide * slopeAngle;
      innerBayRoof.receiveShadow = true;
      group.add(innerBayRoof);

      for (const zDir of [-1, 1]) {
        const wingSlopeRoof = new THREE.Mesh(new THREE.BoxGeometry(slopeFullLen + 0.14, 0.14, wingLen + 0.1), roofLight);
        wingSlopeRoof.position.set(dockSide * (halfW / 2), h + gableRise / 2 + 0.05, zDir * (d / 2 - wingLen / 2));
        wingSlopeRoof.rotation.z = -dockSide * slopeAngle;
        wingSlopeRoof.receiveShadow = true;
        group.add(wingSlopeRoof);
      }

      // (c) Front (+Z) & Rear (-Z) subtle triangular gable pediment wall fills closing the peak seamlessly!
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-halfW, 0);
      gableShape.lineTo(0, gableRise);
      gableShape.lineTo(halfW, 0);
      gableShape.closePath();
      const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.12, bevelEnabled: false });
      for (const zSign of [-1, 1]) {
        const pediment = new THREE.Mesh(gableGeo, wallWhite);
        pediment.position.set(0, h, zSign > 0 ? d / 2 - 0.11 : -d / 2 - 0.01);
        group.add(pediment);
      }

      // (d) Crisp central Royal-Blue longitudinal ridge cap along X = 0 (at subtle gable peak!)
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, d + 0.12), blueTrim);
      ridge.position.set(0, h + gableRise + 0.11, 0);
      group.add(ridge);

      // (e) Exact C-shaped Royal-Blue Perimeter Parapet & Gently-Pitched Front/Rear Fascia Trim!
      for (const rz of [-d / 2 - 0.05, d / 2 + 0.05]) {
        for (const xSide of [-1, 1]) {
          const fascia = new THREE.Mesh(new THREE.BoxGeometry(slopeFullLen + 0.12, 0.18, 0.12), blueTrim);
          fascia.position.set(xSide * (halfW / 2), h + gableRise / 2 + 0.07, rz);
          fascia.rotation.z = -xSide * slopeAngle;
          group.add(fascia);
        }
      }
      const outerEdgeX = -dockSide * (w / 2 + 0.05);
      const trimOuter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, d + 0.16), blueTrim);
      trimOuter.position.set(outerEdgeX, h + 0.08, 0);
      group.add(trimOuter);
      // Recessed notch inner edge (follows elevated slope height yAtNotch!) + 2 wing outer caps + 2 pitched notch return trims
      const trimNotchInner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, bayLen + 0.1), blueTrim);
      trimNotchInner.position.set(dockWallX + dockSide * 0.05, yAtNotch + 0.08, 0);
      group.add(trimNotchInner);
      const notchSlopeLen = Math.hypot(notchDepth, yAtNotch - h);
      for (const zDir of [-1, 1]) {
        const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, wingLen + 0.12), blueTrim);
        wingTip.position.set(dockSide * (w / 2 + 0.05), h + 0.08, zDir * (d / 2 - wingLen / 2));
        group.add(wingTip);
        const notchStep = new THREE.Mesh(new THREE.BoxGeometry(notchSlopeLen + 0.1, 0.18, 0.12), blueTrim);
        notchStep.position.set(wingCx, (h + yAtNotch) / 2 + 0.07, zDir * (bayLen / 2 + 0.05));
        notchStep.rotation.z = -dockSide * slopeAngle;
        group.add(notchStep);
      }

      // Active SCADA Zone Color Accent Line following the gentle front (+Z) gable fascia (Emerald B5, Blue B2, Rose B3)
      if (node.targetZoneOnClick) {
        const accentHex = new THREE.Color(node.buildingColor ?? '#38bdf8');
        const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 0.45 });
        for (const xSide of [-1, 1]) {
          const frontAccent = new THREE.Mesh(new THREE.BoxGeometry(slopeFullLen + 0.1, 0.14, 0.14), accentMat);
          frontAccent.position.set(xSide * (halfW / 2), h + gableRise / 2 - 0.1, d / 2 + 0.07);
          frontAccent.rotation.z = -xSide * slopeAngle;
          group.add(frontAccent);
        }
        const outerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, d + 0.16), accentMat);
        outerAccent.position.set(-dockSide * (w / 2 + 0.07), h - 0.12, 0);
        group.add(outerAccent);
      }

      // 5. Tall Narrow Dark Vertical Window Slots & Horizontal Office Ribbon Windows on Front (+Z) & Back (-Z) Facades!
      const winCount = 5;
      for (let wi = 0; wi < winCount; wi++) {
        const wx = -w * 0.38 + (wi / (winCount - 1)) * (w * 0.76);
        for (const wz of [d / 2 + 0.03, -d / 2 - 0.03]) {
          // Vertical narrow architectural slot (signature BW Industrial / Coherent facade!)
          const vSlot = new THREE.Mesh(new THREE.BoxGeometry(0.24, h * 0.56, 0.06), glassMat);
          vSlot.position.set(wx, h * 0.48, wz);
          group.add(vSlot);
          // Subtle corrugated column rib between slots
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.94, 0.05), wallRib);
          rib.position.set(wx + 0.92, h * 0.48, wz);
          if (wi < winCount - 1) group.add(rib);
        }
      }
      // Horizontal dark-glass 2F office windows on front boulevard face (+Z)
      for (let oi = 0; oi < 4; oi++) {
        const ox = -w * 0.32 + oi * (w * 0.21);
        const oWin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.07), glassMat);
        oWin.position.set(ox, h * 0.24, d / 2 + 0.04);
        group.add(oWin);
      }

      // 6. Bold COHERENT Corporate Facade Logo mounted high on Front (+Z) Wall of active Coherent buildings!
      if (node.id === 'site_b2' || node.id === 'site_b5' || node.id === 'site_b3') {
        const logoSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), makeCoherentLogoMaterial('#e6ecf2', '#0b3b8c'));
        logoSign.position.set(0, h - 0.85, d / 2 + 0.07);
        group.add(logoSign);
      }
      break;
    }

    case 'water_chiller': {
      // REALISTIC DAIKIN WATER-COOLED CENTRIFUGAL CHILLER (from Front & Rear CAD Photos!):
      // Looking from outside (+Z) into the Chiller (-Z):
      //   - RIGHT (+X = +0.62) = Matte-Black Insulated CHW Evaporator Barrel + 2 Front Water Nozzles + Daikin HMI
      //   - LEFT  (-X = -0.62) = Off-White/Cream Steel Condenser Barrel (with subtle Magenta accent on CH-14 Heat Recovery!)
      //                          + Domed Bolted End-Caps + 2 Front Water Nozzles + 4 Brass Relief Valves on top!
      //   - TOP = Centrifugal Compressor (Front black insulated barrel + Center white volute + Red valve & red handwheel
      //           + Rear black insulated gooseneck with red flanges) + Cream Daikin Electrical Starter & VFD Cabinets!
      const isHeatRecovery = node.tag === 'B51F_CH14';
      const daikinCream = new THREE.MeshStandardMaterial({ color: 0xe5e5dc, roughness: 0.36, metalness: 0.22 });
      const daikinCreamDark = new THREE.MeshStandardMaterial({ color: 0xcbd0c8, roughness: 0.45, metalness: 0.28 });
      const blackInsul = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.72, metalness: 0.14 });
      const redValveMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.45 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.78 });
      const copperMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.75 });
      const daikinLogoMat = makeDaikinLogoMaterial();

      const barrelLen = d * 0.86;
      const frontFaceZ = d * 0.48;
      const rearFaceZ = -d * 0.44;

      // 1. Front & Rear Cream Steel Support End-Frames + Floor Mounting Flanges
      for (const ez of [frontFaceZ - 0.16, rearFaceZ + 0.12]) {
        const endPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 1.38, 0.08), daikinCream);
        endPlate.position.set(0, 0.7, ez);
        endPlate.castShadow = true;
        group.add(endPlate);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.07, 0.28), daikinCreamDark);
        foot.position.set(0, 0.035, ez);
        foot.receiveShadow = true;
        group.add(foot);
      }

      // 2. RIGHT Barrel (+X = +0.62): Matte-Black Insulated CHW Evaporator
      const evap = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, barrelLen, 24), blackInsul);
      evap.rotation.x = Math.PI / 2;
      evap.position.set(0.62, 1.02, 0);
      evap.castShadow = true;
      group.add(evap);

      // Black insulated square mounting flange + domed front & rear waterbox caps
      for (const cz of [frontFaceZ - 0.12, rearFaceZ + 0.08]) {
        const sqPlate = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.16, 0.07), blackInsul);
        sqPlate.position.set(0.62, 1.02, cz);
        group.add(sqPlate);
      }
      const evapFrontDome = new THREE.Mesh(new THREE.SphereGeometry(0.53, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), blackInsul);
      evapFrontDome.rotation.x = Math.PI / 2;
      evapFrontDome.scale.set(1, 0.48, 1);
      evapFrontDome.position.set(0.62, 1.02, frontFaceZ - 0.08);
      group.add(evapFrontDome);
      const evapRearDome = new THREE.Mesh(new THREE.SphereGeometry(0.53, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), blackInsul);
      evapRearDome.rotation.x = -Math.PI / 2;
      evapRearDome.scale.set(1, 0.42, 1);
      evapRearDome.position.set(0.62, 1.02, rearFaceZ + 0.04);
      group.add(evapRearDome);

      // Evaporator Front Water Nozzles (Lower Inlet #008f91 collar, Upper Outlet #00cfe8 collar)
      const chwrStub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 14), blackInsul);
      chwrStub.rotation.x = Math.PI / 2;
      chwrStub.position.set(0.62, 0.72, frontFaceZ + 0.06);
      group.add(chwrStub);
      const chwrTrim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 8, 16), new THREE.MeshStandardMaterial({ color: 0x008f91 }));
      chwrTrim.position.set(0.62, 0.72, frontFaceZ + 0.22);
      group.add(chwrTrim);

      const chwsStub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 14), blackInsul);
      chwsStub.rotation.x = Math.PI / 2;
      chwsStub.position.set(0.62, 1.38, frontFaceZ + 0.06);
      group.add(chwsStub);
      const chwsTrim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 8, 16), new THREE.MeshStandardMaterial({ color: 0x00cfe8 }));
      chwsTrim.position.set(0.62, 1.38, frontFaceZ + 0.22);
      group.add(chwsTrim);

      // 3. LEFT Barrel (-X = -0.62): Glossy Off-White/Cream Condenser (with Magenta Heat Recovery ID Band on CH-14!)
      const cond = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, barrelLen, 24), daikinCream);
      cond.rotation.x = Math.PI / 2;
      cond.position.set(-0.62, 1.02, 0);
      cond.castShadow = true;
      group.add(cond);

      if (isHeatRecovery) {
        const hrStripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.555, 0.555, 0.32, 24),
          new THREE.MeshStandardMaterial({ color: 0xe03c86, roughness: 0.35, metalness: 0.25 })
        );
        hrStripe.rotation.x = Math.PI / 2;
        hrStripe.position.set(-0.62, 1.02, 0.1);
        group.add(hrStripe);
      }

      // Domed Bolted Circular End-Caps + Bolt Flange Rings on Condenser (Front & Rear)
      const condFrontDome = new THREE.Mesh(new THREE.SphereGeometry(0.53, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), daikinCream);
      condFrontDome.rotation.x = Math.PI / 2;
      condFrontDome.scale.set(1, 0.48, 1);
      condFrontDome.position.set(-0.62, 1.02, frontFaceZ - 0.08);
      group.add(condFrontDome);
      const condRearDome = new THREE.Mesh(new THREE.SphereGeometry(0.53, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), daikinCream);
      condRearDome.rotation.x = -Math.PI / 2;
      condRearDome.scale.set(1, 0.48, 1);
      condRearDome.position.set(-0.62, 1.02, rearFaceZ + 0.04);
      group.add(condRearDome);
      for (const fzPos of [frontFaceZ - 0.1, rearFaceZ + 0.06]) {
        const boltRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 24), daikinCreamDark);
        boltRing.position.set(-0.62, 1.02, fzPos);
        group.add(boltRing);
      }

      // Condenser / Heat Recovery Front Water Nozzles
      const condInStub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 14), daikinCreamDark);
      condInStub.rotation.x = Math.PI / 2;
      condInStub.position.set(-0.62, 0.72, frontFaceZ + 0.06);
      group.add(condInStub);
      const condInTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.025, 8, 16),
        new THREE.MeshStandardMaterial({ color: isHeatRecovery ? 0xe03c86 : 0x5da0e8 })
      );
      condInTrim.position.set(-0.62, 0.72, frontFaceZ + 0.22);
      group.add(condInTrim);

      const condOutStub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 14), daikinCreamDark);
      condOutStub.rotation.x = Math.PI / 2;
      condOutStub.position.set(-0.62, 1.38, frontFaceZ + 0.06);
      group.add(condOutStub);
      const condOutTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.025, 8, 16),
        new THREE.MeshStandardMaterial({ color: isHeatRecovery ? 0xeb9ee3 : 0x2c5ec4 })
      );
      condOutTrim.position.set(-0.62, 1.38, frontFaceZ + 0.22);
      group.add(condOutTrim);

      // 4 Brass Safety Pressure Relief Valves lined neatly along top of Cream Condenser (visible in Rear Daikin CAD photo!)
      const rvBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), brassMat);
      rvBar.rotation.x = Math.PI / 2;
      rvBar.position.set(-0.82, 1.56, 0.15);
      group.add(rvBar);
      for (let ri = 0; ri < 4; ri++) {
        const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.28, 8), brassMat);
        rv.position.set(-0.82, 1.72, -0.2 + ri * 0.24);
        group.add(rv);
      }

      // 4. TOP CENTRIFUGAL COMPRESSOR ASSEMBLY (above Black Evaporator Barrel!)
      // Off-white cradle saddle brackets supporting compressor
      for (const bz of [0.35, 1.05]) {
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.09), daikinCream);
        saddle.position.set(0.52, 1.58, bz);
        group.add(saddle);
      }
      // Front Matte-Black Insulated Compressor Motor Barrel
      const compMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.05, 20), blackInsul);
      compMotor.rotation.x = Math.PI / 2;
      compMotor.position.set(0.52, 1.98, 0.72);
      compMotor.castShadow = true;
      group.add(compMotor);

      // Center Off-White Centrifugal Impeller Volute Casing
      const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.56, 20), daikinCream);
      volute.rotation.x = Math.PI / 2;
      volute.position.set(0.52, 2.02, -0.05);
      volute.castShadow = true;
      group.add(volute);

      // Live SCADA Status Indicator Ring around Compressor Volute (pulses green/grey/blue/red!)
      const statusRingMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.45, roughness: 0.25 });
      accentMats.push(statusRingMat);
      const statusRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.038, 8, 24), statusRingMat);
      statusRing.position.set(0.52, 2.02, 0.22);
      group.add(statusRing);

      // Bold RED Bolted Flange + Manual Isolation Valve + RED Handwheel on top of Compressor!
      const redFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16), redValveMat);
      redFlange.rotation.x = Math.PI / 2;
      redFlange.position.set(0.52, 2.02, -0.56);
      group.add(redFlange);
      const wheelStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), redValveMat);
      wheelStem.position.set(0.52, 2.28, -0.56);
      group.add(wheelStem);
      const redWheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 18), redValveMat);
      redWheel.rotation.x = Math.PI / 2;
      redWheel.position.set(0.52, 2.45, -0.56);
      group.add(redWheel);

      // Rear Matte-Black Insulated Curved Gooseneck Suction Pipe dropping into Rear Evaporator with Red Flange!
      const rearElbowH = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.52, 16), blackInsul);
      rearElbowH.rotation.x = Math.PI / 2;
      rearElbowH.position.set(0.52, 2.02, -0.88);
      group.add(rearElbowH);
      const rearElbowV = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 16), blackInsul);
      rearElbowV.position.set(0.52, 1.72, -1.12);
      group.add(rearElbowV);
      const rearRedFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), redValveMat);
      rearRedFlange.position.set(0.52, 1.48, -1.12);
      group.add(rearRedFlange);

      // Small Oil Separator Pot + Copper Refrigerant Tube tucked behind compressor
      const oilSep = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.52, 14), daikinCream);
      oilSep.position.set(-0.18, 1.78, 0.15);
      group.add(oilSep);
      const cuPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), copperMat);
      cuPipe.rotation.z = Math.PI / 2;
      cuPipe.position.set(0.12, 1.82, 0.15);
      group.add(cuPipe);

      // 5. CREAM DAIKIN ELECTRICAL STARTER & VFD CABINETS + DAIKIN BLUE LOGO + LOCAL HMI
      // Main Tall Double-Door Starter Panel on Rear-Left (-X side)
      const mainCab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.15, 1.25), daikinCream);
      mainCab.position.set(-0.48, 2.1, -0.75);
      mainCab.castShadow = true;
      group.add(mainCab);
      // Door seam + twin latches + Daikin Logo on outer (-X) face of Main Starter Cabinet
      const cabLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.22), daikinLogoMat);
      cabLogo.rotation.y = -Math.PI / 2;
      cabLogo.position.set(-0.72, 2.42, -0.75);
      group.add(cabLogo);
      // Cable glands on top of starter cabinet
      for (let gi = 0; gi < 4; gi++) {
        const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), steelDark);
        gland.position.set(-0.48, 2.71, -1.05 + gi * 0.16);
        group.add(gland);
      }

      // Secondary Front-Left VFD / Starter Box
      const frontCab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.82, 0.72), daikinCream);
      frontCab.position.set(-0.46, 1.98, 0.85);
      frontCab.castShadow = true;
      group.add(frontCab);

      // Front-Right Daikin MicroTech Local Controller Box + Angled Touchscreen HMI on Evaporator Side!
      const hmiBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 0.44), daikinCream);
      hmiBox.position.set(1.16, 1.62, -0.58);
      group.add(hmiBox);
      const hmiLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.11), daikinLogoMat);
      hmiLogo.rotation.y = Math.PI / 2;
      hmiLogo.position.set(1.31, 1.72, -0.58);
      group.add(hmiLogo);
      const hmiFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.52), steelLight);
      hmiFrame.position.set(1.24, 1.18, -0.58);
      group.add(hmiFrame);
      const hmiScreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.45 });
      accentMats.push(hmiScreenMat);
      const hmiScreen = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.44), hmiScreenMat);
      hmiScreen.position.set(1.28, 1.18, -0.58);
      group.add(hmiScreen);
      break;
    }

    case 'air_chiller': {
      // REALISTIC DAIKIN EWAD-TZ B AIR-COOLED SCREW CHILLER (faithful to uploaded Daikin EWAD-TZ B photo!):
      //   - Open steel bottom skid frame with yellow lifting lugs exposing dark evaporator barrel, black screw compressor & copper pipes
      //   - Front (-X) clean off-white 3-door Daikin electrical control cabinet + DAIKIN blue logo + red E-stop + black rotary handle
      //   - Upper warm taupe/stone-grey V-coil condenser housing with 4 inverted-V cutouts per side revealing dark aluminum fin banks
      //   - Roof deck with 6 (2×3) matte-black circular axial fan shrouds & coaxial spinning fans (tilted pivot -> zero gimbal wobble!)
      const frameLight = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.36, metalness: 0.55 });
      const panelWhite = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.32, metalness: 0.22 });
      const taupeShroud = new THREE.MeshStandardMaterial({ color: 0x9c9284, roughness: 0.44, metalness: 0.32 });
      const finDark = new THREE.MeshStandardMaterial({ color: 0x263140, roughness: 0.62, metalness: 0.55 });
      const blackMach = new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.52, metalness: 0.45 });
      const copperMat = new THREE.MeshStandardMaterial({ color: 0xc26d3a, roughness: 0.3, metalness: 0.78 });
      const yellowLug = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
      const daikinLogoMat = makeDaikinLogoMaterial();

      const lowerH = h * 0.38; // Open compressor/evaporator skid bay (Y = 0 .. ~0.97m)
      const upperH = h * 0.54; // Upper V-coil condenser deck (Y = 0.97 .. ~2.35m)
      const upperY = lowerH + upperH / 2;

      // 1. Open Steel Bottom Skid Frame (rails, corner posts & yellow corner tie-down lugs!)
      for (const rz of [-d * 0.46, d * 0.46]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), frameLight);
        rail.position.set(0, 0.05, rz);
        group.add(rail);
      }
      for (const rx of [-w * 0.48, -w * 0.14, w * 0.18, w * 0.48]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, d), frameLight);
        cross.position.set(rx, 0.05, 0);
        group.add(cross);
        for (const rz of [-d * 0.46, d * 0.46]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, lowerH, 0.09), frameLight);
          post.position.set(rx, lowerH / 2, rz);
          group.add(post);
        }
      }
      for (const rx of [-w * 0.46, w * 0.46]) {
        for (const rz of [-d * 0.47, d * 0.47]) {
          const lug = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.04), yellowLug);
          lug.position.set(rx, 0.16, rz);
          group.add(lug);
        }
      }

      // 2. Exposed Lower Evaporator Barrel, Screw Compressor & Copper Refrigerant Lines inside Open Skid!
      const evapDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, w * 0.72, 18), blackMach);
      evapDrum.rotation.z = Math.PI / 2;
      evapDrum.position.set(w * 0.06, 0.48, -d * 0.14);
      evapDrum.castShadow = true;
      group.add(evapDrum);

      const screwComp = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, w * 0.36, 16), blackMach);
      screwComp.rotation.z = Math.PI / 2;
      screwComp.position.set(w * 0.16, 0.56, d * 0.2);
      screwComp.castShadow = true;
      group.add(screwComp);

      const statusCollarMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.5 });
      accentMats.push(statusCollarMat);
      const compRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.032, 8, 20), statusCollarMat);
      compRing.rotation.y = Math.PI / 2;
      compRing.position.set(w * 0.16, 0.56, d * 0.2);
      group.add(compRing);

      for (const cz of [-0.28, 0.18]) {
        const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8), copperMat);
        cu.position.set(-w * 0.18, 0.65, cz);
        group.add(cu);
      }

      // 3. Front (-X) Off-White 3-Door Daikin Electrical Control Cabinet + DAIKIN Logo + E-Stop + Rotary Handle!
      const cabW = w * 0.24;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(cabW, upperH + 0.08, d * 0.96), panelWhite);
      cab.position.set(-w * 0.5 + cabW / 2, upperY, 0);
      cab.castShadow = true;
      group.add(cab);

      // Door vertical seams + vent grille + red E-stop + black rotary disconnect + DAIKIN logo on -X face
      for (const sz of [-d * 0.16, d * 0.18]) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, upperH, 0.025), blackMach);
        seam.position.set(-w * 0.5 - 0.005, upperY, sz);
        group.add(seam);
      }
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.32), frameLight);
      vent.position.set(-w * 0.5 - 0.01, upperY + 0.32, 0.0);
      group.add(vent);
      const eStop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
      );
      eStop.rotation.z = Math.PI / 2;
      eStop.position.set(-w * 0.5 - 0.02, upperY - 0.15, 0.0);
      group.add(eStop);
      const rotHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.14), blackMach);
      rotHandle.position.set(-w * 0.5 - 0.02, upperY - 0.22, d * 0.3);
      group.add(rotHandle);
      const logoPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.2), daikinLogoMat);
      logoPlaque.rotation.y = -Math.PI / 2;
      logoPlaque.position.set(-w * 0.5 - 0.015, upperY + 0.45, d * 0.32);
      group.add(logoPlaque);

      // 4. Upper Taupe/Stone-Grey V-Coil Condenser Bank (4 dark fin bays + taupe V-shroud mullions along both sides!)
      const condW = w - cabW;
      const condCx = cabW / 2;
      const finCore = new THREE.Mesh(new THREE.BoxGeometry(condW * 0.96, upperH * 0.9, d * 0.88), finDark);
      finCore.position.set(condCx, upperY, 0);
      finCore.castShadow = true;
      group.add(finCore);

      // Top & bottom taupe condenser fascia rails + 5 slanted taupe chevron panels creating the iconic EWAD-TZ V-cutouts!
      for (const rz of [-d * 0.47, d * 0.47]) {
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(condW, 0.22, 0.08), taupeShroud);
        topRail.position.set(condCx, lowerH + upperH - 0.1, rz);
        group.add(topRail);
        const botRail = new THREE.Mesh(new THREE.BoxGeometry(condW, 0.14, 0.08), taupeShroud);
        botRail.position.set(condCx, lowerH + 0.06, rz);
        group.add(botRail);
        for (let vi = 0; vi < 4; vi++) {
          const vx = condCx - condW * 0.36 + vi * (condW * 0.24);
          const vPillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, upperH * 0.86, 0.07), taupeShroud);
          vPillar.position.set(vx, upperY, rz);
          vPillar.rotation.z = vi % 2 === 0 ? 0.18 : -0.18;
          group.add(vPillar);
        }
      }
      const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, upperH, d * 0.96), taupeShroud);
      rearPlate.position.set(w * 0.5 - 0.05, upperY, 0);
      group.add(rearPlate);

      // 5. Roof Fan Deck with 6 (2×3) Matte-Black Round Axial Condenser Fans spinning coaxially!
      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.1, d * 0.96), frameLight);
      roofDeck.position.y = lowerH + upperH;
      group.add(roofDeck);
      for (const fx of [-w * 0.28, 0.02, w * 0.32]) {
        for (const fz of [-d * 0.24, d * 0.24]) {
          const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.49, 0.22, 18, 1, true), blackMach);
          shroud.position.set(fx, lowerH + upperH + 0.12, fz);
          group.add(shroud);
          const fanPivot = new THREE.Group();
          fanPivot.position.set(fx, lowerH + upperH + 0.14, fz);
          fanPivot.rotation.x = Math.PI / 2;
          const imp = makeScadaImpeller3D(0.42);
          fanPivot.add(imp.rotor);
          group.add(fanPivot);
          rotors.push(imp.rotor);
          accentMats.push(imp.mat);
        }
      }
      break;
    }

    case 'heat_fan': {
      // REALISTIC UPRIGHT AIR-SOURCE HEAT FAN / HEAT PUMP (faithful to uploaded Mitsubishi Electric City Multi photo!):
      //   - Tall warm ivory/cream rectangular sheet-metal cabinet on low leveling feet
      //   - Exposed silver-blue finned heat-exchanger coil bank wrapping side/rear behind protective white wire grid cage
      //   - Upper-front service panel seam + brand nameplate badge
      //   - Single large round ivory-cream top fan discharge shroud + domed wire mesh guard + coaxial spinning top axial fan!
      const creamBody = new THREE.MeshStandardMaterial({ color: 0xe8e2d3, roughness: 0.38, metalness: 0.18 });
      const creamDark = new THREE.MeshStandardMaterial({ color: 0xd4ccb8, roughness: 0.45, metalness: 0.22 });
      const coilFin = new THREE.MeshStandardMaterial({ color: 0x6b879e, roughness: 0.42, metalness: 0.62 });
      const wireWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.45 });
      const badgeRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
      const footDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

      const bodyH = h * 0.8; // Main upright cabinet (Y = 0.08 .. 1.88m)
      const bodyY = 0.08 + bodyH / 2;

      // 4 Leveling base rails
      for (const fx of [-w * 0.38, w * 0.38]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, d * 0.92), footDark);
        foot.position.set(fx, 0.04, 0);
        group.add(foot);
      }

      // Main Upright Cream Sheet-Metal Cabinet
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, bodyH, d * 0.94), creamBody);
      cabinet.position.y = bodyY;
      cabinet.castShadow = true;
      cabinet.receiveShadow = true;
      group.add(cabinet);

      // Front (+Z) upper/lower hinged service door seam + silver/red nameplate badge!
      const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.02, 0.02), creamDark);
      doorSeam.position.set(0, bodyY + 0.05, d * 0.475);
      group.add(doorSeam);
      const badgePlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.02), wireWhite);
      badgePlate.position.set(-w * 0.14, bodyY + bodyH * 0.32, d * 0.475);
      group.add(badgePlate);
      const badgeAccent = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.025), badgeRed);
      badgeAccent.position.set(-w * 0.14, bodyY + bodyH * 0.34, d * 0.48);
      group.add(badgeAccent);

      // Exposed Silver-Blue Louvered Finned Coil Bank on Right (+X) & Rear (-Z) behind White Protective Wire Grid!
      const sideCoil = new THREE.Mesh(new THREE.BoxGeometry(0.08, bodyH * 0.84, d * 0.78), coilFin);
      sideCoil.position.set(w * 0.46, bodyY, 0);
      group.add(sideCoil);
      const rearCoil = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, bodyH * 0.84, 0.08), coilFin);
      rearCoil.position.set(0, bodyY, -d * 0.46);
      group.add(rearCoil);
      for (let wi = -2; wi <= 2; wi++) {
        const barH = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, d * 0.8), wireWhite);
        barH.position.set(w * 0.505, bodyY + wi * (bodyH * 0.16), 0);
        group.add(barH);
      }

      // Single Large Round Cream Top Fan Discharge Shroud + Domed White Wire Mesh Guard + Coaxial Spinning Top Fan!
      const shroudR = Math.min(w, d) * 0.4;
      const shroudH = h * 0.18;
      const shroudY = 0.08 + bodyH + shroudH / 2;
      const topShroud = new THREE.Mesh(new THREE.CylinderGeometry(shroudR, shroudR * 1.04, shroudH, 24, 1, true), creamBody);
      topShroud.position.y = shroudY;
      topShroud.castShadow = true;
      group.add(topShroud);

      const guardDome = new THREE.Mesh(
        new THREE.SphereGeometry(shroudR * 0.98, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, wireframe: true, transparent: true, opacity: 0.72 })
      );
      guardDome.scale.set(1, 0.36, 1);
      guardDome.position.y = 0.08 + bodyH + shroudH;
      group.add(guardDome);

      const hpPivot = new THREE.Group();
      hpPivot.position.y = shroudY + 0.02;
      hpPivot.rotation.x = Math.PI / 2;
      const hpImp = makeScadaImpeller3D(shroudR * 0.86);
      hpPivot.add(hpImp.rotor);
      group.add(hpPivot);
      rotors.push(hpImp.rotor);
      accentMats.push(hpImp.mat);
      break;
    }

    case 'cooling_tower': {
      // REALISTIC KINGSUN (金日) SQUARE FRP COUNTERFLOW COOLING TOWER:
      // 1) 4 off-white FRP corner legs + cold-water basin with visible shimmering water
      // 2) Dark horizontal air-intake louvers with live animated falling/dripping water droplets!
      // 3) Ribbed off-white FRP upper casing + KingSun "金 (K) 日" red logo plaque + bolted pipe flanges
      // 4) Tapered FRP transition hood + open circular fan stack + spinning 6-blade axial fan + wire guard + top motor!
      const frpWhite = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.14 });
      const frpRib = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.42, metalness: 0.18 });
      const louverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.25 });
      const darkCavityMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.85 });

      // 1. 4 Corner Support Legs (lifting basin slightly off deck)
      for (const lx of [-w * 0.43, w * 0.43]) {
        for (const lz of [-d * 0.42, d * 0.42]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), frpRib);
          leg.position.set(lx, 0.17, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // Cold-Water Collecting Basin Tray + Shimmering Blue Water Pool
      const basinBottom = new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, d), frpWhite);
      basinBottom.position.y = 0.36;
      basinBottom.castShadow = true;
      basinBottom.receiveShadow = true;
      group.add(basinBottom);

      const waterPool = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.92, 0.08, d * 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.4,
          roughness: 0.12,
          metalness: 0.35,
          transparent: true,
          opacity: 0.88,
        })
      );
      waterPool.position.y = 0.51;
      group.add(waterPool);

      // 2. Lower Air-Intake Louver & Dripping Water Zone (y = 0.49 .. 1.24)
      const louverMinY = 0.52;
      const louverMaxY = 1.22;
      const louverH = louverMaxY - louverMinY;
      const wetCore = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, louverH, d * 0.8), darkCavityMat);
      wetCore.position.y = (louverMinY + louverMaxY) / 2;
      group.add(wetCore);

      // Subtle translucent falling-water mist curtain right behind intake louvers
      const curtainMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.34,
        roughness: 0.15,
      });
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(w * 0.91, louverH - 0.04, d * 0.89), curtainMat);
      curtain.position.y = (louverMinY + louverMaxY) / 2;
      group.add(curtain);

      // Corner & center vertical black louver frames
      for (const px of [-w * 0.48, 0, w * 0.48]) {
        for (const pz of [-d * 0.48, d * 0.48]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, louverH + 0.06, 0.08), louverMat);
          post.position.set(px, (louverMinY + louverMaxY) / 2, pz);
          group.add(post);
        }
      }
      // 6 Crisp Horizontal Dark Louver Slats around all 4 sides
      const slatCount = 6;
      for (let si = 0; si < slatCount; si++) {
        const sy = louverMinY + 0.07 + (si / (slatCount - 1)) * (louverH - 0.14);
        // Front & Back slats
        for (const sz of [d * 0.495, -d * 0.495]) {
          const slatFB = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.045, 0.06), louverMat);
          slatFB.position.set(0, sy, sz);
          slatFB.rotation.x = sz > 0 ? 0.38 : -0.38;
          group.add(slatFB);
        }
        // Left & Right slats
        for (const sx of [-w * 0.495, w * 0.495]) {
          const slatLR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, d * 0.98), louverMat);
          slatLR.position.set(sx, sy, 0);
          slatLR.rotation.z = sx > 0 ? -0.38 : 0.38;
          group.add(slatLR);
        }
      }

      // Live Animated Falling Water Droplets ("nước chảy nhỏ giọt") visible through the intake louvers!
      const dropGeo = new THREE.CylinderGeometry(0.016, 0.03, 0.14, 6);
      const dropMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.95,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
      });
      const dropMeshes: THREE.Mesh[] = [];
      const dropSpeeds: number[] = [];
      // 12 droplets across Front (+Z), 8 across Back (-Z), 4 on Left (-X), 4 on Right (+X)
      for (let di = 0; di < 12; di++) {
        const frac = (di + 0.5) / 12;
        const drop = new THREE.Mesh(dropGeo, dropMat);
        drop.position.set(-w * 0.44 + frac * w * 0.88, louverMinY + ((di * 0.37) % 1) * louverH, d * 0.47);
        group.add(drop);
        dropMeshes.push(drop);
        dropSpeeds.push(1.15 + (di % 4) * 0.22);
      }
      for (let di = 0; di < 8; di++) {
        const frac = (di + 0.5) / 8;
        const drop = new THREE.Mesh(dropGeo, dropMat);
        drop.position.set(-w * 0.42 + frac * w * 0.84, louverMinY + ((di * 0.29 + 0.4) % 1) * louverH, -d * 0.47);
        group.add(drop);
        dropMeshes.push(drop);
        dropSpeeds.push(1.1 + (di % 3) * 0.25);
      }
      for (const sideX of [-w * 0.47, w * 0.47]) {
        for (let di = 0; di < 4; di++) {
          const frac = (di + 0.5) / 4;
          const drop = new THREE.Mesh(dropGeo, dropMat);
          drop.position.set(sideX, louverMinY + ((di * 0.41 + 0.2) % 1) * louverH, -d * 0.38 + frac * d * 0.76);
          group.add(drop);
          dropMeshes.push(drop);
          dropSpeeds.push(1.2 + (di % 3) * 0.2);
        }
      }
      waterDrops = {
        meshes: dropMeshes,
        speeds: dropSpeeds,
        minY: louverMinY - 0.04,
        maxY: louverMaxY,
        curtainMat,
      };

      // 3. Upper Ribbed Off-White FRP Casing (y = 1.24 .. 2.42)
      const casingH = 1.18;
      const casingY = 1.24 + casingH / 2;
      const upperCasing = new THREE.Mesh(new THREE.BoxGeometry(w, casingH, d), frpWhite);
      upperCasing.position.y = casingY;
      upperCasing.castShadow = true;
      upperCasing.receiveShadow = true;
      group.add(upperCasing);

      // Horizontal seam molding trim at top & bottom of upper FRP wall
      for (const trimY of [1.26, 2.41]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.06, d + 0.05), frpRib);
        trim.position.y = trimY;
        group.add(trim);
      }
      // Vertical FRP reinforcement ribs along front, back & sides
      for (let ri = -2; ri <= 2; ri++) {
        const rx = (ri / 2.5) * (w * 0.5);
        for (const rz of [d * 0.5 + 0.015, -d * 0.5 - 0.015]) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.045, casingH, 0.03), frpRib);
          rib.position.set(rx, casingY, rz);
          group.add(rib);
        }
      }
      for (let ri = -1; ri <= 1; ri++) {
        const rz = (ri / 1.5) * (d * 0.45);
        for (const rx of [-w * 0.5 - 0.015, w * 0.5 + 0.015]) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, casingH, 0.045), frpRib);
          rib.position.set(rx, casingY, rz);
          group.add(rib);
        }
      }

      // KingSun "金 (K) 日" Front Nameplate Plaque
      const logoPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.52), makeKingSunLogoMaterial());
      logoPlaque.position.set(0, 1.78, d * 0.5 + 0.035);
      group.add(logoPlaque);

      // Bolted Pipe Flanges on REAR Face (-Z) matching b5Chiller3dDetail.ts & real KingSun photo (inlet y=2.35, outlet y=0.35)!
      const flangeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 14);
      flangeGeo.rotateX(Math.PI / 2);
      const inFlange = new THREE.Mesh(flangeGeo, new THREE.MeshStandardMaterial({ color: 0x2c5ec4, metalness: 0.55, roughness: 0.35 }));
      inFlange.position.set(0, 2.35, -d * 0.5 - 0.03);
      group.add(inFlange);
      const outFlange = new THREE.Mesh(flangeGeo, new THREE.MeshStandardMaterial({ color: 0x5da0e8, metalness: 0.55, roughness: 0.35 }));
      outFlange.position.set(0, 0.35, -d * 0.5 - 0.03);
      group.add(outFlange);

      // 4. Tapered FRP Transition Hood (Square -> Circular Fan Stack, y = 2.42 .. 2.94)
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.64, 0.52, 4), frpWhite);
      hood.rotation.y = Math.PI / 4;
      hood.scale.z = d / w;
      hood.position.y = 2.68;
      hood.castShadow = true;
      group.add(hood);

      // Open Cylindrical Fan Shroud / Stack (y = 2.92 .. 3.26)
      const stackR = Math.min(w, d) * 0.39;
      const stackOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(stackR, stackR * 1.08, 0.36, 24, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide })
      );
      stackOuter.position.y = 3.08;
      group.add(stackOuter);

      const stackInnerWell = new THREE.Mesh(new THREE.CylinderGeometry(stackR * 0.96, stackR * 0.96, 0.08, 20), darkCavityMat);
      stackInnerWell.position.y = 2.94;
      group.add(stackInnerWell);

      const stackRim = new THREE.Mesh(new THREE.TorusGeometry(stackR, 0.04, 8, 24), frpRib);
      stackRim.rotation.x = Math.PI / 2;
      stackRim.position.y = 3.26;
      group.add(stackRim);

      // Large 6-Blade Axial Fan Rotor spinning INSIDE the Top Fan Stack!
      const { rotor, mat } = makeRotorAssembly(stackR * 0.88, 6, 0x22c55e);
      rotor.position.y = 3.12;
      rotors.push(rotor);
      accentMats.push(mat);
      group.add(rotor);

      // Protective Top Wire-Mesh Fan Guard (concentric rings + crossbars)
      const guardMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      for (const gr of [stackR * 0.38, stackR * 0.72]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(gr, 0.014, 6, 20), guardMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 3.27;
        group.add(ring);
      }
      for (let ga = 0; ga < 4; ga++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(stackR * 1.94, 0.018, 0.022), guardMat);
        spoke.position.y = 3.27;
        spoke.rotation.y = (ga * Math.PI) / 4;
        group.add(spoke);
      }

      // Top-Mounted External Fan Motor + White Belt-Drive Housing (Signature KingSun Detail!)
      const beltCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, stackR * 1.02), frpWhite);
      beltCover.position.set(0, 3.35, -stackR * 0.45);
      beltCover.castShadow = true;
      group.add(beltCover);

      const topMotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.34, 14),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 })
      );
      topMotor.position.set(0, 3.55, -stackR * 0.85);
      topMotor.castShadow = true;
      group.add(topMotor);

      // 5. Individual Safety-Yellow Caged Anti-Fall Ladder mounted on the RIGHT FLANK (+X) of EVERY Cooling Tower!
      const towerLadderMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.35 });
      const towerLadder = buildCagedLadderMesh(3.2, towerLadderMat, 0.9, 0.34);
      towerLadder.rotation.y = Math.PI / 2; // Climber faces -X toward tower body; anti-fall cage shields back (+X)
      towerLadder.position.set(w * 0.5 + 0.1, 0, 0);
      group.add(towerLadder);
      break;
    }

    case 'pump': {
      // REALISTIC HIGH-POWER VERTICAL IN-LINE CENTRIFUGAL PUMP (Teal-Green Cast Body & Vertical Finned Motor!):
      //   - REAR (+Z = +0.62, facing inner wall) = Horizontal Bolted SUCTION Inlet Flange
      //   - FRONT (-Z = -0.62, facing Chillers)  = Horizontal Bolted DISCHARGE Outlet Flange
      //   - Open lantern bracket with perforated silver stainless guard + tall vertical finned motor + top cowl + lifting lugs!
      const pumpTeal = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.34, metalness: 0.42 });
      const pumpTealDark = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4, metalness: 0.48 });
      const pumpTealLight = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3, metalness: 0.38 });
      const guardMat = makePerforatedGuardMaterial();
      const boreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

      // 1. Heavy Cast Square Baseplate & Pedestal Gusset Stand
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.78), pumpTealDark);
      basePlate.position.y = 0.04;
      basePlate.receiveShadow = true;
      group.add(basePlate);
      const pedCol = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.44), pumpTealDark);
      pedCol.position.y = 0.22;
      group.add(pedCol);

      // 2. Horizontal Spiral Volute Casing (centered at Y = 0.48)
      const voluteBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.28, 24), pumpTeal);
      voluteBody.position.y = 0.48;
      voluteBody.castShadow = true;
      group.add(voluteBody);
      const voluteTopCover = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.1, 20), pumpTealLight);
      voluteTopCover.position.y = 0.66;
      group.add(voluteTopCover);

      // Opposing Inline Horizontal Flanged Suction (+Z Rear) & Discharge (-Z Front) Nozzles!
      const pipeNeckGeo = new THREE.CylinderGeometry(0.145, 0.165, 0.42, 16);
      pipeNeckGeo.rotateX(Math.PI / 2);
      const flangeDiskGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 18);
      flangeDiskGeo.rotateX(Math.PI / 2);
      const boreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 14);
      boreGeo.rotateX(Math.PI / 2);

      for (const dirZ of [1, -1]) {
        const neck = new THREE.Mesh(pipeNeckGeo, pumpTeal);
        neck.position.set(0, 0.48, dirZ * 0.42);
        group.add(neck);
        const flange = new THREE.Mesh(flangeDiskGeo, pumpTealLight);
        flange.position.set(0, 0.48, dirZ * 0.62);
        group.add(flange);
        const bore = new THREE.Mesh(boreGeo, boreMat);
        bore.position.set(0, 0.48, dirZ * 0.625);
        group.add(bore);
      }

      // 3. Open Coupling Lantern Pedestal + Perforated Silver Stainless Coupling Guard (Y = 0.70 .. 1.06)
      const lanternLowerFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.07, 18), pumpTealDark);
      lanternLowerFlange.position.y = 0.72;
      group.add(lanternLowerFlange);
      const guardCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 20), guardMat);
      guardCyl.position.y = 0.89;
      group.add(guardCyl);
      for (let pi = 0; pi < 4; pi++) {
        const ang = (pi * Math.PI) / 2 + Math.PI / 4;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.055), pumpTealDark);
        post.position.set(Math.cos(ang) * 0.25, 0.89, Math.sin(ang) * 0.25);
        group.add(post);
      }
      const lanternUpperFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.09, 20), pumpTeal);
      lanternUpperFlange.position.y = 1.06;
      group.add(lanternUpperFlange);

      // 4. Tall High-Power Vertical Finned Electric Motor (Y = 1.10 .. 1.94)
      const motorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.84, 22), pumpTeal);
      motorCore.position.y = 1.52;
      motorCore.castShadow = true;
      group.add(motorCore);
      // 16 Vertical Radial Cooling Fins around the Motor Stator
      const finGeo = new THREE.BoxGeometry(0.024, 0.78, 0.09);
      for (let fi = 0; fi < 16; fi++) {
        const ang = (fi / 16) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeo, pumpTealLight);
        fin.position.set(Math.cos(ang) * 0.34, 1.52, Math.sin(ang) * 0.34);
        fin.rotation.y = -ang + Math.PI / 2;
        group.add(fin);
      }

      // Side-Mounted Electrical Terminal Box
      const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.26), pumpTealDark);
      termBox.position.set(0.39, 1.5, 0);
      group.add(termBox);

      // 2 Metallic Silver Lifting Eye-Bolts on Motor Shoulders
      const lugGeo = new THREE.TorusGeometry(0.065, 0.018, 8, 14);
      for (const lx of [-0.36, 0.36]) {
        const lug = new THREE.Mesh(lugGeo, steelLight);
        lug.position.set(lx, 1.88, 0);
        group.add(lug);
      }

      // 5. Smooth Cylindrical Top Cooling Fan Cowl (Y = 1.94 .. 2.24) + Live SCADA Status Collar Ring!
      const fanCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.3, 24), pumpTealLight);
      fanCowl.position.y = 2.09;
      fanCowl.castShadow = true;
      group.add(fanCowl);

      const statusCollarMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.45, roughness: 0.25 });
      accentMats.push(statusCollarMat);
      const statusCollar = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.032, 8, 24), statusCollarMat);
      statusCollar.rotation.x = Math.PI / 2;
      statusCollar.position.y = 1.95;
      group.add(statusCollar);
      break;
    }

    case 'horizontal_pump': {
      // REALISTIC ROYAL-BLUE HORIZONTAL END-SUCTION CENTRIFUGAL PUMP (faithful to user-uploaded photo!):
      //   - FRONT AXIAL SUCTION FLANGE (-Z): (0, 0.42, -0.68) bolted with hex nuts & dark bore
      //   - TOP RADIAL DISCHARGE FLANGE (+Y): (0, 0.92, -0.34) bolted with hex nuts & dark bore
      //   - Royal-blue volute casing + cast mounting foot + brass priming plug + finned blue motor
      //   - Top black electrical terminal box with silver nameplate + matte-black rounded rear fan cowl!
      const hBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.34, metalness: 0.46 });
      const hBlueLight = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.42 });
      const hBlueDark = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.42, metalness: 0.5 });
      const cowlBlack = new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.42, metalness: 0.32 });
      const boltSteel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.24, metalness: 0.85 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.78 });
      const boreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

      const axisY = 0.42;
      const voluteZ = -0.34;

      // 1. Cast-iron mounting feet under volute & motor
      const volFoot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.26), hBlueDark);
      volFoot.position.set(0, 0.04, voluteZ);
      volFoot.receiveShadow = true;
      group.add(volFoot);
      const volLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.16), hBlue);
      volLeg.position.set(0, 0.16, voluteZ);
      group.add(volLeg);
      const motFoot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.32), hBlueDark);
      motFoot.position.set(0, 0.04, 0.34);
      motFoot.receiveShadow = true;
      group.add(motFoot);
      const motLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.24), hBlue);
      motLeg.position.set(0, 0.14, 0.34);
      group.add(motLeg);

      // 2. Vertical Disc Volute Casing centered at (0, 0.42, -0.34)
      const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 24), hBlue);
      volute.rotation.x = Math.PI / 2;
      volute.position.set(0, axisY, voluteZ);
      volute.castShadow = true;
      group.add(volute);

      // Brass priming plug on upper shoulder of volute
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 6), brassMat);
      plug.position.set(0.14, axisY + 0.26, voluteZ - 0.04);
      plug.rotation.z = -0.45;
      group.add(plug);

      // 3. FRONT AXIAL SUCTION NOZZLE & BOLTED FLANGE at (0, 0.42, -0.68)
      const suctNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.26, 16), hBlue);
      suctNeck.rotation.x = Math.PI / 2;
      suctNeck.position.set(0, axisY, voluteZ - 0.21);
      group.add(suctNeck);
      const suctFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18), hBlueLight);
      suctFlange.rotation.x = Math.PI / 2;
      suctFlange.position.set(0, axisY, -0.66);
      group.add(suctFlange);
      const suctBore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14), boreMat);
      suctBore.rotation.x = Math.PI / 2;
      suctBore.position.set(0, axisY, -0.665);
      group.add(suctBore);
      for (let bi = 0; bi < 4; bi++) {
        const ang = (bi * Math.PI) / 2 + Math.PI / 4;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6), boltSteel);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(Math.cos(ang) * 0.165, axisY + Math.sin(ang) * 0.165, -0.66);
        group.add(bolt);
      }

      // 4. TOP RADIAL DISCHARGE NOZZLE & BOLTED FLANGE at (0, 0.92, -0.34)
      const dischNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.28, 16), hBlue);
      dischNeck.position.set(0, axisY + 0.34, voluteZ);
      group.add(dischNeck);
      const dischFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 18), hBlueLight);
      dischFlange.position.set(0, 0.9, voluteZ);
      group.add(dischFlange);
      const dischBore = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.07, 14), boreMat);
      dischBore.position.set(0, 0.905, voluteZ);
      group.add(dischBore);
      for (let bi = 0; bi < 4; bi++) {
        const ang = (bi * Math.PI) / 2 + Math.PI / 4;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6), boltSteel);
        bolt.position.set(Math.cos(ang) * 0.155, 0.9, voluteZ + Math.sin(ang) * 0.155);
        group.add(bolt);
      }

      // 5. Coupling Bracket + Live SCADA Status Collar Ring
      const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 16), hBlueDark);
      coupling.rotation.x = Math.PI / 2;
      coupling.position.set(0, axisY, -0.12);
      group.add(coupling);
      const statusRingMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.45, roughness: 0.25 });
      accentMats.push(statusRingMat);
      const statusRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.026, 8, 20), statusRingMat);
      statusRing.position.set(0, axisY, -0.02);
      group.add(statusRing);

      // 6. Horizontal Finned Royal-Blue Electric Motor (Z = 0.0 .. 0.62)
      const motorBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.62, 20), hBlue);
      motorBarrel.rotation.x = Math.PI / 2;
      motorBarrel.position.set(0, axisY, 0.31);
      motorBarrel.castShadow = true;
      group.add(motorBarrel);
      const finGeo = new THREE.BoxGeometry(0.022, 0.06, 0.56);
      for (let fi = 0; fi < 14; fi++) {
        const ang = (fi / 14) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeo, hBlueLight);
        fin.position.set(Math.cos(ang) * 0.24, axisY + Math.sin(ang) * 0.24, 0.31);
        fin.rotation.z = ang - Math.PI / 2;
        group.add(fin);
      }

      // Top Black Terminal Box + Silver Nameplate + Side Cable Gland
      const termBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.28), hBlue);
      termBase.position.set(0, axisY + 0.25, 0.18);
      group.add(termBase);
      const termLid = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.3), cowlBlack);
      termLid.position.set(0, axisY + 0.36, 0.18);
      group.add(termLid);
      const nameplate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.22), boltSteel);
      nameplate.position.set(0, axisY + 0.425, 0.18);
      group.add(nameplate);

      // 7. Matte-Black Rounded Rear Fan Cowl (+Z = 0.62 .. 0.84)
      const cowlCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 20), cowlBlack);
      cowlCyl.rotation.x = Math.PI / 2;
      cowlCyl.position.set(0, axisY, 0.68);
      group.add(cowlCyl);
      const cowlDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), cowlBlack);
      cowlDome.rotation.x = Math.PI / 2;
      cowlDome.scale.set(1, 0.45, 1);
      cowlDome.position.set(0, axisY, 0.76);
      group.add(cowlDome);
      break;
    }

    case 'tank': {
      // REALISTIC POLISHED STAINLESS-STEEL VERTICAL TANK (faithful to References/Tank kim loai photo!):
      //   - 3 tapered stainless tripod legs + dished conical bottom + brushed stainless cylinder + domed top + bolted manhole hatch!
      //   - ONLY tanks with a real `levelSensorTag` (e.g. TK-501 LT10501) render a front sight-glass & live animated water level!
      //   - All other tanks (TK-502, V-101A/B, V-201A/B) are solid stainless symbolic pressure vessels with NO water level!
      const ssMat = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.22, metalness: 0.82 });
      const ssDark = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.78 });
      const r = w * 0.44;
      const legH = 0.45;
      const cylH = Math.max(1.0, h - legH - r * 0.65);

      // 3 Conical Stainless Tripod Legs
      for (let li = 0; li < 3; li++) {
        const ang = (li / 3) * Math.PI * 2 + Math.PI / 6;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.045, legH + 0.16, 10), ssDark);
        leg.position.set(Math.cos(ang) * r * 0.78, (legH + 0.16) / 2, Math.sin(ang) * r * 0.78);
        leg.castShadow = true;
        group.add(leg);
      }

      // Dished bottom head & domed top head
      const botHead = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ssMat);
      botHead.scale.set(1, 0.32, 1);
      botHead.position.y = legH + 0.08;
      group.add(botHead);

      const topHead = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), ssMat);
      topHead.scale.set(1, 0.36, 1);
      topHead.position.y = legH + 0.08 + cylH;
      group.add(topHead);

      // Top circular bolted manhole hatch + swing arm
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.26, r * 0.26, 0.14, 16), ssDark);
      hatch.position.set(-r * 0.28, legH + 0.08 + cylH + r * 0.34, 0.1);
      hatch.rotation.z = 0.22;
      group.add(hatch);
      const topNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 12), ssDark);
      topNozzle.position.set(0, legH + 0.08 + cylH + r * 0.36, 0);
      group.add(topNozzle);

      if (node.levelSensorTag) {
        // Semi-translucent stainless shell with live cyan water level clearly visible inside (TK-501!)
        const maxLiquidH = cylH - 0.12;
        liquidMaxH = maxLiquidH;
        const liqMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0284c7,
          emissiveIntensity: 0.42,
          roughness: 0.15,
          transparent: true,
          opacity: 0.88,
        });
        liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, maxLiquidH, 22), liqMat);
        liquidMesh.position.y = legH + 0.14 + maxLiquidH * 0.35;
        liquidMesh.scale.y = 0.68;
        group.add(liquidMesh);

        const shell = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r, cylH, 24),
          new THREE.MeshStandardMaterial({
            color: 0xdce4ee,
            transparent: true,
            opacity: 0.42,
            roughness: 0.2,
            metalness: 0.72,
          })
        );
        shell.position.y = legH + 0.08 + cylH / 2;
        group.add(shell);
      } else {
        // Solid gleaming stainless-steel cylinder (NO water level inside!)
        const solidShell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylH, 24), ssMat);
        solidShell.position.y = legH + 0.08 + cylH / 2;
        solidShell.castShadow = true;
        group.add(solidShell);
      }
      break;
    }

    case 'air_separator': {
      // REALISTIC INDUSTRIAL GREY AIR SEPARATOR (faithful to uploaded Air Separator photo — symbolic, NO water level!)
      const sepGrey = new THREE.MeshStandardMaterial({ color: 0xb0b8c2, roughness: 0.38, metalness: 0.42 });
      const sepFlange = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.42, metalness: 0.5 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.78 });
      const redHandle = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
      const r = w * 0.34;
      const bodyH = h * 0.68;

      // Support legs
      for (const lx of [-r * 0.65, r * 0.65]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), sepFlange);
        leg.position.set(lx, 0.18, 0);
        group.add(leg);
      }

      // Main light-grey cylindrical vessel + domed top & bottom caps
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 22), sepGrey);
      body.position.y = 0.34 + bodyH / 2;
      body.castShadow = true;
      group.add(body);
      const topDome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), sepGrey);
      topDome.scale.set(1, 0.36, 1);
      topDome.position.y = 0.34 + bodyH;
      group.add(topDome);
      const botDome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sepGrey);
      botDome.scale.set(1, 0.32, 1);
      botDome.position.y = 0.34;
      group.add(botDome);

      // Opposing horizontal flanged side ports (Left & Right at Y = 0.48)
      const sideNeckGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.42, 14);
      sideNeckGeo.rotateZ(Math.PI / 2);
      const sideFlangeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
      sideFlangeGeo.rotateZ(Math.PI / 2);
      for (const dirX of [-1, 1]) {
        const neck = new THREE.Mesh(sideNeckGeo, sepGrey);
        neck.position.set(dirX * (r + 0.12), 0.56, 0);
        group.add(neck);
        const fl = new THREE.Mesh(sideFlangeGeo, sepFlange);
        fl.position.set(dirX * (r + 0.32), 0.56, 0);
        group.add(fl);
      }

      // Top lifting lugs + Brass automatic air vent valve with RED shutoff lever handle!
      for (const lx of [-r * 0.55, r * 0.55]) {
        const lug = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 8, 12), sepFlange);
        lug.position.set(lx, 0.34 + bodyH + r * 0.32, 0);
        group.add(lug);
      }
      const brassVent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.34, 12), brassMat);
      brassVent.position.y = 0.34 + bodyH + r * 0.38 + 0.15;
      group.add(brassVent);
      const redLever = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.08), redHandle);
      redLever.position.set(0.1, 0.34 + bodyH + r * 0.38 + 0.14, 0);
      group.add(redLever);
      break;
    }

    case 'metal_filter': {
      // REALISTIC STAINLESS-STEEL METAL BAG FILTER (faithful to uploaded PCW Stainless Filter photo!)
      const ssMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.86 });
      const ssTrim = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.78 });
      const r = w * 0.32;
      const legH = 0.42;
      const bodyH = h - legH - 0.36;

      // 3 Stainless Tripod Legs with Square Bolted Floor Pads
      for (let li = 0; li < 3; li++) {
        const ang = (li / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, legH + 0.18, 0.07), ssTrim);
        leg.position.set(Math.cos(ang) * (r + 0.06), (legH + 0.18) / 2, Math.sin(ang) * (r + 0.06));
        group.add(leg);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), ssTrim);
        pad.position.set(Math.cos(ang) * (r + 0.08), 0.015, Math.sin(ang) * (r + 0.08));
        group.add(pad);
      }

      // Tall Polished Stainless Cylindrical Body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 22), ssMat);
      body.position.y = legH + bodyH / 2;
      body.castShadow = true;
      group.add(body);

      // Bolted Collar Flange + Domed Lid + 4 Eyebolt Swing Clamps + Top U-Handle!
      const lidCollar = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.12, 22), ssTrim);
      lidCollar.position.y = legH + bodyH + 0.05;
      group.add(lidCollar);
      const lidDome = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), ssMat);
      lidDome.scale.set(1, 0.45, 1);
      lidDome.position.y = legH + bodyH + 0.1;
      group.add(lidDome);
      for (let ei = 0; ei < 4; ei++) {
        const ang = (ei / 4) * Math.PI * 2 + Math.PI / 4;
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12), ssMat);
        eye.position.set(Math.cos(ang) * (r * 1.15), legH + bodyH + 0.22, Math.sin(ang) * (r * 1.15));
        eye.rotation.y = -ang;
        group.add(eye);
      }
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 12, Math.PI), ssMat);
      handle.position.y = legH + bodyH + 0.28;
      group.add(handle);

      // Upper Left (-X) Flanged Inlet (Y = 1.45) & Lower Right (+X) Flanged Outlet (Y = 0.56)!
      const stubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.28, 12);
      stubGeo.rotateZ(Math.PI / 2);
      const flGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.045, 14);
      flGeo.rotateZ(Math.PI / 2);
      const inStub = new THREE.Mesh(stubGeo, ssMat);
      inStub.position.set(-(r + 0.12), 1.45, 0);
      group.add(inStub);
      const inFl = new THREE.Mesh(flGeo, ssTrim);
      inFl.position.set(-(r + 0.25), 1.45, 0);
      group.add(inFl);
      const outStub = new THREE.Mesh(stubGeo, ssMat);
      outStub.position.set(r + 0.12, 0.56, 0);
      group.add(outStub);
      const outFl = new THREE.Mesh(flGeo, ssTrim);
      outFl.position.set(r + 0.25, 0.56, 0);
      group.add(outFl);
      break;
    }

    case 'phe': {
      // REALISTIC ROYAL-BLUE PLATE HEAT EXCHANGER (faithful to uploaded Blue PHE Photo!):
      //   - ALL 4 CIRCULAR PORTS ON ONE SINGLE FRONT FACE (+Z in local coords; rotated -90° for B5 PCW so front faces -X toward pumps!)
      //   - Looking at the 4-port front face:
      //       LEFT column (-X = -0.36): Chiller Water (CHW) — Bottom-Left (y=0.56) Inlet, Top-Left (y=1.88) Outlet
      //       RIGHT column (+X = +0.36): PCW Water — Bottom-Right (y=0.56) Inlet, Top-Right (y=1.88) Outlet
      const blueFrame = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.34, metalness: 0.45 });
      const platePackMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.76 });
      const rodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.24, metalness: 0.85 });
      const portRingMat = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.25, metalness: 0.8 });
      const portBoreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

      const frontPlateZ = d * 0.36;
      const movePlateZ = -d * 0.08;
      const rearColZ = -d * 0.44;

      // Front Fixed Royal-Blue Pressure Plate + Steel Anchor Feet
      const fixedPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h, 0.16), blueFrame);
      fixedPlate.position.set(0, h / 2, frontPlateZ);
      fixedPlate.castShadow = true;
      group.add(fixedPlate);
      for (const fx of [-w * 0.38, w * 0.38]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.36), blueFrame);
        foot.position.set(fx, 0.04, frontPlateZ);
        group.add(foot);
      }

      // Movable Royal-Blue Pressure Plate + Rear Vertical Blue Support Column + Guide Bars
      const movePlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.96, 0.14), blueFrame);
      movePlate.position.set(0, h * 0.48, movePlateZ);
      movePlate.castShadow = true;
      group.add(movePlate);
      const rearCol = new THREE.Mesh(new THREE.BoxGeometry(0.18, h * 0.96, 0.16), blueFrame);
      rearCol.position.set(0, h * 0.48, rearColZ);
      group.add(rearCol);
      for (const gy of [0.24, h * 0.92]) {
        const guideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, d * 0.82, 10), rodMat);
        guideBar.rotation.x = Math.PI / 2;
        guideBar.position.set(0, gy, (frontPlateZ + rearColZ) / 2);
        group.add(guideBar);
      }

      // Corrugated Stainless-Steel Heat Transfer Plate Pack compressed between fixedPlate & movePlate
      const packDepth = Math.abs(frontPlateZ - movePlateZ) - 0.14;
      const pack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.86, packDepth), platePackMat);
      pack.position.set(0, h * 0.5, (frontPlateZ + movePlateZ) / 2);
      pack.castShadow = true;
      group.add(pack);

      // 8 Long Horizontal Stainless Tie-Bolts (4 on Left side, 4 on Right side) along Z!
      const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, d * 0.9, 8);
      boltGeo.rotateX(Math.PI / 2);
      for (const bx of [-w * 0.44, w * 0.44]) {
        for (const by of [0.35, 0.88, 1.48, 2.02]) {
          const bolt = new THREE.Mesh(boltGeo, rodMat);
          bolt.position.set(bx, by, (frontPlateZ + rearColZ) / 2);
          group.add(bolt);
        }
      }

      // 4 DISTINCT CIRCULAR NOZZLE PORTS ON THE SAME FRONT BLUE FACE (+Z):
      //   LEFT (-0.36) = CHW (Bottom=Supply, Top=Return) | RIGHT (+0.36) = PCW (Bottom=Warm In, Top=Cold Out)
      const portRingGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16);
      portRingGeo.rotateX(Math.PI / 2);
      const boreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 14);
      boreGeo.rotateX(Math.PI / 2);
      const ports: [number, number, number][] = [
        [-0.36, 0.56, 0x00cfe8], // Bottom-Left: CHW Supply In
        [-0.36, 1.88, 0x008f91], // Top-Left: CHW Return Out
        [0.36, 0.56, 0x009999], // Bottom-Right: PCW Warm In
        [0.36, 1.88, 0x00cfe8], // Top-Right: PCW Cold Supply Out
      ];
      for (const [px, py, tagHex] of ports) {
        const ring = new THREE.Mesh(portRingGeo, portRingMat);
        ring.position.set(px, py, frontPlateZ + 0.08);
        group.add(ring);
        const bore = new THREE.Mesh(boreGeo, portBoreMat);
        bore.position.set(px, py, frontPlateZ + 0.085);
        group.add(bore);
        const tagBadge = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.08, 0.03),
          new THREE.MeshStandardMaterial({ color: tagHex, roughness: 0.35 })
        );
        tagBadge.position.set(px, py - 0.22, frontPlateZ + 0.09);
        group.add(tagBadge);
      }
      break;
    }

    case 'compressor': {
      // REALISTIC INGERSOLL RAND ROTARY SCREW AIR COMPRESSOR (faithful to References/may-nen-khi-truc-vit-ir-ingersollrand-30-37kW.jpg!)
      const irBeige = new THREE.MeshStandardMaterial({ color: 0xd6c79c, roughness: 0.42, metalness: 0.18 });
      const irBlack = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.55, metalness: 0.35 });
      const irLogoDark = makeIngersollRandLogoMaterial('#1c2026');
      const irLogoBeige = makeIngersollRandLogoMaterial('#d6c79c');

      // Black base skid with forklift slots & black top canopy
      const baseSkid = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), irBlack);
      baseSkid.position.y = 0.11;
      baseSkid.receiveShadow = true;
      group.add(baseSkid);

      const topCanopy = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.24, d + 0.04), irBlack);
      topCanopy.position.y = h - 0.12;
      topCanopy.castShadow = true;
      group.add(topCanopy);

      // Main cabinet body: Left 32% Matte-Black Control Column + Right 68% Sand-Beige Hinged Service Doors
      const bodyH = h - 0.46;
      const bodyY = 0.22 + bodyH / 2;
      const ctrlCol = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, bodyH, d), irBlack);
      ctrlCol.position.set(-w * 0.34, bodyY, 0);
      ctrlCol.castShadow = true;
      group.add(ctrlCol);

      const beigeBody = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, bodyH, d), irBeige);
      beigeBody.position.set(w * 0.16, bodyY, 0);
      beigeBody.castShadow = true;
      group.add(beigeBody);

      // Vertical door panel seams on front & back of beige enclosure
      for (const sx of [w * 0.05, w * 0.28]) {
        for (const sz of [d * 0.5 + 0.008, -d * 0.5 - 0.008]) {
          const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, bodyH - 0.04, 0.015), irBlack);
          seam.position.set(sx, bodyY, sz);
          group.add(seam);
        }
      }

      // Front Black Control Column: Digital Controller + Status Accent + Red E-Stop + Red (IR) Logo
      const hmiPad = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.05), steelDark);
      hmiPad.position.set(-w * 0.34, h * 0.72, d * 0.5 + 0.02);
      group.add(hmiPad);
      const motorAccent = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.55 });
      accentMats.push(motorAccent);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), motorAccent);
      screen.position.set(-w * 0.39, h * 0.72, d * 0.5 + 0.025);
      group.add(screen);
      // Red E-Stop mushroom button
      const eStop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.07, 12),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
      );
      eStop.rotation.x = Math.PI / 2;
      eStop.position.set(-w * 0.34, h * 0.54, d * 0.5 + 0.04);
      group.add(eStop);
      // Front (IR) Ingersoll Rand Logo
      const frontLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.24), irLogoDark);
      frontLogo.position.set(-w * 0.34, h * 0.38, d * 0.5 + 0.015);
      group.add(frontLogo);

      // Left End-Panel (-X): Sand-beige cover + 2x3 Black Intake Louver Grid + (IR) Logo!
      const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, bodyH, d * 0.94), irBeige);
      leftPanel.position.set(-w * 0.5 - 0.01, bodyY, 0);
      group.add(leftPanel);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.42), irBlack);
          vent.position.set(-w * 0.5 - 0.02, h * 0.7 - row * 0.44, -0.5 + col * 0.5);
          group.add(vent);
        }
      }
      const sideLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), irLogoBeige);
      sideLogo.rotation.y = -Math.PI / 2;
      sideLogo.position.set(-w * 0.5 - 0.04, h * 0.25, 0);
      group.add(sideLogo);
      break;
    }

    case 'air_dryer': {
      // REALISTIC INGERSOLL RAND TWIN-TOWER DESICCANT AIR DRYER (faithful to References/AD.png!)
      const adCream = new THREE.MeshStandardMaterial({ color: 0xe2d5a9, roughness: 0.38, metalness: 0.2 });
      const adBlack = new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.48, metalness: 0.3 });
      const irLogoMat = makeIngersollRandLogoMaterial('#171a20');
      const towerR = Math.min(w * 0.21, d * 0.38);
      const towerH = h * 0.84;

      // Twin tall vertical cream desiccant towers + domed top/bottom caps + skid feet + dial pressure gauges!
      for (const tx of [-w * 0.32, w * 0.32]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(towerR * 1.4, 0.08, d * 0.86), adCream);
        foot.position.set(tx, 0.04, 0);
        group.add(foot);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 8), adCream);
        leg.position.set(tx, 0.16, 0);
        group.add(leg);

        const vessel = new THREE.Mesh(new THREE.CylinderGeometry(towerR, towerR, towerH, 20), adCream);
        vessel.position.set(tx, 0.24 + towerH / 2, 0);
        vessel.castShadow = true;
        group.add(vessel);

        const topDome = new THREE.Mesh(new THREE.SphereGeometry(towerR, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), adCream);
        topDome.scale.set(1, 0.55, 1);
        topDome.position.set(tx, 0.24 + towerH, 0);
        group.add(topDome);

        // Front dial pressure gauge on each tower
        const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 14), steelLight);
        gauge.rotation.x = Math.PI / 2;
        gauge.position.set(tx, h * 0.68, towerR + 0.02);
        group.add(gauge);
      }

      // Top & bottom crossover manifold pipes + steel support bridge
      for (const my of [0.42, h * 0.86]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w * 0.64, 10), adCream);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0, my, 0);
        group.add(pipe);
      }
      // Central Matte-Black IR Control Panel Box with Red (IR) Ingersoll Rand Logo!
      const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, h * 0.24, 0.32), adBlack);
      ctrlBox.position.set(0, h * 0.62, 0.12);
      ctrlBox.castShadow = true;
      group.add(ctrlBox);

      const adLogo = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, 0.22), irLogoMat);
      adLogo.position.set(0, h * 0.58, 0.29);
      group.add(adLogo);

      const adAccent = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.55 });
      accentMats.push(adAccent);
      const ledDisp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), adAccent);
      ledDisp.position.set(-0.1, h * 0.68, 0.28);
      group.add(ledDisp);
      break;
    }

    case 'air_filter': {
      // REALISTIC INGERSOLL RAND INLINE FILTER (faithful to public/scada/Filter.png!)
      const fltBlack = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.45 });
      const fltWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.34, h * 0.72, 18), fltBlack);
      body.position.y = h * 0.42;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.44, w * 0.42, h * 0.2, 18), fltBlack);
      head.position.y = h * 0.82;
      group.add(head);
      // White vertical front brand strip
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, h * 0.54, 0.05), fltWhite);
      stripe.position.set(0, h * 0.44, w * 0.36);
      group.add(stripe);
      // Top differential pressure dial gauge
      const dpGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14), steelLight);
      dpGauge.rotation.x = Math.PI / 2;
      dpGauge.position.set(0, h * 0.98, 0);
      group.add(dpGauge);
      break;
    }

    case 'vacuum': {
      // REALISTIC INDUSTRIAL CORAL-RED & BLACK DRY VACUUM PUMP SKID (faithful to public/scada/PV.png!)
      // Clearly separated flanged ports on top of twin vessels so INLET & OUTLET are 100% unmistakable:
      //   - INLET (Vacuum Suction IN, Olive-Gold collar #a8a228): (-0.82, 1.62, -0.24)
      //   - OUTLET (Exhaust Discharge OUT, Orange collar #f97316): (+0.08, 1.62, -0.24)
      const pvRed = new THREE.MeshStandardMaterial({ color: 0xe0634d, roughness: 0.38, metalness: 0.35 });
      const pvBlack = new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.5, metalness: 0.45 });
      const pvFlange = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.78 });
      const boreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

      const skid = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), pvBlack);
      skid.position.y = 0.08;
      skid.receiveShadow = true;
      group.add(skid);

      const inX = -0.82;
      const outX = 0.08;
      const vesselZ = -0.24;

      // 1. LEFT Coral-Red Inlet Knockout Vessel + Bold Bolted VACUUM SUCTION INLET Flange (Olive-Gold collar)
      const inDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.24, 18), pvRed);
      inDrum.position.set(inX, 0.16 + 0.62, vesselZ);
      inDrum.castShadow = true;
      group.add(inDrum);
      const inNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 14), pvRed);
      inNeck.position.set(inX, 1.49, vesselZ);
      group.add(inNeck);
      const inFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), pvFlange);
      inFlange.position.set(inX, 1.61, vesselZ);
      group.add(inFlange);
      const inBore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14), boreMat);
      inBore.position.set(inX, 1.615, vesselZ);
      group.add(inBore);
      const inCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.032, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xa8a228, emissive: 0x857f18, emissiveIntensity: 0.35 })
      );
      inCollar.rotation.x = Math.PI / 2;
      inCollar.position.set(inX, 1.54, vesselZ);
      group.add(inCollar);

      // 2. CENTER-RIGHT Coral-Red Exhaust Silencer Vessel + Bold Bolted EXHAUST OUTLET Flange (Orange collar)
      const outDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.24, 18), pvRed);
      outDrum.position.set(outX, 0.16 + 0.62, vesselZ);
      outDrum.castShadow = true;
      group.add(outDrum);
      const outNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 14), pvBlack);
      outNeck.position.set(outX, 1.49, vesselZ);
      group.add(outNeck);
      const outFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), pvFlange);
      outFlange.position.set(outX, 1.61, vesselZ);
      group.add(outFlange);
      const outBore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14), boreMat);
      outBore.position.set(outX, 1.615, vesselZ);
      group.add(outBore);
      const outCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.032, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xc2410c, emissiveIntensity: 0.35 })
      );
      outCollar.rotation.x = Math.PI / 2;
      outCollar.position.set(outX, 1.54, vesselZ);
      group.add(outCollar);

      // Internal bridge pipes linking Inlet Knockout -> Front Multistage Pump -> Exhaust Silencer
      for (const px of [inX, outX]) {
        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.62, 12), pvRed);
        bridge.rotation.x = Math.PI / 2;
        bridge.position.set(px, 0.62, 0.06);
        group.add(bridge);
      }

      // 3. Front Horizontal Coral-Red Multistage Dry Vacuum Pump Body
      const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, w * 0.46, 16), pvRed);
      pumpBody.rotation.z = Math.PI / 2;
      pumpBody.position.set(-0.34, 0.6, 0.34);
      pumpBody.castShadow = true;
      group.add(pumpBody);

      // 4. Right-Side Black Finned Drive Motor + Black Electrical Control Cabinet
      const drvMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, w * 0.32, 16), pvBlack);
      drvMotor.rotation.z = Math.PI / 2;
      drvMotor.position.set(0.62, 0.58, 0.34);
      group.add(drvMotor);

      const pvCab = new THREE.Mesh(new THREE.BoxGeometry(0.68, h * 0.78, 0.66), pvBlack);
      pvCab.position.set(0.76, 0.16 + h * 0.39, -0.26);
      pvCab.castShadow = true;
      group.add(pvCab);

      const pvAccent = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.5 });
      accentMats.push(pvAccent);
      const pvLight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.06), pvAccent);
      pvLight.position.set(0.76, h * 0.72, 0.08);
      group.add(pvLight);
      break;
    }

    case 'ahu': {
      // REALISTIC DAIKIN MODULAR DOUBLE-SKIN AIR HANDLING UNIT (faithful to AHU_DAIKIN.png, AHU_inside.png & site photo!):
      //   - Heavy dark steel base channel skid + white powder-coated modular panels + extruded aluminum frame rails + black corner caps
      //   - Left (-X): Motorized Fresh Air Intake Damper (louver blades animate OPEN when running!) + Top Return Air Plenum Collar
      //   - Center-Left: Pre-Filter / Bag Filter access door with cam-lock handles & DP gauge
      //   - Center: Cooling Coil (CHW #00cfe8/#008f91) & Reheat Coil (HW #eb9ee3/#e03c86) 4 flanged side stubs on front (+Z) face!
      //   - Right (+X): Supply Fan section with Daikin Logo, service door + 4 black cam-lock handles + yellow safety decals +
      //                 circular glass inspection porthole showing live spinning blower rotor + large dark-framed Supply Air mouth!
      const panelWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.32, metalness: 0.16 });
      const panelInner = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.36, metalness: 0.22 });
      const aluRail = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.78 });
      const blackCap = new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.45, metalness: 0.4 });
      const darkCavity = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.85 });
      const warnYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
      const daikinLogoMat = makeDaikinLogoMaterial();

      const skidH = 0.18;
      const bodyH = h - skidH;
      const bodyCenterY = skidH + bodyH / 2;

      // 1. Dark Steel Base Channel Skid
      const skid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, skidH, d + 0.04), blackCap);
      skid.position.y = skidH / 2;
      skid.castShadow = true;
      skid.receiveShadow = true;
      group.add(skid);

      // 2. Main White Powder-Coated Modular Double-Skin Cabinet
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), panelWhite);
      cabinet.position.y = bodyCenterY;
      cabinet.castShadow = true;
      cabinet.receiveShadow = true;
      group.add(cabinet);

      // 3. Signature Daikin Extruded Anodized Aluminum Perimeter Frame Rails + Black Corner Caps
      const railT = 0.085;
      // 4 Long Horizontal Rails along X
      for (const ry of [skidH + railT / 2, h - railT / 2]) {
        for (const rz of [-d / 2, d / 2]) {
          const rX = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, railT, railT), aluRail);
          rX.position.set(0, ry, rz);
          group.add(rX);
        }
      }
      // 4 Depth Rails along Z (at both ends) + Vertical Corner Posts + Black Corner Caps!
      for (const rx of [-w / 2, w / 2]) {
        for (const ry of [skidH + railT / 2, h - railT / 2]) {
          const rZ = new THREE.Mesh(new THREE.BoxGeometry(railT, railT, d + 0.04), aluRail);
          rZ.position.set(rx, ry, 0);
          group.add(rZ);
        }
        for (const rz of [-d / 2, d / 2]) {
          const vPost = new THREE.Mesh(new THREE.BoxGeometry(railT, bodyH, railT), aluRail);
          vPost.position.set(rx, bodyCenterY, rz);
          group.add(vPost);
          for (const cy of [skidH + 0.06, h - 0.04]) {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), blackCap);
            cap.position.set(rx, cy, rz);
            group.add(cap);
          }
        }
      }
      // Modular Vertical Section Divider Seams (Mixing | Filter | Coils | Fan)
      for (const sx of [-w * 0.28, -w * 0.1, w * 0.18]) {
        for (const sz of [-d / 2 - 0.01, d / 2 + 0.01]) {
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyH - 0.08, 0.04), aluRail);
          mullion.position.set(sx, bodyCenterY, sz);
          group.add(mullion);
        }
      }

      // 4. LEFT END (-X): Motorized Fresh Air Intake Damper (facing AWAY from the Supply Air wall!)
      const openingW = Math.min(d * 0.56, 1.2);
      const openingH = Math.min(bodyH * 0.52, 1.1);
      const mouthY = skidH + bodyH * 0.5;
      const intakeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, openingH + 0.14, openingW + 0.14), blackCap);
      intakeFrame.position.set(-w / 2 - 0.04, mouthY, 0);
      group.add(intakeFrame);
      const intakeCavity = new THREE.Mesh(new THREE.BoxGeometry(0.14, openingH, openingW), darkCavity);
      intakeCavity.position.set(-w / 2 - 0.045, mouthY, 0);
      group.add(intakeCavity);
      // 6 Motorized Aluminum Damper Louver Blades (rotate OPEN when RUNNING, CLOSED when STOPPED!)
      const bladeCount = 6;
      for (let bi = 0; bi < bladeCount; bi++) {
        const by = mouthY - openingH / 2 + ((bi + 0.5) / bladeCount) * openingH;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, openingW - 0.06), aluRail);
        blade.position.set(-w / 2 - 0.09, by, 0);
        damperBlades.push(blade);
        group.add(blade);
      }

      // Top Bolted Return Air Collar on Mixing Section (top of AHU)
      const raCollar = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 1.22), aluRail);
      raCollar.position.set(-w * 0.36, h + 0.05, 0);
      group.add(raCollar);

      // 5. RIGHT END (+X): Large Dark-Framed Rectangular Supply Air Mouth + Daikin Logo (AHU_DAIKIN.png!)
      const outFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, openingH + 0.14, openingW + 0.14), blackCap);
      outFrame.position.set(w / 2 + 0.04, mouthY, 0);
      group.add(outFrame);
      const outCavity = new THREE.Mesh(new THREE.BoxGeometry(0.14, openingH, openingW), darkCavity);
      outCavity.position.set(w / 2 + 0.045, mouthY, 0);
      group.add(outCavity);

      // 6. FRONT (+Z) SECTION DETAILS:
      // 6A. Filter & Mixing Service Doors with Black Cam-Lock Handles
      for (const dx of [-w * 0.38, -w * 0.19]) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, bodyH * 0.78, 0.04), panelInner);
        door.position.set(dx, bodyCenterY, d / 2 + 0.015);
        group.add(door);
        for (const hy of [bodyCenterY - 0.35, bodyCenterY + 0.35]) {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), blackCap);
          handle.position.set(dx + w * 0.05, hy, d / 2 + 0.045);
          group.add(handle);
        }
      }

      // 6B. COIL SECTION (Center): Color-Coded CHW & HW Inspection Bands + 4 Flanged Side Coil Stubs on Front (+Z)!
      const cwBadge = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.11, 0.12, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x00cfe8, roughness: 0.3 })
      );
      cwBadge.position.set(-0.32, h - 0.28, d / 2 + 0.02);
      group.add(cwBadge);
      const hwBadge = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.11, 0.12, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe03c86, roughness: 0.3 })
      );
      hwBadge.position.set(0.68, h - 0.28, d / 2 + 0.02);
      group.add(hwBadge);
      // 4 Bolted Pipe Connection Stubs matching M1F CHW/HW coil drops!
      const coilStubs: [number, number, number][] = [
        [-0.55, 0.88, 0x00cfe8], // CHW Supply In
        [-0.1, 1.62, 0x008f91], // CHW Return Out
        [0.45, 0.88, 0xeb9ee3], // HW Supply In
        [0.9, 1.62, 0xe03c86], // HW Return Out
      ];
      const stubGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.16, 12);
      stubGeo.rotateX(Math.PI / 2);
      for (const [sx, sy, scol] of coilStubs) {
        const st = new THREE.Mesh(stubGeo, aluRail);
        st.position.set(sx, sy, d / 2 + 0.06);
        group.add(st);
        const colRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.024, 8, 14),
          new THREE.MeshStandardMaterial({ color: scol, roughness: 0.3 })
        );
        colRing.position.set(sx, sy, d / 2 + 0.11);
        group.add(colRing);
      }

      // 6C. FAN SECTION (Right): Daikin Logo + Access Door + 4 Black Cam Handles + Yellow Safety Decals + Circular Glass Porthole + Live Spinning Blower!
      const fanCenterX = w * 0.34;
      const fanDoor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, bodyH * 0.8, 0.045), panelInner);
      fanDoor.position.set(fanCenterX, bodyCenterY, d / 2 + 0.015);
      group.add(fanDoor);
      // 4 Black Cam-Lock Lever Handles on Fan Access Door (just like site photo!)
      for (const hx of [fanCenterX - w * 0.11, fanCenterX + w * 0.11]) {
        for (const hy of [bodyCenterY - 0.42, bodyCenterY + 0.42]) {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.08), blackCap);
          handle.position.set(hx, hy, d / 2 + 0.05);
          group.add(handle);
        }
      }
      // 3 Yellow Warning Decals below viewport (exact site photo cue!)
      for (let wi = 0; wi < 3; wi++) {
        const decal = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.02), warnYellow);
        decal.position.set(fanCenterX - 0.28 + wi * 0.18, skidH + 0.42, d / 2 + 0.045);
        group.add(decal);
      }
      // Circular Inspection Porthole Frame + Live Coaxial 3D SCADA 6-Blade Backward-Curved Impeller!
      const portRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 10, 24), blackCap);
      portRing.position.set(fanCenterX, bodyCenterY + 0.05, d / 2 + 0.05);
      group.add(portRing);
      const portWell = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 22), darkCavity);
      portWell.rotation.x = Math.PI / 2;
      portWell.position.set(fanCenterX, bodyCenterY + 0.05, d / 2 + 0.03);
      group.add(portWell);
      const { rotor, mat } = makeScadaImpeller3D(0.31);
      rotor.position.set(fanCenterX, bodyCenterY + 0.05, d / 2 + 0.085);
      rotors.push(rotor);
      accentMats.push(mat);
      group.add(rotor);

      // Signature DAIKIN Blue Logo Plaques on Top-Right Front & End Panels
      const daikinFront = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.27), daikinLogoMat);
      daikinFront.position.set(fanCenterX, h - 0.24, d / 2 + 0.055);
      group.add(daikinFront);
      const daikinBack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.27), daikinLogoMat);
      daikinBack.rotation.y = Math.PI;
      daikinBack.position.set(fanCenterX, h - 0.24, -d / 2 - 0.02);
      group.add(daikinBack);
      break;
    }

    case 'exhaust_fan': {
      // REALISTIC TEAL-GREEN CENTRIFUGAL PROCESS EXHAUST BLOWER (faithful to uploaded Nextfan FA photo!)
      //   - Heavy teal-green steel skid + dark slate-blue finned motor (+X)
      //   - Spiral teal-green centrifugal scroll housing + SIDE CIRCULAR SUCTION INLET (-X, terracotta bellmouth + spinning impeller)
      //   - Flexible pleated charcoal canvas connector ("bạt mềm ống gió") transitioning round suction -> square exhaust duct!
      //   - TOP VERTICAL RECTANGULAR DISCHARGE THROAT (+Y, terracotta collar) + top flexible canvas connector climbing to ceiling!
      const fanTeal = new THREE.MeshStandardMaterial({ color: 0x158068, roughness: 0.36, metalness: 0.42 });
      const fanTealDark = new THREE.MeshStandardMaterial({ color: 0x0f5f4e, roughness: 0.44, metalness: 0.48 });
      const motorSlate = new THREE.MeshStandardMaterial({ color: 0x2c4a58, roughness: 0.38, metalness: 0.52 });
      const rimRed = new THREE.MeshStandardMaterial({ color: 0x993b30, roughness: 0.45, metalness: 0.3 });
      const canvasMat = new THREE.MeshStandardMaterial({ color: 0x272b33, roughness: 0.85, metalness: 0.08 });
      const clampSteel = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.8 });

      const scrollX = -0.28;
      const axisY = 1.05;

      // 1. Structural Teal-Green Angle-Iron Skid Frame under Motor & Scroll
      const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 1.1), fanTealDark);
      baseFrame.position.set(0.18, 0.05, 0);
      baseFrame.receiveShadow = true;
      group.add(baseFrame);
      for (const mx of [0.1, 0.92]) {
        for (const mz of [-0.46, 0.46]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), fanTealDark);
          leg.position.set(mx, 0.36, mz);
          group.add(leg);
        }
      }
      const motorDeck = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.08, 1.04), fanTeal);
      motorDeck.position.set(0.5, 0.68, 0);
      group.add(motorDeck);

      // 2. Dark Slate-Blue Finned Drive Motor mounted on +X side of Scroll
      const drvMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.88, 20), motorSlate);
      drvMotor.rotation.z = Math.PI / 2;
      drvMotor.position.set(0.52, axisY, 0);
      drvMotor.castShadow = true;
      group.add(drvMotor);
      const motorCowl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), motorSlate);
      motorCowl.rotation.z = -Math.PI / 2;
      motorCowl.scale.set(1, 0.55, 1);
      motorCowl.position.set(0.96, axisY, 0);
      group.add(motorCowl);
      const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.22), motorSlate);
      termBox.position.set(0.42, axisY, 0.36);
      group.add(termBox);

      // 3. Large Teal-Green Centrifugal Scroll Volute Housing
      const scrollDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.58, 26), fanTeal);
      scrollDrum.rotation.z = Math.PI / 2;
      scrollDrum.position.set(scrollX, axisY, 0);
      scrollDrum.castShadow = true;
      group.add(scrollDrum);

      // 4. SIDE CIRCULAR SUCTION INLET (-X face) with Terracotta Bellmouth + Coaxial Spinning Impeller!
      const inCone = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.22, 20), fanTeal);
      inCone.rotation.z = Math.PI / 2;
      inCone.position.set(scrollX - 0.36, axisY, 0);
      group.add(inCone);
      const inBell = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 20), rimRed);
      inBell.rotation.z = Math.PI / 2;
      inBell.position.set(scrollX - 0.46, axisY, 0);
      group.add(inBell);
      const inWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.09, 18),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9 })
      );
      inWell.rotation.z = Math.PI / 2;
      inWell.position.set(scrollX - 0.47, axisY, 0);
      group.add(inWell);

      // Coaxial spinning impeller inside side intake mouth (spins around X!)
      const impHolder = new THREE.Group();
      impHolder.position.set(scrollX - 0.48, axisY, 0);
      const impInner = makeScadaImpeller3D(0.32);
      impInner.rotor.rotation.y = -Math.PI / 2;
      impHolder.add(impInner.rotor);
      rotors.push(impHolder);
      accentMats.push(impInner.mat);
      group.add(impHolder);

      // FLEXIBLE CANVAS DUCT CONNECTOR ("BẠT MỀM ỐNG GIÓ") on Side Circular Inlet -> Square Duct (-0.50 .. -0.94)!
      const inClampA = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.05, 20), clampSteel);
      inClampA.rotation.z = Math.PI / 2;
      inClampA.position.set(scrollX - 0.5, axisY, 0);
      group.add(inClampA);
      // Pleated flexible round-to-square transition bellows
      const canvasIn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.42, 0.14, 16), canvasMat);
      canvasIn1.rotation.z = Math.PI / 2;
      canvasIn1.position.set(scrollX - 0.59, axisY, 0);
      group.add(canvasIn1);
      const canvasIn2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.88, 0.88), canvasMat);
      canvasIn2.position.set(scrollX - 0.76, axisY, 0);
      group.add(canvasIn2);
      const inClampB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 0.98), clampSteel);
      inClampB.position.set(scrollX - 0.9, axisY, 0);
      group.add(inClampB);

      // 5. TOP VERTICAL RECTANGULAR DISCHARGE THROAT (+Y) with Terracotta Rim + Top Flexible Canvas Connector ("Bạt mềm")!
      const topThroat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.68), fanTeal);
      topThroat.position.set(scrollX, axisY + 0.56, 0.22);
      topThroat.castShadow = true;
      group.add(topThroat);
      const topFlange = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.07, 0.82), rimRed);
      topFlange.position.set(scrollX, 2.02, 0.22);
      group.add(topFlange);
      // Top Flexible Canvas Connector bridging fan throat -> overhead square exhaust duct (Y = 2.05 .. 2.38)!
      const topCanvas = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.3, 0.86), canvasMat);
      topCanvas.position.set(scrollX, 2.2, 0.1);
      group.add(topCanvas);
      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.98), clampSteel);
      topClamp.position.set(scrollX, 2.35, 0.04);
      group.add(topClamp);
      break;
    }

    case 'duct_fan': {
      // REALISTIC MATTE-BLACK INLINE CYLINDRICAL AXIAL DUCT FAN (faithful to uploaded ProAir Black Duct Fan photo!)
      //   - Open matte-black flanged steel drum (centered at local Y=0 so it mounts seamlessly on overhead ceiling ducts!)
      //   - Front & rear bolted circular flanges + white nameplate + 6-blade silver-aluminum pitched axial rotor spinning coaxially!
      const drumBlack = new THREE.MeshStandardMaterial({
        color: 0x171b22,
        roughness: 0.42,
        metalness: 0.58,
        side: THREE.DoubleSide,
      });
      const flangeBlack = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.38, metalness: 0.62 });
      const labelWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
      const r = Math.min(w, h) * 0.48;
      const len = d * 0.96;

      // Cylindrical black steel casing (axis along X so rotY=0 bridges X ducts & rotY=PI/2 bridges Z ducts!)
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24, 1, true), drumBlack);
      drum.rotation.z = Math.PI / 2;
      drum.castShadow = true;
      group.add(drum);

      // Front & rear heavy bolted flange rings
      for (const fx of [-len / 2, len / 2]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.055, 8, 24), flangeBlack);
        ring.rotation.y = Math.PI / 2;
        ring.position.x = fx;
        group.add(ring);
      }

      // White nameplate & yellow warning sticker on side of black drum (exact ProAir photo cue!)
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.02), labelWhite);
      plate.position.set(0, 0.05, r + 0.015);
      group.add(plate);

      // Internal motor hub + Coaxial 6-Blade Silver-Aluminum Axial Impeller spinning around X!
      const hubMotor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, len * 0.52, 14), flangeBlack);
      hubMotor.rotation.z = Math.PI / 2;
      group.add(hubMotor);

      const axHolder = new THREE.Group();
      const axRotor = makeScadaImpeller3D(r * 0.88, 0xdbe4ee);
      axRotor.rotor.rotation.y = Math.PI / 2;
      axHolder.add(axRotor.rotor);
      rotors.push(axHolder);
      accentMats.push(axRotor.mat);
      group.add(axHolder);
      break;
    }

    case 'rodi_skid': {
      // REALISTIC BRUSHED STAINLESS-STEEL 3RD-PARTY RO-DI WATER PACKAGE SKID (faithful to public/scada/DI.png!)
      const ssBright = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.24, metalness: 0.78 });
      const ssFrame = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.72 });
      const ediBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.45 });

      // Heavy stainless skid frame base
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), ssFrame);
      frame.position.y = 0.11;
      frame.receiveShadow = true;
      group.add(frame);

      // 1. LEFT: Brushed-Stainless PLC Electrical Control Cabinet + Blue HMI + 4 Digital Conductivity Meters
      const plcCab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, h * 0.72, d * 0.44), ssBright);
      plcCab.position.set(-w * 0.38, 0.22 + h * 0.36, d * 0.22);
      plcCab.castShadow = true;
      group.add(plcCab);

      const hmiAccent = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.55 });
      accentMats.push(hmiAccent);
      const plcHmi = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.05), hmiAccent);
      plcHmi.position.set(-w * 0.38, h * 0.62, d * 0.44 + 0.02);
      group.add(plcHmi);
      for (let mi = 0; mi < 4; mi++) {
        const meter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.04), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 }));
        meter.position.set(-w * 0.44 + mi * 0.24, h * 0.46, d * 0.44 + 0.02);
        group.add(meter);
      }

      // 2. CENTER-REAR: Horizontal Rack of 5 Brushed-Stainless RO Membrane Pressure Vessels!
      const rackLen = w * 0.56;
      for (const rx of [-w * 0.18, w * 0.18]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, h * 0.88, 0.12), ssFrame);
        post.position.set(rx, 0.22 + h * 0.44, -d * 0.24);
        group.add(post);
      }
      for (let vi = 0; vi < 5; vi++) {
        const roTube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, rackLen, 16), ssBright);
        roTube.rotation.z = Math.PI / 2;
        roTube.position.set(0.0, 0.85 + vi * 0.42, -d * 0.24);
        roTube.castShadow = true;
        group.add(roTube);
      }

      // 3. CENTER-FRONT: EDI (Electrodeionization) Module Stack + Blue Booster Pump + Local Instrument Box
      const ediRack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 0.45, d * 0.28), ssBright);
      ediRack.position.set(0.05, 0.22 + h * 0.225, d * 0.18);
      group.add(ediRack);
      const ediCtrl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, 0.48, d * 0.26), ssFrame);
      ediCtrl.position.set(0.05, h * 0.62, d * 0.18);
      group.add(ediCtrl);
      const boostPump = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 14), ediBlue);
      boostPump.rotation.z = Math.PI / 2;
      boostPump.position.set(-w * 0.16, 0.92, d * 0.16);
      group.add(boostPump);

      // 4. RIGHT: Large Brushed-Stainless Cylindrical DI Storage Tank on 4 Tapered Legs!
      const tankR = Math.min(w * 0.15, d * 0.34);
      const tankH = h * 0.64;
      for (const lx of [-tankR * 0.65, tankR * 0.65]) {
        for (const lz of [-tankR * 0.65, tankR * 0.65]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), ssFrame);
          leg.position.set(w * 0.32 + lx, 0.52, lz);
          group.add(leg);
        }
      }
      const diTank = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR, tankH, 24), ssBright);
      diTank.position.set(w * 0.32, 0.8 + tankH / 2, 0);
      diTank.castShadow = true;
      group.add(diTank);
      const tankDome = new THREE.Mesh(new THREE.SphereGeometry(tankR, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), ssBright);
      tankDome.scale.set(1, 0.35, 1);
      tankDome.position.set(w * 0.32, 0.8 + tankH, 0);
      group.add(tankDome);
      break;
    }

    case 'ffu': {
      // CLEANROOM CEILING FAN FILTER UNIT (Aluminum HEPA plenum box + top centrifugal blower dome + true coaxial impeller!)
      const aluBox = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.62 });
      const hepaGrid = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.55 });
      const plenum = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.42, d), aluBox);
      plenum.position.y = h * 0.21;
      plenum.castShadow = true;
      group.add(plenum);
      const filterFace = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.05, d * 0.9), hepaGrid);
      filterFace.position.y = 0.02;
      group.add(filterFace);
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.26, w * 0.34, h * 0.42, 18), steelDark);
      dome.position.y = h * 0.62;
      group.add(dome);
      // Tilt a dedicated pivot group by +PI/2 around X, then spin the inner rotor coaxially around its own Z axis (ZERO gimbal wobble!)
      const ffuPivot = new THREE.Group();
      ffuPivot.position.y = h * 0.85;
      ffuPivot.rotation.x = Math.PI / 2;
      const ffuImpeller = makeScadaImpeller3D(w * 0.22);
      ffuPivot.add(ffuImpeller.rotor);
      group.add(ffuPivot);
      rotors.push(ffuImpeller.rotor);
      accentMats.push(ffuImpeller.mat);
      break;
    }

    case 'pauct': {
      // CEILING-HUNG PAUCT COOLING BLOWER UNIT (Suspended flush beneath the 3.85m cleanroom ceiling by 2 galvanized threaded rods — "2 thanh ti treo"!)
      const whiteCase = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.28 });
      const darkGrille = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.4 });
      const rodSteel = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });
      const chwSupMat = new THREE.MeshStandardMaterial({ color: 0x00cfe8, roughness: 0.3 });
      const chwRetMat = new THREE.MeshStandardMaterial({ color: 0x008f91, roughness: 0.3 });

      // Sleek white rectangular ceiling-hung air blower body (local Y = 0 .. h)
      const casing = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteCase);
      casing.position.y = h / 2;
      casing.castShadow = true;
      group.add(casing);

      // 2 Vertical Galvanized Threaded Suspension Rods ("2 thanh ti treo") anchored into the 3.85m ceiling panel (rodH = 0.70m -> reaches Y = 3.85m!)
      const rodH = 0.7;
      for (const rx of [-w * 0.36, w * 0.36]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, rodH, 10), rodSteel);
        rod.position.set(rx, h + rodH / 2 - 0.02, 0);
        group.add(rod);
        // Ceiling anchor flange plate & lower mounting bracket nut
        const ceilFlange = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), rodSteel);
        ceilFlange.position.set(rx, h + rodH - 0.03, 0);
        group.add(ceilFlange);
        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 6), rodSteel);
        nut.position.set(rx, h + 0.02, 0);
        group.add(nut);
      }

      // Front (+Z) Louvered Cool-Air Discharge Grille + Coaxial Spinning Impeller!
      const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, h * 0.72, 0.05), darkGrille);
      grilleFrame.position.set(0, h / 2, d / 2 + 0.015);
      group.add(grilleFrame);
      const fanWheel = makeScadaImpeller3D(h * 0.34);
      fanWheel.rotor.position.set(0, h / 2, d / 2 + 0.055);
      group.add(fanWheel.rotor);
      rotors.push(fanWheel.rotor);
      accentMats.push(fanWheel.mat);

      // Left-side (-X) CHW Supply & Return connection stubs matching the overhead CHW drop pipes
      const stubGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.14, 10);
      stubGeo.rotateZ(Math.PI / 2);
      const supStub = new THREE.Mesh(stubGeo, chwSupMat);
      supStub.position.set(-w / 2 - 0.05, h * 0.55, 0);
      group.add(supStub);
      const retStub = new THREE.Mesh(stubGeo, chwRetMat);
      retStub.position.set(-w / 2 - 0.05, h * 0.55, 0.22);
      group.add(retStub);
      break;
    }

    case 'fcu': {
      // CEILING-CONCEALED GALVANIZED FAN COIL UNIT (Galvanized housing + copper CHW coil side header + dual spinning blowers!)
      const galv = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.65 });
      const copper = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.78 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.72, d), galv);
      body.position.y = h * 0.45;
      body.castShadow = true;
      group.add(body);
      const coilHdr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d * 0.7, 10), copper);
      coilHdr.rotation.x = Math.PI / 2;
      coilHdr.position.set(-w * 0.54, h * 0.45, 0);
      group.add(coilHdr);
      for (const bx of [-w * 0.25, w * 0.25]) {
        const blower = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.28, h * 0.28, 0.24, 14), steelDark);
        blower.rotation.z = Math.PI / 2;
        blower.position.set(bx, h * 0.48, d * 0.52);
        group.add(blower);
        const fcuWheel = makeScadaImpeller3D(h * 0.22, 0.05);
        fcuWheel.rotor.position.set(bx, h * 0.48, d * 0.65);
        group.add(fcuWheel.rotor);
        rotors.push(fcuWheel.rotor);
        accentMats.push(fcuWheel.mat);
      }
      break;
    }
  }

  const topVisualH =
    node.meshType === 'cooling_tower' ? 3.55 : node.meshType === 'duct_fan' ? h * 0.55 : h;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(node.meshType === 'building' ? 0.45 : 0.2, 14, 14), beaconMat);
  beacon.position.set(w * 0.32, topVisualH + 0.38, d * 0.3);
  group.add(beacon);

  const isBuilding = node.meshType === 'building';
  const sprite = isBuilding
    ? makeLabelSprite(node.label, 'rgba(15, 23, 42, 0.94)', node.buildingColor ?? '#38bdf8', '#ffffff', 7.8, 1.68)
    : makeLabelSprite(node.label);
  sprite.position.set(0, topVisualH + (isBuilding ? 1.85 : 1.0), 0);
  group.add(sprite);

  return {
    node,
    group,
    beaconMat,
    accentMats,
    rotors,
    damperBlades: damperBlades.length > 0 ? damperBlades : undefined,
    liquidMesh,
    liquidMaxH,
    waterDrops,
  };
}

/**
 * Industrial Safety-Yellow Vertical Caged Ladder ("Thang leo vàng có lồng bảo vệ té ngã")
 * mounted on the right flank of the Cooling Tower deck & CT-19.
 */
function buildCagedLadderMesh(
  totalHeight: number,
  mat: THREE.MeshStandardMaterial,
  cageStartY = 2.1,
  cageRadius = 0.42
): THREE.Group {
  const ladder = new THREE.Group();
  const halfW = Math.min(0.24, cageRadius * 0.6);
  const railH = totalHeight + 0.78;

  // 2 Vertical side stiles (rails)
  for (const sx of [-halfW, halfW]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055, railH, 0.055), mat);
    rail.position.set(sx, railH / 2, 0);
    ladder.add(rail);
  }

  // Climbing rungs every 0.38m
  const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, halfW * 2, 8);
  rungGeo.rotateZ(Math.PI / 2);
  for (let y = 0.35; y <= totalHeight; y += 0.38) {
    const rung = new THREE.Mesh(rungGeo, mat);
    rung.position.set(0, y, 0);
    ladder.add(rung);
  }

  // Stand-off mounting brackets securing the ladder back into the CT frame / tower wall
  const bracketHeights = [totalHeight * 0.25, totalHeight * 0.6, totalHeight - 0.25];
  for (const by of bracketHeights) {
    for (const sx of [-halfW, halfW]) {
      const brk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.32), mat);
      brk.position.set(sx, by, -0.16);
      ladder.add(brk);
    }
  }

  // Anti-fall back safety cage (hoops + 3 vertical flat bars from cageStartY to top of ladder)
  const cageEndY = totalHeight + 0.68;
  const hoopGeo = new THREE.TorusGeometry(cageRadius, 0.026, 8, 16, Math.PI);
  for (let y = cageStartY; y <= cageEndY + 0.01; y += 0.88) {
    const hoop = new THREE.Mesh(hoopGeo, mat);
    hoop.rotation.x = Math.PI / 2; // Semicircle protrudes toward +Z (local) behind climber's back
    hoop.position.set(0, y, 0);
    ladder.add(hoop);
  }

  const cageH = Math.max(0.2, cageEndY - cageStartY);
  const barGeo = new THREE.BoxGeometry(0.04, cageH, 0.04);
  for (const ang of [Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75]) {
    const bar = new THREE.Mesh(barGeo, mat);
    bar.position.set(Math.cos(ang) * cageRadius, cageStartY + cageH / 2, Math.sin(ang) * cageRadius);
    ladder.add(bar);
  }

  return ladder;
}

/**
 * Architectural Unified Building 5 — 1st Floor (1F) with 4 Independently Toggleable Layer Sub-Groups:
 *   - 'chiller': Indoor Chiller & HR Room (Ceiling = 7.2m) + Elevated Outdoor KingSun CT Steel Deck (Y = 8.6m!)
 *   - 'pcw'    : Outdoor PCW Silicon Yard outside left wall beside CH-11 (X = -35.5 .. -18.2)
 *   - 'ac'     : Indoor Compressed Air (OFRAC/OFLAC) & Vacuum Room to the right of CH-14 (X = +21.5 .. +46.5)
 *   - 'di'     : Indoor 3rd-Party RO-DI Room (X = +49.5 .. +66.5) + Elevated B5 2nd-Floor DI Instrument Mezzanine (Y = 7.4m)
 */
function buildB5ChillerArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const railingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.35 });
  const glassWallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    roughness: 0.15,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });

  // -------------------------------------------------------------------------
  // SUB-GROUP 1: CHILLER & HEAT RECOVERY + ELEVATED CT DECK (Y = 8.6m)
  // -------------------------------------------------------------------------
  const chGrp = new THREE.Group();
  chGrp.userData.b5Layer = 'chiller' as B51FLayerId;
  arch.add(chGrp);

  const indoorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(36.4, 0.08, 14.9),
    new THREE.MeshStandardMaterial({ color: 0x26354d, roughness: 0.75 })
  );
  indoorFloor.position.set(0, 0.02, 2.05);
  indoorFloor.receiveShadow = true;
  chGrp.add(indoorFloor);

  const outdoorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(36.4, 0.08, 10.2),
    new THREE.MeshStandardMaterial({ color: 0x182234, roughness: 0.9 })
  );
  outdoorFloor.position.set(0, 0.01, -10.5);
  outdoorFloor.receiveShadow = true;
  chGrp.add(outdoorFloor);

  // Exterior Rear Glass Wall (Y = B5_CEILING_Y = 7.2m)
  const extWall = new THREE.Mesh(new THREE.BoxGeometry(36.4, B5_CEILING_Y, 0.16), glassWallMat);
  extWall.position.set(0, B5_CEILING_Y / 2, B5_WALL_Z);
  chGrp.add(extWall);

  for (const cx of [-18.0, -12.0, -6.0, 0, 6.0, 12.0, 18.0]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, B5_CEILING_Y, 0.32), steelMat);
    col.position.set(cx, B5_CEILING_Y / 2, B5_WALL_Z);
    chGrp.add(col);
  }
  const beamFront = new THREE.Mesh(new THREE.BoxGeometry(36.4, 0.24, 0.24), steelMat);
  beamFront.position.set(0, B5_CEILING_Y, B5_INNER_WALL_Z);
  chGrp.add(beamFront);
  const beamBack = new THREE.Mesh(new THREE.BoxGeometry(36.4, 0.24, 0.28), steelMat);
  beamBack.position.set(0, B5_CEILING_Y, B5_WALL_Z);
  chGrp.add(beamBack);
  for (const bx of [-18.0, -9.0, 0, 9.0, 18.0]) {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, B5_INNER_WALL_Z - B5_WALL_Z), steelMat);
    crossBeam.position.set(bx, B5_CEILING_Y, (B5_INNER_WALL_Z + B5_WALL_Z) / 2);
    chGrp.add(crossBeam);
  }

  const innerCurb = new THREE.Mesh(
    new THREE.BoxGeometry(36.4, 1.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.45 })
  );
  innerCurb.position.set(0, 0.7, B5_INNER_WALL_Z);
  chGrp.add(innerCurb);

  // ELEVATED OUTDOOR COOLING TOWER STEEL PLATFORM (Y = B5_CT_DECK_Y = 8.6m — HIGHER than 7.2m indoor ceiling!)
  const deckW = 33.2;
  const deckD = 6.2;
  const deckZ = -11.1;
  const ctRowZ = -10.8;
  const deckSlab = new THREE.Mesh(
    new THREE.BoxGeometry(deckW, 0.28, deckD),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.65 })
  );
  deckSlab.position.set(0, B5_CT_DECK_Y - 0.14, deckZ);
  deckSlab.castShadow = true;
  deckSlab.receiveShadow = true;
  chGrp.add(deckSlab);

  // Tall Heavy Support Columns + 2 Horizontal Structural Bracing Tiers under the 8.6m CT Platform
  for (const sx of [-16.0, -9.6, -3.2, 3.2, 9.6, 16.0]) {
    for (const sz of [deckZ - 2.6, deckZ + 2.6]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, B5_CT_DECK_Y - 0.2, 0.4), steelMat);
      col.position.set(sx, (B5_CT_DECK_Y - 0.2) / 2, sz);
      col.castShadow = true;
      chGrp.add(col);
    }
    for (const braceY of [3.0, 5.8]) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 5.2), steelMat);
      tie.position.set(sx, braceY, deckZ);
      chGrp.add(tie);
    }
  }
  for (const braceY of [3.0, 5.8]) {
    const longBeamFront = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.22, 0.22), steelMat);
    longBeamFront.position.set(0, braceY, deckZ + 2.6);
    chGrp.add(longBeamFront);
  }

  // Yellow Safety Handrails around 8.6m Elevated CT Platform
  const railH = 1.05;
  const railFront = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.08, 0.08), railingMat);
  railFront.position.set(0, B5_CT_DECK_Y + railH, deckZ + deckD / 2 - 0.08);
  chGrp.add(railFront);
  const railBack = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.08, 0.08), railingMat);
  railBack.position.set(0, B5_CT_DECK_Y + railH, deckZ - deckD / 2 + 0.08);
  chGrp.add(railBack);
  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, deckD), railingMat);
  railLeft.position.set(-deckW / 2 + 0.08, B5_CT_DECK_Y + railH, deckZ);
  chGrp.add(railLeft);
  for (let rx = -16; rx <= 16; rx += 4) {
    const postF = new THREE.Mesh(new THREE.BoxGeometry(0.07, railH, 0.07), railingMat);
    postF.position.set(rx, B5_CT_DECK_Y + railH / 2, deckZ + deckD / 2 - 0.08);
    chGrp.add(postF);
    const postB = new THREE.Mesh(new THREE.BoxGeometry(0.07, railH, 0.07), railingMat);
    postB.position.set(rx, B5_CT_DECK_Y + railH / 2, deckZ - deckD / 2 + 0.08);
    chGrp.add(postB);
  }

  const rightFrontZ = deckZ + deckD / 2 - 0.08;
  const rightBackZ = deckZ - deckD / 2 + 0.08;
  const gapFrontZ = ctRowZ + 0.55;
  const gapBackZ = ctRowZ - 0.55;
  const rfLen = Math.max(0.2, rightFrontZ - gapFrontZ);
  const rbLen = Math.max(0.2, gapBackZ - rightBackZ);
  const railRightFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, rfLen), railingMat);
  railRightFront.position.set(deckW / 2 - 0.08, B5_CT_DECK_Y + railH, gapFrontZ + rfLen / 2);
  chGrp.add(railRightFront);
  const railRightBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, rbLen), railingMat);
  railRightBack.position.set(deckW / 2 - 0.08, B5_CT_DECK_Y + railH, rightBackZ + rbLen / 2);
  chGrp.add(railRightBack);
  for (const rz of [rightBackZ, gapBackZ, gapFrontZ, rightFrontZ]) {
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.07, railH, 0.07), railingMat);
    postR.position.set(deckW / 2 - 0.08, B5_CT_DECK_Y + railH / 2, rz);
    chGrp.add(postR);
  }

  // Tall Safety-Yellow Caged Access Ladder climbing from Ground (Y = 0) up to 8.6m Elevated CT Platform
  const lowerCagedLadder = buildCagedLadderMesh(B5_CT_DECK_Y, railingMat, 2.2, 0.42);
  lowerCagedLadder.rotation.y = Math.PI / 2;
  lowerCagedLadder.position.set(deckW / 2 + 0.14, 0, ctRowZ);
  chGrp.add(lowerCagedLadder);

  // Top Safety Maintenance Walkway & Handrail along FRONT top rim of 9 KingSun Towers (Y = 8.6 + 3.15 = 11.75m)
  const topWalkY = B5_CT_DECK_Y + 3.15;
  const topCatwalk = new THREE.Mesh(
    new THREE.BoxGeometry(30.2, 0.08, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.65 })
  );
  topCatwalk.position.set(0, topWalkY, ctRowZ + 1.44);
  chGrp.add(topCatwalk);
  const topRailFront = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.07, 0.07), railingMat);
  topRailFront.position.set(0, topWalkY + 0.95, ctRowZ + 1.7);
  chGrp.add(topRailFront);
  for (let tx = -15.0; tx <= 15.0; tx += 3.0) {
    const tPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railingMat);
    tPost.position.set(tx, topWalkY + 0.475, ctRowZ + 1.7);
    chGrp.add(tPost);
  }

  // -------------------------------------------------------------------------
  // SUB-GROUP 2: COMPACT OUTDOOR PCW SILICON STATION ('pcw', Hugging Left Wall X = -30.0 .. -18.2)
  // -------------------------------------------------------------------------
  const pcwGrp = new THREE.Group();
  pcwGrp.userData.b5Layer = 'pcw' as B51FLayerId;
  arch.add(pcwGrp);

  const pcwPad = new THREE.Mesh(
    new THREE.BoxGeometry(11.8, 0.1, 15.6),
    new THREE.MeshStandardMaterial({ color: 0x163242, roughness: 0.85 })
  );
  pcwPad.position.set(-24.2, 0.03, 2.4);
  pcwPad.receiveShadow = true;
  pcwGrp.add(pcwPad);

  // Exterior Left Glass Wall separating Indoor Chiller Room & Outdoor PCW Yard (X = B5_LEFT_WALL_X = -18.2)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, B5_CEILING_Y, 15.4), glassWallMat);
  leftWall.position.set(B5_LEFT_WALL_X, B5_CEILING_Y / 2, 2.3);
  pcwGrp.add(leftWall);

  // Compact Outdoor PCW Overhead Steel Pipe-Rack Frame (Y = 6.5m)
  for (const px of [-29.4, -24.0, -18.8]) {
    for (const pz of [-4.6, 9.4]) {
      const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.5, 0.22), steelMat);
      pCol.position.set(px, 3.25, pz);
      pcwGrp.add(pCol);
    }
    const pCross = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 14.0), steelMat);
    pCross.position.set(px, 6.5, 2.4);
    pcwGrp.add(pCross);
  }

  // -------------------------------------------------------------------------
  // SUB-GROUP 3: INDOOR COMPRESSED AIR (OFRAC/OFLAC) & VACUUM ROOM ('ac', X = +21.5 .. +46.5)
  // -------------------------------------------------------------------------
  const acGrp = new THREE.Group();
  acGrp.userData.b5Layer = 'ac' as B51FLayerId;
  arch.add(acGrp);

  // Walkway aisle connecting Chiller Room & AC Room (X = 18.2 .. 21.5)
  const aisleChAc = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 0.07, 14.9),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
  );
  aisleChAc.position.set(19.85, 0.015, 2.05);
  acGrp.add(aisleChAc);

  const acFloor = new THREE.Mesh(
    new THREE.BoxGeometry(25.2, 0.08, 14.9),
    new THREE.MeshStandardMaterial({ color: 0x2b2938, roughness: 0.78 })
  );
  acFloor.position.set(34.1, 0.02, 2.05);
  acFloor.receiveShadow = true;
  acGrp.add(acFloor);

  // AC Room Rear Glass Wall & 7.2m Ceiling Steel Frame
  const acRearWall = new THREE.Mesh(new THREE.BoxGeometry(28.5, B5_CEILING_Y, 0.16), glassWallMat);
  acRearWall.position.set(32.5, B5_CEILING_Y / 2, B5_WALL_Z);
  acGrp.add(acRearWall);
  const acBeamF = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.24, 0.24), steelMat);
  acBeamF.position.set(32.5, B5_CEILING_Y, B5_INNER_WALL_Z);
  acGrp.add(acBeamF);
  const acBeamB = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.24, 0.24), steelMat);
  acBeamB.position.set(32.5, B5_CEILING_Y, B5_WALL_Z);
  acGrp.add(acBeamB);
  for (const ax of [22.0, 30.0, 38.0, 46.5]) {
    const aCol = new THREE.Mesh(new THREE.BoxGeometry(0.28, B5_CEILING_Y, 0.28), steelMat);
    aCol.position.set(ax, B5_CEILING_Y / 2, B5_WALL_Z);
    acGrp.add(aCol);
    const aCross = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, B5_INNER_WALL_Z - B5_WALL_Z), steelMat);
    aCross.position.set(ax, B5_CEILING_Y, (B5_INNER_WALL_Z + B5_WALL_Z) / 2);
    acGrp.add(aCross);
  }

  // -------------------------------------------------------------------------
  // SUB-GROUP 4: DI WATER ROOM (3RD-PARTY RO-DI ON 1F) + B5 2ND FLOOR DI LOOPS ('di', X = +49.5 .. +66.5)
  // -------------------------------------------------------------------------
  const diGrp = new THREE.Group();
  diGrp.userData.b5Layer = 'di' as B51FLayerId;
  arch.add(diGrp);

  const aisleAcDi = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.07, 14.9),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
  );
  aisleAcDi.position.set(48.1, 0.015, 2.05);
  diGrp.add(aisleAcDi);

  const diFloor = new THREE.Mesh(
    new THREE.BoxGeometry(17.5, 0.08, 14.9),
    new THREE.MeshStandardMaterial({ color: 0x162f3e, roughness: 0.78 })
  );
  diFloor.position.set(58.35, 0.02, 2.05);
  diFloor.receiveShadow = true;
  diGrp.add(diFloor);

  // Structural columns & Semi-Transparent 2nd Floor Reference Deck at Y = 7.4m holding B5 2F DI Instrument Loops!
  for (const dx of [50.0, 58.2, 66.5]) {
    for (const dz of [B5_WALL_Z, B5_INNER_WALL_Z]) {
      const dCol = new THREE.Mesh(new THREE.BoxGeometry(0.28, B5_CEILING_Y + 0.2, 0.28), steelMat);
      dCol.position.set(dx, (B5_CEILING_Y + 0.2) / 2, dz);
      diGrp.add(dCol);
    }
  }
  const di2fDeck = new THREE.Mesh(
    new THREE.BoxGeometry(16.8, 0.16, 14.2),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      roughness: 0.25,
      metalness: 0.35,
    })
  );
  di2fDeck.position.set(58.2, B5_CEILING_Y + 0.2, 1.8);
  diGrp.add(di2fDeck);

  const di2fBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(16.8, 0.18, 14.2)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8 })
  );
  di2fBorder.position.set(58.2, B5_CEILING_Y + 0.2, 1.8);
  diGrp.add(di2fBorder);

  return arch;
}

/**
 * Clean, Spacious Building 5 — M1F Mezzanine Room (`MEP SPACE 5-MF1`, 16m × 10m × 6.2m):
 *   - Daikin AHU-B5-1F-01 sits neatly inside (~1/4 room area) with Supply Air duct flush against the right wall
 *   - ZERO exterior void area & ZERO decorative text banners (only real SCADA tags!)
 */
function buildB5M1fArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.32,
    roughness: 0.35,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  const solidWallMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.56,
    roughness: 0.45,
    metalness: 0.25,
  });
  const ductCollarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.72 });

  const roomW = M1F_WALL_RIGHT_X - M1F_WALL_LEFT_X; // 16.0m
  const roomD = M1F_ROOM_HALF_Z * 2; // 10.0m

  // 1. Spacious Epoxy Room Floor (16m × 10m — AHU occupies ~1/4 area!)
  const roomFloor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.1, roomD),
    new THREE.MeshStandardMaterial({ color: 0x263850, roughness: 0.75 })
  );
  roomFloor.position.set(0, 0.02, 0);
  roomFloor.receiveShadow = true;
  arch.add(roomFloor);

  // Structural Columns & 6.2m Ceiling Steel Beams framing the spacious 20m × 12m room
  for (const cx of [M1F_WALL_LEFT_X, -3.33, 3.33, M1F_WALL_RIGHT_X]) {
    for (const cz of [-M1F_ROOM_HALF_Z, M1F_ROOM_HALF_Z]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, M1F_CEILING_Y, 0.28), steelMat);
      col.position.set(cx, M1F_CEILING_Y / 2, cz);
      arch.add(col);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, roomD), steelMat);
    crossBeam.position.set(cx, M1F_CEILING_Y, 0);
    arch.add(crossBeam);
  }
  for (const cz of [-M1F_ROOM_HALF_Z, M1F_ROOM_HALF_Z]) {
    const longBeam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 0.22), steelMat);
    longBeam.position.set(0, M1F_CEILING_Y, cz);
    arch.add(longBeam);
  }

  // Semi-transparent Ceiling Slab Reference
  const ceilingSlab = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.08, roomD),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.08, roughness: 0.3 })
  );
  ceilingSlab.position.set(0, M1F_CEILING_Y + 0.04, 0);
  arch.add(ceilingSlab);

  // Rear, Left & Low Front Viewing Walls
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, M1F_CEILING_Y, 0.16), wallMat);
  rearWall.position.set(0, M1F_CEILING_Y / 2, -M1F_ROOM_HALF_Z);
  arch.add(rearWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, M1F_CEILING_Y, roomD), wallMat);
  leftWall.position.set(M1F_WALL_LEFT_X, M1F_CEILING_Y / 2, 0);
  arch.add(leftWall);
  const frontCurb = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.24, 0.18), steelMat);
  frontCurb.position.set(0, 0.12, M1F_ROOM_HALF_Z);
  arch.add(frontCurb);

  // Right Wall (X = +10.0) with Galvanized Duct Penetration Collars centered dead-center at Z = 0!
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, M1F_CEILING_Y, roomD), solidWallMat);
  rightWall.position.set(M1F_WALL_RIGHT_X, M1F_CEILING_Y / 2, 0);
  arch.add(rightWall);

  const saPenetrationFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.24, 1.38), ductCollarMat);
  saPenetrationFrame.position.set(M1F_WALL_RIGHT_X, 1.32, 0);
  arch.add(saPenetrationFrame);
  const raPenetrationFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.12, 1.34), ductCollarMat);
  raPenetrationFrame.position.set(M1F_WALL_RIGHT_X, 5.15, 0);
  arch.add(raPenetrationFrame);

  return arch;
}

/**
 * Clean Architectural Mezzanine Room for Building 5 — M2F (`MEP SPACE 5-MF2`, 38m × 20m × 6.8m):
 *   - Left/Rear Bay: 4× Daikin AHUs + 1× PAU-2F-01 lined up in a row against the Rear Exterior Fresh-Air Wall
 *   - Central Marked Pedestrian Walkway Aisle separating the AHU/PAU Bay & Process Exhaust Bay!
 *   - Right Bay: 3× Floor-Mounted Centrifugal Process Exhaust Fans (FA-11201A / 03A / 04A) discharging out Right Exterior Wall
 *   - ZERO decorative text banners (real SCADA equipment/valve/sensor tags ONLY!)
 */
function buildB5M2fArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.28,
    roughness: 0.38,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  const roomW = M2F_WALL_RIGHT_X - M2F_WALL_LEFT_X; // 38m
  const roomD = M2F_WALL_FRONT_Z - M2F_WALL_REAR_Z; // 20m
  const centerZ = (M2F_WALL_FRONT_Z + M2F_WALL_REAR_Z) / 2; // -0.5

  // Main M2F Epoxy Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.1, roomD),
    new THREE.MeshStandardMaterial({ color: 0x25354c, roughness: 0.78 })
  );
  floor.position.set(0, 0.02, centerZ);
  floor.receiveShadow = true;
  arch.add(floor);

  // Subtle Painted Walkway Aisle between AHU/PAU Bay (X = -17..+9.5) and EXH Bay (X = +12.5..+18)
  const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
  const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const aisleV = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, roomD - 1.2), walkwayMat);
  aisleV.position.set(11.1, 0.075, centerZ);
  arch.add(aisleV);
  for (const lx of [9.82, 12.38]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, roomD - 1.4), yellowLineMat);
    stripe.position.set(lx, 0.08, centerZ);
    arch.add(stripe);
  }
  const aisleH = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.02, 2.6), walkwayMat);
  aisleH.position.set(-4.0, 0.075, 2.2);
  arch.add(aisleH);
  for (const lz of [0.92, 3.48]) {
    const stripeH = new THREE.Mesh(new THREE.BoxGeometry(27.4, 0.025, 0.1), yellowLineMat);
    stripeH.position.set(-4.0, 0.08, lz);
    arch.add(stripeH);
  }

  // Structural Steel Columns & 6.8m Ceiling Beams
  for (const cx of [-19.0, -9.5, 0.0, 9.5, 19.0]) {
    for (const cz of [M2F_WALL_REAR_Z, M2F_WALL_FRONT_Z]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.3, M2F_CEILING_Y, 0.3), steelMat);
      col.position.set(cx, M2F_CEILING_Y / 2, cz);
      arch.add(col);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, roomD), steelMat);
    cross.position.set(cx, M2F_CEILING_Y, centerZ);
    arch.add(cross);
  }
  for (const cz of [M2F_WALL_REAR_Z, M2F_WALL_FRONT_Z]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.24, 0.24), steelMat);
    beam.position.set(0, M2F_CEILING_Y, cz);
    arch.add(beam);
  }

  // Rear Exterior Fresh-Air Wall (-10.5), Left Wall (-19.0), Low Front Viewing Curb + Extended Right-Side MSB Switchroom (X = +19.0..+31.0)!
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, M2F_CEILING_Y, 0.18), wallMat);
  rearWall.position.set(0, M2F_CEILING_Y / 2, M2F_WALL_REAR_Z);
  arch.add(rearWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, M2F_CEILING_Y, roomD), wallMat);
  leftWall.position.set(M2F_WALL_LEFT_X, M2F_CEILING_Y / 2, centerZ);
  arch.add(leftWall);
  const frontCurb = new THREE.Mesh(new THREE.BoxGeometry(roomW + 12.0, 0.24, 0.18), steelMat);
  frontCurb.position.set(6.0, 0.12, M2F_WALL_FRONT_Z);
  arch.add(frontCurb);

  // Overhead Steel Roof Beams extending cleanly over the Right-Side MSB Electrical Switchroom (X = +19.0 .. +31.0)
  for (const cz of [M2F_WALL_REAR_Z, M2F_WALL_FRONT_Z]) {
    const extBeam = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.24, 0.24), steelMat);
    extBeam.position.set(25.0, M2F_CEILING_Y, cz);
    arch.add(extBeam);
    const msbCol = new THREE.Mesh(new THREE.BoxGeometry(0.3, M2F_CEILING_Y, 0.3), steelMat);
    msbCol.position.set(31.0, M2F_CEILING_Y / 2, cz);
    arch.add(msbCol);
  }
  const msbCross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, roomD), steelMat);
  msbCross.position.set(31.0, M2F_CEILING_Y, centerZ);
  arch.add(msbCross);

  // True-Depth 3D Stairwell landing right in front of the B5 MSB Electrical Room Doorway (X = 12.25..17.75, Z = 6.95..9.45)!
  arch.add(build3DStaircase(15.0, 8.2, -Math.PI / 2, 2.2));

  // Full Building 5 M2F MSB Electrical Switchroom (X = +19.0 .. +31.0, partitioned from EXH bay with doorway + 2 facing rows of tall 2.4m AHU-height cabinets!)
  arch.add(buildMsbSwitchgearRoom(M2F_WALL_RIGHT_X, 31.0, M2F_WALL_REAR_Z, M2F_WALL_FRONT_Z, M2F_CEILING_Y, 'left'));

  return arch;
}

/**
 * Realistic 3D Cleanroom Architecture for Building 5 — 2nd Floor (`b5_2f`):
 *   - Color-coded glossy anti-static epoxy floor zones matching Scr_B5_2F_Overview.Pdl
 *   - Open perimeter (no surrounding exterior walls) for unobstructed 360° visibility inside all zones
 *   - Clean translucent internal zone partition walls separating major cleanroom zones
 *   - White structural cleanroom columns carrying live Room T/RH/DP sensors
 *   - Unlabeled symbolic semiconductor process tools + cleanroom bunny-suit operators
 *   - Suspended translucent cleanroom ceiling panel grid (Y = 3.85m) with bright white LED panels & HEPA diffusers
 *     physically separating the Cleanroom below from the DI/PCW/PV/EXH Overhead Utility Plenum above!
 */
function buildB52fCleanroomArchitecture(): THREE.Group {
  const arch = new THREE.Group();
  const wallGlass = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.3,
    roughness: 0.22,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const colWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
  const frameAlu = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.72 });
  const ledWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.95 });
  const hepaMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.6 });
  const laserGreenGlass = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    emissive: 0x15803d,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.52,
    roughness: 0.15,
  });
  const toolMetal = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.32, metalness: 0.42 });
  const toolDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.48, metalness: 0.5 });
  const hoistYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.4 });

  // 1. Color-Coded Glossy Anti-Static Epoxy Floor Zones matching Scr_B5_2F_Overview.Pdl!
  const zones: { x1: number; x2: number; z1: number; z2: number; color: number }[] = [
    // Top & Bottom Hallways
    { x1: -18, x2: 18, z1: -13, z2: -11.4, color: 0xcbd5e1 },
    { x1: -18, x2: 18, z1: 11.4, z2: 13, color: 0xcbd5e1 },
    // Gowning Room (Mint-Teal #99f6e4)
    { x1: -18, x2: 0, z1: -11.4, z2: -7.6, color: 0x99f6e4 },
    // KNN Etch Room (Soft Rose #fecaca)
    { x1: -18, x2: -9.2, z1: -7.6, z2: -1.6, color: 0xfecaca },
    // Pre Leak Fill Metro Room (Soft Indigo #c7d2fe)
    { x1: -9.2, x2: 0, z1: -7.6, z2: -1.6, color: 0xc7d2fe },
    // Leak Fill Room (Soft Sky Blue #bae6fd)
    { x1: -18, x2: 0, z1: -1.6, z2: 6.4, color: 0xbae6fd },
    // Network / Pantry / Rest (Clean Slate #e2e8f0)
    { x1: -18, x2: -9.0, z1: 6.4, z2: 11.4, color: 0xe2e8f0 },
    // Spare Parts Storeroom (Soft Amber #fde68a)
    { x1: -9.0, x2: 0, z1: 6.4, z2: 11.4, color: 0xfde68a },
    // Production Area 940 m² (Crisp Mint-Green #bbf7d0)
    { x1: 0, x2: 18, z1: -11.4, z2: 11.4, color: 0xbbf7d0 },
  ];

  for (const z of zones) {
    const zw = z.x2 - z.x1;
    const zd = z.z2 - z.z1;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(zw - 0.08, 0.08, zd - 0.08),
      new THREE.MeshStandardMaterial({ color: z.color, roughness: 0.22, metalness: 0.14 })
    );
    slab.position.set((z.x1 + z.x2) / 2, 0.04, (z.z1 + z.z2) / 2);
    slab.receiveShadow = true;
    arch.add(slab);
  }

  // 2. Internal Major Zone Partition Walls ONLY (Y = 0 .. 3.85m; outer perimeter walls removed for unobstructed 360° viewing!)
  const addPartition = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(isX ? len : 0.14, B52F_CEILING_Y, isX ? 0.14 : len),
      wallGlass
    );
    wall.position.set((x1 + x2) / 2, B52F_CEILING_Y / 2, (z1 + z2) / 2);
    arch.add(wall);
  };

  // Internal Zone Partition Walls (translucent cleanroom glass walls between zones!)
  addPartition(0, -11.4, 0, 11.4); // Major central divider between Left Cleanrooms & Production Area
  addPartition(-18, -7.6, 0, -7.6); // Gowning divider
  addPartition(-18, -1.6, 0, -1.6); // KNN/Metro <-> Leak Fill divider
  addPartition(-9.2, -7.6, -9.2, -1.6); // KNN <-> Pre Leak Fill Metro divider
  addPartition(-18, 6.4, 0, 6.4); // Leak Fill <-> Spare Parts/Pantry divider
  addPartition(-9.0, 6.4, -9.0, 11.4); // Pantry <-> Spare Parts divider

  // 3. White Structural Cleanroom Columns (including the exact columns holding live Room T/RH/DP sensors!)
  const columnCoords: [number, number][] = [
    [-6.0, -7.6], // AHU04 Gowning/Metro sensor column
    [-9.2, 1.8], // AHU01 KNN/Leak Fill sensor column
    [6.0, -2.5], // AHU02 Production sensor column 1
    [12.0, 4.2], // AHU02 Production sensor column 2
    [-4.5, 8.8], // AHU03 Spare Parts sensor column
    [6.0, 4.2],
    [12.0, -2.5],
    [6.0, -9.2],
    [12.0, -9.2],
    [0.0, -4.5],
    [0.0, 3.5],
  ];
  for (const [cx, cz] of columnCoords) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.46, B52F_CEILING_Y, 0.46), colWhite);
    col.position.set(cx, B52F_CEILING_Y / 2, cz);
    col.castShadow = true;
    arch.add(col);
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), frameAlu);
    colBase.position.set(cx, 0.08, cz);
    arch.add(colBase);
  }

  // 4. Symbolic Unlabeled Cleanroom Semiconductor Tools (matching Photo 1 — ZERO text tags!)
  const addLaserProcessTool = (tx: number, tz: number, rotY = 0) => {
    const tGrp = new THREE.Group();
    tGrp.position.set(tx, 0.08, tz);
    tGrp.rotation.y = rotY;
    // Lower white steel machine base cabinet
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.92, 1.55), toolMetal);
    base.position.y = 0.46;
    base.castShadow = true;
    tGrp.add(base);
    // Upper aluminum-framed enclosure with translucent GREEN laser-safety glass doors (Photo 1!)
    const upperFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.25, 1.48), toolMetal);
    upperFrame.position.y = 1.54;
    tGrp.add(upperFrame);
    const greenDoorF = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.96, 1.54), laserGreenGlass);
    greenDoorF.position.y = 1.48;
    tGrp.add(greenDoorF);
    // Operator HMI Pedestal with glowing blue screen
    const hmi = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.34, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 })
    );
    hmi.position.set(-1.32, 1.42, 0.85);
    tGrp.add(hmi);
    // 3-Tier Signal Tower Light (Green/Yellow/Red) on top of tool!
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), frameAlu);
    mast.position.set(0.95, 2.38, 0.55);
    tGrp.add(mast);
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.85 })
    );
    lamp.position.set(0.95, 2.68, 0.55);
    tGrp.add(lamp);
    arch.add(tGrp);
  };

  const addConveyorLine = (cx: number, cz: number, len = 3.2) => {
    const conv = new THREE.Group();
    conv.position.set(cx, 0.08, cz);
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.84, 1.12), toolMetal);
    body.position.y = 0.42;
    body.castShadow = true;
    conv.add(body);
    const track = new THREE.Mesh(new THREE.BoxGeometry(len - 0.15, 0.12, 0.82), toolDark);
    track.position.y = 0.88;
    conv.add(track);
    arch.add(conv);
  };

  // Production Area Lines (2 automated cleanroom semiconductor tool lines + roller conveyors + yellow mini hoist!)
  for (const px of [3.5, 9.0, 14.5]) {
    addLaserProcessTool(px, -6.2, 0);
    addLaserProcessTool(px, 1.0, Math.PI);
  }
  addConveyorLine(6.2, -6.2, 2.2);
  addConveyorLine(11.7, -6.2, 2.2);
  addConveyorLine(6.2, 1.0, 2.2);
  addConveyorLine(11.7, 1.0, 2.2);
  addConveyorLine(4.8, 7.6, 4.4);
  addConveyorLine(12.2, 7.6, 4.4);
  // Yellow mini-hoist jib post (exact Photo 1 detail!)
  const hoistPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.75, 0.18), frameAlu);
  hoistPost.position.set(8.5, 1.42, 7.2);
  arch.add(hoistPost);
  const hoistUnit = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.32), hoistYellow);
  hoistUnit.position.set(8.5, 2.48, 7.65);
  arch.add(hoistUnit);

  // Leak Fill, KNN Etch, Metro & Spare Parts symbolic cleanroom benches/racks
  for (const lx of [-14.8, -11.0, -4.5]) {
    addLaserProcessTool(lx, 3.2, 0);
  }
  addConveyorLine(-13.8, -4.8, 3.6); // KNN Etch wet bench
  addConveyorLine(-4.6, -4.8, 3.4); // Pre Leak Fill Metro optical table
  addConveyorLine(-11.0, -9.6, 4.2); // Gowning stainless bench
  // Spare Parts stainless shelving racks
  for (const sx of [-7.2, -2.5]) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.95, 0.9), frameAlu);
    rack.position.set(sx, 1.05, 9.6);
    arch.add(rack);
  }

  // 4B. CLEANROOM OPERATORS IN FULL WHITE BUNNY-SUITS WORKING AT THE TOOLS (exact match to Cleanroom operator photo!)
  const suitWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, metalness: 0.05 });
  const bootGrey = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
  const maskBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });
  const skinTone = new THREE.MeshStandardMaterial({ color: 0xf1c7a5, roughness: 0.65 });
  const gloveBlue = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.45 });
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });

  const addCleanroomOperator = (wx: number, wz: number, rotY: number, pose: 'work' | 'hmi' | 'clipboard') => {
    const op = new THREE.Group();
    op.position.set(wx, 0.08, wz);
    op.rotation.y = rotY;

    // 2 White Cleanroom Bunny-Suit Legs & ESD Boots
    for (const lx of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.78, 10), suitWhite);
      leg.position.set(lx, 0.45, 0);
      leg.castShadow = true;
      op.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), bootGrey);
      boot.position.set(lx, 0.05, 0.04);
      op.add(boot);
    }

    // Upper Torso (slight natural lean forward when working at conveyor/tool!)
    const upper = new THREE.Group();
    upper.position.set(0, 0.84, 0);
    upper.rotation.x = pose === 'work' ? 0.22 : 0.06;
    op.add(upper);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.54, 12), suitWhite);
    torso.position.y = 0.27;
    torso.castShadow = true;
    upper.add(torso);

    // Hooded Cleanroom Head + Visible Face Strip + Light-Blue Surgical Mask
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), suitWhite);
    hood.position.set(0, 0.68, 0.01);
    hood.castShadow = true;
    upper.add(hood);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.06), skinTone);
    face.position.set(0, 0.71, 0.13);
    upper.add(face);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.085, 0.07), maskBlue);
    mask.position.set(0, 0.635, 0.135);
    upper.add(mask);

    // Articulated Bunny-Suit Arms & Blue ESD Gloves
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
  };

  // Place 7 Cleanroom Bunny-Suit Operators — ALL mathematically facing straight INTO their tools/conveyors!
  const faceTool = (wx: number, wz: number, tx: number, tz: number) => Math.atan2(tx - wx, tz - wz);
  addCleanroomOperator(2.2, -4.65, faceTool(2.2, -4.65, 3.5, -6.2), 'hmi');
  addCleanroomOperator(9.0, -4.75, faceTool(9.0, -4.75, 9.0, -6.2), 'work');
  addCleanroomOperator(14.5, -4.65, faceTool(14.5, -4.65, 14.5, -6.2), 'clipboard');
  addCleanroomOperator(6.2, 2.35, faceTool(6.2, 2.35, 6.2, 1.0), 'work');
  addCleanroomOperator(12.2, 6.45, faceTool(12.2, 6.45, 12.2, 7.6), 'work');
  addCleanroomOperator(-11.0, 4.65, faceTool(-11.0, 4.65, -11.0, 3.2), 'hmi');
  addCleanroomOperator(-13.8, -3.65, faceTool(-13.8, -3.65, -13.8, -4.8), 'work');

  // 5. SUSPENDED CLEANROOM CEILING PANEL BARRIER (Y = 3.85m) WITH BRIGHT WHITE LED TROFFERS & HEPA DIFFUSERS!
  //    Clearly divides the bright Cleanroom below from the Overhead DI / PCW / PV / EXH Utility Plenum above!
  const ceilPanel = new THREE.Mesh(
    new THREE.BoxGeometry(B52F_HALF_X * 2, 0.08, B52F_HALF_Z * 2),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.34,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  ceilPanel.position.set(0, B52F_CEILING_Y, 0);
  arch.add(ceilPanel);

  // Crisp Cleanroom T-Bar Ceiling Grid Frame
  const ceilGrid = new THREE.GridHelper(36, 18, 0x94a3b8, 0xcbd5e1);
  ceilGrid.position.set(0, B52F_CEILING_Y - 0.045, 0);
  ceilGrid.scale.z = 26 / 36;
  arch.add(ceilGrid);

  // Glowing Cleanroom LED Troffer Light Panels + Silver HEPA/FFU Diffuser Grilles (Photos 1, 2 & 3!)
  for (let lx = -15; lx <= 15; lx += 5) {
    for (let lz = -10; lz <= 10; lz += 5) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.72), ledWhite);
      led.position.set(lx, B52F_CEILING_Y - 0.05, lz);
      arch.add(led);
      if (lx + 2.5 <= 16) {
        const hepa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 1.15), hepaMat);
        hepa.position.set(lx + 2.5, B52F_CEILING_Y - 0.05, lz);
        arch.add(hepa);
      }
    }
  }

  // 6. Upper Structural Steel Frame around the Overhead Utility Plenum (Y = 3.85m .. 6.1m)
  const plenumSteel = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  for (const px of [-18, 0, 18]) {
    for (const pz of [-13, 13]) {
      const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.26, B52F_PLENUM_TOP_Y - B52F_CEILING_Y, 0.26), plenumSteel);
      pCol.position.set(px, (B52F_CEILING_Y + B52F_PLENUM_TOP_Y) / 2, pz);
      arch.add(pCol);
    }
    const pBeamZ = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 26), plenumSteel);
    pBeamZ.position.set(px, B52F_PLENUM_TOP_Y, 0);
    arch.add(pBeamZ);
  }
  for (const pz of [-13, 13]) {
    const pBeamX = new THREE.Mesh(new THREE.BoxGeometry(36, 0.2, 0.2), plenumSteel);
    pBeamX.position.set(0, B52F_PLENUM_TOP_Y, pz);
    arch.add(pBeamX);
  }

  return arch;
}

/**
 * Procedural 3D Tropical Palm Tree & Lush Broadleaf Tree for Coherent NT1 Industrial Campus!
 */
function makeTreeMesh(isPalm: boolean, scale = 1): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c634a, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: isPalm ? 0x2f7d32 : 0x2b6e2f, roughness: 0.75 });
  const leafLight = new THREE.MeshStandardMaterial({ color: 0x4ca64c, roughness: 0.72 });

  if (isPalm) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.16 * scale, 3.2 * scale, 8), trunkMat);
    trunk.position.y = 1.6 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let fi = 0; fi < 7; fi++) {
      const ang = (fi / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 1.6 * scale, 4), fi % 2 === 0 ? leafMat : leafLight);
      frond.position.set(Math.cos(ang) * 0.68 * scale, 3.1 * scale, Math.sin(ang) * 0.68 * scale);
      frond.rotation.z = -Math.PI / 2.4;
      frond.rotation.y = -ang;
      tree.add(frond);
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, 1.6 * scale, 8), trunkMat);
    trunk.position.y = 0.8 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 * scale, 1), leafMat);
    crown1.position.y = 2.35 * scale;
    crown1.castShadow = true;
    tree.add(crown1);
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 * scale, 1), leafLight);
    crown2.position.set(0.45 * scale, 2.75 * scale, 0.25 * scale);
    tree.add(crown2);
  }
  return tree;
}

/**
 * Procedural 3D Traffic Vehicle (Sedan Car, Shuttle Bus, or 18-Wheeler Container Truck) facing +X in local space!
 */
function buildTrafficVehicleMesh(kind: 'sedan' | 'bus' | 'truck', bodyHex: number): THREE.Group {
  const v = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.32, metalness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.9 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.85 });

  const addWheel = (wx: number, wz: number, r = 0.22) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 12), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(wx, r, wz);
    v.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.15, 10), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(wx, r, wz);
    v.add(rim);
  };

  if (kind === 'sedan') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.46, 0.98), bodyMat);
    lower.position.y = 0.42;
    lower.castShadow = true;
    v.add(lower);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.38, 0.86), bodyMat);
    cabin.position.set(-0.08, 0.8, 0);
    v.add(cabin);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.28, 0.88), glassMat);
    wind.position.set(-0.08, 0.8, 0);
    v.add(wind);
    for (const wx of [-0.62, 0.62]) {
      for (const wz of [-0.46, 0.46]) addWheel(wx, wz, 0.2);
    }
    for (const lz of [-0.32, 0.32]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.18), headMat);
      hl.position.set(1.06, 0.44, lz);
      v.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.18), tailMat);
      tl.position.set(-1.06, 0.44, lz);
      v.add(tl);
    }
  } else if (kind === 'bus') {
    const coach = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.32, 1.24), bodyMat);
    coach.position.y = 0.96;
    coach.castShadow = true;
    v.add(coach);
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.48, 1.27), glassMat);
    winBand.position.set(0.05, 1.15, 0);
    v.add(winBand);
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.12), glassMat);
    frontGlass.position.set(2.1, 1.1, 0);
    v.add(frontGlass);
    for (const wx of [-1.25, 1.25]) {
      for (const wz of [-0.58, 0.58]) addWheel(wx, wz, 0.3);
    }
    for (const lz of [-0.4, 0.4]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), headMat);
      hl.position.set(2.11, 0.52, lz);
      v.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), tailMat);
      tl.position.set(-2.11, 0.52, lz);
      v.add(tl);
    }
  } else {
    // 18-Wheeler Logistics Container Truck (colored tractor cab + long white cargo container!)
    const containerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.18 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.32, 1.18), bodyMat);
    cab.position.set(2.05, 0.98, 0);
    cab.castShadow = true;
    v.add(cab);
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.08), glassMat);
    cabGlass.position.set(2.71, 1.22, 0);
    v.add(cabGlass);
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.56, 1.26), containerMat);
    trailer.position.set(-0.85, 1.18, 0);
    trailer.castShadow = true;
    v.add(trailer);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.98), tireMat);
    chassis.position.set(-0.2, 0.38, 0);
    v.add(chassis);
    for (const wx of [-2.35, -1.65, 1.45, 2.3]) {
      for (const wz of [-0.58, 0.58]) addWheel(wx, wz, 0.3);
    }
    for (const lz of [-0.4, 0.4]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), headMat);
      hl.position.set(2.74, 0.52, lz);
      v.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), tailMat);
      tl.position.set(-2.96, 0.52, lz);
      v.add(tl);
    }
  }

  return v;
}

/**
 * Full Architectural 3D Masterplan for COHERENT NT1 (Nhơn Trạch 1 — BW Industrial Park):
 *   - Green landscaped park grounds, concrete campus yard, 2 internal driveways + cross aisle
 *   - 3 Covered Motorcycle/Bike Parking Sheds in front of B3/B2/B1
 *   - 2 Navy-Blue & Grey Security Gatehouses + White Sliding Gates + Iconic White COHERENT Monument Signs!
 *   - 4-Lane Dual-Carriageway Main Boulevard (Đường Trần Phú) with landscaped median, red/white curbs, palm trees & streetlights
 *   - 2-Lane Left Side Road + Parked Logistics Trucks at Docks + 14 LIVE ANIMATED VEHICLES driving continuously!
 */
function buildCoherentSiteArchitecture(): { group: THREE.Group; vehicles: RuntimeVehicleRecord[] } {
  const group = new THREE.Group();
  const vehicles: RuntimeVehicleRecord[] = [];

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4f7d3e, roughness: 0.92 });
  const lawnBright = new THREE.MeshStandardMaterial({ color: 0x5c9145, roughness: 0.88 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.82 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc9b8b2, roughness: 0.86 }); // Pinkish-grey tiled Nhơn Trạch sidewalk!
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.88 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const roofWhite = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.38, metalness: 0.22 });
  const navyMat = new THREE.MeshStandardMaterial({ color: 0x16326b, roughness: 0.42, metalness: 0.25 });
  const guardGrey = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55 });
  const blueTrim = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.4 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.72 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.6 });
  const coherentSignMat = makeCoherentLogoMaterial('#f8fafc', '#0b3b8c');
  const bwSignMat = makeBwIndustrialLogoMaterial('#f8fafc');

  // 1. Lush Industrial Park Lawn Surroundings & Concrete Campus Pad (strictly staggered Y elevations — ZERO z-fighting!)
  const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(72, 0.04, 54), grassMat);
  parkLawn.position.set(0, 0.02, 0); // top Y = 0.04
  parkLawn.receiveShadow = true;
  group.add(parkLawn);

  const campusConcrete = new THREE.Mesh(new THREE.BoxGeometry(43.5, 0.06, 32.5), concreteMat);
  campusConcrete.position.set(0, 0.05, -2.5); // top Y = 0.08
  campusConcrete.receiveShadow = true;
  group.add(campusConcrete);

  // Internal Campus Asphalt Driveways (2 vertical aisles at X = -7, +7 & horizontal cross-lane at Z = -3.25)
  for (const ix of [-7.0, 7.0]) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 32.0), asphaltMat);
    lane.position.set(ix, 0.115, -1.6); // top Y = 0.135 (strictly above concrete 0.08 & lawn 0.105!)
    lane.receiveShadow = true;
    group.add(lane);
  }
  const crossLane = new THREE.Mesh(new THREE.BoxGeometry(41.0, 0.036, 2.8), asphaltMat);
  crossLane.position.set(0, 0.112, -3.25); // top Y = 0.130 (no coplanar fight with vertical lanes!)
  crossLane.receiveShadow = true;
  group.add(crossLane);

  // Overhead Steel Utility Pipe Bridge carrying Chilled Water from Building 5 (-Z) -> Building 2 (+Z) across cross-aisle!
  const bridgeSteel = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.72 });
  for (const bx of [-3.6, -1.6]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 3.6), bridgeSteel);
    beam.position.set(bx, 3.8, -3.25);
    group.add(beam);
    for (const bz of [-4.75, -1.75]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.8, 0.16), bridgeSteel);
      col.position.set(bx, 1.9, bz);
      group.add(col);
    }
  }
  for (const bz of [-4.1, -3.25, -2.4]) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.12), bridgeSteel);
    rung.position.set(-2.6, 3.8, bz);
    group.add(rung);
  }

  // =========================================================================
  // 1B. MINIATURE 3D OUTDOOR UTILITY SYSTEMS AT EXACT CAMPUS POSITIONS (Trial Preview!)
  //     1) B3 Air-Cooled Chiller + Pumps + Heat Fan Yard along LEFT (-X) side of B3 facing Road No. 2
  //     2) B5 Cooling Tower Deck (9× KingSun CTs) between B5 & B2, flush against B5 South (+Z) wall
  //     3) B2 Outdoor PCW Station between B2 & B5, flush against B2 North (-Z) wall
  //     4) B5 Outdoor PCW Station flush against RIGHT (+X) wall of B5!
  // =========================================================================
  const outdoorMini = new THREE.Group();
  const miniPadMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const miniTaupe = new THREE.MeshStandardMaterial({ color: 0x9c9284, roughness: 0.45 });
  const miniCream = new THREE.MeshStandardMaterial({ color: 0xe8e2d3, roughness: 0.4 });
  const miniPheBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.45 });
  const miniPumpTeal = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.35, metalness: 0.5 });
  const miniTankSilver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.65 });
  const miniCtWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const miniDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

  // (1) B3 Outdoor Air-Cooled Chiller & Heat Fan Yard — Left (-X) flank of Building 3 along Road No. 2 (X = -20.1, Z = -1.2..+9.2)
  const b3MiniPad = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 10.6), miniPadMat);
  b3MiniPad.position.set(-20.1, 0.14, 4.0);
  outdoorMini.add(b3MiniPad);
  // 2 Mini Air-Cooled Chillers (CH-21, CH-22 closest to Trần Phú +Z, lengthwise along Z!)
  for (const cz of [7.8, 5.4]) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 1.95), miniTaupe);
    ch.position.set(-20.0, 0.72, cz);
    ch.castShadow = true;
    outdoorMini.add(ch);
    const fanTop = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 12), miniDark);
    fanTop.position.set(-20.0, 1.28, cz);
    outdoorMini.add(fanTop);
  }
  // 4 Mini Pumps (CHWP + HPP in middle)
  for (const pz of [3.8, 3.1, 2.2, 1.5]) {
    const mp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.85, 10), miniPumpTeal);
    mp.position.set(-20.0, 0.62, pz);
    outdoorMini.add(mp);
  }
  // 3 Mini Cream Heat Fans (HP-01..03 farthest from Trần Phú)
  for (const hz of [0.3, -0.5, -1.3]) {
    const hp = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.95, 0.56), miniCream);
    hp.position.set(-20.0, 0.67, hz);
    hp.castShadow = true;
    outdoorMini.add(hp);
  }
  // Mini Grey B40 Fence along Road No. 2 edge of B3 yard
  const b3MiniFence = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.05, 10.6),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.55, roughness: 0.4 })
  );
  b3MiniFence.position.set(-21.1, 0.68, 4.0);
  outdoorMini.add(b3MiniFence);

  // (2) B5 Outdoor Cooling Tower Deck (9× KingSun CTs) — Between B5 & B2, flush against B5 South (+Z) Wall!
  const ctDeck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.14, 1.35), bridgeSteel);
  ctDeck.position.set(1.8, 1.35, -4.15);
  outdoorMini.add(ctDeck);
  for (const lx of [-1.1, 1.8, 4.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), bridgeSteel);
    leg.position.set(lx, 0.68, -4.15);
    outdoorMini.add(leg);
  }
  for (let ci = 0; ci < 9; ci++) {
    const cx = -0.95 + ci * 0.68;
    const ctBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.88), miniCtWhite);
    ctBox.position.set(cx, 1.78, -4.15);
    ctBox.castShadow = true;
    outdoorMini.add(ctBox);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10), miniDark);
    stack.position.set(cx, 2.22, -4.15);
    outdoorMini.add(stack);
  }

  // (3) B2 Outdoor PCW Station — Between B2 & B5, flush against B2 North (-Z) Wall!
  const b2PcwPad = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 1.35), miniPadMat);
  b2PcwPad.position.set(1.0, 0.14, -2.25);
  outdoorMini.add(b2PcwPad);
  for (const ex of [-1.7, -0.9]) {
    const phe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.65), miniPheBlue);
    phe.position.set(ex, 0.62, -2.25);
    outdoorMini.add(phe);
  }
  for (const px of [0.1, 0.65, 1.2, 1.75]) {
    const pmp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.75, 10), miniPumpTeal);
    pmp.position.set(px, 0.56, -2.45);
    outdoorMini.add(pmp);
  }
  for (const tx of [2.75, 3.6]) {
    const tnk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.05, 12), miniTankSilver);
    tnk.position.set(tx, 0.72, -2.25);
    outdoorMini.add(tnk);
  }

  // (4) B5 Outdoor PCW Station — Flush against RIGHT (+X) Wall of Building 5 (X = +5.95, Z = -13.5 .. -7.5)!
  const b5PcwPad = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 6.2), miniPadMat);
  b5PcwPad.position.set(5.95, 0.14, -10.5);
  outdoorMini.add(b5PcwPad);
  for (const ez of [-12.6, -11.6]) {
    const phe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.55), miniPheBlue);
    phe.position.set(5.95, 0.62, ez);
    outdoorMini.add(phe);
  }
  for (const pz of [-10.5, -9.85, -9.2]) {
    const pmp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.75, 10), miniPumpTeal);
    pmp.position.set(6.15, 0.56, pz);
    outdoorMini.add(pmp);
  }
  for (const tz of [-8.25, -7.4]) {
    const tnk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.05, 12), miniTankSilver);
    tnk.position.set(5.95, 0.72, tz);
    outdoorMini.add(tnk);
  }
  group.add(outdoorMini);

  // Front Tiled Pedestrian Sidewalk + 3 SEPARATE Front Lawn Islands (strictly clear of X=-7 & X=+7 asphalt driveways -> ZERO z-fighting!)
  const frontSidewalk = new THREE.Mesh(new THREE.BoxGeometry(48.0, 0.08, 2.4), sidewalkMat);
  frontSidewalk.position.set(0, 0.065, 14.95); // top Y = 0.105
  frontSidewalk.receiveShadow = true;
  group.add(frontSidewalk);
  for (const [lx1, lx2] of [
    [-21.4, -8.8],
    [-5.2, 5.2],
    [8.8, 21.4],
  ]) {
    const island = new THREE.Mesh(new THREE.BoxGeometry(lx2 - lx1, 0.05, 3.0), lawnBright);
    island.position.set((lx1 + lx2) / 2, 0.082, 11.8); // top Y = 0.107, strictly outside driveways!
    island.receiveShadow = true;
    group.add(island);
  }

  // 2. 3 Covered Motorcycle / Bike Parking Sheds in Front of B3, B2, B1 (exact match to Images 1, 2, 3, 7!)
  for (const sx of [-14.0, 0.0, 14.0]) {
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 2.1), roofWhite);
    shedRoof.position.set(sx, 1.55, 11.7);
    shedRoof.castShadow = true;
    group.add(shedRoof);
    const shedTrim = new THREE.Mesh(new THREE.BoxGeometry(9.26, 0.1, 2.16), blueTrim);
    shedTrim.position.set(sx, 1.62, 11.7);
    group.add(shedTrim);
    for (const px of [-4.2, -1.4, 1.4, 4.2]) {
      for (const pz of [-0.85, 0.85]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 8), guardGrey);
        post.position.set(sx + px, 0.78, 11.7 + pz);
        group.add(post);
      }
    }
  }

  // 3. COMPLETE 4-SIDED GALVANIZED GREY B40 WELDED WIRE-MESH PERIMETER FENCE SURROUNDING ALL 6 BUILDINGS!
  //    Encloses X = -21.75 .. +21.75 and Z = -18.75 .. +13.75 with authentic B40 mesh panels, concrete curb & steel posts!
  const b40Canvas = document.createElement('canvas');
  b40Canvas.width = 64;
  b40Canvas.height = 64;
  const bctx = b40Canvas.getContext('2d');
  if (bctx) {
    bctx.clearRect(0, 0, 64, 64);
    bctx.strokeStyle = '#cbd5e1';
    bctx.lineWidth = 4;
    for (let gx = 0; gx <= 64; gx += 16) {
      bctx.beginPath();
      bctx.moveTo(gx, 0);
      bctx.lineTo(gx, 64);
      bctx.stroke();
    }
    for (let gy = 0; gy <= 64; gy += 16) {
      bctx.beginPath();
      bctx.moveTo(0, gy);
      bctx.lineTo(64, gy);
      bctx.stroke();
    }
  }
  const b40PostMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38, metalness: 0.62 });
  const addSiteB40FenceRun = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const isX = Math.abs(dx) >= Math.abs(dz);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const meshH = 1.02;

    // Low grey concrete fence curb
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(isX ? len : 0.16, 0.28, isX ? 0.16 : len),
      guardGrey
    );
    curb.position.set(cx, 0.2, cz);
    group.add(curb);

    // Repeating B40 wire-mesh alpha screen scaled accurately to run length
    const tex = new THREE.CanvasTexture(b40Canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(4, Math.round(len * 2.4)), 3);
    const meshMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.42,
      metalness: 0.65,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(len, meshH), meshMat);
    if (!isX) screen.rotation.y = Math.PI / 2;
    screen.position.set(cx, 0.34 + meshH / 2, cz);
    group.add(screen);

    // Top & mid horizontal galvanized rails
    for (const ry of [0.85, 1.35]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(isX ? len : 0.045, 0.04, isX ? 0.045 : len),
        b40PostMat
      );
      rail.position.set(cx, ry, cz);
      group.add(rail);
    }

    // Galvanized steel fence posts every 2.0m along the run
    const count = Math.max(2, Math.round(len / 2.0));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.24, 0.065), b40PostMat);
      post.position.set(x1 + dx * t, 0.74, z1 + dz * t);
      group.add(post);
    }
  };

  // Front B40 perimeter (leaving openings for both Retractable Scissor-Lattice Entrance Gates at X = ±7.0)
  addSiteB40FenceRun(-21.75, 13.75, -8.85, 13.75);
  addSiteB40FenceRun(-5.15, 13.75, 5.15, 13.75);
  addSiteB40FenceRun(8.85, 13.75, 21.75, 13.75);
  // Left B40 perimeter along Road No. 2 (Đường Số 2)
  addSiteB40FenceRun(-21.75, -18.75, -21.75, 13.75);
  // Rear B40 perimeter behind Buildings 4, 5, 6
  addSiteB40FenceRun(-21.75, -18.75, 21.75, -18.75);
  // Right B40 perimeter along Buildings 1 & 6
  addSiteB40FenceRun(21.75, -18.75, 21.75, 13.75);

  // Helper: Dark-Bronze/Charcoal Retractable Accordion Scissor-Lattice Entrance Gate ("Cổng xếp" — faithful to uploaded Photo 7!)
  const gateDarkMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 0.42, metalness: 0.55 });
  const gateAmberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
  const addRetractableScissorGate = (cx: number, cz: number, gateW = 3.6) => {
    const gate = new THREE.Group();
    gate.position.set(cx, 0.12, cz);
    const gateH = 1.08;
    const bays = 7;
    const bayW = gateW / bays;
    const diagLen = Math.hypot(bayW, gateH * 0.86);
    const diagAng = Math.atan2(gateH * 0.86, bayW);

    for (let bi = 0; bi <= bays; bi++) {
      const px = -gateW / 2 + bi * bayW;
      // Vertical stanchion post + bottom yellow wheel & amber cap on main pillars
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.065, gateH, 0.09), gateDarkMat);
      post.position.set(px, gateH / 2 + 0.08, 0);
      gate.add(post);
      if (bi === 0 || bi === bays || bi % 2 === 0) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.24), gateDarkMat);
        foot.position.set(px, 0.09, 0);
        gate.add(foot);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), gateAmberMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(px, 0.055, 0.11);
        gate.add(wheel);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.09), gateAmberMat);
        cap.position.set(px, gateH + 0.1, 0);
        gate.add(cap);
      }
      // Criss-cross X-lattice scissor bars between posts
      if (bi < bays) {
        const mx = px + bayW / 2;
        for (const sign of [-1, 1]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.045, 0.04), gateDarkMat);
          bar.position.set(mx, gateH / 2 + 0.08, sign * 0.02);
          bar.rotation.z = sign * diagAng;
          gate.add(bar);
        }
      }
    }
    group.add(gate);
  };

  for (const gx of [-7.0, 7.0]) {
    // Authentic Retractable Scissor-Lattice Entrance Gate (replacing old solid grey slab!)
    addRetractableScissorGate(gx, 13.75, 3.6);

    // Authentic Coherent NT1 Security Gatehouse (Grey lower + Deep Navy middle stripe + Light Grey parapet + COHERENT logo!)
    const ghX = gx + 2.55;
    const ghBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 1.9), guardGrey);
    ghBase.position.set(ghX, 0.38, 13.45);
    ghBase.castShadow = true;
    group.add(ghBase);
    const ghMid = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.68, 1.92), navyMat);
    ghMid.position.set(ghX, 1.02, 13.45);
    group.add(ghMid);
    const ghRoof = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.28, 2.35), roofWhite);
    ghRoof.position.set(ghX, 1.5, 13.45);
    ghRoof.castShadow = true;
    group.add(ghRoof);
    const ghSign = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.42), coherentSignMat);
    ghSign.position.set(ghX, 1.52, 14.64);
    group.add(ghSign);
  }

  // ENTRANCE MONUMENT SIGNS:
  //   - Left-Center (mx = -3.2): COHERENT Monument Sign (right Coherent sign removed as requested!)
  //   - Front-Left Red-Box Position (mx = -12.8): BW INDUSTRIAL Monument Sign!
  for (const [mx, mat] of [
    [-3.2, coherentSignMat],
    [-12.8, bwSignMat],
  ] as const) {
    const monPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.18, 0.42), guardGrey);
    monPlinth.position.set(mx, 0.15, 14.55);
    group.add(monPlinth);
    const monSlab = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.18, 0.24), roofWhite);
    monSlab.position.set(mx, 0.8, 14.55);
    monSlab.castShadow = true;
    group.add(monSlab);
    const monFront = new THREE.Mesh(new THREE.PlaneGeometry(3.82, 0.98), mat);
    monFront.position.set(mx, 0.8, 14.68);
    group.add(monFront);
    const monBack = new THREE.Mesh(new THREE.PlaneGeometry(3.82, 0.98), mat);
    monBack.rotation.y = Math.PI;
    monBack.position.set(mx, 0.8, 14.42);
    group.add(monBack);
  }

  // 4. DUAL-CARRIAGEWAY MAIN BOULEVARD (ĐƯỜNG TRẦN PHÚ: Z = +16.2 .. +25.0) & LEFT SIDE ROAD (X = -26.8 .. -22.0)
  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(72.0, 0.08, 8.8), asphaltMat);
  mainRoad.position.set(0, 0.06, 20.6);
  mainRoad.receiveShadow = true;
  group.add(mainRoad);

  // Entrance driveway aprons tying the 2 gates into the Main Boulevard
  for (const gx of [-7.0, 7.0]) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.07, 2.8), asphaltMat);
    apron.position.set(gx, 0.075, 15.0);
    group.add(apron);
  }

  // Central Landscaped Green Median Strip on Main Boulevard (Z = +20.6) with Red/White Curbs (Image 6!)
  const medianLawn = new THREE.Mesh(new THREE.BoxGeometry(72.0, 0.16, 1.1), lawnBright);
  medianLawn.position.set(0, 0.12, 20.6);
  group.add(medianLawn);
  const redCurbMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });
  const whiteCurbMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  for (let cx = -34; cx <= 34; cx += 2.0) {
    const mat = Math.abs(Math.round(cx / 2)) % 2 === 0 ? redCurbMat : whiteCurbMat;
    for (const cz of [20.02, 21.18]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.18, 0.1), mat);
      curb.position.set(cx, 0.13, cz);
      group.add(curb);
    }
  }
  // White dashed lane dividers on all 4 boulevard lanes
  for (const dz of [18.35, 22.85]) {
    for (let dx = -34; dx <= 34; dx += 3.6) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.12), dashMat);
      dash.position.set(dx, 0.11, dz);
      group.add(dash);
    }
  }

  // Left Side Industrial Road (X = -24.5, Z = -27 .. +16.2) intersecting Main Boulevard!
  const sideRoad = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 43.4), asphaltMat);
  sideRoad.position.set(-24.5, 0.06, -5.4);
  sideRoad.receiveShadow = true;
  group.add(sideRoad);
  for (let dz = -25; dz <= 14; dz += 3.6) {
    const sDash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.7), dashMat);
    sDash.position.set(-24.5, 0.11, dz);
    group.add(sDash);
  }

  // 5. Tropical Palm Trees, Shade Trees & Twin-Arm Boulevard Streetlights!
  // Front sidewalk palms & shade trees
  for (const tx of [-19.5, -14.5, -10.5, -1.2, 1.2, 11.2, 16.0, 20.5]) {
    const t = makeTreeMesh(Math.abs(tx) < 12, 0.92);
    t.position.set(tx, 0.08, 15.35);
    group.add(t);
  }
  // Boulevard median palms + twin-arm streetlights
  for (let mx = -30; mx <= 30; mx += 10) {
    const palm = makeTreeMesh(true, 0.95);
    palm.position.set(mx, 0.16, 20.6);
    group.add(palm);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.4, 8), poleMat);
    pole.position.set(mx + 5, 2.3, 20.6);
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), poleMat);
    arm.position.set(mx + 5, 4.45, 20.6);
    group.add(arm);
    for (const lz of [19.8, 21.4]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.18), lampGlow);
      lamp.position.set(mx + 5, 4.4, lz);
      group.add(lamp);
    }
  }
  // Perimeter shade trees along Left Side Road & Right Green Belt
  for (let tz = -22; tz <= 12; tz += 6.8) {
    const tL = makeTreeMesh(false, 0.95);
    tL.position.set(-28.4, 0.04, tz);
    group.add(tL);
    const tR = makeTreeMesh(false, 1.0);
    tR.position.set(24.5, 0.04, tz);
    group.add(tR);
  }

  // 6. 14 LIVE ANIMATED VEHICLES (Sedans, Shuttle Buses & Container Trucks) CRUISING ON THE OUTER ROADS!! (Campus interior kept clear of parked trucks!)
  const trafficSpecs: {
    kind: 'sedan' | 'bus' | 'truck';
    color: number;
    axis: 'x' | 'z';
    dir: 1 | -1;
    lane: number;
    startPos: number;
    speed: number;
  }[] = [
    // Main Boulevard — Inner Westbound Lanes (-X: Z = 17.45 & Z = 19.2)
    { kind: 'sedan', color: 0xf8fafc, axis: 'x', dir: -1, lane: 17.45, startPos: 26, speed: 9.5 },
    { kind: 'sedan', color: 0x1d4ed8, axis: 'x', dir: -1, lane: 17.45, startPos: -6, speed: 10.2 },
    { kind: 'bus', color: 0xfacc15, axis: 'x', dir: -1, lane: 19.2, startPos: 12, speed: 7.4 },
    { kind: 'truck', color: 0x0f172a, axis: 'x', dir: -1, lane: 19.2, startPos: -22, speed: 6.5 },
    { kind: 'sedan', color: 0xdc2626, axis: 'x', dir: -1, lane: 17.45, startPos: -28, speed: 11.0 },
    // Main Boulevard — Outer Eastbound Lanes (+X: Z = 22.0 & Z = 23.75)
    { kind: 'sedan', color: 0x94a3b8, axis: 'x', dir: 1, lane: 22.0, startPos: -26, speed: 10.4 },
    { kind: 'sedan', color: 0x0ea5e9, axis: 'x', dir: 1, lane: 22.0, startPos: 8, speed: 9.2 },
    { kind: 'bus', color: 0x38bdf8, axis: 'x', dir: 1, lane: 23.75, startPos: -14, speed: 7.6 },
    { kind: 'truck', color: 0x1e3a8a, axis: 'x', dir: 1, lane: 23.75, startPos: 16, speed: 6.4 },
    { kind: 'sedan', color: 0xf1f5f9, axis: 'x', dir: 1, lane: 22.0, startPos: 30, speed: 9.8 },
    // Left Side Industrial Road (2-Way: X = -25.65 Southbound +Z & X = -23.35 Northbound -Z)
    { kind: 'sedan', color: 0xe2e8f0, axis: 'z', dir: 1, lane: -25.65, startPos: -18, speed: 7.8 },
    { kind: 'truck', color: 0x334155, axis: 'z', dir: 1, lane: -25.65, startPos: 2, speed: 5.8 },
    { kind: 'sedan', color: 0x2563eb, axis: 'z', dir: -1, lane: -23.35, startPos: 10, speed: 8.4 },
    { kind: 'bus', color: 0xf59e0b, axis: 'z', dir: -1, lane: -23.35, startPos: -10, speed: 6.8 },
  ];

  for (const sp of trafficSpecs) {
    const mesh = buildTrafficVehicleMesh(sp.kind, sp.color);
    mesh.scale.setScalar(0.78);
    if (sp.axis === 'x') {
      mesh.position.set(sp.startPos, 0.1, sp.lane);
      mesh.rotation.y = sp.dir === 1 ? 0 : Math.PI;
      vehicles.push({ mesh, axis: 'x', dir: sp.dir, speed: sp.speed, minPos: -35, maxPos: 35 });
    } else {
      mesh.position.set(sp.lane, 0.1, sp.startPos);
      mesh.rotation.y = sp.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      vehicles.push({ mesh, axis: 'z', dir: sp.dir, speed: sp.speed, minPos: -25.5, maxPos: 15.5 });
    }
    group.add(mesh);
  }

  return { group, vehicles };
}

function buildPipeMeshFromPoints(
  coords: [number, number, number][],
  fluid: keyof typeof FLUID_COLORS,
  flowSourceTags: string[],
  requireAllTags: string[] | undefined,
  pipeRadius: number,
  particleCount: number,
  idx: number
): RuntimePipeRecord {
  const points = coords.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const group = new THREE.Group();
  const fluidCfg = FLUID_COLORS[fluid];
  const pipeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fluidCfg.pipe),
    roughness: 0.35,
    metalness: 0.52,
  });

  const cumLengths: number[] = [0];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = a.distanceTo(b);
    totalLength += segLen;
    cumLengths.push(totalLength);
    if (segLen < 0.02) continue;

    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, segLen, 10), pipeMat);
    cyl.position.copy(a).add(b).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(cyl);

    const joint = new THREE.Mesh(new THREE.SphereGeometry(pipeRadius * 1.16, 10, 10), pipeMat);
    joint.position.copy(b);
    group.add(joint);
  }

  // Flow particles 35% LARGER than pipe radius so they stay crisp & visible above the pipe surface!
  const particleRadius = pipeRadius * 1.35;
  const particleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fluidCfg.particle),
    emissive: new THREE.Color(fluidCfg.particle),
    emissiveIntensity: 0.9,
    roughness: 0.15,
  });
  const particles: THREE.Mesh[] = [];
  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(particleRadius, 10, 10), particleMat);
    p.position.copy(points[0]);
    group.add(p);
    particles.push(p);
  }

  return {
    flowSourceTags,
    requireAllTags,
    group,
    points,
    cumLengths,
    totalLength: Math.max(totalLength, 0.1),
    particles,
    phaseOffset: (idx * 0.19) % 1,
  };
}

function createGenericPipeRecord(
  link: Pipe3DLink,
  fromNode: Equipment3DNode,
  toNode: Equipment3DNode,
  overrides: Record<string, NodeTransformOverride>,
  idx: number
): RuntimePipeRecord {
  const fromT = resolveNodeTransform(fromNode, overrides);
  const toT = resolveNodeTransform(toNode, overrides);
  const coords = computeOrthogonalPipePath(
    { x: fromT.x, y: fromT.y, z: fromT.z, h: fromNode.size[1] },
    { x: toT.x, y: toT.y, z: toT.z, h: toNode.size[1] },
    link.elevationY
  );
  const r = link.zone === 'site' ? 0.16 : 0.11;
  return buildPipeMeshFromPoints(coords, link.fluid, [link.flowSourceTag], undefined, r, link.zone === 'site' ? 6 : 4, idx);
}

function createDetailedPipeRecord(spec: DetailedPipe3D, idx: number): RuntimePipeRecord {
  return buildPipeMeshFromPoints(
    spec.points,
    spec.fluid,
    spec.flowSourceTags,
    spec.requireAllTags,
    spec.radius ?? 0.11,
    spec.particleCount ?? 4,
    idx
  );
}

/**
 * Renders HUGE, BOXY GALVANIZED SHEET-METAL RECTANGULAR HVAC DUCTWORK (matching real AHU Supply/Return/Fresh Air ducts!)
 * with bolted TDF flange collars every ~1.2m, square 90° mitered elbows, optional tapered transition boot, and live airflow pulses!
 */
function createDetailedDuctRecord(spec: DetailedDuct3D, idx: number): RuntimePipeRecord {
  const points = spec.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const group = new THREE.Group();

  const ductHex =
    spec.kind === 'supply'
      ? 0xc8d4e3
      : spec.kind === 'return'
      ? 0x9aa8ba
      : spec.kind === 'exhaust'
      ? 0xbba4a4
      : 0xb8d4c8;
  const edgeHex =
    spec.kind === 'supply'
      ? 0x38bdf8
      : spec.kind === 'return'
      ? 0xf59e0b
      : spec.kind === 'exhaust'
      ? 0xf97316
      : 0x34d399;
  const pulseHex =
    spec.kind === 'supply'
      ? 0x38bdf8
      : spec.kind === 'return'
      ? 0xfbbf24
      : spec.kind === 'exhaust'
      ? 0xfb923c
      : 0x4ade80;

  const ductMat = new THREE.MeshStandardMaterial({
    color: ductHex,
    roughness: 0.34,
    metalness: 0.68,
    transparent: true,
    opacity: 0.78,
  });
  const flangeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.78,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: edgeHex, transparent: true, opacity: 0.7 });

  const cumLengths: number[] = [0];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = a.distanceTo(b);
    totalLength += segLen;
    cumLengths.push(totalLength);
    if (spec.particlesOnly || segLen < 0.04) continue;

    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const dz = Math.abs(b.z - a.z);
    const axis: 'x' | 'y' | 'z' = dx >= dy && dx >= dz ? 'x' : dy >= dx && dy >= dz ? 'y' : 'z';

    // Trim segment ends cleanly at interior 90° bends so straight runs meet flush against the exact-size mitered corner box!
    const halfAlong = axis === 'y' ? spec.height / 2 : spec.width / 2;
    const trimStart = i > 0 ? Math.min(halfAlong, segLen * 0.45) : 0;
    const trimEnd = i < points.length - 2 ? Math.min(halfAlong, segLen * 0.45) : 0;
    const visLen = segLen - trimStart - trimEnd;

    if (visLen > 0.02) {
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const visA = a.clone().addScaledVector(dir, trimStart);
      const visB = b.clone().addScaledVector(dir, -trimEnd);

      const boxW = axis === 'x' ? visLen : spec.width;
      const boxH = axis === 'y' ? visLen : spec.height;
      const boxD = axis === 'z' ? visLen : spec.width;

      const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
      const segMesh = new THREE.Mesh(boxGeo, ductMat);
      segMesh.position.copy(visA).add(visB).multiplyScalar(0.5);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      group.add(segMesh);

      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
      wire.position.copy(segMesh.position);
      group.add(wire);

      // Bolted Galvanized TDF Flange Seam Ribs every ~1.25m along the trimmed straight run!
      const flangeCount = Math.max(1, Math.floor(visLen / 1.25));
      for (let fi = 1; fi <= flangeCount; fi++) {
        const t = fi / (flangeCount + 1);
        const pos = new THREE.Vector3().lerpVectors(visA, visB, t);
        const fGeo =
          axis === 'x'
            ? new THREE.BoxGeometry(0.05, spec.height + 0.08, spec.width + 0.08)
            : axis === 'y'
            ? new THREE.BoxGeometry(spec.width + 0.08, 0.05, spec.width + 0.08)
            : new THREE.BoxGeometry(spec.width + 0.08, spec.height + 0.08, 0.05);
        const fl = new THREE.Mesh(fGeo, flangeMat);
        fl.position.copy(pos);
        group.add(fl);
      }
    }

    // Exact Flush 90° Mitered Duct Elbow at interior bends (identical cross-section & material — ZERO offset or overhang!)
    if (i < points.length - 2) {
      const elbowGeo = new THREE.BoxGeometry(spec.width, spec.height, spec.width);
      const elbow = new THREE.Mesh(elbowGeo, ductMat);
      elbow.position.copy(b);
      elbow.castShadow = true;
      elbow.receiveShadow = true;
      group.add(elbow);

      const elbowWire = new THREE.LineSegments(new THREE.EdgesGeometry(elbowGeo), edgeMat);
      elbowWire.position.copy(b);
      group.add(elbowWire);
    }
  }

  // Tapered Galvanized Transition Boot at final endpoint (e.g., Return Air drop flaring neatly onto top of Daikin AHU!)
  if (spec.taperEnd && points.length >= 2) {
    const endPt = points[points.length - 1];
    const boot = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.width * 0.72, spec.width * 0.92, 0.55, 4),
      flangeMat
    );
    boot.rotation.y = Math.PI / 4;
    boot.position.set(endPt.x, endPt.y + 0.28, endPt.z);
    group.add(boot);
  }

  // Glowing Airflow Pulses gliding cleanly along the duct centerline (smaller crisp cool-air droplets for particlesOnly jets!)
  const pulseMat = new THREE.MeshStandardMaterial({
    color: pulseHex,
    emissive: pulseHex,
    emissiveIntensity: spec.particlesOnly ? 1.15 : 0.95,
    transparent: spec.particlesOnly ? true : false,
    opacity: spec.particlesOnly ? 0.85 : 1.0,
    roughness: 0.15,
  });
  const orbRadius = spec.particlesOnly ? 0.13 : 0.22;
  const particles: THREE.Mesh[] = [];
  const pCount = spec.particleCount ?? 5;
  for (let i = 0; i < pCount; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(orbRadius, 12, 12), pulseMat);
    orb.position.copy(points[0]);
    group.add(orb);
    particles.push(orb);
  }

  return {
    flowSourceTags: spec.flowSourceTags,
    group,
    points,
    cumLengths,
    totalLength: Math.max(totalLength, 0.1),
    particles,
    phaseOffset: (idx * 0.23) % 1,
  };
}

function createInlineValveMesh(v: InlineValve3D): { group: THREE.Group; rec: RuntimeValveRecord } {
  const group = new THREE.Group();
  group.position.set(...v.pos);

  // Live SCADA Status Indicator materials (green=open, grey=closed, red=fault)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.4, roughness: 0.28, metalness: 0.35 });
  const actuatorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x22c55e, emissiveIntensity: 0.3, roughness: 0.3 });

  const inferredStyle =
    v.valveStyle ??
    (v.tag.includes('TCV') || v.tag.includes('PCV')
      ? 'control'
      : v.tag.includes('_XV')
      ? 'xv'
      : 'actuator');

  const valveCore = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.82 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });

  if (inferredStyle === 'control') {
    // JOHNSON CONTROLS VPMA LINEAR CONTROL VALVE (TCV / PCV — Bright Cyan Flanged Body + Twin Yoke + Grey/Blue Actuator!)
    const jcCyan = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.32, metalness: 0.35 });
    const jcGrey = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.35 });
    const jcBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.25 });

    // Inline flanged cyan globe body (along local Y)
    const bodyCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.44, 16), jcCyan);
    valveCore.add(bodyCyl);
    for (const fy of [-0.22, 0.22]) {
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.055, 16), jcCyan);
      fl.position.y = fy;
      valveCore.add(fl);
    }
    // Lower cyan pressure bonnet + twin chrome yoke columns + black spring bellows extending out along +X
    const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 14), jcCyan);
    bonnet.rotation.z = Math.PI / 2;
    bonnet.position.set(0.2, 0, 0);
    valveCore.add(bonnet);
    for (const yz of [-0.08, 0.08]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), chromeMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0.42, 0, yz);
      valveCore.add(rod);
    }
    const bellows = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), darkMat);
    bellows.rotation.z = Math.PI / 2;
    bellows.position.set(0.48, 0, 0);
    valveCore.add(bellows);
    // Grey & Bright-Blue Johnson Controls Actuator Head
    const headBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.24), jcGrey);
    headBase.position.set(0.64, 0, 0);
    valveCore.add(headBase);
    const headTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.22), jcBlue);
    headTop.position.set(0.75, 0, 0);
    valveCore.add(headTop);
    // Status LED Collar
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 16), bodyMat);
    ledRing.rotation.x = Math.PI / 2;
    valveCore.add(ledRing);
  } else if (inferredStyle === 'xv') {
    // JOHNSON CONTROLS BRASS BALL VALVE + GREY/BLUE ROTARY ACTUATOR (XV — Brass Hex Body + Grey Box + Blue Cap!)
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.28, metalness: 0.78 });
    const jcGrey = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.3 });
    const jcBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.25 });

    // Hex brass ball valve body
    const hexBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 6), brassMat);
    valveCore.add(hexBody);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10), brassMat);
    neck.rotation.z = Math.PI / 2;
    neck.position.set(0.2, 0, 0);
    valveCore.add(neck);
    // Grey rotary actuator box + bright-blue label cap + black manual handle
    const greyBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.24), jcGrey);
    greyBox.position.set(0.38, 0.04, 0);
    valveCore.add(greyBox);
    const blueCap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.25), jcBlue);
    blueCap.position.set(0.48, 0.09, 0);
    valveCore.add(blueCap);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.07), darkMat);
    lever.position.set(0.54, -0.05, 0);
    valveCore.add(lever);
    // Status LED ring
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.026, 8, 16), bodyMat);
    ledRing.rotation.x = Math.PI / 2;
    valveCore.add(ledRing);
  } else {
    // VTM INDUSTRIAL ELECTRIC ACTUATOR (CHV / CDV / BPMV / HBPMV / CT IV & OV — Navy-Blue Housing + Black Side Handwheel!)
    const vtmNavy = new THREE.MeshStandardMaterial({ color: 0x234268, roughness: 0.4, metalness: 0.52 });
    const labelWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });

    // Inline flanged butterfly wafer body + live status collar ring
    const wafer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 16), darkMat);
    valveCore.add(wafer);
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.032, 8, 18), bodyMat);
    ledRing.rotation.x = Math.PI / 2;
    valveCore.add(ledRing);
    // Neck + VTM Navy-Blue Cylindrical Actuator Body
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), darkMat);
    stem.rotation.z = Math.PI / 2;
    stem.position.set(0.2, 0, 0);
    valveCore.add(stem);
    const vtmBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.28), vtmNavy);
    vtmBase.position.set(0.35, 0, 0);
    valveCore.add(vtmBase);
    const vtmDom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.34, 18), vtmNavy);
    vtmDom.rotation.z = Math.PI / 2;
    vtmDom.position.set(0.56, 0, 0);
    valveCore.add(vtmDom);
    // White warning sticker plate on VTM body
    const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), labelWhite);
    sticker.position.set(0.56, 0, 0.165);
    valveCore.add(sticker);
    // Signature Black Side Handwheel (Torus + cross spokes!)
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 16), darkMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0.36, -0.22, 0);
    valveCore.add(wheel);
    const wheelSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.03), darkMat);
    wheelSpoke.position.set(0.36, -0.22, 0);
    valveCore.add(wheelSpoke);
    // Status beacon dot on VTM actuator cap
    const statusDot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), actuatorMat);
    statusDot.rotation.z = Math.PI / 2;
    statusDot.position.set(0.74, 0, 0);
    valveCore.add(statusDot);
  }

  if (v.orientation === 'horizontal_z') {
    // Pipe bore (local Y) -> world +Z; Actuator (local +X) -> world +Y (STANDING STRICTLY UPRIGHT!)
    valveCore.rotation.set(0, Math.PI / 2, Math.PI / 2);
  } else if (v.orientation === 'horizontal_x') {
    // Pipe bore (local Y) -> world -X; Actuator (local +X) -> world +Y (STANDING STRICTLY UPRIGHT!)
    valveCore.rotation.set(0, 0, Math.PI / 2);
  }
  group.add(valveCore);

  // Only show prominent sprite for main CHV/CDV/BPMV/TCV/XV/PCV valves (keep CT IV/OV sleek & clutter-free)
  if (!v.shortLabel.startsWith('CT')) {
    const sp = makeLabelSprite(v.shortLabel, 'rgba(15, 23, 42, 0.9)', '#22c55e', '#dcfce7', 1.9, 0.44);
    if (v.orientation === 'vertical') {
      sp.position.set(0.85, 0.4, 0.2);
    } else {
      sp.position.set(0, 1.15, 0);
    }
    group.add(sp);
  }

  return { group, rec: { valve: v, bodyMat, actuatorMat } };
}

function createInlineSensorMesh(s: InlineSensor3D): { group: THREE.Group; rec: RuntimeSensorRecord } {
  const group = new THREE.Group();
  group.position.set(...s.pos);

  if (s.kind === 'flow_switch') {
    // INDUSTRIAL PADDLE FLOW SWITCH (Brass threaded hex bush + NEMA Yellow/Red Rectangular Switch Housing + LED)
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.8 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.25 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });

    const hexBush = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 6), brassMat);
    hexBush.position.y = -0.43;
    group.add(hexBush);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 10), brassMat);
    stem.position.y = -0.24;
    group.add(stem);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.2), housingMat);
    box.position.y = -0.06;
    group.add(box);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.05, 0.21), lidMat);
    lid.position.y = 0.06;
    group.add(lid);
  } else if (s.kind === 'room_sensor') {
    // CLEANROOM COLUMN-MOUNTED ROOM TRANSMITTER (Sleek white wall box + blue display bezel + green LED)
    const wallBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.34, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.15 })
    );
    group.add(wallBox);
    const lcd = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.65 })
    );
    lcd.position.set(0, 0.05, 0.06);
    group.add(lcd);
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 })
    );
    led.position.set(0.08, -0.09, 0.065);
    group.add(led);
  } else {
    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 })
    );
    probe.position.y = -0.32;
    group.add(probe);

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.3 })
    );
    head.rotation.x = Math.PI / 2;
    head.position.y = -0.08;
    group.add(head);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 84;
  drawLiveSensorCanvas(canvas, s.shortLabel, s.kind === 'flow_switch' ? 'FLOW OK' : '--', 'NORMAL');
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.5, 0.82, 1);
  sprite.position.y = 0.45;
  sprite.userData.isLabelSprite = true;
  group.add(sprite);

  return { group, rec: { sensor: s, canvas, texture, lastText: '' } };
}

/**
 * Builds a SolidWorks-style true 3D Oxyz coordinate triad:
 *   - 3D shaded cylindrical shafts + 3D conical arrowheads (Red X, Green Y, Blue Z)
 *   - Origin hub sphere + crisp X / Y / Z tip labels
 * Rendered inside a bottom-right inset viewport of the main WebGLRenderer (zero extra WebGL contexts!).
 */
function buildSolidWorksTriadScene(): { scene: THREE.Scene; camera: THREE.OrthographicCamera } {
  const triadScene = new THREE.Scene();
  const triadCam = new THREE.OrthographicCamera(-2.05, 2.05, 2.05, -2.05, 0.1, 20);
  triadCam.position.set(0, 0, 6);

  triadScene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(3, 5, 6);
  triadScene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.45);
  fillLight.position.set(-4, -3, 3);
  triadScene.add(fillLight);

  const makeAxisLetterSprite = (letter: string, color: string) => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.font = '900 62px ui-sans-serif, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(9, 16, 29, 0.92)';
      ctx.strokeText(letter, 48, 52);
      ctx.fillStyle = color;
      ctx.fillText(letter, 48, 52);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(0.58, 0.58, 1);
    return sp;
  };

  // Origin hub sphere
  const originHub = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.28, metalness: 0.35 })
  );
  triadScene.add(originHub);

  const shaftLen = 0.98;
  const coneLen = 0.44;
  const shaftR = 0.072;
  const coneR = 0.21;

  const axisDefs: {
    label: string;
    hex: number;
    css: string;
    dir: [number, number, number];
    rot: [number, number, number];
  }[] = [
    { label: 'X', hex: 0xdc2626, css: '#f87171', dir: [1, 0, 0], rot: [0, 0, -Math.PI / 2] },
    { label: 'Y', hex: 0x16a34a, css: '#4ade80', dir: [0, 1, 0], rot: [0, 0, 0] },
    { label: 'Z', hex: 0x2563eb, css: '#60a5fa', dir: [0, 0, 1], rot: [Math.PI / 2, 0, 0] },
  ];

  for (const a of axisDefs) {
    const mat = new THREE.MeshStandardMaterial({
      color: a.hex,
      roughness: 0.3,
      metalness: 0.2,
    });
    const axisGrp = new THREE.Group();
    axisGrp.rotation.set(a.rot[0], a.rot[1], a.rot[2]);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 18), mat);
    shaft.position.y = shaftLen / 2;
    axisGrp.add(shaft);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneLen, 22), mat);
    cone.position.y = shaftLen + coneLen / 2;
    axisGrp.add(cone);

    triadScene.add(axisGrp);

    const labelDist = shaftLen + coneLen + 0.35;
    const lbl = makeAxisLetterSprite(a.label, a.css);
    lbl.position.set(a.dir[0] * labelDist, a.dir[1] * labelDist, a.dir[2] * labelDist);
    triadScene.add(lbl);
  }

  return { scene: triadScene, camera: triadCam };
}

function samplePolyline(rec: RuntimePipeRecord, dist: number, target: THREE.Vector3): void {
  const d = ((dist % rec.totalLength) + rec.totalLength) % rec.totalLength;
  for (let i = 0; i < rec.cumLengths.length - 1; i++) {
    const startL = rec.cumLengths[i];
    const endL = rec.cumLengths[i + 1];
    if (d <= endL || i === rec.cumLengths.length - 2) {
      const segLen = Math.max(endL - startL, 0.0001);
      const t = Math.min(1, Math.max(0, (d - startL) / segLen));
      target.lerpVectors(rec.points[i], rec.points[i + 1], t);
      return;
    }
  }
}

function readNodeLiveState(
  node: Equipment3DNode,
  plant: PlantState
): { status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'FAULTED'; speedFactor: number } {
  if (node.meshType === 'rodi_skid') {
    return plant.sandbox.diPackageConnected
      ? { status: 'RUNNING', speedFactor: 1 }
      : { status: 'FAULTED', speedFactor: 0 };
  }
  const tag = node.statusTag ?? node.tag;
  const eq = plant.equipment[tag];
  if (eq) {
    if (eq.faulted || eq.status === 'FAULTED') return { status: 'FAULTED', speedFactor: 0 };
    if (eq.status === 'RUNNING') {
      const spd = eq.kind === 'vfd' ? Math.max(0.4, eq.frequencyHz / 40) : 1.0;
      return { status: 'RUNNING', speedFactor: spd };
    }
    if (eq.status === 'STARTING' || eq.status === 'STOPPING') {
      return { status: eq.status, speedFactor: 0.45 };
    }
    return { status: 'STOPPED', speedFactor: 0 };
  }
  const vl = plant.valves[tag];
  if (vl) {
    if (vl.faulted) return { status: 'FAULTED', speedFactor: 0 };
    const open = vl.kind === 'XVAL' ? vl.openFB : vl.positionPct > 5;
    return open
      ? { status: 'RUNNING', speedFactor: Math.max(0.3, vl.positionPct / 100) }
      : { status: 'STOPPED', speedFactor: 0 };
  }
  return { status: 'STOPPED', speedFactor: 0 };
}

function isTagActive(tag: string, plant: PlantState): number {
  const eq = plant.equipment[tag];
  if (eq) {
    if (eq.status !== 'RUNNING') return 0;
    return eq.kind === 'vfd' ? 1.8 + (eq.frequencyHz / 50) * 3.8 : 3.4;
  }
  const vl = plant.valves[tag];
  if (vl) {
    if (vl.faulted) return 0;
    if (tag.includes('PCV107') && !plant.sandbox.diPackageConnected) return 0;
    return vl.kind === 'XVAL' ? (vl.openFB ? 3.2 : 0) : vl.positionPct > 3 ? 1.5 + (vl.positionPct / 100) * 3.0 : 0;
  }
  return 0;
}

function readPipeGroupFlowSpeed(rec: RuntimePipeRecord, plant: PlantState): number {
  let maxSpd = 0;
  for (const t of rec.flowSourceTags) {
    const s = isTagActive(t, plant);
    if (s > maxSpd) maxSpd = s;
  }
  if (maxSpd <= 0) return 0;
  if (rec.requireAllTags && rec.requireAllTags.length > 0) {
    const anyReqActive = rec.requireAllTags.some((t) => isTagActive(t, plant) > 0);
    if (!anyReqActive) return 0;
  }
  return maxSpd;
}

export interface Plant3DCanvasHandle {
  captureScreenshot: () => void;
  toggleRecording: () => void;
  toggleFullscreen: () => void;
}

const MAX_SHORT_VIDEO_SEC = 15;

interface Plant3DCanvasProps {
  zone: Zone3DId;
  onSelectNode: (node: Equipment3DNode | null) => void;
  onDoubleClickNode: (node: Equipment3DNode) => void;
  onDoubleClickBuilding: (targetZone: Zone3DId) => void;
}

export const Plant3DCanvas = forwardRef<Plant3DCanvasHandle, Plant3DCanvasProps>(function Plant3DCanvas(
  { zone, onSelectNode, onDoubleClickNode, onDoubleClickBuilding },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [shotToast, setShotToast] = useState<string | null>(null);

  const selectedNodeId = useTrainingStore((s) => s.selectedNodeId);
  const customTransforms = useTrainingStore((s) => s.customTransforms);
  const showLabels = useTrainingStore((s) => s.showLabels);
  const setShowLabels = useTrainingStore((s) => s.setShowLabels);
  const flowEnabled = useTrainingStore((s) => s.flowEnabled);
  const setFlowEnabled = useTrainingStore((s) => s.setFlowEnabled);
  const flowSpeed = useTrainingStore((s) => s.flowSpeed);
  const setFlowSpeed = useTrainingStore((s) => s.setFlowSpeed);
  const b51fLayers = useTrainingStore((s) => s.b51fLayers);
  const b51fFocusLayer = useTrainingStore((s) => s.b51fFocusLayer);
  const b21fLayers = useTrainingStore((s) => s.b21fLayers);
  const b21fFocusLayer = useTrainingStore((s) => s.b21fFocusLayer);
  const b31fLayers = useTrainingStore((s) => s.b31fLayers);
  const b31fFocusLayer = useTrainingStore((s) => s.b31fFocusLayer);
  const cameraPresetSeq = useTrainingStore((s) => s.cameraPresetSeq);
  const isolateB51FLayer = useTrainingStore((s) => s.isolateB51FLayer);
  const toggleB51FLayer = useTrainingStore((s) => s.toggleB51FLayer);

  const transformsRef = useRef(customTransforms);
  const selectedIdRef = useRef(selectedNodeId);
  const showLabelsRef = useRef(showLabels);
  const flowEnabledRef = useRef(flowEnabled);
  const flowSpeedRef = useRef(flowSpeed);
  const b51fLayersRef = useRef(b51fLayers);
  const b21fLayersRef = useRef(b21fLayers);
  const b31fLayersRef = useRef(b31fLayers);
  const onSelectNodeRef = useRef(onSelectNode);
  const onDoubleClickNodeRef = useRef(onDoubleClickNode);
  const onDoubleClickBuildingRef = useRef(onDoubleClickBuilding);

  useEffect(() => {
    transformsRef.current = customTransforms;
    selectedIdRef.current = selectedNodeId;
    showLabelsRef.current = showLabels;
    flowEnabledRef.current = flowEnabled;
    flowSpeedRef.current = flowSpeed;
    b51fLayersRef.current = b51fLayers;
    b21fLayersRef.current = b21fLayers;
    b31fLayersRef.current = b31fLayers;
    onSelectNodeRef.current = onSelectNode;
    onDoubleClickNodeRef.current = onDoubleClickNode;
    onDoubleClickBuildingRef.current = onDoubleClickBuilding;
  }, [
    customTransforms,
    selectedNodeId,
    showLabels,
    flowEnabled,
    flowSpeed,
    b51fLayers,
    b21fLayers,
    b31fLayers,
    onSelectNode,
    onDoubleClickNode,
    onDoubleClickBuilding,
  ]);

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    nodesMap: Map<string, RuntimeNodeRecord>;
    pipes: RuntimePipeRecord[];
    valves: RuntimeValveRecord[];
    sensors: RuntimeSensorRecord[];
    selectionBox: THREE.BoxHelper | null;
    syncTransforms: (ov: Record<string, NodeTransformOverride>) => void;
    updateSelectionBox: (nodeId: string | null) => void;
    applyLayerVisibility: (layers: Record<B51FLayerId, boolean>) => void;
    applyB2LayerVisibility: (layers: Record<B21FLayerId, boolean>) => void;
    applyB3LayerVisibility: (layers: Record<B31FLayerId, boolean>) => void;
    flyToPreset: (presetKey: B51FLayerId | 'all') => void;
    flyToB2Preset: (presetKey: B21FLayerId | 'all') => void;
    flyToB3Preset: (presetKey: B31FLayerId | 'all') => void;
    renderFrame: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const zoneMeta = ZONES_3D.find((z) => z.id === zone) ?? ZONES_3D[0];
    const [floorW, floorD] = zoneMeta.floorSize;
    const floorCenterX = zone === 'b5_chiller' ? 16 : zone === 'b5_air' ? 6 : zone === 'b3_plant' ? -1.5 : 0;
    const floorCenterZ = zone === 'b2_plant' ? -4.5 : 0;

    const scene = new THREE.Scene();
    const isSite = zone === 'site';
    const isCleanroom = zone === 'b5_2f' || zone === 'b2_plant' || zone === 'b2_3f' || zone === 'b3_plant';
    const skyHex = isSite ? '#6aa6dc' : isCleanroom ? '#132035' : '#09101d';
    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.Fog(
      skyHex,
      isSite ? 88 : zone === 'b5_chiller' ? 95 : 74,
      isSite ? 210 : zone === 'b5_chiller' ? 235 : 165
    );

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 360);
    const initialPreset =
      zone === 'b5_chiller'
        ? B51F_CAMERA_PRESETS[useTrainingStore.getState().b51fFocusLayer]
        : zone === 'b2_plant'
        ? B21F_CAMERA_PRESETS[useTrainingStore.getState().b21fFocusLayer]
        : zone === 'b3_plant'
        ? B31F_CAMERA_PRESETS[useTrainingStore.getState().b31fFocusLayer]
        : null;
    camera.position.set(...(initialPreset ? initialPreset.pos : zoneMeta.cameraPos));

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // SolidWorks-style 3D Oxyz Triad inset scene
    const { scene: triadScene, camera: triadCamera } = buildSolidWorksTriadScene();
    let viewW = width;
    let viewH = height;

    const renderFrame = () => {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, viewW, viewH);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      const triadSize = 114;
      const triadPad = 10;
      const triadX = Math.max(0, viewW - triadSize - triadPad);
      const triadY = triadPad;
      triadCamera.position.set(0, 0, 6).applyQuaternion(camera.quaternion);
      triadCamera.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      triadCamera.lookAt(0, 0, 0);

      renderer.clearDepth();
      renderer.setScissorTest(true);
      renderer.setScissor(triadX, triadY, triadSize, triadSize);
      renderer.setViewport(triadX, triadY, triadSize, triadSize);
      renderer.render(triadScene, triadCamera);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, viewW, viewH);
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.48; // Smooth, gentle rotation sensitivity
    controls.zoomSpeed = 0.72;
    controls.panSpeed = 0.65;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 8;
    controls.maxDistance = zone === 'b5_chiller' ? 145 : isSite ? 120 : 72;
    controls.target.set(...(initialPreset ? initialPreset.target : zoneMeta.cameraTarget));
    controls.update();

    scene.add(new THREE.HemisphereLight(isSite || isCleanroom ? 0xf8fafc : 0xdbeafe, isSite ? 0x3b5c36 : isCleanroom ? 0x94a3b8 : 0x1e293b, isSite || isCleanroom ? 1.3 : 1.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, isSite ? 1.5 : 1.35);
    dirLight.position.set(18, 38, 22);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = zone === 'b5_chiller' ? -75 : isSite ? -45 : -30;
    dirLight.shadow.camera.right = zone === 'b5_chiller' ? 75 : isSite ? 45 : 30;
    dirLight.shadow.camera.top = isSite ? 42 : 34;
    dirLight.shadow.camera.bottom = isSite ? -42 : -34;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-18, 18, -18);
    scene.add(rimLight);

    // Base floor platform
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(floorW, 0.4, floorD),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(zoneMeta.floorColor), roughness: 0.85, metalness: 0.1 })
    );
    floorMesh.position.set(floorCenterX, -0.2, floorCenterZ);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const borderLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(floorW + 0.1, 0.42, floorD + 0.1)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(zoneMeta.borderColor) })
    );
    borderLine.position.set(floorCenterX, -0.2, floorCenterZ);
    scene.add(borderLine);

    const gridSpan = Math.max(floorW, floorD);
    const baseGrid = new THREE.GridHelper(gridSpan, Math.round(gridSpan / 2), 0x334155, 0x1e293b);
    baseGrid.position.set(floorCenterX, 0.015, floorCenterZ);
    baseGrid.visible = !isSite && !isCleanroom;
    scene.add(baseGrid);

    // Detailed Architectural Structures for Coherent Site, Building 5 & Building 2 Floors!
    let activeVehicles: RuntimeVehicleRecord[] = [];
    if (zone === 'site') {
      const siteArch = buildCoherentSiteArchitecture();
      scene.add(siteArch.group);
      activeVehicles = siteArch.vehicles;
    } else if (zone === 'b5_chiller') {
      scene.add(buildB5ChillerArchitecture());
    } else if (zone === 'b5_m1f') {
      scene.add(buildB5M1fArchitecture());
    } else if (zone === 'b5_2f') {
      scene.add(buildB52fCleanroomArchitecture());
    } else if (zone === 'b5_air') {
      scene.add(buildB5M2fArchitecture());
    } else if (zone === 'b2_plant') {
      scene.add(buildB21fArchitecture());
    } else if (zone === 'b2_2f') {
      scene.add(buildB22fArchitecture());
    } else if (zone === 'b2_3f') {
      scene.add(buildB23fArchitecture());
    } else if (zone === 'b2_m3f') {
      scene.add(buildB2M3fArchitecture());
    } else if (zone === 'b3_plant') {
      scene.add(buildB31fArchitecture());
    } else if (zone === 'b3_2f') {
      scene.add(buildB32fArchitecture());
    }

    // Equipment nodes in this zone
    const zoneNodes = DEFAULT_3D_NODES.filter((n) => n.zone === zone);
    const nodesMap = new Map<string, RuntimeNodeRecord>();
    const equipRoot = new THREE.Group();
    scene.add(equipRoot);

    for (const node of zoneNodes) {
      const rec = buildEquipmentMesh(node);
      if (zone === 'b5_chiller') {
        rec.group.userData.b5Layer = node.layer ?? 'chiller';
      }
      if (zone === 'b2_plant') {
        rec.group.userData.b2Layer = node.b2Layer ?? 'cleanroom';
      }
      if (zone === 'b3_plant') {
        rec.group.userData.b3Layer = node.b3Layer ?? 'warehouse';
      }
      const t = resolveNodeTransform(node, transformsRef.current);
      rec.group.position.set(t.x, t.y, t.z);
      rec.group.rotation.y = t.rotY;
      equipRoot.add(rec.group);
      nodesMap.set(node.id, rec);
    }

    // Dynamic Pipes, Inline Valves & Live Sensors Group
    const dynamicNetworkGroup = new THREE.Group();
    scene.add(dynamicNetworkGroup);
    let activePipes: RuntimePipeRecord[] = [];
    let activeValves: RuntimeValveRecord[] = [];
    let activeSensors: RuntimeSensorRecord[] = [];

    const zoneGenericPipes = DEFAULT_3D_PIPES.filter((p) => p.zone === zone);

    const applyLayerVisibility = (layers: Record<B51FLayerId, boolean>) => {
      if (zone !== 'b5_chiller') return;
      scene.traverse((obj) => {
        const lyr = obj.userData?.b5Layer as B51FLayerId | undefined;
        if (lyr) {
          obj.visible = Boolean(layers[lyr]);
        }
      });
    };

    const applyB2LayerVisibility = (layers: Record<B21FLayerId, boolean>) => {
      if (zone !== 'b2_plant') return;
      scene.traverse((obj) => {
        const lyr = obj.userData?.b2Layer as B21FLayerId | undefined;
        if (lyr) {
          obj.visible = Boolean(layers[lyr]);
        }
      });
    };

    const applyB3LayerVisibility = (layers: Record<B31FLayerId, boolean>) => {
      if (zone !== 'b3_plant') return;
      scene.traverse((obj) => {
        const lyr = obj.userData?.b3Layer as B31FLayerId | undefined;
        if (lyr) {
          obj.visible = Boolean(layers[lyr]);
        }
      });
    };

    const rebuildNetwork = (ov: Record<string, NodeTransformOverride>) => {
      while (dynamicNetworkGroup.children.length > 0) {
        dynamicNetworkGroup.remove(dynamicNetworkGroup.children[0]);
      }
      activePipes = [];
      activeValves = [];
      activeSensors = [];

      if (zone === 'b5_chiller') {
        const assembly = buildB5ChillerDetailAssembly(ov);
        assembly.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          pRec.group.userData.b5Layer = pSpec.layer;
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        assembly.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          vg.userData.b5Layer = vSpec.layer;
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        assembly.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          sg.userData.b5Layer = sSpec.layer;
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b5_m1f') {
        const m1f = buildB5M1fDetailAssembly(ov);
        m1f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        m1f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        m1f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        m1f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b5_2f') {
        const b52f = buildB52fDetailAssembly();
        b52f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b52f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b52f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b52f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b5_air') {
        const m2f = buildB5M2fDetailAssembly(ov);
        m2f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        m2f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        m2f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        m2f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b2_plant') {
        const b21f = buildB21fDetailAssembly(ov);
        b21f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          pRec.group.userData.b2Layer = pSpec.b2Layer;
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b21f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dRec.group.userData.b2Layer = dSpec.b2Layer;
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b21f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          vg.userData.b2Layer = vSpec.b2Layer;
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b21f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          sg.userData.b2Layer = sSpec.b2Layer;
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b2_2f') {
        const b22f = buildB22fDetailAssembly(ov);
        b22f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b22f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b22f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b22f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b2_3f') {
        const b23f = buildB23fDetailAssembly();
        b23f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b23f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b23f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b23f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b2_m3f') {
        const b2m3f = buildB2M3fDetailAssembly(ov);
        b2m3f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b2m3f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b2m3f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b2m3f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b3_plant') {
        const b31f = buildB31fDetailAssembly(ov);
        b31f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          pRec.group.userData.b3Layer = pSpec.b3Layer;
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b31f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dRec.group.userData.b3Layer = dSpec.b3Layer;
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b31f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          vg.userData.b3Layer = vSpec.b3Layer;
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b31f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          sg.userData.b3Layer = sSpec.b3Layer;
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'b3_2f') {
        const b32f = buildB32fDetailAssembly(ov);
        b32f.pipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        b32f.ducts.forEach((dSpec, idx) => {
          const dRec = createDetailedDuctRecord(dSpec, idx);
          dynamicNetworkGroup.add(dRec.group);
          activePipes.push(dRec);
        });
        b32f.valves.forEach((vSpec) => {
          const { group: vg, rec } = createInlineValveMesh(vSpec);
          dynamicNetworkGroup.add(vg);
          activeValves.push(rec);
        });
        b32f.sensors.forEach((sSpec) => {
          const { group: sg, rec } = createInlineSensorMesh(sSpec);
          dynamicNetworkGroup.add(sg);
          activeSensors.push(rec);
        });
      } else if (zone === 'site') {
        // Explicit Overhead Chilled Water Supply & Return Pipes spanning the Steel Bridge from Building 5 -> Building 2!
        const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
        const siteBridgePipes: DetailedPipe3D[] = [
          {
            id: 'site_bridge_chw_sup',
            layer: 'chiller',
            fluid: 'chw',
            flowSourceTags: chwpTags,
            points: [
              [-3.1, 4.15, -5.2],
              [-3.1, 4.15, -2.15],
              [-3.1, 0.9, -2.15],
            ],
            radius: 0.2,
            particleCount: 8,
          },
          {
            id: 'site_bridge_chw_ret',
            layer: 'chiller',
            fluid: 'chwr',
            flowSourceTags: chwpTags,
            points: [
              [-2.1, 0.9, -2.15],
              [-2.1, 4.15, -2.15],
              [-2.1, 4.15, -5.2],
            ],
            radius: 0.2,
            particleCount: 8,
          },
        ];
        siteBridgePipes.forEach((pSpec, idx) => {
          const pRec = createDetailedPipeRecord(pSpec, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
        zoneGenericPipes.forEach((link, idx) => {
          const fromRec = nodesMap.get(link.fromId);
          const toRec = nodesMap.get(link.toId);
          if (!fromRec || !toRec) return;
          const pRec = createGenericPipeRecord(link, fromRec.node, toRec.node, ov, idx + 2);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
      } else {
        zoneGenericPipes.forEach((link, idx) => {
          const fromRec = nodesMap.get(link.fromId);
          const toRec = nodesMap.get(link.toId);
          if (!fromRec || !toRec) return;
          const pRec = createGenericPipeRecord(link, fromRec.node, toRec.node, ov, idx);
          dynamicNetworkGroup.add(pRec.group);
          activePipes.push(pRec);
        });
      }

      if (sceneRefs.current) {
        sceneRefs.current.pipes = activePipes;
        sceneRefs.current.valves = activeValves;
        sceneRefs.current.sensors = activeSensors;
      }
      dynamicNetworkGroup.traverse((obj) => {
        if (obj.userData?.isLabelSprite) {
          obj.visible = showLabelsRef.current;
        }
      });
      applyLayerVisibility(b51fLayersRef.current);
      applyB2LayerVisibility(b21fLayersRef.current);
      applyB3LayerVisibility(b31fLayersRef.current);
    };
    rebuildNetwork(transformsRef.current);
    scene.traverse((obj) => {
      if (obj.userData?.isLabelSprite) {
        obj.visible = showLabelsRef.current;
      }
    });
    applyLayerVisibility(b51fLayersRef.current);
    applyB2LayerVisibility(b21fLayersRef.current);
    applyB3LayerVisibility(b31fLayersRef.current);

    let selectionBox: THREE.BoxHelper | null = null;
    const updateSelectionBox = (nodeId: string | null) => {
      if (selectionBox) {
        scene.remove(selectionBox);
        selectionBox.dispose();
        selectionBox = null;
      }
      if (nodeId) {
        const rec = nodesMap.get(nodeId);
        if (rec) {
          selectionBox = new THREE.BoxHelper(rec.group, 0x38bdf8);
          scene.add(selectionBox);
        }
      }
      if (sceneRefs.current) sceneRefs.current.selectionBox = selectionBox;
    };

    const syncTransforms = (ov: Record<string, NodeTransformOverride>) => {
      for (const rec of nodesMap.values()) {
        const t = resolveNodeTransform(rec.node, ov);
        rec.group.position.set(t.x, t.y, t.z);
        rec.group.rotation.y = t.rotY;
      }
      rebuildNetwork(ov);
      if (selectionBox) selectionBox.update();
    };

    // Smooth camera fly-to target state (cancelled immediately when user grabs OrbitControls)
    let flyGoalPos: THREE.Vector3 | null = null;
    let flyGoalTarget: THREE.Vector3 | null = null;
    const cancelFly = () => {
      flyGoalPos = null;
      flyGoalTarget = null;
    };
    controls.addEventListener('start', cancelFly);

    const flyToPreset = (presetKey: B51FLayerId | 'all') => {
      const preset = B51F_CAMERA_PRESETS[presetKey];
      if (!preset) return;
      flyGoalPos = new THREE.Vector3(...preset.pos);
      flyGoalTarget = new THREE.Vector3(...preset.target);
    };

    const flyToB2Preset = (presetKey: B21FLayerId | 'all') => {
      const preset = B21F_CAMERA_PRESETS[presetKey];
      if (!preset) return;
      flyGoalPos = new THREE.Vector3(...preset.pos);
      flyGoalTarget = new THREE.Vector3(...preset.target);
    };

    const flyToB3Preset = (presetKey: B31FLayerId | 'all') => {
      const preset = B31F_CAMERA_PRESETS[presetKey];
      if (!preset) return;
      flyGoalPos = new THREE.Vector3(...preset.pos);
      flyGoalTarget = new THREE.Vector3(...preset.target);
    };

    sceneRefs.current = {
      scene,
      camera,
      renderer,
      controls,
      nodesMap,
      pipes: activePipes,
      valves: activeValves,
      sensors: activeSensors,
      selectionBox,
      syncTransforms,
      updateSelectionBox,
      applyLayerVisibility,
      applyB2LayerVisibility,
      applyB3LayerVisibility,
      flyToPreset,
      flyToB2Preset,
      flyToB3Preset,
      renderFrame,
    };
    updateSelectionBox(selectedIdRef.current);

    // Raycaster: Single-Click selects equipment, Double-Click opens 2D SCADA (or flies inside building on Site Overview)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointerFromEvent = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findHitNode = (ev: MouseEvent): RuntimeNodeRecord | null => {
      setPointerFromEvent(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(equipRoot.children, true);
      for (const h of hits) {
        let obj: THREE.Object3D | null = h.object;
        while (obj && obj.parent !== equipRoot) {
          obj = obj.parent;
        }
        if (obj && obj.visible && typeof obj.userData?.nodeId === 'string') {
          return nodesMap.get(obj.userData.nodeId) ?? null;
        }
      }
      return null;
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const hitRec = findHitNode(ev);
      if (!hitRec) {
        useTrainingStore.getState().setSelectedNodeId(null);
        onSelectNodeRef.current(null);
        return;
      }

      useTrainingStore.getState().setSelectedNodeId(hitRec.node.id);
      onSelectNodeRef.current(hitRec.node);
      updateSelectionBox(hitRec.node.id);
    };

    const onDblClick = (ev: MouseEvent) => {
      const hitRec = findHitNode(ev);
      if (!hitRec) return;
      useTrainingStore.getState().setSelectedNodeId(hitRec.node.id);
      onSelectNodeRef.current(hitRec.node);
      updateSelectionBox(hitRec.node.id);

      if (zone === 'site' && hitRec.node.targetZoneOnClick) {
        onDoubleClickBuildingRef.current(hitRec.node.targetZoneOnClick);
      } else {
        if (document.fullscreenElement) {
          void document.exitFullscreen?.();
        }
        onDoubleClickNodeRef.current(hitRec.node);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('dblclick', onDblClick);

    const resizeObs = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth || 900;
      const nh = container.clientHeight || 580;
      viewW = nw;
      viewH = nh;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObs.observe(container);

    // 60 FPS Live Render Loop (ZERO React DOM re-renders!)
    let rafId = 0;
    let lastTs = performance.now();
    let elapsedReal = 0;
    let flowClock = 0;
    const tmpPos = new THREE.Vector3();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dtReal = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      elapsedReal += dtReal;
      if (flowEnabledRef.current) {
        flowClock += dtReal * flowSpeedRef.current;
      }

      const plant = useB5Store.getState().plant;
      const blinkRed = Math.sin(elapsedReal * 10) > 0;

      // 1. Equipment Status, Rotors & Tank Water Levels
      for (const rec of nodesMap.values()) {
        const { status, speedFactor } = readNodeLiveState(rec.node, plant);
        let hex = 0x64748b;
        let emIntensity = 0.1;
        if (status === 'RUNNING') {
          hex = 0x22c55e;
          emIntensity = 0.65;
        } else if (status === 'STARTING' || status === 'STOPPING') {
          hex = 0x3b82f6;
          emIntensity = 0.6;
        } else if (status === 'FAULTED') {
          hex = blinkRed ? 0xef4444 : 0x7f1d1d;
          emIntensity = blinkRed ? 1.1 : 0.2;
        }
        rec.beaconMat.color.setHex(hex);
        rec.beaconMat.emissive.setHex(hex);
        rec.beaconMat.emissiveIntensity = emIntensity;

        for (const am of rec.accentMats) {
          am.color.setHex(hex);
          am.emissive.setHex(status === 'STOPPED' ? 0x000000 : hex);
          am.emissiveIntensity = status === 'RUNNING' ? 0.2 : status === 'FAULTED' && blinkRed ? 0.5 : 0.05;
        }

        if (speedFactor > 0 && rec.rotors.length > 0) {
          for (const rotor of rec.rotors) {
            if (
              rec.node.meshType === 'ahu' ||
              rec.node.meshType === 'air_chiller' ||
              rec.node.meshType === 'heat_fan' ||
              rec.node.meshType === 'fcu' ||
              rec.node.meshType === 'ffu' ||
              rec.node.meshType === 'pauct'
            ) {
              rotor.rotation.z -= dtReal * 5.2 * speedFactor;
            } else if (rec.node.meshType === 'exhaust_fan' || rec.node.meshType === 'duct_fan') {
              rotor.rotation.x -= dtReal * 6.0 * speedFactor;
            } else {
              rotor.rotation.y += dtReal * 5.2 * speedFactor;
            }
          }
        }

        // Motorized Fresh Air Intake Damper blades smoothly open when AHU runs and close when stopped!
        if (rec.damperBlades && rec.damperBlades.length > 0) {
          const targetAngle = status === 'RUNNING' ? 0.08 : Math.PI / 2 - 0.14;
          for (const blade of rec.damperBlades) {
            blade.rotation.z += (targetAngle - blade.rotation.z) * Math.min(1, dtReal * 5);
          }
        }

        if (rec.liquidMesh && rec.liquidMaxH && rec.node.levelSensorTag) {
          const lv = plant.sensors[rec.node.levelSensorTag]?.pv ?? 65;
          const frac = Math.max(0.08, Math.min(0.98, lv / 100));
          rec.liquidMesh.scale.y = frac;
          rec.liquidMesh.position.y = 0.3 + (rec.liquidMaxH * frac) / 2;
        }

        // Animated Falling Water Droplets inside KingSun Cooling Towers ("nước chảy nhỏ giọt")
        if (rec.waterDrops) {
          let ctWaterFlowing = status === 'RUNNING';
          const ctMatch = /^B51F_CT(\d+)FN$/.exec(rec.node.tag);
          if (ctMatch) {
            const ivTag = `B51F_CT${ctMatch[1]}IV`;
            const anyCwpRunning =
              plant.equipment['B51F_CT11CWP']?.status === 'RUNNING' ||
              plant.equipment['B51F_CT12CWP']?.status === 'RUNNING' ||
              plant.equipment['B51F_CT13CWP']?.status === 'RUNNING';
            const ivOpen = plant.valves[ivTag]?.openFB ?? false;
            ctWaterFlowing = anyCwpRunning && ivOpen;
          }
          const showDrops = ctWaterFlowing && flowEnabledRef.current;
          rec.waterDrops.curtainMat.opacity = ctWaterFlowing ? 0.32 : 0.0;
          const dropStepScale = dtReal * Math.max(0.35, flowSpeedRef.current);
          const spanY = rec.waterDrops.maxY - rec.waterDrops.minY;
          for (let di = 0; di < rec.waterDrops.meshes.length; di++) {
            const dm = rec.waterDrops.meshes[di];
            dm.visible = showDrops;
            if (showDrops) {
              dm.position.y -= rec.waterDrops.speeds[di] * dropStepScale;
              if (dm.position.y < rec.waterDrops.minY) {
                dm.position.y += spanY;
              }
            }
          }
        }
      }

      // 2. Inline 3D Motorized Valves (CHV / CDV / CT IV-OV / BPMV)
      for (const vRec of activeValves) {
        const vl = plant.valves[vRec.valve.tag];
        if (!vl) continue;
        const isFault = vl.faulted;
        const isOpen = vl.kind === 'XVAL' ? vl.openFB : vl.positionPct > 3;
        const vHex = isFault ? (blinkRed ? 0xef4444 : 0x7f1d1d) : isOpen ? 0x22c55e : 0x64748b;
        vRec.bodyMat.color.setHex(vHex);
        vRec.actuatorMat.emissive.setHex(vHex);
        vRec.actuatorMat.emissiveIntensity = isFault ? 0.9 : isOpen ? 0.35 : 0.05;
      }

      // 3. Inline 3D Header Sensors & Paddle Flow Switches (Live Text Canvas Updates ONLY on change!)
      for (const sRec of activeSensors) {
        if (sRec.sensor.kind === 'flow_switch') {
          const srcTags = sRec.sensor.flowSourceTags ?? [sRec.sensor.tag];
          const flowing = srcTags.some((t) => plant.equipment[t]?.status === 'RUNNING');
          const valText = flowing ? 'FLOW OK' : 'NO FLOW';
          const level = flowing ? 'NORMAL' : 'LA';
          const key = `${valText}|${level}`;
          if (key !== sRec.lastText) {
            sRec.lastText = key;
            drawLiveSensorCanvas(sRec.canvas, sRec.sensor.shortLabel, valText, level);
            sRec.texture.needsUpdate = true;
          }
          continue;
        }
        const sn = plant.sensors[sRec.sensor.tag];
        if (!sn) continue;
        const valText = `${sn.pv.toFixed(sn.decimals)} ${sn.unit}`;
        const key = `${valText}|${sn.alarms.activeLevel}`;
        if (key !== sRec.lastText) {
          sRec.lastText = key;
          drawLiveSensorCanvas(sRec.canvas, sRec.sensor.shortLabel, valText, sn.alarms.activeLevel);
          sRec.texture.needsUpdate = true;
        }
      }

      // 4. 3D Pipe Flow Particles (respects ON/OFF toggle & smooth flowSpeed slider!)
      const showFlow = flowEnabledRef.current;
      for (const pRec of activePipes) {
        const spd = showFlow ? readPipeGroupFlowSpeed(pRec, plant) : 0;
        const count = pRec.particles.length;
        for (let i = 0; i < count; i++) {
          const p = pRec.particles[i];
          p.visible = spd > 0;
          if (spd > 0) {
            const dist =
              (flowClock * spd + (i / count + pRec.phaseOffset) * pRec.totalLength) % pRec.totalLength;
            samplePolyline(pRec, dist, tmpPos);
            p.position.copy(tmpPos);
          }
        }
      }

      // 5. Live Animated Traffic Vehicles on Coherent NT1 Roads (Site Overview)
      for (const vRec of activeVehicles) {
        if (vRec.axis === 'x') {
          let nx = vRec.mesh.position.x + vRec.dir * vRec.speed * dtReal;
          if (vRec.dir === 1 && nx > vRec.maxPos) nx = vRec.minPos;
          else if (vRec.dir === -1 && nx < vRec.minPos) nx = vRec.maxPos;
          vRec.mesh.position.x = nx;
        } else {
          let nz = vRec.mesh.position.z + vRec.dir * vRec.speed * dtReal;
          if (vRec.dir === 1 && nz > vRec.maxPos) nz = vRec.minPos;
          else if (vRec.dir === -1 && nz < vRec.minPos) nz = vRec.maxPos;
          vRec.mesh.position.z = nz;
        }
      }

      // Smooth camera fly-to easing when switching B5 1F subsystem layer
      if (flyGoalPos && flyGoalTarget) {
        const alpha = Math.min(1, dtReal * 5.5);
        camera.position.lerp(flyGoalPos, alpha);
        controls.target.lerp(flyGoalTarget, alpha);
        if (camera.position.distanceTo(flyGoalPos) < 0.15 && controls.target.distanceTo(flyGoalTarget) < 0.15) {
          camera.position.copy(flyGoalPos);
          controls.target.copy(flyGoalTarget);
          flyGoalPos = null;
          flyGoalTarget = null;
        }
      }

      controls.update();
      renderFrame();
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      controls.removeEventListener('start', cancelFly);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      controls.dispose();
      renderer.dispose();
      sceneRefs.current = null;
    };
  }, [zone]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.updateSelectionBox(selectedNodeId);
  }, [selectedNodeId]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.syncTransforms(customTransforms);
  }, [customTransforms]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.scene.traverse((obj) => {
      if (obj.userData?.isLabelSprite) {
        obj.visible = showLabels;
      }
    });
  }, [showLabels]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.applyLayerVisibility(b51fLayers);
  }, [b51fLayers]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.applyB2LayerVisibility(b21fLayers);
  }, [b21fLayers]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.applyB3LayerVisibility(b31fLayers);
  }, [b31fLayers]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs || cameraPresetSeq === 0) return;
    if (zone === 'b5_chiller') {
      refs.flyToPreset(b51fFocusLayer);
    } else if (zone === 'b2_plant') {
      refs.flyToB2Preset(b21fFocusLayer);
    } else if (zone === 'b3_plant') {
      refs.flyToB3Preset(b31fFocusLayer);
    }
  }, [cameraPresetSeq, b51fFocusLayer, b21fFocusLayer, b31fFocusLayer, zone]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement && document.fullscreenElement === wrapperRef.current));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const captureScreenshot = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    // Render one fresh frame synchronously (including 3D Oxyz triad) before snapshot
    refs.renderFrame();
    const dataUrl = refs.renderer.domElement.toDataURL('image/png');
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `cohr2401-3d-${zone}-${stamp}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShotToast(`Saved PNG: ${filename}`);
    window.setTimeout(() => setShotToast(null), 2600);
  }, [zone]);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordSec(0);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }
    const refs = sceneRefs.current;
    if (!refs || typeof MediaRecorder === 'undefined' || !refs.renderer.domElement.captureStream) {
      setShotToast('Video recording is not supported in this browser.');
      window.setTimeout(() => setShotToast(null), 3000);
      return;
    }
    try {
      const stream = refs.renderer.domElement.captureStream(30);
      const mimeType =
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 });
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordChunksRef.current.length === 0) return;
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `cohr2401-3d-${zone}-${stamp}.webm`;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShotToast(`Saved Video: ${filename}`);
        window.setTimeout(() => setShotToast(null), 3000);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordSec(0);
      let elapsed = 0;
      recordTimerRef.current = window.setInterval(() => {
        elapsed += 1;
        setRecordSec(elapsed);
        if (elapsed >= MAX_SHORT_VIDEO_SEC) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setShotToast('Unable to start 3D video recording.');
      window.setTimeout(() => setShotToast(null), 3000);
    }
  }, [isRecording, stopRecording, zone]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen?.();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen();
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      captureScreenshot,
      toggleRecording,
      toggleFullscreen,
    }),
    [captureScreenshot, toggleRecording, toggleFullscreen]
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full min-h-[480px] overflow-hidden bg-[#09101d] ${
        isFullscreen ? 'rounded-none border-0' : 'rounded-lg border-2 border-[#253c61]'
      }`}
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Right In-Viewport Floating 3D Controls (Always inside the 3D window to save space!) */}
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-wrap items-center justify-end gap-1.5 font-mono text-[11px] max-w-[calc(100%-20px)]">
        <button
          onClick={() => setShowLabels(!showLabels)}
          title="Toggle 3D equipment, valve and sensor labels"
          className={`flex items-center gap-1 px-2 py-1 rounded border font-bold backdrop-blur cursor-pointer transition shadow ${
            showLabels
              ? 'bg-sky-900/80 border-sky-400 text-sky-100 hover:bg-sky-800/90'
              : 'bg-slate-950/85 border-slate-600 text-slate-300 hover:text-white'
          }`}
        >
          {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showLabels ? 'Labels: ON' : 'Labels: OFF'}
        </button>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-600/90 bg-slate-950/85 backdrop-blur shadow">
          <button
            onClick={() => setFlowEnabled(!flowEnabled)}
            title="Toggle 3D pipe flow animation"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
              flowEnabled ? 'bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40' : 'bg-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            {flowEnabled ? 'Flow: ON' : 'Flow: OFF'}
          </button>
          {flowEnabled && (
            <label className="flex items-center gap-1 text-[10px] text-cyan-200">
              <input
                type="range"
                min={0.25}
                max={3.0}
                step={0.25}
                value={flowSpeed}
                onChange={(e) => setFlowSpeed(Number(e.target.value))}
                title="3D Flow Speed"
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <span className="w-9 text-right font-black text-cyan-300">
                {flowSpeed.toFixed(2).replace(/\.00$/, '')}×
              </span>
            </label>
          )}
        </div>

        <button
          onClick={captureScreenshot}
          title="Capture high-resolution 3D PNG snapshot"
          className="flex items-center gap-1 px-2 py-1 rounded border border-emerald-400/70 bg-slate-950/85 hover:bg-emerald-950/90 text-emerald-200 hover:text-white font-bold backdrop-blur shadow cursor-pointer transition"
        >
          <Camera className="w-3.5 h-3.5" />
          PNG
        </button>

        <button
          onClick={toggleRecording}
          title={
            isRecording
              ? 'Stop recording and download 3D video'
              : `Record short 3D video clip (max ${MAX_SHORT_VIDEO_SEC}s)`
          }
          className={`flex items-center gap-1 px-2 py-1 rounded border font-bold backdrop-blur shadow cursor-pointer transition ${
            isRecording
              ? 'border-rose-400 bg-rose-600/90 text-white animate-pulse'
              : 'border-rose-400/70 bg-slate-950/85 hover:bg-rose-950/90 text-rose-200 hover:text-white'
          }`}
        >
          {isRecording ? <Square className="w-3 h-3 fill-current" /> : <Video className="w-3.5 h-3.5" />}
          {isRecording
            ? `REC 00:${String(recordSec).padStart(2, '0')} / 00:${String(MAX_SHORT_VIDEO_SEC).padStart(2, '0')}`
            : 'Video'}
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Enter Full Screen'}
          className="flex items-center gap-1 px-2 py-1 rounded border border-cyan-400/70 bg-slate-950/85 hover:bg-cyan-950/90 text-cyan-200 hover:text-white font-bold backdrop-blur shadow cursor-pointer transition"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {isFullscreen ? 'Exit' : 'Full Screen'}
        </button>
      </div>

      {shotToast && (
        <div className="absolute top-12 right-2.5 z-20 px-3 py-1.5 rounded bg-emerald-600/95 border border-emerald-200 text-white font-mono text-[11px] font-bold shadow-lg pointer-events-none">
          ✓ {shotToast}
        </div>
      )}

      {/* Top-Left Fullscreen B5 1F System Filter Bar */}
      {isFullscreen && zone === 'b5_chiller' && (
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1 bg-slate-950/85 border border-[#2c456e] rounded-md px-2 py-1 backdrop-blur font-mono text-[10.5px]">
          {(
            [
              ['all', 'All 1F'],
              ['chiller', 'Chiller & HR'],
              ['pcw', 'PCW'],
              ['ac', 'AC & PV'],
              ['di', 'DI'],
            ] as const
          ).map(([key, label]) => {
            const active = b51fFocusLayer === key;
            return (
              <button
                key={key}
                onClick={() => isolateB51FLayer(key)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                  active ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-slate-800/90 text-slate-200 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
          <span className="text-slate-500 mx-0.5">|</span>
          {(
            [
              ['chiller', 'CH'],
              ['pcw', 'PCW'],
              ['ac', 'AC'],
              ['di', 'DI'],
            ] as const
          ).map(([lyr, lbl]) => (
            <button
              key={`fs-tog-${lyr}`}
              onClick={() => toggleB51FLayer(lyr)}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                b51fLayers[lyr]
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-500 line-through'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Bottom-Left Operating Hint (Vietnamese operating instruction) */}
      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-mono text-slate-300 pointer-events-none">
        Chuột trái: Xoay · Chuột phải: Di chuyển · Cuộn: Zoom · {zone === 'site' ? 'Nhấn đúp tòa nhà B5/B2/B3 để bay vào bên trong' : 'Click: Chọn thiết bị · Nhấn đúp thiết bị: Mở SCADA 2D'}
      </div>
    </div>
  );
});
