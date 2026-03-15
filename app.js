const express = require("express")
const socket = require("socket.io")
const http = require("http")
const { Chess } = require("chess.js")
const path = require("path")
const { title } = require("process")
const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
})
io.on("connection", function (uniquesocket) {
    console.log("connected");
    uniquesocket.on("restart", () => {

        chess.reset();
        io.emit("boardState", chess.fen());

    });
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    }
    else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    }
    else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.emit("boardState", chess.fen());

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.white) {
            delete players.white;
            io.emit("playerLeft", "White player left");
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            io.emit("playerLeft", "Black player left");
        }


        if (!players.white && !players.black) {
            chess.reset();
            io.emit("boardState", chess.fen());
        }
    });
    uniquesocket.on("move", (move) => {

        if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
        if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

        // get all legal moves
        const legalMoves = chess.moves({ verbose: true });
 
        const isLegal = legalMoves.some(m =>
            m.from === move.from && m.to === move.to
        );

        if (!isLegal) {
            return; // silently ignore invalid moves
        }

        chess.move(move);

        io.emit("move", move);
        io.emit("boardState", chess.fen());

    });
})
server.listen(3000, function () {
    console.log("listening 3000")
})