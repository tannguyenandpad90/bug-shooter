import puppeteer from "puppeteer";

const URL = "http://localhost:5173";
const DIR = "./screenshots";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 860, height: 720 },
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });
  await sleep(2000);

  // 1. Title screen
  console.log("📸 Capturing title screen...");
  await page.screenshot({ path: `${DIR}/01-title-screen.png` });

  // 2. Start game
  console.log("📸 Starting game...");
  await page.keyboard.press("Enter");
  await sleep(1500);

  // 3. Early gameplay — move around and shoot
  console.log("📸 Capturing early gameplay...");
  await page.keyboard.down("Space");
  await page.keyboard.down("ArrowRight");
  await sleep(1500);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.down("ArrowLeft");
  await sleep(1000);
  await page.keyboard.up("ArrowLeft");
  await sleep(500);
  await page.screenshot({ path: `${DIR}/02-gameplay.png` });

  // 4. Play more to build combo
  console.log("📸 Building combo...");
  // Move around to dodge and shoot
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down(i % 2 === 0 ? "ArrowRight" : "ArrowLeft");
    await sleep(600);
    await page.keyboard.up(i % 2 === 0 ? "ArrowRight" : "ArrowLeft");
  }
  await page.screenshot({ path: `${DIR}/03-combat.png` });

  // 5. Keep playing to get damage / powerups
  console.log("📸 More gameplay...");
  for (let i = 0; i < 15; i++) {
    const dir = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"][i % 4];
    await page.keyboard.down(dir);
    await sleep(400);
    await page.keyboard.up(dir);
  }
  await page.screenshot({ path: `${DIR}/04-action.png` });

  // 6. Try dash
  console.log("📸 Capturing dash...");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Shift");
  await sleep(200);
  await page.screenshot({ path: `${DIR}/05-dash.png` });
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");

  // 7. Keep playing to hopefully die for game over
  console.log("📸 Playing to game over...");
  await page.keyboard.up("Space");
  // Stop shooting, stand still to get hit
  await page.keyboard.down("ArrowUp");
  await sleep(500);
  await page.keyboard.up("ArrowUp");

  // Wait for enemies to overwhelm
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    // Check if game over overlay appeared
    const gameOver = await page.$("[class*='overlay']");
    if (gameOver) {
      console.log("📸 Game Over detected!");
      await sleep(600);
      await page.screenshot({ path: `${DIR}/06-gameover.png` });

      // Type name and save
      await sleep(300);
      await page.keyboard.type("DevHunter", { delay: 50 });
      await sleep(300);
      await page.screenshot({ path: `${DIR}/07-enter-name.png` });

      await page.keyboard.press("Enter");
      await sleep(1000);
      await page.screenshot({ path: `${DIR}/08-leaderboard.png` });
      break;
    }
  }

  await browser.close();
  console.log("✅ All screenshots saved to ./screenshots/");
}

main().catch(console.error);
