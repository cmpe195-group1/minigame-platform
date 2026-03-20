import { useState, useEffect, useCallback, useRef } from "react";
import type { RoomState, RoomMessage, RoomParticipant } from "./RoomTypes";
import { PLAYER_COLORS } from "../game/Player";
import { generateSudokuBoard } from "../game/SudokuGenerator";

// ── Unique tab ID (generated once per page load) ──────────────────────────────
let _tabId: string | null = null;
function getTabId(): string {
  if (!_tabId) _tabId = Math.random().toString(36).slice(2, 10);
  return _tabId;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function isBoardFull(board: RoomState["board"]): boolean {
  if (!board) return false;
  return board.every((row) => row.every((cell) => cell.value !== 0));
}

function isCorrectMove(
  board: RoomState["board"],
  row: number,
  col: number,
  num: number
): boolean {
  if (!board) return false;
  const cell = board[row]?.[col] as unknown as { solvedValue?: number };
  return cell?.solvedValue === num;
}

// ─────────────────────────────────────────────────────────────────────────────

export type BCRole = "none" | "host" | "guest";

export interface UseBroadcastTransportReturn {
  isConnected: boolean;
  myClientId: string;
  joinError: string | null;
  roomState: RoomState | null;
  role: BCRole;
  createRoom: (hostName: string, maxPlayers: number) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  makeMove: (row: number, col: number, num: number) => void;
  handleNewPuzzle: () => void;
  handleRestart: () => void;
}

export function useBroadcastTransport(): UseBroadcastTransportReturn {
  const myTabId = getTabId();

  const [role, setRole] = useState<BCRole>("none");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Host uses this ref as the single source of truth for game state
  // (so processAsHost always has the latest state without stale closures)
  const hostStateRef = useRef<RoomState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const roleRef = useRef<BCRole>("none");

  // Keep roleRef in sync
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // ── Push state to all tabs (host only) ────────────────────────────────────
  // Updates local state AND broadcasts to all guest tabs via BroadcastChannel
  const pushState = useCallback((state: RoomState) => {
    hostStateRef.current = state;         // keep host ref up-to-date first
    setRoomState(state);                  // re-render host tab
    channelRef.current?.postMessage({     // notify all guest tabs
      type: "ROOM_STATE",
      roomCode: state.roomCode,
      payload: state,
    } satisfies RoomMessage);
  }, []);

  // ── Process an action as host ─────────────────────────────────────────────
  // NOTE: always read from hostStateRef.current so we never have stale state
  const processAsHost = useCallback(
    (msg: RoomMessage) => {
      switch (msg.type) {

        case "JOIN_REQUEST": {
          const { tabId, playerName } = msg.payload as {
            tabId: string;
            playerName: string;
          };
          const state = hostStateRef.current;
          if (!state || state.status !== "waiting") {
            if (state) pushState(state); // re-broadcast current state to late arrivals
            return;
          }
          // Ignore duplicates
          if (state.participants.find((p) => p.clientId === tabId)) {
            pushState(state);
            return;
          }
          if (state.participants.length >= state.maxPlayers) return;

          const seatIndex = state.participants.length;
          const pc = PLAYER_COLORS[seatIndex];
          const newParticipant: RoomParticipant = {
            playerId: seatIndex + 1,
            name: playerName,
            color: pc.color,
            colorName: pc.colorName,
            clientId: tabId,
          };
          pushState({
            ...state,
            participants: [...state.participants, newParticipant],
          });
          break;
        }

        case "START_GAME": {
          const state = hostStateRef.current;
          if (!state || state.participants.length < 2) return;
          const players = state.participants.map((p) => ({
            id: p.playerId,
            name: p.name,
            color: p.color,
            colorName: p.colorName,
            score: 0,
          }));
          pushState({
            ...state,
            players,
            board: generateSudokuBoard(36),
            status: "playing",
            phase: "playing",
            currentPlayerIndex: 0,
            winner: null,
            lastMoveCorrect: null,
            moveCount: 0,
          });
          break;
        }

        case "MAKE_MOVE": {
          const { row, col, num, playerId } = msg.payload as {
            row: number;
            col: number;
            num: number;
            playerId: number;
          };
          const state = hostStateRef.current;
          if (!state || state.status !== "playing" || !state.board) return;

          const currentPlayer = state.players[state.currentPlayerIndex];
          if (!currentPlayer || currentPlayer.id !== playerId) return;

          const cell = state.board[row]?.[col];
          if (!cell || cell.isGiven || cell.value !== 0) return;

          const correct = isCorrectMove(state.board, row, col, num);

          const newBoard = state.board.map((r, ri) =>
            r.map((c, ci) =>
              ri === row && ci === col
                ? { ...c, value: num, playerId, isCorrect: correct }
                : c
            )
          );
          const newPlayers = state.players.map((p) =>
            p.id === playerId && correct ? { ...p, score: p.score + 1 } : p
          );
          const full = isBoardFull(newBoard);
          const sorted = [...newPlayers].sort((a, b) => b.score - a.score);
          const nextIndex = full
            ? state.currentPlayerIndex
            : (state.currentPlayerIndex + 1) % state.players.length;

          pushState({
            ...state,
            board: newBoard,
            players: newPlayers,
            lastMoveCorrect: correct,
            moveCount: state.moveCount + 1,
            currentPlayerIndex: nextIndex,
            phase: full ? "finished" : "playing",
            status: full ? "finished" : "playing",
            winner: full ? sorted[0] : null,
          });
          break;
        }

        case "NEW_PUZZLE": {
          const state = hostStateRef.current;
          if (!state) return;
          pushState({
            ...state,
            board: generateSudokuBoard(36),
            players: state.players.map((p) => ({ ...p, score: 0 })),
            currentPlayerIndex: 0,
            phase: "playing",
            status: "playing",
            winner: null,
            lastMoveCorrect: null,
            moveCount: 0,
          });
          break;
        }

        case "RESTART": {
          const state = hostStateRef.current;
          if (!state) return;
          pushState({
            ...state,
            status: "waiting",
            phase: "setup",
            board: null,
            players: [],
            currentPlayerIndex: 0,
            winner: null,
            lastMoveCorrect: null,
            moveCount: 0,
          });
          break;
        }

        default:
          break;
      }
    },
    [pushState]
  );

  // ── Open BroadcastChannel for a room ──────────────────────────────────────
  const openChannel = useCallback(
    (roomCode: string) => {
      channelRef.current?.close();
      const ch = new BroadcastChannel(`sudoku-room-${roomCode}`);
      channelRef.current = ch;

      ch.onmessage = (ev: MessageEvent<RoomMessage>) => {
        const msg = ev.data;
        if (!msg || msg.roomCode !== roomCode) return;

        if (msg.type === "ROOM_STATE") {
          // Guests receive state from host
          // (Host never receives its own postMessage, so no need to guard)
          if (roleRef.current !== "host") {
            setRoomState(msg.payload as RoomState);
          }
          return;
        }

        // Host processes all action messages sent by guests
        if (roleRef.current === "host") {
          processAsHost(msg);
        }
      };
    },
    [processAsHost]
  );

  // ── CREATE ROOM ───────────────────────────────────────────────────────────
  const createRoom = useCallback(
    (hostName: string, maxPlayers: number) => {
      const code = genCode();
      const pc = PLAYER_COLORS[0];

      const initialState: RoomState = {
        roomCode: code,
        hostClientId: myTabId,
        maxPlayers,
        transport: "broadcast",
        participants: [
          {
            playerId: 1,
            name: hostName || "Player 1",
            color: pc.color,
            colorName: pc.colorName,
            clientId: myTabId,
          },
        ],
        status: "waiting",
        board: null,
        players: [],
        currentPlayerIndex: 0,
        phase: "setup",
        winner: null,
        lastMoveCorrect: null,
        moveCount: 0,
      };

      openChannel(code);
      hostStateRef.current = initialState;
      setRoomState(initialState);
      setRole("host");
      roleRef.current = "host";
    },
    [myTabId, openChannel]
  );

  // ── JOIN ROOM ─────────────────────────────────────────────────────────────
  const joinRoom = useCallback(
    (code: string, name: string) => {
      setJoinError(null);
      const upper = code.trim().toUpperCase();

      openChannel(upper);
      setRole("guest");
      roleRef.current = "guest";

      // Send join request to the host tab
      channelRef.current?.postMessage({
        type: "JOIN_REQUEST",
        roomCode: upper,
        payload: { tabId: myTabId, playerName: name || "Player" },
      } satisfies RoomMessage);

      // If host tab doesn't reply within 3s, the room doesn't exist in this browser
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          setJoinError(
            "Room not found. Make sure the host tab is open in this browser."
          );
          setRole("none");
          roleRef.current = "none";
          channelRef.current?.close();
          channelRef.current = null;
        }
      }, 3000);

      const ch = channelRef.current;
      if (!ch) return;
      const onFirst = (ev: MessageEvent<RoomMessage>) => {
        if (ev.data?.type === "ROOM_STATE") {
          resolved = true;
          clearTimeout(timer);
          ch.removeEventListener("message", onFirst);
        }
      };
      ch.addEventListener("message", onFirst);
    },
    [myTabId, openChannel]
  );

  // ── LEAVE ROOM ────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    hostStateRef.current = null;
    setRoomState(null);
    setRole("none");
    roleRef.current = "none";
    setJoinError(null);
  }, []);

  // ── Action dispatcher ─────────────────────────────────────────────────────
  // Host handles actions synchronously (no echo from BroadcastChannel to self).
  // Guests post to the channel so the host tab receives and processes them.
  const sendAction = useCallback(
    (type: RoomMessage["type"], payload?: unknown) => {
      const state = hostStateRef.current ?? roomState;
      if (!state) return;
      const msg: RoomMessage = { type, roomCode: state.roomCode, payload };
      if (roleRef.current === "host") {
        processAsHost(msg);
      } else {
        channelRef.current?.postMessage(msg);
      }
    },
    [roomState, processAsHost]
  );

  const startGame = useCallback(
    () => sendAction("START_GAME"),
    [sendAction]
  );

  const makeMove = useCallback(
    (row: number, col: number, num: number) => {
      const state = hostStateRef.current ?? roomState;
      if (!state) return;
      const me = state.participants.find((p) => p.clientId === myTabId);
      if (!me) return;
      sendAction("MAKE_MOVE", { row, col, num, playerId: me.playerId });
    },
    [myTabId, roomState, sendAction]
  );

  const handleNewPuzzle = useCallback(
    () => sendAction("NEW_PUZZLE"),
    [sendAction]
  );

  const handleRestart = useCallback(
    () => sendAction("RESTART"),
    [sendAction]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.close();
    };
  }, []);

  return {
    isConnected: true,
    myClientId: myTabId,
    joinError,
    roomState,
    role,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    makeMove,
    handleNewPuzzle,
    handleRestart,
  };
}
