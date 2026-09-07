import fs from "fs";
import { WORD_LIST, getDailyWord } from "../lib/words.js";

const stateFile = "./data/state.json";
let state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));

const today = new Date().toISOString().split("T")[0];
if (state.date !== today) {
  const newWord = getDailyWord(); // or pick random from WORD_LIST
  state.currentWord = newWord;
  state.guesses = [];
  state.date = today;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log("New daily word set:", newWord);
} else {
  console.log("Daily word unchanged:", state.currentWord);
}
