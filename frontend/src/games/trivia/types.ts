export type Phase = "setup" | "loading" | "question" | "reveal" | "results"

export interface TriviaCategory {
  id: number
  name: string
}

export interface GameSettings {
  category: string
  difficulty: string
  type: string
  questionsPerPlayer: number
  autoContinueAfterReveal: boolean
}

export interface PlayerRecord {
  id: string
  name: string
  score: number
  answered: number
}

export interface LobbyPlayer {
  id: string
  name: string
}

export interface ActiveQuestion {
  category: string
  difficulty: string
  type: string
  prompt: string
  correctAnswer: string
  answers: string[]
}

export interface RevealState {
  selectedAnswer: string | null
  correct: boolean
  timedOut: boolean
}

export interface BroadcastGameState {
  phase: Phase
  players: PlayerRecord[]
  currentTurn: number
  activeQuestion: ActiveQuestion | null
  revealState: RevealState | null
  secondsLeft: number
  settings: GameSettings
  gameError: string
  autoContinueRemainingMs: number
}

export interface OpenTdbQuestion {
  category: string
  type: string
  difficulty: string
  question: string
  correct_answer: string
  incorrect_answers: string[]
}

export interface OpenTdbQuestionResponse {
  response_code: number
  results: OpenTdbQuestion[]
}

export interface OpenTdbCategoryResponse {
  trivia_categories: TriviaCategory[]
}

export const HOST_PLAYER_ID = "host-player"

export const DEFAULT_SETTINGS: GameSettings = {
  category: "",
  difficulty: "",
  type: "",
  questionsPerPlayer: 5,
  autoContinueAfterReveal: false,
}

