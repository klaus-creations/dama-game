import asyncio
import json
import websockets
from typing import List, Optional, Tuple

# Constants
BOARD_SIZE = 8
BLACK = "B"
WHITE = "W"
EMPTY = "."

# Initialize 8x8 board (simplified: only regular pieces)
def create_board() -> List[List[str]]:
    board = [[EMPTY for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
    # Place black pieces (top)
    for row in range(3):
        for col in range(BOARD_SIZE):
            if (row + col) % 2 == 1:
                board[row][col] = BLACK
    # Place white pieces (bottom)
    for row in range(5, BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if (row + col) % 2 == 1:
                board[row][col] = WHITE
    return board

# Game state
class Game:
    def __init__(self):
        self.board = create_board()
        self.current_player = BLACK
        self.players = {}  # Maps websocket to player color
        self.game_id = "game_1"

    def is_valid_move(self, start: Tuple[int, int], end: Tuple[int, int], player: str) -> bool:
        if player != self.current_player:
            return False
        sr, sc = start
        er, ec = end
        # Check boundaries
        if not (0 <= sr < BOARD_SIZE and 0 <= sc < BOARD_SIZE and 0 <= er < BOARD_SIZE and 0 <= ec < BOARD_SIZE):
            return False
        # Check if start has player's piece
        if self.board[sr][sc] != player:
            return False
        # Check if end is empty
        if self.board[er][ec] != EMPTY:
            return False
        # Check diagonal move
        row_diff = abs(er - sr)
        col_diff = abs(ec - sc)
        if row_diff != col_diff or row_diff not in [1, 2]:
            return False
        # Simple move (diagonal one step)
        if row_diff == 1:
            # For black, move down; for white, move up
            if (player == BLACK and er > sr) or (player == WHITE and er < sr):
                return True
            return False
        # Capture move (diagonal two steps)
        if row_diff == 2:
            mr, mc = (sr + er) // 2, (sc + ec) // 2  # Middle square
            opponent = WHITE if player == BLACK else BLACK
            if self.board[mr][mc] == opponent:
                return True
            return False
        return False

    def make_move(self, start: Tuple[int, int], end: Tuple[int, int]) -> Optional[Tuple[int, int]]:
        sr, sc = start
        er, ec = end
        row_diff = abs(er - sr)
        self.board[er][ec] = self.board[sr][sc]
        self.board[sr][sc] = EMPTY
        captured = None
        if row_diff == 2:  # Capture
            mr, mc = (sr + er) // 2, (sc + ec) // 2
            self.board[mr][mc] = EMPTY
            captured = (mr, mc)
        self.current_player = WHITE if self.current_player == BLACK else BLACK
        return captured

    def get_state(self) -> dict:
        return {
            "board": self.board,
            "current_player": self.current_player,
            "players": list(self.players.values())
        }

# WebSocket server
game = Game()
connected = set()

async def handler(websocket):
    global game
    try:
        # Assign player
        if len(game.players) < 2:
            player = BLACK if len(game.players) == 0 else WHITE
            game.players[websocket] = player
            connected.add(websocket)
            await websocket.send(json.dumps({
                "type": "init",
                "player": player,
                "game_state": game.get_state()
            }))
            if len(game.players) == 2:
                await broadcast(json.dumps({
                    "type": "game_start",
                    "game_state": game.get_state()
                }))
        else:
            await websocket.send(json.dumps({"type": "error", "message": "Game is full"}))
            return

        async for message in websocket:
            data = json.loads(message)
            if data["type"] == "move":
                start = tuple(data["start"])
                end = tuple(data["end"])
                if game.players.get(websocket) and game.is_valid_move(start, end, game.players[websocket]):
                    captured = game.make_move(start, end)
                    game_state = game.get_state()
                    await broadcast(json.dumps({
                        "type": "move_made",
                        "start": start,
                        "end": end,
                        "captured": captured,
                        "game_state": game_state
                    }))
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Invalid move"
                    }))
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        if websocket in game.players:
            del game.players[websocket]
            connected.discard(websocket)
            if game.players:
                await broadcast(json.dumps({
                    "type": "player_disconnected",
                    "message": f"Player {game.players.get(websocket, 'Unknown')} disconnected"
                }))

async def broadcast(message):
    for ws in connected:
        await ws.send(message)

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # Run forever

if platform.system() == "Emscripten":
    asyncio.ensure_future(main())
else:
    if __name__ == "__main__":
        asyncio.run(main())
