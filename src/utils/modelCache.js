import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const entries = new Map();
const preloadQueue = [];
const warmedFiles = new Set();

const MAX_IDLE_MODELS = 1;

let preloadScheduled = false;

function now() {
  return performance.now();
}

function disposeMaterial(material) {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) {
      value.dispose();
    }
  });

  material.dispose?.();
}

function disposeScene(scene) {
  scene.traverse((child) => {
    child.geometry?.dispose();
    child.skeleton?.dispose?.();

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else if (child.material) {
      disposeMaterial(child.material);
    }
  });
}

function trimModelCache() {
  const idleEntries = Array.from(entries.values())
    .filter((entry) => entry.status === 'loaded' && entry.refCount === 0)
    .sort((a, b) => a.lastUsed - b.lastUsed);

  const removableCount = idleEntries.length - MAX_IDLE_MODELS;
  if (removableCount <= 0) return;

  idleEntries.slice(0, removableCount).forEach((entry) => {
    disposeScene(entry.scene);
    entries.delete(entry.path);
  });
}

function createEntry(path) {
  const entry = {
    path,
    scene: null,
    animations: [],
    status: 'loading',
    refCount: 0,
    lastUsed: now(),
    promise: null,
  };

  entry.promise = new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        entry.scene = gltf.scene;
        entry.animations = gltf.animations ?? [];
        entry.status = 'loaded';
        entry.lastUsed = now();
        resolve({ scene: entry.scene, animations: entry.animations });
        trimModelCache();
      },
      undefined,
      (error) => {
        entries.delete(path);
        reject(error);
      }
    );
  });

  entries.set(path, entry);
  return entry;
}

function getEntry(path) {
  return entries.get(path) ?? createEntry(path);
}

function requestIdle(callback) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 1500 });
    return;
  }

  window.setTimeout(callback, 300);
}

function drainPreloadQueue() {
  preloadScheduled = false;

  const path = preloadQueue.shift();
  if (!path) return;

  preloadModel(path).finally(() => {
    if (preloadQueue.length > 0) {
      schedulePreloadDrain();
    }
  });
}

function schedulePreloadDrain() {
  if (preloadScheduled) return;
  preloadScheduled = true;
  requestIdle(drainPreloadQueue);
}

export function acquireModel(path) {
  const entry = getEntry(path);
  entry.refCount += 1;
  entry.lastUsed = now();

  return entry.promise;
}

export function releaseModel(path) {
  const entry = entries.get(path);
  if (!entry) return;

  entry.refCount = Math.max(0, entry.refCount - 1);
  entry.lastUsed = now();
  window.setTimeout(trimModelCache, 0);
}

export function preloadModel(path) {
  if (!path) return Promise.resolve(null);

  const entry = getEntry(path);
  entry.lastUsed = now();

  return entry.promise.catch((error) => {
    console.error(`Failed to preload GLB: ${path}`, error);
    return null;
  });
}

export function scheduleModelPreload(path, options = {}) {
  if (!path || entries.has(path) || preloadQueue.includes(path)) return;

  if (options.priority) {
    preloadQueue.unshift(path);
  } else {
    preloadQueue.push(path);
  }

  schedulePreloadDrain();
}

export function warmModelFile(path) {
  if (!path || warmedFiles.has(path)) return;

  warmedFiles.add(path);

  requestIdle(async () => {
    try {
      const response = await fetch(path, { cache: 'force-cache' });
      const reader = response.body?.getReader();

      if (!reader) {
        await response.arrayBuffer();
        return;
      }

      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      warmedFiles.delete(path);
    }
  });
}
