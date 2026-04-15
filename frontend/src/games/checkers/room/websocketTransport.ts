import { useCallback, useEffect, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { RoomState } from "./RoomTypes";
import type { CheckersState, Position } from "../types";
import { BACKEND_URL } from "../../../backend";

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
  createRoom: (hostName: string) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  sendMove: (from: Position, to: Position, resultingState: CheckersState) => void;
  resetGame: () => void;
}

function getClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMessage(message: IMessage): ServerMessage | null {
  try {
    return JSON.parse(message.body) as ServerMessage;
  } catch {
    return null;
  }
}

export function useWebSocketTransport(): UseWebSocketTransportReturn {
  const [clientToken] = useState(getClientToken);
  const clientRef = useRef<Client | null>(null);

  const [role, setRole] = useState<WSRole>("none");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myClientId, setMyClientId] = useState<string | null>(clientToken);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const roomStateRef = useRef<RoomState | null>(null);
  const clientSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomDestinationRef = useRef<string | null>(null);

  const resolveBrokerUrl = useCallback(() => {
    /*
    const override = import.meta.env.VITE_CHECKERS_WS_URL;
    if (override) {
      return override;
    }
      

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
    
    console.log(`${BACKEND_URL.replace(/^http/, "ws")}/ws`);
    return `${BACKEND_URL.replace(/^http/, "ws")}/ws`;
    */
    const base = BACKEND_URL.replace(/\/+$/, "");
    console.log(`${base.replace(/^http/, "ws")}/ws`);
    return `${base.replace(/^http/, "ws")}/ws`;
  }, []);

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const subscribeToRoom = useCallback((roomCode: string) => {
    const client = clientRef.current;
    if (!client?.connected) {
      return;
    }

    const destination = `/topic/checkers/room/${roomCode}`;
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
  }, []);

  useEffect(() => {
    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    });
    clientRef.current = client;

    client.onConnect = () => {
      setIsConnected(true);
      setMyClientId(clientToken);

      clientSubscriptionRef.current?.unsubscribe();
      clientSubscriptionRef.current = client.subscribe(
        `/topic/checkers/client/${clientToken}`,
        (message) => {
          const parsed = parseMessage(message);
          if (!parsed) {
            return;
          }

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
      if (!roomStateRef.current) {
        setJoinError("Lost connection to the Checkers server.");
      }
    };

    client.onStompError = (frame) => {
      setJoinError(frame.headers["message"] ?? "Checkers server rejected the connection.");
    };

    client.onWebSocketError = () => {
      setJoinError("Unable to connect to the Checkers server at " + resolveBrokerUrl());
    };

    client.activate();

    return () => {
      clientSubscriptionRef.current?.unsubscribe();
      roomSubscriptionRef.current?.unsubscribe();
      clientSubscriptionRef.current = null;
      roomSubscriptionRef.current = null;
      roomDestinationRef.current = null;
      setIsConnected(false);
      void client.deactivate();
      clientRef.current = null;
    };
  }, [clientToken, resolveBrokerUrl, subscribeToRoom]);

  const publishJson = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (!client) {
      setJoinError("Checkers connection has not been initialized yet.");
      return;
    }

    if (!client.connected) {
      setJoinError("Still connecting to the Checkers server. Try again in a moment.");
      return;
    }

    client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }, []);

  const createRoom = useCallback((hostName: string) => {
    setJoinError(null);
    setRole("host");
    publishJson("/app/checkers/create", { hostName, clientToken });
  }, [clientToken, publishJson]);

  const joinRoom = useCallback((code: string, name: string) => {
    setJoinError(null);
    setRole("guest");
    publishJson("/app/checkers/join", {
      roomCode: code.trim().toUpperCase(),
      playerName: name,
      clientToken,
    });
  }, [clientToken, publishJson]);

  const leaveRoom = useCallback(() => {
    const current = roomStateRef.current;
    if (current?.roomCode) {
      publishJson("/app/checkers/leave", { roomCode: current.roomCode });
    }

    setRoomState(null);
    setRole("none");
    setJoinError(null);
    roomSubscriptionRef.current?.unsubscribe();
    roomSubscriptionRef.current = null;
    roomDestinationRef.current = null;
  }, [publishJson]);

  const startGame = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) {
      return;
    }
    publishJson("/app/checkers/start", { roomCode: current.roomCode });
  }, [publishJson]);

  const sendMove = useCallback((from: Position, to: Position, resultingState: CheckersState) => {
    const current = roomStateRef.current;
    if (!current) {
      return;
    }

    publishJson("/app/checkers/move", {
      roomCode: current.roomCode,
      from,
      to,
      resultingState,
    });
  }, [publishJson]);

  const resetGame = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) {
      return;
    }
    publishJson("/app/checkers/reset", { roomCode: current.roomCode });
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
    sendMove,
    resetGame,
  };
}
