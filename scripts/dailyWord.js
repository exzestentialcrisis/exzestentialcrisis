import fs from "fs";
import { getDailyWord } from "../lib/words.js";

const stateFile = "./data/state.json";

const state = JSON.parse(
  fs.readFileSync(stateFile, "utf-8")
);

const today = new Date()
  .toISOString()
  .split("T")[0];

const forceReset =
  process.env.FORCE_RESET === "true";

if (forceReset || state.date !== today) {
  const newWord = getDailyWord();

  state.currentWord = newWord;
  state.guesses = [];
  state.date = today;

  fs.writeFileSync(
    stateFile,
    JSON.stringify(state, null, 2)
  );

  console.log(
    forceReset
      ? "FlashWordle manually reset."
      : `New daily word set: ${newWord}`
  );
} else {
  console.log(
    "Daily word unchanged:",
    state.currentWord
  );
}