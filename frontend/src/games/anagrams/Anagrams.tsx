import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"

// @ts-expect-error word-exists does not have bundled types
import wordExists from "word-exists"
import { useRoomGame } from "./room/useRoomGame"
import type { RoomState as AnagramsRoomState } from "./room/RoomTypes"
import {
  DEFAULT_SETTINGS,
  HOST_PLAYER_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type BroadcastGameState,
  type LobbyPlayer,
  type Phase,
  type PlayerRecord,
  type RoundSettings,
  type SubmissionStatus,
  type SubmittedWord,
} from "./types"

type SetupMode = "local" | "host" | "join"
type PlayMode = "local" | "host" | "guest"

const VOWEL_BAG = "AAAAAAAAEEEEEEEEIIIIIIIOOOOOOUUUUY"
const CONSONANT_BAG = "BBBBCCDDDFFGGHHJKLLLMMMNNNNNPPQRRRRRSSSSTTTTTTVVWWXZZ"

function shuffleArray<T>(items: T[]) {
  const clone = [...items]

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]]
  }

  return clone
}

function createPlayerId(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `player-${index + 1}-${crypto.randomUUID()}`
  }

  return `player-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getPlacementLabel(position: number) {
  if (position === 1) return "1st"
  if (position === 2) return "2nd"
  if (position === 3) return "3rd"
  return `${position}th`
}

function areSettingsEqual(left: RoundSettings, right: RoundSettings) {
  return (
    left.letterCount === right.letterCount &&
    left.minimumWordLength === right.minimumWordLength &&
    left.turnSeconds === right.turnSeconds
  )
}

function normalizeWord(value: string) {
  return value.trim().toLowerCase()
}

function isAlphabeticWord(value: string) {
  return /^[a-z]+$/.test(value)
}

function countLetters(value: string | string[]) {
  const source = Array.isArray(value) ? value.join("") : value
  const counts = new Map<string, number>()

  for (const letter of source) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1)
  }

  return counts
}

function canSpellFromPool(word: string, pool: string[]) {
  const poolCounts = countLetters(pool)

  for (const letter of word) {
    const available = poolCounts.get(letter) ?? 0

    if (available <= 0) {
      return false
    }

    poolCounts.set(letter, available - 1)
  }

  return true
}

function scoreWord(length: number) {
  let score = length

  if (length >= 5) score += 2
  if (length >= 7) score += 3
  if (length >= 9) score += 5

  return score
}

function generateLetterPool(letterCount: number) {
  const minimumVowels = Math.max(2, Math.min(Math.floor(letterCount / 2), Math.round(letterCount * 0.38)))
  const vowels = Array.from({ length: minimumVowels }, () => {
    const index = Math.floor(Math.random() * VOWEL_BAG.length)
    return VOWEL_BAG[index].toLowerCase()
  })
  const consonants = Array.from({ length: letterCount - minimumVowels }, () => {
    const index = Math.floor(Math.random() * CONSONANT_BAG.length)
    return CONSONANT_BAG[index].toLowerCase()
  })

  return shuffleArray([...vowels, ...consonants])
}

function formatLetters(letters: string[]) {
  return letters.join(" ").toUpperCase()
}

function getBestWord(words: SubmittedWord[]) {
  if (!words.length) {
    return "—"
  }

  return [...words].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points
    }

    if (right.value.length !== left.value.length) {
      return right.value.length - left.value.length
    }

    return left.value.localeCompare(right.value)
  })[0].value.toUpperCase()
}

function validateRoundSettings(settings: RoundSettings) {
  if (settings.letterCount < 5 || settings.letterCount > 12) {
    return "Choose between 5 and 12 available letters for the round."
  }

  if (settings.minimumWordLength < 3 || settings.minimumWordLength > settings.letterCount) {
    return "Minimum word length must be at least 3 and no more than the letter count."
  }

  if (settings.turnSeconds < 15 || settings.turnSeconds > 180) {
    return "Choose a turn timer between 15 and 180 seconds."
  }

  return ""
}

function validateSubmittedWord(
  rawValue: string,
  player: PlayerRecord,
  settings: RoundSettings,
  sharedLetters: string[],
) {
  const normalizedWord = normalizeWord(rawValue)

  if (!normalizedWord) {
    return { normalizedWord, error: "Type a word before you submit." }
  }

  if (!isAlphabeticWord(normalizedWord)) {
    return { normalizedWord, error: "Only letters A–Z are allowed in submitted words." }
  }

  if (normalizedWord.length < settings.minimumWordLength) {
    return {
      normalizedWord,
      error: `Words must be at least ${settings.minimumWordLength} letters long.`,
    }
  }

  if (!canSpellFromPool(normalizedWord, sharedLetters)) {
    return {
      normalizedWord,
      error: "That word uses letters that are not available in the shared pool.",
    }
  }

  if (player.words.some((word) => word.value === normalizedWord)) {
    return {
      normalizedWord,
      error: "You already banked that word this turn. Try a different one.",
    }
  }

  const exists = (() => {
    try {
      return Boolean(wordExists(normalizedWord))
    } catch {
      return false
    }
  })()

  if (!exists) {
    return { normalizedWord, error: "That word is not in the dictionary." }
  }

  return { normalizedWord, error: "" }
}

export default function Anagrams() {
  const room = useRoomGame()

  const [phase, setPhase] = useState<Phase>("setup")
  const [setupMode, setSetupMode] = useState<SetupMode>("local")
  const [playMode, setPlayMode] = useState<PlayMode>("local")
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""])
  const [hostName, setHostName] = useState("")
  const [joinName, setJoinName] = useState("")
  const [joinHostCode, setJoinHostCode] = useState("")
  const [hostStatus, setHostStatus] = useState("")
  const [joinStatus, setJoinStatus] = useState("")
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
  const [settings, setSettings] = useState<RoundSettings>(DEFAULT_SETTINGS)
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [sharedLetters, setSharedLetters] = useState<string[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.turnSeconds)
  const [currentEntry, setCurrentEntry] = useState("")
  const [setupError, setSetupError] = useState("")
  const [turnMessage, setTurnMessage] = useState("")
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<SubmissionStatus | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)

  const phaseRef = useRef(phase)
  const currentTurnRef = useRef(currentTurn)
  const playersRef = useRef(players)
  const playModeRef = useRef(playMode)
  const localPlayerIdRef = useRef(localPlayerId)
  const lastHandledPendingActionIdRef = useRef<number | null>(null)

  const activePlayerIndex = players.length > 0 ? Math.min(currentTurn, players.length - 1) : 0
  const activePlayer = players[activePlayerIndex] ?? null
  const leaderboard = useMemo(
    () =>
      [...players].sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        if (right.words.length !== left.words.length) {
          return right.words.length - left.words.length
        }

        return left.name.localeCompare(right.name)
      }),
    [players],
  )
  const winners = useMemo(() => {
    if (!leaderboard.length) {
      return []
    }

    const topPlayer = leaderboard[0]
    return leaderboard.filter(
      (player) => player.score === topPlayer.score && player.words.length === topPlayer.words.length,
    )
  }, [leaderboard])
  const progressTurns = players.length > 0 ? (phase === "results" ? players.length : currentTurn + 1) : 0
  const progressPercent = players.length > 0 ? (progressTurns / players.length) * 100 : 0
  const lettersPreview = useMemo(() => formatLetters(sharedLetters), [sharedLetters])
  const poolComposition = useMemo(() => {
    const vowels = sharedLetters.filter((letter) => "aeiouy".includes(letter)).length
    return {
      vowels,
      consonants: Math.max(sharedLetters.length - vowels, 0),
    }
  }, [sharedLetters])

  useEffect(() => {
    phaseRef.current = phase
    currentTurnRef.current = currentTurn
    playersRef.current = players
    playModeRef.current = playMode
    localPlayerIdRef.current = localPlayerId
  }, [phase, currentTurn, players, playMode, localPlayerId])

  const resetRoundState = useCallback(
    (nextSeconds = settings.turnSeconds) => {
      setPlayers([])
      setSharedLetters([])
      setCurrentTurn(0)
      setSecondsLeft(nextSeconds)
      setCurrentEntry("")
      setTurnMessage("")
      setLastSubmissionStatus(null)
    },
    [settings.turnSeconds],
  )

  const resetForSetup = useCallback(() => {
    setPhase("setup")
    resetRoundState(settings.turnSeconds)
    setSetupError("")
  }, [resetRoundState, settings.turnSeconds])

  const resetNetworkState = useCallback(
    (nextMode?: SetupMode) => {
      if (room.role !== "none") {
        room.leaveRoom()
      }

      setPlayMode(nextMode === "join" ? "guest" : "local")
      setLocalPlayerId(null)
      setLobbyPlayers([])
      setHostStatus("")
      setJoinHostCode("")
      setJoinStatus("")
    },
    [room],
  )

  const buildSnapshot = useCallback(
    (override?: Partial<BroadcastGameState>): BroadcastGameState => ({
      phase,
      players,
      sharedLetters,
      currentTurn,
      secondsLeft,
      settings,
      turnMessage,
      lastSubmissionStatus,
      ...override,
    }),
    [phase, players, sharedLetters, currentTurn, secondsLeft, settings, turnMessage, lastSubmissionStatus],
  )

  const handleSetupModeChange = (nextMode: SetupMode) => {
    if (nextMode === setupMode) {
      return
    }

    resetNetworkState(nextMode)
    resetForSetup()
    setSetupMode(nextMode)
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

  const handleNameChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target

    setPlayerNames((currentNames) =>
      currentNames.map((currentName, currentIndex) => (currentIndex === index ? value : currentName)),
    )
  }

  const advanceTurn = useCallback(() => {
    setCurrentEntry("")
    setTurnMessage("")
    setLastSubmissionStatus(null)

    if (currentTurn + 1 >= players.length) {
      setPhase("results")
      setSecondsLeft(0)
      return
    }

    setCurrentTurn((currentValue) => currentValue + 1)
    setSecondsLeft(settings.turnSeconds)
  }, [currentTurn, players.length, settings.turnSeconds])

  const applyGuestGameState = useCallback(
    (nextState: BroadcastGameState, yourPlayerId: string | null, roomState?: AnagramsRoomState | null) => {
      const nextActivePlayer = nextState.players[Math.min(nextState.currentTurn, Math.max(nextState.players.length - 1, 0))] ?? null

      setPlayMode("guest")
      setLocalPlayerId(yourPlayerId)
      setPhase(nextState.phase)
      setPlayers(nextState.players)
      setSharedLetters(nextState.sharedLetters)
      setCurrentTurn(nextState.currentTurn)
      setSecondsLeft(nextState.secondsLeft)
      setSettings(nextState.settings)
      setTurnMessage(nextState.turnMessage)
      setLastSubmissionStatus(nextState.lastSubmissionStatus)

      if (nextState.phase !== "playing" || nextActivePlayer?.id !== yourPlayerId) {
        setCurrentEntry("")
      }

      if (roomState?.systemMessage) {
        setJoinStatus(roomState.systemMessage)
      } else if (nextState.phase === "results") {
        setJoinStatus("Match complete. Waiting for the host to start another round.")
      } else if (nextState.phase === "playing") {
        setJoinStatus(
          nextActivePlayer?.id === yourPlayerId
            ? "It is your turn to build words."
            : `Waiting for ${nextActivePlayer?.name ?? "the active player"}.`,
        )
      } else {
        setJoinStatus("Connected to the lobby. Waiting for the host to start the round.")
      }
    },
    [],
  )

  useEffect(() => {
    if (!room.joinError) {
      return
    }

    setSetupError(room.joinError)

    if (setupMode === "join") {
      setJoinStatus(room.joinError)
    }

    if (setupMode === "host") {
      setHostStatus(room.joinError)
    }
  }, [room.joinError, setupMode])

  useEffect(() => {
    if (setupMode !== "host" || phase !== "setup") {
      return
    }

    if (room.roomState) {
      setLobbyPlayers(room.roomState.participants.map((player) => ({ id: player.playerId, name: player.name })))
      return
    }

    const trimmedHostName = hostName.trim()
    setLobbyPlayers(trimmedHostName ? [{ id: HOST_PLAYER_ID, name: trimmedHostName }] : [])
  }, [hostName, phase, room.roomState, setupMode])

  useEffect(() => {
    const roomState = room.roomState

    if (!roomState) {
      return
    }

    const nextLobbyPlayers = roomState.participants.map((player) => ({
      id: player.playerId,
      name: player.name,
    }))

    setLobbyPlayers(nextLobbyPlayers)

    if (room.role === "host") {
      setPlayMode("host")
      setLocalPlayerId(HOST_PLAYER_ID)
      setSettings((currentSettings) =>
        areSettingsEqual(currentSettings, roomState.settings) ? currentSettings : roomState.settings,
      )

      if (!roomState.gameState && roomState.systemMessage && phase !== "setup") {
        setPhase("setup")
        resetRoundState(roomState.settings.turnSeconds)
      }

      if (phase === "setup") {
        setHostStatus(
          roomState.systemMessage ?? "Room code ready. Share it with guests so they can join your lobby.",
        )
      }
      return
    }

    if (room.role !== "guest") {
      return
    }

    setSettings((currentSettings) =>
      areSettingsEqual(currentSettings, roomState.settings) ? currentSettings : roomState.settings,
    )

    const yourParticipant = roomState.participants.find((player) => player.clientId === room.myClientId) ?? null
    const yourPlayerId = yourParticipant?.playerId ?? null

    setSetupMode("join")
    setPlayMode("guest")
    setLocalPlayerId(yourPlayerId)

    if (roomState.gameState) {
      applyGuestGameState(roomState.gameState, yourPlayerId, roomState)
      return
    }

    setPhase("setup")
    setPlayers([])
    setSharedLetters([])
    setCurrentTurn(0)
    setSecondsLeft(roomState.settings.turnSeconds)
    setCurrentEntry("")
    setTurnMessage("")
    setLastSubmissionStatus(null)
    setJoinStatus(
      roomState.systemMessage ??
        `Connected to ${(nextLobbyPlayers.find((player) => player.id === HOST_PLAYER_ID)?.name ?? "the host")}'s lobby. Waiting for the host to start.`,
    )
  }, [applyGuestGameState, phase, resetRoundState, room.myClientId, room.role, room.roomState])

  useEffect(() => {
    if (setupMode !== "host" || phase !== "setup" || room.role !== "host" || !room.roomState?.roomCode) {
      return
    }

    room.updateSettings(settings)
  }, [phase, room.role, room.roomState?.roomCode, room.updateSettings, settings, setupMode])

  useEffect(() => {
    if (phase !== "playing" || playMode === "guest") {
      return
    }

    const timer = window.setTimeout(() => {
      if (secondsLeft <= 1) {
        advanceTurn()
        return
      }

      setSecondsLeft((currentValue) => currentValue - 1)
    }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [advanceTurn, phase, playMode, secondsLeft])

  useEffect(() => {
    if (playMode !== "host" || room.role !== "host") {
      return
    }

    const pendingAction = room.roomState?.pendingAction

    if (!pendingAction || lastHandledPendingActionIdRef.current === pendingAction.submissionId) {
      return
    }

    lastHandledPendingActionIdRef.current = pendingAction.submissionId

    const currentPlayers = playersRef.current
    const activeIndex = currentPlayers.length ? Math.min(currentTurnRef.current, currentPlayers.length - 1) : 0
    const currentActivePlayer = currentPlayers[activeIndex] ?? null

    if (
      playModeRef.current !== "host" ||
      phaseRef.current !== "playing" ||
      !currentActivePlayer ||
      currentActivePlayer.id !== pendingAction.playerId
    ) {
      return
    }

    if (pendingAction.actionType === "submit_word" && pendingAction.word) {
      const { normalizedWord, error } = validateSubmittedWord(
        pendingAction.word,
        currentActivePlayer,
        settings,
        sharedLetters,
      )

      if (error) {
        setPlayers((currentPlayersState) =>
          currentPlayersState.map((player, index) =>
            index === activeIndex ? { ...player, attempts: player.attempts + 1 } : player,
          ),
        )
        setTurnMessage(error)
        setLastSubmissionStatus("rejected")
        return
      }

      const points = scoreWord(normalizedWord.length)
      setPlayers((currentPlayersState) =>
        currentPlayersState.map((player, index) =>
          index === activeIndex
            ? {
                ...player,
                attempts: player.attempts + 1,
                score: player.score + points,
                words: [...player.words, { value: normalizedWord, points }],
              }
            : player,
        ),
      )
      setTurnMessage(`${normalizedWord.toUpperCase()} scores ${points} point${points === 1 ? "" : "s"}.`)
      setLastSubmissionStatus("accepted")
      return
    }

    if (pendingAction.actionType === "end_turn") {
      advanceTurn()
    }
  }, [advanceTurn, phase, playMode, room.role, room.roomState?.pendingAction, settings, sharedLetters])

  useEffect(() => {
    if (phase === "setup" || room.role !== "host" || !room.roomState?.roomCode) {
      return
    }

    room.publishState(buildSnapshot())
  }, [buildSnapshot, phase, room.publishState, room.role, room.roomState?.roomCode])

  useEffect(() => {
    if (setupMode !== "host" || phase !== "setup" || room.role !== "host" || !room.roomState?.roomCode) {
      return
    }

    room.publishState(
      buildSnapshot({
        phase: "setup",
        players: [],
        sharedLetters: [],
        currentTurn: 0,
        secondsLeft: settings.turnSeconds,
        turnMessage: "",
        lastSubmissionStatus: null,
      }),
    )
  }, [buildSnapshot, phase, room.publishState, room.role, room.roomState?.roomCode, settings.turnSeconds, setupMode])

  useEffect(() => {
    if (phase !== "playing") {
      setCurrentEntry("")
      return
    }

    if (playMode !== "local" && activePlayer?.id !== localPlayerId) {
      setCurrentEntry("")
    }
  }, [activePlayer?.id, localPlayerId, phase, playMode])

  const startLocalMatch = () => {
    const trimmedNames = playerNames.map((name) => name.trim()).filter(Boolean)
    const normalizedNames = trimmedNames.map((name) => name.toLowerCase())

    if (trimmedNames.length < MIN_PLAYERS) {
      setSetupError("Enter at least two player names before starting the round.")
      return
    }

    if (new Set(normalizedNames).size !== trimmedNames.length) {
      setSetupError("Player names must be unique so the scoreboard stays clear.")
      return
    }

    const settingsError = validateRoundSettings(settings)
    if (settingsError) {
      setSetupError(settingsError)
      return
    }

    setSetupError("")
    setPlayMode("local")
    setLocalPlayerId(null)
    setPlayers(
      trimmedNames.map((name, index) => ({
        id: createPlayerId(index),
        name,
        score: 0,
        words: [],
        attempts: 0,
      })),
    )
    setSharedLetters(generateLetterPool(settings.letterCount))
    setCurrentTurn(0)
    setSecondsLeft(settings.turnSeconds)
    setCurrentEntry("")
    setTurnMessage("")
    setLastSubmissionStatus(null)
    setPhase("playing")
  }

  const startHostedMatch = () => {
    const trimmedHostName = hostName.trim()

    if (!trimmedHostName) {
      setSetupError("Enter your host player name before starting the hosted match.")
      return
    }

    if (lobbyPlayers.length < MIN_PLAYERS) {
      setSetupError("At least one guest must join the lobby before the hosted match can start.")
      return
    }

    if (!room.roomState?.roomCode) {
      setSetupError("Generate a room code before starting the hosted match.")
      return
    }

    const settingsError = validateRoundSettings(settings)
    if (settingsError) {
      setSetupError(settingsError)
      return
    }

    setSetupError("")
    setPlayMode("host")
    setLocalPlayerId(HOST_PLAYER_ID)
    setPlayers(
      lobbyPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        score: 0,
        words: [],
        attempts: 0,
      })),
    )
    setSharedLetters(generateLetterPool(settings.letterCount))
    setCurrentTurn(0)
    setSecondsLeft(settings.turnSeconds)
    setCurrentEntry("")
    setTurnMessage("")
    setLastSubmissionStatus(null)
    setPhase("playing")
    setHostStatus("Hosted match started.")
  }

  const createHostInvite = () => {
    const trimmedHostName = hostName.trim()

    if (!trimmedHostName) {
      setSetupError("Enter your host player name before creating an invite code.")
      return
    }

    setSetupError("")
    setPlayMode("host")
    setLocalPlayerId(HOST_PLAYER_ID)

    if (room.role !== "none") {
      room.leaveRoom()
    }

    room.createRoom(trimmedHostName, MAX_PLAYERS)
    setHostStatus("Creating room code...")
  }

  const generateJoinResponse = () => {
    const trimmedJoinName = joinName.trim()

    if (!trimmedJoinName) {
      setSetupError("Enter your player name before joining a hosted match.")
      return
    }

    if (!joinHostCode.trim()) {
      setSetupError("Enter the host room code before joining the lobby.")
      return
    }

    setSetupError("")

    if (room.role !== "none") {
      room.leaveRoom()
    }

    room.joinRoom(joinHostCode, trimmedJoinName)
    setJoinStatus("Joining the host lobby...")
  }

  const handleReplayAction = () => {
    if (playMode === "host" && room.role === "host") {
      setSetupMode("host")
      setPhase("setup")
      resetRoundState(settings.turnSeconds)
      setHostStatus("Round reset. Keep the same room code and start another match whenever you're ready.")
      return
    }

    if (playMode === "guest") {
      setJoinStatus("Waiting for the host to start another round.")
      return
    }

    resetForSetup()
  }

  const submitWord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activePlayer) {
      return
    }

    const { normalizedWord, error } = validateSubmittedWord(currentEntry, activePlayer, settings, sharedLetters)

    if (playMode === "guest") {
      if (activePlayer.id !== localPlayerId) {
        return
      }

      if (error) {
        setTurnMessage(error)
        setLastSubmissionStatus("rejected")
        return
      }

      room.submitWord(normalizedWord)
      setCurrentEntry("")
      setTurnMessage("Checking word with the host...")
      setLastSubmissionStatus(null)
      return
    }

    if (playMode === "host" && activePlayer.id !== localPlayerId) {
      return
    }

    if (error) {
      setPlayers((currentPlayers) =>
        currentPlayers.map((player, index) =>
          index === activePlayerIndex ? { ...player, attempts: player.attempts + 1 } : player,
        ),
      )
      setTurnMessage(error)
      setLastSubmissionStatus("rejected")
      return
    }

    const points = scoreWord(normalizedWord.length)
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex
          ? {
              ...player,
              attempts: player.attempts + 1,
              score: player.score + points,
              words: [...player.words, { value: normalizedWord, points }],
            }
          : player,
      ),
    )
    setCurrentEntry("")
    setTurnMessage(`${normalizedWord.toUpperCase()} scores ${points} point${points === 1 ? "" : "s"}.`)
    setLastSubmissionStatus("accepted")
  }

  const handleEndTurn = () => {
    if (!activePlayer) {
      return
    }

    if (playMode === "guest") {
      if (activePlayer.id !== localPlayerId) {
        return
      }

      room.endTurn()
      setCurrentEntry("")
      setTurnMessage("Ending your turn...")
      setLastSubmissionStatus(null)
      return
    }

    if (playMode === "host" && activePlayer.id !== localPlayerId) {
      return
    }

    advanceTurn()
  }

  const canLocalSubmitWord =
    phase === "playing" &&
    !!activePlayer &&
    (playMode === "local" || activePlayer.id === localPlayerId)

  const canControlTurn = canLocalSubmitWord

  const modeCards = [
    {
      id: "local" as const,
      title: "Local Multiplayer",
      description: "Take turns on the same device and race to build the best word list.",
    },
    {
      id: "host" as const,
      title: "Host a Game",
      description: "Prepare a cross-device lobby with room codes.",
    },
    {
      id: "join" as const,
      title: "Join a Game",
      description: "Paste a room code and join remotely.",
    },
  ]

  return (
    <div className="space-y-8 text-white">
      <section className="rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.5em] text-cyan-300">Anagrams Arena</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Letter Lockdown</h1>
            <p className="mt-4 max-w-3xl text-base text-blue-100/85 md:text-lg">
              Build a shared letter pool, rotate the device between players, and stack up the
              highest-scoring word list before the clock runs out.
            </p>
          </div>

          <div className="grid min-w-[260px] gap-4 rounded-[1.5rem] border border-cyan-300/20 bg-white/8 p-5 backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Format</p>
              <p className="mt-2 text-lg font-semibold">One shared letter pool, one timed turn each</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Scoring</p>
              <p className="mt-2 text-lg font-semibold">Longer words earn bonus tiers</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Connection</p>
              <p className="mt-2 text-lg font-semibold">
                {setupMode === "local"
                  ? "Same device"
                  : room.isConnected
                    ? "Shared WebSocket room code"
                    : "Connecting to server"}
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
              <h2 className="mt-2 text-2xl font-bold">Word race standings</h2>
            </div>

            <div className="min-w-[220px]">
              <div className="mb-2 flex items-center justify-between text-sm text-blue-100/80">
                <span>Round progress</span>
                <span>
                  {Math.min(progressTurns, players.length)} / {players.length}
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
              const isActive = phase === "playing" && index === activePlayerIndex

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
                        {isActive ? "On deck" : "Player"}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">{player.name}</h3>
                    </div>
                    <div className="rounded-full bg-yellow-300 px-4 py-2 text-lg font-black text-blue-950">
                      {player.score}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-blue-100/80">
                    <div className="rounded-2xl bg-blue-900/60 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Words found</p>
                      <p className="mt-2 text-xl font-semibold text-white">{player.words.length}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-900/60 p-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Best word</p>
                      <p className="mt-2 text-xl font-semibold text-white">{getBestWord(player.words)}</p>
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
                <h2 className="mt-2 text-3xl font-bold">Name your players</h2>
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
                  Available letters
                </label>
                <input
                  type="number"
                  min={5}
                  max={12}
                  value={settings.letterCount}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      letterCount: Math.min(12, Math.max(5, Number(event.target.value) || 5)),
                      minimumWordLength: Math.min(
                        currentSettings.minimumWordLength,
                        Math.min(12, Math.max(5, Number(event.target.value) || 5)),
                      ),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Minimum word length
                </label>
                <input
                  type="number"
                  min={3}
                  max={settings.letterCount}
                  value={settings.minimumWordLength}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      minimumWordLength: Math.min(
                        currentSettings.letterCount,
                        Math.max(3, Number(event.target.value) || 3),
                      ),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Seconds per player
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={settings.turnSeconds}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      turnSeconds: Math.min(180, Math.max(15, Number(event.target.value) || 15)),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100/80">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Scoring guide</p>
                <ul className="mt-3 space-y-2">
                  <li>3–4 letters: base points equal to word length</li>
                  <li>5–6 letters: word length + 2 bonus points</li>
                  <li>7–8 letters: word length + 5 total bonus points</li>
                  <li>9+ letters: word length + 10 total bonus points</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100/80">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Round notes</p>
                <ul className="mt-3 space-y-2">
                  <li>One balanced letter pool is shared by every player.</li>
                  <li>Players can reuse another player's word, but not their own previous word.</li>
                  <li>Score decides the winner, and total words found breaks any tie.</li>
                </ul>
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
              Start word race
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
                      Generate a room code, share it with your guests, and wait for them to join.
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
                  {room.roomState?.roomCode ? "Generate new room code" : "Generate room code"}
                </button>

                {room.roomState?.roomCode && (
                  <textarea
                    readOnly
                    value={room.roomState.roomCode}
                    className="min-h-36 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-center font-mono text-sm tracking-[0.35em] text-blue-50 outline-none"
                  />
                )}
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
                  Available letters
                </label>
                <input
                  type="number"
                  min={5}
                  max={12}
                  value={settings.letterCount}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      letterCount: Math.min(12, Math.max(5, Number(event.target.value) || 5)),
                      minimumWordLength: Math.min(
                        currentSettings.minimumWordLength,
                        Math.min(12, Math.max(5, Number(event.target.value) || 5)),
                      ),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Minimum word length
                </label>
                <input
                  type="number"
                  min={3}
                  max={settings.letterCount}
                  value={settings.minimumWordLength}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      minimumWordLength: Math.min(
                        currentSettings.letterCount,
                        Math.max(3, Number(event.target.value) || 3),
                      ),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Seconds per player
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={settings.turnSeconds}
                  onChange={(event) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      turnSeconds: Math.min(180, Math.max(15, Number(event.target.value) || 15)),
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span>Available letters</span>
                    <span className="font-semibold text-white">{settings.letterCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Minimum word length</span>
                    <span className="font-semibold text-white">{settings.minimumWordLength}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Seconds per player</span>
                    <span className="font-semibold text-white">{settings.turnSeconds}</span>
                  </div>
                </div>
              </div>

              {setupError && (
                <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {setupError}
                </div>
              )}

              <button
                type="button"
                onClick={startHostedMatch}
                disabled={lobbyPlayers.length < MIN_PLAYERS || !room.roomState?.roomCode}
                className="w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start hosted game
              </button>
            </div>
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

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Room code
                </label>
                <input
                  value={joinHostCode}
                  onChange={(event) => setJoinHostCode(event.target.value.toUpperCase())}
                  placeholder="Enter the host's room code"
                  maxLength={6}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-center font-mono tracking-[0.35em] text-white uppercase outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              {joinHostCode && (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                  Room code captured. Join the lobby when you're ready.
                </div>
              )}

              <button
                type="button"
                onClick={generateJoinResponse}
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Join lobby
              </button>

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
                  Enter the host's room code, join the lobby, and wait for the match to begin.
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

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Host settings</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span>Available letters</span>
                  <span className="font-semibold text-white">{settings.letterCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Minimum word length</span>
                  <span className="font-semibold text-white">{settings.minimumWordLength}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Seconds per player</span>
                  <span className="font-semibold text-white">{settings.turnSeconds}</span>
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

      {phase === "playing" && activePlayer && (
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Active turn</p>
                <h2 className="mt-2 text-3xl font-bold">{activePlayer.name}, build as many words as you can</h2>
                <p className="mt-3 text-blue-100/80">
                  {canLocalSubmitWord
                    ? `Every word must use only the shared letters below and meet the minimum length of ${settings.minimumWordLength}.`
                    : `Follow along live while ${activePlayer.name} builds words from the shared letter pool.`}
                </p>
              </div>

              <div className="min-w-[160px] rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-100">Time left</p>
                <p className="mt-3 text-5xl font-black text-white">{secondsLeft}</p>
                <p className="mt-2 text-sm text-blue-100/80">seconds</p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-6 shadow-inner shadow-black/10 md:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Shared letter pool</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {sharedLetters.map((letter, index) => (
                  <div
                    key={`${letter}-${index}`}
                    className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-cyan-300/20 bg-blue-900/75 text-3xl font-black uppercase shadow-lg shadow-black/20"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={submitWord} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Submit a word
                </label>
                <input
                  value={currentEntry}
                  onChange={(event) => setCurrentEntry(event.target.value)}
                  placeholder={
                    canLocalSubmitWord ? "Type a word from the shared letters" : `Waiting for ${activePlayer.name}`
                  }
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={!canLocalSubmitWord}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-4 text-xl text-white outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  type="submit"
                  disabled={!canLocalSubmitWord}
                  className="flex-1 rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30"
                >
                  Bank word
                </button>
                <button
                  type="button"
                  onClick={handleEndTurn}
                  disabled={!canControlTurn}
                  className="rounded-[1.25rem] border border-white/20 px-5 py-4 text-lg font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  End turn early
                </button>
              </div>
            </form>

            {turnMessage && (
              <div
                className={`mt-6 rounded-[1.5rem] border px-4 py-4 text-sm ${
                  lastSubmissionStatus === "accepted"
                    ? "border-green-300/30 bg-green-500/10 text-green-50"
                    : "border-red-300/30 bg-red-500/10 text-red-50"
                }`}
              >
                {turnMessage}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Round control</p>
            <h2 className="mt-2 text-3xl font-bold">Turn summary</h2>

            <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Live turn</p>
              <p className="mt-3 text-lg text-white/90">
                {canLocalSubmitWord
                  ? `${activePlayer.name} is on the clock. Accepted words stay in submission order and add directly to the scoreboard.`
                  : playMode === "guest"
                    ? `Waiting for ${activePlayer.name} to finish their turn from another device.`
                    : `${activePlayer.name} is playing from another device while the host keeps time.`}
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Accepted words</p>
              {activePlayer.words.length === 0 ? (
                <p className="mt-4 text-blue-100/75">No words banked yet this turn.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {activePlayer.words.map((word, index) => (
                    <div
                      key={`${word.value}-${index}`}
                      className="rounded-2xl bg-blue-900/65 px-4 py-3 text-sm text-blue-50"
                    >
                      <span className="font-semibold uppercase">{word.value}</span>
                      <span className="ml-2 text-cyan-200">+{word.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Round settings</p>
              <div className="mt-4 space-y-3 text-blue-100/85">
                <div className="flex items-center justify-between gap-4">
                  <span>Letter pool</span>
                  <span className="font-semibold text-white">{settings.letterCount} letters</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Minimum length</span>
                  <span className="font-semibold text-white">{settings.minimumWordLength}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Turn timer</span>
                  <span className="font-semibold text-white">{settings.turnSeconds} seconds</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Vowels / Consonants</span>
                  <span className="font-semibold text-white">
                    {poolComposition.vowels} / {poolComposition.consonants}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Scoring recap</p>
              <p className="mt-4 text-sm">
                Scores rank first. If two players finish with the same score, the player who banked
                more valid words wins the tie-break.
              </p>
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
                  ? `${winners[0].name} wins the word race!`
                  : `${winners.map((winner) => winner.name).join(" & ")} tie at the top!`}
              </h3>
              <p className="mt-3 text-blue-100/80">
                Final ranking is based on score first, then total valid words found. Every player
                used the same shared letters: {lettersPreview || formatLetters(sharedLetters)}.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`rounded-[1.5rem] border p-5 ${
                    index === 0 ? "border-yellow-300/40 bg-yellow-300/10" : "border-white/10 bg-white/5"
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
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Words</p>
                        <p className="mt-2 text-2xl font-black text-white">{player.words.length}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-900/65 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Attempts</p>
                        <p className="mt-2 text-2xl font-black text-white">{player.attempts}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Words in submission order</p>
                    {player.words.length === 0 ? (
                      <p className="mt-3 text-blue-100/75">No valid words were banked this round.</p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {player.words.map((word, wordIndex) => (
                          <div
                            key={`${player.id}-${word.value}-${wordIndex}`}
                            className="rounded-2xl bg-blue-900/65 px-4 py-3 text-sm text-blue-50"
                          >
                            <span className="font-semibold uppercase">{word.value}</span>
                            <span className="ml-2 text-cyan-200">+{word.points}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Replay</p>
            <h2 className="mt-2 text-3xl font-bold">Ready for another round?</h2>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p>
                {playMode === "host"
                  ? "Play again to return everyone in the room to the hosted lobby, keep this room code, and start another round with fresh letters."
                  : playMode === "guest"
                    ? "Stay connected to this room while the host decides whether to start another round."
                    : "Play again to return to setup, keep your current rules, and generate a fresh shared letter pool for the next local match."}
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">Last round letter pool</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {sharedLetters.map((letter, index) => (
                  <div
                    key={`result-${letter}-${index}`}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-blue-900/75 text-xl font-black uppercase"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleReplayAction}
              disabled={playMode === "guest"}
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {playMode === "guest" ? "Waiting for host" : "Play again"}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
