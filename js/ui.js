// ui.js
// Small building blocks reused by several screens.

import { state } from "./progress.js";

// Makes text safe to put inside HTML.
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Turns a string (paragraphs separated by a blank line) or a list into <p> tags.
export function paragraphs(text) {
  const parts = Array.isArray(text) ? text : String(text ?? "").split(/\n\s*\n/);
  return parts.map((p) => `<p>${esc(p.trim())}</p>`).join("");
}

const plural = (n, word) => `${word}${n === 1 ? "" : "s"}`;

export function statsBar() {
  return `
    <div class="stats" aria-label="Your stats">
      <span class="stat" title="Days in a row">🔥 <b>${state.streak}</b> <small>${plural(state.streak, "day")}</small></span>
      <span class="stat" title="Streak freezes saved">🧊 <b>${state.freezes}</b> <small>${plural(state.freezes, "freeze")}</small></span>
      <span class="stat" title="Points">⭐ <b>${state.points}</b> <small>points</small></span>
    </div>`;
}

export function progressBar(fraction) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return `<div class="bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
    <div class="bar-fill" style="width:${percent}%"></div></div>`;
}

// A circular progress ring with a label in the middle.
export function ring(fraction, label = "") {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(1, Math.max(0, fraction)));
  return `
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle class="ring-bg" cx="28" cy="28" r="${r}"></circle>
      <circle class="ring-fg" cx="28" cy="28" r="${r}" transform="rotate(-90 28 28)"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
      <text class="ring-text" x="28" y="32" text-anchor="middle">${esc(label)}</text>
    </svg>`;
}

export function disclaimer(book) {
  return `<p class="disclaimer">Inspired by ideas in <em>${esc(book.title)}</em> by ${esc(book.author)}.
    Not affiliated with or endorsed by the author or publisher.</p>`;
}

export function coverImg(book, extraClass = "") {
  return `<img class="cover ${extraClass}" src="${esc(book.cover)}" alt="Cover for ${esc(book.pathTitle || book.title)}" data-initials="${esc(initials(book.title))}">`;
}

// If a cover image is missing, show a simple coloured tile instead.
export function fixCovers(root) {
  root.querySelectorAll("img.cover").forEach((img) => {
    img.addEventListener("error", () => {
      const tile = document.createElement("div");
      tile.className = img.className + " cover-fallback";
      tile.textContent = img.dataset.initials;
      img.replaceWith(tile);
    });
  });
}

function initials(title) {
  return String(title).split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
}
