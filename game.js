// --- Maze config (0 = path, 1 = wall) ---
// Make it 20x20 for a nice size.
const MAZE = [
  "11111111111111111111",
  "10000000001000000001",
  "10111111101011111101",
  "10100000101010000101",
  "10101110101010110101",
  "10101000100010100101",
  "10101011111010101101",
  "10101010000010100001",
  "10101010111110111101",
  "10001010100000100001",
  "11111010101111101111",
  "10000010101000001001",
  "10111110101011111001",
  "10100000101010000001",
  "10101111101010111111",
  "10100000000010100001",
  "10111111111110101101",
  "10000000000000100001",
  "10111111111111111101",
  "11111111111111111111",
].map(r => r.split("").map(c => Number(c)));

const GRID = 20;
const TILE = 32; // canvas is 640px (20*32)
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const winDialog = document.getElementById("winDialog");
const phraseInput = document.getElementById("phrase");
const revealBtn = document.getElementById("revealBtn");
const closeBtn = document.getElementById("closeBtn");
const codeBox = document.getElementById("codeBox");

// --- Player / Goal positions ---
let player = { x: 1, y: 1 };
const goal = { x: 18, y: 17 }; // ❤️

function isWall(x, y) {
  return MAZE[y]?.[x] === 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tiles
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const wall = MAZE[y][x] === 1;
      ctx.fillStyle = wall ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Goal (❤️)
  drawEmoji("❤️", goal.x, goal.y);

  // Player (🙂)
  drawEmoji("🙂", player.x, player.y);
}

function drawEmoji(emoji, x, y) {
  ctx.font = "24px system-ui, Apple Color Emoji, Segoe UI Emoji";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x * TILE + TILE / 2, y * TILE + TILE / 2 + 1);
}

function tryMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (isWall(nx, ny)) return;

  player.x = nx;
  player.y = ny;

  if (player.x === goal.x && player.y === goal.y) {
    statusEl.textContent = "You did it! Open your prize 🎁";
    winDialog.showModal();
    phraseInput.value = "";
    codeBox.classList.add("hidden");
    codeBox.textContent = "";
  } else {
    statusEl.textContent = "Keep going…";
  }

  draw();
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (winDialog.open) return;

  if (k === "arrowup" || k === "w") tryMove(0, -1);
  if (k === "arrowdown" || k === "s") tryMove(0, 1);
  if (k === "arrowleft" || k === "a") tryMove(-1, 0);
  if (k === "arrowright" || k === "d") tryMove(1, 0);
});

// --- Prize reveal ---
// Put your real KeyForge code here:
const KEYFORGE_CODE = "PASTE-YOUR-REAL-CODE-HERE";

// Optional phrase gate to slow down casual snooping:
const SECRET_PHRASE = "i choose you"; // change to your phrase

revealBtn.addEventListener("click", () => {
  const guess = (phraseInput.value || "").trim().toLowerCase();
  if (guess !== SECRET_PHRASE) {
    codeBox.classList.remove("hidden");
    codeBox.textContent = "Nope 😈 Try the phrase again.";
    return;
  }
  codeBox.classList.remove("hidden");
  codeBox.textContent = `Your KeyForge code: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());

// First render
draw();
