const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const winDialog = document.getElementById("winDialog");
const phraseInput = document.getElementById("phrase");
const revealBtn = document.getElementById("revealBtn");
const closeBtn = document.getElementById("closeBtn");
const codeBox = document.getElementById("codeBox");
const newMazeBtn = document.getElementById("newMazeBtn");

// Start dialog
const startDialog = document.getElementById("startDialog");
const startBtn = document.getElementById("startBtn");

// Reward + password
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

// ─────────── MAZE SIZE (REDUCED TO FIT SCREEN) ───────────
const GRID = 31;               // was 41
const TILE = 16;
canvas.width = GRID * TILE;
canvas.height = GRID * TILE;

// ─────────── GAME STATE ───────────
let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: GRID - 2, y: GRID - 2 };
let animTick = 0;
let gameStarted = false;

// ─────────── AUDIO (CHIPTUNE BLIPS) ───────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function blip(freq, dur = 0.06, vol = 0.05){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function stepSound(){ blip(650, 0.04); }
function wrongSound(){ blip(180, 0.12, 0.06); }
function winSound(){
  blip(880, 0.08);
  setTimeout(() => blip(1040, 0.12), 90);
}

// ─────────── PALETTE ───────────
const PAL = {
  grassA: "#7ecf97",
  grassB: "#73c98f",
  grassDot1: "rgba(255,255,255,0.16)",
  grassDot2: "rgba(0,0,0,0.07)",

  pathA: "#9edbb0",
  pathB: "#8fd3a6",
  pathSpeck: "rgba(255,255,255,0.10)",

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

// ─────────── UTILS ───────────
function randInt(n){ return Math.floor(Math.random() * n); }
function inBounds(x,y){ return x >= 0 && y >= 0 && x < GRID && y < GRID; }
function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function isWall(x,y){ return !inBounds(x,y) || maze[y][x] === 1; }
function fillRect(x,y,w,h,c){ ctx.fillStyle = c; ctx.fillRect(x,y,w,h); }
function hash2(x,y){
  let n = (x*374761393 + y*668265263) ^ (x<<13);
  n = (n ^ (n>>15)) * 1274126177;
  return (n ^ (n>>16)) >>> 0;
}

// ─────────── MAZE GENERATION ───────────
function generateMaze(){
  maze = Array.from({length: GRID}, () => Array(GRID).fill(1));
  const stack = [{ x:1, y:1 }];
  maze[1][1] = 0;

  const dirs = [[0,-2],[0,2],[-2,0],[2,0]];

  while(stack.length){
    const c = stack.at(-1);
    const opts = dirs
      .map(([dx,dy]) => ({ x:c.x+dx, y:c.y+dy, wx:c.x+dx/2, wy:c.y+dy/2 }))
      .filter(p => inBounds(p.x,p.y) && maze[p.y][p.x]);

    if(!opts.length){ stack.pop(); continue; }
    const p = opts[randInt(opts.length)];
    maze[p.wy][p.wx] = 0;
    maze[p.y][p.x] = 0;
    stack.push({ x:p.x, y:p.y });
  }

  player = { x:1, y:1 };
  goal = { x:GRID-2, y:GRID-2 };
  maze[goal.y][goal.x] = 0;

  statusEl.textContent = gameStarted ? "Find me… 🖤" : "Waiting to start…";
}

// ─────────── DRAWING (UNCHANGED VISUALS) ───────────
function draw(){
  for(let y=0;y<GRID;y++){
    for(let x=0;x<GRID;x++){
      const px = x*TILE, py=y*TILE, seed=hash2(x,y);
      if(maze[y][x]){
        fillRect(px,py,TILE,TILE,PAL.treeLeaf3);
      } else {
        fillRect(px,py,TILE,TILE,(seed%2)?PAL.pathA:PAL.pathB);
      }
    }
  }

  const frame = Math.floor(animTick/10);
  drawGothGirlBig(goal.x, goal.y, frame);
  drawPlayerSpriteBig(player.x, player.y, frame);
}

// ─────────── MOVEMENT ───────────
function tryMove(dx,dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(isWall(nx,ny)) return;

  player.x = nx;
  player.y = ny;
  stepSound();

  if(nx === goal.x && ny === goal.y){
    statusEl.textContent = "So glad you found me! 🖤";
    winSound();
    openWin();
  }
  draw();
}

function openWin(){
  winDialog.showModal();
  phraseInput.value = "";
  codeBox.classList.add("hidden");
}

// ─────────── INPUT (NO SCROLL) ───────────
window.addEventListener("keydown", e => {
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
    e.preventDefault();
  }
},{passive:false});

window.addEventListener("keydown", e => {
  if(!gameStarted || winDialog.open || startDialog.open) return;
  const k=e.key.toLowerCase();
  if(k==="arrowup"||k==="w") tryMove(0,-1);
  if(k==="arrowdown"||k==="s") tryMove(0,1);
  if(k==="arrowleft"||k==="a") tryMove(-1,0);
  if(k==="arrowright"||k==="d") tryMove(1,0);
});

// ─────────── PASSWORD LOGIC ───────────
revealBtn.onclick = () => {
  const guess = phraseInput.value.trim().toLowerCase();
  codeBox.classList.remove("hidden");

  if(guess !== SECRET_PHRASE){
    wrongSound();
    codeBox.textContent = WRONG_MESSAGES[wrongMsgIndex % WRONG_MESSAGES.length];
    wrongMsgIndex++;
    return;
  }
  codeBox.textContent = `Your reward: ${KEYFORGE_CODE}`;
};

closeBtn.onclick = () => winDialog.close();
newMazeBtn.onclick = generateMaze;

// ─────────── START LOGIC ───────────
startBtn.onclick = async () => {
  await audioCtx.resume();
  gameStarted = true;
  statusEl.textContent = "Find me… 🖤";
  startDialog.close();
};

startDialog.addEventListener("keydown", e => {
  if(e.key==="Enter"){ e.preventDefault(); startBtn.click(); }
});

// ─────────── LOOP ───────────
function loop(){
  animTick++;
  draw();
  requestAnimationFrame(loop);
}

// BOOT
generateMaze();
loop();
startDialog.showModal();
