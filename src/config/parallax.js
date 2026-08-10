// Global parallax tuning. These values are multiplied by each model's
// own `motionIntensity` (see config/backgrounds.js and config/rabbids.js),
// so you can tune "how strong parallax feels overall" here, and
// "how much this specific model moves relative to others" per-model.

export const PARALLAX_CONFIG = {
  // Max rotation offset in radians, applied on top of each model's base rotation.
  maxRotationX: 0.05, // tilt from vertical mouse movement
  maxRotationY: 0.07, // tilt from horizontal mouse movement

  // Max position offset in scene units, applied on top of each model's base position.
  maxPositionX: 0.04,
  maxPositionY: 0.025,

  // Damping speed for THREE.MathUtils.damp — higher = snappier, lower = floatier.
  dampingFactor: 4,
};
