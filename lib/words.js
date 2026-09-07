// lib/words.js
export const WORD_LIST = ["APPLE", "BANJO", "CRANE", "DELTA", "EAGLE"];

// pick the daily word (simple example)
export const getDailyWord = () => {
  const startDate = new Date("2025-01-01"); // reference start
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const index = diffDays % WORD_LIST.length;
  return WORD_LIST[index];
};
