// --- Retro maze game with guaranteed solvable maze ---
// Perfect maze generation (DFS/backtracking) on an odd-sized grid.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const winDialog = document.getElementById("winDialog");
const phraseInput = document.getElementById("phrase");
const revealBtn = document.getElementById("revealBtn");
const closeBtn = document.getElementById("closeBtn");
const codeBox = document.getElementById("codeBox");
const newMazeBtn = document.getElementById("newMazeBtn");

// --- Put your real KeyForge code here ---
const KEYFORGE_CODE = "PASTE-YOUR-REAL-CODE-HERE";

// Optional phrase-gate (prevents casual “view-source” spoiling)
const SECRET_PHRASE = "i choose you"; // change to your inside joke

// --- Maze settings ---
const GRID = 41; // MUST be odd for perfect mazes (e.g., 31, 41, 51)
const TILE = Math.floor(canvas.width / GRID); // auto tilesize
canvas.height = canvas.width; // keep square

// Tile types: 0 path, 1 wall
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID - 2, y: GRID - 2 };

// Pokémon-ish colors (match CSS vibe)
const COLORS = {
  grass1: "#2fa44f",
  grass2: "#2b9348",
  path1:  "#b07a3a",
  path2:  "#9a6a33",
  tree1:  "#0a2a14",
  tree2:  "#0f3a1e",
  shade:  "rgba(0,0,0,0.20)"
};

function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID && y < GRID; }

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateMaze(){
  // Start with all walls
  maze = Array.from({length: GRID}, () => Array(GRID).fill(1));

  // Carve passages on odd coordinates
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
      // carve wall between
      maze[pick.wy][pick.wx] = 0;
      // carve next cell
      maze[pick.ny][pick.nx] = 0;
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  // Place player + goal on guaranteed-open tiles
  player = { x: 1, y: 1 };

  // pick a far-ish open cell for goal
  // simplest: bottom-right odd cell (will be open in perfect maze)
  goal = { x: GRID - 2, y: GRID - 2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = "A wild maze appeared!";
  draw();
}

function isWall(x,y){
  return !inBounds(x,y) || maze[y][x] === 1;
}

function drawTile(x,y){
  // Grass background everywhere
  const grass = ((x + y) % 2 === 0) ? COLORS.grass1 : COLORS.grass2;
  ctx.fillStyle = grass;
  ctx.fillRect(x*TILE, y*TILE, TILE, TILE);

  if(maze[y][x] === 0){
    // Path tile
    ctx.fillStyle = ((x + y) % 2 === 0) ? COLORS.path1 : COLORS.path2;
    ctx.fillRect(x*TILE, y*TILE, TILE, TILE);

    // tiny “texture” dots
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    if((x*y) % 7 === 0) ctx.fillRect(x*TILE + 2, y*TILE + 2, 2, 2);
  } else {
    // Wall tile (trees/rocks feel)
    ctx.fillStyle = ((x + y) % 2 === 0) ? COLORS.tree1 : COLORS.tree2;
    ctx.fillRect(x*TILE, y*TILE, TILE, TILE);

    // add edge shading for depth
    ctx.fillStyle = COLORS.shade;
    ctx.fillRect(x*TILE, y*TILE, TILE, 3);
    ctx.fillRect(x*TILE, y*TILE, 3, TILE);
  }
}

function drawEmoji(emoji, x, y){
  ctx.font = `${Math.max(10, TILE)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x*TILE + TILE/2, y*TILE + TILE/2 + 1);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw map
  for(let y=0; y<GRID; y++){
    for(let x=0; x<GRID; x++){
      drawTile(x,y);
    }
  }

  // draw goal + player
  drawEmoji("❤️", goal.x, goal.y);
  drawEmoji("🙂", player.x, player.y);

  // subtle vignette for “route” vibe
  const g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, canvas.width*0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function tryMove(dx,dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(isWall(nx,ny)) return;

  player.x = nx;
  player.y = ny;

  if(player.x === goal.x && player.y === goal.y){
    statusEl.textContent = "You found me! 💖";
    openWin();
  } else {
    statusEl.textContent = "Keep going…";
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
  if(winDialog.open) return;

  const k = e.key.toLowerCase();
  const fast = e.shiftKey ? 2 : 1; // shift = move 2 tiles per keypress

  if(k === "arrowup" || k === "w") for(let i=0;i<fast;i++) tryMove(0,-1);
  if(k === "arrowdown" || k === "s") for(let i=0;i<fast;i++) tryMove(0, 1);
  if(k === "arrowleft" || k === "a") for(let i=0;i<fast;i++) tryMove(-1,0);
  if(k === "arrowright" || k === "d") for(let i=0;i<fast;i++) tryMove(1,0);
});

revealBtn.addEventListener("click", () => {
  const guess = (phraseInput.value || "").trim().toLowerCase();
  codeBox.classList.remove("hidden");

  if(guess !== SECRET_PHRASE){
    codeBox.textContent = "Nope 😈 Try the phrase again.";
    return;
  }
  codeBox.textContent = `Your KeyForge code: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());
newMazeBtn.addEventListener("click", () => generateMaze());

// First load
generateMaze();
