import { useWebSocketTransport } from "./websocketTransport"
import type { RoomState } from "./RoomTypes"
import type { BroadcastGameState, GameSettings } from "../types"

export type RoomRole = "none" | "host" | "guest"

export interface UseRoomGameReturn {
  transport: "websocket"
  role: RoomRole
  roomState: RoomState | null
  myClientId: string | null
  isHost: boolean
  joinError: string | null
  isConnected: boolean
  createRoom: (hostName: string, maxPlayers: number) => void
  joinRoom: (code: string, name: string) => void
  leaveRoom: () => void
  updateSettings: (settings: GameSettings) => void
  publishState: (gameState: BroadcastGameState) => void
  submitAnswer: (answer: string | null, timedOut: boolean) => void
}

export function useRoomGame(): UseRoomGameReturn {
  const ws = useWebSocketTransport()

  return {
    transport: "websocket",
    role: ws.role as RoomRole,
    roomState: ws.roomState,
    myClientId: ws.myClientId,
    isHost: ws.role === "host",
    joinError: ws.joinError,
    isConnected: ws.isConnected,
    createRoom: ws.createRoom,
    joinRoom: ws.joinRoom,
    leaveRoom: ws.leaveRoom,
    updateSettings: ws.updateSettings,
    publishState: ws.publishState,
    submitAnswer: ws.submitAnswer,
  }
}

