// ─── WebSocket (Socket.IO) Transport ──────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { RoomState, JoinAck } from "./RoomTypes";

export type WSRole = "none" | "host" | "guest";

export interface UseWebSocketTransportReturn {
  isConnected: boolean;
  myClientId: string | null;
  joinError: string | null;
  roomState: RoomState | null;
  role: WSRole;

  createRoom: (hostName: string, maxPlayers: number) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  makeMove: (row: number, col: number, num: number) => void;
  handleNewPuzzle: () => void;
  handleRestart: () => void;
}

let _socket: Socket | null = null;
function getSocket(): Socket {
  if (!_socket) {
    _socket = io("/", {
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return _socket;
}

export function useWebSocketTransport(): UseWebSocketTransportReturn {
  const socket = getSocket();

  const [role, setRole] = useState<WSRole>("none");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myClientId, setMyClientId] = useState<string | null>(
    socket.id ?? null
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  const roomStateRef = useRef<RoomState | null>(null);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // ── Socket lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setMyClientId(socket.id ?? null);
      console.log("[WS] connected:", socket.id);
    };
    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      console.warn("[WS] disconnected:", reason);
    };
    const onConnectError = (err: Error) => {
      console.error("[WS] connect_error:", err.message);
    };
    const onRoomState = (state: RoomState) => setRoomState(state);
    const onJoinError = (msg: { error: string }) => setJoinError(msg.error);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("ROOM_STATE", onRoomState);
    socket.on("JOIN_ERROR", onJoinError);


    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("ROOM_STATE", onRoomState);
      socket.off("JOIN_ERROR", onJoinError);
    };
  }, [socket]);

  // ── Create room ──────────────────────────────────────────────────────────
  const createRoom = useCallback(
    (hostName: string, maxPlayers: number) => {
      setJoinError(null);
      const doCreate = () => {
        socket.emit("CREATE_ROOM", { hostName, maxPlayers });
        setRole("host");
      };
      if (!socket.connected) {
        // Fallback: user clicked before autoConnect finished
        socket.connect();
        socket.once("connect", doCreate);
      } else {
        doCreate();
      }
    },
    [socket]
  );

  // ── Join room ────────────────────────────────────────────────────────────
  const joinRoom = useCallback(
    (code: string, name: string) => {
      setJoinError(null);
      const roomCode = code.trim().toUpperCase();
      const doJoin = () => {
        socket.emit(
          "JOIN_ROOM",
          { roomCode, playerName: name },
          (ack: JoinAck) => {
            if (ack?.error) {
              setJoinError(ack.error);
              setRole("none");
            } else {
              setRole("guest");
            }
          }
        );
      };
      // Lazy connect
      if (!socket.connected) {
        socket.connect();
        socket.once("connect", doJoin);
      } else {
        doJoin();
      }
    },
    [socket]
  );

  // ── Leave room ───────────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    setRoomState(null);
    setRole("none");
    setJoinError(null);
    // Disconnect to notify server (triggers disconnect + participant removal).
    // Re-connect after a short delay so the socket is ready for a new session.
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 500);
  }, [socket]);

  // ── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const rs = roomStateRef.current;
    if (!rs) return;
    socket.emit("START_GAME", { roomCode: rs.roomCode });
  }, [socket]);

  // ── Make move ────────────────────────────────────────────────────────────
  const makeMove = useCallback(
    (row: number, col: number, num: number) => {
      const rs = roomStateRef.current;
      if (!rs) return;
      const me = rs.participants.find((p) => p.clientId === socket.id);
      if (!me) return;
      socket.emit("MAKE_MOVE", {
        roomCode: rs.roomCode,
        row,
        col,
        num,
        playerId: me.playerId,
      });
    },
    [socket]
  );

  // ── New puzzle ───────────────────────────────────────────────────────────
  const handleNewPuzzle = useCallback(() => {
    const rs = roomStateRef.current;
    if (!rs) return;
    socket.emit("NEW_PUZZLE", { roomCode: rs.roomCode });
  }, [socket]);

  // ── Restart ──────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const rs = roomStateRef.current;
    if (!rs) return;
    socket.emit("RESTART", { roomCode: rs.roomCode });
  }, [socket]);

  return {
    isConnected,
    myClientId: myClientId ?? socket.id ?? null,
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
