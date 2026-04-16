import { useCallback, useEffect, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { RoomState } from "../transport/types";
import { BACKEND_URL } from "../config";
import type { RoomTransportConfig } from "../config";

export type WSRole = "none" | "host" | "guest";

interface ServerMessage {
  type: "ROOM_STATE" | "JOIN_ERROR";
  roomState?: RoomState<unknown>;
  error?: string | null;
}

/*
This shared hook should own:
- STOMP client creation
- connection lifecycle
- reconnect handling
- `/topic/{gameKey}/client/{clientToken}` subscription
- `/topic/{gameKey}/room/{roomCode}` subscription
- `createRoom`
- `joinRoom`
- `leaveRoom`
- `startGame`
- generic `sendAction()`

It should accept a config object like:

```ts
{
  gameKey: string;
  createDestination: string;
  joinDestination: string;
  leaveDestination: string;
  startDestination?: string;
  extraDestinations?: Record<string, string>;
}
*/

/*
export interface UseWebSocketTransportReturn {
  isConnected: boolean;
  myClientId: string | null;
  joinError: string | null;
  roomState: RoomState<unknown> | null;
  role: WSRole;
  createRoom: (hostName: string) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  //generalize sendMove
  sendAction: (moveData: unknown, resultingState: unknown) => void;
  //sendMove: (from: Position, to: Position, resultingState: RoomState<unknown>) => void;
  resetGame: () => void;
}
*/
export interface UseStompRoomTransportReturn {
    isConnected: boolean;
    myClientId: string | null;
    joinError: string | null;
    roomState: RoomState<unknown> | null;
    role: WSRole;
    createRoom: (hostName: string) => void;
    joinRoom: (code: string, name: string) => void;
    leaveRoom: () => void;
    startGame: () => void;
    sendAction: (moveData: unknown, resultingState: unknown) => void;
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

// Make implementation general for any game, using the config object for destinations and topic subscriptions. The logic would be similar to the existing useWebSocketTransport, but driven by the provided config values.
export function useWebSocketTransport(config: RoomTransportConfig): UseStompRoomTransportReturn {
    //rewrite function to be generalized and use config values for destinations and topic subscriptions, instead of hardcoded checkers-specific ones. The returned object shape remains the same, but the internal logic is driven by the provided config.
  
    const [clientToken] = useState(getClientToken);
    const clientRef = useRef<Client | null>(null);
    
    const [role, setRole] = useState<WSRole>("none");
    const [roomState, setRoomState] = useState<RoomState<unknown> | null>(null);
    const [myClientId, setMyClientId] = useState<string | null>(clientToken);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const roomStateRef = useRef<RoomState<unknown> | null>(null);
    const clientSubscriptionRef = useRef<StompSubscription | null>(null);
    const roomSubscriptionRef = useRef<StompSubscription | null>(null);
    const roomDestinationRef = useRef<string | null>(null);

    const resolveBrokerUrl = useCallback(() => {
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
        
        const destination = `/topic/${config.gameKey}/room/${roomCode}`;
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
    }, [config.gameKey]);

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
                `/topic/${config.gameKey}/client/${clientToken}`,
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
                setJoinError("Lost connection to the server.");
            }   
        };

        client.onStompError = (frame) => {
            setJoinError(frame.headers["message"] ?? "Server rejected the connection.");
        };
        client.onWebSocketError = () => {
            setJoinError("Unable to connect to the server at " + resolveBrokerUrl());
        }
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
        }
    }, [clientToken, resolveBrokerUrl, subscribeToRoom, config.gameKey]);

    const publishJson = useCallback((destination: string, body: unknown) => {   
        const client = clientRef.current;
        if (!client) {
            setJoinError("Connection has not been initialized yet.");
            return;
        }
        if (!client.connected) {
            setJoinError("Still connecting to the server. Try again in a moment.");
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
        publishJson(config.createDestination, { hostName, clientToken });
    }, [clientToken, publishJson, config.createDestination]);

    const joinRoom = useCallback((code: string, name: string) => {
        setJoinError(null);
        setRole("guest");
        publishJson(config.joinDestination, {
            roomCode: code.trim().toUpperCase(),
            playerName: name,
            clientToken,
        });
    }, [clientToken, publishJson, config.joinDestination]);

    const leaveRoom = useCallback(() => {
        const current = roomStateRef.current;
        if (current?.roomCode) {
            publishJson(config.leaveDestination, { roomCode: current.roomCode });
        }   
        setRoomState(null);
        setRole("none");
        setJoinError(null);
        roomSubscriptionRef.current?.unsubscribe();
        roomSubscriptionRef.current = null;
        roomDestinationRef.current = null;
    }, [publishJson, config.leaveDestination]);

    const startGame = useCallback(() => {
        const current = roomStateRef.current;
        if (!current || !config.startDestination) {
            return;
        }
        publishJson(config.startDestination, { roomCode: current.roomCode });
    }, [publishJson, config.startDestination]); 

    const sendAction = useCallback((moveData: unknown, resultingState: unknown) => {
        const current = roomStateRef.current;
        if (!current) {
            return;
        }
        publishJson(`/app/${config.gameKey}/move`, {
            roomCode: current.roomCode,
            moveData,
            resultingState,
        });
    }, [publishJson, config.gameKey]);

    const resetGame = useCallback(() => {
        const current = roomStateRef.current;
        if (!current) {
            return;
        }
        publishJson(`/app/${config.gameKey}/reset`, { roomCode: current.roomCode });
    }, [publishJson, config.gameKey]);

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
        sendAction,
        resetGame,
    } as UseStompRoomTransportReturn;
}
    /*
  const [clientToken] = useState(getClientToken);
  const clientRef = useRef<Client | null>(null);

  const [role, setRole] = useState<WSRole>("none");
  const [roomState, setRoomState] = useState<RoomState<unknown> | null>(null);
  const [myClientId, setMyClientId] = useState<string | null>(clientToken);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const roomStateRef = useRef<RoomState<unknown> | null>(null);
  const clientSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomSubscriptionRef = useRef<StompSubscription | null>(null);
  const roomDestinationRef = useRef<string | null>(null);

  const resolveBrokerUrl = useCallback(() => {
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
                `/topic/${config.gameKey}/client/${clientToken}`,
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
                setJoinError("Lost connection to the server.");
            }
        };

        client.onStompError = (frame) => {
            setJoinError(frame.headers["message"] ?? "Server rejected the connection.");
        };

        client.onWebSocketError = () => {
            setJoinError("Unable to connect to the server at " + resolveBrokerUrl());
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
    }, [clientToken, resolveBrokerUrl, subscribeToRoom, config.gameKey]);

    const publishJson = useCallback((destination: string, body: unknown) => {
        const client = clientRef.current;
        if (!client) {
            setJoinError("Connection has not been initialized yet.");
            return;
        }

        if (!client.connected) {
            setJoinError("Still connecting to the server. Try again in a moment.");
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
        publishJson(config.createDestination, { hostName, clientToken });
    }, [clientToken, publishJson, config.createDestination]);

    const joinRoom = useCallback((code: string, name: string) => {
        setJoinError(null);
        setRole("guest");
        publishJson(config.joinDestination, {
            roomCode: code.trim().toUpperCase(),
            playerName: name,
            clientToken,
        });
    }, [clientToken, publishJson, config.joinDestination]);

    const leaveRoom = useCallback(() => {
        const current = roomStateRef.current;
        if (current?.roomCode) {
            publishJson(config.leaveDestination, { roomCode: current.roomCode });
        }

        setRoomState(null);
        setRole("none");
        setJoinError(null);
        roomSubscriptionRef.current?.unsubscribe();
        roomSubscriptionRef.current = null;
        roomDestinationRef.current = null;
    }, [publishJson, config.leaveDestination]);

    const startGame = useCallback(() => {
        const current = roomStateRef.current;
        if (!current || !config.startDestination) {
            return;
        }
        publishJson(config.startDestination, { roomCode: current.roomCode });
    }, [publishJson, config.startDestination]);

    const sendAction = useCallback((moveData: unknown, resultingState: unknown) => {
        const current = roomStateRef.current;
        if (!current) {
            return;
        }

        publishJson(`/app/${config.gameKey}/move`, {
            roomCode: current.roomCode,
            moveData,
            resultingState,
        });
    }, [publishJson, config.gameKey]);

    const resetGame = useCallback(() => {
        const current = roomStateRef.current;
        if (!current) {
            return;
        }
        publishJson(`/app/${config.gameKey}/reset`, { roomCode: current.roomCode });
    }, [publishJson, config.gameKey]);

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
        sendAction,
        resetGame,
    } as UseStompRoomTransportReturn;
}
*/
