// 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;

// 테트로미노 정의 (I, O, T, S, Z, J, L)
const PIECES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-i",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "piece-o",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "piece-t",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "piece-s",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "piece-z",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "piece-j",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "piece-l",
  },
};

const PIECE_TYPES = Object.keys(PIECES);
const DROP_INTERVAL_MS = 800;

/** @type {Record<number, number>} 한 번에 삭제한 줄 수별 점수 */
const LINE_SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// DOM 요소
const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const gameStatusElement = document.getElementById("game-status");
const startButton = document.getElementById("start-btn");
const pauseButton = document.getElementById("pause-btn");
const restartButton = document.getElementById("restart-btn");

// 게임 상태
let score = 0;
let grid = [];
let currentPiece = null;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let isLocking = false;
let dropIntervalId = null;

/**
 * 빈 보드 DOM을 생성합니다.
 * 각 칸은 div.cell 요소로 만들어집니다.
 */
function createEmptyBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardElement.appendChild(cell);
    }
  }
}

/**
 * 보드 논리 상태(2D 배열)를 초기화합니다.
 */
function initGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/**
 * 새 테트로미노를 생성합니다.
 * @param {string} [type] - 블록 종류 (I, O, T, S, Z, J, L). 생략 시 무작위.
 * @returns {{ type: string, row: number, col: number, shape: number[][], color: string }}
 */
function createPiece(type) {
  const pieceType = type ?? PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const { shape, color } = PIECES[pieceType];
  const shapeWidth = shape[0].length;

  return {
    type: pieceType,
    row: 0,
    col: Math.floor((COLS - shapeWidth) / 2),
    shape: shape.map((row) => [...row]),
    color,
  };
}

/**
 * shape 행렬을 시계 방향 90도 회전합니다.
 * @param {number[][]} shape
 * @returns {number[][]}
 */
function rotateShape(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rotated[col][rows - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

/**
 * 이동 후 위치가 유효한지 검사합니다.
 * @param {{ row: number, col: number, shape: number[][] }} piece
 * @param {number} dx - 가로 이동량
 * @param {number} dy - 세로 이동량
 * @param {(string|null)[][]} matrix - 고정 블록이 담긴 보드
 * @returns {boolean}
 */
function canMove(piece, dx, dy, matrix) {
  for (let shapeRow = 0; shapeRow < piece.shape.length; shapeRow++) {
    for (let shapeCol = 0; shapeCol < piece.shape[shapeRow].length; shapeCol++) {
      if (!piece.shape[shapeRow][shapeCol]) {
        continue;
      }

      const boardRow = piece.row + shapeRow + dy;
      const boardCol = piece.col + shapeCol + dx;

      if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) {
        return false;
      }

      if (boardRow >= 0 && matrix[boardRow][boardCol]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 활성 블록을 보드에 고정합니다.
 * @param {{ row: number, col: number, shape: number[][], color: string }} piece
 * @param {(string|null)[][]} matrix
 */
function lockPiece(piece, matrix) {
  piece.shape.forEach((rowCells, shapeRow) => {
    rowCells.forEach((value, shapeCol) => {
      if (!value) {
        return;
      }

      const boardRow = piece.row + shapeRow;
      const boardCol = piece.col + shapeCol;

      if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
        matrix[boardRow][boardCol] = piece.color;
      }
    });
  });
}

/**
 * 한 줄이 모두 채워졌는지 검사합니다.
 * @param {(string|null)[]} row
 * @returns {boolean}
 */
function isRowFull(row) {
  for (let col = 0; col < COLS; col++) {
    if (!row[col]) {
      return false;
    }
  }
  return true;
}

/**
 * 가득 찬 줄을 삭제하고 남은 블록을 보드 바닥으로 내립니다.
 * @returns {number} 삭제된 줄 수
 */
function clearFullLines() {
  const fullRowCount = grid.filter((row) => isRowFull(row)).length;

  if (fullRowCount === 0) {
    return 0;
  }

  const remainingRows = grid.filter((row) => !isRowFull(row));
  const compactedRows = remainingRows.filter((row) => row.some((cell) => cell));
  const emptyRowCount = ROWS - compactedRows.length;
  const emptyRows = Array.from({ length: emptyRowCount }, () => Array(COLS).fill(null));

  grid = emptyRows.concat(compactedRows);

  return fullRowCount;
}

/**
 * 삭제된 줄 수에 따라 점수를 더합니다.
 * @param {number} linesCleared
 */
function addScoreForLines(linesCleared) {
  if (linesCleared <= 0) {
    return;
  }

  const points = LINE_SCORES[linesCleared] ?? linesCleared * 100;
  score += points;
  updateScore();
}

/**
 * 현재 블록을 이동 시도합니다.
 * @param {number} dx
 * @param {number} dy
 * @returns {boolean} 이동 성공 여부
 */
function tryMovePiece(dx, dy) {
  if (!currentPiece || !isPlaying || isPaused) {
    return false;
  }

  if (!canMove(currentPiece, dx, dy, grid)) {
    return false;
  }

  currentPiece.row += dy;
  currentPiece.col += dx;
  return true;
}

/**
 * 현재 블록을 시계 방향으로 회전 시도합니다.
 * @returns {boolean} 회전 성공 여부
 */
function tryRotatePiece() {
  if (!currentPiece || !isPlaying || isPaused) {
    return false;
  }

  const rotatedShape = rotateShape(currentPiece.shape);
  const testPiece = {
    row: currentPiece.row,
    col: currentPiece.col,
    shape: rotatedShape,
  };

  if (!canMove(testPiece, 0, 0, grid)) {
    return false;
  }

  currentPiece.shape = rotatedShape;
  return true;
}

/**
 * 한 칸 아래로 빠르게 내립니다. 바닥에 닿으면 고정합니다.
 */
function softDrop() {
  if (!currentPiece || !isPlaying || isPaused) {
    return;
  }

  if (tryMovePiece(0, 1)) {
    render();
    return;
  }

  lockCurrentPieceAndSpawn();
  render();
}

/**
 * 바닥 또는 고정 블록까지 즉시 낙하합니다.
 */
function hardDrop() {
  if (!currentPiece || !isPlaying || isPaused) {
    return;
  }

  while (tryMovePiece(0, 1)) {
    // canMove를 통과할 때만 한 칸씩 낙하
  }

  lockCurrentPieceAndSpawn();
  render();
}

/**
 * 게임 오버 상태로 전환합니다.
 */
function handleGameOver() {
  stopDropTimer();
  isPlaying = false;
  isPaused = false;
  isGameOver = true;
  currentPiece = null;
  updateGameStatus();
  updatePauseButton();
  render();
}

/**
 * 현재 블록을 고정하고 새 블록을 생성합니다.
 */
function lockCurrentPieceAndSpawn() {
  if (!currentPiece || !isPlaying || isLocking) {
    return;
  }

  isLocking = true;

  try {
    lockPiece(currentPiece, grid);
    const linesCleared = clearFullLines();
    addScoreForLines(linesCleared);

    currentPiece = createPiece();

    if (!canMove(currentPiece, 0, 0, grid)) {
      handleGameOver();
    }
  } finally {
    isLocking = false;
  }
}

/**
 * 자동 낙하 1틱: 아래로 이동하거나 충돌 시 고정합니다.
 */
function tick() {
  if (!isPlaying || isPaused || !currentPiece) {
    return;
  }

  if (tryMovePiece(0, 1)) {
    render();
    return;
  }

  lockCurrentPieceAndSpawn();
  render();
}

function startDropTimer() {
  stopDropTimer();
  dropIntervalId = setInterval(tick, DROP_INTERVAL_MS);
}

function stopDropTimer() {
  if (dropIntervalId !== null) {
    clearInterval(dropIntervalId);
    dropIntervalId = null;
  }
}

/**
 * grid 상태를 기반으로 보드를 화면에 그립니다.
 */
function renderBoard() {
  const cells = boardElement.querySelectorAll(".cell");

  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const colorClass = grid[row]?.[col] ?? null;

    cell.className = "cell";
    if (colorClass) {
      cell.classList.add("filled", colorClass);
    }
  });
}

/**
 * 현재 활성 블록을 보드 위에 그립니다.
 * @param {{ row: number, col: number, shape: number[][], color: string } | null} piece
 */
function drawPiece(piece) {
  if (!piece) {
    return;
  }

  piece.shape.forEach((rowCells, shapeRow) => {
    rowCells.forEach((value, shapeCol) => {
      if (!value) {
        return;
      }

      const boardRow = piece.row + shapeRow;
      const boardCol = piece.col + shapeCol;

      if (boardRow < 0 || boardRow >= ROWS || boardCol < 0 || boardCol >= COLS) {
        return;
      }

      const cell = boardElement.querySelector(
        `[data-row="${boardRow}"][data-col="${boardCol}"]`
      );

      if (cell) {
        cell.classList.add("filled", piece.color);
      }
    });
  });
}

/**
 * 보드와 현재 블록을 함께 화면에 갱신합니다.
 */
function render() {
  renderBoard();
  drawPiece(currentPiece);
}

/**
 * 점수를 화면에 표시합니다.
 */
function updateScore() {
  scoreElement.textContent = score;
}

function updateGameStatus() {
  if (!gameStatusElement) {
    return;
  }

  if (isGameOver) {
    gameStatusElement.textContent = "게임 오버";
    gameStatusElement.classList.add("game-status--over");
    gameStatusElement.classList.remove("game-status--paused");
    return;
  }

  if (isPaused) {
    gameStatusElement.textContent = "일시 정지";
    gameStatusElement.classList.add("game-status--paused");
    gameStatusElement.classList.remove("game-status--over");
    return;
  }

  gameStatusElement.textContent = isPlaying ? "플레이 중" : "";
  gameStatusElement.classList.remove("game-status--over", "game-status--paused");
}

function updatePauseButton() {
  if (!pauseButton) {
    return;
  }

  pauseButton.textContent = isPaused ? "계속" : "일시 정지";
  pauseButton.disabled = !isPlaying || isGameOver;
}

function togglePause() {
  if (!isPlaying || isGameOver) {
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    stopDropTimer();
  } else {
    startDropTimer();
  }

  updateGameStatus();
  updatePauseButton();
}

/**
 * 게임을 초기 상태로 되돌립니다.
 */
function resetGame() {
  stopDropTimer();
  score = 0;
  isPlaying = true;
  isPaused = false;
  isGameOver = false;
  isLocking = false;
  updateScore();
  updateGameStatus();
  updatePauseButton();
  createEmptyBoard();
  initGrid();
  currentPiece = createPiece();
  render();
  startDropTimer();
}

let keyboardControlsInitialized = false;

/**
 * 키보드 입력을 처리합니다.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
  if (!isPlaying || isPaused || !currentPiece) {
    return;
  }

  switch (event.code) {
    case "ArrowLeft":
      event.preventDefault();
      if (tryMovePiece(-1, 0)) {
        render();
      }
      break;
    case "ArrowRight":
      event.preventDefault();
      if (tryMovePiece(1, 0)) {
        render();
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      break;
    case "ArrowUp":
      event.preventDefault();
      if (tryRotatePiece()) {
        render();
      }
      break;
    case "Space":
      if (event.repeat) {
        break;
      }
      event.preventDefault();
      hardDrop();
      break;
    default:
      break;
  }
}

function initKeyboardControls() {
  if (keyboardControlsInitialized) {
    return;
  }

  document.addEventListener("keydown", handleKeyDown);
  keyboardControlsInitialized = true;
}

// 시작 버튼
startButton.addEventListener("click", function () {
  resetGame();
  console.log("게임 시작");
});

// 재시작 버튼
restartButton.addEventListener("click", function () {
  resetGame();
  console.log("게임 재시작");
});

pauseButton.addEventListener("click", function () {
  togglePause();
});

// 페이지 로드 시 보드와 블록 표시
initKeyboardControls();
createEmptyBoard();
initGrid();
currentPiece = createPiece();
render();
updateScore();
updateGameStatus();
updatePauseButton();
