const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const winDialog = document.getElementById("winDialog");
const phraseInput = document.getElementById("phrase");
const revealBtn = document.getElementById("revealBtn");
const closeBtn = document.getElementById("closeBtn");
const codeBox = document.getElementById("codeBox");
const newMazeBtn = document.getElementById("newMazeBtn");

// NEW: start dialog
const startDialog = document.getElementById("startDialog");
const startBtn = document.getElementById("startBtn");

// Put your real KeyForge code here:
const KEYFORGE_CODE = "PASTE-YOUR-REAL-CODE-HERE";
const SECRET_PHRASE = "feet420";
const WRONG_MESSAGES = [
  "Nope! Pro tip: enter the Correct Code.",
  "Have you considered thinking harder?",
  "Hint: That’s Not It.",
  "Bold Choice. Wrong One.",
  "Interesting. Incorrect.",
  "Still Wrong",
  "Last tip: hotel room!",
  "Again?",
  "This is taking longer than expected."
];

let wrongMsgIndex = 0;


// --- Maze size + tile size ---
// 41x41 fits perfectly with 16px tiles: 41*16 = 656
const GRID = 41;               // MUST be odd
const TILE = 16;               // Pokémon-ish tile size
canvas.width = GRID * TILE;
canvas.height = GRID * TILE;

// 0 = path, 1 = wall
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID - 2, y: GRID - 2 };

let animTick = 0;

// NEW: game lock until Start
let gameStarted = false;

// Palette closer to Emerald route grass/trees
const PAL = {
  grassA: "#7ecf97",
  grassB: "#73c98f",
  grassDot1: "rgba(255,255,255,0.16)",
  grassDot2: "rgba(0,0,0,0.07)",

  pathA: "#9edbb0",
  pathB: "#8fd3a6",
  pathSpeck: "rgba(255,255,255,0.10)",

  // Tree colors (richer + more depth)
  treeEdge: "#a7f0bf",
  treeLeaf1: "#3aa85f",
  treeLeaf2: "#2f8f52",
  treeLeaf3: "#257344",
  treeShadow: "rgba(0,0,0,0.22)",
  treeTrunk: "#7a5a3a",
  treeTrunkDark: "#5f442c",

  flowerWhite: "rgba(255,255,255,0.38)",
  flowerPink: "rgba(255,80,120,0.60)",
};

// ---------- Utils ----------
function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID && y < GRID; }

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isWall(x,y){
  return !inBounds(x,y) || maze[y][x] === 1;
}

function fillRect(x,y,w,h,c){
  ctx.fillStyle = c;
  ctx.fillRect(x,y,w,h);
}

function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) ^ (x << 13);
  n = (n ^ (n >> 15)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

// ---------- Perfect Maze (DFS) ----------
function generateMaze(){
  maze = Array.from({length: GRID}, () => Array(GRID).fill(1));

  const stack = [];
  const start = { x: 1, y: 1 };
  maze[start.y][start.x] = 0;
  stack.push(start);

  const dirs = [
    { dx: 0, dy: -2 },
    { dx: 0, dy:  2 },
    { dx: -2, dy: 0 },
    { dx:  2, dy: 0 },
  ];

  while(stack.length){
    const cur = stack[stack.length - 1];
    const options = [];

    for(const d of dirs){
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if(inBounds(nx,ny) && maze[ny][nx] === 1){
        options.push({ nx, ny, wx: cur.x + d.dx/2, wy: cur.y + d.dy/2 });
      }
    }

    if(options.length === 0){
      stack.pop();
    } else {
      const pick = shuffle(options)[0];
      maze[pick.wy][pick.wx] = 0;
      maze[pick.ny][pick.nx] = 0;
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  player = { x: 1, y: 1 };
  goal = { x: GRID - 2, y: GRID - 2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = gameStarted ? "Find me… 🖤" : "Waiting to start…";
  draw();
}

// ---------- Tiles ----------
function drawGrassTile(px, py, seed){
  const base = (seed % 2 === 0) ? PAL.grassA : PAL.grassB;
  fillRect(px, py, TILE, TILE, base);

  ctx.fillStyle = PAL.grassDot1;
  const dots = [[3,4],[11,3],[7,9],[13,12],[4,13],[9,6]];
  for(const [dx,dy] of dots){
    if(((seed + dx*7 + dy*13) % 3) === 0) ctx.fillRect(px+dx, py+dy, 1, 1);
  }

  ctx.fillStyle = PAL.grassDot2;
  if((seed % 5) === 0) ctx.fillRect(px+2, py+11, 1, 1);
  if((seed % 7) === 0) ctx.fillRect(px+12, py+8, 1, 1);
}

function drawPathTile(px, py, seed){
  const base = (seed % 2 === 0) ? PAL.pathA : PAL.pathB;
  fillRect(px, py, TILE, TILE, base);

  ctx.fillStyle = PAL.pathSpeck;
  if(seed % 4 === 0) ctx.fillRect(px+5, py+5, 1, 1);
  if(seed % 6 === 0) ctx.fillRect(px+10, py+9, 1, 1);
}

function wallNeighborsMask(gx, gy){
  const up = isWall(gx, gy-1) ? 1 : 0;
  const right = isWall(gx+1, gy) ? 2 : 0;
  const down = isWall(gx, gy+1) ? 4 : 0;
  const left = isWall(gx-1, gy) ? 8 : 0;
  return up | right | down | left;
}

function drawTreeWall(px, py, neighborsMask, seed){
  fillRect(px, py, TILE, TILE, PAL.treeLeaf3);

  fillRect(px, py, TILE, 7, PAL.treeLeaf1);
  fillRect(px+1, py+6, TILE-2, 8, PAL.treeLeaf2);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  if(seed % 3 === 0) ctx.fillRect(px+4, py+4, 2, 1);
  if(seed % 5 === 0) ctx.fillRect(px+10, py+5, 1, 2);
  if(seed % 7 === 0) ctx.fillRect(px+6, py+9, 2, 1);

  if(seed % 9 === 0){
    ctx.fillStyle = PAL.treeTrunkDark;
    ctx.fillRect(px+7, py+11, 2, 4);
    ctx.fillStyle = PAL.treeTrunk;
    ctx.fillRect(px+7, py+11, 1, 4);
  }

  ctx.fillStyle = PAL.treeEdge;
  const topOpen = !(neighborsMask & 1);
  const rightOpen = !(neighborsMask & 2);
  const bottomOpen = !(neighborsMask & 4);
  const leftOpen = !(neighborsMask & 8);

  if(topOpen) ctx.fillRect(px+2, py, TILE-4, 2);
  if(leftOpen) ctx.fillRect(px, py+2, 2, TILE-4);
  if(rightOpen) ctx.fillRect(px+TILE-2, py+2, 2, TILE-4);
  if(bottomOpen) ctx.fillRect(px+2, py+TILE-2, TILE-4, 2);

  ctx.fillStyle = PAL.treeShadow;
  ctx.fillRect(px, py+TILE-2, TILE, 2);
  ctx.fillRect(px+TILE-2, py, 2, TILE);
}

function drawFlowers(px, py, seed){
  if ((seed % 17) !== 0) return;

  ctx.fillStyle = PAL.flowerWhite;
  ctx.fillRect(px + 4, py + 6, 1, 1);
  ctx.fillRect(px + 11, py + 9, 1, 1);

  ctx.fillStyle = PAL.flowerPink;
  ctx.fillRect(px + 5, py + 7, 1, 1);
  ctx.fillRect(px + 10, py + 10, 1, 1);
}

function drawHouse(px, py, variant = 0){
  const roof = variant === 0 ? "#c94a4a" : "#4a7bc9";
  const roofDark = variant === 0 ? "#8f2f2f" : "#2f4d8f";
  const wall = "#d6c7a6";
  const wallDark = "#b8aa8d";
  const door = "#6b4a2d";
  const window = "#78bfe2";
  const outline = "rgba(0,0,0,0.25)";

  ctx.fillStyle = outline; ctx.fillRect(px, py+1, 16, 15);

  ctx.fillStyle = roof;     ctx.fillRect(px+2, py+2, 12, 5);
  ctx.fillStyle = roofDark; ctx.fillRect(px+2, py+6, 12, 1);

  ctx.fillStyle = wall;     ctx.fillRect(px+3, py+7, 10, 7);
  ctx.fillStyle = wallDark; ctx.fillRect(px+3, py+13, 10, 1);

  ctx.fillStyle = door;     ctx.fillRect(px+7, py+10, 2, 4);
  ctx.fillStyle = window;   ctx.fillRect(px+4, py+9, 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(px+4, py+9, 1, 1);
}

// ---------- Bigger sprites ----------
function drawPlayerSpriteBig(tileX, tileY, frame){
  const px = tileX * TILE + (TILE/2) - 12;
  const py = tileY * TILE + (TILE/2) - 18;

  const c = {
    outline: "#151515",
    skin: "#f2c7a3",
    hair: "#b98b5e",
    beard: "#a67b55",
    glasses: "#202020",
    shirt: "#c6c6c6",
    pants: "#1c1c1c",
    shoe: "#0c0c0c",
    hi: "rgba(255,255,255,0.35)"
  };

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(px+6, py+20, 12, 3);

  ctx.fillStyle = c.outline;
  ctx.fillRect(px+9, py+3, 6, 1);
  ctx.fillRect(px+8, py+4, 8, 1);
  ctx.fillRect(px+8, py+5, 8, 7);
  ctx.fillRect(px+9, py+12, 6, 1);

  ctx.fillStyle = c.hair;
  ctx.fillRect(px+9, py+4, 6, 3);
  ctx.fillRect(px+8, py+5, 1, 2);
  ctx.fillRect(px+15, py+5, 1, 2);

  ctx.fillStyle = c.skin;
  ctx.fillRect(px+9, py+8, 6, 3);

  ctx.fillStyle = c.glasses;
  ctx.fillRect(px+9, py+9, 2, 1);
  ctx.fillRect(px+13, py+9, 2, 1);
  ctx.fillRect(px+11, py+9, 2, 1);

  ctx.fillStyle = c.beard;
  ctx.fillRect(px+9, py+11, 6, 1);

  ctx.fillStyle = c.outline;
  ctx.fillRect(px+8, py+14, 8, 1);
  ctx.fillRect(px+8, py+15, 8, 6);

  ctx.fillStyle = c.shirt;
  ctx.fillRect(px+9, py+15, 6, 6);
  ctx.fillStyle = c.hi;
  ctx.fillRect(px+11, py+17, 2, 1);

  ctx.fillStyle = c.pants;
  if(frame % 2 === 0){
    ctx.fillRect(px+9,  py+21, 3, 2);
    ctx.fillRect(px+13, py+22, 3, 1);
  } else {
    ctx.fillRect(px+9,  py+22, 3, 1);
    ctx.fillRect(px+13, py+21, 3, 2);
  }

  ctx.fillStyle = c.shoe;
  ctx.fillRect(px+9,  py+23, 3, 1);
  ctx.fillRect(px+13, py+23, 3, 1);
}

function drawGothGirlBig(tileX, tileY, frame){
  const px = tileX * TILE + (TILE/2) - 12;
  const py = tileY * TILE + (TILE/2) - 18;

  const c = {
    outline: "#131313",
    skin: "#f0c6b2",
    hair: "#1a1a1a",
    hairHi: "#3b2a4a",
    dress: "#1c1c24",
    dress2: "#3a2a52",
    boots: "#0a0a0f",
    hi: "rgba(255,255,255,0.28)"
  };

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(px+6, py+20, 12, 3);

  ctx.fillStyle = c.outline;
  ctx.fillRect(px+9, py+3, 6, 1);
  ctx.fillRect(px+8, py+4, 8, 1);
  ctx.fillRect(px+8, py+5, 8, 7);
  ctx.fillRect(px+9, py+12, 6, 1);

  ctx.fillStyle = c.hair;
  ctx.fillRect(px+8, py+4, 8, 6);
  ctx.fillRect(px+7, py+7, 2, 6);
  ctx.fillRect(px+15, py+7, 2, 6);

  ctx.fillStyle = c.hairHi;
  ctx.fillRect(px+10, py+6, 2, 1);
  ctx.fillRect(px+12, py+7, 1, 1);

  ctx.fillStyle = c.skin;
  ctx.fillRect(px+9, py+9, 6, 2);

  ctx.fillStyle = c.outline;
  ctx.fillRect(px+10, py+9, 1, 1);
  ctx.fillRect(px+13, py+9, 1, 1);

  ctx.fillStyle = c.outline;
  ctx.fillRect(px+8, py+14, 8, 1);
  ctx.fillRect(px+8, py+15, 8, 6);

  ctx.fillStyle = c.dress;
  ctx.fillRect(px+9, py+15, 6, 6);

  ctx.fillStyle = c.dress2;
  ctx.fillRect(px+9, py+17, 6, 1);

  ctx.fillStyle = c.hi;
  ctx.fillRect(px+10, py+16, 1, 1);

  ctx.fillStyle = c.boots;
  if(frame % 2 === 0){
    ctx.fillRect(px+9,  py+21, 3, 2);
    ctx.fillRect(px+13, py+22, 3, 1);
  } else {
    ctx.fillRect(px+9,  py+22, 3, 1);
    ctx.fillRect(px+13, py+21, 3, 2);
  }
  ctx.fillRect(px+9,  py+23, 3, 1);
  ctx.fillRect(px+13, py+23, 3, 1);
}

// ---------- Draw ----------
function draw(){
  for(let y=0; y<GRID; y++){
    for(let x=0; x<GRID; x++){
      const px = x * TILE;
      const py = y * TILE;
      const seed = hash2(x, y);

      if(maze[y][x] === 1){
        drawGrassTile(px, py, seed);
        drawTreeWall(px, py, wallNeighborsMask(x, y), seed);

        // More houses
        const allowHouse = (seed % 97 === 0) || ((x < 6 || y < 6 || x > GRID-7 || y > GRID-7) && seed % 41 === 0);
        if(allowHouse){
          drawHouse(px, py, seed % 2);
        }
      } else {
        drawPathTile(px, py, seed);
        drawFlowers(px, py, seed);
      }
    }
  }

  const frame = Math.floor(animTick / 10);
  drawGothGirlBig(goal.x, goal.y, frame);
  drawPlayerSpriteBig(player.x, player.y, frame);
}

// ---------- Movement ----------
function tryMove(dx, dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(isWall(nx, ny)) return;

  player.x = nx;
  player.y = ny;

  if(player.x === goal.x && player.y === goal.y){
    statusEl.textContent = "So glad you found me! 🖤";
    openWin();
  } else {
    statusEl.textContent = "…";
  }
  draw();
}

function openWin(){
  winDialog.showModal();
  phraseInput.value = "";
  codeBox.classList.add("hidden");
  codeBox.textContent = "";
}

window.addEventListener("keydown", (e) => {
  // BLOCK INPUT until Start, or if any modal is open
  if(!gameStarted) return;
  if(winDialog.open || startDialog.open) return;

  const k = e.key.toLowerCase();
  const fast = e.shiftKey ? 2 : 1;

  const move = (dx, dy) => {
    for(let i=0; i<fast; i++) tryMove(dx, dy);
  };

  if(k === "arrowup" || k === "w") move(0, -1);
  if(k === "arrowdown" || k === "s") move(0, 1);
  if(k === "arrowleft" || k === "a") move(-1, 0);
  if(k === "arrowright" || k === "d") move(1, 0);
});

// ---------- Prize reveal ----------
revealBtn.addEventListener("click", () => {
  const guess = (phraseInput.value || "").trim().toLowerCase();
  codeBox.classList.remove("hidden");

if (guess !== SECRET_PHRASE) {
  codeBox.textContent = WRONG_MESSAGES[wrongMsgIndex % WRONG_MESSAGES.length];
  wrongMsgIndex++;
  return;
}
  codeBox.textContent = `Your reward: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());
newMazeBtn.addEventListener("click", () => generateMaze());

// ---------- Start popup logic ----------
function openStart(){
  gameStarted = false;
  statusEl.textContent = "Waiting to start…";
  startDialog.showModal();
}

startBtn.addEventListener("click", () => {
  gameStarted = true;
  startDialog.close();
  statusEl.textContent = "Find me… 🖤";
});

// Optional: allow Enter to start
startDialog.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    e.preventDefault();
    startBtn.click();
  }
});

// ---------- Animation loop ----------
function loop(){
  animTick++;
  draw();
  requestAnimationFrame(loop);
}

// Boot
generateMaze();
loop();
openStart();
