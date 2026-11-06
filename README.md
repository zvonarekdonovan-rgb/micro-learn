# Micro Paths

A mobile-first micro-learning web app. Pick a book from the library and work
through a short, original learning path inspired by its ideas: 20 chapters,
3 lessons each, 2–3 minutes per lesson.

Plain HTML, CSS and JavaScript. No install, no build step, no login.
Progress is saved in the browser on this device.

---

## How to run it

Browsers block pages opened by double-clicking from loading the JSON content
files, so the app needs a small local web server. The easiest is the
**Live Server** extension for VS Code.

1. In VS Code, open the Extensions panel (`Ctrl+Shift+X`), search for
   **Live Server** (by Ritwick Dey) and click **Install**.
2. Open the `micro-learn` folder in VS Code (**File → Open Folder…**).
3. Right-click `index.html` and choose **Open with Live Server**.
4. Your browser opens at something like `http://127.0.0.1:5500`.

Live Server reloads the page automatically when you save a file.

**On your phone:** if your phone is on the same Wi-Fi, open
`http://<your-computer's-IP>:5500` (find the IP with `ipconfig` in a
terminal, under "IPv4 Address"). Windows may ask you to allow access through
the firewall the first time.

**Phone view on your computer:** press `F12` in Chrome or Edge, then click
the phone/tablet icon (or press `Ctrl+Shift+M`).

---

## How the app works

| Rule | Where to change it |
|---|---|
| Chapters unlock in order; a chapter is complete when its 3 lessons are done | `js/progress.js` |
| Daily goal: 3 lessons, then "You're done for today" | `DAILY_GOAL` in `js/progress.js` |
| Points: 10 per lesson, +5 for a first-try quiz answer, +50 per chapter, +500 per path, +2 per review answer you get right | `POINTS` in `js/progress.js` |
| Streak: one lesson or review per day keeps it going | `js/progress.js` |
| Streak freeze: earn 1 every 7-day streak, hold up to 2; used automatically on a missed day | `FREEZE_EVERY`, `MAX_FREEZES` |
| Spaced review: ideas return after 1, 3, 7, 14, then 30 days; a wrong answer resets to 1 day | `REVIEW_STEPS` |

### Files

```
index.html               the single page the app runs in
css/styles.css           all styling
js/app.js                picks which screen to show from the URL
js/content.js            loads the JSON content (only "reviewed": true lessons)
js/progress.js           all the rules: unlocking, points, streaks, review
js/storage.js            saves/loads progress in localStorage
js/ui.js                 small shared pieces (progress bar, ring, stats…)
js/screens/*.js          one file per screen
content/library.json     list of books
content/books/<book>/    book.json (path + 20 chapters) and chapter files
covers/                  cover images
```

---

## How to test it

Work through this checklist in the browser:

1. **Library:** you see the cover, title, author, path name and "0 of 60 lessons".
2. **Book page:** Chapter 1 is open, Chapter 2 is locked 🔒, Chapters 3–20 are locked.
3. **Lesson:** swipe left/right (or use Back/Next, or the arrow keys).
   You can't get past the quiz until you answer it.
4. **Quiz:** pick a wrong answer (red, shake, "try again"), then the right one
   (green with an explanation).
5. **Complete:** check animation, confetti and points appear.
6. Finish all 3 lessons of Chapter 1: you see "Chapter complete", and
   "Done for today" after your 3rd lesson of the day. Chapter 2 is now unlocked.
7. **Phone swipes** (open DevTools device mode, or use a real phone):
   - Book page: swipe right to go back to the library.
   - Lesson: a short quick flick also changes cards; the first/last card and an
     unanswered quiz "rubber-band" instead of moving. Scrolling a long card up/down
     doesn't turn into a sideways swipe.
   - Review: after answering, swipe left for the next question.
   - Celebration screens: swipe left to continue.
8. **Persistence:** refresh the page. All your progress is still there.

### Testing time-based features (streaks, freezes, reviews)

Open the browser console (`F12` → **Console** tab) and type:

```js
devTools.pretendDaysPassed(1)   // acts as if one day went by
devTools.giveFreeze()           // adds a streak freeze
devTools.reset()                // wipes all progress
```

- **Review:** finish a lesson, run `devTools.pretendDaysPassed(1)`, and a
  "Quick review" card appears in the library.
- **Streak:** finish a lesson, pretend 1 day passed, finish another one. The
  streak becomes 2.
- **Streak freeze:** finish a lesson, run `devTools.giveFreeze()`, then
  `devTools.pretendDaysPassed(2)`. You see a message that the freeze covered
  the missed day.
- **Missed day without a freeze:** pretend 2 days passed. The streak restarts
  with a friendly "Welcome back" message.

There's also a **Reset progress** button at the bottom of the library.

---

## How to add content

All content is in `content/`. JSON is strict: use double quotes, put commas
between items, and leave no comma after the last item. If the app shows
"Something went wrong" after an edit, check the console (`F12`): it names the
file that failed. You can paste JSON into a validator like jsonlint.com.

### Add a new book

1. Create a folder: `content/books/my-book/`
2. Add it to `content/library.json`:

```json
{
  "books": [
    { "id": "meditations", "...": "..." },
    {
      "id": "my-book",
      "title": "Book Title",
      "author": "Author Name",
      "cover": "covers/my-book.png",
      "folder": "content/books/my-book"
    }
  ]
}
```

The `id` must be unique, lowercase, and contain no spaces or slashes.

3. Create `content/books/my-book/book.json` with the path title,
   description and 20 chapters (copy the Meditations one as a starting point):

```json
{
  "pathTitle": "Your Original Path Name",
  "description": "One sentence about what the learner gains.",
  "chapters": [
    { "id": "ch01", "title": "Original Title About What You Gain", "goal": "Short subtitle.", "file": "chapter-01.json" },
    { "id": "ch02", "title": "Another Original Title", "file": null }
  ]
}
```

`"file": null` means "Coming soon".

### Add or replace a cover

1. Put your image in `covers/`, e.g. `covers/my-book.png` (`.png`, `.jpg`,
   `.webp` and `.svg` all work). A 2:3 portrait shape looks best, e.g.
   800×1200.
2. Set `"cover": "covers/my-book.png"` for that book in `library.json`.

If the image can't be found, the app shows a simple tile with the book's
initials. Covers must be your own and must not copy or imitate a published
cover, its artwork or logos.

### Add a chapter

1. Create `content/books/<book>/chapter-03.json` (see the lesson format below).
2. In that book's `book.json`, change the chapter's `"file": null` to
   `"file": "chapter-03.json"`.

Chapter order in `book.json` is the order learners unlock chapters, so put
chapters in the order the learner needs them.

### Add a lesson

Each chapter file holds a `lessons` list with 3 lessons:

```json
{
  "lessons": [
    {
      "id": "ch03-l1",
      "title": "Lesson Title",
      "minutes": 3,
      "reviewed": false,
      "hook": "A short question or scene that grabs attention.",
      "idea": "The core idea in plain words.\n\nA blank line (\\n\\n) starts a new paragraph.",
      "example": "An original, everyday example.",
      "quiz": {
        "question": "One question?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": 1,
        "explanation": "Why the right answer is right."
      },
      "action": "One small thing to try today."
    }
  ]
}
```

- `id` must be unique within the book (the pattern `chNN-lN` keeps it simple).
- `answer` counts from **0**: `0` is the first option, `1` the second, and so on.
- **`reviewed`**: lessons only appear in the app when this is `true`. Keep new
  lessons at `false` until you've checked them, then switch them to `true`.
- A chapter only counts as complete when it has 3 reviewed lessons.

### Content rules (for every book)

- Use original wording, structure and examples. No direct quotes.
- Give every chapter an original title based on what the learner gains.
  Don't reuse or closely reword the book's chapter titles, section headings
  or table of contents.
- Order chapters by what the learner needs, not by the book's order.
- Don't reuse the book's text, stories, case studies, metaphors, exercises or
  distinctive frameworks.
- The app automatically shows: "Inspired by ideas in [Book] by [Author]. Not
  affiliated with or endorsed by the author or publisher."
