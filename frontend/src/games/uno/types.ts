export type Phase = "setup" | "handoff" | "playing" | "finished"
export type SetupMode = "local" | "host" | "join"
export type PlayMode = "local" | "host" | "guest"
export type HandoffStage = "pass" | "reveal"
export type Direction = 1 | -1
export type UnoColor = "red" | "yellow" | "green" | "blue" | "wild"
export type PlayableColor = Exclude<UnoColor, "wild">
export type UnoCardKind = "number" | "skip" | "reverse" | "drawTwo" | "wild" | "wildDrawFour"
export type AwaitingEndTurnReason = "drawBlocked" | "noDraw" | "timeout" | null
export type PendingActionKind = "drawCard" | "playCard" | "endTurn"

export interface UnoCard {
  id: string
  color: UnoColor
  kind: UnoCardKind
  value: number | null
}

export interface PlayerState {
  id: string
  name: string
  hand: UnoCard[]
}

export interface PendingTurnState {
  currentPlayerIndex: number
  direction: Direction
  activeColor: PlayableColor
  message: string
}

export interface LobbyPlayer {
  id: string
  name: string
}

export interface GameSettings {
  turnSeconds: number
  startingHandSize: number
}

export interface BroadcastGameState {
  phase: Exclude<Phase, "setup">
  players: PlayerState[]
  drawPile: UnoCard[]
  discardPile: UnoCard[]
  currentPlayerIndex: number
  direction: Direction
  activeColor: PlayableColor
  secondsLeft: number
  hasDrawnThisTurn: boolean
  drawnCardId: string | null
  awaitingEndTurnReason: AwaitingEndTurnReason
  pendingTurnState: PendingTurnState | null
  turnMessage: string
  winnerId: string | null
  settings: GameSettings
}

export interface PendingActionSubmission {
  actionId: number
  playerId: string
  kind: PendingActionKind
  cardId: string | null
  chosenColor: PlayableColor | null
}

export const HOST_PLAYER_ID = "host-player"

export const TURN_SECONDS = 30
export const STARTING_HAND_SIZE = 7
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6

export const DEFAULT_SETTINGS: GameSettings = {
  turnSeconds: TURN_SECONDS,
  startingHandSize: STARTING_HAND_SIZE,
}

