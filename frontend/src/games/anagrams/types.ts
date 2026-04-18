export type Phase = "setup" | "playing" | "results"

export interface RoundSettings {
  letterCount: number
  minimumWordLength: number
  turnSeconds: number
}

export interface SubmittedWord {
  value: string
  points: number
}

export interface PlayerRecord {
  id: string
  name: string
  score: number
  words: SubmittedWord[]
  attempts: number
}

export interface LobbyPlayer {
  id: string
  name: string
}

export type SubmissionStatus = "accepted" | "rejected"

export interface BroadcastGameState {
  phase: Phase
  players: PlayerRecord[]
  sharedLetters: string[]
  currentTurn: number
  secondsLeft: number
  settings: RoundSettings
  turnMessage: string
  lastSubmissionStatus: SubmissionStatus | null
}

export const HOST_PLAYER_ID = "host-player"
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6

export const DEFAULT_SETTINGS: RoundSettings = {
  letterCount: 8,
  minimumWordLength: 3,
  turnSeconds: 45,
}

