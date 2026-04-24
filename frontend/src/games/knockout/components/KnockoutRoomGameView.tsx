import KnockoutGameWrapper from "../KnockoutGameWrapper";
import type { KnockoutGameState, LocalShotPayload } from "../types";
import type { RoomState } from "../room/KnockoutRoomTypes";

interface Props {
  roomState: RoomState;
  myClientId: string | null;
  isHost: boolean;
  onSendShot: (payload: LocalShotPayload) => void;
  onResolveTurn: (state: KnockoutGameState) => void;
  onReset: () => void;
  onLeave: () => void;
}

export default function KnockoutRoomGameView({
  roomState,
  myClientId,
  isHost,
  onSendShot,
  onResolveTurn,
  onReset,
  onLeave,
}: Props) {
  const gameState = roomState.gameState;
  const myParticipant = roomState.participants.find((participant) => participant.clientId === myClientId);
  const mySide = myParticipant?.side ?? null;
  const canInteract = Boolean(gameState && roomState.status === "playing" && mySide && gameState.currentPlayer === mySide);
  const remoteShot = roomState.lastShot && roomState.lastShot.shooterClientId !== myClientId ? roomState.lastShot : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col px-4 py-4 text-white">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Knockout Room</h1>
          <p className="text-blue-300 text-sm">Room {roomState.roomCode} · {roomState.participants.length}/{roomState.maxPlayers} players</p>
        </div>
        <div className="flex gap-3">
          {isHost && (
            <button onClick={onReset} className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
              Reset
            </button>
          )}
          <button onClick={onLeave} className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
            Leave
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col xl:flex-row gap-6 items-start">
        <KnockoutGameWrapper
          mode="multiplayer_online"
          state={gameState ?? undefined}
          playerSide={mySide ?? "A"}
          canInteract={canInteract}
          shotReplay={remoteShot}
          onShotTaken={onSendShot}
          onTurnResolved={({ resultingState }) => onResolveTurn(resultingState)}
        />

        <aside className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
          <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">Players</p>
          <div className="space-y-2">
            {roomState.participants.map((participant) => (
              <div key={participant.clientId} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{participant.name}</div>
                  <div className="text-xs text-blue-200/80">Side {participant.side}</div>
                </div>
                <div className="text-xs text-blue-300">{participant.clientId === roomState.hostClientId ? "Host" : "Player"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-slate-200">
            {gameState?.winner
              ? `Player ${gameState.winner} wins`
              : remoteShot
                ? `Animating Player ${gameState?.currentPlayer ?? "?"}'s shot...`
                : gameState
                  ? `Player ${gameState.currentPlayer} to shoot`
                  : "Waiting for game state"}
          </div>
        </aside>
      </div>
    </div>
  );
}
