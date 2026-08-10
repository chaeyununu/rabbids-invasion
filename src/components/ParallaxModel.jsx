import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState } from '../utils/pointer';
import { acquireModel, releaseModel } from '../utils/modelCache';
import { PARALLAX_CONFIG } from '../config/parallax';

const SETTLE_EPSILON = 0.0005;
const DEFAULT_RABBID_INTRO = {
  duration: 0.44,
  intensity: 0.68,
  squash: 0.075,
  wobble: 0.04,
  lift: 0.035,
  oscillations: 1.85,
};

function applyMaterialAdjustments(scene, adjustments) {
  if (!adjustments) return;

  const profile = adjustments.profile ?? 'default';
  const tint = adjustments.tint ? new THREE.Color(adjustments.tint) : null;
  const emissive = adjustments.emissive ? new THREE.Color(adjustments.emissive) : null;

  scene.traverse((child) => {
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];

    materials.forEach((material) => {
      if (material.userData.rabbidsAdjustmentProfile === profile) return;

      if (adjustments.forceOpaque) {
        material.transparent = false;
        material.opacity = 1;
        material.alphaTest = 0;
        material.depthWrite = true;
        material.blending = THREE.NormalBlending;
      }

      if (typeof adjustments.metalness === 'number' && 'metalness' in material) {
        material.metalness = adjustments.metalness;
      }

      if (typeof adjustments.roughness === 'number' && 'roughness' in material) {
        material.roughness = adjustments.roughness;
      }

      if (tint && material.color) {
        material.color.lerp(tint, adjustments.tintStrength ?? 0.2);
      }

      if (emissive && material.emissive) {
        material.emissive.copy(emissive);
        material.emissiveIntensity = adjustments.emissiveIntensity ?? 0;
      }

      material.userData.rabbidsAdjustmentProfile = profile;
      material.needsUpdate = true;
    });
  });
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function getIntroSettings(config) {
  if (config.id?.startsWith('B')) {
    return { active: false };
  }

  const transition = config.transition ?? {};
  const intensity =
    typeof config.transitionIntensity === 'number'
      ? config.transitionIntensity
      : config.id?.startsWith('R')
        ? DEFAULT_RABBID_INTRO.intensity
        : 0;

  return {
    active: intensity > 0,
    duration: transition.duration ?? DEFAULT_RABBID_INTRO.duration,
    intensity,
    squash: transition.squash ?? DEFAULT_RABBID_INTRO.squash,
    wobble: transition.wobble ?? DEFAULT_RABBID_INTRO.wobble,
    lift: transition.lift ?? DEFAULT_RABBID_INTRO.lift,
    oscillations: transition.oscillations ?? DEFAULT_RABBID_INTRO.oscillations,
  };
}

// Generic "load a GLB, apply its base transform, then apply subtle
// pointer-driven parallax on top of it" component. Used for both
// backgrounds and rabbids so their motion logic stays identical.
export default function ParallaxModel({ config }) {
  const groupRef = useRef(null);
  const mixerRef = useRef(null);
  const autoRotationRef = useRef(0);
  const introRef = useRef({ active: false, elapsed: 0, settings: null });
  const hoverRef = useRef({ active: false, phase: 0, offset: 0 });
  const [model, setModel] = useState(null);
  const invalidate = useThree((state) => state.invalidate);

  const intensity = config.motionIntensity ?? 1;
  const autoRotateSpeed = config.autoRotateSpeed ?? 0;
  const hoverNod = config.hoverNod;
  const [baseX, baseY, baseZ] = config.position;
  const [baseRotX, baseRotY, baseRotZ] = config.rotation;

  useEffect(() => {
    let cancelled = false;

    setModel(null);
    autoRotationRef.current = 0;
    introRef.current = { active: false, elapsed: 0, settings: null };
    hoverRef.current = { active: false, phase: 0, offset: 0 };

    acquireModel(config.path)
      .then((loadedModel) => {
        if (cancelled) return;
        const introSettings = getIntroSettings(config);

        applyMaterialAdjustments(loadedModel.scene, config.materialAdjustments);
        if (introSettings.active) {
          const introScale =
            config.scale * (1 - introSettings.squash * introSettings.intensity);
          const introStretch = introSettings.wobble * introSettings.intensity * 0.45;

          groupRef.current?.scale.set(
            introScale * (1 + introStretch),
            introScale * (1 - introStretch * 0.85),
            introScale
          );
          introRef.current = { active: true, elapsed: 0, settings: introSettings };
        } else {
          groupRef.current?.scale.setScalar(config.scale);
          introRef.current = { active: false, elapsed: 0, settings: null };
        }
        setModel(loadedModel);
        invalidate();
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`Failed to load GLB: ${config.path}`, error);
        }
      });

    return () => {
      cancelled = true;
      releaseModel(config.path);
    };
  }, [config, invalidate]);

  useEffect(() => {
    if (!config.playAnimations || !model?.animations?.length) {
      mixerRef.current = null;
      return undefined;
    }

    const mixer = new THREE.AnimationMixer(model.scene);
    model.animations.forEach((clip) => {
      mixer.clipAction(clip).setLoop(THREE.LoopRepeat).play();
    });

    mixerRef.current = mixer;
    invalidate();

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model.scene);
      mixerRef.current = null;
    };
  }, [config.playAnimations, model, invalidate]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const mixer = mixerRef.current;
    if (mixer) {
      mixer.update(delta);
    }

    if (autoRotateSpeed !== 0) {
      autoRotationRef.current += autoRotateSpeed * delta;
    }

    const hover = hoverRef.current;
    if (hoverNod) {
      hover.phase += delta * (hoverNod.speed ?? 3);
      const nodTarget = hover.active
        ? Math.sin(hover.phase) * (hoverNod.amplitude ?? 0.14)
        : 0;

      hover.offset = THREE.MathUtils.damp(hover.offset, nodTarget, 8, delta);
    }

    const intro = introRef.current;
    let introOffsetY = 0;
    let isIntroActive = false;

    if (intro.active) {
      const settings = intro.settings;
      intro.elapsed += delta;
      const t = Math.min(1, intro.elapsed / settings.duration);
      const remaining = 1 - t;
      const settle = easeOutQuart(t);
      const decay = remaining * remaining;
      const startScale = 1 - settings.squash * settings.intensity;
      const uniformScale = config.scale * THREE.MathUtils.lerp(startScale, 1, settle);
      const jelly =
        Math.sin(t * Math.PI * settings.oscillations * 2) *
        decay *
        settings.wobble *
        settings.intensity;

      group.scale.set(
        uniformScale * (1 + jelly * 0.55),
        uniformScale * (1 - jelly * 0.9),
        uniformScale * (1 + jelly * 0.35)
      );

      introOffsetY = Math.sin(t * Math.PI) * decay * settings.lift * settings.intensity;
      isIntroActive = t < 1;
      intro.active = isIntroActive;

      if (!isIntroActive) {
        group.scale.setScalar(config.scale);
      }
    }

    const targetRotX =
      baseRotX + pointerState.y * PARALLAX_CONFIG.maxRotationX * intensity + hover.offset;
    const targetRotY =
      baseRotY +
      autoRotationRef.current +
      pointerState.x * PARALLAX_CONFIG.maxRotationY * intensity;
    const targetPosX = baseX + pointerState.x * PARALLAX_CONFIG.maxPositionX * intensity;
    const targetPosY =
      baseY - pointerState.y * PARALLAX_CONFIG.maxPositionY * intensity + introOffsetY;

    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      targetRotX,
      PARALLAX_CONFIG.dampingFactor,
      delta
    );
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      targetRotY,
      PARALLAX_CONFIG.dampingFactor,
      delta
    );
    group.position.x = THREE.MathUtils.damp(
      group.position.x,
      targetPosX,
      PARALLAX_CONFIG.dampingFactor,
      delta
    );
    group.position.y = THREE.MathUtils.damp(
      group.position.y,
      targetPosY,
      PARALLAX_CONFIG.dampingFactor,
      delta
    );

    const isSettling =
      Math.abs(group.rotation.x - targetRotX) > SETTLE_EPSILON ||
      Math.abs(group.rotation.y - targetRotY) > SETTLE_EPSILON ||
      Math.abs(group.position.x - targetPosX) > SETTLE_EPSILON ||
      Math.abs(group.position.y - targetPosY) > SETTLE_EPSILON;
    const isHoverNodding = hoverNod && (hover.active || Math.abs(hover.offset) > SETTLE_EPSILON);

    if (isSettling || mixer || autoRotateSpeed !== 0 || isIntroActive || isHoverNodding) {
      invalidate();
    }
  });

  const handlePointerOver = hoverNod
    ? () => {
        hoverRef.current.active = true;
        invalidate();
      }
    : undefined;
  const handlePointerOut = hoverNod
    ? () => {
        hoverRef.current.active = false;
        invalidate();
      }
    : undefined;

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      rotation={[baseRotX, baseRotY, baseRotZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {model && <primitive object={model.scene} />}
    </group>
  );
}
