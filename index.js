import axios from "axios";
// import cron from "node-cron";
// don't need cron without ability to pull automatically
import env from "dotenv";
import { input } from "@inquirer/prompts";
import chalk from "chalk";

env.config();
// console.log(process.env.API_KEY);

const baseURL = `https://apiv2.legiontd2.com`;

async function getPlayerID(nickname) {
  try {
    let data = await axios({
      method: "get",
      url: `${baseURL}/players/byName/${nickname}`,
      responseType: "json",
      headers: {
        "x-api-key": process.env.API_KEY,
      },
    });
    return data.data._id;
  } catch (error) {
    return 0;
  }
}

async function getHistory(playerID) {
  let data = await axios({
    method: "get",
    url: `${baseURL}/players/matchHistory/${encodeURIComponent(
      playerID
    )}?limit=20&offset=0&countResults=false`,
    responseType: "json",
    headers: {
      "x-api-key": process.env.API_KEY,
    },
  });
  let matchHistory = data.data;

  // for each match, find player's data, then loop those to check for what wave 1 was
  matchHistory = matchHistory.map((match) =>
    match.playersData.filter((el) => el["playerId"] === playerID)
  );

  let snailCount = 0;
  let kingUpCount = 0;
  let saveCount = 0;
  let playstyles = [];
  let allLeakData = [];
  // grab conuts for each match
  matchHistory.forEach((userData) => {
    userData = userData[0];
    // Playstyle
    playstyles.push(userData.legion);
    // Leak Data - arrays of arrays to be analyzed after initial data presented to user
    allLeakData.push(userData.leaksPerWave);
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
    allLeaks: allLeakData,
  };
}

// main();

// Terminal Fun
async function run() {
  console.log(
    "Welcome to SuperScout for LTD2\n Press Ctrl + C to exit this program at any time.\n\n"
  );
  // 👇🏻 Can't auto pull live game data, so commenting this out until I do something with user data
  // const primaryName = await input({
  //   message: "What is your LTD2 Player Name? ",
  // });

  // let myID = await getPlayerID(primaryName);
  // let historyObj = await getHistory(myID);

  opponentLoop();
}
run();
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
  let opp1History, opp2History;
  if (opp1ID === 0) {
    console.log(
      "There was an error fetching data for ",
      opp1,
      " please try again"
    );
  } else {
    opp1History = await getHistory(opp1ID);
  }
  let opp2ID = await getPlayerID(opp2);
  if (opp2ID === 0) {
    console.log(
      "There was an error fetching data for ",
      opp2,
      " please try again"
    );
  } else {
    opp2History = await getHistory(opp2ID);
  }

  // display info
  // Opp 1
  if (opp1ID !== 0) {
    outputOpponentInfoQuick(opp1, opp1History);
    console.log();
    console.log();
    console.log();
  }
  console.log("--------------");
  // Opp 2
  if (opp2ID !== 0) {
    outputOpponentInfoQuick(opp2, opp2History);
    console.log();
    console.log();
    console.log();
    console.log("--------------");
    console.log();
  }
  // Now process more useful info, clear term and immediately write back info
  if (opp1ID === 0 && opp2ID === 0) {
  } else {
    console.clear();
    if (opp1ID !== 0) {
      detailedBreakdown(opp1, opp1History);
    }
    if (opp2ID !== 0) {
      detailedBreakdown(opp2, opp2History);
    }
  }
  // --- End advanced Info Processing

  await input({
    message:
      "Press Enter to begin collecting information on your next opponents.",
  });
  opponentLoop();
}

function outputOpponentInfoQuick(oppName, oppHistory) {
  console.log(chalk.white("Opponent: ", oppName));
  console.log();
  console.log(chalk.white("Wave 1 Trends (Last 20 games):"));
  console.log(
    chalk.cyanBright("Snail:   "),
    chalk.bgCyan(" ".repeat(oppHistory.snails))
  );
  console.log(
    chalk.yellowBright("King Up: "),
    chalk.bgYellow(" ".repeat(oppHistory.kingUp))
  );
  console.log(
    chalk.redBright("Save:    "),
    chalk.bgRed(" ".repeat(oppHistory.save))
  );
  console.log();
  console.log(chalk.white("Playstyles:"));
  Object.keys(oppHistory.playstyles).forEach((playstyle) => {
    console.log(
      playstyle,
      " ".repeat(Math.max(0, 15 - playstyle.length)),
      ": ",
      chalk.bgWhite(" ".repeat(oppHistory.playstyles[playstyle]))
    );
  });
}

function detailedBreakdown(oppName, oppHistory) {
  let leaks = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    21: 0,
  };

  oppHistory.allLeaks.forEach((game) => {
    game.forEach((waveLeaks, i) => {
      if (waveLeaks.length > 0) {
        leaks[i + 1] = leaks[i + 1] + 1;
      }
    });
  });
  outputOpponentInfoQuick(oppName, oppHistory);
  // Note that this will run over for larger sets of game data (or if someone leaks small amounts very reguarly)
  // Also worth considering that later waves will generally have more leaks / time reached

  console.log("Times Leaked Recently:");
  Object.keys(leaks).forEach((wave) => {
    console.log(
      wave,
      wave < 10 ? "  " : " ",
      ": ",
      chalk.bgWhite(" ".repeat(leaks[wave]))
    );
  });
  console.log();
  console.log("---------------------");
}
