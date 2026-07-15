// DOM 요소 가져오기
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const finalScoreElement = document.getElementById('finalScore');
const bestScoreElement = document.getElementById('bestScore');
const newRecordText = document.getElementById('newRecordText');

// 최고 기록 로드
let bestScore = localStorage.getItem('tetrisBestScore') || 0;

// 게임 상수 설정
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 메인 캔버스 블록 크기
const NEXT_BLOCK_SIZE = 30; // 다음 블록 캔버스 블록 크기

// 블록 색상 (화려한 네온 컬러)
const COLORS = [
    null,
    '#00ffff', // I - Cyan (시안)
    '#0000ff', // J - Blue (블루)
    '#ffa500', // L - Orange (오렌지)
    '#ffff00', // O - Yellow (옐로우)
    '#00ff00', // S - Green (그린)
    '#800080', // T - Purple (퍼플)
    '#ff0000'  // Z - Red (레드)
];

// 테트로미노 모양 정의 (7가지)
const TETROMINOS = {
    I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: 1 },
    J: { shape: [[2,0,0], [2,2,2], [0,0,0]], color: 2 },
    L: { shape: [[0,0,3], [3,3,3], [0,0,0]], color: 3 },
    O: { shape: [[4,4], [4,4]], color: 4 },
    S: { shape: [[0,5,5], [5,5,0], [0,0,0]], color: 5 },
    T: { shape: [[0,6,0], [6,6,6], [0,0,0]], color: 6 },
    Z: { shape: [[7,7,0], [0,7,7], [0,0,0]], color: 7 }
};

const TETROMINO_TYPES = 'IJLOSTZ';

// 게임 상태 변수
let board = [];
let currentPiece = null;
let nextPiece = null;
let dropCounter = 0;
let dropInterval = 1000; // 밀리초 단위 (1초)
let lastTime = 0;
let score = 0;
let level = 1;
let linesCleared = 0;
let isPaused = false;
let isGameOver = false;
let animationId = null;
let gameStarted = false;

// 보드 초기화 함수
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// 무작위 테트로미노 생성 함수
function createPiece() {
    const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
    const piece = TETROMINOS[type];
    return {
        matrix: piece.shape,
        color: piece.color,
        pos: { 
            x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2), 
            y: 0 
        }
    };
}

// 블록 그리기 보조 함수 (입체감 있는 디자인)
function drawBlock(context, x, y, colorIndex, size) {
    if (colorIndex === 0) return;
    
    const color = COLORS[colorIndex];
    
    // 블록 배경
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size, size);
    
    // 블록 테두리 (입체감 효과)
    context.strokeStyle = 'rgba(0,0,0,0.3)';
    context.lineWidth = 1;
    context.strokeRect(x * size, y * size, size, size);
    
    // 상단 및 좌측 하이라이트 (빛 반사)
    context.fillStyle = 'rgba(255,255,255,0.4)';
    context.fillRect(x * size, y * size, size, 4);
    context.fillRect(x * size, y * size, 4, size);
    
    // 하단 및 우측 그림자
    context.fillStyle = 'rgba(0,0,0,0.4)';
    context.fillRect(x * size, y * size + size - 4, size, 4);
    context.fillRect(x * size + size - 4, y * size, 4, size);
}

// 전체 보드 그리기
function drawBoard() {
    // 캔버스 초기화
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 격자 무늬 그리기 (선택사항)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // 쌓인 블록들 그리기
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(ctx, x, y, value, BLOCK_SIZE);
            }
        });
    });
}

// 현재 조종 중인 블록 그리기
function drawCurrentPiece() {
    if (!currentPiece) return;
    
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                // 그림자 (고스트 블록) 계산
                let ghostY = currentPiece.pos.y;
                while (!collide({ ...currentPiece, pos: { x: currentPiece.pos.x, y: ghostY + 1 } })) {
                    ghostY++;
                }
                
                // 고스트 블록 그리기
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect((currentPiece.pos.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = COLORS[currentPiece.color];
                ctx.lineWidth = 1;
                ctx.strokeRect((currentPiece.pos.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                
                // 실제 블록 그리기
                drawBlock(ctx, currentPiece.pos.x + x, currentPiece.pos.y + y, value, BLOCK_SIZE);
            }
        });
    });
}

// 다음 블록 화면 그리기
function drawNextPiece() {
    // 다음 캔버스 초기화
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    // 중앙 정렬을 위한 오프셋 계산
    const matrix = nextPiece.matrix;
    const offsetX = (4 - matrix[0].length) / 2;
    const offsetY = (4 - matrix.length) / 2;
    
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(nextCtx, x + offsetX, y + offsetY, value, NEXT_BLOCK_SIZE);
            }
        });
    });
}

// 충돌 검사
function collide(piece) {
    const m = piece.matrix;
    const o = piece.pos;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 블록을 보드에 병합
function merge() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                board[y + currentPiece.pos.y][x + currentPiece.pos.x] = value;
            }
        });
    });
}

// 줄 꽉 참 확인 및 삭제
function clearLines() {
    let linesToClear = [];
    
    // 꽉 찬 줄 찾기
    for (let r = ROWS - 1; r >= 0; r--) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 0) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            linesToClear.push(r);
        }
    }
    
    if (linesToClear.length > 0) {
        // 새 보드를 생성하고 안 지워진 줄만 복사
        let newBoard = createBoard();
        let newRowIdx = ROWS - 1;
        
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!linesToClear.includes(r)) {
                newBoard[newRowIdx] = [...board[r]];
                newRowIdx--;
            }
        }
        
        board = newBoard;
        
        // 점수 계산 (테트리스 룰에 가깝게)
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[linesToClear.length] * level;
        linesCleared += linesToClear.length;
        
        // 레벨업 (10줄마다)
        level = Math.floor(linesCleared / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        // UI 업데이트
        updateScore();
    }
}

// 블록 떨어뜨리기
function playerDrop() {
    currentPiece.pos.y++;
    if (collide(currentPiece)) {
        currentPiece.pos.y--;
        merge();
        clearLines();
        
        // 게임 오버 체크
        if (currentPiece.pos.y === 0) {
            handleGameOver();
            return;
        }
        
        // 다음 블록 가져오기
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
    }
    dropCounter = 0;
}

// 한 번에 끝까지 내리기 (하드 드롭)
function playerHardDrop() {
    while (!collide(currentPiece)) {
        currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    merge();
    clearLines();
    
    if (currentPiece.pos.y === 0) {
        handleGameOver();
        return;
    }
    
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    dropCounter = 0;
}

// 이동 (좌/우)
function playerMove(offset) {
    currentPiece.pos.x += offset;
    if (collide(currentPiece)) {
        currentPiece.pos.x -= offset;
    }
}

// 회전 (행렬 회전)
function rotate(matrix, dir) {
    // 전치(Transpose)
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    // 뒤집기(Reverse)
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// 블록 회전 시도 (벽 킥 처리)
function playerRotate(dir) {
    const pos = currentPiece.pos.x;
    let offset = 1;
    rotate(currentPiece.matrix, dir);
    
    // 회전시 벽이나 다른 블록과 충돌하면 밀어내기 시도
    while (collide(currentPiece)) {
        currentPiece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > currentPiece.matrix[0].length) {
            rotate(currentPiece.matrix, -dir); // 원래대로
            currentPiece.pos.x = pos;
            return;
        }
    }
}

// 메인 게임 루프
function update(time = 0) {
    if (isPaused || isGameOver || !gameStarted) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    drawBoard();
    drawCurrentPiece();
    
    animationId = requestAnimationFrame(update);
}

// UI 점수 업데이트
function updateScore() {
    scoreElement.innerText = score;
    levelElement.innerText = level;
}

// 게임 오버 처리
function handleGameOver() {
    isGameOver = true;
    gameStarted = false;
    cancelAnimationFrame(animationId);
    finalScoreElement.innerText = score;
    
    if (score > 0 && score > bestScore) {
        bestScore = score;
        localStorage.setItem('tetrisBestScore', bestScore);
        bestScoreElement.innerText = bestScore;
        newRecordText.classList.remove('hidden');
    } else {
        newRecordText.classList.add('hidden');
    }
    
    gameOverScreen.classList.remove('hidden');
    startBtn.innerText = '게임 시작';
    pauseBtn.disabled = true;
}

// 게임 초기화 및 시작
function resetGame() {
    board = createBoard();
    score = 0;
    level = 1;
    linesCleared = 0;
    dropInterval = 1000;
    isGameOver = false;
    isPaused = false;
    gameStarted = true;
    
    updateScore();
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    newRecordText.classList.add('hidden');
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    update(performance.now());
    
    startBtn.innerText = '다시 시작';
    pauseBtn.disabled = false;
}

// 일시정지 토글
function togglePause() {
    if (!gameStarted || isGameOver) return;
    
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        pauseBtn.innerText = '계속 (S)';
    } else {
        pauseScreen.classList.add('hidden');
        pauseBtn.innerText = '일시정지 (S)';
        lastTime = performance.now();
        update(performance.now());
    }
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', event => {
    if (!gameStarted || isGameOver) return;
    
    // S키로 일시정지
    if (event.key === 's' || event.key === 'S') {
        togglePause();
        return;
    }
    
    if (isPaused) return;
    
    // 키보드 기본 동작 방지 (스페이스바 클릭 등)
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(event.code) > -1) {
        event.preventDefault();
    }
    
    switch (event.key) {
        case 'ArrowLeft':
            playerMove(-1);
            break;
        case 'ArrowRight':
            playerMove(1);
            break;
        case 'ArrowDown':
            playerDrop();
            break;
        case 'ArrowUp':
            playerRotate(1);
            break;
        case 'w':
        case 'W': // W 키로 하드 드롭
            playerHardDrop();
            break;
    }
    
    // 키 누를때 즉시 화면 업데이트
    if (!isPaused && !isGameOver) {
        drawBoard();
        drawCurrentPiece();
    }
});

// 버튼 이벤트 리스너
startBtn.addEventListener('click', () => {
    if (gameStarted && !isGameOver) {
        resetGame(); // 게임 중 다시 시작
    } else {
        resetGame();
    }
});

pauseBtn.addEventListener('click', () => {
    togglePause();
});

restartBtn.addEventListener('click', () => {
    resetGame();
});

// 초기 화면 그리기
bestScoreElement.innerText = bestScore;
board = createBoard();
drawBoard();
