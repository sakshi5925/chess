const socket=io();
const chess=new Chess()
const boardElement=document.querySelector(".chessboard");
let draggedPiece=null;
let sourceSquare=null;
let playerRole= null;
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");

                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData("text/plain", ""); // for easy drag 
                    }
                });
                pieceElement.addEventListener("dragend", (e) => { // Fixed the event from "dragged" to "dragend"
                    draggedPiece = null;
                    sourceSquare = null;
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
    if(playerRole==='b'){
    boardElement.classList.add('flipped');
    }
    else{
        boardElement.classList.remove('flipped');
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Always promote to queen (needed for pawn promotions)
    };

    const result = chess.move(move); // Try making the move

    if (result) {
        socket.emit("move", move); // Only emit if move is valid
        renderBoard();
    } else {
        console.log("Invalid move:", move);
    }
};
const getPieceUnicode=(piece)=>{
    const unicodePieces = {
        p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", // Black pieces
        P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"  // White pieces
    };

    return unicodePieces[piece.color === "w" ? piece.type.toUpperCase() : piece.type] || "";
}
socket.on("playerRole",function(role){
playerRole=role;
renderBoard()
})
socket.on("spectatorRole",function(){
    playerRole=null;
    renderBoard();
})
socket.on("boardState",function(fen){
  chess.load(fen);
  renderBoard();
})
socket.on("move", function (move) {
    const result = chess.move(move);
    if (result) {
        renderBoard();
    } else {
        console.log("Received an invalid move:", move);
    }
});
renderBoard()