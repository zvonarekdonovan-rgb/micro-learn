// storage.js
// Saves and loads the learner's progress in the browser (localStorage).
// Nothing leaves the device. Clearing browser data erases progress.

const KEY = "microlearn-progress-v1";

// The shape of a brand-new learner's progress.
function freshState() {
  return {
    completedLessons: {}, // "bookId/lessonId" -> date completed ("2026-11-05")
    celebrated: {},       // which chapter/path celebrations were already shown
    points: 0,
    streak: 0,            // days in a row with at least one lesson or review
    bestStreak: 0,
    lastActiveDate: null, // last day the learner did something
    freezes: 0,           // streak freezes saved up (max 2)
    today: { date: null, lessons: 0, doneShown: false },
    reviews: {},          // "bookId/lessonId" -> { step, due }
    notice: null,         // a one-time friendly message for the library screen
  };
}

export function loadState() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return freshState();
    // Merge with a fresh state so new fields added later still exist.
    return { ...freshState(), ...JSON.parse(saved) };
  } catch (err) {
    console.warn("Could not load saved progress, starting fresh.", err);
    return freshState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save progress.", err);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("Could not clear progress.", err);
  }
}
