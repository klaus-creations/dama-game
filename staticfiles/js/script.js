document.addEventListener("DOMContentLoaded", () => {
  const board = document.getElementById("board");
  const modal = document.getElementById("winnerModal");
  const winnerText = document.getElementById("winnerText");
  const playAgainBtn = document.getElementById("playAgainBtn");
  let selectedPiece = null;
  let selectedSquare = null;
  let currentTurn = "red";
  let mustContinueJump = false;

  // Create the board
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

  // Utility functions
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
    document.querySelectorAll(".square.highlight").forEach(sq =>
      sq.classList.remove("highlight")
    );
  }

  function promoteIfNeeded(piece, square) {
    const row = getRowIndex(square);
    if ((piece.classList.contains("red") && row === 0) || (piece.classList.contains("black") && row === 7)) {
      piece.classList.add("king");
      piece.innerHTML = "♕";
    }
  }

  function updateTurnDisplay() {
    const display = document.getElementById("turn");
    if (display) display.textContent = `Turn: ${currentTurn.toUpperCase()}`;
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

  function movePiece(targetSquare, captured) {
    clearHighlights();
    targetSquare.appendChild(selectedPiece);
    selectedSquare = targetSquare;
    promoteIfNeeded(selectedPiece, targetSquare);
    if (captured && getCaptureTargets(selectedPiece, targetSquare).length > 0) {
      mustContinueJump = true;
      selectedPiece.style.outline = "2px solid yellow";
      highlightMoves();
    } else {
      selectedPiece.style.outline = "none";
      selectedPiece = null;
      selectedSquare = null;
      mustContinueJump = false;
      currentTurn = currentTurn === "red" ? "black" : "red";
      updateTurnDisplay();
      highlightMandatoryCaptures();
      checkGameOver();
    }
  }

  function playerHasCapture() {
    return Array.from(document.querySelectorAll(`.piece.${currentTurn}`)).some(piece =>
      getCaptureTargets(piece, piece.parentElement).length > 0
    );
  }

  function highlightMandatoryCaptures() {
    clearHighlights();
    document.querySelectorAll(`.piece.${currentTurn}`).forEach(piece => {
      const targets = getCaptureTargets(piece, piece.parentElement);
      targets.forEach(sq => sq.classList.add("highlight"));
    });
  }

  board.addEventListener("click", e => {
    const target = e.target;

    if (target.classList.contains("piece")) {
      if (mustContinueJump) return;
      if (target.classList.contains(currentTurn)) {
        if (selectedPiece) selectedPiece.style.outline = "none";
        clearHighlights();
        selectedPiece = target;
        selectedSquare = target.parentElement;
        selectedPiece.style.outline = "2px solid yellow";
        highlightMoves();
      }
    } else if (
      target.classList.contains("square") &&
      selectedPiece &&
      target.childNodes.length === 0 &&
      target.classList.contains("dark") &&
      target.classList.contains("highlight")
    ) {
      const fromRow = getRowIndex(selectedSquare);
      const fromCol = getColIndex(selectedSquare);
      const toRow = getRowIndex(target);
      const toCol = getColIndex(target);
      const rowDiff = toRow - fromRow;
      const colDiff = toCol - fromCol;
      const isJump = Math.abs(rowDiff) >= 2 && Math.abs(rowDiff) === Math.abs(colDiff);

      if (!isJump) {
        movePiece(target, false);
      } else {
        const dirR = rowDiff / Math.abs(rowDiff);
        const dirC = colDiff / Math.abs(colDiff);
        let r = fromRow + dirR;
        let c = fromCol + dirC;
        let captured = false;

        while (r !== toRow && c !== toCol) {
          const midSq = getSquare(r, c);
          const midPiece = midSq.querySelector(".piece");
          if (midPiece && !midPiece.classList.contains(currentTurn)) {
            midSq.innerHTML = "";
            captured = true;
            break;
          } else if (midPiece) break;
          r += dirR;
          c += dirC;
        }
        movePiece(target, captured);
      }
    }
  });

  function checkGameOver() {
    const redCount = document.querySelectorAll(".piece.red").length;
    const blackCount = document.querySelectorAll(".piece.black").length;

    if (redCount === 0) showWinner("Black");
    else if (blackCount === 0) showWinner("Red");
  }

  function showWinner(winner) {
    winnerText.textContent = `${winner.toUpperCase()} wins!`;
    modal.classList.add("show");
    disableBoard();
  }

  function disableBoard() {
    board.style.pointerEvents = "none";
  }

  function enableBoard() {
    board.style.pointerEvents = "auto";
  }

  playAgainBtn.addEventListener("click", () => {
    window.location.reload();
  });

  function closeModal() {
    modal.classList.remove("show");
    enableBoard();
    // Reset the game state if needed here
    location.reload();
  }

  updateTurnDisplay();
  highlightMandatoryCaptures();
});
document.getElementById('profileImage').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const img = document.getElementById('userPic');
    img.src = e.target.result; // Update the image source with the uploaded file
  };
  
  if (file) {
    reader.readAsDataURL(file);
  }
});