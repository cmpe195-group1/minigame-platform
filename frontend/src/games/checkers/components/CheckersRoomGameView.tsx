import CheckersGameWrapper from "../CheckersGameWrapper";
import type { MovePayload } from "../checkersScene";
import type { RoomState } from "../room/CheckersRoomTypes";
import type { Player } from "../types";

interface Props {
  roomState: RoomState;
  myClientId: string | null;
  isHost: boolean;
  onSendMove: (payload: MovePayload) => void;
  onReset: () => void;
  onLeave: () => void;
}

const pieceTheme: Record<Player, { label: string; badgeClass: string }> = {
  white: {
    label: "White",
    badgeClass: "bg-slate-100 text-slate-900",
  },
  black: {
    label: "Black",
    badgeClass: "bg-slate-800 text-slate-100 border border-slate-600",
  },
};

function getPieceCounts(roomState: RoomState): { white: number; black: number } {
  const board = roomState.gameState?.board ?? [];
  let white = 0;
  let black = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) {
        continue;
      }
      if (piece.color === "white") {
        white += 1;
      } else {
        black += 1;
      }
    }
  }

  return { white, black };
}

export default function CheckersRoomGameView({
  roomState,
  myClientId,
  isHost,
  onSendMove,
  onReset,
  onLeave,
}: Props) {
  const gameState = roomState.gameState;
  const myParticipant = roomState.participants.find(
    (participant) => participant.clientId === myClientId
  );
  const myColor = myParticipant?.pieceColor ?? "white";
  const isMyTurn =
    roomState.status === "playing" &&
    !!gameState &&
    !!myParticipant &&
    gameState.turn === myParticipant.pieceColor;

  const winnerLabel = roomState.winner
    ? `${pieceTheme[roomState.winner].label} wins`
    : "Game in progress";
  const counts = getPieceCounts(roomState);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-blue-300/30 border-t-blue-300 animate-spin" />
          <h2 className="text-2xl font-extrabold text-white">Preparing Match…</h2>
          <p className="text-blue-200/80 text-sm mt-2">
            Waiting for the latest board state from the Checkers server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <header className="py-4 px-6 text-center flex-shrink-0">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">
          ⛀ Checkers Room Match
        </h1>
        <p className="text-blue-300 text-sm mt-1">
          {roomState.status === "finished"
            ? winnerLabel
            : isMyTurn
            ? "Your turn — make a move on the board"
            : `Waiting for ${pieceTheme[gameState.turn].label} to move`}
        </p>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 px-4 pb-8">
        <div className="flex-shrink-0">
          <div
            className={`rounded-3xl transition-all duration-300 ${
              isMyTurn ? "ring-4 ring-green-400/50" : ""
            }`}
          >
            <CheckersGameWrapper
              mode="multiplayer_online"
              state={gameState}
              playerColor={myColor}
              canInteract={isMyTurn}
              winnerOverride={roomState.status === "finished" ? roomState.winner : undefined}
              onPlayerMove={onSendMove}
            />
          </div>
          <p
            className={`text-center text-sm mt-2 font-semibold xl:hidden ${
              isMyTurn ? "text-green-400" : "text-slate-400"
            }`}
          >
            {roomState.status === "finished"
              ? winnerLabel
              : isMyTurn
              ? "✅ Your turn"
              : `⏳ ${pieceTheme[gameState.turn].label} to move`}
          </p>
        </div>

        <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
          <div
            className={`rounded-2xl p-4 border text-sm ${
              roomState.status === "finished"
                ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                : isMyTurn
                ? "bg-green-500/20 border-green-400/50 text-green-200"
                : "bg-white/5 border-white/10 text-slate-300"
            }`}
          >
            <div className="font-bold mb-1">
              {roomState.status === "finished"
                ? winnerLabel
                : isMyTurn
                ? "It is your turn"
                : "Opponent turn"}
            </div>
            <div className="text-xs opacity-90">
              You are playing as {pieceTheme[myColor].label}. Room code: {roomState.roomCode}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold">
                Match Summary
              </p>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                Move {roomState.moveCount}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Turn</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${pieceTheme[gameState.turn].badgeClass}`}
                >
                  {pieceTheme[gameState.turn].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">White pieces</span>
                <span className="font-semibold">{counts.white}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Black pieces</span>
                <span className="font-semibold">{counts.black}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Result</span>
                <span className="font-semibold">{winnerLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-white">
            <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-3">
              Connected Players
            </p>
            <div className="space-y-2">
              {roomState.participants.map((participant) => (
                <div
                  key={participant.clientId}
                  className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-sm">{participant.name}</div>
                    <div className="text-xs text-slate-400">
                      {pieceTheme[participant.pieceColor].label} pieces
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pieceTheme[participant.pieceColor].badgeClass}`}
                    >
                      {pieceTheme[participant.pieceColor].label}
                    </span>
                    {participant.clientId === roomState.hostClientId && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold">
                        Host
                      </span>
                    )}
                    {participant.clientId === myClientId && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                        You
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isHost ? (
              <button
                onClick={onReset}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                ↩ Back to Lobby
              </button>
            ) : (
              <div className="text-center text-xs text-slate-400 bg-white/5 rounded-xl p-3">
                Only the host can return the room to the lobby.
              </div>
            )}

            <button
              onClick={onLeave}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all duration-200"
            >
              ← Leave Room
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
