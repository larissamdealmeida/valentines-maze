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
const SECRET_PHRASE = "i choose you"; // change to your phrase

// Game Boy palette
const GB0 = "#0f380f";
const GB1 = "#306230";
const GB2 = "#8bac0f";
const GB3 = "#9bbc0f";

// Internal resolution 160x144.
// We’ll use 8x8 tiles so grid = 19x17 tiles (152x136) with a small border.
const TILE = 8;
const GRID_W = 19; // odd
const GRID_H = 17; // odd
const OFF_X = 4;   // border
const OFF_Y = 4;

let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID_W - 2, y: GRID_H - 2 };

function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H; }

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Perfect maze via DFS carving.
// 1 = wall, 0 = path
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
        options.push({
          nx, ny,
          wx: cur.x + d.dx/2,
          wy: cur.y + d.dy/2
        });
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

  // Ensure start/goal are open
  player = { x: 1, y: 1 };
  goal = { x: GRID_W - 2, y: GRID_H - 2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = "A WILD MAZE APPEARED!";
  draw();
}

function isWall(x,y){
  return !inBounds(x,y) || maze[y][x] === 1;
}

// --- Drawing helpers (GB style) ---
function fillRect(x,y,w,h,color){
  ctx.fillStyle = color;
  ctx.fillRect(x,y,w,h);
}

function drawTile(x,y){
  const px = OFF_X + x*TILE;
  const py = OFF_Y + y*TILE;

  // background (light)
  fillRect(px, py, TILE, TILE, GB3);

  if(maze[y][x] === 1){
    // wall tile: dark blocks with a highlight edge
    fillRect(px, py, TILE, TILE, GB1);
    fillRect(px, py, TILE, 1, GB2);
    fillRect(px, py, 1, TILE, GB2);
    fillRect(px+1, py+1, TILE-2, TILE-2, GB0);
  } else {
    // path tile: mid with subtle noise
    fillRect(px, py, TILE, TILE, GB2);
    if((x*y) % 5 === 0) fillRect(px+2, py+3, 1, 1, GB3);
    if((x+y) % 7 === 0) fillRect(px+5, py+2, 1, 1, GB3);
  }
}

function drawPlayer(){
  const px = OFF_X + player.x*TILE;
  const py = OFF_Y + player.y*TILE;

  // 8x8 “trainer” sprite (very simple)
  fillRect(px+3, py+1, 2, 1, GB0); // hair
  fillRect(px+2, py+2, 4, 2, GB0); // head
  fillRect(px+2, py+4, 4, 2, GB1); // body
  fillRect(px+2, py+6, 2, 1, GB0); // legs
  fillRect(px+4, py+6, 2, 1, GB0);

  // tiny shine
  fillRect(px+3, py+3, 1, 1, GB3);
}

function drawHeart(){
  const px = OFF_X + goal.x*TILE;
  const py = OFF_Y + goal.y*TILE;

  // 8x8 pixel heart
  // using GB0/GB1 to stand out
  fillRect(px+2, py+2, 1, 1, GB0);
  fillRect(px+5, py+2, 1, 1, GB0);
  fillRect(px+1, py+3, 2, 1, GB0);
  fillRect(px+4, py+3, 3, 1, GB0);
  fillRect(px+1, py+4, 6, 1, GB0);
  fillRect(px+2, py+5, 4, 1, GB0);
  fillRect(px+3, py+6, 2, 1, GB0);

  // highlight
  fillRect(px+2, py+3, 1, 1, GB3);
}

function draw(){
  // Clear screen
  fillRect(0,0,canvas.width,canvas.height,GB0);

  // frame background
  fillRect(2,2,canvas.width-4,canvas.height-4,GB1);

  // playfield
  fillRect(OFF_X-1, OFF_Y-1, GRID_W*TILE+2, GRID_H*TILE+2, GB0);

  for(let y=0; y<GRID_H; y++){
    for(let x=0; x<GRID_W; x++){
      drawTile(x,y);
    }
  }

  drawHeart();
  drawPlayer();

  // tiny “scanlines” for GB vibe (subtle)
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for(let y=0; y<canvas.height; y+=2){
    ctx.fillRect(0,y,canvas.width,1);
  }
}

function tryMove(dx,dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(isWall(nx,ny)) return;

  player.x = nx;
  player.y = ny;

  if(player.x === goal.x && player.y === goal.y){
    statusEl.textContent = "YOU FOUND ME!";
    openWin();
  } else {
    statusEl.textContent = "KEEP GOING…";
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

revealBtn.addEventListener("click", () => {
  const guess = (phraseInput.value || "").trim().toLowerCase();
  codeBox.classList.remove("hidden");
  if(guess !== SECRET_PHRASE){
    codeBox.textContent = "NOPE. TRY AGAIN 😈";
    return;
  }
  codeBox.textContent = `KEYFORGE CODE: ${KEYFORGE_CODE}`;
});

closeBtn.addEventListener("click", () => winDialog.close());
newMazeBtn.addEventListener("click", () => generateMaze());

generateMaze();
