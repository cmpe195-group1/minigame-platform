import type { BroadcastGameState, GameSettings, PendingActionSubmission } from "../types"

export type RoomTransport = "websocket"
export type RoomStatus = "waiting" | "playing" | "finished"

export interface RoomParticipant {
  playerId: string
  name: string
  clientId: string
}

export interface RoomState {
  roomCode: string
  hostClientId: string | null
  maxPlayers: number
  participants: RoomParticipant[]
  status: RoomStatus
  transport: RoomTransport
  settings: GameSettings
  gameState: BroadcastGameState | null
  pendingAction: PendingActionSubmission | null
  systemMessage: string | null
}

