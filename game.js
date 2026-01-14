// Pokémon-ish tile renderer + perfect maze generation (guaranteed connected)
// Keeps maze logic intact; upgrades aesthetics, decorations, and player sprite.

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
const SECRET_PHRASE = "i choose you"; // change to your inside joke

// Canvas is 320x240; tile size is 16px like GBA.
const TILE = 16;
const VIEW_W = 20; // 320 / 16
const VIEW_H = 15; // 240 / 16

// Maze grid: odd sizes required for perfect maze carving
const GRID_W = 51;
const GRID_H = 51;

// Maze data: 0 = path, 1 = wall
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID_W - 2, y: GRID_H - 2 };

let animTick = 0;

// Gen-3-ish palette
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

  uiShadow: "rgba(0,0,0,0.18)",
};

// ---------- Utilities ----------
function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H; }

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

// Deterministic coordinate hash (for decoration placement)
function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) ^ (x << 13);
  n = (n ^ (n >> 15)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

// ---------- Perfect Maze Generation (DFS/backtracking) ----------
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
      maze[pick.wy][pick.wx] = 0; // carve between
      maze[pick.ny][pick.nx] = 0; // carve next
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  player = { x: 1, y: 1 };
  goal = { x: GRID_W - 2, y: GRID_H - 2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = "Find me… 💘";
  draw();
}

// ---------- Camera (center-ish on player like Pokémon) ----------
function camera(){
  let cx = player.x - Math.floor(VIEW_W/2);
  let cy = player.y - Math.floor(VIEW_H/2);

  cx = Math.max(0, Math.min(GRID_W - VIEW_W, cx));
  cy = Math.max(0, Math.min(GRID_H - VIEW_H, cy));
  return { cx, cy };
}

// ---------- Tiles (procedural sprites) ----------
function drawGrassTile(px, py, seed){
  const base = (seed % 2 === 0) ? PAL.grassA : PAL.grassB;
  fillRect(px, py, TILE, TILE, base);

  // dotted texture
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

  // subtle speckles
  ctx.fillStyle = "rgba(255,255,255,0.10)";
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

function drawTreeWall(px, py, neighborsMask){
  // base leafy block
  fillRect(px, py, TILE, TILE, PAL.treeMid);

  // top foliage band
  ctx.fillStyle = PAL.treeTop;
  ctx.fillRect(px, py, TILE, 6);

  // darker core
  fillRect(px+2, py+3, TILE-4, TILE-5, PAL.treeDark);

  // edge highlight where adjacent is NOT a wall
  ctx.fillStyle = PAL.treeEdge;
  const topOpen = !(neighborsMask & 1);
  const rightOpen = !(neighborsMask & 2);
  const bottomOpen = !(neighborsMask & 4);
  const leftOpen = !(neighborsMask & 8);

  if(topOpen) ctx.fillRect(px+2, py, TILE-4, 2);
  if(leftOpen) ctx.fillRect(px, py+2, 2, TILE-4);
  if(rightOpen) ctx.fillRect(px+TILE-2, py+2, 2, TILE-4);
  if(bottomOpen) ctx.fillRect(px+2, py+TILE-2, TILE-4, 2);

  // shadow
  ctx.fillStyle = PAL.treeShadow;
  ctx.fillRect(px, py+TILE-2, TILE, 2);
  ctx.fillRect(px+TILE-2, py, 2, TILE);
}

function drawFlowers(px, py, seed){
  if ((seed % 17) !== 0) return;

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(px + 4, py + 6, 1, 1);
  ctx.fillRect(px + 11, py + 9, 1, 1);

  ctx.fillStyle = "rgba(255,80,120,0.55)";
  ctx.fillRect(px + 5, py + 7, 1, 1);
  ctx.fillRect(px + 10, py + 10, 1, 1);
}

function drawTreetopOverlay(px, py, seed){
  if ((seed % 9) !== 0) return;

  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(px+1, py+1, 14, 14);

  ctx.fillStyle = "#3a9a58";
  ctx.fillRect(px+3, py+3, 10, 6);
  ctx.fillStyle = "#2f7a44";
  ctx.fillRect(px+4, py+4, 8, 6);
  ctx.fillStyle = "#8be0a7";
  ctx.fillRect(px+5, py+5, 1, 1);
  ctx.fillRect(px+10, py+6, 1, 1);
}

function drawHouse(px, py, variant = 0){
  const roof = variant === 0 ? "#c94a4a" : "#4a7bc9";
  const roofDark = variant === 0 ? "#8f2f2f" : "#2f4d8f";
  const wall = "#d6c7a6";
  const wallDark = "#b8aa8d";
  const door = "#6b4a2d";
  const window = "#78bfe2";
  const outline = "rgba(0,0,0,0.25)";

  // outline-ish shadow
  ctx.fillStyle = outline; ctx.fillRect(px, py+1, 16, 15);

  // roof
  ctx.fillStyle = roof;     ctx.fillRect(px+2, py+2, 12, 5);
  ctx.fillStyle = roofDark; ctx.fillRect(px+2, py+6, 12, 1);

  // walls
  ctx.fillStyle = wall;     ctx.fillRect(px+3, py+7, 10, 7);
  ctx.fillStyle = wallDark; ctx.fillRect(px+3, py+13, 10, 1);

  // door + window
  ctx.fillStyle = door;     ctx.fillRect(px+7, py+10, 2, 4);
  ctx.fillStyle = window;   ctx.fillRect(px+4, py+9, 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(px+4, py+9, 1, 1);
}

// ---------- Sprites ----------
function drawPlayerSprite(px, py, frame){
  // 16x16 sprite inspired by your boyfriend photo: glasses + light beard + light brown hair + gray shirt
  const c = {
    outline: "#1b1b1b",
    skin: "#f2c7a3",
    hair: "#b98b5e",
    beard: "#a67b55",
    glasses: "#2a2a2a",
    shirt: "#bdbdbd",
    pants: "#1f1f1f",
    shoe: "#0f0f0f",
    hi: "rgba(255,255,255,0.35)"
  };

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.fillRect(px+4, py+13, 8, 2);

  // head outline
  ctx.fillStyle = c.outline;
  ctx.fillRect(px+6, py+2, 4, 1);
  ctx.fillRect(px+5, py+3, 6, 1);
  ctx.fillRect(px+5, py+4, 6, 4);
  ctx.fillRect(px+6, py+8, 4, 1);

  // hair
  ctx.fillStyle = c.hair;
  ctx.fillRect(px+6, py+3, 4, 2);
  ctx.fillRect(px+5, py+4, 1, 1);
  ctx.fillRect(px+10, py+4, 1, 1);

  // face
  ctx.fillStyle = c.skin;
  ctx.fillRect(px+6, py+5, 4, 2);

  // glasses
  ctx.fillStyle = c.glasses;
  ctx.fillRect(px+6, py+5, 1, 1);
  ctx.fillRect(px+9, py+5, 1, 1);
  ctx.fillRect(px+7, py+5, 2, 1);

  // beard
  ctx.fillStyle = c.beard;
  ctx.fillRect(px+6, py+7, 4, 1);

  // torso outline
  ctx.fillStyle = c.outline;
  ctx.fillRect(px+5, py+9, 6, 1);
  ctx.fillRect(px+5, py+10, 6, 3);

  // shirt fill
  ctx.fillStyle = c.shirt;
  ctx.fillRect(px+6, py+10, 4, 3);
  ctx.fillStyle = c.hi;
  ctx.fillRect(px+7, py+11, 1, 1);

  // legs (step animation)
  ctx.fillStyle = c.pants;
  if(frame % 2 === 0){
    ctx.fillRect(px+6, py+13, 2, 2);
    ctx.fillRect(px+8, py+14, 2, 1);
  } else {
    ctx.fillRect(px+6, py+14, 2, 1);
    ctx.fillRect(px+8, py+13, 2, 2);
  }

  // shoes
  ctx.fillStyle = c.shoe;
  ctx.fillRect(px+6, py+15, 2, 1);
  ctx.fillRect(px+8, py+15, 2, 1);
}

function drawHeartSprite(px, py){
  // 16x16 heart
  const red = "#d93a3a";
  const dark = "#8f1f1f";
  const hi = "#ff9aa6";

  ctx.fillStyle = dark;
  ctx.fillRect(px+6, py+5, 4, 1);
  ctx.fillRect(px+5, py+6, 6, 1);
  ctx.fillRect(px+5, py+7, 6, 1);
  ctx.fillRect(px+6, py+8, 4, 1);
  ctx.fillRect(px+7, py+9, 2, 1);

  ctx.fillStyle = red;
  ctx.fillRect(px+6, py+4, 2, 2);
  ctx.fillRect(px+8, py+4, 2, 2);
  ctx.fillRect(px+5, py+6, 6, 2);
  ctx.fillRect(px+6, py+8, 4, 1);
  ctx.fillRect(px+7, py+9, 2, 1);

  ctx.fillStyle = hi;
  ctx.fillRect(px+6, py+5, 1, 1);
  ctx.fillRect(px+6, py+7, 1, 1);
}

// ---------- Draw ----------
function draw(){
  const { cx, cy } = camera();

  // clear
  fillRect(0, 0, canvas.width, canvas.height, "#000");

  for(let vy=0; vy<VIEW_H; vy++){
    for(let vx=0; vx<VIEW_W; vx++){
      const gx = cx + vx;
      const gy = cy + vy;
      const px = vx * TILE;
      const py = vy * TILE;

      const seed = hash2(gx, gy);

      if(isWall(gx, gy)){
        // underlying grass + tree wall
        drawGrassTile(px, py, seed);
        drawTreeWall(px, py, wallNeighborsMask(gx, gy));

        // extra leafy overlay sometimes (depth)
        drawTreetopOverlay(px, py, seed);

        // rare houses on walls near edges so it feels like “outside the route”
        const nearEdge = gx < 6 || gy < 6 || gx > GRID_W - 7 || gy > GRID_H - 7;
        if(nearEdge && (seed % 211 === 0)){
          drawHouse(px, py, seed % 2);
        }
      } else {
        // corridors as worn grass/path
        drawPathTile(px, py, seed);
        drawFlowers(px, py, seed);
      }
    }
  }

  // goal (heart) if visible
  if(goal.x >= cx && goal.x < cx + VIEW_W && goal.y >= cy && goal.y < cy + VIEW_H){
    drawHeartSprite((goal.x - cx) * TILE, (goal.y - cy) * TILE);
  }

  // player
  const frame = Math.floor(animTick / 10);
  drawPlayerSprite((player.x - cx) * TILE, (player.y - cy) * TILE, frame);

  // subtle top/left shadow like “GBA screen”
  ctx.fillStyle = PAL.uiShadow;
  ctx.fillRect(0, 0, canvas.width, 2);
  ctx.fillRect(0, 0, 2, canvas.height);
}

// ---------- Movement ----------
function tryMove(dx, dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(isWall(nx, ny)) return;

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

  if(guess !== SECRET_PHRASE){
    codeBox.textContent = "Nope 😈 try again.";
    return;
  }
  codeBox.textContent = `Your KeyForge code: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());
newMazeBtn.addEventListener("click", () => generateMaze());

// ---------- Animation loop (tiny stepping) ----------
function loop(){
  animTick++;
  draw();
  requestAnimationFrame(loop);
}

generateMaze();
loop();
