import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "../config";

export type WSRole = "none" | "host" | "guest";

export interface ServerMessage<TRoomState> {
  type: "ROOM_STATE" | "JOIN_ERROR";
  roomState?: TRoomState | null;
  error?: string | null;
}

export interface UseStompRoomTransportConfig {
  gameKey: string;
  createDestination: string;
  joinDestination: string;
  leaveDestination: string;
  startDestination?: string;
}

export interface UseStompRoomTransportReturn<TRoomState> {
  isConnected: boolean;
  myClientId: string | null;
  joinError: string | null;
  roomState: TRoomState | null;
  role: WSRole;
  createRoom: (body: unknown) => void;
  joinRoom: (body: unknown) => void;
  leaveRoom: (body: unknown) => void;
  startGame: (body: unknown) => void;
  sendAction: (destination: string, body: unknown) => void;
  resetGame: () => void;
}

export function getClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseMessage<TRoomState>(message: IMessage): ServerMessage<TRoomState> | null {
  try {
    return JSON.parse(message.body) as ServerMessage<TRoomState>;
  } catch {
    return null;
  }
}

export function useStompRoomTransport<TRoomState extends { roomCode: string }>(
  config: UseStompRoomTransportConfig
): UseStompRoomTransportReturn<TRoomState> {
  const [clientToken] = useState(getClientToken);
  const clientRef = useRef<Client | null>(null);
  const [role, setRole] = useState<WSRole>("none");
  const [roomState, setRoomState] = useState<TRoomState | null>(null);
  const [myClientId, setMyClientId] = useState<string | null>(clientToken);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomDestinationRef = useRef<string | null>(null);
  const latestRoomCodeRef = useRef<string | null>(null);

  const subscribeToRoom = useCallback((roomCode: string) => {
    const client = clientRef.current;
    if (!client?.connected) {
      setJoinError("Still connecting to the server.");
      return;
    }

    const destination = `/topic/${config.gameKey}/room/${roomCode}`;
    if (roomDestinationRef.current === destination) return;

    roomSubscriptionRef.current?.unsubscribe();
    roomDestinationRef.current = destination;
    latestRoomCodeRef.current = roomCode;

    roomSubscriptionRef.current = client.subscribe(destination, (message) => {
      const parsed = parseMessage<TRoomState>(message);
      if (parsed?.type === "ROOM_STATE" && parsed.roomState) {
        setRoomState(parsed.roomState);
        latestRoomCodeRef.current = parsed.roomState.roomCode;
      }
    });
  }, [config.gameKey]);

  useEffect(() => {
    const client = new Client({
      brokerURL: WS_URL,
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
        `/topic/${config.gameKey}/client/${clientToken}`,
        (message) => {
          const parsed = parseMessage<TRoomState>(message);
          if (!parsed) return;

          if (parsed.type === "JOIN_ERROR") {
            setJoinError(parsed.error ?? "Unable to join room.");
            setRole("none");
            return;
          }

          if (parsed.type === "ROOM_STATE" && parsed.roomState) {
            setJoinError(null);
            setRoomState(parsed.roomState);
            latestRoomCodeRef.current = parsed.roomState.roomCode;
            subscribeToRoom(parsed.roomState.roomCode);
          }
        }
      );

      if (latestRoomCodeRef.current) {
        subscribeToRoom(latestRoomCodeRef.current);
      }
    };

    client.onWebSocketError = () => {
      setJoinError(`Unable to connect to ${WS_URL}`);
    };

    client.activate();
    return () => {
      clientSubscriptionRef.current?.unsubscribe();
      roomSubscriptionRef.current?.unsubscribe();
      void client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [clientToken, config.gameKey]);

  const publishJson = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (!client?.connected) {
      setJoinError("Still connecting to the server.");
      return;
    }
    client.publish({ destination, body: JSON.stringify(body) });
  }, []);

  return {
    isConnected,
    myClientId,
    joinError,
    roomState,
    role,
    createRoom: (body) => {
      setRole("host");
      setJoinError(null);
      publishJson(config.createDestination, body);
    },
    joinRoom: (body) => {
      setRole("guest");
      setJoinError(null);

      const roomCode =
        typeof body === "object" &&
        body !== null &&
        "roomCode" in body &&
        typeof (body as { roomCode?: unknown }).roomCode === "string"
          ? (body as { roomCode: string }).roomCode
          : null;

      if (roomCode) {
        subscribeToRoom(roomCode);
      }

      publishJson(config.joinDestination, body);
    },
    leaveRoom: (body) => {
      setRole("none");
      setRoomState(null);
      setJoinError(null);
      roomSubscriptionRef.current?.unsubscribe();
      roomSubscriptionRef.current = null;
      roomDestinationRef.current = null;
      latestRoomCodeRef.current = null;
      publishJson(config.leaveDestination, body);
    },
    startGame: (body) => {
      if (config.startDestination) publishJson(config.startDestination, body);
    },
    sendAction: (destination, body) => publishJson(destination, body),

    // just jump back to intial state for game scene, without leaving the room 
    resetGame: () => {
      setRoomState(null);
      if (role === "host") {
        publishJson(config.startDestination ?? "", { reset: true });
      }
    }
  };
}
