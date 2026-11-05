// progress.js
// All the "rules" of the app live here: unlocking, completion,
// points, streaks, streak freezes, the daily goal, and spaced review.

import { loadState, saveState, clearState } from "./storage.js";

// ---- Settings you can tweak ----------------------------------------
export const DAILY_GOAL = 3;            // lessons per day before "done for today"
export const LESSONS_PER_CHAPTER = 3;
export const POINTS = { lesson: 10, firstTry: 5, chapter: 50, path: 500, review: 2 };
const REVIEW_STEPS = [1, 3, 7, 14, 30]; // days until an idea comes back for review
const FREEZE_EVERY = 7;                 // earn a freeze every 7-day streak
const MAX_FREEZES = 2;

// The learner's progress, loaded once when the app starts.
export const state = loadState();
export function save() {
  saveState(state);
}

// ---- Date helpers (dates are stored as "YYYY-MM-DD" in local time) --
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseDate(text) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayString() {
  return toDateString(new Date());
}
function addDays(text, days) {
  const date = parseDate(text);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}
function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

const keyFor = (bookId, lessonId) => `${bookId}/${lessonId}`;

// ---- Daily start: reset today's count, handle missed days -----------
// Called every time a screen is shown, so it also works if the app
// stays open past midnight.
export function startDay() {
  const today = todayString();

  if (state.today.date !== today) {
    state.today = { date: today, lessons: 0, doneShown: false };
  }

  if (state.lastActiveDate && state.streak > 0) {
    const missedDays = daysBetween(state.lastActiveDate, today) - 1;
    if (missedDays > 0) {
      if (state.freezes >= missedDays) {
        // Freezes cover the gap. Pretend the learner was active yesterday.
        state.freezes -= missedDays;
        state.lastActiveDate = addDays(today, -1);
        state.notice =
          missedDays === 1
            ? "🧊 A streak freeze covered the day you missed. Your streak is safe."
            : `🧊 ${missedDays} streak freezes covered the days you missed. Your streak is safe.`;
      } else {
        state.streak = 0;
        state.notice = "Welcome back! Your next lesson starts a fresh streak.";
      }
    }
  }
  save();
}

export function clearNotice() {
  state.notice = null;
  save();
}

// Marks today as an active day. Returns "freeze" if a freeze was earned.
function recordActivity() {
  const today = todayString();
  if (state.lastActiveDate === today) return null;

  const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, today) : null;
  state.streak = gap === 1 ? state.streak + 1 : 1;
  state.lastActiveDate = today;
  state.bestStreak = Math.max(state.bestStreak, state.streak);

  if (state.streak % FREEZE_EVERY === 0 && state.freezes < MAX_FREEZES) {
    state.freezes += 1;
    return "freeze";
  }
  return null;
}

// ---- Lessons, chapters, paths ----------------------------------------
export function isLessonDone(bookId, lessonId) {
  return Boolean(state.completedLessons[keyFor(bookId, lessonId)]);
}

// A chapter is complete when it has its 3 lessons and all are done.
export function isChapterDone(book, chapter) {
  return (
    chapter.lessons.length >= LESSONS_PER_CHAPTER &&
    chapter.lessons.every((lesson) => isLessonDone(book.id, lesson.id))
  );
}

// Chapters unlock in order: chapter 1 is always open,
// every other chapter opens when the one before it is complete.
export function isChapterUnlocked(book, chapterIndex) {
  if (chapterIndex === 0) return true;
  return isChapterDone(book, book.chapters[chapterIndex - 1]);
}

export function isPathDone(book) {
  return book.chapters.every((chapter) => isChapterDone(book, chapter));
}

export function bookProgress(book) {
  let lessonsDone = 0;
  let chaptersDone = 0;
  for (const chapter of book.chapters) {
    lessonsDone += chapter.lessons.filter((l) => isLessonDone(book.id, l.id)).length;
    if (isChapterDone(book, chapter)) chaptersDone += 1;
  }
  const lessonsTotal = book.chapters.length * LESSONS_PER_CHAPTER; // 60 for a full path
  return {
    lessonsDone,
    lessonsTotal,
    chaptersDone,
    chaptersTotal: book.chapters.length,
    fraction: lessonsTotal ? lessonsDone / lessonsTotal : 0,
  };
}

// The next lesson the learner should do, or null if none is available.
export function nextLesson(book) {
  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    if (!isChapterUnlocked(book, i)) return null;
    const lesson = chapter.lessons.find((l) => !isLessonDone(book.id, l.id));
    if (lesson) return { chapter, lesson };
    if (!isChapterDone(book, chapter)) return null; // chapter not written yet
  }
  return null;
}

// Called when the learner finishes a lesson.
// Returns a list of "moments" to celebrate, in order.
export function completeLesson(book, chapter, lesson, firstTry) {
  const key = keyFor(book.id, lesson.id);
  const moments = [];
  const isRepeat = isLessonDone(book.id, lesson.id);
  let earned = 0;

  if (!isRepeat) {
    earned = POINTS.lesson + (firstTry ? POINTS.firstTry : 0);
    state.completedLessons[key] = todayString();
    state.reviews[key] = { step: 0, due: addDays(todayString(), REVIEW_STEPS[0]) };
    state.today.lessons += 1;
  }
  const freeze = recordActivity();
  moments.push({ type: "lesson", points: earned, firstTry, isRepeat, lesson });

  const chapterKey = "chapter:" + keyFor(book.id, chapter.id);
  if (isChapterDone(book, chapter) && !state.celebrated[chapterKey]) {
    state.celebrated[chapterKey] = true;
    earned += POINTS.chapter;
    moments.push({ type: "chapter", points: POINTS.chapter, chapter });
  }

  const pathKey = "path:" + book.id;
  if (isPathDone(book) && !state.celebrated[pathKey]) {
    state.celebrated[pathKey] = true;
    earned += POINTS.path;
    moments.push({ type: "path", points: POINTS.path });
  }

  if (freeze) moments.push({ type: "freeze" });

  if (state.today.lessons >= DAILY_GOAL && !state.today.doneShown) {
    state.today.doneShown = true;
    moments.push({ type: "daily" });
  }

  state.points += earned;
  save();
  return moments;
}

// ---- Spaced review ---------------------------------------------------
// Keys ("bookId/lessonId") of ideas that are due for review today.
export function dueReviewKeys() {
  const today = todayString();
  return Object.keys(state.reviews).filter((key) => state.reviews[key].due <= today);
}

// Right answer: wait longer before the next review.
// Wrong answer: start again, come back tomorrow.
export function recordReview(key, correct) {
  const review = state.reviews[key];
  if (!review) return;
  review.step = correct ? Math.min(review.step + 1, REVIEW_STEPS.length - 1) : 0;
  review.due = addDays(todayString(), REVIEW_STEPS[review.step]);
  save();
}

export function finishReview(correctCount) {
  const earned = correctCount * POINTS.review;
  state.points += earned;
  const freeze = recordActivity();
  save();
  return { earned, freeze };
}

export function resetProgress() {
  clearState();
  location.reload();
}

// ---- Testing helpers (use them from the browser console) -------------
// devTools.pretendDaysPassed(1)  -> acts as if a day went by
// devTools.giveFreeze()          -> adds a streak freeze
// devTools.reset()               -> wipes all progress
window.devTools = {
  pretendDaysPassed(days = 1) {
    const shift = (d) => (d ? addDays(d, -days) : d);
    state.lastActiveDate = shift(state.lastActiveDate);
    state.today.date = shift(state.today.date);
    for (const review of Object.values(state.reviews)) review.due = shift(review.due);
    save();
    location.reload();
  },
  giveFreeze() {
    state.freezes = Math.min(state.freezes + 1, MAX_FREEZES);
    save();
    location.reload();
  },
  reset: resetProgress,
};
