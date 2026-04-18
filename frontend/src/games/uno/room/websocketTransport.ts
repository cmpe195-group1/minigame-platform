import { useState, useEffect, useCallback, useRef } from "react"
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"
import type { BroadcastGameState, GameSettings, PendingActionKind, PlayableColor } from "../types"
import type { RoomState } from "./RoomTypes"
import { BACKEND_URL } from "../../../backend"

export type WSRole = "none" | "host" | "guest"

interface ServerMessage {
  type: "ROOM_STATE" | "JOIN_ERROR" | "ERROR"
  roomState?: RoomState | null
  error?: string | null
}

export interface UseWebSocketTransportReturn {
  isConnected: boolean
  myClientId: string | null
  joinError: string | null
  roomState: RoomState | null
  role: WSRole
  createRoom: (hostName: string, maxPlayers: number) => void
  joinRoom: (code: string, name: string) => void
  leaveRoom: () => void
  updateSettings: (settings: GameSettings) => void
  publishState: (gameState: BroadcastGameState) => void
  submitAction: (kind: PendingActionKind, cardId?: string | null, chosenColor?: PlayableColor | null) => void
}

function getClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function parseMessage(message: IMessage): ServerMessage | null {
  try {
    return JSON.parse(message.body) as ServerMessage
  } catch {
    return null
  }
}

export function useWebSocketTransport(): UseWebSocketTransportReturn {
  const clientTokenRef = useRef<string>(getClientToken())
  const clientRef = useRef<Client | null>(null)
  const clientToken = clientTokenRef.current

  const [role, setRole] = useState<WSRole>("none")
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myClientId, setMyClientId] = useState<string | null>(clientToken)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const roomStateRef = useRef<RoomState | null>(null)
  const clientSubscriptionRef = useRef<StompSubscription | null>(null)
  const roomSubscriptionRef = useRef<StompSubscription | null>(null)
  const roomDestinationRef = useRef<string | null>(null)

  const resolveBrokerUrl = useCallback(() => {
    const base = BACKEND_URL.replace(/\/+$/, "")
    return `${base.replace(/^http/, "ws")}/ws`
  }, [])

  useEffect(() => {
    roomStateRef.current = roomState
  }, [roomState])

  const subscribeToRoom = useCallback((roomCode: string) => {
    const client = clientRef.current

    if (!client?.connected) {
      return
    }

    const destination = `/topic/uno/room/${roomCode}`

    if (roomDestinationRef.current === destination) {
      return
    }

    roomSubscriptionRef.current?.unsubscribe()
    roomDestinationRef.current = destination
    roomSubscriptionRef.current = client.subscribe(destination, (message) => {
      const parsed = parseMessage(message)

      if (parsed?.type === "ROOM_STATE" && parsed.roomState) {
        setJoinError(null)
        setRoomState(parsed.roomState)
      }
    })
  }, [])

  useEffect(() => {
    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    })

    clientRef.current = client

    client.onConnect = () => {
      setIsConnected(true)
      setMyClientId(clientToken)

      clientSubscriptionRef.current?.unsubscribe()
      clientSubscriptionRef.current = client.subscribe(`/topic/uno/client/${clientToken}`, (message) => {
        const parsed = parseMessage(message)

        if (!parsed) {
          return
        }

        if (parsed.type === "JOIN_ERROR" || parsed.type === "ERROR") {
          setJoinError(parsed.error ?? "Unable to join UNO room.")
          if (parsed.type === "JOIN_ERROR") {
            setRole("none")
          }
          return
        }

        if (parsed.type === "ROOM_STATE" && parsed.roomState) {
          setJoinError(null)
          setRoomState(parsed.roomState)
          subscribeToRoom(parsed.roomState.roomCode)
        }
      })

      const current = roomStateRef.current
      if (current?.roomCode) {
        subscribeToRoom(current.roomCode)
      }
    }

    client.onDisconnect = () => {
      setIsConnected(false)
      if (!roomStateRef.current) {
        setJoinError("Lost connection to the UNO server. Check that the Spring backend is still running.")
      }
    }

    client.onStompError = (frame) => {
      setJoinError(frame.headers["message"] ?? "UNO server rejected the connection.")
    }

    client.onWebSocketError = () => {
      setJoinError(`Unable to connect to the UNO server at ${resolveBrokerUrl()}`)
    }

    client.activate()

    return () => {
      clientSubscriptionRef.current?.unsubscribe()
      roomSubscriptionRef.current?.unsubscribe()
      clientSubscriptionRef.current = null
      roomSubscriptionRef.current = null
      roomDestinationRef.current = null
      setIsConnected(false)
      void client.deactivate()
      clientRef.current = null
    }
  }, [clientToken, resolveBrokerUrl, subscribeToRoom])

  const publishJson = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current

    if (!client) {
      setJoinError("UNO connection has not been initialized yet.")
      return
    }

    if (client.connected) {
      client.publish({
        destination,
        body: JSON.stringify(body),
      })
      return
    }

    setJoinError("Still connecting to the UNO server. Try again in a moment.")
  }, [])

  const createRoom = useCallback(
    (hostName: string, maxPlayers: number) => {
      setJoinError(null)
      setRole("host")
      publishJson("/app/uno/create", { hostName, maxPlayers, clientToken })
    },
    [clientToken, publishJson],
  )

  const joinRoom = useCallback(
    (code: string, name: string) => {
      setJoinError(null)
      setRole("guest")
      publishJson("/app/uno/join", {
        roomCode: code.trim().toUpperCase(),
        playerName: name,
        clientToken,
      })
    },
    [clientToken, publishJson],
  )

  const leaveRoom = useCallback(() => {
    const current = roomStateRef.current

    if (current?.roomCode) {
      publishJson("/app/uno/leave", { roomCode: current.roomCode })
    }

    setRoomState(null)
    setRole("none")
    setJoinError(null)
    roomSubscriptionRef.current?.unsubscribe()
    roomSubscriptionRef.current = null
    roomDestinationRef.current = null
  }, [publishJson])

  const updateSettings = useCallback(
    (settings: GameSettings) => {
      const current = roomStateRef.current
      if (!current) {
        return
      }

      publishJson("/app/uno/settings", {
        roomCode: current.roomCode,
        settings,
      })
    },
    [publishJson],
  )

  const publishState = useCallback(
    (gameState: BroadcastGameState) => {
      const current = roomStateRef.current
      if (!current) {
        return
      }

      publishJson("/app/uno/state", {
        roomCode: current.roomCode,
        gameState,
      })
    },
    [publishJson],
  )

  const submitAction = useCallback(
    (kind: PendingActionKind, cardId?: string | null, chosenColor?: PlayableColor | null) => {
      const current = roomStateRef.current
      if (!current) {
        return
      }

      publishJson("/app/uno/action", {
        roomCode: current.roomCode,
        kind,
        cardId: cardId ?? null,
        chosenColor: chosenColor ?? null,
      })
    },
    [publishJson],
  )

  return {
    isConnected,
    myClientId,
    joinError,
    roomState,
    role,
    createRoom,
    joinRoom,
    leaveRoom,
    updateSettings,
    publishState,
    submitAction,
  }
}

