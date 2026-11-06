// book.js
// A book's learning path: overall progress and its 20 chapters.

import { loadBook } from "../content.js";
import {
  bookProgress, nextLesson, isPathDone, isChapterDone, isChapterUnlocked,
  isLessonDone, LESSONS_PER_CHAPTER,
} from "../progress.js";
import { esc, statsBar, ring, coverImg, fixCovers, disclaimer } from "../ui.js";
import { onSwipe } from "../swipe.js";

export async function renderBook(app, bookId) {
  const book = await loadBook(bookId);
  const p = bookProgress(book);
  const next = nextLesson(book);
  const pathDone = isPathDone(book);

  let mainButton = "";
  if (next) {
    const label = p.lessonsDone === 0 ? "Start" : "Continue";
    mainButton = `<a class="btn btn-primary btn-big" href="#/lesson/${esc(book.id)}/${esc(next.lesson.id)}">
      ${label}: ${esc(next.lesson.title)}</a>`;
  } else if (!pathDone) {
    mainButton = `<p class="soon-note">You've finished every lesson that's available so far. New chapters are on the way.</p>`;
  }

  app.innerHTML = `
    <div class="page" id="book-page">
    <header class="page-top">
      <a class="back" href="#/">‹ Library</a>
      ${statsBar()}
    </header>

    <section class="book-hero">
      ${coverImg(book, "cover-lg")}
      <div>
        <p class="eyebrow">Learning path</p>
        <h1>${esc(book.pathTitle)}</h1>
        <p class="small muted">Inspired by ideas in <em>${esc(book.title)}</em> by ${esc(book.author)}</p>
      </div>
    </section>

    <p>${esc(book.description)}</p>

    <section class="path-progress">
      ${ring(p.fraction, `${Math.round(p.fraction * 100)}%`)}
      <div>
        <strong>${pathDone ? "Path complete 🎉" : "Complete the path"}</strong>
        <p class="small muted">${p.lessonsDone} of ${p.lessonsTotal} lessons · ${p.chaptersDone} of ${p.chaptersTotal} chapters</p>
      </div>
    </section>

    ${mainButton}

    <ol class="chapters">
      ${book.chapters.map((chapter, i) => chapterItem(book, chapter, i, next)).join("")}
    </ol>

    ${disclaimer(book)}
    </div>`;

  fixCovers(app);
  // Swipe right anywhere to go back to the library.
  onSwipe(app.querySelector("#book-page"), { right: () => (location.hash = "#/") });
}

function chapterItem(book, chapter, index, next) {
  const title = `<h3>${esc(chapter.title)}</h3>`;

  if (!isChapterUnlocked(book, index)) {
    return `
      <li class="chapter is-locked">
        <div class="chapter-head">
          <span class="badge" aria-label="Locked">🔒</span>
          <div>${title}<p class="small muted">Finish chapter ${index} to unlock</p></div>
        </div>
      </li>`;
  }

  if (!chapter.available) {
    return `
      <li class="chapter is-soon">
        <div class="chapter-head">
          <span class="badge">${chapter.number}</span>
          <div>${title}<p class="small muted">Coming soon</p></div>
        </div>
      </li>`;
  }

  const lessonList = `
    <ul class="lessons">
      ${chapter.lessons.map((lesson) => {
        const done = isLessonDone(book.id, lesson.id);
        const isNext = next && next.lesson.id === lesson.id;
        return `
          <li>
            <a class="lesson-link ${done ? "done" : ""} ${isNext ? "next" : ""}"
               href="#/lesson/${esc(book.id)}/${esc(lesson.id)}">
              <span class="tick">${done ? "✓" : ""}</span>
              <span class="lesson-title">${esc(lesson.title)}</span>
              <span class="small muted">${lesson.minutes || 2} min</span>
            </a>
          </li>`;
      }).join("")}
    </ul>
    ${chapter.lessons.length < LESSONS_PER_CHAPTER
      ? `<p class="small muted pad">More lessons for this chapter are still being reviewed.</p>`
      : ""}`;

  if (isChapterDone(book, chapter)) {
    return `
      <li class="chapter is-done">
        <details>
          <summary class="chapter-head">
            <span class="badge" aria-label="Completed">✓</span>
            <div>${title}<p class="small muted">Completed · tap to revisit</p></div>
          </summary>
          ${lessonList}
        </details>
      </li>`;
  }

  const doneCount = chapter.lessons.filter((l) => isLessonDone(book.id, l.id)).length;
  return `
    <li class="chapter is-current">
      <div class="chapter-head">
        <span class="badge">${chapter.number}</span>
        <div>
          ${title}
          <p class="small muted">${esc(chapter.goal || "")}</p>
          <p class="small muted">${doneCount} of ${LESSONS_PER_CHAPTER} lessons done</p>
        </div>
      </div>
      ${lessonList}
    </li>`;
}
