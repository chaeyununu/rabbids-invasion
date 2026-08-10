// One entry per background GLB. Adjust position / rotation / scale per file
// to compensate for how each model was exported (different pivot, size, etc).
//
// motionIntensity: 0 = perfectly still, 1 = full parallax amplitude
// (as defined in config/parallax.js), values in between scale it down.

export const BACKGROUNDS = [
  {
    id: 'B1',
    label: 'B 01',
    path: '/models/backgrounds/b1.glb',
    position: [0, -1.15, -2],
    rotation: [0, 0, 0],
    scale: 1,
    motionIntensity: 1,
  },
  {
    id: 'B2',
    label: 'B 02',
    path: '/models/backgrounds/b2.glb',
    position: [-2.45, -1.9, -2],
    rotation: [0, 0, 0],
    scale: 1,
    motionIntensity: 1,
  },
  {
    id: 'B3',
    label: 'B 03',
    path: '/models/backgrounds/b3.glb',
    // Saved previous positions: [0, 0, -2], [0, 0, -1.35], [0, 0, -0.35], [0, -0.55, 1.2], [0, 0.55, 3.2], [-4.6, 0.55, 4.7], [-6.4, 0.55, 4.7].
    position: [-10, 0.55, 4.7],
    rotation: [0, -3.14, 0],
    scale: 1,
    motionIntensity: 1,
  },
  {
    id: 'B4',
    label: 'B 04',
    path: '/models/backgrounds/b4.glb',
    position: [-3.55, -2.55, -4.1],
    rotation: [0.34, -0.28, 0.03],
    scale: 0.18,
    motionIntensity: 1,
  },
];
