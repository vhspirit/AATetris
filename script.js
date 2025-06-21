const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const GRID_SIZE = 30; // Size of each block in pixels
const BOARD_WIDTH = 10; // Number of columns
const BOARD_HEIGHT = 20; // Number of rows

canvas.width = BOARD_WIDTH * GRID_SIZE;
canvas.height = BOARD_HEIGHT * GRID_SIZE;

context.scale(GRID_SIZE, GRID_SIZE);

// Tetromino shapes and colors
const TETROMINOES = [
    [ // I
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    [ // J
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0],
    ],
    [ // L
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
    ],
    [ // O
        [4, 4],
        [4, 4],
    ],
    [ // S
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
    ],
    [ // T
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0],
    ],
    [ // Z
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
    ],
];

const COLORS = [
    null, // 0: empty
    '#FF0000', // 1: Red (I)
    '#0000FF', // 2: Blue (J)
    '#FFA500', // 3: Orange (L)
    '#FFFF00', // 4: Yellow (O)
    '#00FF00', // 5: Green (S)
    '#800080', // 6: Purple (T)
    '#FF00FF', // 7: Magenta (Z) - Using Magenta instead of Red for Z to differentiate
];


// Create the game board
const board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));

let score = 0;

// Function to draw a single block
function drawBlock(x, y, colorIndex) {
    if (colorIndex === 0) return; // Don't draw empty blocks
    context.fillStyle = COLORS[colorIndex];
    context.strokeStyle = '#1a1a1a'; // Dark border for blocks
    context.lineWidth = 0.05; // Thin border
    context.fillRect(x, y, 1, 1);
    context.strokeRect(x, y, 1, 1);
}

// Function to draw the board
function drawBoard() {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            drawBlock(x, y, board[y][x]);
        }
    }
}

// Function to draw the current piece
function drawPiece(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(piece.x + x, piece.y + y, value);
            }
        });
    });
}

// Function to generate a random piece
function createPiece() {
    const rand = Math.floor(Math.random() * TETROMINOES.length);
    const shape = TETROMINOES[rand];
    const colorIndex = rand + 1; // Use index + 1 for color
    return {
        shape: shape,
        colorIndex: colorIndex,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
        y: 0,
    };
}

let currentPiece = createPiece();

// Function to check for collision
function collide(board, piece) {
    const [shape, ox, oy] = [piece.shape, piece.x, piece.y];
    for (let y = 0; y < shape.length; ++y) {
        for (let x = 0; x < shape[y].length; ++x) {
            if (shape[y][x] !== 0 &&
                (board[y + oy] && board[y + oy][x + ox]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Function to merge piece into board
function merge(board, piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.y][x + piece.x] = value;
            }
        });
    });
}

// Function to rotate the piece
function rotate(piece, dir) {
    // Transpose
    for (let y = 0; y < piece.shape.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [piece.shape[x][y], piece.shape[y][x]] =
            [piece.shape[y][x], piece.shape[x][y]];
        }
    }

    // Reverse rows
    if (dir > 0) {
        piece.shape.forEach(row => row.reverse());
    } else {
        piece.shape.reverse();
    }

    // Wall kick logic (basic)
    let offset = 1;
    while (collide(board, piece)) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) {
            rotate(piece, -dir); // Revert rotation
            piece.x = originalX;
            return;
        }
    }
}


// Function to move the piece
function movePiece(dir) {
    currentPiece.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.x -= dir; // Revert move if collision
    }
}

// Function to drop the piece
function dropPiece() {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
        currentPiece.y--; // Revert move if collision
        merge(board, currentPiece);
        checkLines();
        currentPiece = createPiece();
        if (collide(board, currentPiece)) {
            // Game Over
            console.log("Game Over");
            board.forEach(row => row.fill(0)); // Clear board
            score = 0;
            updateScore();
        }
    }
    dropCounter = 0; // Reset drop counter
}

// Function to check and clear completed lines
function checkLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer; // Not a full line
            }
        }

        // Line is full, remove it and add a new empty line at the top
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y; // Check the new line at the same index
        linesCleared++;
    }
    if (linesCleared > 0) {
        score += linesCleared * 100; // Basic scoring
        updateScore();
    }
}

// Function to update the score display
function updateScore() {
    scoreElement.innerText = score;
}

// Game loop
let dropCounter = 0;
let dropInterval = 1000; // milliseconds
let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        dropPiece();
    }

    context.fillStyle = '#0d0d0d'; // Clear canvas with board background color
    context.fillRect(0, 0, canvas.width / GRID_SIZE, canvas.height / GRID_SIZE);

    drawBoard();
    drawPiece(currentPiece);

    requestAnimationFrame(update);
}

// Event listeners for keyboard input
document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        movePiece(-1);
    } else if (event.key === 'ArrowRight') {
        movePiece(1);
    } else if (event.key === 'ArrowDown') {
        dropPiece();
    } else if (event.key === 'ArrowUp') {
        rotate(currentPiece, 1); // Rotate clockwise
    } else if (event.key === 'z') {
        rotate(currentPiece, -1); // Rotate counter-clockwise
    }
});

updateScore(); // Initial score display
update(); // Start the game loop
