import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useRoomGame } from "./room/useRoomGame"
import type {
  BroadcastGameState,
  Direction,
  HandoffStage,
  LobbyPlayer,
  PendingTurnState,
  Phase,
  PlayMode,
  PlayerState,
  PlayableColor,
  SetupMode,
  UnoCard,
} from "./types"
import {
  DEFAULT_SETTINGS,
  HOST_PLAYER_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  STARTING_HAND_SIZE,
  TURN_SECONDS,
} from "./types"

const COLOR_ORDER: PlayableColor[] = ["red", "yellow", "green", "blue"]

const COLOR_CLASSES: Record<PlayableColor, { card: string; pill: string; accent: string; ring: string }> = {
  red: {
    card: "from-red-500 via-red-600 to-red-700",
    pill: "bg-red-500 text-white",
    accent: "text-red-200",
    ring: "ring-red-300/60",
  },
  yellow: {
    card: "from-yellow-300 via-yellow-400 to-amber-500",
    pill: "bg-yellow-300 text-slate-900",
    accent: "text-yellow-100",
    ring: "ring-yellow-200/70",
  },
  green: {
    card: "from-green-400 via-green-500 to-emerald-600",
    pill: "bg-green-500 text-white",
    accent: "text-green-100",
    ring: "ring-green-300/60",
  },
  blue: {
    card: "from-sky-400 via-blue-500 to-indigo-700",
    pill: "bg-blue-500 text-white",
    accent: "text-blue-100",
    ring: "ring-blue-300/60",
  },
}

function createCardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function shuffleArray<T>(items: T[]) {
  const cloned = [...items]

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]]
  }

  return cloned
}

function createDeck() {
  const deck: UnoCard[] = []

  COLOR_ORDER.forEach((color) => {
    deck.push({ id: createCardId(), color, kind: "number", value: 0 })

    for (let value = 1; value <= 9; value += 1) {
      deck.push({ id: createCardId(), color, kind: "number", value })
      deck.push({ id: createCardId(), color, kind: "number", value })
    }

    ;(["skip", "reverse", "drawTwo"] as const).forEach((kind) => {
      deck.push({ id: createCardId(), color, kind, value: null })
      deck.push({ id: createCardId(), color, kind, value: null })
    })
  })

  for (let wildIndex = 0; wildIndex < 4; wildIndex += 1) {
    deck.push({ id: createCardId(), color: "wild", kind: "wild", value: null })
    deck.push({ id: createCardId(), color: "wild", kind: "wildDrawFour", value: null })
  }

  return shuffleArray(deck)
}

function getCardTitle(card: UnoCard) {
  if (card.kind === "number") {
    return `${card.color} ${card.value}`
  }

  if (card.kind === "drawTwo") {
    return `${card.color} draw two`
  }

  if (card.kind === "wildDrawFour") {
    return "wild draw four"
  }

  return card.color === "wild" ? "wild" : `${card.color} ${card.kind}`
}

function getCardSubtitle(card: UnoCard) {
  if (card.kind === "number") {
    return "Number"
  }

  if (card.kind === "skip") {
    return "Skip"
  }

  if (card.kind === "reverse") {
    return "Reverse"
  }

  if (card.kind === "drawTwo") {
    return "Draw Two"
  }

  if (card.kind === "wild") {
    return "Choose Color"
  }

  return "Wild Draw Four"
}

function getColorLabel(color: PlayableColor) {
  return color.charAt(0).toUpperCase() + color.slice(1)
}

function getNextPlayerIndex(playerCount: number, currentIndex: number, direction: Direction, steps = 1) {
  let nextIndex = currentIndex

  for (let step = 0; step < steps; step += 1) {
    nextIndex = (nextIndex + direction + playerCount) % playerCount
  }

  return nextIndex
}

function drawCards(
  sourceDrawPile: UnoCard[],
  sourceDiscardPile: UnoCard[],
  count: number,
): { drawnCards: UnoCard[]; drawPile: UnoCard[]; discardPile: UnoCard[] } {
  let drawPile = [...sourceDrawPile]
  let discardPile = [...sourceDiscardPile]
  const drawnCards: UnoCard[] = []

  while (drawnCards.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length <= 1) {
        break
      }

      const topDiscard = discardPile[discardPile.length - 1]
      drawPile = shuffleArray(discardPile.slice(0, -1))
      discardPile = [topDiscard]
    }

    const nextCard = drawPile[0]

    if (!nextCard) {
      break
    }

    drawnCards.push(nextCard)
    drawPile = drawPile.slice(1)
  }

  return {
    drawnCards,
    drawPile,
    discardPile,
  }
}

function isPlayableCard(
  card: UnoCard,
  topCard: UnoCard | null,
  activeColor: PlayableColor,
  hand: UnoCard[],
) {
  if (!topCard) {
    return true
  }

  if (card.kind === "wild") {
    return true
  }

  if (card.kind === "wildDrawFour") {
    return !hand.some((candidate) => candidate.id !== card.id && candidate.color === activeColor)
  }

  if (card.color === activeColor) {
    return true
  }

  if (card.kind === "number" && topCard.kind === "number") {
    return card.value === topCard.value
  }

  return card.kind === topCard.kind
}

function createStarterPlayers(names: string[]) {
  return names.map<PlayerState>((name, index) => ({
    id: `uno-player-${index + 1}`,
    name,
    hand: [],
  }))
}

function createLobbyPlayers(entries: LobbyPlayer[]) {
  return entries.map<PlayerState>((player) => ({
    id: player.id,
    name: player.name,
    hand: [],
  }))
}

function getCardBackground(card: UnoCard) {
  if (card.color === "wild") {
    return "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700"
  }

  return `bg-gradient-to-br ${COLOR_CLASSES[card.color].card}`
}

function getUnoAssetFilename(card: UnoCard) {
  if (card.kind === "number") {
    return `${getColorLabel(card.color as PlayableColor)}_${card.value}.svg`
  }

  if (card.kind === "skip") {
    return `${getColorLabel(card.color as PlayableColor)}_Skip.svg`
  }

  if (card.kind === "reverse") {
    return `${getColorLabel(card.color as PlayableColor)}_Reverse.svg`
  }

  if (card.kind === "drawTwo") {
    return `${getColorLabel(card.color as PlayableColor)}_Draw_2.svg`
  }

  if (card.kind === "wild") {
    return "Wild.svg"
  }

  return "Wild_Draw_4.svg"
}

function getUnoAssetPath(card: UnoCard) {
  return `/uno/${getUnoAssetFilename(card)}`
}

function getColorBadgeClasses(color: PlayableColor) {
  return COLOR_CLASSES[color].pill
}

function getColorAccent(color: PlayableColor) {
  return COLOR_CLASSES[color].accent
}

function buildAnimatedCardOffsets(length: number) {
  return Array.from({ length }, (_, index) => ({
    rotate: index * 8 - ((length - 1) * 8) / 2,
    x: index * 18 - ((length - 1) * 18) / 2,
  }))
}

export default function Uno() {
  const room = useRoomGame()

  const [setupMode, setSetupMode] = useState<SetupMode>("local")
  const [playMode, setPlayMode] = useState<PlayMode>("local")
  const [phase, setPhase] = useState<Phase>("setup")
  const [handoffStage, setHandoffStage] = useState<HandoffStage>("pass")
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""])
  const [hostName, setHostName] = useState("")
  const [joinName, setJoinName] = useState("")
  const [joinHostCode, setJoinHostCode] = useState("")
  const [hostStatus, setHostStatus] = useState("")
  const [joinStatus, setJoinStatus] = useState("")
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [drawPile, setDrawPile] = useState<UnoCard[]>([])
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [direction, setDirection] = useState<Direction>(1)
  const [activeColor, setActiveColor] = useState<PlayableColor>("red")
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS)
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false)
  const [drawnCardId, setDrawnCardId] = useState<string | null>(null)
  const [awaitingEndTurnReason, setAwaitingEndTurnReason] = useState<"drawBlocked" | "noDraw" | "timeout" | null>(null)
  const [pendingTurnState, setPendingTurnState] = useState<PendingTurnState | null>(null)
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null)
  const [setupError, setSetupError] = useState("")
  const [turnMessage, setTurnMessage] = useState("Set the table and start a classic local UNO match.")
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)
  const [guestActionPending, setGuestActionPending] = useState(false)
  const [submittedActionStateKey, setSubmittedActionStateKey] = useState<string | null>(null)

  const lastHandledPendingActionIdRef = useRef<number | null>(null)

  const activePlayer = players[currentPlayerIndex] ?? null
  const topDiscard = discardPile[discardPile.length - 1] ?? null
  const currentPlayerHand = activePlayer?.hand ?? []
  const localPlayer = players.find((player) => player.id === localPlayerId) ?? null
  const visiblePlayer = playMode === "local" ? activePlayer : localPlayer
  const visibleHand = visiblePlayer?.hand ?? []
  const isMyTurn = phase === "playing" && Boolean(activePlayer) && (playMode === "local" || activePlayer?.id === localPlayerId)
  const playableCards = isMyTurn
    ? visibleHand.filter((card) => isPlayableCard(card, topDiscard, activeColor, visibleHand))
    : []
  const isAwaitingEndTurn = Boolean(awaitingEndTurnReason || pendingTurnState)
  const handoffFan = useMemo(() => buildAnimatedCardOffsets(5), [])
  const lobbyPlayers = useMemo(() => {
    if (room.roomState?.participants?.length) {
      return room.roomState.participants.map<LobbyPlayer>((player) => ({
        id: player.playerId,
        name: player.name,
      }))
    }

    if (setupMode === "host" && hostName.trim()) {
      return [{ id: HOST_PLAYER_ID, name: hostName.trim() }]
    }

    return []
  }, [hostName, room.roomState?.participants, setupMode])
  const roomActionStateKey = useMemo(
    () =>
      JSON.stringify({
        phase,
        currentPlayerIndex,
        activeColor,
        hasDrawnThisTurn,
        drawnCardId,
        awaitingEndTurnReason,
        pendingTurnState,
        winnerId,
        turnMessage,
        visibleHandIds: visibleHand.map((card) => card.id),
      }),
    [
      activeColor,
      awaitingEndTurnReason,
      currentPlayerIndex,
      drawnCardId,
      hasDrawnThisTurn,
      pendingTurnState,
      phase,
      turnMessage,
      visibleHand,
      winnerId,
    ],
  )

  const modeCards = [
    {
      id: "local" as const,
      title: "Local Multiplayer",
      description: "Pass one device around the table with hidden hands and a timed 30-second turn.",
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

  const applyBroadcastState = useCallback((nextState: BroadcastGameState) => {
    setPlayers(nextState.players)
    setDrawPile(nextState.drawPile)
    setDiscardPile(nextState.discardPile)
    setCurrentPlayerIndex(nextState.currentPlayerIndex)
    setDirection(nextState.direction)
    setActiveColor(nextState.activeColor)
    setSecondsLeft(nextState.secondsLeft)
    setHasDrawnThisTurn(nextState.hasDrawnThisTurn)
    setDrawnCardId(nextState.drawnCardId)
    setAwaitingEndTurnReason(nextState.awaitingEndTurnReason)
    setPendingTurnState(nextState.pendingTurnState)
    setTurnMessage(nextState.turnMessage)
    setWinnerId(nextState.winnerId)
    setPhase(nextState.phase)
  }, [])

  const resetToSetup = useCallback((nextMode?: SetupMode) => {
    if (room.role !== "none") {
      room.leaveRoom()
    }

    setPlayMode(nextMode === "join" ? "guest" : "local")
    setPhase("setup")
    setHandoffStage("pass")
    setPlayers([])
    setDrawPile([])
    setDiscardPile([])
    setCurrentPlayerIndex(0)
    setDirection(1)
    setActiveColor("red")
    setSecondsLeft(TURN_SECONDS)
    setHasDrawnThisTurn(false)
    setDrawnCardId(null)
    setAwaitingEndTurnReason(null)
    setPendingTurnState(null)
    setPendingWildCardId(null)
    setWinnerId(null)
    setLocalPlayerId(null)
    setGuestActionPending(false)
    setSubmittedActionStateKey(null)
    setHostStatus("")
    setJoinStatus("")
    setJoinHostCode("")
    setTurnMessage("Set the table and start a classic local UNO match.")
  }, [room.leaveRoom, room.role])

  const commitNextTurn = useCallback(
    (nextState: {
      players: PlayerState[]
      drawPile: UnoCard[]
      discardPile: UnoCard[]
      currentPlayerIndex: number
      direction: Direction
      activeColor: PlayableColor
      message: string
    }) => {
      setPlayers(nextState.players)
      setDrawPile(nextState.drawPile)
      setDiscardPile(nextState.discardPile)
      setCurrentPlayerIndex(nextState.currentPlayerIndex)
      setDirection(nextState.direction)
      setActiveColor(nextState.activeColor)
      setTurnMessage(nextState.message)
      setPhase(playMode === "local" ? "handoff" : "playing")
      setHandoffStage("pass")
      setSecondsLeft(DEFAULT_SETTINGS.turnSeconds)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
      setGuestActionPending(false)
      setSubmittedActionStateKey(null)
    },
    [playMode],
  )

  const startTurn = useCallback(() => {
    setPhase("playing")
    setHandoffStage("pass")
    setSecondsLeft(DEFAULT_SETTINGS.turnSeconds)
    setHasDrawnThisTurn(false)
    setDrawnCardId(null)
    setAwaitingEndTurnReason(null)
    setPendingTurnState(null)
    setPendingWildCardId(null)
  }, [])

  const initializeMatch = useCallback(
    (initialPlayers: PlayerState[], nextPlayMode: PlayMode) => {
      let nextDrawPile = createDeck()
      const seededPlayers = initialPlayers.map((player) => ({ ...player, hand: [] as UnoCard[] }))

      seededPlayers.forEach((player, playerIndex) => {
        const dealt = drawCards(nextDrawPile, [], STARTING_HAND_SIZE)
        seededPlayers[playerIndex] = {
          ...player,
          hand: dealt.drawnCards,
        }
        nextDrawPile = dealt.drawPile
      })

      const openingIndex = nextDrawPile.findIndex((card) => card.color !== "wild")
      const openingCard = nextDrawPile[openingIndex >= 0 ? openingIndex : 0]

      if (!openingCard || openingCard.color === "wild") {
        setSetupError("The deck could not be prepared. Please try starting the match again.")
        return
      }

      nextDrawPile = nextDrawPile.filter((card) => card.id !== openingCard.id)
      const nextDiscardPile = [openingCard]
      let nextDirection: Direction = 1
      let nextCurrentPlayerIndex = 0
      let openingMessage = `${seededPlayers[0]?.name ?? "Player 1"} starts. Match the ${getColorLabel(openingCard.color)} ${getCardSubtitle(openingCard).toLowerCase()}.`

      if (openingCard.kind === "skip") {
        nextCurrentPlayerIndex = getNextPlayerIndex(seededPlayers.length, 0, 1, 1)
        openingMessage = `${seededPlayers[0]?.name ?? "Player 1"} is skipped by the opening card. ${seededPlayers[nextCurrentPlayerIndex].name} starts the round.`
      }

      if (openingCard.kind === "reverse") {
        if (seededPlayers.length === 2) {
          nextCurrentPlayerIndex = 1
          openingMessage = `${seededPlayers[0]?.name ?? "Player 1"} loses the opening turn to a Reverse. ${seededPlayers[nextCurrentPlayerIndex].name} starts.`
        } else {
          nextDirection = -1
          nextCurrentPlayerIndex = getNextPlayerIndex(seededPlayers.length, 0, -1, 1)
          openingMessage = `Opening Reverse flips the table. ${seededPlayers[nextCurrentPlayerIndex].name} starts counter-clockwise.`
        }
      }

      let finalPlayers = seededPlayers
      let finalDrawPile = nextDrawPile
      let finalDiscardPile = nextDiscardPile

      if (openingCard.kind === "drawTwo") {
        const drawResult = drawCards(nextDrawPile, nextDiscardPile, 2)
        finalDrawPile = drawResult.drawPile
        finalDiscardPile = drawResult.discardPile
        finalPlayers = [...seededPlayers]
        finalPlayers[0] = {
          ...finalPlayers[0],
          hand: [...finalPlayers[0].hand, ...drawResult.drawnCards],
        }
        nextCurrentPlayerIndex = getNextPlayerIndex(finalPlayers.length, 0, 1, 1)
        openingMessage = `${finalPlayers[0].name} draws two from the opening card. ${finalPlayers[nextCurrentPlayerIndex].name} opens the match.`
      }

      setSetupError("")
      setPlayMode(nextPlayMode)
      setPlayers(finalPlayers)
      setDrawPile(finalDrawPile)
      setDiscardPile(finalDiscardPile)
      setCurrentPlayerIndex(nextCurrentPlayerIndex)
      setDirection(nextDirection)
      setActiveColor(openingCard.color)
      setSecondsLeft(DEFAULT_SETTINGS.turnSeconds)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
      setWinnerId(null)
      setGuestActionPending(false)
      setSubmittedActionStateKey(null)
      setTurnMessage(openingMessage)
      setPhase(nextPlayMode === "local" ? "handoff" : "playing")
      setHandoffStage("pass")
    },
    [],
  )

  const startLocalMatch = () => {
    const trimmedNames = playerNames.map((name) => name.trim())

    if (trimmedNames.some((name) => !name)) {
      setSetupError("Please enter a name for every player before starting.")
      return
    }

    const uniqueNames = new Set(trimmedNames.map((name) => name.toLowerCase()))

    if (uniqueNames.size !== trimmedNames.length) {
      setSetupError("Each player needs a unique name so the turn handoff stays clear.")
      return
    }

    setLocalPlayerId(null)
    initializeMatch(createStarterPlayers(trimmedNames), "local")
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

    if (!room.roomState?.roomCode) {
      setSetupError("Generate a room code before starting the hosted match.")
      return
    }

    setLocalPlayerId(HOST_PLAYER_ID)
    setHostStatus("Hosted match started.")
    initializeMatch(createLobbyPlayers(lobbyPlayers), "host")
  }

  const handleSetupModeChange = (nextMode: SetupMode) => {
    if (nextMode === setupMode) {
      return
    }

    resetToSetup(nextMode)
    setSetupMode(nextMode)
    setSetupError("")
  }

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

  const finishMatch = useCallback(
    (nextPlayers: PlayerState[], nextDrawPile: UnoCard[], nextDiscardPile: UnoCard[], message: string) => {
      const winner = nextPlayers.find((player) => player.hand.length === 0) ?? null

      setPlayers(nextPlayers)
      setDrawPile(nextDrawPile)
      setDiscardPile(nextDiscardPile)
      setTurnMessage(message)
      setWinnerId(winner?.id ?? null)
      setPhase("finished")
      setSecondsLeft(0)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
    },
    [],
  )

  useEffect(() => {
    if (!room.joinError) {
      return
    }

    setSetupError(room.joinError)

    if (setupMode === "host") {
      setHostStatus(room.joinError)
    }

    if (setupMode === "join") {
      setJoinStatus(room.joinError)
    }
  }, [room.joinError, setupMode])

  useEffect(() => {
    const roomState = room.roomState

    if (!roomState) {
      return
    }

    const participant = roomState.participants.find((player) => player.clientId === room.myClientId) ?? null
    const resolvedLocalPlayerId = room.role === "host" ? HOST_PLAYER_ID : participant?.playerId ?? null
    setLocalPlayerId(resolvedLocalPlayerId)

    if (room.role === "host") {
      setPlayMode("host")
      if (phase === "setup") {
        setHostStatus("Room code ready. Share it with your friends to build the lobby.")
      }
    }

    if (room.role === "guest") {
      setSetupMode("join")
      setPlayMode("guest")

      if (roomState.systemMessage) {
        setJoinStatus(roomState.systemMessage)
      } else if (roomState.gameState?.phase === "finished") {
        setJoinStatus("Match complete.")
      } else if (roomState.gameState) {
        const current = roomState.gameState.players[roomState.gameState.currentPlayerIndex] ?? null
        setJoinStatus(
          current?.id === resolvedLocalPlayerId
            ? "It is your turn. Play from this device."
            : `Waiting for ${current?.name ?? "the next player"}.`,
        )
      } else {
        setJoinStatus("Connected to the lobby. Waiting for the host to start the match.")
      }
    }

    if (room.role === "guest" && roomState.gameState) {
      applyBroadcastState(roomState.gameState)
    } else if (room.role === "guest") {
      setPhase("setup")
      setPlayers([])
      setDrawPile([])
      setDiscardPile([])
      setCurrentPlayerIndex(0)
      setDirection(1)
      setActiveColor("red")
      setSecondsLeft(DEFAULT_SETTINGS.turnSeconds)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
      setWinnerId(null)
      setGuestActionPending(false)
      setSubmittedActionStateKey(null)
      setTurnMessage("Waiting for the host to start the UNO match.")
    }
  }, [applyBroadcastState, phase, room.myClientId, room.role, room.roomState])

  useEffect(() => {
    if (!guestActionPending || !submittedActionStateKey || playMode !== "guest") {
      return
    }

    if (roomActionStateKey !== submittedActionStateKey) {
      setGuestActionPending(false)
      setSubmittedActionStateKey(null)
    }
  }, [guestActionPending, playMode, roomActionStateKey, submittedActionStateKey])

  useEffect(() => {
    if (playMode !== "guest" || !guestActionPending) {
      return
    }

    if (phase !== "playing") {
      setGuestActionPending(false)
      setSubmittedActionStateKey(null)
    }
  }, [guestActionPending, phase, playMode])

  useEffect(() => {
    if (!pendingWildCardId) {
      return
    }

    const cardStillVisible = visibleHand.some((card) => card.id === pendingWildCardId)
    if (phase !== "playing" || !isMyTurn || !cardStillVisible) {
      setPendingWildCardId(null)
    }
  }, [isMyTurn, pendingWildCardId, phase, visibleHand])

  useEffect(() => {
    if (
      playMode !== "host" ||
      room.role !== "host" ||
      !room.roomState?.roomCode ||
      phase === "setup" ||
      players.length === 0
    ) {
      return
    }

    room.publishState({
      phase,
      players,
      drawPile,
      discardPile,
      currentPlayerIndex,
      direction,
      activeColor,
      secondsLeft,
      hasDrawnThisTurn,
      drawnCardId,
      awaitingEndTurnReason,
      pendingTurnState,
      turnMessage,
      winnerId,
      settings: DEFAULT_SETTINGS,
    })
  }, [
    activeColor,
    awaitingEndTurnReason,
    currentPlayerIndex,
    direction,
    discardPile,
    drawPile,
    drawnCardId,
    hasDrawnThisTurn,
    pendingTurnState,
    phase,
    playMode,
    players,
    room.publishState,
    room.role,
    room.roomState?.roomCode,
    secondsLeft,
    turnMessage,
    winnerId,
  ])

  const resolvePlayedCard = useCallback(
    (cardId: string, chosenColor?: PlayableColor) => {
      if (phase !== "playing" || !activePlayer || !topDiscard) {
        return
      }

      const card = activePlayer.hand.find((candidate) => candidate.id === cardId)

      if (!card) {
        return
      }

      if (hasDrawnThisTurn && drawnCardId !== card.id) {
        return
      }

      if (!isPlayableCard(card, topDiscard, activeColor, activePlayer.hand)) {
        return
      }

      if ((card.kind === "wild" || card.kind === "wildDrawFour") && !chosenColor) {
        setPendingWildCardId(card.id)
        return
      }

      const nextPlayers = players.map((player, index) =>
        index === currentPlayerIndex
          ? {
              ...player,
              hand: player.hand.filter((candidate) => candidate.id !== card.id),
            }
          : player,
      )

      const nextDiscardPile = [...discardPile, card]
      let nextDrawPile = [...drawPile]
      let nextDirection = direction
      const resolvedColor = card.color === "wild" ? chosenColor ?? activeColor : card.color
      let nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 1)
      let message = `${activePlayer.name} played ${getCardTitle(card)}.`

      if (nextPlayers[currentPlayerIndex].hand.length === 1) {
        message = `UNO! ${activePlayer.name} is down to one card after playing ${getCardTitle(card)}.`
      }

      if (nextPlayers[currentPlayerIndex].hand.length === 0) {
        finishMatch(
          nextPlayers,
          nextDrawPile,
          nextDiscardPile,
          `${activePlayer.name} played ${getCardTitle(card)} and wins the match!`,
        )
        return
      }

      if (card.kind === "skip") {
        const skippedPlayer = players[nextPlayerIndex]
        nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 2)
        message = `${activePlayer.name} played Skip. ${skippedPlayer?.name ?? "The next player"} loses the turn.`
      }

      if (card.kind === "reverse") {
        if (players.length === 2) {
          const skippedPlayer = players[nextPlayerIndex]
          nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 2)
          message = `${activePlayer.name} played Reverse. In two-player UNO, ${skippedPlayer?.name ?? "the next player"} is skipped.`
        } else {
          nextDirection = direction === 1 ? -1 : 1
          nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 1)
          message = `${activePlayer.name} reversed the order. Play now moves ${nextDirection === 1 ? "clockwise" : "counter-clockwise"}.`
        }
      }

      if (card.kind === "drawTwo") {
        const targetIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 1)
        const drawResult = drawCards(nextDrawPile, nextDiscardPile, 2)
        nextDrawPile = drawResult.drawPile
        nextDiscardPile.splice(0, nextDiscardPile.length, ...drawResult.discardPile)
        nextPlayers[targetIndex] = {
          ...nextPlayers[targetIndex],
          hand: [...nextPlayers[targetIndex].hand, ...drawResult.drawnCards],
        }
        nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 2)
        message = `${activePlayer.name} played Draw Two. ${nextPlayers[targetIndex].name} draws ${drawResult.drawnCards.length} and is skipped.`
      }

      if (card.kind === "wild") {
        message = `${activePlayer.name} changed the color to ${getColorLabel(resolvedColor)}.`
      }

      if (card.kind === "wildDrawFour") {
        const targetIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 1)
        const drawResult = drawCards(nextDrawPile, nextDiscardPile, 4)
        nextDrawPile = drawResult.drawPile
        nextDiscardPile.splice(0, nextDiscardPile.length, ...drawResult.discardPile)
        nextPlayers[targetIndex] = {
          ...nextPlayers[targetIndex],
          hand: [...nextPlayers[targetIndex].hand, ...drawResult.drawnCards],
        }
        nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, nextDirection, 2)
        message = `${activePlayer.name} called ${getColorLabel(resolvedColor)} and made ${nextPlayers[targetIndex].name} draw ${drawResult.drawnCards.length}.`
      }

      setPlayers(nextPlayers)
      setDrawPile(nextDrawPile)
      setDiscardPile(nextDiscardPile)
      setDirection(nextDirection)
      setActiveColor(resolvedColor)
      setTurnMessage(`${message} End the turn to continue.`)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState({
        currentPlayerIndex: nextPlayerIndex,
        direction: nextDirection,
        activeColor: resolvedColor,
        message,
      })
      setPendingWildCardId(null)
    },
    [
      phase,
      activePlayer,
      topDiscard,
      hasDrawnThisTurn,
      drawnCardId,
      activeColor,
      players,
      currentPlayerIndex,
      discardPile,
      drawPile,
      direction,
      commitNextTurn,
      finishMatch,
    ],
  )

  useEffect(() => {
    if (room.role !== "host") {
      return
    }

    const pendingAction = room.roomState?.pendingAction

    if (!pendingAction || lastHandledPendingActionIdRef.current === pendingAction.actionId) {
      return
    }

    lastHandledPendingActionIdRef.current = pendingAction.actionId

    if (phase !== "playing" || !activePlayer || activePlayer.id !== pendingAction.playerId) {
      return
    }

    if (pendingAction.kind === "drawCard") {
      const drawResult = drawCards(drawPile, discardPile, 1)

      if (drawResult.drawnCards.length === 0) {
        setDrawPile(drawResult.drawPile)
        setDiscardPile(drawResult.discardPile)
        setAwaitingEndTurnReason("noDraw")
        setTurnMessage(`${activePlayer.name} had no card to draw. End the turn to continue.`)
        return
      }

      const [drawnCard] = drawResult.drawnCards
      const nextPlayers = players.map((player, index) =>
        index === currentPlayerIndex
          ? {
              ...player,
              hand: [...player.hand, drawnCard],
            }
          : player,
      )

      setPlayers(nextPlayers)
      setDrawPile(drawResult.drawPile)
      setDiscardPile(drawResult.discardPile)
      setHasDrawnThisTurn(true)
      setDrawnCardId(drawnCard.id)
      setAwaitingEndTurnReason(null)
      setPendingWildCardId(null)

      const updatedHand = nextPlayers[currentPlayerIndex].hand
      const isPlayable = isPlayableCard(drawnCard, topDiscard, activeColor, updatedHand)

      if (!isPlayable) {
        setAwaitingEndTurnReason("drawBlocked")
        setTurnMessage(`${activePlayer.name} drew ${getCardTitle(drawnCard)} and cannot play it. End the turn to continue.`)
        return
      }

      setTurnMessage(`${activePlayer.name} drew a playable card. Play it now or end the turn.`)
      return
    }

    if (pendingAction.kind === "playCard" && pendingAction.cardId) {
      resolvePlayedCard(pendingAction.cardId, pendingAction.chosenColor ?? undefined)
      return
    }

    if (pendingAction.kind === "endTurn") {
      if (!hasDrawnThisTurn && !awaitingEndTurnReason && !pendingTurnState) {
        return
      }

      if (pendingTurnState) {
        commitNextTurn({
          players,
          drawPile,
          discardPile,
          currentPlayerIndex: pendingTurnState.currentPlayerIndex,
          direction: pendingTurnState.direction,
          activeColor: pendingTurnState.activeColor,
          message: pendingTurnState.message,
        })
        return
      }

      const nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, direction, 1)
      const message =
        awaitingEndTurnReason === "timeout"
          ? `${activePlayer.name} ran out of time and ended the turn.`
          : awaitingEndTurnReason === "noDraw"
            ? `${activePlayer.name} had no card to draw and ended the turn.`
            : awaitingEndTurnReason === "drawBlocked"
              ? `${activePlayer.name} could not play the drawn card and ended the turn.`
              : `${activePlayer.name} kept the drawn card and ended the turn.`

      commitNextTurn({
        players,
        drawPile,
        discardPile,
        currentPlayerIndex: nextPlayerIndex,
        direction,
        activeColor,
        message,
      })
    }
  }, [
    activeColor,
    activePlayer,
    awaitingEndTurnReason,
    commitNextTurn,
    currentPlayerIndex,
    direction,
    discardPile,
    drawPile,
    hasDrawnThisTurn,
    pendingTurnState,
    phase,
    players,
    resolvePlayedCard,
    room.role,
    room.roomState?.pendingAction,
    topDiscard,
  ])

  const handleCardSelection = (card: UnoCard) => {
    if (guestActionPending || isAwaitingEndTurn || !isMyTurn) {
      return
    }

    if (playMode === "guest") {
      if (card.kind === "wild" || card.kind === "wildDrawFour") {
        setPendingWildCardId(card.id)
        return
      }

      setGuestActionPending(true)
      setSubmittedActionStateKey(roomActionStateKey)
      room.submitAction("playCard", card.id)
      return
    }

    if (card.kind === "wild" || card.kind === "wildDrawFour") {
      setPendingWildCardId(card.id)
      return
    }

    resolvePlayedCard(card.id)
  }

  const handleDrawCard = useCallback(() => {
    if (guestActionPending || !isMyTurn || phase !== "playing" || !activePlayer || hasDrawnThisTurn || isAwaitingEndTurn) {
      return
    }

    if (playMode === "guest") {
      setGuestActionPending(true)
      setSubmittedActionStateKey(roomActionStateKey)
      room.submitAction("drawCard")
      return
    }

    const drawResult = drawCards(drawPile, discardPile, 1)

    if (drawResult.drawnCards.length === 0) {
      setDrawPile(drawResult.drawPile)
      setDiscardPile(drawResult.discardPile)
      setAwaitingEndTurnReason("noDraw")
      setTurnMessage(`${activePlayer.name} had no card to draw. End the turn to continue.`)
      return
    }

    const [drawnCard] = drawResult.drawnCards
    const nextPlayers = players.map((player, index) =>
      index === currentPlayerIndex
        ? {
            ...player,
            hand: [...player.hand, drawnCard],
          }
        : player,
    )

    setPlayers(nextPlayers)
    setDrawPile(drawResult.drawPile)
    setDiscardPile(drawResult.discardPile)
    setHasDrawnThisTurn(true)
    setDrawnCardId(drawnCard.id)
    setAwaitingEndTurnReason(null)
    setPendingWildCardId(null)

    const updatedHand = nextPlayers[currentPlayerIndex].hand
    const isPlayable = isPlayableCard(drawnCard, topDiscard, activeColor, updatedHand)

    if (!isPlayable) {
      setAwaitingEndTurnReason("drawBlocked")
      setTurnMessage(`${activePlayer.name} drew ${getCardTitle(drawnCard)} and cannot play it. End the turn to continue.`)
      return
    }

    setTurnMessage(`${activePlayer.name} drew a playable card. Play it now or end the turn.`)
  }, [activeColor, activePlayer, currentPlayerIndex, discardPile, drawPile, guestActionPending, hasDrawnThisTurn, isAwaitingEndTurn, isMyTurn, phase, playMode, players, room.submitAction, roomActionStateKey, topDiscard])

  const handleEndTurn = useCallback(() => {
    if (guestActionPending || !isMyTurn || phase !== "playing" || !activePlayer || (!hasDrawnThisTurn && !awaitingEndTurnReason && !pendingTurnState)) {
      return
    }

    if (playMode === "guest") {
      setGuestActionPending(true)
      setSubmittedActionStateKey(roomActionStateKey)
      room.submitAction("endTurn")
      return
    }

    if (pendingTurnState) {
      commitNextTurn({
        players,
        drawPile,
        discardPile,
        currentPlayerIndex: pendingTurnState.currentPlayerIndex,
        direction: pendingTurnState.direction,
        activeColor: pendingTurnState.activeColor,
        message: pendingTurnState.message,
      })
      return
    }

    const nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, direction, 1)
    const message =
      awaitingEndTurnReason === "timeout"
        ? `${activePlayer.name} ran out of time and ended the turn.`
        : awaitingEndTurnReason === "noDraw"
          ? `${activePlayer.name} had no card to draw and ended the turn.`
          : awaitingEndTurnReason === "drawBlocked"
            ? `${activePlayer.name} could not play the drawn card and ended the turn.`
            : `${activePlayer.name} kept the drawn card and ended the turn.`

    commitNextTurn({
      players,
      drawPile,
      discardPile,
      currentPlayerIndex: nextPlayerIndex,
      direction,
      activeColor,
      message,
    })
  }, [
    phase,
    activePlayer,
    hasDrawnThisTurn,
    awaitingEndTurnReason,
    pendingTurnState,
    guestActionPending,
    players,
    drawPile,
    discardPile,
    currentPlayerIndex,
    direction,
    activeColor,
    commitNextTurn,
    isMyTurn,
    playMode,
    room.submitAction,
    roomActionStateKey,
  ])

  const handleTimeout = useCallback(() => {
    if (phase !== "playing" || !activePlayer || awaitingEndTurnReason || pendingTurnState) {
      return
    }

    setPendingWildCardId(null)
    const nextPlayerIndex = getNextPlayerIndex(players.length, currentPlayerIndex, direction, 1)
    const message = hasDrawnThisTurn
      ? `${activePlayer.name} ran out of time and kept the drawn card.`
      : `${activePlayer.name} ran out of time and ended the turn.`

    commitNextTurn({
      players,
      drawPile,
      discardPile,
      currentPlayerIndex: nextPlayerIndex,
      direction,
      activeColor,
      message,
    })
  }, [
    activeColor,
    activePlayer,
    awaitingEndTurnReason,
    commitNextTurn,
    currentPlayerIndex,
    direction,
    discardPile,
    drawPile,
    hasDrawnThisTurn,
    pendingTurnState,
    phase,
    players,
  ])

  useEffect(() => {
    if (phase !== "playing" || playMode === "guest" || awaitingEndTurnReason || pendingTurnState) {
      return
    }

    if (secondsLeft <= 0) {
      handleTimeout()
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [handleTimeout, awaitingEndTurnReason, pendingTurnState, phase, playMode, secondsLeft])

  const canPlayCardFromHand = (card: UnoCard) => {
    if (!visiblePlayer || guestActionPending || !isMyTurn || phase !== "playing" || isAwaitingEndTurn) {
      return false
    }

    if (hasDrawnThisTurn && drawnCardId !== card.id) {
      return false
    }

    return isPlayableCard(card, topDiscard, activeColor, visibleHand)
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

  const joinHostedMatch = () => {
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

  const handleWildColorSelection = (color: PlayableColor) => {
    if (!pendingWildCardId || guestActionPending || !isMyTurn) {
      return
    }

    if (playMode === "guest") {
      setGuestActionPending(true)
      setSubmittedActionStateKey(roomActionStateKey)
      room.submitAction("playCard", pendingWildCardId, color)
      setPendingWildCardId(null)
      return
    }

    resolvePlayedCard(pendingWildCardId, color)
  }

  const winner = players.find((player) => player.id === winnerId) ?? null
  const activeTableViewportHeight = "calc(100dvh - 11rem)"
  const connectionLabel = setupMode === "local" ? "Same device" : "Shared WebSocket room code"
  const tableModeLabel =
    playMode === "local" ? "Same-device mode" : playMode === "host" ? "Hosted room" : "Joined room"
  const handDescription =
    playMode === "local"
      ? `${activePlayer?.name ?? "Player"}'s cards`
      : `${localPlayer?.name ?? "You"}'s cards`

  return (
    <div className={`${phase === "setup" ? "space-y-8" : "space-y-4"} text-white`}>
      {phase === "setup" ? (
        <section className="rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.5em] text-cyan-300">Uno Party</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Classic Table Pass</h1>
              <p className="mt-4 max-w-3xl text-base text-blue-100/85 md:text-lg">
                Build a same-device local UNO match, rotate the phone or laptop between players, and
                race to empty your hand before anyone else.
              </p>
            </div>

            <div className="grid min-w-[260px] gap-4 rounded-[1.5rem] border border-cyan-300/20 bg-white/8 p-5 backdrop-blur-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Format</p>
                <p className="mt-2 text-lg font-semibold">Classic local UNO with hidden hands</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Timer</p>
                <p className="mt-2 text-lg font-semibold">30 seconds per turn, timeout auto skips</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Connection</p>
                <p className="mt-2 text-lg font-semibold">{connectionLabel}</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-blue-300/20 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 p-4 shadow-xl shadow-black/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">Uno Party</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Classic Table Pass</h1>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-blue-100">
                {tableModeLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-blue-100">
                30-second turns
              </span>
            </div>
          </div>
        </section>
      )}

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

      {phase === "setup" && setupMode === "local" && (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Step 1</p>
                <h2 className="mt-2 text-3xl font-bold">Seat your players</h2>
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
                <div key={`uno-player-${index}`} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
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
            <h2 className="mt-2 text-3xl font-bold">Set the table rules</h2>

            <div className="mt-6 space-y-5 text-sm text-blue-100/85">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Classic rules included</p>
                <ul className="mt-3 space-y-2">
                  <li>7 cards per player, no stacking, no jump-in, and no custom house rules.</li>
                  <li>Wild Draw Four is only playable when you do not hold the active color.</li>
                  <li>Reverse behaves like a skip in 2-player games, just like classic UNO.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Pass-and-play flow</p>
                <ul className="mt-3 space-y-2">
                  <li>Each player gets 30 seconds to decide their move.</li>
                  <li>When the timer hits zero, the turn auto skips.</li>
                  <li>A playful reveal screen hides cards before the next hand appears.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Table reminder</p>
                <p className="mt-3">
                  Keep the device flat, tap the handoff screen together, and only let the active
                  player view their hand during the reveal.
                </p>
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
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-red-500 via-yellow-300 to-blue-500 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-slate-950 shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:shadow-yellow-300/30"
            >
              Start UNO match
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
                      Generate a room code, share it with guests, and wait for them to join.
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
                    lobbyPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-2xl bg-blue-900/60 px-4 py-3">
                        <span>{player.name}</span>
                        <span className="text-xs uppercase tracking-[0.25em] text-cyan-100">
                          {player.id === HOST_PLAYER_ID ? "Host" : "Guest"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={createHostInvite}
                className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 transition hover:bg-cyan-300"
              >
                {room.roomState?.roomCode ? "Generate new room code" : "Generate room code"}
              </button>

              {room.roomState?.roomCode && (
                <textarea
                  readOnly
                  value={room.roomState.roomCode}
                  className="min-h-28 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-center text-lg font-black tracking-[0.35em] text-white outline-none"
                />
              )}

              {hostStatus && (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                  {hostStatus}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Hosted rules</p>
            <h2 className="mt-2 text-3xl font-bold">Classic remote UNO</h2>

            <div className="mt-6 space-y-5 text-sm text-blue-100/85">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Hosted match flow</p>
                <ul className="mt-3 space-y-2">
                  <li>The host manages the deck and broadcasts every turn to connected devices.</li>
                  <li>Guests play only from their own device when it is their turn.</li>
                  <li>Classic rules stay locked in for every hosted room.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Room setup</p>
                <ul className="mt-3 space-y-2">
                  <li>2 to 6 players total.</li>
                  <li>30-second turns with auto timeout.</li>
                  <li>One room code powers the whole table, similar to Trivia.</li>
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
              onClick={startHostedMatch}
              disabled={lobbyPlayers.length < 2 || room.role !== "host"}
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

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Room code
                </label>
                <input
                  value={joinHostCode}
                  onChange={(event) => setJoinHostCode(event.target.value.toUpperCase())}
                  placeholder="Enter the host room code"
                  maxLength={6}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-blue-900/80 px-4 py-3 text-center font-mono tracking-[0.35em] text-white uppercase outline-none transition placeholder:text-blue-200/45 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <button
                type="button"
                onClick={joinHostedMatch}
                className="w-full rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
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
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Connected lobby</p>
            <h2 className="mt-2 text-3xl font-bold">Room preview</h2>

            <div className="mt-6 space-y-4">
              {lobbyPlayers.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-blue-100/80">
                  Enter the host room code, join the lobby, and wait for the match to begin.
                </p>
              ) : (
                lobbyPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-2xl bg-blue-900/60 px-4 py-3">
                    <span>{player.name}</span>
                    <span className="text-xs uppercase tracking-[0.25em] text-cyan-100">
                      {player.id === HOST_PLAYER_ID ? "Host" : "Player"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p>
                Hosted UNO uses the same room-code pattern as Trivia: the host shares one code,
                everyone joins, and turns are synchronized live over the socket.
              </p>
            </div>
          </div>
        </section>
      )}

      {phase !== "setup" && players.length > 0 && (
        <section
          className="flex min-h-0 flex-col gap-4 overflow-hidden"
          style={{ height: activeTableViewportHeight }}
        >
          <div className="rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-2xl shadow-black/30 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-200">Table status</p>
                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  {winner ? `${winner.name} wins the table!` : `${activePlayer?.name ?? "Next player"}'s turn`}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-blue-100/75">{turnMessage}</p>
              </div>

              <div className="flex flex-wrap gap-3 xl:max-w-[62%] xl:justify-end">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Timer</p>
                  <p className={`mt-2 text-2xl font-black ${secondsLeft <= 10 ? "text-red-300" : "text-yellow-200"}`}>
                    {phase === "finished" ? "—" : `${secondsLeft}s`}
                  </p>
                </div>

                {players.map((player, index) => {
                  const isActive = index === currentPlayerIndex && phase !== "finished"
                  const isWinner = player.id === winnerId

                  return (
                    <div
                      key={player.id}
                      className={`min-w-[150px] flex-1 rounded-[1.5rem] border p-3 transition-all sm:min-w-[160px] sm:flex-none sm:w-[172px] ${
                        isWinner
                          ? "border-yellow-300/60 bg-yellow-300/10"
                          : isActive
                            ? "border-white/40 bg-white/10"
                            : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">
                            {isWinner ? "Winner" : isActive ? "Now playing" : "Waiting"}
                          </p>
                          <h4 className="mt-1 truncate text-base font-bold">{player.name}</h4>
                        </div>
                        <div className="rounded-full bg-slate-900 px-3 py-1.5 text-center">
                          <p className="text-[9px] uppercase tracking-[0.2em] text-blue-200">Cards</p>
                          <p className="mt-0.5 text-lg font-black text-white">{player.hand.length}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {player.hand.length === 1 && (
                          <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                            UNO
                          </span>
                        )}
                        {isActive && phase === "playing" && playMode === "local" && (
                          <span className="rounded-full bg-blue-500/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                            Device holder
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4">
            <div className="grid min-h-0 gap-4 md:grid-cols-2">
              <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 shadow-xl shadow-black/25">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-200">Draw pile</p>
                    <h3 className="mt-2 text-lg font-bold">Pull one card</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                    {drawPile.length} left
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDrawCard}
                  disabled={phase !== "playing" || guestActionPending || hasDrawnThisTurn || !isMyTurn || isAwaitingEndTurn}
                  className="mt-4 flex h-40 w-full items-center justify-center rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-center transition hover:-translate-y-1 hover:border-yellow-200/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div>
                    <p className="text-3xl font-black tracking-[0.25em] text-white">UNO</p>
                    <p className="mt-2 text-sm text-blue-100/75">Draw a single card</p>
                  </div>
                </button>
              </section>

              <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 shadow-xl shadow-black/25">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-200">Discard pile</p>
                    <h3 className="mt-2 text-lg font-bold">Top card</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getColorBadgeClasses(activeColor)}`}>
                    {getColorLabel(activeColor)}
                  </span>
                </div>

                {topDiscard && (
                  <div className="mt-4 flex h-40 w-full items-center justify-center rounded-[1.5rem] border border-white/15 bg-slate-950/40 p-3 text-white shadow-lg">
                    <img
                      src={getUnoAssetPath(topDiscard)}
                      alt={getCardTitle(topDiscard)}
                      className="h-full w-auto object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
                    />
                  </div>
                )}
              </section>
            </div>

            <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]">
              <section className="rounded-[2rem] border border-white/15 bg-slate-950/85 p-4 text-sm text-blue-100/80 shadow-xl shadow-black/25">
                <p className="font-semibold uppercase tracking-[0.25em] text-blue-200">Turn reminder</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>Match color, number, action, or play a wild.</li>
                  <li>Draw once. If it works, only that drawn card may be played.</li>
                  <li>When the turn is over, use End turn to continue.</li>
                </ul>
              </section>

              {phase === "playing" && visiblePlayer && (
                <section className="flex min-h-0 max-h-[28vh] flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/85 p-3 shadow-xl shadow-black/25 sm:max-h-[30vh]">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className={`text-sm font-semibold uppercase tracking-[0.35em] ${getColorAccent(activeColor)}`}>
                        Hand view
                      </p>
                      <h3 className="mt-1 text-xl font-black sm:text-2xl">{handDescription}</h3>
                      <p className="mt-1 text-sm text-blue-100/75">
                        {isMyTurn && playableCards.length > 0
                          ? `${playableCards.length} playable card${playableCards.length === 1 ? "" : "s"} available this turn.`
                          : isMyTurn
                            ? "No playable cards in hand yet. Draw once or let the timer run out."
                            : `Waiting for ${activePlayer?.name ?? "the active player"} to finish the turn.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleDrawCard}
                        disabled={guestActionPending || !isMyTurn || hasDrawnThisTurn || isAwaitingEndTurn}
                        className="rounded-full bg-yellow-300 px-5 py-3 font-semibold text-slate-900 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Draw card
                      </button>
                      <button
                        type="button"
                        onClick={handleEndTurn}
                        disabled={guestActionPending || !isMyTurn || (!hasDrawnThisTurn && !awaitingEndTurnReason && !pendingTurnState)}
                        className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        End turn
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex-1 min-h-0 overflow-hidden">
                    <div className="flex h-full items-end gap-1.5 overflow-x-auto overflow-y-hidden pb-1 pr-1">
                      {visibleHand.map((card) => {
                        const isPlayable = canPlayCardFromHand(card)
                        const isPendingWild = pendingWildCardId === card.id
                        const isFreshDraw = drawnCardId === card.id

                        return (
                          <motion.button
                            key={card.id}
                            type="button"
                            whileHover={isPlayable ? { y: -4, rotate: -1 } : undefined}
                            whileTap={isPlayable ? { scale: 0.98 } : undefined}
                            onClick={() => handleCardSelection(card)}
                            disabled={!isPlayable}
                            className={`relative h-full shrink-0 overflow-hidden rounded-[1.1rem] border bg-slate-950/35 text-left text-white shadow-lg transition ${
                              isPlayable
                                ? "border-white/30 hover:border-white/60"
                                : "border-white/10 opacity-45"
                            } ${isPendingWild ? "ring-4 ring-white/50" : ""}`}
                            style={{ aspectRatio: "5 / 7" }}
                            aria-label={getCardTitle(card)}
                          >
                            <img
                              src={getUnoAssetPath(card)}
                              alt={getCardTitle(card)}
                              className="h-full w-full object-contain"
                              draggable={false}
                            />

                            <div className="pointer-events-none absolute inset-x-1.5 top-1.5 flex items-start justify-end gap-1">
                              {isFreshDraw && (
                                <span className="rounded-full bg-yellow-300 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-slate-950 sm:text-[8px]">
                                  Drew
                                </span>
                              )}
                            </div>

                            <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-end justify-end gap-1">
                              {!isPlayable && (
                                <span className="rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-white sm:text-[8px]">
                                  Locked
                                </span>
                              )}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}

              {phase === "finished" && winner && (
                <section className="flex min-h-0 flex-col justify-center rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-yellow-300/15 via-red-500/15 to-blue-500/15 p-6 shadow-xl shadow-black/25">
                  <p className="text-xs uppercase tracking-[0.35em] text-yellow-200">Match complete</p>
                  <h3 className="mt-3 text-3xl font-black">{winner.name} cleared every card!</h3>
                  <p className="mt-3 max-w-2xl text-blue-100/85">
                    Start a fresh shuffled table with the same group or head back to setup and change the roster.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {playMode === "local" && (
                      <button
                        type="button"
                        onClick={startLocalMatch}
                        className="rounded-full bg-yellow-300 px-6 py-3 font-bold text-slate-900 transition hover:bg-yellow-200"
                      >
                        Shuffle rematch
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => resetToSetup(setupMode)}
                      className="rounded-full border border-white/20 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                    >
                      {playMode === "local" ? "Back to setup" : "Leave room"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      )}

      <AnimatePresence>
        {playMode === "local" && phase === "handoff" && activePlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 px-6 py-10 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-3xl rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-center shadow-2xl shadow-black/40"
            >
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-200">
                {handoffStage === "pass" ? "Pass the device" : "Card reveal"}
              </p>

              <div className="relative mx-auto mt-8 h-40 w-72">
                {handoffFan.map((fanCard, index) => (
                  <motion.div
                    key={`handoff-card-${index}`}
                    initial={{ opacity: 0, y: 24, rotate: fanCard.rotate }}
                    animate={{
                      opacity: 1,
                      y: [16, -4, 0],
                      x: fanCard.x,
                      rotate: fanCard.rotate,
                    }}
                    transition={{ duration: 0.7, delay: index * 0.06 }}
                    className="absolute left-1/2 top-0 h-36 w-24 -translate-x-1/2 rounded-[1.25rem] border border-white/20 bg-gradient-to-br from-red-500 via-yellow-300 via-45% to-blue-600 shadow-xl"
                  >
                    <div className="flex h-full flex-col items-center justify-center text-slate-950">
                      <span className="text-sm font-black uppercase tracking-[0.3em]">UNO</span>
                      <span className="mt-3 text-4xl font-black">★</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {handoffStage === "pass" ? (
                <>
                  <h3 className="mt-4 text-4xl font-black">Hand the device to {activePlayer.name}</h3>
                  <p className="mt-4 text-blue-100/80">
                    Everyone else should look away. When {activePlayer.name} is ready, tap below to
                    reveal the hand.
                  </p>
                  <button
                    type="button"
                    onClick={() => setHandoffStage("reveal")}
                    className="mt-8 rounded-full bg-yellow-300 px-8 py-4 text-lg font-black uppercase tracking-[0.2em] text-slate-900 transition hover:scale-[1.02] hover:bg-yellow-200"
                  >
                    Ready for reveal
                  </button>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 14 }}
                    className="mt-4"
                  >
                    <h3 className="text-4xl font-black">{activePlayer.name}, it&apos;s your turn!</h3>
                    <p className="mt-4 text-blue-100/80">
                      You have <span className="font-black text-yellow-200">30 seconds</span> to
                      play, draw once, or let the turn skip automatically.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <span className={`rounded-full px-4 py-2 text-sm font-black uppercase ${getColorBadgeClasses(activeColor)}`}>
                        Active color: {getColorLabel(activeColor)}
                      </span>
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                        {activePlayer.hand.length} card{activePlayer.hand.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </motion.div>

                  <button
                    type="button"
                    onClick={startTurn}
                    className="mt-8 rounded-full bg-gradient-to-r from-red-500 via-yellow-300 to-blue-500 px-8 py-4 text-lg font-black uppercase tracking-[0.2em] text-slate-950 transition hover:scale-[1.02]"
                  >
                    Reveal my hand
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "playing" && pendingWildCardId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/85 px-6 py-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-xl rounded-[2rem] border border-white/15 bg-slate-950 p-8 shadow-2xl shadow-black/30"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-blue-200">Choose a color</p>
              <h3 className="mt-2 text-3xl font-black">Set the next UNO color</h3>
              <p className="mt-3 text-blue-100/75">
                Pick the color that should stay active after this wild card is played.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {COLOR_ORDER.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleWildColorSelection(color)}
                    className={`rounded-[1.5rem] border border-white/15 px-5 py-6 text-left text-white shadow-lg transition hover:-translate-y-1 ${getCardBackground({
                      id: color,
                      color,
                      kind: "number",
                      value: 0,
                    })}`}
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-white/80">Next color</p>
                    <h4 className="mt-3 text-3xl font-black">{getColorLabel(color)}</h4>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPendingWildCardId(null)}
                className="mt-6 rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
