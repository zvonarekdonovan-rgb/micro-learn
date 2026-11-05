// library.js
// The home screen: today's goal, reviews waiting, and every book.

import { loadAllBooks } from "../content.js";
import { state, DAILY_GOAL, bookProgress, isPathDone, clearNotice, resetProgress } from "../progress.js";
import { esc, statsBar, progressBar, ring, coverImg, fixCovers } from "../ui.js";
import { getDueItems } from "./review.js";

export async function renderLibrary(app) {
  const books = await loadAllBooks();
  const dueCount = getDueItems(books).length;
  const lessonsToday = state.today.lessons;
  const doneToday = lessonsToday >= DAILY_GOAL;

  const notice = state.notice;
  if (notice) clearNotice(); // show it only once

  app.innerHTML = `
    <header class="page-top">
      <h1 class="app-title">Micro Paths</h1>
      ${statsBar()}
    </header>

    ${notice ? `<div class="notice">${esc(notice)}</div>` : ""}

    ${doneToday
      ? `<div class="goal-card is-done">
           <span class="goal-icon">🌙</span>
           <div><strong>You're done for today</strong>
           <p class="small muted">Goal met. Anything more is a bonus, not a must.</p></div>
         </div>`
      : `<div class="goal-card">
           ${ring(lessonsToday / DAILY_GOAL, `${lessonsToday}/${DAILY_GOAL}`)}
           <div><strong>Today's goal</strong>
           <p class="small muted">${DAILY_GOAL} short lessons, about ${DAILY_GOAL * 3} minutes</p></div>
         </div>`}

    ${dueCount
      ? `<a class="review-card" href="#/review">
           <span class="goal-icon">🔁</span>
           <div><strong>Quick review</strong>
           <p class="small muted">${dueCount} earlier ${dueCount === 1 ? "idea is" : "ideas are"} ready to revisit</p></div>
           <span class="chev">›</span>
         </a>`
      : ""}

    <h2 class="section-title">Library</h2>
    <section class="book-list">
      ${books.map(bookCard).join("")}
    </section>

    <footer class="footer">
      <p class="small muted">Progress is saved on this device only.</p>
      <button class="btn btn-ghost btn-small" id="reset">Reset progress</button>
    </footer>`;

  fixCovers(app);
  app.querySelector("#reset").addEventListener("click", () => {
    if (window.confirm("Erase all progress, points and streaks on this device?")) resetProgress();
  });
}

function bookCard(book) {
  const p = bookProgress(book);
  const status = isPathDone(book)
    ? "Path complete ✓"
    : `${p.lessonsDone} of ${p.lessonsTotal} lessons`;
  return `
    <a class="book-card" href="#/book/${esc(book.id)}">
      ${coverImg(book)}
      <div class="book-info">
        <h3>${esc(book.title)}</h3>
        <p class="small muted">${esc(book.author)}</p>
        <p class="path-name">${esc(book.pathTitle)}</p>
        ${progressBar(p.fraction)}
        <p class="small muted">${status}</p>
      </div>
    </a>`;
}
