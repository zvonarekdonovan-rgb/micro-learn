// swipe.js
// Detects simple left/right swipes with a finger.
// Used on screens that don't drag content around (book page, review, celebrations).
// The lesson screen has its own drag-to-swipe in lesson.js.
//
//   onSwipe(element, { left: () => ..., right: () => ... })
//
// Touch events are used on purpose: unlike pointer events, "touchend" still
// fires if the browser starts scrolling, so we always get the final position.

const MIN_DISTANCE = 60; // px the finger has to travel sideways
const MAX_TIME = 600;    // ms, slower than this is a drag, not a swipe

export function onSwipe(el, handlers) {
  let start = null;

  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return (start = null);
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, { passive: true });

  el.addEventListener("touchend", (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const quick = Date.now() - start.time < MAX_TIME;
    start = null;

    // Mostly sideways, far enough, and quick enough.
    if (!quick || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const handler = dx < 0 ? handlers.left : handlers.right;
    if (handler) {
      tick();
      handler();
    }
  }, { passive: true });

  el.addEventListener("touchcancel", () => (start = null), { passive: true });
}

// A tiny vibration so a swipe feels like it "clicked" (Android only; iOS ignores it).
export function tick() {
  if (navigator.vibrate) navigator.vibrate(8);
}
