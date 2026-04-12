import { useState, useEffect, useCallback, useRef } from "react";
import { Client, type IMessage, type StompSubscription, type IFrame } from "@stomp/stompjs";
import type { RoomState } from "./RoomTypes";

export type WSRole = "none" | "host" | "guest";

interface ServerMessage {
  type: "ROOM_STATE" | "JOIN_ERROR";
  roomState?: RoomState | null;
  error?: string | null;
}

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

let _clientToken: string | null = null;
function getClientToken(): string {
  if (!_clientToken) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      _clientToken = crypto.randomUUID();
    } else {
      _clientToken = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  return _clientToken;
}

let _client: Client | null = null;
function resolveBrokerUrl(): string {
  const override = import.meta.env.VITE_SUDOKU_WS_URL;
  if (override) {
    return override;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function getClient(): Client {
  if (!_client) {
    _client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    });
  }
  return _client;
}

function parseMessage(message: IMessage): ServerMessage | null {
  try {
    return JSON.parse(message.body) as ServerMessage;
  } catch {
    return null;
  }
}

export function useWebSocketTransport(): UseWebSocketTransportReturn {
  const client = getClient();
  const clientToken = getClientToken();

  const [role, setRole] = useState<WSRole>("none");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myClientId, setMyClientId] = useState<string | null>(clientToken);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(client.connected);

  const roomStateRef = useRef<RoomState | null>(null);
  const clientSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomDestinationRef = useRef<string | null>(null);

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const subscribeToRoom = useCallback((roomCode: string) => {
    if (!client.connected) return;

    const destination = `/topic/sudoku/room/${roomCode}`;
    if (roomDestinationRef.current === destination) {
      return;
    }

    roomSubscriptionRef.current?.unsubscribe();
    roomDestinationRef.current = destination;
    roomSubscriptionRef.current = client.subscribe(destination, (message) => {
      const parsed = parseMessage(message);
      if (parsed?.type === "ROOM_STATE" && parsed.roomState) {
        setRoomState(parsed.roomState);
      }
    });
  }, [client]);

  useEffect(() => {
    client.onConnect = () => {
      setIsConnected(true);
      setMyClientId(clientToken);

      clientSubscriptionRef.current?.unsubscribe();
      clientSubscriptionRef.current = client.subscribe(
        `/topic/sudoku/client/${clientToken}`,
        (message) => {
          const parsed = parseMessage(message);
          if (!parsed) return;

          if (parsed.type === "JOIN_ERROR") {
            setJoinError(parsed.error ?? "Unable to join room.");
            setRole("none");
            return;
          }

          if (parsed.type === "ROOM_STATE" && parsed.roomState) {
            setJoinError(null);
            setRoomState(parsed.roomState);
            subscribeToRoom(parsed.roomState.roomCode);
          }
        }
      );

      const current = roomStateRef.current;
      if (current?.roomCode) {
        subscribeToRoom(current.roomCode);
      }
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error("[STOMP] broker error:", frame.headers["message"]);
    };

    client.onWebSocketError = (event) => {
      console.error("[STOMP] websocket error:", event);
    };

    if (!client.active) {
      client.activate();
    }

    return () => {
      clientSubscriptionRef.current?.unsubscribe();
      roomSubscriptionRef.current?.unsubscribe();
      roomDestinationRef.current = null;
    };
  }, [client, clientToken, subscribeToRoom]);

  const publishJson = useCallback((destination: string, body: unknown) => {
    const publish = () =>
      client.publish({
        destination,
        body: JSON.stringify(body),
      });

    if (client.connected) {
      publish();
      return;
    }

    const previousOnConnect = client.onConnect;
    client.onConnect = (frame: IFrame) => {
      previousOnConnect?.(frame);
      publish();
      client.onConnect = previousOnConnect ?? (() => {});
    };

    if (!client.active) {
      client.activate();
    }
  }, [client]);

  const createRoom = useCallback((hostName: string, maxPlayers: number) => {
    setJoinError(null);
    setRole("host");
    publishJson("/app/sudoku/create", { hostName, maxPlayers, clientToken });
  }, [clientToken, publishJson]);

  const joinRoom = useCallback((code: string, name: string) => {
    setJoinError(null);
    setRole("guest");
    publishJson("/app/sudoku/join", {
      roomCode: code.trim().toUpperCase(),
      playerName: name,
      clientToken,
    });
  }, [clientToken, publishJson]);

  const leaveRoom = useCallback(() => {
    setRoomState(null);
    setRole("none");
    setJoinError(null);
    roomSubscriptionRef.current?.unsubscribe();
    roomSubscriptionRef.current = null;
    roomDestinationRef.current = null;
    client.deactivate();
    _client = null;
  }, [client]);

  const startGame = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) return;
    publishJson("/app/sudoku/start", { roomCode: current.roomCode });
  }, [publishJson]);

  const makeMove = useCallback((row: number, col: number, num: number) => {
    const current = roomStateRef.current;
    if (!current) return;
    publishJson("/app/sudoku/makeMove", { roomCode: current.roomCode, row, col, num });
  }, [publishJson]);

  const handleNewPuzzle = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) return;
    publishJson("/app/sudoku/newPuzzle", { roomCode: current.roomCode });
  }, [publishJson]);

  const handleRestart = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) return;
    publishJson("/app/sudoku/restart", { roomCode: current.roomCode });
  }, [publishJson]);

  return {
    isConnected,
    myClientId,
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
