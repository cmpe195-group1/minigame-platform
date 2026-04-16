import { useCallback, useEffect, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import { BACKEND_URL } from "../../../backend";

export interface ArrowScore {
  round: number;
  score: number;
  dist: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  scores: ArrowScore[];
  total: number;
  ready: boolean;
  slotIdx: number;
}

export interface RoomSnapshot {
  id: string;
  hostId: string;
  maxPlayers: number;
  state: "waiting" | "playing" | "finished";
  currentSlot: number;
  currentRound: number;
  arrowsFired: number;
  totalRounds: number;
  arrowsPerRound: number;
  windForce: number;
  players: RoomPlayer[];
}

export interface ServerMessage {
  type: "ROOM_STATE" | "ERROR";
  roomState?: RoomSnapshot | null;
  error?: string | null;
}

export interface UseGameSocketReturn {
  connected: boolean;
  room: RoomSnapshot | null;
  myId: string;
  mySlot: number;
  error: string | null;
  lastEvent: ServerMessage | null;
  createRoom: (playerName: string, maxPlayers: number) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  setReady: () => void;
  hostStart: () => void;
  sendArrowShot: (score: number, dist: number) => void;
  clearError: () => void;
}

function getClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `archery-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMessage(message: IMessage): ServerMessage | null {
  try {
    return JSON.parse(message.body) as ServerMessage;
  } catch {
    return null;
  }
}

function getPlayerSlot(room: RoomSnapshot | null, clientToken: string): number {
  if (!room) {
    return 0;
  }
  const player = room.players.find((candidate) => candidate.id === clientToken);
  return player?.slotIdx ?? 0;
}

export function useGameSocket(): UseGameSocketReturn {
  const clientTokenRef = useRef<string>(getClientToken());
  const clientRef = useRef<Client | null>(null);
  const clientToken = clientTokenRef.current;

  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [mySlot, setMySlot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<ServerMessage | null>(null);

  const roomRef = useRef<RoomSnapshot | null>(null);
  const clientSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomDestinationRef = useRef<string | null>(null);

  const resolveBrokerUrl = useCallback(() => {
    const base = BACKEND_URL.replace(/\/+$/, "");
    console.log(`${base.replace(/^http/, "ws")}/ws`);
    return `${base.replace(/^http/, "ws")}/ws`;
  }, []);

  const applyRoomState = useCallback((nextRoom: RoomSnapshot | null) => {
    roomRef.current = nextRoom;
    setRoom(nextRoom);
    setMySlot(getPlayerSlot(nextRoom, clientToken));
  }, [clientToken]);

  const subscribeToRoom = useCallback((roomId: string) => {
    const client = clientRef.current;
    if (!client?.connected) {
      return;
    }

    const destination = `/topic/archery/room/${roomId}`;
    if (roomDestinationRef.current === destination) {
      return;
    }

    roomSubscriptionRef.current?.unsubscribe();
    roomDestinationRef.current = destination;
    roomSubscriptionRef.current = client.subscribe(destination, (message) => {
      const parsed = parseMessage(message);
      if (!parsed) {
        return;
      }

      setLastEvent(parsed);
      if (parsed.type === "ERROR") {
        setError(parsed.error ?? "Archery backend rejected the request.");
        return;
      }

      setError(null);
      applyRoomState(parsed.roomState ?? null);
    });
  }, [applyRoomState]);

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
      setConnected(true);
      setError(null);

      clientSubscriptionRef.current?.unsubscribe();
      clientSubscriptionRef.current = client.subscribe(
        `/topic/archery/client/${clientToken}`,
        (message) => {
          const parsed = parseMessage(message);
          if (!parsed) {
            return;
          }

          setLastEvent(parsed);
          if (parsed.type === "ERROR") {
            setError(parsed.error ?? "Archery backend rejected the request.");
            return;
          }

          setError(null);
          applyRoomState(parsed.roomState ?? null);
          if (parsed.roomState?.id) {
            subscribeToRoom(parsed.roomState.id);
          }
        }
      );

      const currentRoom = roomRef.current;
      if (currentRoom?.id) {
        subscribeToRoom(currentRoom.id);
      }
    };

    client.onDisconnect = () => {
      setConnected(false);
      if (!roomRef.current) {
        setError("Lost connection to the Archery backend. Check that the Spring Boot app is still running.");
      }
    };

    client.onStompError = (frame) => {
      console.error("[STOMP] broker error:", frame.headers["message"]);
      setError(frame.headers["message"] ?? "Archery backend rejected the connection.");
    };

    client.onWebSocketError = (event) => {
      console.error("[STOMP] websocket error:", event);
      setError(`Unable to connect to the Archery backend at ${resolveBrokerUrl()}.`);
    };

    client.activate();

    return () => {
      clientSubscriptionRef.current?.unsubscribe();
      roomSubscriptionRef.current?.unsubscribe();
      clientSubscriptionRef.current = null;
      roomSubscriptionRef.current = null;
      roomDestinationRef.current = null;
      setConnected(false);
      void client.deactivate();
      clientRef.current = null;
    };
  }, [applyRoomState, clientToken, resolveBrokerUrl, subscribeToRoom]);

  const publishJson = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (!client) {
      setError("Archery connection has not been initialized yet.");
      return;
    }

    const publish = () =>
      client.publish({
        destination,
        body: JSON.stringify(body),
      });

    if (client.connected) {
      publish();
      return;
    }

    setError("Still connecting to the Archery backend. Try again in a moment.");
  }, []);

  const createRoom = useCallback((playerName: string, maxPlayers: number) => {
    setError(null);
    publishJson("/app/archery/create", { playerName, maxPlayers, clientToken });
  }, [clientToken, publishJson]);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    setError(null);
    publishJson("/app/archery/join", {
      roomId: roomId.trim().toUpperCase(),
      playerName,
      clientToken,
    });
  }, [clientToken, publishJson]);

  const setReady = useCallback(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) {
      return;
    }
    publishJson("/app/archery/ready", { roomId: currentRoom.id });
  }, [publishJson]);

  const hostStart = useCallback(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) {
      return;
    }
    publishJson("/app/archery/start", { roomId: currentRoom.id });
  }, [publishJson]);

  const sendArrowShot = useCallback((score: number, dist: number) => {
    const currentRoom = roomRef.current;
    if (!currentRoom) {
      return;
    }
    publishJson("/app/archery/arrowShot", { roomId: currentRoom.id, score, dist });
  }, [publishJson]);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    room,
    myId: clientToken,
    mySlot,
    error,
    lastEvent,
    createRoom,
    joinRoom,
    setReady,
    hostStart,
    sendArrowShot,
    clearError,
  };
}
