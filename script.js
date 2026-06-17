// =============================================================================
// 상수
// =============================================================================

const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL_MS = 800;

/** @type {Record<number, number>} 한 번에 삭제한 줄 수별 점수 */
const LINE_SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

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

// =============================================================================
// DOM · 게임 상태
// =============================================================================

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const gameStatusElement = document.getElementById("game-status");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");

let score = 0;
/** @type {(string|null)[][]} */
let grid = [];
/** @type {{ type: string, row: number, col: number, shape: number[][], color: string } | null} */
let currentPiece = null;
let isPlaying = false;
let isGameOver = false;
let isLocking = false;
let dropIntervalId = null;
let keyboardControlsInitialized = false;

// =============================================================================
// 보드 초기화
// =============================================================================

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

function initGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function resetBoardState() {
  createEmptyBoard();
  initGrid();
}

// =============================================================================
// 블록 생성
// =============================================================================

function createPiece(type) {
  const pieceType = type ?? PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const pieceDef = PIECES[pieceType];

  if (!pieceDef) {
    throw new Error(`Unknown piece type: ${pieceType}`);
  }

  const { shape, color } = pieceDef;
  const shapeWidth = shape[0].length;

  return {
    type: pieceType,
    row: 0,
    col: Math.floor((COLS - shapeWidth) / 2),
    shape: shape.map((row) => [...row]),
    color,
  };
}

// =============================================================================
// 충돌 판정 · 고정
// =============================================================================

function allPieceCellsOnBoard(piece) {
  for (let shapeRow = 0; shapeRow < piece.shape.length; shapeRow++) {
    for (let shapeCol = 0; shapeCol < piece.shape[shapeRow].length; shapeCol++) {
      if (!piece.shape[shapeRow][shapeCol]) {
        continue;
      }

      if (piece.row + shapeRow < 0) {
        return false;
      }
    }
  }

  return true;
}

function settlePieceOnBoard(piece) {
  while (!allPieceCellsOnBoard(piece)) {
    if (!canMove(piece, 0, 1, grid)) {
      break;
    }
    piece.row += 1;
  }
}

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

function isGameActive() {
  return isPlaying && !isGameOver && currentPiece !== null && !isLocking;
}

// =============================================================================
// 줄 삭제 · 점수
// =============================================================================

function isRowFull(row) {
  for (let col = 0; col < COLS; col++) {
    if (!row[col]) {
      return false;
    }
  }
  return true;
}

function clearFullLines() {
  const remainingRows = grid.filter((row) => !isRowFull(row));
  const linesCleared = ROWS - remainingRows.length;

  if (linesCleared === 0) {
    return 0;
  }

  const emptyRows = Array.from({ length: linesCleared }, () => Array(COLS).fill(null));
  grid = emptyRows.concat(remainingRows);

  return linesCleared;
}

function addScoreForLines(linesCleared) {
  if (linesCleared <= 0) {
    return;
  }

  const points = LINE_SCORES[linesCleared] ?? linesCleared * 100;
  score += points;
  updateScore();
}

// =============================================================================
// 이동 · 회전 · 낙하
// =============================================================================

function tryMovePiece(dx, dy) {
  if (!isGameActive()) {
    return false;
  }

  if (!canMove(currentPiece, dx, dy, grid)) {
    return false;
  }

  currentPiece.row += dy;
  currentPiece.col += dx;
  return true;
}

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

function tryRotatePiece() {
  if (!isGameActive()) {
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
 * 한 칸 아래로 이동하거나, 불가능하면 고정·스폰합니다.
 * @returns {"moved"|"locked"|"idle"}
 */
function dropOneStep() {
  if (!isGameActive()) {
    return "idle";
  }

  if (tryMovePiece(0, 1)) {
    return "moved";
  }

  lockCurrentPieceAndSpawn();
  return "locked";
}

function softDrop() {
  const result = dropOneStep();
  if (result !== "idle") {
    render();
  }
}

function hardDrop() {
  if (!isPlaying || isGameOver || !currentPiece || isLocking) {
    return;
  }

  while (tryMovePiece(0, 1)) {
    // canMove를 통과할 때만 한 칸씩 낙하
  }

  lockCurrentPieceAndSpawn();
  render();
}

// =============================================================================
// 고정 · 스폰 · 게임 흐름
// =============================================================================

function lockCurrentPieceAndSpawn() {
  if (!currentPiece || !isPlaying || isGameOver || isLocking) {
    return;
  }

  isLocking = true;

  try {
    settlePieceOnBoard(currentPiece);

    if (!allPieceCellsOnBoard(currentPiece)) {
      handleGameOver();
      return;
    }

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

function handleGameOver() {
  stopDropTimer();
  isPlaying = false;
  isGameOver = true;
  currentPiece = null;
  updateGameStatus();
  render();
}

function tick() {
  const result = dropOneStep();
  if (result !== "idle") {
    render();
  }
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

function resetGame() {
  stopDropTimer();
  score = 0;
  isPlaying = true;
  isGameOver = false;
  isLocking = false;
  updateScore();
  resetBoardState();
  currentPiece = createPiece();
  updateGameStatus();
  render();
  startDropTimer();
}

// =============================================================================
// 렌더링 · UI
// =============================================================================

function renderBoard() {
  const cells = boardElement.querySelectorAll(".cell");

  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const colorClass = grid[row][col];

    cell.className = "cell";
    if (colorClass) {
      cell.classList.add("filled", colorClass);
    }
  });
}

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

function render() {
  renderBoard();
  drawPiece(currentPiece);
}

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
    gameStatusElement.classList.remove("game-status--playing");
    return;
  }

  if (isPlaying) {
    gameStatusElement.textContent = "플레이 중";
    gameStatusElement.classList.add("game-status--playing");
    gameStatusElement.classList.remove("game-status--over");
    return;
  }

  gameStatusElement.textContent = "시작 버튼을 눌러주세요";
  gameStatusElement.classList.remove("game-status--over", "game-status--playing");
}

// =============================================================================
// 입력
// =============================================================================

function canAcceptInput() {
  return isPlaying && !isGameOver && currentPiece !== null;
}

function handleMoveLeft() {
  if (tryMovePiece(-1, 0)) {
    render();
  }
}

function handleMoveRight() {
  if (tryMovePiece(1, 0)) {
    render();
  }
}

function handleRotate() {
  if (tryRotatePiece()) {
    render();
  }
}

function handleKeyDown(event) {
  if (!canAcceptInput()) {
    return;
  }

  switch (event.code) {
    case "ArrowLeft":
      event.preventDefault();
      handleMoveLeft();
      break;
    case "ArrowRight":
      event.preventDefault();
      handleMoveRight();
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      break;
    case "ArrowUp":
      event.preventDefault();
      handleRotate();
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

function initTouchControls() {
  const touchActions = [
    { id: "touch-left", action: handleMoveLeft },
    { id: "touch-right", action: handleMoveRight },
    { id: "touch-down", action: softDrop },
    { id: "touch-rotate", action: handleRotate },
    { id: "touch-drop", action: hardDrop },
  ];

  touchActions.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (!button) {
      return;
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (!canAcceptInput()) {
        return;
      }
      action();
    });
  });
}

function handleGameControlClick() {
  resetGame();
}

// =============================================================================
// 초기화
// =============================================================================

initKeyboardControls();
initTouchControls();
startButton.addEventListener("click", handleGameControlClick);
restartButton.addEventListener("click", handleGameControlClick);

resetBoardState();
currentPiece = null;
render();
updateScore();
updateGameStatus();
