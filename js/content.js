// content.js
// Loads books, chapters and lessons from the JSON files in /content.
// Only lessons with "reviewed": true are ever shown to learners.

const cache = {};

async function getJSON(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${path} (status ${response.status})`);
  return response.json();
}

export function loadLibrary() {
  if (!cache.library) cache.library = getJSON("content/library.json");
  return cache.library;
}

// Returns one book with all of its chapters and reviewed lessons:
// { id, title, author, cover, pathTitle, description,
//   chapters: [{ id, number, title, goal, lessons: [...], available }] }
export function loadBook(bookId) {
  if (!cache[bookId]) {
    cache[bookId] = (async () => {
      const library = await loadLibrary();
      const entry = library.books.find((b) => b.id === bookId);
      if (!entry) throw new Error(`No book with id "${bookId}" in library.json`);

      const info = await getJSON(`${entry.folder}/book.json`);

      const chapters = await Promise.all(
        info.chapters.map(async (chapter, index) => {
          let lessons = [];
          if (chapter.file) {
            const data = await getJSON(`${entry.folder}/${chapter.file}`);
            lessons = data.lessons.filter((lesson) => lesson.reviewed === true);
          }
          return { ...chapter, number: index + 1, lessons, available: lessons.length > 0 };
        })
      );

      return { ...entry, ...info, chapters };
    })();
  }
  return cache[bookId];
}

export async function loadAllBooks() {
  const library = await loadLibrary();
  return Promise.all(library.books.map((b) => loadBook(b.id)));
}

// Finds a lesson inside a loaded book.
export function findLesson(book, lessonId) {
  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    const lesson = chapter.lessons.find((l) => l.id === lessonId);
    if (lesson) return { chapter, lesson, chapterIndex: i };
  }
  return null;
}
