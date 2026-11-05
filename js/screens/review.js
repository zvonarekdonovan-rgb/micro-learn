// review.js
// Spaced review: quiz questions from lessons you finished earlier
// come back after 1, 3, 7, 14 and then 30 days.

import { loadAllBooks, findLesson } from "../content.js";
import { dueReviewKeys, recordReview, finishReview, POINTS } from "../progress.js";
import { esc, progressBar } from "../ui.js";

const MAX_PER_SESSION = 5;

// Review items that are due today and whose lesson still exists.
export function getDueItems(books) {
  const items = [];
  for (const key of dueReviewKeys()) {
    const [bookId, lessonId] = key.split("/");
    const book = books.find((b) => b.id === bookId);
    const found = book && findLesson(book, lessonId);
    if (found) items.push({ key, book, lesson: found.lesson });
  }
  return items;
}

export async function renderReview(app) {
  const books = await loadAllBooks();
  const items = getDueItems(books).slice(0, MAX_PER_SESSION);

  if (items.length === 0) {
    app.innerHTML = `
      <div class="empty">
        <h1>Nothing to review right now</h1>
        <p class="muted">Ideas from your finished lessons will come back here a day later, then at longer and longer gaps.</p>
        <a class="btn btn-primary" href="#/">Back to library</a>
      </div>`;
    return;
  }

  let i = 0;
  let correctCount = 0;

  function showItem() {
    const { key, lesson } = items[i];
    const quiz = lesson.quiz;

    app.innerHTML = `
      <div class="review">
        <header class="lesson-top">
          <a class="icon-btn" href="#/" aria-label="Close review">✕</a>
          ${progressBar(i / items.length)}
          <span class="small muted">${i + 1}/${items.length}</span>
        </header>
        <div class="card card-quiz">
          <p class="card-label">Review · ${esc(lesson.title)}</p>
          <h2 class="quiz-q">${esc(quiz.question)}</h2>
          <div class="options">
            ${quiz.options.map((o, n) => `<button class="option" data-option="${n}">${esc(o)}</button>`).join("")}
          </div>
          <p class="feedback" aria-live="polite"></p>
        </div>
        <button class="btn btn-primary btn-big" id="next" hidden>${i === items.length - 1 ? "Finish review" : "Next"}</button>
      </div>`;

    const buttons = [...app.querySelectorAll(".option")];
    const feedback = app.querySelector(".feedback");
    const nextBtn = app.querySelector("#next");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const correct = Number(button.dataset.option) === quiz.answer;
        buttons.forEach((b) => (b.disabled = true));
        buttons[quiz.answer].classList.add("correct");
        app.querySelector(".options").classList.add("solved");
        recordReview(key, correct);

        if (correct) {
          correctCount += 1;
          feedback.className = "feedback good";
          feedback.innerHTML = `<strong>Remembered!</strong> This idea will come back after a longer break.`;
        } else {
          button.classList.add("wrong");
          feedback.className = "feedback try";
          feedback.innerHTML = `<strong>Good to refresh.</strong> ${esc(quiz.explanation)} We'll bring this one back tomorrow.`;
        }
        nextBtn.hidden = false;
        nextBtn.focus();
      });
    });

    nextBtn.addEventListener("click", () => {
      i += 1;
      if (i < items.length) showItem();
      else showSummary();
    });
  }

  function showSummary() {
    const result = finishReview(correctCount);
    app.innerHTML = `
      <div class="celebrate">
        <svg class="check" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="36"></circle>
          <path d="M24 41 l11 11 l21 -23"></path>
        </svg>
        <h1>Review done</h1>
        <p class="muted">You remembered ${correctCount} of ${items.length} ${items.length === 1 ? "idea" : "ideas"}.</p>
        <p class="points">+${result.earned} points</p>
        <p class="small muted">${POINTS.review} points for each idea you remember.</p>
        ${result.freeze ? `<p class="unlocked">🧊 You also earned a streak freeze!</p>` : ""}
        <a class="btn btn-primary btn-big" href="#/">Back to library</a>
      </div>`;
  }

  showItem();
}
