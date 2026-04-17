import type { BroadcastGameState, GameSettings } from "../types"

export type RoomTransport = "websocket"
export type RoomStatus = "waiting" | "playing" | "finished"

export interface RoomParticipant {
  playerId: string
  name: string
  clientId: string
}

export interface PendingAnswerSubmission {
  submissionId: number
  playerId: string
  answer: string | null
  timedOut: boolean
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
  pendingAnswer: PendingAnswerSubmission | null
  systemMessage: string | null
}

