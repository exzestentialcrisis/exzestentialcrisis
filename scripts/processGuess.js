import fs from "fs";

await import("./dailyWord.js");

const stateFile = "./data/state.json";
const responseFile = "./.flashwordle-response.md";

const refreshedBoardFooter = `

### [↻ View the refreshed board](https://github.com/exzestentialcrisis)

<sub>If you can see this reply, the new board has been published and is ready to view ✦</sub>`;

function evaluateGuess(guess, word) {
  const result = Array(5).fill("absent");
  const remaining = word.split("");

  // Correct positions first.
  for (let i = 0; i < 5; i++) {
    if (guess[i] === word[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Then letters in the wrong position.
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

function writeResponse(body) {
  fs.writeFileSync(responseFile, body);
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

  const rawGuess = event.comment?.body?.trim();

  if (!rawGuess) {
    console.log("No comment guess found.");
    return;
  }

  const guess = rawGuess.toUpperCase();

  if (!/^[A-Z]{5}$/.test(guess)) {
    writeResponse(
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
    writeResponse(
      "Today's FlashWordle has already been solved 🩷 Come back for the next one!"
    );

    return;
  }

  if (guesses.length >= 6) {
    writeResponse(
      "Today's board is already full. Better luck next round ✦"
    );

    return;
  }

  if (guesses.includes(guess)) {
    writeResponse(
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
    writeResponse(
      `### ${guess}
${feedback}

**You got it!** 🩷${refreshedBoardFooter}`
    );
  } else if (state.guesses.length >= 6) {
    writeResponse(
      `### ${guess}
${feedback}

Out of guesses — today's word was **${word}**.${refreshedBoardFooter}`
    );
  } else {
    writeResponse(
      `### ${guess}
${feedback}

**${6 - state.guesses.length} guesses remaining.**${refreshedBoardFooter}`
    );
  }

  console.log(`Processed guess: ${guess}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});