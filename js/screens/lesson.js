// lesson.js
// A lesson is 5 swipeable cards: hook, idea, example, quiz, action.
// Swipe left/right, use the Back/Next buttons, or the arrow keys.

import { loadBook, findLesson } from "../content.js";
import { isChapterUnlocked, completeLesson } from "../progress.js";
import { esc, paragraphs } from "../ui.js";
import { showCelebrations } from "./celebrate.js";

const SWIPE_DISTANCE = 50; // pixels you need to drag to change card

export async function renderLesson(app, bookId, lessonId) {
  const book = await loadBook(bookId);
  const found = findLesson(book, lessonId);

  // Unknown lesson or locked chapter? Go back to the book page.
  if (!found || !isChapterUnlocked(book, found.chapterIndex)) {
    location.hash = `#/book/${bookId}`;
    return;
  }
  const { chapter, lesson } = found;
  const quiz = lesson.quiz;

  const cards = [
    { type: "hook", label: "Hook", body: `<h2>${esc(lesson.title)}</h2><p class="lead">${esc(lesson.hook)}</p>` },
    { type: "idea", label: "The idea", body: paragraphs(lesson.idea) },
    { type: "example", label: "Example", body: paragraphs(lesson.example) },
    {
      type: "quiz",
      label: "Quick check",
      body: `
        <h2 class="quiz-q">${esc(quiz.question)}</h2>
        <div class="options">
          ${quiz.options.map((option, i) => `<button class="option" data-option="${i}">${esc(option)}</button>`).join("")}
        </div>
        <p class="feedback" id="feedback" aria-live="polite"></p>`,
    },
    {
      type: "action",
      label: "Try this today",
      body: `${paragraphs(lesson.action)}
        <button class="btn btn-primary btn-big" id="complete">I'll try it, complete lesson</button>`,
    },
  ];
  const QUIZ_INDEX = 3;

  let index = 0;
  let quizSolved = false;
  let firstTry = null; // true if the first answer was right

  app.innerHTML = `
    <div class="lesson" id="lesson">
      <header class="lesson-top">
        <a class="icon-btn" href="#/book/${esc(book.id)}" aria-label="Close lesson">✕</a>
        <div class="bar"><div class="bar-fill" id="lesson-bar"></div></div>
        <span class="small muted">${lesson.minutes || 2} min</span>
      </header>
      <p class="small muted lesson-chapter">Chapter ${chapter.number} · ${esc(chapter.title)}</p>

      <div class="viewport" id="viewport">
        <div class="track" id="track">
          ${cards.map((card) => `
            <section class="slide">
              <div class="card card-${card.type}">
                <p class="card-label">${card.label}</p>
                ${card.body}
              </div>
            </section>`).join("")}
        </div>
      </div>

      <nav class="lesson-nav">
        <button class="btn btn-ghost" id="prev">Back</button>
        <div class="dots">${cards.map(() => `<span class="dot"></span>`).join("")}</div>
        <button class="btn btn-primary" id="next">Next</button>
      </nav>
    </div>`;

  const root = app.querySelector("#lesson");
  const viewport = root.querySelector("#viewport");
  const track = root.querySelector("#track");
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll(".dot")];
  const bar = root.querySelector("#lesson-bar");
  const prevBtn = root.querySelector("#prev");
  const nextBtn = root.querySelector("#next");
  const feedback = root.querySelector("#feedback");
  const quizCard = slides[QUIZ_INDEX].querySelector(".card");

  // ---- Moving between cards -------------------------------------
  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((slide, i) => (slide.inert = i !== index)); // hide off-screen cards from keyboard
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
      dot.classList.toggle("seen", i < index);
    });
    bar.style.width = `${((index + 1) / cards.length) * 100}%`;
    prevBtn.disabled = index === 0;
    nextBtn.style.visibility = index === cards.length - 1 ? "hidden" : "visible";
    nextBtn.disabled = index === QUIZ_INDEX && !quizSolved;
  }

  function go(target) {
    if (target < 0 || target >= cards.length) return update();
    // You can't skip past the quiz until you've answered it.
    if (target > QUIZ_INDEX && !quizSolved) {
      if (index === QUIZ_INDEX) nudge();
      target = QUIZ_INDEX;
    }
    index = target;
    update();
  }

  function nudge() {
    if (!feedback.textContent) {
      feedback.className = "feedback try";
      feedback.textContent = "Pick an answer to continue.";
    }
    quizCard.classList.remove("shake");
    void quizCard.offsetWidth; // restart the animation
    quizCard.classList.add("shake");
  }

  prevBtn.addEventListener("click", () => go(index - 1));
  nextBtn.addEventListener("click", () => go(index + 1));

  // ---- Swiping (works with touch and mouse) ---------------------
  let startX = null;
  let dragX = 0;
  let dragging = false;
  let justDragged = false;

  viewport.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    dragX = 0;
    dragging = false;
  });
  viewport.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    dragX = e.clientX - startX;
    if (!dragging && Math.abs(dragX) > 10) {
      dragging = true;
      track.style.transition = "none"; // follow the finger exactly
    }
    if (dragging) track.style.transform = `translateX(calc(${-index * 100}% + ${dragX}px))`;
  });
  function endDrag() {
    if (startX === null) return;
    startX = null;
    track.style.transition = "";
    justDragged = dragging;
    setTimeout(() => (justDragged = false), 0);
    if (dragging && dragX < -SWIPE_DISTANCE) go(index + 1);
    else if (dragging && dragX > SWIPE_DISTANCE) go(index - 1);
    else update(); // snap back
    dragging = false;
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", endDrag);
  // A drag that ends on a button shouldn't also "click" it.
  viewport.addEventListener("click", (e) => {
    if (justDragged) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // ---- Arrow keys -----------------------------------------------
  function onKey(e) {
    if (!document.body.contains(root)) return document.removeEventListener("keydown", onKey);
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  }
  document.addEventListener("keydown", onKey);

  // ---- Quiz -------------------------------------------------------
  const optionButtons = [...root.querySelectorAll(".option")];
  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (quizSolved) return;
      const choice = Number(button.dataset.option);

      if (choice === quiz.answer) {
        quizSolved = true;
        if (firstTry === null) firstTry = true;
        button.classList.add("correct");
        optionButtons.forEach((b) => (b.disabled = true));
        root.querySelector(".options").classList.add("solved");
        feedback.className = "feedback good";
        feedback.innerHTML = `<strong>${firstTry ? "Spot on!" : "That's it!"}</strong> ${esc(quiz.explanation)}`;
        update();
      } else {
        firstTry = false;
        button.classList.add("wrong");
        button.disabled = true;
        feedback.className = "feedback try";
        feedback.textContent = "Not quite. Take another look and try again.";
      }
    });
  });

  // ---- Finish ----------------------------------------------------
  root.querySelector("#complete").addEventListener("click", () => {
    document.removeEventListener("keydown", onKey);
    const moments = completeLesson(book, chapter, lesson, firstTry === true);
    if (navigator.vibrate) navigator.vibrate(30);
    showCelebrations(app, moments, book, () => {
      const finishedForToday = moments.some((m) => m.type === "daily");
      location.hash = finishedForToday ? "#/" : `#/book/${book.id}`;
    });
  });

  update();
}
