import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"

type Phase = "setup" | "loading" | "question" | "reveal" | "results"
type SetupMode = "local" | "host" | "join"
type PlayMode = "local" | "host" | "guest"

type NetworkMessage =
  | {
      type: "join-request"
      playerName: string
    }
  | {
      type: "submit-answer"
      answer: string | null
      timedOut: boolean
    }
  | {
      type: "lobby-sync"
      players: LobbyPlayer[]
      settings: GameSettings
      yourPlayerId: string
      hostName: string
    }
  | {
      type: "state-sync"
      state: BroadcastGameState
      yourPlayerId: string
    }
  | {
      type: "system"
      message: string
    }

interface TriviaCategory {
  id: number
  name: string
}

interface GameSettings {
  category: string
  difficulty: string
  type: string
  questionsPerPlayer: number
  autoContinueAfterReveal: boolean
}

interface PlayerRecord {
  id: string
  name: string
  score: number
  answered: number
}

interface LobbyPlayer {
  id: string
  name: string
}

interface ActiveQuestion {
  category: string
  difficulty: string
  type: string
  prompt: string
  correctAnswer: string
  answers: string[]
}

interface RevealState {
  selectedAnswer: string | null
  correct: boolean
  timedOut: boolean
}

interface BroadcastGameState {
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

interface OpenTdbQuestion {
  category: string
  type: string
  difficulty: string
  question: string
  correct_answer: string
  incorrect_answers: string[]
}

interface OpenTdbQuestionResponse {
  response_code: number
  results: OpenTdbQuestion[]
}

interface OpenTdbCategoryResponse {
  trivia_categories: TriviaCategory[]
}

interface HostConnectionRecord {
  playerId: string
  playerName: string
  peer: RTCPeerConnection
  channel: RTCDataChannel
}

interface PendingInvite {
  playerId: string
  peer: RTCPeerConnection
  channel: RTCDataChannel
}

interface GuestConnectionRecord {
  peer: RTCPeerConnection
  channel: RTCDataChannel | null
}

const TURN_SECONDS = 30
const API_COOLDOWN_MS = 5000
const REVEAL_AUTO_CONTINUE_MS = 10000
const MIN_PLAYERS = 2
const MAX_PLAYERS = 6
const HOST_PLAYER_ID = "host-player"
const DEFAULT_SETTINGS: GameSettings = {
  category: "",
  difficulty: "",
  type: "",
  questionsPerPlayer: 5,
  autoContinueAfterReveal: false,
}

function decodeHtml(value: string) {
  const textarea = document.createElement("textarea")
  textarea.innerHTML = value
  return textarea.value
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items]

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]]
  }

  return cloned
}

function formatDifficulty(value: string) {
  if (!value) {
    return "Any"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildQuestionUrl(settings: GameSettings) {
  const params = new URLSearchParams({ amount: "1" })

  if (settings.category) {
    params.set("category", settings.category)
  }

  if (settings.difficulty) {
    params.set("difficulty", settings.difficulty)
  }

  if (settings.type) {
    params.set("type", settings.type)
  }

  return `https://opentdb.com/api.php?${params.toString()}`
}

function getPlacementLabel(position: number) {
  if (position === 1) return "1st"
  if (position === 2) return "2nd"
  if (position === 3) return "3rd"
  return `${position}th`
}

function createPeerId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function encodeSignalPayload(description: RTCSessionDescriptionInit) {
  return btoa(JSON.stringify(description))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function decodeSignalPayload(payload: string) {
  const normalized = payload.trim().replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return JSON.parse(atob(`${normalized}${padding}`)) as RTCSessionDescriptionInit
}

function waitForIceGatheringComplete(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (peer.iceGatheringState === "complete") {
        peer.removeEventListener("icegatheringstatechange", handleStateChange)
        resolve()
      }
    }

    peer.addEventListener("icegatheringstatechange", handleStateChange)
  })
}

function sendChannelMessage(channel: RTCDataChannel, message: NetworkMessage) {
  if (channel.readyState !== "open") {
    return
  }

  channel.send(JSON.stringify(message))
}

export default function Trivia() {
  const [setupMode, setSetupMode] = useState<SetupMode>("local")
  const [playMode, setPlayMode] = useState<PlayMode>("local")
  const [phase, setPhase] = useState<Phase>("setup")
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""])
  const [hostName, setHostName] = useState("")
  const [joinName, setJoinName] = useState("")
  const [joinHostCode, setJoinHostCode] = useState("")
  const [joinResponseCode, setJoinResponseCode] = useState("")
  const [hostInviteCode, setHostInviteCode] = useState("")
  const [hostAnswerCode, setHostAnswerCode] = useState("")
  const [hostStatus, setHostStatus] = useState("")
  const [joinStatus, setJoinStatus] = useState("")
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [categories, setCategories] = useState<TriviaCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState("")
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [revealState, setRevealState] = useState<RevealState | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS)
  const [setupError, setSetupError] = useState("")
  const [gameError, setGameError] = useState("")
  const [answerLocked, setAnswerLocked] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [cooldownRequestKind, setCooldownRequestKind] = useState<"categories" | "question" | null>(null)
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0)
  const [autoContinueRemainingMs, setAutoContinueRemainingMs] = useState(0)
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)

  const requestIdRef = useRef(0)
  const lastApiCallAtRef = useRef(0)
  const cooldownWaitIdRef = useRef(0)
  const pendingInviteRef = useRef<PendingInvite | null>(null)
  const hostConnectionsRef = useRef<Map<string, HostConnectionRecord>>(new Map())
  const guestConnectionRef = useRef<GuestConnectionRecord | null>(null)
  const submitAnswerRef = useRef<(selectedAnswer: string | null, timedOut?: boolean) => void>(() => undefined)
  const hostNameRef = useRef(hostName)
  const joinNameRef = useRef(joinName)
  const settingsRef = useRef(settings)
  const phaseRef = useRef(phase)
  const currentTurnRef = useRef(currentTurn)
  const playersRef = useRef(players)
  const playModeRef = useRef(playMode)
  const answerLockedRef = useRef(answerLocked)
  const localPlayerIdRef = useRef(localPlayerId)

  const totalTurns = players.length * settings.questionsPerPlayer
  const activePlayerIndex = players.length ? currentTurn % players.length : 0
  const activePlayer = players[activePlayerIndex] ?? null
  const currentPlayerQuestionNumber = activePlayer ? activePlayer.answered + 1 : 1
  const overallQuestionNumber = Math.min(currentTurn + 1, Math.max(totalTurns, 1))

  const leaderboard = useMemo(
    () =>
      [...players].sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        if (left.answered !== right.answered) {
          return left.answered - right.answered
        }

        return left.name.localeCompare(right.name)
      }),
    [players],
  )

  const winners = useMemo(() => {
    if (!leaderboard.length) {
      return []
    }

    const topScore = leaderboard[0].score
    return leaderboard.filter((player) => player.score === topScore)
  }, [leaderboard])

  useEffect(() => {
    hostNameRef.current = hostName
    joinNameRef.current = joinName
    settingsRef.current = settings
    phaseRef.current = phase
    currentTurnRef.current = currentTurn
    playersRef.current = players
    playModeRef.current = playMode
    answerLockedRef.current = answerLocked
    localPlayerIdRef.current = localPlayerId
  }, [hostName, joinName, settings, phase, currentTurn, players, playMode, answerLocked, localPlayerId])

  const closePendingInvite = useCallback(() => {
    const pendingInvite = pendingInviteRef.current

    if (!pendingInvite) {
      return
    }

    try {
      pendingInvite.channel.close()
    } catch {
      // no-op
    }

    try {
      pendingInvite.peer.close()
    } catch {
      // no-op
    }

    pendingInviteRef.current = null
  }, [])

  const closeAllConnections = useCallback(() => {
    closePendingInvite()

    hostConnectionsRef.current.forEach((connection) => {
      try {
        connection.channel.close()
      } catch {
        // no-op
      }

      try {
        connection.peer.close()
      } catch {
        // no-op
      }
    })

    hostConnectionsRef.current.clear()

    if (guestConnectionRef.current) {
      try {
        guestConnectionRef.current.channel?.close()
      } catch {
        // no-op
      }

      try {
        guestConnectionRef.current.peer.close()
      } catch {
        // no-op
      }

      guestConnectionRef.current = null
    }
  }, [closePendingInvite])

  useEffect(() => {
    return () => closeAllConnections()
  }, [closeAllConnections])

  const syncHostLobbyPlayers = useCallback(() => {
    const hostPlayer: LobbyPlayer = {
      id: HOST_PLAYER_ID,
      name: hostNameRef.current.trim() || "Host",
    }

    const remotePlayers = [...hostConnectionsRef.current.values()]
      .filter((connection) => connection.playerName.trim())
      .map((connection) => ({
        id: connection.playerId,
        name: connection.playerName,
      }))

    const nextLobbyPlayers = [hostPlayer, ...remotePlayers]
    setLobbyPlayers(nextLobbyPlayers)
    return nextLobbyPlayers
  }, [])

  const broadcastLobbySync = useCallback(
    (explicitPlayers?: LobbyPlayer[]) => {
      const playersToShare = explicitPlayers ?? syncHostLobbyPlayers()

      hostConnectionsRef.current.forEach((connection) => {
        sendChannelMessage(connection.channel, {
          type: "lobby-sync",
          players: playersToShare,
          settings: settingsRef.current,
          yourPlayerId: connection.playerId,
          hostName: hostNameRef.current.trim() || "Host",
        })
      })
    },
    [syncHostLobbyPlayers],
  )

  const removeHostConnection = useCallback(
    (playerId: string, statusMessage?: string) => {
      const existingConnection = hostConnectionsRef.current.get(playerId)

      if (existingConnection) {
        try {
          existingConnection.channel.close()
        } catch {
          // no-op
        }

        try {
          existingConnection.peer.close()
        } catch {
          // no-op
        }

        hostConnectionsRef.current.delete(playerId)
      }

      if (pendingInviteRef.current?.playerId === playerId) {
        closePendingInvite()
      }

      const nextLobbyPlayers = syncHostLobbyPlayers()
      broadcastLobbySync(nextLobbyPlayers)

      if (statusMessage) {
        setHostStatus(statusMessage)
      }
    },
    [broadcastLobbySync, closePendingInvite, syncHostLobbyPlayers],
  )

  const submitAnswer = useCallback(
    (selectedAnswer: string | null, timedOut = false) => {
      if (phase !== "question" || !activeQuestion || !activePlayer || answerLocked) {
        return
      }

      setAnswerLocked(true)

      const correct = !timedOut && selectedAnswer === activeQuestion.correctAnswer

      setPlayers((currentPlayers) =>
        currentPlayers.map((player, index) =>
          index === activePlayerIndex
            ? {
                ...player,
                answered: player.answered + 1,
                score: player.score + (correct ? 1 : 0),
              }
            : player,
        ),
      )

      setRevealState({ selectedAnswer, correct, timedOut })
      setPhase("reveal")
    },
    [phase, activeQuestion, activePlayer, answerLocked, activePlayerIndex],
  )

  useEffect(() => {
    submitAnswerRef.current = submitAnswer
  }, [submitAnswer])

  const handleHostNetworkMessage = useCallback(
    (playerId: string, rawMessage: string) => {
      let message: NetworkMessage

      try {
        message = JSON.parse(rawMessage) as NetworkMessage
      } catch {
        return
      }

      if (message.type === "join-request") {
        const existingConnection = hostConnectionsRef.current.get(playerId)

        if (!existingConnection) {
          return
        }

        existingConnection.playerName = message.playerName.trim() || "Guest"
        const nextLobbyPlayers = syncHostLobbyPlayers()
        broadcastLobbySync(nextLobbyPlayers)
        setHostStatus(`${existingConnection.playerName} joined the lobby.`)
        return
      }

      if (message.type === "submit-answer") {
        const currentPlayers = playersRef.current
        const activeIndex = currentPlayers.length ? currentTurnRef.current % currentPlayers.length : 0
        const currentActivePlayer = currentPlayers[activeIndex] ?? null

        if (
          playModeRef.current !== "host" ||
          phaseRef.current !== "question" ||
          answerLockedRef.current ||
          !currentActivePlayer ||
          currentActivePlayer.id !== playerId
        ) {
          return
        }

        submitAnswerRef.current(message.answer, message.timedOut)
      }
    },
    [broadcastLobbySync, syncHostLobbyPlayers],
  )

  const handleGuestNetworkMessage = useCallback((rawMessage: string) => {
    let message: NetworkMessage

    try {
      message = JSON.parse(rawMessage) as NetworkMessage
    } catch {
      return
    }

    if (message.type === "lobby-sync") {
      setSetupMode("join")
      setPlayMode("guest")
      setSettings(message.settings)
      setLobbyPlayers(message.players)
      setLocalPlayerId(message.yourPlayerId)
      setJoinStatus(`Connected to ${message.hostName}'s lobby. Waiting for the host to start.`)
      return
    }

    if (message.type === "state-sync") {
      const nextState = message.state
      const nextActivePlayer = nextState.players.length
        ? nextState.players[nextState.currentTurn % nextState.players.length]
        : null

      setPlayMode("guest")
      setLocalPlayerId(message.yourPlayerId)
      setPlayers(nextState.players)
      setLobbyPlayers(nextState.players.map((player) => ({ id: player.id, name: player.name })))
      setPhase(nextState.phase)
      setCurrentTurn(nextState.currentTurn)
      setActiveQuestion(nextState.activeQuestion)
      setRevealState(nextState.revealState)
      setSecondsLeft(nextState.secondsLeft)
      setSettings(nextState.settings)
      setGameError(nextState.gameError)
      setAutoContinueRemainingMs(nextState.autoContinueRemainingMs)

      if (
        nextState.phase !== "question" ||
        nextActivePlayer?.id !== message.yourPlayerId ||
        nextState.currentTurn !== currentTurnRef.current
      ) {
        setAnswerLocked(false)
      }

      if (nextState.phase === "results") {
        setJoinStatus("Match complete.")
      } else if (nextState.phase === "reveal") {
        setJoinStatus("Answer revealed.")
      } else if (nextState.phase === "question") {
        setJoinStatus(
          nextActivePlayer?.id === message.yourPlayerId
            ? "It is your turn to answer."
            : `Waiting for ${nextActivePlayer?.name ?? "the next player"}.`,
        )
      } else {
        setJoinStatus("Connected to the live match.")
      }
      return
    }

    if (message.type === "system") {
      setJoinStatus(message.message)
    }
  }, [])

  const attachHostConnectionEvents = useCallback(
    (playerId: string, peer: RTCPeerConnection, channel: RTCDataChannel) => {
      channel.onopen = () => {
        pendingInviteRef.current = null
        hostConnectionsRef.current.set(playerId, {
          playerId,
          playerName: "",
          peer,
          channel,
        })
        setHostInviteCode("")
        setHostAnswerCode("")
        setHostStatus("A guest connected. Waiting for their player name...")
      }

      channel.onmessage = (event) => {
        handleHostNetworkMessage(playerId, String(event.data))
      }

      channel.onclose = () => {
        if (hostConnectionsRef.current.has(playerId)) {
          removeHostConnection(playerId, "A guest disconnected from the lobby.")
        }
      }

      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
          if (hostConnectionsRef.current.has(playerId)) {
            removeHostConnection(playerId, "A guest disconnected from the lobby.")
            return
          }

          if (pendingInviteRef.current?.playerId === playerId) {
            closePendingInvite()
            setHostInviteCode("")
            setHostAnswerCode("")
            setHostStatus("The pending invite disconnected before it completed.")
          }
        }
      }
    },
    [closePendingInvite, handleHostNetworkMessage, removeHostConnection],
  )

  const waitForApiCooldown = useCallback(
    async (kind: "categories" | "question", signal: AbortSignal) => {
      const earliestNextCallAt = lastApiCallAtRef.current + API_COOLDOWN_MS
      const remainingMs = Math.max(earliestNextCallAt - Date.now(), 0)

      if (remainingMs <= 0) {
        return true
      }

      const waitId = cooldownWaitIdRef.current + 1
      cooldownWaitIdRef.current = waitId
      setCooldownRequestKind(kind)
      setCooldownRemainingSeconds(Math.ceil(remainingMs / 1000))

      return await new Promise<boolean>((resolve) => {
        let completed = false

        const finish = (result: boolean) => {
          if (completed) {
            return
          }

          completed = true
          window.clearTimeout(timeoutId)
          window.clearInterval(intervalId)
          signal.removeEventListener("abort", handleAbort)

          if (cooldownWaitIdRef.current === waitId) {
            setCooldownRequestKind(null)
            setCooldownRemainingSeconds(0)
          }

          resolve(result)
        }

        const syncCountdown = () => {
          const nextRemainingMs = Math.max(earliestNextCallAt - Date.now(), 0)

          if (cooldownWaitIdRef.current === waitId) {
            setCooldownRemainingSeconds(Math.ceil(nextRemainingMs / 1000))
          }

          if (nextRemainingMs <= 0) {
            finish(true)
          }
        }

        const handleAbort = () => finish(false)
        const timeoutId = window.setTimeout(() => finish(true), remainingMs)
        const intervalId = window.setInterval(syncCountdown, 250)

        signal.addEventListener("abort", handleAbort, { once: true })
        syncCountdown()
      })
    },
    [],
  )

  const loadCategories = useCallback(
    async (signal: AbortSignal) => {
      setCategoriesLoading(true)
      setCategoriesError("")

      try {
        const canRequest = await waitForApiCooldown("categories", signal)

        if (!canRequest || signal.aborted) {
          return
        }

        lastApiCallAtRef.current = Date.now()
        const response = await fetch("https://opentdb.com/api_category.php", {
          signal,
        })

        if (!response.ok) {
          setCategories([])
          setCategoriesError(`Could not load categories (${response.status}). You can still play using Any Category.`)
          return
        }

        const data = (await response.json()) as OpenTdbCategoryResponse
        setCategories(data.trivia_categories ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setCategories([])
        setCategoriesError("Could not load categories. You can still play using Any Category.")
      } finally {
        if (!signal.aborted) {
          setCategoriesLoading(false)
        }
      }
    },
    [waitForApiCooldown],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadCategories(controller.signal)
    return () => controller.abort()
  }, [loadCategories])

  useEffect(() => {
    if (phase !== "loading" || players.length === 0 || currentTurn >= totalTurns || playMode === "guest") {
      return
    }

    const controller = new AbortController()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setGameError("")
    setRevealState(null)
    setActiveQuestion(null)
    setAnswerLocked(false)

    const loadQuestion = async () => {
      try {
        const canRequest = await waitForApiCooldown("question", controller.signal)

        if (!canRequest || controller.signal.aborted) {
          return
        }

        lastApiCallAtRef.current = Date.now()
        const response = await fetch(buildQuestionUrl(settings), {
          signal: controller.signal,
        })

        if (!response.ok) {
          setGameError(`Question request failed (${response.status})`)
          return
        }

        const data = (await response.json()) as OpenTdbQuestionResponse

        if (data.response_code !== 0 || !data.results?.length) {
          setGameError("No trivia questions matched the selected settings.")
          return
        }

        const [question] = data.results
        const correctAnswer = decodeHtml(question.correct_answer)
        const answers = shuffleArray([
          correctAnswer,
          ...question.incorrect_answers.map((answer) => decodeHtml(answer)),
        ])

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return
        }

        setActiveQuestion({
          category: decodeHtml(question.category),
          difficulty: question.difficulty,
          type: question.type,
          prompt: decodeHtml(question.question),
          correctAnswer,
          answers,
        })
        setSecondsLeft(TURN_SECONDS)
        setPhase("question")
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the next question."

        setGameError(message)
      }
    }

    void loadQuestion()

    return () => controller.abort()
  }, [phase, currentTurn, totalTurns, players.length, settings, loadAttempt, playMode, waitForApiCooldown])

  const resetNetworkState = useCallback(
    (nextMode?: SetupMode) => {
      closeAllConnections()
      setPlayMode(nextMode === "join" ? "guest" : "local")
      setLocalPlayerId(null)
      setLobbyPlayers([])
      setHostInviteCode("")
      setHostAnswerCode("")
      setHostStatus("")
      setJoinHostCode("")
      setJoinResponseCode("")
      setJoinStatus("")
    },
    [closeAllConnections],
  )

  const resetMatch = useCallback(() => {
    requestIdRef.current += 1
    resetNetworkState(setupMode)
    setPhase("setup")
    setPlayers([])
    setCurrentTurn(0)
    setActiveQuestion(null)
    setRevealState(null)
    setSecondsLeft(TURN_SECONDS)
    setSetupError("")
    setGameError("")
    setAnswerLocked(false)
    setLoadAttempt(0)
    setAutoContinueRemainingMs(0)
  }, [resetNetworkState, setupMode])

  const startLocalMatch = () => {
    const trimmedNames = playerNames.map((name) => name.trim())

    if (trimmedNames.some((name) => !name)) {
      setSetupError("Please enter a name for every player before starting.")
      return
    }

    const uniqueNames = new Set(trimmedNames.map((name) => name.toLowerCase()))

    if (uniqueNames.size !== trimmedNames.length) {
      setSetupError("Each player needs a unique name so the scoreboard stays clear.")
      return
    }

    if (settings.questionsPerPlayer < 1) {
      setSetupError("Each player needs at least one question.")
      return
    }

    setSetupError("")
    setPlayMode("local")
    setLocalPlayerId(null)
    setPlayers(
      trimmedNames.map((name, index) => ({
        id: `local-${index + 1}`,
        name,
        score: 0,
        answered: 0,
      })),
    )
    setCurrentTurn(0)
    setActiveQuestion(null)
    setRevealState(null)
    setSecondsLeft(TURN_SECONDS)
    setGameError("")
    setAnswerLocked(false)
    setLoadAttempt(0)
    setPhase("loading")
  }

  const startHostedMatch = () => {
    const trimmedHostName = hostName.trim()

    if (!trimmedHostName) {
      setSetupError("Enter your host player name before starting the hosted match.")
      return
    }

    if (lobbyPlayers.length < 2) {
      setSetupError("At least one guest must join the lobby before the hosted match can start.")
      return
    }

    setSetupError("")
    setPlayMode("host")
    setLocalPlayerId(HOST_PLAYER_ID)
    const nextPlayers = lobbyPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      score: 0,
      answered: 0,
    }))
    setPlayers(nextPlayers)
    setCurrentTurn(0)
    setActiveQuestion(null)
    setRevealState(null)
    setSecondsLeft(TURN_SECONDS)
    setGameError("")
    setAnswerLocked(false)
    setLoadAttempt(0)
    setPhase("loading")
    setHostStatus("Hosted match started.")
  }

  const continueAfterReveal = useCallback(() => {
    const nextTurn = currentTurn + 1

    setRevealState(null)
    setActiveQuestion(null)
    setAnswerLocked(false)
    setGameError("")
    setAutoContinueRemainingMs(0)

    if (nextTurn >= totalTurns) {
      setCurrentTurn(nextTurn)
      setPhase("results")
      return
    }

    setCurrentTurn(nextTurn)
    setPhase("loading")
  }, [currentTurn, totalTurns])

  useEffect(() => {
    if (phase !== "question" || answerLocked || playMode === "guest") {
      return
    }

    if (secondsLeft <= 0) {
      submitAnswer(null, true)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [phase, secondsLeft, answerLocked, playMode, submitAnswer])

  useEffect(() => {
    if (phase !== "reveal" || !settings.autoContinueAfterReveal || playMode === "guest") {
      if (playMode !== "guest") {
        setAutoContinueRemainingMs(0)
      }
      return
    }

    const startedAt = Date.now()
    setAutoContinueRemainingMs(REVEAL_AUTO_CONTINUE_MS)

    const intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt
      const remainingMs = Math.max(REVEAL_AUTO_CONTINUE_MS - elapsedMs, 0)
      setAutoContinueRemainingMs(remainingMs)
    }, 100)

    const timeoutId = window.setTimeout(() => {
      setAutoContinueRemainingMs(0)
      continueAfterReveal()
    }, REVEAL_AUTO_CONTINUE_MS)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
      setAutoContinueRemainingMs(0)
    }
  }, [phase, settings.autoContinueAfterReveal, playMode, continueAfterReveal])

  useEffect(() => {
    if (setupMode === "host" && phase === "setup") {
      const nextLobbyPlayers = syncHostLobbyPlayers()
      broadcastLobbySync(nextLobbyPlayers)
    }
  }, [setupMode, phase, hostName, settings, syncHostLobbyPlayers, broadcastLobbySync])

  useEffect(() => {
    if (playMode !== "host" || phase === "setup" || players.length === 0) {
      return
    }

    const snapshot: BroadcastGameState = {
      phase,
      players,
      currentTurn,
      activeQuestion,
      revealState,
      secondsLeft,
      settings,
      gameError,
      autoContinueRemainingMs,
    }

    hostConnectionsRef.current.forEach((connection) => {
      sendChannelMessage(connection.channel, {
        type: "state-sync",
        state: snapshot,
        yourPlayerId: connection.playerId,
      })
    })
  }, [playMode, phase, players, currentTurn, activeQuestion, revealState, secondsLeft, settings, gameError, autoContinueRemainingMs])

  const handleNameChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const nextNames = [...playerNames]
    nextNames[index] = event.target.value
    setPlayerNames(nextNames)
  }

  const addPlayer = () => {
    if (playerNames.length >= MAX_PLAYERS) {
      return
    }

    setPlayerNames((currentNames) => [...currentNames, ""])
  }

  const removePlayer = (index: number) => {
    if (playerNames.length <= MIN_PLAYERS) {
      return
    }

    setPlayerNames((currentNames) => currentNames.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleSetupModeChange = (nextMode: SetupMode) => {
    if (nextMode === setupMode) {
      return
    }

    resetNetworkState(nextMode)
    setSetupMode(nextMode)
    setPhase("setup")
    setPlayers([])
    setCurrentTurn(0)
    setActiveQuestion(null)
    setRevealState(null)
    setSetupError("")
    setGameError("")
    setAnswerLocked(false)
    setAutoContinueRemainingMs(0)
  }

  const createHostInvite = async () => {
    const trimmedHostName = hostName.trim()

    if (!trimmedHostName) {
      setSetupError("Enter your host player name before creating an invite code.")
      return
    }

    setSetupError("")
    closePendingInvite()

    try {
      const playerId = createPeerId("guest")
      const peer = new RTCPeerConnection({ iceServers: [] })
      const channel = peer.createDataChannel("trivia")

      attachHostConnectionEvents(playerId, peer, channel)

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      await waitForIceGatheringComplete(peer)

      pendingInviteRef.current = {
        playerId,
        peer,
        channel,
      }
      setHostInviteCode(encodeSignalPayload(peer.localDescription ?? offer))
      setHostStatus("Invite code ready. Share it with a guest, then paste their response code below.")
    } catch {
      closePendingInvite()
      setSetupError("Could not create a host invite code in this browser.")
    }
  }

  const applyGuestResponseCode = async () => {
    const pendingInvite = pendingInviteRef.current
    const candidateCode = hostAnswerCode.trim() || window.prompt("Paste the guest response code:", "")?.trim() || ""

    if (!pendingInvite) {
      setSetupError("Generate a host invite code before applying a guest response.")
      return
    }

    if (!candidateCode) {
      return
    }

    try {
      await pendingInvite.peer.setRemoteDescription(decodeSignalPayload(candidateCode))
      setHostAnswerCode("")
      setHostInviteCode("")
      setHostStatus("Guest response accepted. Finalizing the peer connection...")
      setSetupError("")
    } catch {
      setSetupError("That guest response code could not be read. Double-check and try again.")
    }
  }

  const promptForHostCode = () => {
    const input = window.prompt("Paste the room code to join this trivia game:", joinHostCode)

    if (input === null) {
      return
    }

    setJoinHostCode(input.trim())
    setJoinStatus(input.trim() ? "Room code added. Generate your response code next." : "")
    setSetupError("")
  }

  const generateJoinResponse = async () => {
    const trimmedJoinName = joinName.trim()

    if (!trimmedJoinName) {
      setSetupError("Enter your player name before joining a hosted match.")
      return
    }

    if (!joinHostCode.trim()) {
      setSetupError("Use the room code prompt first so this device knows which lobby to join.")
      return
    }

    setSetupError("")

    if (guestConnectionRef.current) {
      closeAllConnections()
      guestConnectionRef.current = null
    }

    try {
      const peer = new RTCPeerConnection({ iceServers: [] })
      guestConnectionRef.current = {
        peer,
        channel: null,
      }

      peer.ondatachannel = (event) => {
        const channel = event.channel
        guestConnectionRef.current = {
          peer,
          channel,
        }

        channel.onopen = () => {
          setJoinStatus("Connected to the host. Joining the lobby...")
          sendChannelMessage(channel, {
            type: "join-request",
            playerName: joinNameRef.current.trim() || "Guest",
          })
        }

        channel.onmessage = (messageEvent) => {
          handleGuestNetworkMessage(String(messageEvent.data))
        }

        channel.onclose = () => {
          setJoinStatus("The host connection closed.")
        }
      }

      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
          setJoinStatus("The host connection closed.")
        }
      }

      await peer.setRemoteDescription(decodeSignalPayload(joinHostCode))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      await waitForIceGatheringComplete(peer)

      setJoinResponseCode(encodeSignalPayload(peer.localDescription ?? answer))
      setJoinStatus("Response code ready. Send it back to the host and wait for them to start the game.")
    } catch {
      setSetupError("That room code could not be used. Double-check it and try again.")
    }
  }

  const handleAnswerChoice = (answer: string) => {
    if (!activePlayer) {
      return
    }

    if (playMode === "guest") {
      const guestChannel = guestConnectionRef.current?.channel

      if (!guestChannel || guestChannel.readyState !== "open" || activePlayer.id !== localPlayerId) {
        return
      }

      sendChannelMessage(guestChannel, {
        type: "submit-answer",
        answer,
        timedOut: false,
      })
      setAnswerLocked(true)
      return
    }

    if (playMode === "host" && activePlayer.id !== localPlayerId) {
      return
    }

    submitAnswer(answer)
  }

  const progressPercent = totalTurns > 0 ? (currentTurn / totalTurns) * 100 : 0
  const isQuestionCooldown = phase === "loading" && cooldownRequestKind === "question" && cooldownRemainingSeconds > 0
  const isCategoryCooldown = categoriesLoading && cooldownRequestKind === "categories" && cooldownRemainingSeconds > 0
  const autoContinueProgressPercent =
    REVEAL_AUTO_CONTINUE_MS > 0
      ? ((REVEAL_AUTO_CONTINUE_MS - autoContinueRemainingMs) / REVEAL_AUTO_CONTINUE_MS) * 100
      : 0
  const autoContinueRemainingSeconds = Math.ceil(autoContinueRemainingMs / 1000)
  const canLocalAnswer =
    phase === "question" && !answerLocked && (playMode === "local" || activePlayer?.id === localPlayerId)
  const modeCards = [
    {
      id: "local" as const,
      title: "Local Multiplayer",
      description: "Take turns on the same device with a game-show scoreboard.",
    },
    {
      id: "host" as const,
      title: "Host a Game",
      description: "Create a cross-device lobby and invite players with a room code.",
    },
    {
      id: "join" as const,
      title: "Join a Game",
      description: "Paste a room code, return your response code, and play from another device.",
    },
  ]

  return (
    <div className="space-y-8 text-white">
      <section className="rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.5em] text-cyan-300">Trivia Showdown</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Quiz Night</h1>
            <p className="mt-4 max-w-3xl text-base text-blue-100/85 md:text-lg">
              Build your own game-show table, host a no-server lobby across devices, or join a
              match with a manual room code exchange.
            </p>
          </div>

          <div className="grid min-w-[260px] gap-4 rounded-[1.5rem] border border-cyan-300/20 bg-white/8 p-5 backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Format</p>
              <p className="mt-2 text-lg font-semibold">
                {settings.questionsPerPlayer} questions per player
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Timer</p>
              <p className="mt-2 text-lg font-semibold">30 seconds per turn</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Connection</p>
              <p className="mt-2 text-lg font-semibold">
                {setupMode === "local" ? "Same device" : "WebRTC manual code exchange"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {phase === "setup" && (
        <section className="rounded-[2rem] border border-blue-300/20 bg-blue-950/70 p-6 shadow-xl shadow-black/25 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Choose mode</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {modeCards.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSetupModeChange(mode.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  setupMode === mode.id
                    ? "border-cyan-300 bg-cyan-400/10 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/5 hover:border-cyan-300/40 hover:bg-white/8"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Mode</p>
                <h2 className="mt-2 text-2xl font-bold">{mode.title}</h2>
                <p className="mt-3 text-sm text-blue-100/80">{mode.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {players.length > 0 && phase !== "setup" && (
        <section className="rounded-[2rem] border border-blue-300/20 bg-blue-950/70 p-6 shadow-xl shadow-black/25 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Scoreboard</p>
              <h2 className="mt-2 text-2xl font-bold">Game-show standings</h2>
            </div>

            <div className="min-w-[220px]">
              <div className="mb-2 flex items-center justify-between text-sm text-blue-100/80">
                <span>Match progress</span>
                <span>
                  {Math.min(currentTurn, totalTurns)} / {totalTurns}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-yellow-300 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player, index) => {
              const isActive =
                index === activePlayerIndex &&
                (phase === "question" || phase === "loading" || phase === "reveal")
              const remainingTurns = settings.questionsPerPlayer - player.answered

              return (
                <div
                  key={player.id}
                  className={`rounded-[1.5rem] border p-5 transition-all ${
                    isActive
                      ? "border-cyan-300 bg-cyan-400/10 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
                        {isActive ? "On deck" : "Contestant"}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">{player.name}</h3>
                    </div>
                    <div className="rounded-full bg-yellow-300 px-4 py-2 text-lg font-black text-blue-950">
                      {player.score}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-blue-100/80">
                    <div className="rounded-2xl bg-blue-900/60 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Answered</p>
                      <p className="mt-2 text-xl font-semibold text-white">{player.answered}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-900/60 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Remaining</p>
                      <p className="mt-2 text-xl font-semibold text-white">{remainingTurns}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {phase === "setup" && setupMode === "local" && (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Step 1</p>
                <h2 className="mt-2 text-3xl font-bold">Name your contestants</h2>
              </div>

              <button
                type="button"
                onClick={addPlayer}
                disabled={playerNames.length >= MAX_PLAYERS}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add player
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {playerNames.map((name, index) => (
                <div
                  key={`player-${index}`}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                      Player {index + 1}
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      disabled={playerNames.length <= MIN_PLAYERS}
                      className="text-sm font-medium text-red-200 transition hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    value={name}
                    onChange={(event) => handleNameChange(index, event)}
                    placeholder={`Enter player ${index + 1} name`}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Step 2</p>
            <h2 className="mt-2 text-3xl font-bold">Set the round rules</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Questions per player
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.questionsPerPlayer}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      questionsPerPlayer: Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Category
                </label>
                <select
                  value={settings.category}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      category: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-blue-100/70">
                  <span>
                    {categoriesLoading ? "Loading categories..." : `${categories.length} categories ready`}
                  </span>
                  {categoriesError && (
                    <button
                      type="button"
                      onClick={() => {
                        const controller = new AbortController()
                        void loadCategories(controller.signal)
                      }}
                      disabled={categoriesLoading}
                      className="font-semibold text-cyan-200 transition hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCategoryCooldown ? `Waiting ${cooldownRemainingSeconds}s` : "Retry categories"}
                    </button>
                  )}
                </div>
                {categoriesError && <p className="mt-2 text-sm text-amber-200">{categoriesError}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Difficulty
                </label>
                <select
                  value={settings.difficulty}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      difficulty: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Question type
                </label>
                <select
                  value={settings.type}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      type: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Type</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="boolean">True / False</option>
                </select>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    type="checkbox"
                    checked={settings.autoContinueAfterReveal}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        autoContinueAfterReveal: event.target.checked,
                      }))
                    }
                    className="mt-1 h-5 w-5 rounded border-white/20 bg-blue-900 text-cyan-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                      Auto continue after reveal
                    </span>
                    <span className="mt-2 block text-sm text-blue-100/80">
                      Automatically move to the next player or question after 10 seconds.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {setupError && (
              <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {setupError}
              </div>
            )}

            <button
              type="button"
              onClick={startLocalMatch}
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30"
            >
              Start showdown
            </button>
          </div>
        </section>
      )}

      {phase === "setup" && setupMode === "host" && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Host lobby</p>
            <h2 className="mt-2 text-3xl font-bold">Host a game</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Host player name
                </label>
                <input
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  placeholder="Enter your name as the host"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Connected players</p>
                    <p className="mt-2 text-blue-100/75">
                      Share a room code, then paste each guest's response code to add them.
                    </p>
                  </div>
                  <div className="rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-blue-950">
                    {lobbyPlayers.length}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {lobbyPlayers.length === 0 ? (
                    <p className="rounded-2xl bg-blue-900/60 px-4 py-3 text-blue-100/80">No lobby players yet.</p>
                  ) : (
                    lobbyPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded-2xl bg-blue-900/60 px-4 py-3"
                      >
                        <span>
                          {index + 1}. {player.name}
                        </span>
                        <span className="text-xs uppercase tracking-[0.25em] text-cyan-100">
                          {player.id === HOST_PLAYER_ID ? "Host" : "Guest"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={createHostInvite}
                  className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 transition hover:bg-cyan-300"
                >
                  Generate room code
                </button>

                {hostInviteCode && (
                  <textarea
                    readOnly
                    value={hostInviteCode}
                    className="min-h-36 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-sm text-blue-50 outline-none"
                  />
                )}

                <textarea
                  value={hostAnswerCode}
                  onChange={(event) => setHostAnswerCode(event.target.value)}
                  placeholder="Paste a guest response code here"
                  className="min-h-28 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-sm text-white outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />

                <button
                  type="button"
                  onClick={applyGuestResponseCode}
                  className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Apply guest response code
                </button>
              </div>

              {hostStatus && (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                  {hostStatus}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Round setup</p>
            <h2 className="mt-2 text-3xl font-bold">Configure the hosted match</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Questions per player
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.questionsPerPlayer}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      questionsPerPlayer: Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Category
                </label>
                <select
                  value={settings.category}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      category: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Difficulty
                </label>
                <select
                  value={settings.difficulty}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      difficulty: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Question type
                </label>
                <select
                  value={settings.type}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      type: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                >
                  <option value="">Any Type</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="boolean">True / False</option>
                </select>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    type="checkbox"
                    checked={settings.autoContinueAfterReveal}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        autoContinueAfterReveal: event.target.checked,
                      }))
                    }
                    className="mt-1 h-5 w-5 rounded border-white/20 bg-blue-900 text-cyan-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                      Auto continue after reveal
                    </span>
                    <span className="mt-2 block text-sm text-blue-100/80">
                      Automatically move to the next player or question after 10 seconds.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {setupError && (
              <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {setupError}
              </div>
            )}

            <button
              type="button"
              onClick={startHostedMatch}
              disabled={lobbyPlayers.length < 2}
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start hosted game
            </button>
          </div>
        </section>
      )}

      {phase === "setup" && setupMode === "join" && (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Join flow</p>
            <h2 className="mt-2 text-3xl font-bold">Join a hosted game</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Player name
                </label>
                <input
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder="Enter your player name"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <button
                type="button"
                onClick={promptForHostCode}
                className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 transition hover:bg-cyan-300"
              >
                {joinHostCode ? "Change room code" : "Enter room code"}
              </button>

              {joinHostCode && (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                  Room code captured. Generate your response code to continue.
                </div>
              )}

              <button
                type="button"
                onClick={generateJoinResponse}
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Generate response code
              </button>

              {joinResponseCode && (
                <textarea
                  readOnly
                  value={joinResponseCode}
                  className="min-h-40 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-sm text-blue-50 outline-none"
                />
              )}

              {joinStatus && (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                  {joinStatus}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Lobby preview</p>
            <h2 className="mt-2 text-3xl font-bold">Connected lobby</h2>

            <div className="mt-6 space-y-4">
              {lobbyPlayers.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-blue-100/80">
                  Paste a room code, generate your response code, and wait for the host to confirm.
                </p>
              ) : (
                lobbyPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-2xl bg-blue-900/60 px-4 py-3"
                  >
                    <span>
                      {index + 1}. {player.name}
                    </span>
                    <span className="text-xs uppercase tracking-[0.25em] text-cyan-100">
                      {player.id === HOST_PLAYER_ID ? "Host" : "Player"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Host settings</p>
              <div className="mt-4 space-y-3 text-blue-100/85">
                <div className="flex items-center justify-between gap-4">
                  <span>Category</span>
                  <span className="font-semibold text-white">
                    {settings.category
                      ? categories.find((category) => String(category.id) === settings.category)?.name ??
                        "Custom category"
                      : "Any Category"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Difficulty</span>
                  <span className="font-semibold text-white">{formatDifficulty(settings.difficulty)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Question type</span>
                  <span className="font-semibold text-white">
                    {settings.type === "multiple"
                      ? "Multiple Choice"
                      : settings.type === "boolean"
                        ? "True / False"
                        : "Any Type"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Auto continue</span>
                  <span className="font-semibold text-white">
                    {settings.autoContinueAfterReveal ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>

            {setupError && (
              <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {setupError}
              </div>
            )}
          </div>
        </section>
      )}

      {(phase === "loading" || phase === "question" || phase === "reveal") && activePlayer && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-cyan-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Now playing</p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">{activePlayer.name}</h2>
                <p className="mt-3 text-blue-100/80">
                  Question {currentPlayerQuestionNumber} of {settings.questionsPerPlayer} for this player
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-yellow-300/40 bg-yellow-300/10 px-5 py-4 text-center shadow-lg shadow-yellow-300/10">
                <p className="text-xs uppercase tracking-[0.35em] text-yellow-200">Countdown</p>
                <p className={`mt-2 text-4xl font-black ${secondsLeft <= 10 ? "text-red-300" : "text-yellow-200"}`}>
                  {phase === "question" ? secondsLeft : TURN_SECONDS}
                </p>
              </div>
            </div>

            {phase === "loading" && (
              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center">
                {gameError ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] text-red-200">Question unavailable</p>
                    <h3 className="mt-3 text-2xl font-bold">We couldn't load the next question.</h3>
                    <p className="mt-3 text-blue-100/75">{gameError}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      {(playMode === "host" || playMode === "local") && (
                        <button
                          type="button"
                          onClick={() => setLoadAttempt((currentAttempt) => currentAttempt + 1)}
                          className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 transition hover:bg-cyan-300"
                        >
                          Retry question
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={resetMatch}
                        className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                      >
                        Back to setup
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200/30 border-t-cyan-200" />
                    </div>
                    <p className="mt-5 text-sm uppercase tracking-[0.3em] text-cyan-200">
                      {activePlayer.name}, get ready
                    </p>
                    <h3 className="mt-3 text-3xl font-black">Loading the next challenge...</h3>
                    <p className="mt-3 text-blue-100/75">
                      {isQuestionCooldown
                        ? `Too fast! The next trivia question for ${activePlayer.name} will be requested in ${cooldownRemainingSeconds} second${cooldownRemainingSeconds === 1 ? "" : "s"}.`
                        : playMode === "guest"
                          ? `Waiting for the host to send the next question for ${activePlayer.name}.`
                          : `Pulling a fresh question from Trivia Database for ${activePlayer.name}.`}
                    </p>
                    <div className="mx-auto mt-8 h-3 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-yellow-300" />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeQuestion && (phase === "question" || phase === "reveal") && (
              <>
                <div className="mt-8 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-cyan-400/15 px-4 py-2 text-cyan-100">
                    {activeQuestion.category}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100">
                    {formatDifficulty(activeQuestion.difficulty)}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100">
                    {activeQuestion.type === "boolean" ? "True / False" : "Multiple Choice"}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100">
                    Match question {overallQuestionNumber} / {totalTurns}
                  </span>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-6 shadow-inner shadow-black/10 md:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Question</p>
                  <h3 className="mt-4 text-2xl font-bold leading-relaxed md:text-3xl">
                    {activeQuestion.prompt}
                  </h3>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {activeQuestion.answers.map((answer) => {
                    const isCorrectAnswer = answer === activeQuestion.correctAnswer
                    const isSelectedAnswer = revealState?.selectedAnswer === answer

                    const revealClasses =
                      phase === "reveal"
                        ? isCorrectAnswer
                          ? "border-green-300 bg-green-500/15 text-green-50"
                          : isSelectedAnswer
                            ? "border-red-300 bg-red-500/15 text-red-50"
                            : "border-white/10 bg-white/5 text-blue-100/80"
                        : canLocalAnswer
                          ? "border-blue-300/20 bg-blue-900/70 text-white hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-blue-800"
                          : "border-white/10 bg-white/5 text-blue-100/70"

                    return (
                      <button
                        key={answer}
                        type="button"
                        onClick={() => handleAnswerChoice(answer)}
                        disabled={!canLocalAnswer}
                        className={`min-h-24 rounded-[1.5rem] border px-5 py-4 text-left text-lg font-semibold shadow-lg shadow-black/10 transition ${revealClasses} disabled:cursor-default`}
                      >
                        {answer}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Host notes</p>
            <h2 className="mt-2 text-3xl font-bold">Round control</h2>

            {phase === "question" && (
              <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Live turn</p>
                <p className="mt-3 text-lg text-white/90">
                  {canLocalAnswer
                    ? `${activePlayer.name}, choose an answer before the countdown hits zero.`
                    : playMode === "guest"
                      ? `Waiting for ${activePlayer.name}'s answer to be sent from their device.`
                      : `${activePlayer.name} is answering from another device.`}
                </p>
              </div>
            )}

            {phase === "reveal" && revealState && activeQuestion && (
              <div
                className={`mt-6 rounded-[1.5rem] border p-5 ${
                  revealState.correct
                    ? "border-green-300/30 bg-green-500/10"
                    : "border-red-300/30 bg-red-500/10"
                }`}
              >
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Reveal</p>
                <h3 className="mt-3 text-3xl font-black">
                  {revealState.correct
                    ? "Correct!"
                    : revealState.timedOut
                      ? "Time's up!"
                      : "Incorrect!"}
                </h3>
                <p className="mt-4 text-blue-50/90">
                  {revealState.timedOut
                    ? `${activePlayer.name} ran out of time.`
                    : revealState.selectedAnswer
                      ? `${activePlayer.name} chose: ${revealState.selectedAnswer}`
                      : `${activePlayer.name} did not submit an answer.`}
                </p>
                <p className="mt-2 text-lg font-semibold text-green-100">
                  Correct answer: {activeQuestion.correctAnswer}
                </p>

                {playMode !== "guest" && (
                  <button
                    type="button"
                    onClick={continueAfterReveal}
                    className="mt-6 w-full rounded-full bg-gradient-to-r from-cyan-400 to-yellow-300 px-5 py-3 text-lg font-black uppercase tracking-[0.2em] text-blue-950 transition hover:-translate-y-0.5"
                  >
                    {currentTurn + 1 >= totalTurns ? "Show leaderboard" : "Next player"}
                  </button>
                )}

                {settings.autoContinueAfterReveal && autoContinueRemainingMs > 0 && (
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/8 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                      <p className="text-sm text-cyan-50">
                        Auto continuing in {autoContinueRemainingSeconds} second{autoContinueRemainingSeconds === 1 ? "" : "s"}.
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-yellow-300 transition-all duration-100"
                        style={{ width: `${Math.min(Math.max(autoContinueProgressPercent, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === "loading" && !gameError && (
              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/80">
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Turn order</p>
                <ol className="mt-4 space-y-3">
                  {players.map((player, index) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between rounded-2xl bg-blue-900/60 px-4 py-3"
                    >
                      <span>
                        {index + 1}. {player.name}
                      </span>
                      <span className="text-sm text-blue-200/80">
                        {player.answered}/{settings.questionsPerPlayer}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Round settings</p>
              <div className="mt-4 space-y-3 text-blue-100/85">
                <div className="flex items-center justify-between gap-4">
                  <span>Category</span>
                  <span className="font-semibold text-white">
                    {settings.category
                      ? categories.find((category) => String(category.id) === settings.category)?.name ??
                        "Custom category"
                      : "Any Category"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Difficulty</span>
                  <span className="font-semibold text-white">{formatDifficulty(settings.difficulty)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Question type</span>
                  <span className="font-semibold text-white">
                    {settings.type === "multiple"
                      ? "Multiple Choice"
                      : settings.type === "boolean"
                        ? "True / False"
                        : "Any Type"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Mode</span>
                  <span className="font-semibold text-white">
                    {playMode === "local"
                      ? "Local"
                      : playMode === "host"
                        ? "Hosted"
                        : "Joined remotely"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "results" && (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-yellow-300/25 bg-gradient-to-br from-blue-950 via-indigo-950 to-blue-900 p-6 shadow-2xl shadow-black/30 md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-200">Final results</p>
            <h2 className="mt-3 text-4xl font-black">Leaderboard</h2>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/6 p-6">
              <h3 className="text-2xl font-bold text-white">
                {winners.length === 1
                  ? `${winners[0].name} wins the showdown!`
                  : `${winners.map((winner) => winner.name).join(" & ")} tie for the win!`}
              </h3>
              <p className="mt-3 text-blue-100/80">
                Highest score takes the crown. Each contestant answered {settings.questionsPerPlayer}{" "}
                questions this match.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {leaderboard.map((player, index) => {
                const accuracy = player.answered > 0 ? Math.round((player.score / player.answered) * 100) : 0

                return (
                  <div
                    key={player.id}
                    className={`rounded-[1.5rem] border p-5 ${
                      index === 0
                        ? "border-yellow-300/40 bg-yellow-300/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">
                          {getPlacementLabel(index + 1)} place
                        </p>
                        <h3 className="mt-2 text-2xl font-bold">{player.name}</h3>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl bg-blue-900/65 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Score</p>
                          <p className="mt-2 text-2xl font-black text-white">{player.score}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-900/65 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Answered</p>
                          <p className="mt-2 text-2xl font-black text-white">{player.answered}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-900/65 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Accuracy</p>
                          <p className="mt-2 text-2xl font-black text-white">{accuracy}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Replay</p>
            <h2 className="mt-2 text-3xl font-bold">Ready for another round?</h2>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p>
                Play again to return to setup with the same selected trivia settings and prepare a
                fresh current-match leaderboard.
              </p>
            </div>

            <button
              type="button"
              onClick={resetMatch}
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30"
            >
              Play again
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
