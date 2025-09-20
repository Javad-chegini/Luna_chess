const pieces = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};
const pieceNames = {
    'K': 'شاه', 'Q': 'وزیر', 'R': 'رخ', 'B': 'فیل', 'N': 'اسب', 'P': 'پیاده',
    'k': 'شاه', 'q': 'وزیر', 'r': 'رخ', 'b': 'فیل', 'n': 'اسب', 'p': 'پیاده'
};
const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];
let board = [];
let selectedSquare = null;
let currentTurn = 'white';
let moveHistory = [];
let capturedPieces = { white: [], black: [] };
let gameStatus = 'active';
let enPassantTarget = null;
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let halfMoveClock = 0;
let positionHistory = [];
let isAIEnabled = false;
let aiColor = 'black';
const transpositionTable = new Map();
const killerMoves = Array(20).fill(null).map(() => [null, null]);
const historyTable = {};
let nodesSearched = 0;
const moveSound = new Audio('sound/817547__silverdubloons__pickupcard01.wav');
const checkSound = new Audio('sound/176238__melissapons__sci-fi_short_error.wav');
let soundEnabled = true;
function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundOn = document.querySelector('.sound-on');
    const soundOff = document.querySelector('.sound-off');
    if (soundEnabled) {
        soundOn.style.display = 'inline';
        soundOff.style.display = 'none';
    } else {
        soundOn.style.display = 'none';
        soundOff.style.display = 'inline';
    }
}
function initBoard() {
    board = initialBoard.map(row => [...row]);
    selectedSquare = null;
    currentTurn = 'white';
    moveHistory = [];
    capturedPieces = { white: [], black: [] };
    gameStatus = 'active';
    enPassantTarget = null;
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    halfMoveClock = 0;
    positionHistory = [];
    renderBoard();
    updateTurnIndicator();
    checkGameStatus();
    if (isAIEnabled && currentTurn === aiColor) {
        makeAIMove();
    }
}
function renderBoard() {
    const boardElement = document.getElementById('chess-board');
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'white-square' : 'black-square'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.onclick = () => handleSquareClick(row, col);
            if (col === 0) {
                const rankLabel = document.createElement('span');
                rankLabel.className = 'coordinates rank-label';
                rankLabel.textContent = 8 - row;
                square.appendChild(rankLabel);
            }
            if (row === 7) {
                const fileLabel = document.createElement('span');
                fileLabel.className = 'coordinates file-label';
                fileLabel.textContent = String.fromCharCode(97 + col);
                square.appendChild(fileLabel);
            }
            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'piece';
                pieceElement.textContent = pieces[piece];
                square.appendChild(pieceElement);
            }
            if (isKingInCheck(currentTurn) && piece && piece.toLowerCase() === 'k') {
                const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
                if (pieceColor === currentTurn) {
                    square.classList.add('check');
                }
            }
            boardElement.appendChild(square);
        }
    }
}
function toggleAI() {
    isAIEnabled = !isAIEnabled;
    document.getElementById('ai-toggle').textContent = isAIEnabled ? 'AI: روشن' : 'AI: خاموش';
    if (isAIEnabled && currentTurn === aiColor) {
        makeAIMove();
    }
}
function changeAIColor() {
    aiColor = document.getElementById('ai-color-select').value;
    if (isAIEnabled && currentTurn === aiColor && gameStatus === 'active') {
        makeAIMove();
    }
}
function toggleAI() {
    isAIEnabled = !isAIEnabled;
    const button = document.getElementById('ai-toggle');
    const select = document.getElementById('ai-color-select');
    if (isAIEnabled) {
        button.textContent = 'AI: روشن';
        select.disabled = false;
        if (currentTurn === aiColor && gameStatus === 'active') {
            makeAIMove();
        }
    } else {
        button.textContent = 'AI: خاموش';
        select.disabled = true;
    }
}
const pieceValues = {
    'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
    'P': -100, 'N': -320, 'B': -330, 'R': -500, 'Q': -900, 'K': -20000
};
const positionTables = {
    'p': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'n': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'b': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'r': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    'q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'k': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
    ]
};
function evaluateBoard() {
    let score = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const pieceType = piece.toLowerCase();
                const isWhite = piece === piece.toUpperCase();
                score += pieceValues[piece];
                let positionValue = positionTables[pieceType][row][col];
                if (isWhite) {
                    positionValue = positionTables[pieceType][7-row][col];
                }
                score += isWhite ? -positionValue : positionValue;
            }
        }
    }
    score += evaluateMobility() * 10;
    score += evaluateKingSafety() * 30;
    score += evaluatePawnStructure() * 20;
    score += evaluateCenterControl() * 15;
    score += evaluatePieceActivity() * 12;
    return score;
}
function evaluateMobility() {
    const whiteMoves = getAllLegalMoves('white').length;
    const blackMoves = getAllLegalMoves('black').length;
    return blackMoves - whiteMoves;
}
function evaluateKingSafety() {
    let safety = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.toLowerCase() === 'k') {
                const isWhite = piece === piece.toUpperCase();
                const kingSafety = countKingDefenders(row, col) - countKingAttackers(row, col);
                safety += isWhite ? -kingSafety : kingSafety;
            }
        }
    }
    return safety;
}
function countKingDefenders(kingRow, kingCol) {
    let defenders = 0;
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    for (let [dr, dc] of directions) {
        const newRow = kingRow + dr;
        const newCol = kingCol + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const piece = board[newRow][newCol];
            if (piece && piece.toLowerCase() === 'p') {
                defenders++;
            }
        }
    }
    return defenders;
}
function countKingAttackers(kingRow, kingCol) {
    let attackers = 0;
    const king = board[kingRow][kingCol];
    const kingColor = king === king.toUpperCase() ? 'white' : 'black';
    const enemyColor = kingColor === 'white' ? 'black' : 'white';
    const enemyMoves = getAllLegalMoves(enemyColor);
    for (let move of enemyMoves) {
        if (move.to.row === kingRow && move.to.col === kingCol) {
            attackers++;
        }
    }
    return attackers;
}
function evaluatePawnStructure() {
    let score = 0;
    for (let col = 0; col < 8; col++) {
        let whitePawns = 0;
        let blackPawns = 0;
        for (let row = 0; row < 8; row++) {
            const piece = board[row][col];
            if (piece === 'P') whitePawns++;
            if (piece === 'p') blackPawns++;
        }
        if (whitePawns > 1) score += 10;
        if (blackPawns > 1) score -= 10;
    }
    return score;
}
function minimax(depth, alpha, beta, isMaximizing, lastMove = null, extensions = 0) {
    nodesSearched++;
    const boardHash = getBoardHash();
    const ttEntry = transpositionTable.get(boardHash);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 'EXACT') return ttEntry.value;
        if (ttEntry.flag === 'ALPHA' && ttEntry.value <= alpha) return alpha;
        if (ttEntry.flag === 'BETA' && ttEntry.value >= beta) return beta;
    }
    if (gameStatus !== 'active') {
        return evaluateTerminalPosition(isMaximizing);
    }
    if (depth <= 0) {
        return quiescenceSearch(alpha, beta, isMaximizing);
    }
    const color = isMaximizing ? 'black' : 'white';
    let moves = getAllLegalMoves(color);
    if (moves.length === 0) {
        if (isKingInCheck(color)) {
            return isMaximizing ? -50000 + (10 - depth) : 50000 - (10 - depth);
        }
        return 0;
    }
    let extendDepth = 0;
    if (extensions < 3) {
        if (isKingInCheck(color)) extendDepth++;
        if (lastMove && isPawnPromotion(lastMove)) extendDepth++;
    }
    moves = orderMoves(moves, depth, color, killerMoves[depth], ttEntry?.bestMove);
    if (!isKingInCheck(color) && depth >= 3 && !isMaximizing) {
        const nullScore = -minimax(depth - 3, -beta, -beta + 1, !isMaximizing, null, extensions);
        if (nullScore >= beta) {
            return beta;
        }
    }
    let bestMove = null;
    let bestValue = isMaximizing ? -Infinity : Infinity;
    let flag = 'ALPHA';
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        let searchDepth = depth - 1 + extendDepth;
        if (i > 3 && depth >= 3 && !isCapture(move) && !isCheck(move)) {
            searchDepth--;
        }
        const moveInfo = makeTemporaryMove(move);
        let eval;
        if (i === 0) {
            eval = minimax(searchDepth, alpha, beta, !isMaximizing, move, extensions + extendDepth);
        } else {
            eval = minimax(searchDepth, alpha, alpha + 1, !isMaximizing, move, extensions + extendDepth);
            if (eval > alpha && eval < beta) {
                eval = minimax(searchDepth, alpha, beta, !isMaximizing, move, extensions + extendDepth);
            }
        }
        undoTemporaryMove(moveInfo);
        if (isMaximizing) {
            if (eval > bestValue) {
                bestValue = eval;
                bestMove = move;
                if (eval > alpha) {
                    alpha = eval;
                    flag = 'EXACT';
                }
            }
        } else {
            if (eval < bestValue) {
                bestValue = eval;
                bestMove = move;
                if (eval < beta) {
                    beta = eval;
                    flag = 'EXACT';
                }
            }
        }
        if (beta <= alpha) {
            flag = isMaximizing ? 'BETA' : 'ALPHA';
            if (!isCapture(move)) {
                if (killerMoves[depth][0] !== move) {
                    killerMoves[depth][1] = killerMoves[depth][0];
                    killerMoves[depth][0] = move;
                }
            }
            updateHistoryTable(move, depth);
            break;
        }
    }
    transpositionTable.set(boardHash, {
        depth: depth,
        value: bestValue,
        flag: flag,
        bestMove: bestMove
    });
    if (transpositionTable.size > 100000) {
        const keysToDelete = Array.from(transpositionTable.keys()).slice(0, 50000);
        keysToDelete.forEach(key => transpositionTable.delete(key));
    }
    return bestValue;
}
function evaluateCenterControl() {
    let score = 0;
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    for (let [row, col] of centerSquares) {
        const piece = board[row][col];
        if (piece) {
            const isWhite = piece === piece.toUpperCase();
            score += isWhite ? -10 : 10;
            if (piece.toLowerCase() === 'p') {
                score += isWhite ? -5 : 5;
            }
        }
    }
    for (let [row, col] of extendedCenter) {
        const piece = board[row][col];
        if (piece) {
            const isWhite = piece === piece.toUpperCase();
            score += isWhite ? -3 : 3;
        }
    }
    return score;
}
function evaluatePieceActivity() {
    let score = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) continue;
            const isWhite = piece === piece.toUpperCase();
            const pieceType = piece.toLowerCase();
            switch (pieceType) {
                case 'n':
                    score += evaluateKnightActivity(row, col, isWhite);
                    break;
                case 'b':
                    score += evaluateBishopActivity(row, col, isWhite);
                    break;
                case 'r':
                    score += evaluateRookActivity(row, col, isWhite);
                    break;
                case 'q':
                    score += evaluateQueenActivity(row, col, isWhite);
                    break;
            }
        }
    }
    return score;
}
function evaluateKnightActivity(row, col, isWhite) {
    let activity = 0;
    const moves = [
        [-2,-1], [-2,1], [-1,-2], [-1,2],
        [1,-2], [1,2], [2,-1], [2,1]
    ];
    for (let [dr, dc] of moves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            activity++;
            const target = board[newRow][newCol];
            if (target && (target === target.toUpperCase()) !== isWhite) {
                activity += 2;
            }
        }
    }
    return isWhite ? -activity : activity;
}
function evaluateBishopActivity(row, col, isWhite) {
    let activity = 0;
    const directions = [[-1,-1], [-1,1], [1,-1], [1,1]];
    for (let [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            activity++;
            const target = board[r][c];
            if (target) {
                if ((target === target.toUpperCase()) !== isWhite) {
                    activity += 2;
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }
    return isWhite ? -activity : activity;
}
function evaluateRookActivity(row, col, isWhite) {
    let activity = 0;
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    for (let [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            activity++;
            const target = board[r][c];
            if (target) {
                if ((target === target.toUpperCase()) !== isWhite) {
                    activity += 2;
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }
    let openFile = true;
    for (let r = 0; r < 8; r++) {
        if (board[r][col] && board[r][col].toLowerCase() === 'p') {
            openFile = false;
            break;
        }
    }
    if (openFile) activity += 10;
    return isWhite ? -activity : activity;
}
function evaluateQueenActivity(row, col, isWhite) {
    return evaluateRookActivity(row, col, isWhite) + evaluateBishopActivity(row, col, isWhite);
}
function updateGameStateAfterMove(move) {
    const piece = board[move.to.row][move.to.col];
    if (!piece) return;
    const pieceType = piece.toLowerCase();
    const color = piece === piece.toUpperCase() ? 'white' : 'black';
    if (pieceType === 'k') {
        castlingRights[color].kingside = false;
        castlingRights[color].queenside = false;
    } else if (pieceType === 'r') {
        if (move.from.row === (color === 'white' ? 7 : 0)) {
            if (move.from.col === 0) {
                castlingRights[color].queenside = false;
            } else if (move.from.col === 7) {
                castlingRights[color].kingside = false;
            }
        }
    }
    enPassantTarget = null;
    if (pieceType === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
        enPassantTarget = {
            row: (move.from.row + move.to.row) / 2,
            col: move.from.col
        };
    }
    if (pieceType === 'p' || board[move.to.row][move.to.col]) {
        halfMoveClock = 0;
    } else {
        halfMoveClock++;
    }
}
function isCheck(move) {
    const tempPiece = board[move.to.row][move.to.col];
    const movedPiece = board[move.from.row][move.from.col];
    board[move.to.row][move.to.col] = movedPiece;
    board[move.from.row][move.from.col] = null;
    const color = movedPiece === movedPiece.toUpperCase() ? 'white' : 'black';
    const enemyColor = color === 'white' ? 'black' : 'white';
    const enemyKingInCheck = isKingInCheck(enemyColor);
    board[move.from.row][move.from.col] = movedPiece;
    board[move.to.row][move.to.col] = tempPiece;
    return enemyKingInCheck;
}
function quiescenceSearch(alpha, beta, isMaximizing) {
    const standPat = evaluateBoard();
    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
    }
    const color = isMaximizing ? 'black' : 'white';
    const captures = getAllLegalMoves(color).filter(move => isCapture(move));
    for (let capture of captures) {
        const moveInfo = makeTemporaryMove(capture);
        const eval = quiescenceSearch(alpha, beta, !isMaximizing);
        undoTemporaryMove(moveInfo);
        if (isMaximizing) {
            alpha = Math.max(alpha, eval);
        } else {
            beta = Math.min(beta, eval);
        }
        if (beta <= alpha) break;
    }
    return isMaximizing ? alpha : beta;
}
function orderMoves(moves, depth, color, killers, ttMove) {
    return moves.sort((a, b) => {
        if (ttMove && moveEquals(a, ttMove)) return -1;
        if (ttMove && moveEquals(b, ttMove)) return 1;
        const aCapture = isCapture(a);
        const bCapture = isCapture(b);
        if (aCapture && !bCapture) return -1;
        if (!aCapture && bCapture) return 1;
        if (aCapture && bCapture) {
            return getMVVLVAScore(b) - getMVVLVAScore(a);
        }
        if (killers[0] && moveEquals(a, killers[0])) return -1;
        if (killers[0] && moveEquals(b, killers[0])) return 1;
        if (killers[1] && moveEquals(a, killers[1])) return -1;
        if (killers[1] && moveEquals(b, killers[1])) return 1;
        const aHistory = getHistoryScore(a);
        const bHistory = getHistoryScore(b);
        return bHistory - aHistory;
    });
}
function getMVVLVAScore(move) {
    const victim = board[move.to.row][move.to.col];
    const attacker = board[move.from.row][move.from.col];
    const victimValues = {'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100};
    const attackerValues = {'p': 6, 'n': 5, 'b': 4, 'r': 3, 'q': 2, 'k': 1};
    return victimValues[victim.toLowerCase()] * 10 - attackerValues[attacker.toLowerCase()];
}
function makeTemporaryMove(move) {
    const moveInfo = {
        from: move.from,
        to: move.to,
        piece: board[move.from.row][move.from.col],
        captured: board[move.to.row][move.to.col],
        castling: {...castlingRights},
        enPassant: enPassantTarget,
        halfMove: halfMoveClock
    };
    board[move.to.row][move.to.col] = moveInfo.piece;
    board[move.from.row][move.from.col] = null;
    updateGameStateAfterMove(move);
    return moveInfo;
}
function undoTemporaryMove(moveInfo) {
    board[moveInfo.from.row][moveInfo.from.col] = moveInfo.piece;
    board[moveInfo.to.row][moveInfo.to.col] = moveInfo.captured;
    castlingRights = moveInfo.castling;
    enPassantTarget = moveInfo.enPassant;
    halfMoveClock = moveInfo.halfMove;
}
function getBoardHash() {
    let hash = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            hash += board[row][col] || '.';
        }
    }
    hash += currentTurn;
    hash += JSON.stringify(castlingRights);
    return hash;
}
function isCapture(move) {
    return board[move.to.row][move.to.col] !== null;
}
function isPawnPromotion(move) {
    const piece = board[move.from.row][move.from.col];
    if (!piece || piece.toLowerCase() !== 'p') return false;
    return (piece === 'P' && move.to.row === 0) ||
           (piece === 'p' && move.to.row === 7);
}
function moveEquals(move1, move2) {
    if (!move1 || !move2) return false;
    return move1.from.row === move2.from.row &&
           move1.from.col === move2.from.col &&
           move1.to.row === move2.to.row &&
           move1.to.col === move2.to.col;
}
function updateHistoryTable(move, depth) {
    const key = `${move.from.row}${move.from.col}${move.to.row}${move.to.col}`;
    historyTable[key] = (historyTable[key] || 0) + depth * depth;
}
function getHistoryScore(move) {
    const key = `${move.from.row}${move.from.col}${move.to.row}${move.to.col}`;
    return historyTable[key] || 0;
}
function evaluateTerminalPosition(isMaximizing) {
    if (gameStatus === 'checkmate') {
        return isMaximizing ? -50000 : 50000;
    }
    return 0;
}function minimax(depth, alpha, beta, isMaximizing, lastMove = null, extensions = 0) {
    nodesSearched++;
    const boardHash = getBoardHash();
    const ttEntry = transpositionTable.get(boardHash);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 'EXACT') return ttEntry.value;
        if (ttEntry.flag === 'ALPHA' && ttEntry.value <= alpha) return alpha;
        if (ttEntry.flag === 'BETA' && ttEntry.value >= beta) return beta;
    }
    if (gameStatus !== 'active') {
        return evaluateTerminalPosition(isMaximizing);
    }
    if (depth <= 0) {
        return quiescenceSearch(alpha, beta, isMaximizing);
    }
    const color = isMaximizing ? 'black' : 'white';
    let moves = getAllLegalMoves(color);
    if (moves.length === 0) {
        if (isKingInCheck(color)) {
            return isMaximizing ? -50000 + (10 - depth) : 50000 - (10 - depth);
        }
        return 0;
    }
    let extendDepth = 0;
    if (extensions < 3) {
        if (isKingInCheck(color)) extendDepth++;
        if (lastMove && isPawnPromotion(lastMove)) extendDepth++;
    }
    moves = orderMoves(moves, depth, color, killerMoves[depth], ttEntry?.bestMove);
    if (!isKingInCheck(color) && depth >= 3 && !isMaximizing) {
        const nullScore = -minimax(depth - 3, -beta, -beta + 1, !isMaximizing, null, extensions);
        if (nullScore >= beta) {
            return beta;
        }
    }
    let bestMove = null;
    let bestValue = isMaximizing ? -Infinity : Infinity;
    let flag = 'ALPHA';
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        let searchDepth = depth - 1 + extendDepth;
        if (i > 3 && depth >= 3 && !isCapture(move) && !isCheck(move)) {
            searchDepth--;
        }
        const moveInfo = makeTemporaryMove(move);
        let eval;
        if (i === 0) {
            eval = minimax(searchDepth, alpha, beta, !isMaximizing, move, extensions + extendDepth);
        } else {
            eval = minimax(searchDepth, alpha, alpha + 1, !isMaximizing, move, extensions + extendDepth);
            if (eval > alpha && eval < beta) {
                eval = minimax(searchDepth, alpha, beta, !isMaximizing, move, extensions + extendDepth);
            }
        }
        undoTemporaryMove(moveInfo);
        if (isMaximizing) {
            if (eval > bestValue) {
                bestValue = eval;
                bestMove = move;
                if (eval > alpha) {
                    alpha = eval;
                    flag = 'EXACT';
                }
            }
        } else {
            if (eval < bestValue) {
                bestValue = eval;
                bestMove = move;
                if (eval < beta) {
                    beta = eval;
                    flag = 'EXACT';
                }
            }
        }
        if (beta <= alpha) {
            flag = isMaximizing ? 'BETA' : 'ALPHA';
            if (!isCapture(move)) {
                if (killerMoves[depth][0] !== move) {
                    killerMoves[depth][1] = killerMoves[depth][0];
                    killerMoves[depth][0] = move;
                }
            }
            updateHistoryTable(move, depth);
            break;
        }
    }
    transpositionTable.set(boardHash, {
        depth: depth,
        value: bestValue,
        flag: flag,
        bestMove: bestMove
    });
    if (transpositionTable.size > 100000) {
        const keysToDelete = Array.from(transpositionTable.keys()).slice(0, 50000);
        keysToDelete.forEach(key => transpositionTable.delete(key));
    }
    return bestValue;
}
function quiescenceSearch(alpha, beta, isMaximizing) {
    const standPat = evaluateBoard();
    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
    }
    const color = isMaximizing ? 'black' : 'white';
    const captures = getAllLegalMoves(color).filter(move => isCapture(move));
    for (let capture of captures) {
        const moveInfo = makeTemporaryMove(capture);
        const eval = quiescenceSearch(alpha, beta, !isMaximizing);
        undoTemporaryMove(moveInfo);
        if (isMaximizing) {
            alpha = Math.max(alpha, eval);
        } else {
            beta = Math.min(beta, eval);
        }
        if (beta <= alpha) break;
    }
    return isMaximizing ? alpha : beta;
}
function orderMoves(moves, depth, color, killers, ttMove) {
    return moves.sort((a, b) => {
        if (ttMove && moveEquals(a, ttMove)) return -1;
        if (ttMove && moveEquals(b, ttMove)) return 1;
        const aCapture = isCapture(a);
        const bCapture = isCapture(b);
        if (aCapture && !bCapture) return -1;
        if (!aCapture && bCapture) return 1;
        if (aCapture && bCapture) {
            return getMVVLVAScore(b) - getMVVLVAScore(a);
        }
        if (killers[0] && moveEquals(a, killers[0])) return -1;
        if (killers[0] && moveEquals(b, killers[0])) return 1;
        if (killers[1] && moveEquals(a, killers[1])) return -1;
        if (killers[1] && moveEquals(b, killers[1])) return 1;
        const aHistory = getHistoryScore(a);
        const bHistory = getHistoryScore(b);
        return bHistory - aHistory;
    });
}
function getMVVLVAScore(move) {
    const victim = board[move.to.row][move.to.col];
    const attacker = board[move.from.row][move.from.col];
    const victimValues = {'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100};
    const attackerValues = {'p': 6, 'n': 5, 'b': 4, 'r': 3, 'q': 2, 'k': 1};
    return victimValues[victim.toLowerCase()] * 10 - attackerValues[attacker.toLowerCase()];
}
function makeTemporaryMove(move) {
    const moveInfo = {
        from: move.from,
        to: move.to,
        piece: board[move.from.row][move.from.col],
        captured: board[move.to.row][move.to.col],
        castling: {...castlingRights},
        enPassant: enPassantTarget,
        halfMove: halfMoveClock
    };
    board[move.to.row][move.to.col] = moveInfo.piece;
    board[move.from.row][move.from.col] = null;
    updateGameStateAfterMove(move);
    return moveInfo;
}
function undoTemporaryMove(moveInfo) {
    board[moveInfo.from.row][moveInfo.from.col] = moveInfo.piece;
    board[moveInfo.to.row][moveInfo.to.col] = moveInfo.captured;
    castlingRights = moveInfo.castling;
    enPassantTarget = moveInfo.enPassant;
    halfMoveClock = moveInfo.halfMove;
}
function getBoardHash() {
    let hash = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            hash += board[row][col] || '.';
        }
    }
    hash += currentTurn;
    hash += JSON.stringify(castlingRights);
    return hash;
}
function isCapture(move) {
    return board[move.to.row][move.to.col] !== null;
}
function isPawnPromotion(move) {
    const piece = board[move.from.row][move.from.col];
    if (!piece || piece.toLowerCase() !== 'p') return false;
    return (piece === 'P' && move.to.row === 0) ||
           (piece === 'p' && move.to.row === 7);
}
function moveEquals(move1, move2) {
    if (!move1 || !move2) return false;
    return move1.from.row === move2.from.row &&
           move1.from.col === move2.from.col &&
           move1.to.row === move2.to.row &&
           move1.to.col === move2.to.col;
}
function updateHistoryTable(move, depth) {
    const key = `${move.from.row}${move.from.col}${move.to.row}${move.to.col}`;
    historyTable[key] = (historyTable[key] || 0) + depth * depth;
}
function getHistoryScore(move) {
    const key = `${move.from.row}${move.from.col}${move.to.row}${move.to.col}`;
    return historyTable[key] || 0;
}
function evaluateTerminalPosition(isMaximizing) {
    if (gameStatus === 'checkmate') {
        return isMaximizing ? -50000 : 50000;
    }
    return 0;
}
function simpleEvaluate() {
    let score = 0;
    const values = {'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100};
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = values[piece.toLowerCase()];
                score += piece === piece.toUpperCase() ? -value : value;
            }
        }
    }
    return score;
}
function handleSquareClick(row, col) {
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') {
        return;
    }
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (selectedSquare) {
        if (selectedSquare.row === row && selectedSquare.col === col) {
            clearSelection();
            return;
        }
        if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            clearSelection();
            switchTurn();
            checkGameStatus();
            setTimeout(() => makeAIMove(), 100);
        } else {
            clearSelection();
            selectSquare(row, col);
        }
    } else {
        selectSquare(row, col);
    }
}
function selectSquare(row, col) {
    const piece = board[row][col];
    if (!piece) return;
    const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
    if (pieceColor !== currentTurn) return;
    selectedSquare = { row, col };
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    square.classList.add('selected');
    showPossibleMoves(row, col);
}
function clearSelection() {
    if (!selectedSquare) return;
    document.querySelectorAll('.selected, .possible-move, .possible-capture').forEach(el => {
        el.classList.remove('selected', 'possible-move', 'possible-capture');
    });
    selectedSquare = null;
}
function showPossibleMoves(row, col) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                const square = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (board[r][c]) {
                    square.classList.add('possible-capture');
                } else {
                    square.classList.add('possible-move');
                }
            }
        }
    }
}
function isValidMove(fromRow, fromCol, toRow, toCol, checkingForCheck = false) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    const targetPiece = board[toRow][toCol];
    if (targetPiece) {
        const movingColor = piece === piece.toUpperCase() ? 'white' : 'black';
        const targetColor = targetPiece === targetPiece.toUpperCase() ? 'white' : 'black';
        if (movingColor === targetColor) return false;
    }
    if (!isBasicMoveValid(fromRow, fromCol, toRow, toCol)) {
        return false;
    }
    if (!checkingForCheck) {
        const tempBoard = board.map(row => [...row]);
        board[toRow][toCol] = board[fromRow][fromCol];
        board[fromRow][fromCol] = null;
        const color = piece === piece.toUpperCase() ? 'white' : 'black';
        const inCheck = isKingInCheck(color);
        board = tempBoard;
        if (inCheck) return false;
    }
    return true;
}
function isBasicMoveValid(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const pieceType = piece.toUpperCase();
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    switch (pieceType) {
        case 'P':
            return isPawnMoveValid(fromRow, fromCol, toRow, toCol, piece);
        case 'R':
            if (rowDiff === 0 || colDiff === 0) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            return false;
        case 'N':
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        case 'B':
            if (absRowDiff === absColDiff) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            return false;
        case 'Q':
            if (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            return false;
        case 'K':
            if (absRowDiff <= 1 && absColDiff <= 1) {
                return true;
            }
            return isCastlingValid(fromRow, fromCol, toRow, toCol, piece);
    }
    return false;
}
function isPawnMoveValid(fromRow, fromCol, toRow, toCol, piece) {
    const direction = piece === 'P' ? -1 : 1;
    const startRow = piece === 'P' ? 6 : 1;
    const enPassantRow = piece === 'P' ? 3 : 4;
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absColDiff = Math.abs(colDiff);
    const targetPiece = board[toRow][toCol];
    if (colDiff === 0 && !targetPiece) {
        if (rowDiff === direction) return true;
        if (fromRow === startRow && rowDiff === 2 * direction && !board[fromRow + direction][fromCol]) {
            return true;
        }
    }
    if (absColDiff === 1 && rowDiff === direction && targetPiece) {
        return true;
    }
    if (absColDiff === 1 && rowDiff === direction && !targetPiece && fromRow === enPassantRow) {
        if (enPassantTarget && enPassantTarget.row === fromRow && enPassantTarget.col === toCol) {
            return true;
        }
    }
    return false;
}
function isCastlingValid(fromRow, fromCol, toRow, toCol, king) {
    const color = king === king.toUpperCase() ? 'white' : 'black';
    const row = color === 'white' ? 7 : 0;
    if (fromRow !== row || toRow !== row) return false;
    if (Math.abs(toCol - fromCol) !== 2) return false;
    if (isKingInCheck(color)) return false;
    if (toCol === 6) {
        if (!castlingRights[color].kingside) return false;
        if (board[row][5] || board[row][6]) return false;
        if (!board[row][7] || board[row][7].toUpperCase() !== 'R') return false;
        for (let col of [5, 6]) {
            board[row][col] = king;
            board[row][fromCol] = null;
            const inCheck = isKingInCheck(color);
            board[row][fromCol] = king;
            board[row][col] = null;
            if (inCheck) return false;
        }
        return true;
    }
    if (toCol === 2) {
        if (!castlingRights[color].queenside) return false;
        if (board[row][1] || board[row][2] || board[row][3]) return false;
        if (!board[row][0] || board[row][0].toUpperCase() !== 'R') return false;
        for (let col of [2, 3]) {
            board[row][col] = king;
            board[row][fromCol] = null;
            const inCheck = isKingInCheck(color);
            board[row][fromCol] = king;
            board[row][col] = null;
            if (inCheck) return false;
        }
        return true;
    }
    return false;
}
function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol]) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    const pieceType = piece.toUpperCase();
    const color = piece === piece.toUpperCase() ? 'white' : 'black';
    positionHistory.push(getBoardHash());
    if (pieceType === 'P' && !capturedPiece && Math.abs(toCol - fromCol) === 1) {
        const enPassantRow = color === 'white' ? 3 : 4;
        if (fromRow === enPassantRow && enPassantTarget &&
            enPassantTarget.row === fromRow && enPassantTarget.col === toCol) {
            const capturedPawnRow = color === 'white' ? fromRow : fromRow;
            const captured = board[capturedPawnRow][toCol];
            board[capturedPawnRow][toCol] = null;
            capturedPieces[color === 'white' ? 'black' : 'white'].push(captured);
            updateCapturedPieces();
        }
    }
    if (soundEnabled) {
        moveSound.currentTime = 0;
        moveSound.play();
    }
    if (pieceType === 'P' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
    } else {
        enPassantTarget = null;
    }
    if (pieceType === 'K' && Math.abs(toCol - fromCol) === 2) {
        const row = color === 'white' ? 7 : 0;
        if (toCol === 6) {
            board[row][5] = board[row][7];
            board[row][7] = null;
        } else if (toCol === 2) {
            board[row][3] = board[row][0];
            board[row][0] = null;
        }
    }
    updateCastlingRights(piece, fromRow, fromCol);
    if (capturedPiece) {
        const capturedColor = capturedPiece === capturedPiece.toUpperCase() ? 'black' : 'white';
        capturedPieces[capturedColor].push(capturedPiece);
        updateCapturedPieces();
        halfMoveClock = 0;
    } else if (pieceType === 'P') {
        halfMoveClock = 0;
    } else {
        halfMoveClock++;
    }
    if (pieceType === 'P' && (toRow === 0 || toRow === 7)) {
        piece = showPromotionDialog(color);
        board[fromRow][fromCol] = piece;
    }
    const move = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: piece,
        captured: capturedPiece,
        castling: pieceType === 'K' && Math.abs(toCol - fromCol) === 2,
        enPassant: pieceType === 'P' && !capturedPiece && Math.abs(toCol - fromCol) === 1,
        promotion: pieceType === 'P' && (toRow === 0 || toRow === 7)
    };
    moveHistory.push(move);
    updateMoveHistory();
    if (soundEnabled) {
        moveSound.currentTime = 0;
        moveSound.play();
    }
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
    renderBoard();
}
function updateCastlingRights(piece, fromRow, fromCol) {
    const pieceType = piece.toUpperCase();
    const color = piece === piece.toUpperCase() ? 'white' : 'black';
    if (pieceType === 'K') {
        castlingRights[color].kingside = false;
        castlingRights[color].queenside = false;
    }
    if (pieceType === 'R') {
        const row = color === 'white' ? 7 : 0;
        if (fromRow === row) {
            if (fromCol === 0) castlingRights[color].queenside = false;
            if (fromCol === 7) castlingRights[color].kingside = false;
        }
    }
}
function showPromotionDialog(color) {
    const pieces = ['Q', 'R', 'B', 'N'];
    const pieceNames = ['وزیر', 'رخ', 'فیل', 'اسب'];
    let message = 'پیاده را به کدام مهره تبدیل می‌کنید؟\n';
    pieces.forEach((piece, index) => {
        message += `${index + 1}. ${pieceNames[index]}\n`;
    });
    let choice;
    do {
        choice = prompt(message);
    } while (!choice || choice < 1 || choice > 4);
    const selectedPiece = pieces[parseInt(choice) - 1];
    return color === 'white' ? selectedPiece : selectedPiece.toLowerCase();
}
function findKing(color) {
    const king = color === 'white' ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === king) {
                return { row, col };
            }
        }
    }
    return null;
}
function isKingInCheck(color) {
    const kingPos = findKing(color);
    if (!kingPos) return false;
    const opponentColor = color === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
                if (pieceColor === opponentColor) {
                    if (isBasicMoveValid(row, col, kingPos.row, kingPos.col)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
function getAllLegalMoves(color) {
    const moves = [];
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece && ((piece === piece.toUpperCase() && color === 'white') ||
                         (piece === piece.toLowerCase() && color === 'black'))) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                            moves.push({
                                from: {row: fromRow, col: fromCol},
                                to: {row: toRow, col: toCol}
                            });
                        }
                    }
                }
            }
        }
    }
    return moves;
}
function makeAIMove() {
    if (!isAIEnabled || currentTurn !== aiColor) return;
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') {
        return;
    }
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = 'AI در حال فکر کردن...';
    }
    setTimeout(() => {
        const moves = getAllLegalMoves(aiColor);
        if (moves.length === 0) {
            checkGameStatus();
            return;
        }
        let bestMove = null;
        let bestScore = aiColor === 'black' ? -Infinity : Infinity;
        const inCheck = isKingInCheck(aiColor);
        let priorityMoves = moves;
        if (inCheck) {
            priorityMoves = moves;
        } else {
            const captureMoves = moves.filter(move => board[move.to.row][move.to.col] !== null);
            priorityMoves = captureMoves.length > 0 ? captureMoves : moves;
        }
        const movesToCheck = priorityMoves.slice(0, inCheck ? priorityMoves.length : 20);
        for (let move of movesToCheck) {
            const tempPiece = board[move.to.row][move.to.col];
            const movedPiece = board[move.from.row][move.from.col];
            board[move.to.row][move.to.col] = movedPiece;
            board[move.from.row][move.from.col] = null;
            const searchDepth = inCheck ? 2 : 3;
            const score = minimax(searchDepth, -Infinity, Infinity, aiColor === 'white');
            board[move.from.row][move.from.col] = movedPiece;
            board[move.to.row][move.to.col] = tempPiece;
            if ((aiColor === 'black' && score > bestScore) ||
                (aiColor === 'white' && score < bestScore)) {
                bestScore = score;
                bestMove = move;
            }
        }
        if (!bestMove && moves.length > 0) {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        }
        if (bestMove) {
            makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            clearSelection();
            switchTurn();
            checkGameStatus();
        }
        if (statusDiv) {
            statusDiv.textContent = gameStatus === 'active' ?
                `نوبت ${currentTurn === 'white' ? 'سفید' : 'سیاه'}` :
                getGameStatusMessage();
        }
    }, 300);
}
function hasLegalMoves(color) {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece) {
                const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
                if (pieceColor === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}
function checkGameStatus() {
    const inCheck = isKingInCheck(currentTurn);
    const hasLegal = hasLegalMoves(currentTurn);
    if (!hasLegal) {
        if (inCheck) {
            gameStatus = 'checkmate';
            showGameEndDialog('کیش و مات!', `${currentTurn === 'white' ? 'سیاه' : 'سفید'} برنده شد!`);
        } else {
            gameStatus = 'stalemate';
            showGameEndDialog('پات!', 'بازی مساوی شد - بازیکن حرکت قانونی ندارد');
        }
    } else if (inCheck) {
        gameStatus = 'check';
        showNotification(`کیش به شاه ${currentTurn === 'white' ? 'سفید' : 'سیاه'}!`);
        if (soundEnabled) {
            checkSound.currentTime = 0;
            checkSound.play();
        }
    } else {
        gameStatus = 'active';
    }
    if (halfMoveClock >= 100) {
        gameStatus = 'draw';
        showGameEndDialog('مساوی!', 'بازی طبق قانون 50 حرکت مساوی شد');
    }
    if (isThreefoldRepetition()) {
        gameStatus = 'draw';
        showGameEndDialog('مساوی!', 'بازی به دلیل تکرار سه‌گانه وضعیت مساوی شد');
    }
    if (isInsufficientMaterial()) {
        gameStatus = 'draw';
        showGameEndDialog('مساوی!', 'مواد ناکافی برای مات کردن');
    }
    updateTurnIndicator();
}
function getBoardHash() {
    return board.map(row => row.map(piece => piece || '-').join('')).join('');
}
function isThreefoldRepetition() {
    const currentPosition = getBoardHash();
    let count = 0;
    for (const position of positionHistory) {
        if (position === currentPosition) {
            count++;
            if (count >= 3) return true;
        }
    }
    return false;
}
function isInsufficientMaterial() {
    const pieces = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col]) {
                pieces.push(board[row][col]);
            }
        }
    }
    if (pieces.length === 2) return true;
    if (pieces.length === 3) {
        const nonKings = pieces.filter(p => p.toUpperCase() !== 'K');
        if (nonKings.length === 1) {
            const piece = nonKings[0].toUpperCase();
            if (piece === 'B' || piece === 'N') return true;
        }
    }
    if (pieces.length === 4) {
        const bishops = pieces.filter(p => p.toUpperCase() === 'B');
        if (bishops.length === 2) {
            const bishopSquares = [];
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] && board[row][col].toUpperCase() === 'B') {
                        bishopSquares.push({ row, col });
                    }
                }
            }
            if (bishopSquares.length === 2) {
                const color1 = (bishopSquares[0].row + bishopSquares[0].col) % 2;
                const color2 = (bishopSquares[1].row + bishopSquares[1].col) % 2;
                if (color1 === color2) return true;
            }
        }
    }
    return false;
}
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-warning alert-dismissible fade show position-fixed top-50 start-50 translate-middle';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        <strong>${message}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
function showGameEndDialog(title, message) {
    const modal = document.createElement('div');
    modal.className = 'modal fade show d-block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                </div>
                <div class="modal-body">
                    <p class="mb-0">${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="newGame(); this.closest('.modal').remove();">بازی جدید</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove();">بستن</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
function switchTurn() {
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateTurnIndicator();
}
function updateTurnIndicator() {
    const turnElement = document.getElementById('current-turn');
    let statusText = `نوبت: ${currentTurn === 'white' ? 'سفید' : 'سیاه'}`;
    if (gameStatus === 'check') {
        statusText += ' (کیش!)';
        turnElement.className = 'badge bg-danger fs-6';
    } else if (gameStatus === 'checkmate') {
        statusText = `کیش و مات! ${currentTurn === 'white' ? 'سیاه' : 'سفید'} برنده شد`;
        turnElement.className = 'badge bg-success fs-6';
    } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
        statusText = 'بازی مساوی شد';
        turnElement.className = 'badge bg-secondary fs-6';
    } else {
        turnElement.className = `badge ${currentTurn === 'white' ? 'bg-primary' : 'bg-dark'} fs-6`;
    }
    turnElement.textContent = statusText;
}
function updateCapturedPieces() {
    const whiteElement = document.getElementById('white-captured');
    const blackElement = document.getElementById('black-captured');
    whiteElement.innerHTML = '';
    blackElement.innerHTML = '';
    const pieceValues = { 'q': 9, 'r': 5, 'b': 3, 'n': 3, 'p': 1 };
    const sortPieces = (pieces) => {
        return pieces.sort((a, b) => {
            const valueA = pieceValues[a.toLowerCase()] || 0;
            const valueB = pieceValues[b.toLowerCase()] || 0;
            return valueB - valueA;
        });
    };
    sortPieces(capturedPieces.white).forEach(piece => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.textContent = pieces[piece];
        whiteElement.appendChild(span);
    });
    sortPieces(capturedPieces.black).forEach(piece => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.textContent = pieces[piece];
        blackElement.appendChild(span);
    });
}
function updateMoveHistory() {
    const historyElement = document.getElementById('move-history');
    historyElement.innerHTML = '';
    if (moveHistory.length === 0) {
        historyElement.innerHTML = '<div class="text-center text-muted p-3">هنوز حرکتی انجام نشده</div>';
        return;
    }
    moveHistory.forEach((move, index) => {
        const moveDiv = document.createElement('div');
        moveDiv.className = 'move-item';
        const from = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
        const to = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
        const pieceName = pieceNames[move.piece.toUpperCase()];
        const color = move.piece === move.piece.toUpperCase() ? 'سفید' : 'سیاه';
        let moveText = `${index + 1}. ${pieceName} ${color}: ${from} ← ${to}`;
        if (move.captured) {
            const capturedName = pieceNames[move.captured.toUpperCase()];
            moveText += ` (گرفت: ${capturedName})`;
        }
        if (move.castling) {
            moveText = `${index + 1}. قلعه ${color}`;
        }
        if (move.promotion) {
            moveText += ' (ارتقاء)';
        }
        if (move.enPassant) {
            moveText += ' (آن پاسان)';
        }
        moveDiv.textContent = moveText;
        historyElement.appendChild(moveDiv);
    });
    historyElement.scrollTop = historyElement.scrollHeight;
}
function undoMove() {
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop();
    board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
    if (lastMove.castling) {
        const color = lastMove.piece === lastMove.piece.toUpperCase() ? 'white' : 'black';
        const row = color === 'white' ? 7 : 0;
        if (lastMove.to.col === 6) {
            board[row][7] = board[row][5];
            board[row][5] = null;
        } else if (lastMove.to.col === 2) {
            board[row][0] = board[row][3];
            board[row][3] = null;
        }
    }
    if (lastMove.enPassant) {
        const color = lastMove.piece === lastMove.piece.toUpperCase() ? 'white' : 'black';
        const capturedRow = color === 'white' ? lastMove.to.row + 1 : lastMove.to.row - 1;
        const capturedPawn = color === 'white' ? 'p' : 'P';
        board[capturedRow][lastMove.to.col] = capturedPawn;
        capturedPieces[color === 'white' ? 'black' : 'white'].pop();
    }
    if (lastMove.captured && !lastMove.enPassant) {
        const color = lastMove.captured === lastMove.captured.toUpperCase() ? 'black' : 'white';
        capturedPieces[color].pop();
        updateCapturedPieces();
    }
    positionHistory.pop();
    halfMoveClock--;
    gameStatus = 'active';
    switchTurn();
    renderBoard();
    updateMoveHistory();
    checkGameStatus();
}
function newGame() {
    if (gameStatus === 'active' && moveHistory.length > 0) {
        if (!confirm('آیا می‌خواهید بازی جدید شروع کنید؟')) {
            return;
        }
    }
    board = initialBoard.map(row => [...row]);
    selectedSquare = null;
    currentTurn = 'white';
    moveHistory = [];
    capturedPieces = { white: [], black: [] };
    gameStatus = 'active';
    enPassantTarget = null;
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    halfMoveClock = 0;
    positionHistory = [];
    renderBoard();
    updateTurnIndicator();
    updateCapturedPieces();
    updateMoveHistory();
}
const style = document.createElement('style');
style.textContent = `
    .square.check {
        background-color: #ff6b6b !important;
        animation: pulse 1s infinite;
    }
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
    }
    .captured-piece {
        margin-right: 5px;
    }
    .move-item:last-child {
        background-color: #ffc107 !important;
        font-weight: bold;
    }
`;
document.head.appendChild(style);
initBoard();

document.getElementById('sound-toggle').addEventListener('click', toggleSound);


