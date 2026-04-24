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

export interface BaseRoomState<
  TGameState,
  TParticipant extends BaseRoomParticipant = BaseRoomParticipant
> {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  participants: TParticipant[];
  status: "waiting" | "playing" | "finished";
  gameState: TGameState | null;
}

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
