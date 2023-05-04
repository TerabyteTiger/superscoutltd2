import axios from "axios";
import cron from "node-cron";
import env from "dotenv";
import { input } from "@inquirer/prompts";
import chalk from "chalk";

env.config();
// console.log(process.env.API_KEY);

const baseURL = `https://apiv2.legiontd2.com`;

async function getPlayerID(nickname) {
  let data = await axios({
    method: "get",
    url: `${baseURL}/players/byName/${nickname}`,
    responseType: "json",
    headers: {
      "x-api-key": process.env.API_KEY,
    },
  });
  return data.data._id;
}

async function getHistory(playerID) {
  let data = await axios({
    method: "get",
    url: `${baseURL}/players/matchHistory/${playerID}?limit=20&offset=0&countResults=false`,
    responseType: "json",
    headers: {
      "x-api-key": process.env.API_KEY,
    },
  });
  let matchHistory = data.data;
  console.log(matchHistory);

  // for each match, find player's data, then loop those to check for what wave 1 was
  matchHistory = matchHistory.map((match) =>
    match.playersData.filter((el) => el["playerId"] === playerID)
  );

  let snailCount = 0;
  let kingUpCount = 0;
  let saveCount = 0;
  let playstyles = [];
  // grab conuts for each match
  matchHistory.forEach((userData) => {
    userData = userData[0];
    // Playstyle
    playstyles.push(userData.legion);
    // Wave 1
    if (userData.mercenariesSentPerWave[0].length) {
      snailCount = snailCount + 1;
    } else if (userData.kingUpgradesPerWave[0].length) {
      kingUpCount = kingUpCount + 1;
    } else {
      saveCount = saveCount + 1;
    }
  });

  // stolen from StackOverflow :)
  // https://stackoverflow.com/questions/5667888/counting-the-occurrences-frequency-of-array-elements
  const occurrences = playstyles.reduce(function (acc, curr) {
    return acc[curr] ? ++acc[curr] : (acc[curr] = 1), acc;
  }, {});

  return {
    snails: snailCount,
    kingUp: kingUpCount,
    save: saveCount,
    playstyles: occurrences,
  };
}

// main();

// Terminal Fun
async function run() {
  console.log(
    "Welcome to SuperScout for LTD2\n Press Ctrl + C to exit this program at any time.\n\n"
  );
  const primaryName = await input({
    message: "What is your LTD2 Player Name? ",
  });

  let myID = await getPlayerID(primaryName);
  let historyObj = await getHistory(myID);

  opponentLoop();
}
// run();
// console.log(chalk.blue.bgGreen(" ".repeat(3)));

async function opponentLoop() {
  let opp1 = await input({
    message: "What is Opponent #1's Username?",
  });
  let opp2 = await input({
    message: "What is Opponent #2's Username?",
  });
  console.log(chalk.red("Please wait - loading data..."));
  let opp1ID = await getPlayerID(opp1);
  let opp1History = await getHistory(opp1ID);
  let opp2ID = await getPlayerID(opp2);
  let opp2History = await getHistory(opp2ID);

  // display info
  // Opp 1
  console.log(chalk.white.bgYellow("Opponent #1: ", opp1));
  console.log();
  console.log(chalk.white("Wave 1 Trends:"));
  console.log(
    chalk.cyanBright("Snail: "),
    chalk.bgCyan(" ".repeat(opp1History.snails))
  );
  console.log(
    chalk.yellowBright("King Up: "),
    chalk.bgYellow(" ".repeat(opp1History.kingUp))
  );
  console.log(
    chalk.redBright("Save: "),
    chalk.bgRed(" ".repeat(opp1History.save))
  );
  console.log();
  console.log(chalk.white("Playstyles:"));
  Object.keys(opp1History.playstyles).forEach((playstyle) => {
    console.log(
      playstyle,
      ": ",
      chalk.bgWhite(" ".repeat(opp1History[playstyle]))
    );
  });
  console.log("--------------");
  // Opp 2
  console.log(chalk.white.bgYellow("Opponent #2: ", opp2));
  console.log();
  console.log(chalk.white("Wave 1 Trends:"));
  console.log(
    chalk.cyanBright("Snail: "),
    chalk.bgCyan(" ".repeat(opp2History.snails))
  );
  console.log(
    chalk.yellowBright("King Up: "),
    chalk.bgYellow(" ".repeat(opp2History.kingUp))
  );
  console.log(
    chalk.redBright("Save: "),
    chalk.bgRed(" ".repeat(opp2History.save))
  );
  console.log();
  console.log(chalk.white("Playstyles:"));
  Object.keys(opp2History.playstyles).forEach((playstyle) => {
    console.log(
      playstyle,
      ": ",
      chalk.bgWhite(" ".repeat(opp2History[playstyle]))
    );
  });

  await input({
    message:
      "Press Enter to begin collecting information on your next opponents.",
  });
  opponentLoop();
}
