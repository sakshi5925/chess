const socket = io();
const chess = new Chess()
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let possibleMoves = [];
let lastMove = null;
let gameOver = false;


function updateGameStatus() {

    let status = "";

    if (chess.in_checkmate() && !gameOver) {

        gameOver = true;

        const winner = chess.turn() === "w" ? "Black" : "White";

        status = `Checkmate! ${winner} wins`;

        setTimeout(() => {
            alert(`Game Over! ${winner} wins by checkmate`);
        }, 200);
    }
    else if (chess.in_draw()) {

        gameOver = true;

        status = "Game Draw";

        setTimeout(() => {
            alert("Game ended in draw");
        }, 200);
    }
    else {

        status = (chess.turn() === "w" ? "White" : "Black") + "'s Turn";

        if (chess.in_check()) {
            status += " (Check)";
        }
    }

    document.getElementById("gameStatus").innerText = status;
}
window.onload = () => {

    document.getElementById("restartBtn").onclick = () => {

        gameOver = false;
        socket.emit("restart");

    };

};




const renderBoard = () => {

    const board = chess.board();
    let kingPosition = null;

    if (chess.in_check()) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];

                if (piece && piece.type === "k" && piece.color === chess.turn()) {
                    kingPosition = { r, c };
                }
            }
        }
    }
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");


            if (lastMove) {

                const fromCol = lastMove.from.charCodeAt(0) - 97;
                const fromRow = 8 - parseInt(lastMove.from[1]);

                const toCol = lastMove.to.charCodeAt(0) - 97;
                const toRow = 8 - parseInt(lastMove.to[1]);

                if (rowindex === fromRow && squareindex === fromCol) {
                    squareElement.classList.add("lastMove");
                }

                if (rowindex === toRow && squareindex === toCol) {
                    squareElement.classList.add("lastMove");
                }

            }

            if (kingPosition && rowindex === kingPosition.r && squareindex === kingPosition.c) {
                squareElement.classList.add("check");
            }


            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");

                // pieceElement.innerText = getPieceUnicode(square);
                const img = document.createElement("img");
                img.src = getPieceImage(square);
                img.classList.add("piece-img");


                pieceElement.appendChild(img);
                pieceElement.draggable = playerRole === square.color && !gameOver;
                // pieceElement.addEventListener("dragstart", (e) => {
                //     if (pieceElement.draggable) {
                //         draggedPiece = pieceElement;
                //         sourceSquare = { row: rowindex, col: squareindex };
                //         e.dataTransfer.setData("text/plain", ""); // for easy drag 
                //     }
                // });
                pieceElement.addEventListener("dragstart", (e) => {

                    if (pieceElement.draggable) {

                        draggedPiece = pieceElement;

                        sourceSquare = { row: rowindex, col: squareindex };

                        e.dataTransfer.setData("text/plain", "");

                        // get possible legal moves for this piece
                        possibleMoves = chess.moves({
                            square: `${String.fromCharCode(97 + squareindex)}${8 - rowindex}`,
                            verbose: true
                        });

                        highlightMoves();

                    }

                });
                pieceElement.addEventListener("dragend", (e) => { // Fixed the event from "dragged" to "dragend"
                    draggedPiece = null;
                    sourceSquare = null;
                    possibleMoves = [];
                    renderBoard();
                });
                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", function (e) {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", function (e) {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });
    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    }
    else {
        boardElement.classList.remove('flipped');
    }
    updateGameStatus();
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Always promote to queen (needed for pawn promotions)
    };

    if (!gameOver) {
        socket.emit("move", move);
    }

};

const highlightMoves = () => {

    possibleMoves.forEach(move => {

        const col = move.to.charCodeAt(0) - 97;
        const row = 8 - parseInt(move.to[1]);

        const square = document.querySelector(
            `[data-row='${row}'][data-col='${col}']`
        );

        if (square) {
            square.classList.add("highlight");
        }

    });

};



// const getPieceUnicode=(piece)=>{
//     const unicodePieces = {
//         p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", // Black pieces
//         P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"  // White pieces
//     };

//     return unicodePieces[piece.color === "w" ? piece.type.toUpperCase() : piece.type] || "";
// }

const getPieceImage = (piece) => {
    const color = piece.color === "w" ? "w" : "b";
    const type = piece.type;

    return `/pieces/${color}${type}.png`;
};

socket.on("playerRole", function (role) {
    playerRole = role;
    document.getElementById("playerInfo").innerText =
        role === "w" ? "You are White" : "You are Black";
    renderBoard();
});
socket.on("spectatorRole", function () {
    playerRole = null;
    document.getElementById("playerInfo").innerText = "Spectating Game";
    renderBoard();
})
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
})
socket.on("move", function (move) {

    lastMove = move;

    const result = chess.move(move);

    if (result) {
        possibleMoves = [];
        renderBoard();
    }

});

renderBoard()
updateGameStatus();