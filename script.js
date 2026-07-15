const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score');
const bestScoreText = document.getElementById('bestScoreText');
const finalScoreText = document.getElementById('finalScore');
const newRecordText = document.getElementById('newRecordText');
const speedBar = document.getElementById('speedBar');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const characterImg = document.getElementById('characterImg');

// Game State
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let bestScore = localStorage.getItem('infiniteStairsBest') || 0;
bestScoreText.innerText = bestScore;

let speed = 100; // 0 to 100
let lastTime = 0;
let stairs = [];
let playerIndex = 0;
let playerDir = 1; // 1: right, -1: left
let animationOffset = { x: 0, y: 0 };
let targetOffset = { x: 0, y: 0 };
let isGameOver = false;
let gameOverReason = ''; // 'fall' or 'timeout'

// Constants
const STAIR_WIDTH = 60;
const STAIR_HEIGHT = 20;
const STEP_X = 50;
const STEP_Y = 50;
const BASE_DEPLETION_RATE = 8; // speed depletion per second (decreased for slower drain)
const MAX_STAIRS_AHEAD = 20;

// Input tracking to prevent holding key
let isLeftPressed = false;
let isRightPressed = false;

function initGame() {
    score = 0;
    speed = 100;
    playerIndex = 0;
    playerDir = 1;
    stairs = [{ x: 0, y: 0 }];
    animationOffset = { x: 0, y: 0 };
    targetOffset = { x: 0, y: 0 };
    isGameOver = false;
    
    // Generate initial stairs
    for (let i = 0; i < MAX_STAIRS_AHEAD; i++) {
        generateStair();
    }
    
    scoreDisplay.innerText = score;
    speedBar.style.width = speed + '%';
    newRecordText.classList.add('hidden');
    
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function generateStair() {
    const lastStair = stairs[stairs.length - 1];
    
    let dir = 1;
    if (stairs.length >= 2) {
        const secondLastStair = stairs[stairs.length - 2];
        const prevDir = lastStair.x > secondLastStair.x ? 1 : -1;
        // 80% chance to continue in the same direction, 20% to turn
        if (Math.random() < 0.8) {
            dir = prevDir;
        } else {
            dir = prevDir * -1;
        }
    } else {
        // First step random
        dir = Math.random() < 0.5 ? -1 : 1;
    }
    
    stairs.push({
        x: lastStair.x + dir,
        y: lastStair.y + 1
    });
}

function update(deltaTime) {
    if (gameState !== 'playing') return;

    // Smooth camera interpolation
    animationOffset.x += (targetOffset.x - animationOffset.x) * 0.3;
    animationOffset.y += (targetOffset.y - animationOffset.y) * 0.3;

    if (score > 0) { // Speed only depletes after first step
        // Depletion rate increases with score, but slower than before
        const currentRate = BASE_DEPLETION_RATE + (score * 0.15);
        speed -= currentRate * (deltaTime / 1000);
        
        if (speed <= 0) {
            speed = 0;
            triggerGameOver('timeout');
        }
        
        speedBar.style.width = speed + '%';
        
        // Change color based on speed
        if (speed > 60) speedBar.style.background = '#00ff00';
        else if (speed > 30) speedBar.style.background = '#ffff00';
        else speedBar.style.background = '#ff0000';
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (optional, styled in CSS)
    
    // Calculate base position (player centered at bottom)
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 150;
    
    // Draw stairs
    for (let i = 0; i < stairs.length; i++) {
        const stair = stairs[i];
        
        // Skip stairs too far behind
        if (i < playerIndex - 5) continue;
        
        const screenX = centerX + (stair.x * STEP_X) - animationOffset.x;
        const screenY = centerY - (stair.y * STEP_Y) + animationOffset.y;
        
        // Draw stair block
        ctx.fillStyle = '#fca311'; // Orange color
        ctx.fillRect(screenX - STAIR_WIDTH/2, screenY, STAIR_WIDTH, STAIR_HEIGHT);
        ctx.fillStyle = '#b37000'; // Darker for 3D effect
        ctx.fillRect(screenX - STAIR_WIDTH/2, screenY + STAIR_HEIGHT, STAIR_WIDTH, 10);
    }
    
    // Draw player
    const currentPlayerStair = stairs[playerIndex];
    const playerScreenX = centerX + (currentPlayerStair.x * STEP_X) - animationOffset.x;
    let playerScreenY = centerY - (currentPlayerStair.y * STEP_Y) + animationOffset.y - 10; // -10 to stand on stair
    
    if (gameState === 'gameover' && gameOverReason === 'fall') {
        playerScreenY += 100; // Falling effect
    }

    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);
    
    if (playerDir === -1) {
        ctx.scale(-1, 1);
    }
    
    // Draw character image or placeholder
    if (characterImg.complete && characterImg.naturalHeight !== 0 && !characterImg.dataset.missing) {
        // Draw image
        const imgW = 60;
        const imgH = 80;
        ctx.drawImage(characterImg, -imgW/2, -imgH, imgW, imgH);
    } else {
        // Character drawing (Pixel-art style manually coded, facing right)
        
        // 머리카락 (갈색)
        ctx.fillStyle = '#65350f';
        ctx.fillRect(-15, -60, 25, 15);
        ctx.fillRect(-18, -55, 5, 10);
        ctx.fillRect(10, -55, 10, 15); // 앞머리 튀어나옴
        
        // 얼굴 (살구색)
        ctx.fillStyle = '#f9c595';
        ctx.fillRect(-10, -45, 25, 20); // 얼굴을 오른쪽으로 치우치게
        
        // 코 (앞으로 튀어나옴)
        ctx.fillRect(15, -35, 4, 4);
        
        // 수염 (옅은 갈색)
        ctx.fillStyle = '#9b7653';
        ctx.fillRect(-10, -32, 25, 7);
        
        // 안경 및 눈 (오른쪽을 바라봄)
        ctx.fillStyle = '#000'; // 안경테
        ctx.fillRect(0, -43, 8, 8); // 왼쪽 눈 안경
        ctx.fillRect(10, -43, 8, 8); // 오른쪽 눈 안경
        ctx.fillRect(8, -40, 2, 2); // 안경테 연결부
        ctx.fillStyle = '#fff'; // 눈흰자
        ctx.fillRect(2, -41, 4, 4);
        ctx.fillRect(12, -41, 4, 4);
        ctx.fillStyle = '#000'; // 눈동자 (오른쪽으로 쏠림)
        ctx.fillRect(4, -40, 2, 2);
        ctx.fillRect(14, -40, 2, 2);
        
        // 셔츠 (연하늘색)
        ctx.fillStyle = '#cae4ff';
        ctx.fillRect(-5, -25, 15, 20);
        
        // 넥타이 (빨간색)
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(5, -25, 4, 15);
        
        // 자켓 (짙은 파란색)
        ctx.fillStyle = '#0f265c';
        ctx.fillRect(-15, -25, 12, 25); // 등쪽 자켓
        ctx.fillRect(10, -25, 6, 20);  // 앞쪽 팔
        
        // 바지 (짙은 파란색)
        ctx.fillRect(-10, -5, 8, 15);  // 뒷다리
        ctx.fillRect(2, -5, 8, 15);   // 앞다리
        
        // 신발 (갈색)
        ctx.fillStyle = '#65350f';
        ctx.fillRect(-10, 10, 10, 5); // 뒷발
        ctx.fillRect(4, 10, 10, 5);  // 앞발
        
        // 서류가방 (앞쪽 손에 들고 있음)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(5, -12, 14, 12);
    }
    
    ctx.restore();
}

function gameLoop(timestamp) {
    if (gameState !== 'playing' && gameState !== 'gameover') return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    draw();
    
    if (gameState === 'playing' || animationOffset.y < 200) { 
        requestAnimationFrame(gameLoop);
    }
}

function handleInput(type) {
    if (gameState !== 'playing') return;
    
    let isCorrect = false;
    const nextStair = stairs[playerIndex + 1];
    
    if (type === 'climb') {
        // 현재 방향으로 계속 가기
        if (nextStair.x === stairs[playerIndex].x + playerDir) {
            isCorrect = true;
        }
    } else if (type === 'turn') {
        // 방향 바꾸고 가기
        playerDir *= -1;
        if (nextStair.x === stairs[playerIndex].x + playerDir) {
            isCorrect = true;
        }
    }
    
    if (isCorrect) {
        playerIndex++;
        score++;
        scoreDisplay.innerText = score;
        
        // Recover speed
        speed = Math.min(100, speed + 10 - (score * 0.02));
        
        // Generate new stair
        generateStair();
        
        // Animate camera
        targetOffset.x = stairs[playerIndex].x * STEP_X;
        targetOffset.y = stairs[playerIndex].y * STEP_Y;
    } else {
        triggerGameOver('fall');
    }
}

function triggerGameOver(reason) {
    gameState = 'gameover';
    isGameOver = true;
    gameOverReason = reason;
    
    setTimeout(() => {
        hud.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        finalScoreText.innerText = score;
        
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('infiniteStairsBest', bestScore);
            newRecordText.classList.remove('hidden');
        }
    }, reason === 'fall' ? 500 : 0);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // 스페이스바 스크롤 방지
        if (!isRightPressed) {
            isRightPressed = true;
            handleInput('climb'); // 스페이스바: 보는 방향대로 가기 (오르기)
        }
    } else if (e.key === 'Control') {
        e.preventDefault();
        if (!isLeftPressed) {
            isLeftPressed = true;
            handleInput('turn'); // Ctrl: 방향 바꾸기
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isRightPressed = false;
    } else if (e.key === 'Control') {
        isLeftPressed = false;
    }
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initial draw for background/start screen
draw();
