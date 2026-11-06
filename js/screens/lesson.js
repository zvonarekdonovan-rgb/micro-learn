// lesson.js
// A lesson is 5 swipeable cards: hook, idea, example, quiz, action.
// Swipe (drag or quick flick) left/right, use the Back/Next buttons, or the arrow keys.

import { loadBook, findLesson } from "../content.js";
import { isChapterUnlocked, completeLesson } from "../progress.js";
import { esc, paragraphs } from "../ui.js";
import { showCelebrations } from "./celebrate.js";
import { tick } from "../swipe.js";

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
    { type: "hook", label: "Hook", body: `<h2>${esc(lesson.title)}</h2><p class="lead">${esc(lesson.hook)}</p>
      <p class="swipe-hint" aria-hidden="true">Swipe to continue <span>←</span></p>` },
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
        <div class="deck deck-2" aria-hidden="true"></div>
        <div class="deck deck-1" aria-hidden="true"></div>
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
  const cardEls = slides.map((slide) => slide.querySelector(".card"));
  const deck1 = root.querySelector(".deck-1");
  const deck2 = root.querySelector(".deck-2");

  // ---- Moving between cards -------------------------------------
  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((slide, i) => {
      slide.inert = i !== index; // hide off-screen cards from keyboard
      slide.classList.toggle("current", i === index);
    });
    cardEls[index].style.transform = ""; // drop any drag tilt
    // The stack underneath shrinks as you work through the lesson.
    const left = cards.length - 1 - index;
    deck1.classList.toggle("gone", left < 1);
    deck2.classList.toggle("gone", left < 2);
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
  let startY = 0;
  let dragX = 0;
  let dragging = false;
  let justDragged = false;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0; // px per ms, negative = moving left

  // Can the user move from the current card in this direction?
  function canMove(direction) {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return false;
    if (direction > 0 && index === QUIZ_INDEX && !quizSolved) return false;
    return true;
  }

  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastTime = e.timeStamp;
    dragX = 0;
    velocity = 0;
    dragging = false;
  });
  viewport.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    dragX = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragging) {
      // Moving mostly up/down? That's scrolling the card, not a swipe.
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dragX)) { startX = null; return; }
      if (Math.abs(dragX) < 10) return;
      dragging = true;
      track.style.transition = "none"; // follow the finger exactly
      cardEls[index].classList.add("dragging");
      viewport.setPointerCapture?.(e.pointerId);
    }

    const dt = e.timeStamp - lastTime;
    if (dt > 0) velocity = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * velocity;
    lastX = e.clientX;
    lastTime = e.timeStamp;

    // Rubber-band when there's nowhere to go (first card, last card, unanswered quiz).
    const blocked = !canMove(dragX < 0 ? 1 : -1);
    const shown = blocked ? dragX * 0.25 : dragX;
    track.style.transform = `translateX(calc(${-index * 100}% + ${shown}px))`;
    // Tilt the card a little, like holding it by the bottom.
    const tilt = Math.max(-6, Math.min(6, shown * 0.03));
    cardEls[index].style.transform = `rotate(${tilt}deg)`;
  });
  function endDrag() {
    if (startX === null) return;
    startX = null;
    track.style.transition = "";
    cardEls[index].classList.remove("dragging");
    justDragged = dragging;
    setTimeout(() => (justDragged = false), 0);
    if (!dragging) return;
    dragging = false;

    // A long drag or a quick flick both count.
    const flick = Math.abs(velocity) > 0.4 && Math.abs(dragX) > 20 && Math.sign(velocity) === Math.sign(dragX);
    const direction = dragX < 0 ? 1 : -1;
    if (Math.abs(dragX) > SWIPE_DISTANCE || flick) {
      if (canMove(direction)) tick();
      go(index + direction);
    } else {
      update(); // snap back
    }
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
