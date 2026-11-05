// app.js
// Starts the app and decides which screen to show based on the URL.
//
//   #/                         -> library
//   #/book/meditations         -> book page
//   #/lesson/meditations/ch01-l1 -> lesson
//   #/review                   -> spaced review session

import { startDay } from "./progress.js";
import { renderLibrary } from "./screens/library.js";
import { renderBook } from "./screens/book.js";
import { renderLesson } from "./screens/lesson.js";
import { renderReview } from "./screens/review.js";

const app = document.getElementById("app");

async function route() {
  startDay();
  window.scrollTo(0, 0);

  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  try {
    if (parts[0] === "book" && parts[1]) {
      await renderBook(app, parts[1]);
    } else if (parts[0] === "lesson" && parts[1] && parts[2]) {
      await renderLesson(app, parts[1], parts[2]);
    } else if (parts[0] === "review") {
      await renderReview(app);
    } else {
      await renderLibrary(app);
    }
  } catch (err) {
    console.error(err);
    const hint =
      location.protocol === "file:"
        ? "It looks like you opened the file directly. Start the app with Live Server instead (see README.md)."
        : "Check the browser console for details. A content file may have a typo.";
    app.innerHTML = `
      <div class="empty">
        <h1>Something went wrong</h1>
        <p>${hint}</p>
        <p class="small muted">${String(err.message).replace(/</g, "&lt;")}</p>
        <a class="btn btn-primary" href="#/">Back to library</a>
      </div>`;
  }
}

window.addEventListener("hashchange", route);
route();
