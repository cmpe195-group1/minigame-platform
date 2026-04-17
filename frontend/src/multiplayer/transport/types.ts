export type RoomRole = "none" | "host" | "guest";

export interface ServerEnvelope<TRoomState> {
  type: "room_update" | "join_ack";
  payload: TRoomState | JoinAck;
}

export interface BaseRoomParticipant {
  playerId: number;
  name: string;
  clientId: string;
}

export interface BaseRoomState<TGameState, TParticipant = BaseRoomParticipant> {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  participants: TParticipant[];
  status: "waiting" | "playing" | "finished";
  transport: "websocket";
  gameState: TGameState | null
  roomState: TGameState | null
}

/* Room particpant specific to a game
Checkers

export interface RoomParticipant {
  playerId: number;
  name: string;
  clientId: string;
  pieceColor: Player;
}

export interface RoomParticipant {
  playerId: number;
  name: string;
  color: string;
  colorName: string;
  clientId: string;
}
*/

/*
checkers
export interface RoomState {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  transport: "websocket";
  participants: RoomParticipant[];
  status: "waiting" | "playing" | "finished";
  gameState: CheckersState | null;
  winner: Player | null;
  moveCount: number;
}

export interface RoomState {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  participants: RoomParticipant[];
  status: RoomStatus;
  transport: RoomTransport;
  board: Board | null;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: Player | null;
  lastMoveCorrect: boolean | null;
  moveCount: number;
}
*/

export type RoomTransport = "broadcast" | "websocket";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface CreateRoomPayload {
  hostName: string;
  maxPlayers: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface MakeMovePayload {
  roomCode: string;
  row: number;
  col: number;
  num: number;
  playerId: number;
}

export interface JoinAck {
  ok?: boolean;
  error?: string;
}
