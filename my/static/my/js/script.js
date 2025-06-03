document.addEventListener("DOMContentLoaded", () => {
  const board = document.getElementById("board");
  const modal = document.getElementById("winnerModal");
  const winnerText = document.getElementById("winnerText");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const turnDisplay = document.getElementById("turn");

  let selectedPiece = null;
  let selectedSquare = null;
  let currentTurn = "red"; // Server should ideally sync this, but client tracks too
  let mustContinueJump = false;
  let isMyTurn = true; // You can set this based on player role
  let moveLocked = false; // To avoid double moves on same turn

  // Initialize board squares and pieces
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      if ((row + col) % 2 === 0) {
        square.classList.add("light");
      } else {
        square.classList.add("dark");
        if (row < 3) {
          const piece = document.createElement("div");
          piece.classList.add("piece", "black");
          square.appendChild(piece);
        } else if (row > 4) {
          const piece = document.createElement("div");
          piece.classList.add("piece", "red");
          square.appendChild(piece);
        }
      }
      board.appendChild(square);
    }
  }

  // Helper functions for indexing squares
  function getSquare(row, col) {
    return document.querySelectorAll(".square")[row * 8 + col];
  }
  function getRowIndex(square) {
    return Math.floor([...document.querySelectorAll(".square")].indexOf(square) / 8);
  }
  function getColIndex(square) {
    return [...document.querySelectorAll(".square")].indexOf(square) % 8;
  }
  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }
  function clearHighlights() {
    document.querySelectorAll(".square.highlight").forEach(sq => sq.classList.remove("highlight"));
  }
  function promoteIfNeeded(piece, square) {
    const row = getRowIndex(square);
    if ((piece.classList.contains("red") && row === 0) || (piece.classList.contains("black") && row === 7)) {
      piece.classList.add("king");
      piece.innerHTML = "♕";
    }
  }
  function updateTurnDisplay() {
    if (turnDisplay) turnDisplay.textContent = `Turn: ${currentTurn.toUpperCase()}`;
  }
  function getCaptureTargets(piece, square) {
    const row = getRowIndex(square);
    const col = getColIndex(square);
    const isKing = piece.classList.contains("king");
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const targets = [];

    for (let [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      let enemyFound = false;
      while (inBounds(r, c)) {
        const midSq = getSquare(r, c);
        const midPiece = midSq.querySelector(".piece");
        if (midPiece && !midPiece.classList.contains(currentTurn)) {
          if (!enemyFound) {
            enemyFound = true;
            r += dr;
            c += dc;
          } else break;
        } else if (midPiece && midPiece.classList.contains(currentTurn)) break;
        else {
          if (enemyFound) targets.push(midSq);
          if (!isKing) break;
          r += dr;
          c += dc;
        }
      }
    }
    return targets;
  }
  function highlightMoves() {
    if (!selectedPiece) return;
    const fromRow = getRowIndex(selectedSquare);
    const fromCol = getColIndex(selectedSquare);
    const isKing = selectedPiece.classList.contains("king");

    if (!mustContinueJump && !playerHasCapture()) {
      const directions = isKing
        ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
        : selectedPiece.classList.contains("red")
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

      for (let [dr, dc] of directions) {
        let r = fromRow + dr;
        let c = fromCol + dc;
        while (inBounds(r, c)) {
          const sq = getSquare(r, c);
          if (sq.childNodes.length === 0 && sq.classList.contains("dark")) {
            sq.classList.add("highlight");
          } else break;
          if (!isKing) break;
          r += dr;
          c += dc;
        }
      }
    }
    const jumpTargets = getCaptureTargets(selectedPiece, selectedSquare);
    jumpTargets.forEach(sq => sq.classList.add("highlight"));
  }
  function movePiece(targetSquare, captured, fromSquare = null, piece = null, isFromServer = false) {
    clearHighlights();
    if (!piece) piece = selectedPiece;
    if (!fromSquare) fromSquare = selectedSquare;

    targetSquare.appendChild(piece);
    if (fromSquare) selectedSquare = targetSquare;
    promoteIfNeeded(piece, targetSquare);

    if (captured && getCaptureTargets(piece, targetSquare).length > 0) {
      mustContinueJump = true;
      piece.style.outline = "2px solid yellow";
      highlightMoves();
    } else {
      piece.style.outline = "none";
      selectedPiece = null;
      selectedSquare = null;
      mustContinueJump = false;
      currentTurn = currentTurn === "red" ? "black" : "red";
      updateTurnDisplay();
      highlightMandatoryCaptures();
      checkGameOver();
      if (!isFromServer) {
        // Send move through WebSocket if local move
        sendMove(
          getRowIndex(fromSquare),
          getColIndex(fromSquare),
          getRowIndex(targetSquare),
          getColIndex(targetSquare)
        );
      }
    }
  }

  // For updating board based on opponent move received from server
  function movePieceFromServer(fromRow, fromCol, toRow, toCol) {
    const fromSquare = getSquare(fromRow, fromCol);
    const toSquare = getSquare(toRow, toCol);
    const piece = fromSquare.querySelector(".piece");
    if (!piece) return;
    // Detect capture and remove captured piece
    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;
    if (Math.abs(dRow) > 1 && Math.abs(dCol) > 1) {
      const capRow = fromRow + dRow / Math.abs(dRow);
      const capCol = fromCol + dCol / Math.abs(dCol);
      const capturedSquare = getSquare(capRow, capCol);
      const capturedPiece = capturedSquare.querySelector(".piece");
      if (capturedPiece) capturedSquare.removeChild(capturedPiece);
    }
    movePiece(toSquare, false, fromSquare, piece, true);
    mustContinueJump = false;
    currentTurn = currentTurn === "red" ? "black" : "red";
    updateTurnDisplay();
  }

  // Check if any piece has captures, highlights them
  function highlightMandatoryCaptures() {
    clearHighlights();
    const pieces = [...document.querySelectorAll(".piece")].filter(p => p.classList.contains(currentTurn));
    let hasCapture = false;
    for (const p of pieces) {
      const sq = p.parentElement;
      if (getCaptureTargets(p, sq).length > 0) {
        sq.classList.add("highlight");
        hasCapture = true;
      }
    }
    return hasCapture;
  }
  // Check if player has any captures available
  function playerHasCapture() {
    return highlightMandatoryCaptures();
  }
  // Check if game ended (no moves or no pieces)
  function checkGameOver() {
    const redPieces = [...document.querySelectorAll(".piece.red")];
    const blackPieces = [...document.querySelectorAll(".piece.black")];
    if (redPieces.length === 0) {
      showWinner("black");
      return true;
    }
    if (blackPieces.length === 0) {
      showWinner("red");
      return true;
    }
    // Check if any moves available for current player
    const movesAvailable = redPieces.concat(blackPieces).some(p => {
      if (p.classList.contains(currentTurn)) {
        const sq = p.parentElement;
        if (getCaptureTargets(p, sq).length > 0) return true;
        // Check normal moves:
        const row = getRowIndex(sq);
        const col = getColIndex(sq);
        const directions = p.classList.contains("king")
          ? [[1,1],[1,-1],[-1,1],[-1,-1]]
          : p.classList.contains("red")
          ? [[-1,-1],[-1,1]]
          : [[1,-1],[1,1]];
        for (let [dr,dc] of directions) {
          const nr = row + dr;
          const nc = col + dc;
          if (inBounds(nr,nc)) {
            if (getSquare(nr,nc).childNodes.length === 0) return true;
          }
        }
      }
      return false;
    });
    if (!movesAvailable) {
      showWinner(currentTurn === "red" ? "black" : "red");
      return true;
    }
    return false;
  }
  // Disable board interaction after game ends
  function disableBoard() {
    moveLocked = true;
  }
  // Show winner modal
  function showWinner(winner) {
    winnerText.textContent = `Winner: ${winner.toUpperCase()}`;
    modal.classList.remove("hidden");
    disableBoard();
  }

  // Click handlers
  board.addEventListener("click", e => {
    if (moveLocked) return;

    const clickedSquare = e.target.closest(".square");
    if (!clickedSquare || !clickedSquare.classList.contains("dark")) return;

    // If must continue jump, force player to only select that piece
    if (mustContinueJump && selectedPiece && clickedSquare !== selectedSquare) {
      return; // prevent selecting other piece while jump chain
    }

    // Select piece
    if (clickedSquare.childNodes.length > 0) {
      const piece = clickedSquare.querySelector(".piece");
      if (piece && piece.classList.contains(currentTurn)) {
        if (selectedPiece === piece) {
          selectedPiece.style.outline = "none";
          selectedPiece = null;
          selectedSquare = null;
          clearHighlights();
        } else {
          if (selectedPiece) selectedPiece.style.outline = "none";
          selectedPiece = piece;
          selectedSquare = clickedSquare;
          selectedPiece.style.outline = "2px solid yellow";
          clearHighlights();
          highlightMoves();
        }
      }
    } else if (selectedPiece && clickedSquare.classList.contains("highlight")) {
      // Move piece
      // Check if move is capture
      const fromRow = getRowIndex(selectedSquare);
      const fromCol = getColIndex(selectedSquare);
      const toRow = getRowIndex(clickedSquare);
      const toCol = getColIndex(clickedSquare);
      const dRow = toRow - fromRow;
      const dCol = toCol - fromCol;
      let captured = false;

      if (Math.abs(dRow) > 1 && Math.abs(dCol) > 1) {
        // Capture move
        const capRow = fromRow + dRow / Math.abs(dRow);
        const capCol = fromCol + dCol / Math.abs(dCol);
        const capturedSquare = getSquare(capRow, capCol);
        const capturedPiece = capturedSquare.querySelector(".piece");
        if (capturedPiece) {
          capturedSquare.removeChild(capturedPiece);
          captured = true;
        }
      }
      movePiece(clickedSquare, captured);
    }
  });

  updateTurnDisplay();
  highlightMandatoryCaptures();
});
