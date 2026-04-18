import type { BroadcastGameState, RoundSettings } from "../types"

export type RoomTransport = "websocket"
export type RoomStatus = "waiting" | "playing" | "finished"
export type PendingActionType = "submit_word" | "end_turn"

export interface RoomParticipant {
  playerId: string
  name: string
  clientId: string
}

export interface PendingActionSubmission {
  submissionId: number
  playerId: string
  actionType: PendingActionType
  word: string | null
}

export interface RoomState {
  roomCode: string
  hostClientId: string | null
  maxPlayers: number
  participants: RoomParticipant[]
  status: RoomStatus
  transport: RoomTransport
  settings: RoundSettings
  gameState: BroadcastGameState | null
  pendingAction: PendingActionSubmission | null
  systemMessage: string | null
}

