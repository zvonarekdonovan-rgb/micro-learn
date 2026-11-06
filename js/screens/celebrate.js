// celebrate.js
// Shows one celebration screen after another:
// lesson complete -> chapter complete -> path complete -> freeze earned -> done for today.

import { state, DAILY_GOAL, bookProgress } from "../progress.js";
import { esc, disclaimer } from "../ui.js";
import { onSwipe } from "../swipe.js";

export function showCelebrations(app, moments, book, onDone) {
  let i = 0;

  function show() {
    if (i >= moments.length) return onDone();
    const moment = moments[i];
    const isLast = i === moments.length - 1;
    const buttonLabel = moment.type === "daily" ? "Finish for today" : isLast ? "Continue" : "Next";

    app.innerHTML = `
      <div class="celebrate celebrate-${moment.type}">
        ${moment.type === "freeze" || moment.type === "daily" ? "" : confetti(moment.type === "lesson" ? 18 : 40)}
        ${screenFor(moment, book)}
        <button class="btn btn-primary btn-big" id="continue">${buttonLabel}</button>
      </div>`;
    const button = app.querySelector("#continue");
    button.addEventListener("click", () => {
      i += 1;
      show();
    });
    onSwipe(app.querySelector(".celebrate"), { left: () => button.click() });
    window.scrollTo(0, 0);
  }

  show();
}

function screenFor(moment, book) {
  switch (moment.type) {
    case "lesson":
      return `
        <svg class="check" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="36"></circle>
          <path d="M24 41 l11 11 l21 -23"></path>
        </svg>
        <h1>Lesson complete</h1>
        <p class="muted">${esc(moment.lesson.title)}</p>
        ${moment.isRepeat
          ? `<p class="small muted">Nice refresher. Points were already counted the first time.</p>`
          : `<p class="points">+${moment.points} points</p>
             ${moment.firstTry ? `<p class="small muted">Includes a bonus for answering right on the first try.</p>` : ""}`}
        <p class="small muted">Today: ${Math.min(state.today.lessons, DAILY_GOAL)} of ${DAILY_GOAL} lessons</p>`;

    case "chapter": {
      const p = bookProgress(book);
      const nextChapter = book.chapters[moment.chapter.number]; // number is 1-based
      return `
        <div class="medal">${moment.chapter.number}</div>
        <h1>Chapter complete</h1>
        <p class="muted">${esc(moment.chapter.title)}</p>
        <p class="points">+${moment.points} points</p>
        <p class="small muted">${p.chaptersDone} of ${p.chaptersTotal} chapters done</p>
        ${nextChapter ? `<p class="unlocked">🔓 Unlocked: ${esc(nextChapter.title)}</p>` : ""}`;
    }

    case "path":
      return `
        <div class="medal medal-big">🏆</div>
        <h1>Path complete</h1>
        <p class="muted">You completed the path <strong>${esc(book.pathTitle)}</strong>, all ${book.chapters.length} chapters.</p>
        <p class="points">+${moment.points} points</p>
        <p class="small muted">Your review cards will keep these ideas fresh.</p>
        ${disclaimer(book)}`;

    case "freeze":
      return `
        <div class="medal medal-ice">🧊</div>
        <h1>You earned a streak freeze</h1>
        <p class="muted">That's ${state.streak} days in a row. If life gets in the way one day,
          a freeze will keep your streak going automatically.</p>
        <p class="small muted">You can save up to 2.</p>`;

    case "daily":
      return `
        <div class="medal medal-moon">🌙</div>
        <h1>You're done for today</h1>
        <p class="muted">You finished ${DAILY_GOAL} lessons. That's your goal for today.
          Resting is part of learning too.</p>
        <p class="streak-line">🔥 ${state.streak}-day streak</p>
        <p class="small muted">Tomorrow you'll have new lessons and a quick review waiting.
          You can still do more today if you want to.</p>`;

    default:
      return "";
  }
}

function confetti(count) {
  const colors = ["#3f7d6e", "#e0a43a", "#d9775b", "#6c8fd1", "#9bc46a"];
  let pieces = "";
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 1.4 + Math.random() * 1;
    const color = colors[i % colors.length];
    pieces += `<span style="left:${left}%;background:${color};animation-delay:${delay}s;animation-duration:${duration}s"></span>`;
  }
  return `<div class="confetti" aria-hidden="true">${pieces}</div>`;
}
