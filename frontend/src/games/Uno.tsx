import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"

type Phase = "setup" | "handoff" | "playing" | "finished"
type SetupMode = "local" | "host" | "join"
type HandoffStage = "pass" | "reveal"
type Direction = 1 | -1
type UnoColor = "red" | "yellow" | "green" | "blue" | "wild"
type PlayableColor = Exclude<UnoColor, "wild">
type UnoCardKind = "number" | "skip" | "reverse" | "drawTwo" | "wild" | "wildDrawFour"

interface UnoCard {
  id: string
  color: UnoColor
  kind: UnoCardKind
  value: number | null
}

interface PlayerState {
  id: string
  name: string
  hand: UnoCard[]
}

interface PendingTurnState {
  currentPlayerIndex: number
  direction: Direction
  activeColor: PlayableColor
  message: string
}

const TURN_SECONDS = 120
const STARTING_HAND_SIZE = 7
const MIN_PLAYERS = 2
const MAX_PLAYERS = 6
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
  const [setupMode, setSetupMode] = useState<SetupMode>("local")
  const [phase, setPhase] = useState<Phase>("setup")
  const [handoffStage, setHandoffStage] = useState<HandoffStage>("pass")
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""])
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

  const activePlayer = players[currentPlayerIndex] ?? null
  const topDiscard = discardPile[discardPile.length - 1] ?? null
  const currentPlayerHand = activePlayer?.hand ?? []
  const playableCards = currentPlayerHand.filter((card) => isPlayableCard(card, topDiscard, activeColor, currentPlayerHand))
  const isAwaitingEndTurn = Boolean(awaitingEndTurnReason || pendingTurnState)
  const handoffFan = useMemo(() => buildAnimatedCardOffsets(5), [])

  const modeCards = [
    {
      id: "local" as const,
      title: "Local Multiplayer",
      description: "Pass one device around the table with hidden hands and a timed 30-second turn.",
    },
    {
      id: "host" as const,
      title: "Host a Game",
      description: "Reserve this space for future network play and room hosting.",
    },
    {
      id: "join" as const,
      title: "Join a Game",
      description: "Reserve the same flow as Trivia for future remote matches.",
    },
  ]

  const resetToSetup = useCallback(() => {
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
    setTurnMessage("Set the table and start a classic local UNO match.")
  }, [])

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
      setPhase("handoff")
      setHandoffStage("pass")
      setSecondsLeft(TURN_SECONDS)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
    },
    [],
  )

  const startTurn = useCallback(() => {
    setPhase("playing")
    setHandoffStage("pass")
    setSecondsLeft(TURN_SECONDS)
    setHasDrawnThisTurn(false)
    setDrawnCardId(null)
    setAwaitingEndTurnReason(null)
    setPendingTurnState(null)
    setPendingWildCardId(null)
  }, [])

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

    const nextPlayers = createStarterPlayers(trimmedNames)
    let nextDrawPile = createDeck()

    nextPlayers.forEach((_, playerIndex) => {
      const dealt = drawCards(nextDrawPile, [], STARTING_HAND_SIZE)
      nextPlayers[playerIndex] = {
        ...nextPlayers[playerIndex],
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
    let openingMessage = `${trimmedNames[0]} starts. Match the ${getColorLabel(openingCard.color)} ${getCardSubtitle(openingCard).toLowerCase()}.`

    if (openingCard.kind === "skip") {
      nextCurrentPlayerIndex = getNextPlayerIndex(nextPlayers.length, 0, 1, 1)
      openingMessage = `${trimmedNames[0]} is skipped by the opening card. ${nextPlayers[nextCurrentPlayerIndex].name} starts the round.`
    }

    if (openingCard.kind === "reverse") {
      if (nextPlayers.length === 2) {
        nextCurrentPlayerIndex = 1
        openingMessage = `${trimmedNames[0]} loses the opening turn to a Reverse. ${nextPlayers[nextCurrentPlayerIndex].name} starts.`
      } else {
        nextDirection = -1
        nextCurrentPlayerIndex = getNextPlayerIndex(nextPlayers.length, 0, -1, 1)
        openingMessage = `Opening Reverse flips the table. ${nextPlayers[nextCurrentPlayerIndex].name} starts counter-clockwise.`
      }
    }

    if (openingCard.kind === "drawTwo") {
      const drawResult = drawCards(nextDrawPile, nextDiscardPile, 2)
      nextDrawPile = drawResult.drawPile
      const updatedPlayers = [...nextPlayers]
      updatedPlayers[0] = {
        ...updatedPlayers[0],
        hand: [...updatedPlayers[0].hand, ...drawResult.drawnCards],
      }
      nextCurrentPlayerIndex = getNextPlayerIndex(updatedPlayers.length, 0, 1, 1)
      setPlayers(updatedPlayers)
      setDrawPile(nextDrawPile)
      setDiscardPile(drawResult.discardPile)
      setCurrentPlayerIndex(nextCurrentPlayerIndex)
      setDirection(1)
      setActiveColor(openingCard.color)
      setTurnMessage(
        `${trimmedNames[0]} draws two from the opening card. ${updatedPlayers[nextCurrentPlayerIndex].name} opens the match.`,
      )
      setSetupError("")
      setWinnerId(null)
      setPhase("handoff")
      setHandoffStage("pass")
      setSecondsLeft(TURN_SECONDS)
      setHasDrawnThisTurn(false)
      setDrawnCardId(null)
      setAwaitingEndTurnReason(null)
      setPendingTurnState(null)
      setPendingWildCardId(null)
      return
    }

    setSetupError("")
    setPlayers(nextPlayers)
    setDrawPile(nextDrawPile)
    setDiscardPile(nextDiscardPile)
    setCurrentPlayerIndex(nextCurrentPlayerIndex)
    setDirection(nextDirection)
    setActiveColor(openingCard.color)
    setSecondsLeft(TURN_SECONDS)
    setHasDrawnThisTurn(false)
    setDrawnCardId(null)
    setPendingWildCardId(null)
    setWinnerId(null)
    setTurnMessage(openingMessage)
    setPhase("handoff")
    setHandoffStage("pass")
  }

  const handleSetupModeChange = (nextMode: SetupMode) => {
    if (nextMode === setupMode) {
      return
    }

    resetToSetup()
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

  const handleCardSelection = (card: UnoCard) => {
    if (isAwaitingEndTurn) {
      return
    }

    if (card.kind === "wild" || card.kind === "wildDrawFour") {
      setPendingWildCardId(card.id)
      return
    }

    resolvePlayedCard(card.id)
  }

  const handleDrawCard = useCallback(() => {
    if (phase !== "playing" || !activePlayer || hasDrawnThisTurn || isAwaitingEndTurn) {
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
  }, [phase, activePlayer, hasDrawnThisTurn, isAwaitingEndTurn, drawPile, discardPile, players, currentPlayerIndex, direction, activeColor, topDiscard])

  const handleEndTurn = useCallback(() => {
    if (phase !== "playing" || !activePlayer || (!hasDrawnThisTurn && !awaitingEndTurnReason && !pendingTurnState)) {
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
    players,
    drawPile,
    discardPile,
    currentPlayerIndex,
    direction,
    activeColor,
    commitNextTurn,
  ])

  const handleTimeout = useCallback(() => {
    if (phase !== "playing" || !activePlayer || awaitingEndTurnReason || pendingTurnState) {
      return
    }

    setAwaitingEndTurnReason("timeout")
    setPendingWildCardId(null)
    setTurnMessage(`${activePlayer.name}'s timer expired. End the turn to continue.`)
  }, [phase, activePlayer, awaitingEndTurnReason, pendingTurnState])

  useEffect(() => {
    if (phase !== "playing" || awaitingEndTurnReason || pendingTurnState) {
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
  }, [phase, secondsLeft, awaitingEndTurnReason, pendingTurnState, handleTimeout])

  const canPlayCardFromHand = (card: UnoCard) => {
    if (!activePlayer || phase !== "playing" || isAwaitingEndTurn) {
      return false
    }

    if (hasDrawnThisTurn && drawnCardId !== card.id) {
      return false
    }

    return isPlayableCard(card, topDiscard, activeColor, activePlayer.hand)
  }

  const winner = players.find((player) => player.id === winnerId) ?? null
  const activeTableViewportHeight = "calc(100dvh - 11rem)"

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
                <p className="mt-2 text-lg font-semibold">
                  {setupMode === "local" ? "Same device" : "Network multiplayer coming soon"}
                </p>
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
                Same-device mode
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
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/80">
                Network multiplayer is intentionally not implemented yet, but this entry point stays
                visible so UNO matches the same setup language as Trivia.
              </div>

              <button
                type="button"
                disabled
                className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 opacity-60"
              >
                Generate host code
              </button>

              <textarea
                disabled
                placeholder="Future guest response codes will appear here"
                className="min-h-28 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-sm text-white outline-none placeholder:text-blue-200/45 opacity-60"
              />

              <button
                type="button"
                disabled
                className="w-full rounded-full border border-white/20 px-5 py-3 font-semibold text-white opacity-60"
              >
                Apply guest response code
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Hosted preview</p>
            <h2 className="mt-2 text-3xl font-bold">Future room flow</h2>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p>
                The local pass-and-play mode is fully implemented first. When remote play is ready,
                this panel can mirror the same manual host-code workflow used by Trivia.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-[1.25rem] bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-300 px-5 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-950 opacity-60"
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
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/80">
                Join controls are shown here for parity with Trivia, but same-device play is the
                only finished UNO mode right now.
              </div>

              <button
                type="button"
                disabled
                className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-blue-950 opacity-60"
              >
                Enter host code
              </button>

              <button
                type="button"
                disabled
                className="w-full rounded-full border border-white/20 px-5 py-3 font-semibold text-white opacity-60"
              >
                Generate response code
              </button>

              <textarea
                disabled
                placeholder="Your future join response code will appear here"
                className="min-h-40 w-full rounded-3xl border border-white/10 bg-blue-900/70 p-4 text-sm text-blue-50 outline-none placeholder:text-blue-200/45 opacity-60"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-950/75 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Lobby preview</p>
            <h2 className="mt-2 text-3xl font-bold">Remote lobby placeholder</h2>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-blue-100/85">
              <p>
                For now, switch back to <span className="font-semibold text-white">Local Multiplayer</span>{" "}
                to play the full same-device version with hidden hands and timed turns.
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
                        {isActive && phase === "playing" && (
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
                  disabled={phase !== "playing" || hasDrawnThisTurn || !activePlayer || isAwaitingEndTurn}
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

              {phase === "playing" && activePlayer && (
                <section className="flex min-h-0 max-h-[28vh] flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/85 p-3 shadow-xl shadow-black/25 sm:max-h-[30vh]">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className={`text-sm font-semibold uppercase tracking-[0.35em] ${getColorAccent(activeColor)}`}>
                        Hand view
                      </p>
                      <h3 className="mt-1 text-xl font-black sm:text-2xl">{activePlayer.name}'s cards</h3>
                      <p className="mt-1 text-sm text-blue-100/75">
                        {playableCards.length > 0
                          ? `${playableCards.length} playable card${playableCards.length === 1 ? "" : "s"} available this turn.`
                          : "No playable cards in hand yet. Draw once or let the timer run out."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleDrawCard}
                        disabled={hasDrawnThisTurn || isAwaitingEndTurn}
                        className="rounded-full bg-yellow-300 px-5 py-3 font-semibold text-slate-900 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Draw card
                      </button>
                      <button
                        type="button"
                        onClick={handleEndTurn}
                        disabled={!hasDrawnThisTurn && !awaitingEndTurnReason && !pendingTurnState}
                        className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        End turn
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex-1 min-h-0 overflow-hidden">
                    <div className="flex h-full items-end gap-1.5 overflow-x-auto overflow-y-hidden pb-1 pr-1">
                      {currentPlayerHand.map((card) => {
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
                    <button
                      type="button"
                      onClick={startLocalMatch}
                      className="rounded-full bg-yellow-300 px-6 py-3 font-bold text-slate-900 transition hover:bg-yellow-200"
                    >
                      Shuffle rematch
                    </button>
                    <button
                      type="button"
                      onClick={resetToSetup}
                      className="rounded-full border border-white/20 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                    >
                      Back to setup
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      )}

      <AnimatePresence>
        {phase === "handoff" && activePlayer && (
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
                    onClick={() => resolvePlayedCard(pendingWildCardId, color)}
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
