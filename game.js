const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const winDialog = document.getElementById("winDialog");
const phraseInput = document.getElementById("phrase");
const revealBtn = document.getElementById("revealBtn");
const closeBtn = document.getElementById("closeBtn");
const codeBox = document.getElementById("codeBox");
const newMazeBtn = document.getElementById("newMazeBtn");

// Put your real KeyForge code here:
const KEYFORGE_CODE = "PASTE-YOUR-REAL-CODE-HERE";
const SECRET_PHRASE = "i choose you";

// --- VISUAL SETTINGS (Gen 3-ish) ---
const TILE = 16;                         // Pokémon GBA tile size
const VIEW_W = 20;                       // tiles across on-screen
const VIEW_H = 15;                       // tiles down on-screen
canvas.width  = VIEW_W * TILE;           // 320
canvas.height = VIEW_H * TILE;           // 240

// Maze grid (odd size for perfect maze)
const GRID_W = 51; // odd
const GRID_H = 51; // odd

// Tile types: 0 path, 1 wall
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID_W - 2, y: GRID_H - 2 };

// --- Color palette approximating Pokémon Gen 3 outdoor routes ---
const PAL = {
  grassA: "#7ecf97",
  grassB: "#73c98f",
  grassDot1: "rgba(255,255,255,0.18)",
  grassDot2: "rgba(0,0,0,0.08)",

  pathA: "#9edbb0",
  pathB: "#8fd3a6",

  treeTop: "#2f7a44",
  treeMid: "#2b6f3f",
  treeDark: "#225b33",
  treeEdge: "#8be0a7",
  treeShadow: "rgba(0,0,0,0.20)",

  uiShadow: "rgba(0,0,0,0.25)",
};

// --- Utils ---
function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H; }
function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function isWall(x,y){ return !inBounds(x,y) || maze[y][x] === 1; }

// --- Perfect maze generation (DFS/backtracking) ---
function generateMaze(){
  maze = Array.from({length: GRID_H}, () => Array(GRID_W).fill(1));

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
  goal = { x: GRID_W - 2, y: GRID_H - 2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = "Find me… 💘";
  draw();
}

// --- Camera: keep player centered like Pokémon ---
function camera(){
  let cx = player.x - Math.floor(VIEW_W/2);
  let cy = player.y - Math.floor(VIEW_H/2);

  // clamp to maze bounds
  cx = Math.max(0, Math.min(GRID_W - VIEW_W, cx));
  cy = Math.max(0, Math.min(GRID_H - VIEW_H, cy));
  return { cx, cy };
}

// --- Tile painters (procedural “sprite-like” tiles) ---
function fillRect(x,y,w,h,c){
  ctx.fillStyle = c;
  ctx.fillRect(x,y,w,h);
}

function drawGrassTile(px, py, seed){
  // base grass
  const base = (seed % 2 === 0) ? PAL.grassA : PAL.grassB;
  fillRect(px, py, TILE, TILE, base);

  // dotted texture like route grass
  ctx.fillStyle = PAL.grassDot1;
  // deterministic dots
  const dots = [
    [3,4],[11,3],[7,9],[13,12],[4,13],[9,6]
  ];
  for(const [dx,dy] of dots){
    if(((seed + dx*7 + dy*13) % 3) === 0) ctx.fillRect(px+dx, py+dy, 1, 1);
  }

  ctx.fillStyle = PAL.grassDot2;
  if((seed % 5) === 0) ctx.fillRect(px+2, py+11, 1, 1);
  if((seed % 7) === 0) ctx.fillRect(px+12, py+8, 1, 1);
}

function drawPathTile(px, py, seed){
  // In Pokémon routes, paths often are slightly different grass tone.
  const base = (seed % 2 === 0) ? PAL.pathA : PAL.pathB;
  fillRect(px, py, TILE, TILE, base);

  // subtle speckles
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  if(seed % 4 === 0) ctx.fillRect(px+5, py+5, 1, 1);
  if(seed % 6 === 0) ctx.fillRect(px+10, py+9, 1, 1);
}

function drawTreeWall(px, py, neighborsMask){
  // A “tree block” with edge highlight, like Gen 3 tree walls.
  // neighborsMask bits: up(1), right(2), down(4), left(8) are walls
  fillRect(px, py, TILE, TILE, PAL.treeMid);

  // leafy top-ish noise
  ctx.fillStyle = PAL.treeTop;
  ctx.fillRect(px, py, TILE, 6);

  // darker core
  fillRect(px+2, py+3, TILE-4, TILE-5, PAL.treeDark);

  // edge highlight where it meets non-wall (like tree border)
  ctx.fillStyle = PAL.treeEdge;
  const topOpen = !(neighborsMask & 1);
  const rightOpen = !(neighborsMask & 2);
  const bottomOpen = !(neighborsMask & 4);
  const leftOpen = !(neighborsMask & 8);

  if(topOpen) ctx.fillRect(px+2, py, TILE-4, 2);
  if(leftOpen) ctx.fillRect(px, py+2, 2, TILE-4);
  if(rightOpen) ctx.fillRect(px+TILE-2, py+2, 2, TILE-4);
  if(bottomOpen) ctx.fillRect(px+2, py+TILE-2, TILE-4, 2);

  // shadow bottom/right to give chunky tile feel
  ctx.fillStyle = PAL.treeShadow;
  ctx.fillRect(px, py+TILE-2, TILE, 2);
  ctx.fillRect(px+TILE-2, py, 2, TILE);
}

function wallNeighborsMask(gx, gy){
  const up = isWall(gx, gy-1) ? 1 : 0;
  const right = isWall(gx+1, gy) ? 2 : 0;
  const down = isWall(gx, gy+1) ? 4 : 0;
  const left = isWall(gx-1, gy) ? 8 : 0;
  return up | right | down | left;
}

// --- Tiny “sprites” (simple pixel art) ---
function drawTrainer(px, py, frame){
  // A 16x16 top-down trainer-ish sprite.
  // Colors approximating the Emerald/RS protagonist vibe.
  const c = {
    outline: "#1b1b1b",
    skin: "#f2c7a3",
    hair: "#e7e7e7",
    hat: "#2c6bd6",
    shirt: "#d93a3a",
    pants: "#2b2b2b",
    white: "#ffffff",
  };

  // clear underlying a bit (so sprite pops)
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(px+3, py+3, 10, 10);

  // outline body blob
  ctx.fillStyle = c.outline;
  ctx.fillRect(px+6, py+3, 4, 1);
  ctx.fillRect(px+5, py+4, 6, 1);
  ctx.fillRect(px+5, py+5, 6, 7);
  ctx.fillRect(px+6, py+12, 4, 2);

  // hat/hair
  ctx.fillStyle = c.hair;
  ctx.fillRect(px+6, py+4, 4, 2);
  ctx.fillStyle = c.hat;
  ctx.fillRect(px+5, py+4, 1, 2);
  ctx.fillRect(px+10, py+4, 1, 2);

  // face
  ctx.fillStyle = c.skin;
  ctx.fillRect(px+6, py+6, 4, 2);

  // shirt
  ctx.fillStyle = c.shirt;
  ctx.fillRect(px+6, py+8, 4, 3);

  // pants + step animation
  ctx.fillStyle = c.pants;
  if(frame % 2 === 0){
    ctx.fillRect(px+6, py+11, 2, 2);
    ctx.fillRect(px+8, py+12, 2, 1);
  } else {
    ctx.fillRect(px+6, py+12, 2, 1);
    ctx.fillRect(px+8, py+11, 2, 2);
  }

  // tiny highlight
  ctx.fillStyle = c.white;
  ctx.fillRect(px+7, py+9, 1, 1);
}

function drawHeartSprite(px, py){
  // 16x16 heart
  const red = "#d93a3a";
  const dark = "#8f1f1f";
  const hi = "#ff9aa6";

  // outline-ish shadow
  ctx.fillStyle = dark;
  ctx.fillRect(px+6, py+5, 4, 1);
  ctx.fillRect(px+5, py+6, 6, 1);
  ctx.fillRect(px+5, py+7, 6, 1);
  ctx.fillRect(px+6, py+8, 4, 1);
  ctx.fillRect(px+7, py+9, 2, 1);

  // fill
  ctx.fillStyle = red;
  ctx.fillRect(px+6, py+4, 2, 2);
  ctx.fillRect(px+8, py+4, 2, 2);
  ctx.fillRect(px+5, py+6, 6, 2);
  ctx.fillRect(px+6, py+8, 4, 1);
  ctx.fillRect(px+7, py+9, 2, 1);

  // highlight
  ctx.fillStyle = hi;
  ctx.fillRect(px+6, py+5, 1, 1);
  ctx.fillRect(px+6, py+7, 1, 1);
}

// --- Render ---
let animTick = 0;
function draw(){
  const { cx, cy } = camera();

  // background
  fillRect(0,0,canvas.width,canvas.height, "#000000");

  // draw visible tiles
  for(let vy=0; vy<VIEW_H; vy++){
    for(let vx=0; vx<VIEW_W; vx++){
      const gx = cx + vx;
      const gy = cy + vy;
      const px = vx * TILE;
      const py = vy * TILE;
      const seed = (gx * 928371 + gy * 1237) >>> 0;

      if(isWall(gx,gy)){
        drawGrassTile(px, py, seed); // base under trees (like Pokémon)
        drawTreeWall(px, py, wallNeighborsMask(gx,gy));
      } else {
        // path/grass variation
        // Make carved corridors look like worn grass (slightly different tone)
        drawPathTile(px, py, seed);
      }
    }
  }

  // draw goal (heart) if in view
  if(goal.x >= cx && goal.x < cx + VIEW_W && goal.y >= cy && goal.y < cy + VIEW_H){
    const px = (goal.x - cx) * TILE;
    const py = (goal.y - cy) * TILE;
    drawHeartSprite(px, py);
  }

  // draw player
  const ppx = (player.x - cx) * TILE;
  const ppy = (player.y - cy) * TILE;
  drawTrainer(ppx, ppy, Math.floor(animTick/8));

  // slight “soft shadow” UI look like GBA
  ctx.fillStyle = PAL.uiShadow;
  ctx.fillRect(0, 0, canvas.width, 2);
  ctx.fillRect(0, 0, 2, canvas.height);
}

// --- Movement ---
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
  if(winDialog.open) return;

  const k = e.key.toLowerCase();
  const fast = e.shiftKey ? 2 : 1;

  const move = (dx,dy) => { for(let i=0;i<fast;i++) tryMove(dx,dy); };

  if(k === "arrowup" || k === "w") move(0,-1);
  if(k === "arrowdown" || k === "s") move(0, 1);
  if(k === "arrowleft" || k === "a") move(-1,0);
  if(k === "arrowright" || k === "d") move(1,0);
});

// --- Prize reveal ---
revealBtn.addEventListener("click", () => {
  const guess = (phraseInput.value || "").trim().toLowerCase();
  codeBox.classList.remove("hidden");

  if(guess !== SECRET_PHRASE){
    codeBox.textContent = "Nope 😈 try again.";
    return;
  }
  codeBox.textContent = `Your KeyForge code: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());
newMazeBtn.addEventListener("click", () => generateMaze());

// --- Animate a tiny bit (trainer stepping) ---
function loop(){
  animTick++;
  draw();
  requestAnimationFrame(loop);
}

generateMaze();
loop();
