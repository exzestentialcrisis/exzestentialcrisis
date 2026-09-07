import fs from "fs";
import { Octokit } from "octokit";

await import("./dailyWord.js");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const stateFile = "./data/state.json";

const repository =
  process.env.GITHUB_REPOSITORY ||
  "exzestentialcrisis/github-flashwordle";

const [repoOwner, repoName] = repository.split("/");

function evaluateGuess(guess, word) {
  const result = Array(5).fill("absent");
  const remaining = word.split("");

  // Exact matches first
  for (let i = 0; i < 5; i++) {
    if (guess[i] === word[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Then letters in the wrong position
  for (let i = 0; i < 5; i++) {
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

function feedbackString(states) {
  return states
    .map((state) => {
      if (state === "correct") return "🩷";
      if (state === "present") return "💗";
      return "⬛";
    })
    .join("");
}

async function reply(issueNumber, body) {
  await octokit.rest.issues.createComment({
    owner: repoOwner,
    repo: repoName,
    issue_number: issueNumber,
    body,
  });
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath) {
    console.log("No GitHub event found.");
    return;
  }

  const event = JSON.parse(
    fs.readFileSync(eventPath, "utf-8")
  );

  // Only comments count as guesses now.
  const rawGuess = event.comment?.body?.trim();

  if (!rawGuess) {
    console.log("No comment guess found.");
    return;
  }

  const guess = rawGuess.toUpperCase();

  const issueNumber = event.issue?.number;

  if (!issueNumber) {
    console.log("No issue number found.");
    return;
  }

  if (!/^[A-Z]{5}$/.test(guess)) {
    await reply(
      issueNumber,
      "FlashWordle only accepts **5-letter guesses**. Try again ✦"
    );

    return;
  }

  const state = JSON.parse(
    fs.readFileSync(stateFile, "utf-8")
  );

  const word = state.currentWord.toUpperCase();
  const guesses = state.guesses || [];

  if (guesses.includes(word)) {
    await reply(
      issueNumber,
      "Today's FlashWordle has already been solved 🩷 Come back for the next one!"
    );

    return;
  }

  if (guesses.length >= 6) {
    await reply(
      issueNumber,
      "Today's board is already full. Better luck next round ✦"
    );

    return;
  }

  if (guesses.includes(guess)) {
    await reply(
      issueNumber,
      `**${guess}** has already been guessed.`
    );

    return;
  }

  const states = evaluateGuess(guess, word);

  state.guesses.push(guess);

  fs.writeFileSync(
    stateFile,
    JSON.stringify(state, null, 2)
  );

  await import(
    `./generateBoard.js?update=${Date.now()}`
  );

  const feedback = feedbackString(states);

  if (guess === word) {
    await reply(
      issueNumber,
      `### ${guess}\n${feedback}\n\n**You got it!** 🩷`
    );
  } else if (state.guesses.length >= 6) {
    await reply(
      issueNumber,
      `### ${guess}\n${feedback}\n\nOut of guesses — today's word was **${word}**.`
    );
  } else {
    await reply(
      issueNumber,
      `### ${guess}\n${feedback}\n\n**${6 - state.guesses.length} guesses remaining.**`
    );
  }

  console.log(`Processed guess: ${guess}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});