// Lightweight global pointer tracker (mouse + touch), normalized to -1..1.
// Kept outside React state so useFrame loops can read it every frame
// without triggering re-renders.

export const pointerState = { x: 0, y: 0 };

let initialized = false;
const listeners = new Set();

function notifyPointerChange() {
  listeners.forEach((listener) => listener());
}

export function subscribePointerUpdates(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initPointerTracking() {
  if (initialized) return;
  initialized = true;

  const updateFromClient = (clientX, clientY) => {
    pointerState.x = (clientX / window.innerWidth) * 2 - 1;
    pointerState.y = (clientY / window.innerHeight) * 2 - 1;
    notifyPointerChange();
  };

  window.addEventListener('mousemove', (e) => {
    updateFromClient(e.clientX, e.clientY);
  });

  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches[0]) {
        updateFromClient(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );

  // Ease the pointer back toward center if the mouse leaves the window,
  // so the parallax gently returns to rest instead of freezing off-center.
  window.addEventListener('mouseleave', () => {
    pointerState.x = 0;
    pointerState.y = 0;
    notifyPointerChange();
  });
}
