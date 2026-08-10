// One entry per Rabbid GLB. Adjust position / rotation / scale per file
// to compensate for how each model was exported (different pivot, size, etc).
//
// motionIntensity: 0 = perfectly still, 1 = full parallax amplitude.
// r3 and r14 are set much lower per spec - tweak the exact number to taste.

const RABBID_MODEL_BASE = `${import.meta.env.BASE_URL}models/rabbids`;
const BACKGROUND_MODEL_BASE = `${import.meta.env.BASE_URL}models/backgrounds`;

export const RABBIDS = [
  { id: 'R1', label: 'R 01', path: `${RABBID_MODEL_BASE}/r1.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R2', label: 'R 02', path: `${RABBID_MODEL_BASE}/r2.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R3', label: 'R 03', path: `${RABBID_MODEL_BASE}/r3.glb`, position: [0, -0.25, 0], rotation: [0, -1.25, 0], scale: 1.12, motionIntensity: 0.2 },
  { id: 'R4', label: 'R 04', path: `${RABBID_MODEL_BASE}/r4.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R5', label: 'R 05', path: `${RABBID_MODEL_BASE}/r5.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R6', label: 'R 06', path: `${RABBID_MODEL_BASE}/r6.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1, autoRotateSpeed: -0.22 },
  { id: 'R7', label: 'R 07', path: `${RABBID_MODEL_BASE}/r7.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1, autoRotateSpeed: -0.035 },
  { id: 'R8', label: 'R 08', path: `${RABBID_MODEL_BASE}/r8.glb`, position: [0, -0.25, 0], rotation: [0, 0.12, 0], scale: 1.12, motionIntensity: 1, hoverNod: { amplitude: 0.16, speed: 3.2 } },
  { id: 'R9', label: 'R 09', path: `${RABBID_MODEL_BASE}/r9.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R10', label: 'R 10', path: `${RABBID_MODEL_BASE}/r10.glb`, position: [0, -0.25, 0], rotation: [0, -0.38, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R11', label: 'R 11', path: `${RABBID_MODEL_BASE}/r11.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R12', label: 'R 12', path: `${RABBID_MODEL_BASE}/r12.glb`, position: [0, 0.03, 0], rotation: [-0.22, 0, 0], scale: 1.24, motionIntensity: 1 },
  { id: 'R13', label: 'R 13', path: `${RABBID_MODEL_BASE}/r13.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R14', label: 'R 14', path: `${RABBID_MODEL_BASE}/r14.glb`, position: [0, -0.25, 0], rotation: [0, -0.78, 0], scale: 1.12, motionIntensity: 0.2, autoRotateSpeed: -0.18 },
  { id: 'R15', label: 'R 15', path: `${RABBID_MODEL_BASE}/r15.glb`, position: [0, -0.25, 0], rotation: [0, 0.62, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R16', label: 'R 16', path: `${RABBID_MODEL_BASE}/r16.glb`, position: [0, -0.25, 0], rotation: [0, -0.9, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R17', label: 'R 17', path: `${RABBID_MODEL_BASE}/r17.glb`, position: [0, -0.25, 0], rotation: [0, 0, 0], scale: 1.12, motionIntensity: 1 },
  { id: 'R18', label: 'R 18', path: `${BACKGROUND_MODEL_BASE}/b7.glb`, position: [0, -0.38, 0], rotation: [0.18, 0, 0], scale: 1.85, motionIntensity: 1 },
];
