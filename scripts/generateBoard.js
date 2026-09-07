import fs from "fs";
import { createCanvas } from "canvas";

const state = JSON.parse(
  fs.readFileSync("./data/state.json", "utf-8")
);

const guesses = state.guesses
  .slice(0, 6)
  .map((guess) => guess.toUpperCase());

const WORD = state.currentWord.toUpperCase();

const COLS = 5;
const ROWS = 6;

const TILE_SIZE = 62;
const GAP = 8;
const PADDING = 4;
const RADIUS = 8;

const COLORS = {
  // GitHub dark
  empty: "#161b22",
  border: "#30363d",
  text: "#f0f6fc",
  mutedText: "#8b949e",

  // Aki pink
  correct: "#f778ba",
  correctText: "#0d1117",

  present: "#9b456f",
  presentText: "#ffffff",

  // Wrong / absent
  absent: "#30363d",
  absentText: "#8b949e",
};

const width =
  PADDING * 2 +
  COLS * TILE_SIZE +
  (COLS - 1) * GAP;

const height =
  PADDING * 2 +
  ROWS * TILE_SIZE +
  (ROWS - 1) * GAP;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

/*
 * IMPORTANT:
 *
 * We intentionally DO NOT paint a canvas background.
 *
 * PNG transparency lets GitHub's actual README background
 * show through instead of faking #0d1117.
 */

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);

  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
    r
  );

  ctx.lineTo(x + r, y + height);
  ctx.arcTo(
    x,
    y + height,
    x,
    y + height - r,
    r
  );

  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);

  ctx.closePath();
}

/*
 * Proper Wordle-style evaluation.
 *
 * This handles duplicate letters correctly instead of simply
 * checking WORD.includes(letter).
 */
function evaluateGuess(guess, word) {
  const result = Array(COLS).fill("absent");
  const remaining = word.split("");

  // Correct position first.
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === word[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Then find letters that exist elsewhere.
  for (let i = 0; i < COLS; i++) {
    if (result[i] === "correct") continue;

    const matchIndex = remaining.findIndex(
      (letter) => letter === guess[i]
    );

    if (matchIndex !== -1) {
      result[i] = "present";
      remaining[matchIndex] = null;
    }
  }

  return result;
}

for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
  const guess = guesses[rowIndex] || "";

  const states = guess
    ? evaluateGuess(guess, WORD)
    : Array(COLS).fill("empty");

  for (let colIndex = 0; colIndex < COLS; colIndex++) {
    const letter = guess[colIndex] || "";
    const state = letter ? states[colIndex] : "empty";

    const x =
      PADDING +
      colIndex * (TILE_SIZE + GAP);

    const y =
      PADDING +
      rowIndex * (TILE_SIZE + GAP);

    let fillColor = COLORS.empty;
    let borderColor = COLORS.border;
    let textColor = COLORS.text;

    if (state === "correct") {
      fillColor = COLORS.correct;
      borderColor = COLORS.correct;
      textColor = COLORS.correctText;
    }

    if (state === "present") {
      fillColor = COLORS.present;
      borderColor = COLORS.present;
      textColor = COLORS.presentText;
    }

    if (state === "absent") {
      fillColor = COLORS.absent;
      borderColor = COLORS.border;
      textColor = COLORS.absentText;
    }

    roundedRect(
      ctx,
      x,
      y,
      TILE_SIZE,
      TILE_SIZE,
      RADIUS
    );

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (letter) {
      ctx.fillStyle = textColor;

      ctx.font =
        '700 31px "DejaVu Sans", Arial, sans-serif';

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        letter,
        x + TILE_SIZE / 2,
        y + TILE_SIZE / 2 + 1
      );
    }
  }
}

const out = fs.createWriteStream(
  "./data/board.png"
);

const stream = canvas.createPNGStream();

stream.pipe(out);

out.on("finish", () => {
  console.log("FlashWordle board updated ✦");
});
