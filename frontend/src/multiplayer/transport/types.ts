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

export interface BaseRoomState<TGameState> {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
}


// Create general room participant based on checkers and sudoku's room participant, for all games 
export interface RoomParticipant {
    playerId: number;
    name: string;
    clientId: string;    
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

// create roomstate that is general for all games, based on checkers and sudoku's room state
export interface RoomState<TGameState> {
  roomCode: string;
  hostClientId: string;
    maxPlayers: number;
    participants: RoomParticipant[];
    status: "waiting" | "playing" | "finished";
    transport: "websocket";
    gameState: TGameState | null;
}

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
